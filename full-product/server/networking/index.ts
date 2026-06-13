import type { Express, Request, Response } from "express";
import { z } from "zod";
import OpenAI from "openai";
import { and, desc, eq, gte, ne, or, sql } from "drizzle-orm";
import { db } from "../db";
import {
  events,
  users,
  networkingRequests,
  networkingMatches,
  networkingChats,
  networkingMessages,
  eventVenueMaps,
  eventVenuePins,
  eventMeetInvites,
} from "@shared/schema";
import { isAuthenticated, isNotFrozen, isEventAdmin } from "../auth";
import { eventRegistrations } from "@shared/schema";

async function assertEventParticipant(eventId: string, userId: string): Promise<boolean> {
  const reg = await db.query.eventRegistrations.findFirst({
    where: and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.userId, userId)),
  });
  if (reg) return true;
  // Allow event admins / head admins / event creators too.
  const u = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (u?.isHeadAdmin || u?.role === "eventAdmin") return true;
  const ev = await db.query.events.findFirst({ where: eq(events.id, eventId) });
  return !!(ev && (ev as any).createdBy === userId);
}

const recentRecomputeAt = new Map<string, number>();
const RECOMPUTE_TTL_MS = 60_000;

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const EMBED_MODEL = "text-embedding-3-small";

// ---------- helpers ----------

async function embed(text: string): Promise<number[]> {
  const r = await openai.embeddings.create({ model: EMBED_MODEL, input: text.slice(0, 8000) });
  return r.data[0]!.embedding as number[];
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i]! * b[i]!; na += a[i]! * a[i]!; nb += b[i]! * b[i]!; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

function pairKey(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

function getUserId(req: Request): string | null {
  const u: any = (req as any).user;
  return u?.claims?.sub || u?.id || null;
}

async function whyMatch(meText: string, otherText: string, lang: "ru" | "en" = "ru"): Promise<string> {
  try {
    const sys = lang === "ru"
      ? "Ты помощник по нетворкингу. Опиши ОДНОЙ короткой строкой (≤120 символов, без кавычек) почему эти два человека могут быть полезны друг другу на ивенте. Без воды."
      : "You help with event networking. In ONE short line (≤120 chars, no quotes) explain why these two people might be useful to each other. No fluff.";
    const r = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      max_tokens: 80,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: `Я ищу: ${meText}\n\nОн/она ищет: ${otherText}` },
      ],
    });
    return (r.choices[0]?.message?.content || "").trim().replace(/^"|"$/g, "");
  } catch {
    return "";
  }
}

async function icebreaker(meText: string, otherText: string): Promise<string> {
  try {
    const r = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 80,
      messages: [
        { role: "system", content: "Сгенерируй ОДИН короткий вопрос для старта разговора между двумя людьми на ивенте, исходя из их интересов. Без приветствия. Только сам вопрос." },
        { role: "user", content: `Человек A ищет: ${meText}\nЧеловек B ищет: ${otherText}` },
      ],
    });
    return (r.choices[0]?.message?.content || "").trim();
  } catch {
    return "";
  }
}

// ---------- matching engine ----------

async function recomputeMatchesForUser(eventId: string, userId: string) {
  const myReq = await db.query.networkingRequests.findFirst({
    where: and(eq(networkingRequests.eventId, eventId), eq(networkingRequests.userId, userId)),
  });
  if (!myReq || !myReq.embedding || !myReq.isActive) return;

  const others = await db.query.networkingRequests.findMany({
    where: and(
      eq(networkingRequests.eventId, eventId),
      ne(networkingRequests.userId, userId),
      eq(networkingRequests.isActive, true),
    ),
  });

  for (const other of others) {
    if (!other.embedding) continue;
    const score = cosine(myReq.embedding, other.embedding);
    if (score < 0.25) continue; // skip clearly unrelated
    const [aId, bId] = pairKey(userId, other.userId);
    const existing = await db.query.networkingMatches.findFirst({
      where: and(
        eq(networkingMatches.eventId, eventId),
        eq(networkingMatches.userAId, aId),
        eq(networkingMatches.userBId, bId),
      ),
    });
    if (existing) {
      // refresh score only
      if (Math.abs(existing.score - score) > 0.02) {
        await db.update(networkingMatches).set({ score }).where(eq(networkingMatches.id, existing.id));
      }
      continue;
    }
    const reason = await whyMatch(myReq.requestText, other.requestText);
    await db.insert(networkingMatches).values({
      eventId, userAId: aId, userBId: bId, score, reason,
    }).onConflictDoNothing();
  }
}

// ---------- routes ----------

export function registerNetworkingRoutes(app: Express) {
  // Upsert my networking request for an event.
  app.post("/api/events/:id/networking/request", isAuthenticated, isNotFrozen, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const eventId = req.params.id;
    const body = z.object({
      requestText: z.string().min(10).max(1000),
      goal: z.enum(["cofounder", "hiring", "job", "mentor", "investor", "casual"]).default("casual"),
    }).safeParse(req.body);
    if (!body.success) return res.status(400).json({ message: "Invalid input", errors: body.error.errors });

    const ev = await db.query.events.findFirst({ where: eq(events.id, eventId) });
    if (!ev) return res.status(404).json({ message: "Event not found" });
    if (!(await assertEventParticipant(eventId, userId))) {
      return res.status(403).json({ message: "Register for this event before using networking" });
    }

    const embedding = await embed(`${body.data.goal}: ${body.data.requestText}`);
    const existing = await db.query.networkingRequests.findFirst({
      where: and(eq(networkingRequests.eventId, eventId), eq(networkingRequests.userId, userId)),
    });

    let row;
    if (existing) {
      [row] = await db.update(networkingRequests)
        .set({ requestText: body.data.requestText, goal: body.data.goal, embedding, isActive: true, updatedAt: new Date() })
        .where(eq(networkingRequests.id, existing.id))
        .returning();
    } else {
      [row] = await db.insert(networkingRequests)
        .values({ eventId, userId, requestText: body.data.requestText, goal: body.data.goal, embedding, isActive: true })
        .returning();
    }
    // Compute matches in background (do not block response).
    recomputeMatchesForUser(eventId, userId).catch((e) => console.error("[networking] recompute failed", e));
    res.json(row);
  });

  // Get my current request for an event.
  app.get("/api/events/:id/networking/request", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const row = await db.query.networkingRequests.findFirst({
      where: and(eq(networkingRequests.eventId, req.params.id), eq(networkingRequests.userId, userId)),
    });
    res.json(row || null);
  });

  // Disable my request (turn off networking for this event).
  app.delete("/api/events/:id/networking/request", isAuthenticated, isNotFrozen, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    await db.update(networkingRequests).set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(networkingRequests.eventId, req.params.id), eq(networkingRequests.userId, userId)));
    res.json({ ok: true });
  });

  // Counter for the "N people are looking for connections" badge.
  app.get("/api/events/:id/networking/stats", async (req, res) => {
    const [{ c }] = await db.execute<{ c: number }>(sql`
      SELECT COUNT(*)::int AS c FROM networking_requests
      WHERE event_id = ${req.params.id} AND is_active = true
    `) as any;
    res.json({ activeUsers: Number(c) || 0 });
  });

  // Top matches for me at this event.
  app.get("/api/events/:id/networking/matches", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const eventId = req.params.id;
    if (!(await assertEventParticipant(eventId, userId))) {
      return res.status(403).json({ message: "Register for this event before using networking" });
    }
    // Refresh, but no more than once per minute per (event,user).
    const k = `${eventId}:${userId}`;
    const last = recentRecomputeAt.get(k) || 0;
    if (Date.now() - last > RECOMPUTE_TTL_MS) {
      recentRecomputeAt.set(k, Date.now());
      await recomputeMatchesForUser(eventId, userId).catch(() => {});
    }

    const rows = await db.query.networkingMatches.findMany({
      where: and(
        eq(networkingMatches.eventId, eventId),
        or(eq(networkingMatches.userAId, userId), eq(networkingMatches.userBId, userId)),
      ),
      orderBy: [desc(networkingMatches.score)],
      limit: 20,
    });

    const otherIds = Array.from(new Set(rows.map(r => r.userAId === userId ? r.userBId : r.userAId)));
    const profiles = otherIds.length
      ? await db.query.users.findMany({ where: sql`${users.id} = ANY(${otherIds})` })
      : [];
    const byId = new Map(profiles.map(p => [p.id, p]));
    const matchIds = rows.map(r => r.id);
    const chats = matchIds.length
      ? await db.query.networkingChats.findMany({ where: sql`${networkingChats.matchId} = ANY(${matchIds})` })
      : [];
    const chatByMatch = new Map(chats.map((c: any) => [c.matchId, c.id]));
    const otherRequests = otherIds.length
      ? await db.query.networkingRequests.findMany({
          where: and(eq(networkingRequests.eventId, eventId), sql`${networkingRequests.userId} = ANY(${otherIds})`),
        })
      : [];
    const reqByUser = new Map(otherRequests.map((r: any) => [r.userId, r]));

    const result = rows.map((m) => {
      const otherId = m.userAId === userId ? m.userBId : m.userAId;
      const myStatus = m.userAId === userId ? m.statusA : m.statusB;
      const theirStatus = m.userAId === userId ? m.statusB : m.statusA;
      const u = byId.get(otherId) as any;
      const r = reqByUser.get(otherId) as any;
      return {
        id: m.id,
        score: m.score,
        reason: m.reason,
        myStatus, theirStatus,
        connected: !!m.connectedAt,
        chatId: chatByMatch.get(m.id) || null,
        otherUser: u ? {
          id: u.id,
          firstName: u.firstName, lastName: u.lastName,
          profileImageUrl: u.profileImageUrl,
          bio: u.aboutMe,
          organization: u.company,
          profession: u.position,
          city: u.city,
          category: u.category,
          interests: u.interests,
          skills: u.skills,
          previousStartups: u.previousStartups,
          isFounder: u.isFounder,
          isSpeaker: u.isSpeaker,
          tag: u.tag,
          telegramUsername: u.telegramUsername,
          requestText: r?.requestText || null,
          requestGoal: r?.goal || null,
        } : null,
      };
    }).filter(r => r.otherUser && (r.myStatus !== "passed"));

    res.json(result);
  });

  // Accept / pass a match. Opens chat on mutual accept.
  app.post("/api/networking/matches/:id/:action", isAuthenticated, isNotFrozen, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const action = req.params.action;
    if (!["accept", "pass"].includes(action)) return res.status(400).json({ message: "Bad action" });
    const m = await db.query.networkingMatches.findFirst({ where: eq(networkingMatches.id, req.params.id) });
    if (!m) return res.status(404).json({ message: "Match not found" });
    if (m.userAId !== userId && m.userBId !== userId) return res.status(403).json({ message: "Forbidden" });
    const newStatus = action === "accept" ? "accepted" : "passed";
    const patch = m.userAId === userId ? { statusA: newStatus } : { statusB: newStatus };
    const [updated] = await db.update(networkingMatches).set(patch).where(eq(networkingMatches.id, m.id)).returning();

    let chatId: string | null = null;
    if (updated.statusA === "accepted" && updated.statusB === "accepted") {
      const inserted = await db.insert(networkingChats).values({ matchId: updated.id }).onConflictDoNothing().returning();
      let chat = inserted[0];
      if (!chat) {
        chat = await db.query.networkingChats.findFirst({ where: eq(networkingChats.matchId, updated.id) }) as any;
      }
      chatId = chat?.id || null;
      if (!updated.connectedAt) {
        await db.update(networkingMatches).set({ connectedAt: new Date() }).where(eq(networkingMatches.id, m.id));
      }
      // Seed icebreaker as first message from "system" — represented as senderId of the asker for simplicity.
      if (chatId && inserted[0]) {
        // Only seed icebreaker on the *first* successful chat creation, not on the racing duplicate.
        const reqA = await db.query.networkingRequests.findFirst({ where: and(eq(networkingRequests.eventId, m.eventId), eq(networkingRequests.userId, m.userAId)) });
        const reqB = await db.query.networkingRequests.findFirst({ where: and(eq(networkingRequests.eventId, m.eventId), eq(networkingRequests.userId, m.userBId)) });
        const ice = (reqA && reqB) ? await icebreaker(reqA.requestText, reqB.requestText) : "";
        if (ice) {
          await db.insert(networkingMessages).values({ chatId, senderId: userId, kind: "icebreaker", content: ice });
        }
      }
    } else {
      const existing = await db.query.networkingChats.findFirst({ where: eq(networkingChats.matchId, m.id) });
      chatId = existing?.id || null;
    }
    res.json({ ...updated, chatId });
  });

  // Chat: list messages.
  app.get("/api/networking/chats/:id/messages", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const chat = await db.query.networkingChats.findFirst({ where: eq(networkingChats.id, req.params.id) });
    if (!chat) return res.status(404).json({ message: "Chat not found" });
    const m = await db.query.networkingMatches.findFirst({ where: eq(networkingMatches.id, chat.matchId) });
    if (!m || (m.userAId !== userId && m.userBId !== userId)) return res.status(403).json({ message: "Forbidden" });
    const msgs = await db.query.networkingMessages.findMany({
      where: eq(networkingMessages.chatId, chat.id),
      orderBy: [networkingMessages.createdAt],
      limit: 200,
    });
    const otherId = m.userAId === userId ? m.userBId : m.userAId;
    const other = await db.query.users.findFirst({ where: eq(users.id, otherId) });
    const me = await db.query.users.findFirst({ where: eq(users.id, userId) });
    res.json({
      chat,
      match: m,
      messages: msgs,
      otherUser: other ? { id: other.id, firstName: other.firstName, lastName: other.lastName, profileImageUrl: other.profileImageUrl, telegramUsername: other.telegramUsername } : null,
      myTelegramUsername: me?.telegramUsername || null,
    });
  });

  // Chat: send message.
  app.post("/api/networking/chats/:id/messages", isAuthenticated, isNotFrozen, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const body = z.object({
      content: z.string().max(2000).optional(),
      kind: z.enum(["text", "tg_share"]).default("text"),
    }).safeParse(req.body);
    if (body.success && body.data.kind === "text" && !body.data.content?.trim()) {
      return res.status(400).json({ message: "Empty message" });
    }
    if (!body.success) return res.status(400).json({ message: "Invalid input" });
    const chat = await db.query.networkingChats.findFirst({ where: eq(networkingChats.id, req.params.id) });
    if (!chat) return res.status(404).json({ message: "Chat not found" });
    const m = await db.query.networkingMatches.findFirst({ where: eq(networkingMatches.id, chat.matchId) });
    if (!m || (m.userAId !== userId && m.userBId !== userId)) return res.status(403).json({ message: "Forbidden" });

    let payload: any = null;
    let content = body.data.content || "";
    if (body.data.kind === "tg_share") {
      const me = await db.query.users.findFirst({ where: eq(users.id, userId) });
      if (!me?.telegramUsername) return res.status(400).json({ message: "Add Telegram username in your profile first" });
      const tg = me.telegramUsername.replace(/^@/, "");
      payload = { tgUsername: `@${tg}` };
      content = `@${tg}`;
    }
    const [msg] = await db.insert(networkingMessages).values({ chatId: chat.id, senderId: userId, kind: body.data.kind, content, payload }).returning();
    await db.update(networkingChats).set({ lastMessageAt: new Date() }).where(eq(networkingChats.id, chat.id));
    res.json(msg);
  });

  // List my active chats.
  app.get("/api/networking/my-chats", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const rows = await db.execute<any>(sql`
      SELECT c.id AS chat_id, c.last_message_at, m.event_id,
             CASE WHEN m.user_a_id = ${userId} THEN m.user_b_id ELSE m.user_a_id END AS other_id,
             e.name AS event_name
      FROM networking_chats c
      JOIN networking_matches m ON m.id = c.match_id
      JOIN events e ON e.id = m.event_id
      WHERE m.user_a_id = ${userId} OR m.user_b_id = ${userId}
      ORDER BY c.last_message_at DESC
      LIMIT 50
    `) as any;
    const list = (rows as any[]).map((r) => ({
      chatId: r.chat_id, lastMessageAt: r.last_message_at, eventId: r.event_id,
      eventName: r.event_name, otherUserId: r.other_id,
    }));
    res.json(list);
  });

  // ============ VENUE MAP ============

  app.get("/api/events/:id/venue-map", async (req, res) => {
    const map = await db.query.eventVenueMaps.findFirst({ where: eq(eventVenueMaps.eventId, req.params.id) });
    const pins = await db.query.eventVenuePins.findMany({ where: eq(eventVenuePins.eventId, req.params.id) });
    res.json({ map, pins });
  });

  // Admin: upload/replace map image URL (image is uploaded separately via existing object-storage flow).
  app.post("/api/events/:id/venue-map", isAuthenticated, isNotFrozen, isEventAdmin, async (req, res) => {
    const body = z.object({ imageUrl: z.string().url() }).safeParse(req.body);
    if (!body.success) return res.status(400).json({ message: "Invalid input" });
    const existing = await db.query.eventVenueMaps.findFirst({ where: eq(eventVenueMaps.eventId, req.params.id) });
    let row;
    if (existing) {
      [row] = await db.update(eventVenueMaps).set({ imageUrl: body.data.imageUrl }).where(eq(eventVenueMaps.id, existing.id)).returning();
    } else {
      [row] = await db.insert(eventVenueMaps).values({ eventId: req.params.id, imageUrl: body.data.imageUrl }).returning();
    }
    res.json(row);
  });

  // Admin: add pin.
  app.post("/api/events/:id/venue-pins", isAuthenticated, isNotFrozen, isEventAdmin, async (req, res) => {
    const body = z.object({
      name: z.string().min(1).max(80),
      kind: z.enum(["stage", "booth", "coffee", "registration", "other"]).default("other"),
      x: z.number().min(0).max(1),
      y: z.number().min(0).max(1),
      description: z.string().max(300).optional(),
    }).safeParse(req.body);
    if (!body.success) return res.status(400).json({ message: "Invalid input" });
    const [pin] = await db.insert(eventVenuePins).values({ eventId: req.params.id, ...body.data }).returning();
    res.json(pin);
  });

  // Admin: delete pin.
  app.delete("/api/venue-pins/:id", isAuthenticated, isNotFrozen, isEventAdmin, async (req, res) => {
    await db.delete(eventVenuePins).where(eq(eventVenuePins.id, req.params.id));
    res.json({ ok: true });
  });

  // ============ MEET INVITES ============

  app.post("/api/networking/chats/:id/meet-invites", isAuthenticated, isNotFrozen, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const body = z.object({
      pinId: z.string(),
      scheduledAt: z.string(),
      note: z.string().max(200).optional(),
    }).safeParse(req.body);
    if (!body.success) return res.status(400).json({ message: "Invalid input" });
    const chat = await db.query.networkingChats.findFirst({ where: eq(networkingChats.id, req.params.id) });
    if (!chat) return res.status(404).json({ message: "Chat not found" });
    const m = await db.query.networkingMatches.findFirst({ where: eq(networkingMatches.id, chat.matchId) });
    if (!m || (m.userAId !== userId && m.userBId !== userId)) return res.status(403).json({ message: "Forbidden" });
    // Pin must belong to this match's event.
    const pin = await db.query.eventVenuePins.findFirst({ where: eq(eventVenuePins.id, body.data.pinId) });
    if (!pin || pin.eventId !== m.eventId) return res.status(400).json({ message: "Pin does not belong to this event" });
    const toUserId = m.userAId === userId ? m.userBId : m.userAId;
    const [invite] = await db.insert(eventMeetInvites).values({
      chatId: chat.id, fromUserId: userId, toUserId, pinId: body.data.pinId,
      scheduledAt: new Date(body.data.scheduledAt), note: body.data.note,
    }).returning();
    // Emit a chat message referencing the invite.
    await db.insert(networkingMessages).values({
      chatId: chat.id, senderId: userId, kind: "meet_invite_ref",
      content: `meet:${invite.id}`, payload: { inviteId: invite.id },
    });
    await db.update(networkingChats).set({ lastMessageAt: new Date() }).where(eq(networkingChats.id, chat.id));
    res.json(invite);
  });

  app.get("/api/networking/chats/:id/meet-invites", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const chat = await db.query.networkingChats.findFirst({ where: eq(networkingChats.id, req.params.id) });
    if (!chat) return res.status(404).json({ message: "Chat not found" });
    const m = await db.query.networkingMatches.findFirst({ where: eq(networkingMatches.id, chat.matchId) });
    if (!m || (m.userAId !== userId && m.userBId !== userId)) return res.status(403).json({ message: "Forbidden" });
    const rows = await db.query.eventMeetInvites.findMany({ where: eq(eventMeetInvites.chatId, chat.id), orderBy: [desc(eventMeetInvites.createdAt)] });
    res.json(rows);
  });

  app.post("/api/networking/meet-invites/:id/:action", isAuthenticated, isNotFrozen, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const action = req.params.action;
    if (!["accept", "decline", "cancel"].includes(action)) return res.status(400).json({ message: "Bad action" });
    const inv = await db.query.eventMeetInvites.findFirst({ where: eq(eventMeetInvites.id, req.params.id) });
    if (!inv) return res.status(404).json({ message: "Not found" });
    if (action === "cancel" && inv.fromUserId !== userId) return res.status(403).json({ message: "Forbidden" });
    if ((action === "accept" || action === "decline") && inv.toUserId !== userId) return res.status(403).json({ message: "Forbidden" });
    const status = action === "accept" ? "accepted" : action === "decline" ? "declined" : "cancelled";
    const [updated] = await db.update(eventMeetInvites).set({ status }).where(eq(eventMeetInvites.id, inv.id)).returning();
    res.json(updated);
  });
}
