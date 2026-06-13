import { storage } from "../../storage";
import { db } from "../../db";
import { startups, startupMembers, reviewerAssignments, telegramFounderBindings, founderPulseStates } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { deliverAlert } from "./deliver";
import { getFounderPulse } from "../founder-pulse";
import { callTelegram, getTelegramBotToken } from "../../telegram";
import type { FounderPulseStatus } from "@shared/schema";

const DAY = 24 * 60 * 60 * 1000;
// Group 8.5 — never DM the same founder more than once a week.
const NUDGE_THROTTLE_DAYS = 7;

// Computes a founder pulse from the most recent signal event for a startup.
// This is a standalone fallback because Group 2's getFounderPulse() helper
// hasn't landed yet — Group 8 specs explicitly call for one.
export async function computeFounderPulse(startupId: string, now = new Date()): Promise<{ status: FounderPulseStatus; lastSignalAt: Date | null }>{
  const last = await storage.getRecentSignalEventForStartup(startupId);
  if (!last || !last.occurredAt) {
    return { status: "silent", lastSignalAt: null };
  }
  const ageDays = (now.getTime() - new Date(last.occurredAt).getTime()) / DAY;
  if (ageDays <= 14) return { status: "active", lastSignalAt: last.occurredAt };
  if (ageDays <= 42) return { status: "quiet", lastSignalAt: last.occurredAt };
  return { status: "silent", lastSignalAt: last.occurredAt };
}

// Daily cron: walk all startups, recompute pulse, on transition INTO "silent"
// notify the assigned reviewer + company admin (= startup founder/owner).
async function sendFounderPulseNudge(startupId: string, startupName: string, lastSignalAt: Date | null): Promise<void> {
  if (!getTelegramBotToken()) return;
  const state = await storage.getFounderPulseState(startupId);
  const lastNudge = (state as any)?.lastNudgeAt ? new Date((state as any).lastNudgeAt) : null;
  if (lastNudge && (Date.now() - lastNudge.getTime()) < NUDGE_THROTTLE_DAYS * DAY) return;

  const bindings = await db.select().from(telegramFounderBindings)
    .where(eq(telegramFounderBindings.startupId, startupId));
  const recipients = bindings.filter((b) => !!b.telegramUserId);
  if (recipients.length === 0) return;

  let dmCount = 0;
  for (const b of recipients) {
    const ru = b.language === "ru";
    const lastLine = lastSignalAt
      ? `${ru ? "Последняя активность" : "Last activity"}: ${new Date(lastSignalAt).toISOString().slice(0, 10)}`
      : (ru ? "Активности пока нет." : "No activity recorded yet.");
    const body = ru
      ? `<b>${startupName} — пульс затих</b>\nМы не видим активности по ${startupName} более 6 недель. ${lastLine}\n\nОткройте /startups/${startupId} в платформе или ответьте здесь, если данные есть, но мы их не подцепили.`
      : `<b>${startupName} — founder pulse silent</b>\nWe haven't seen activity for ${startupName} in 6+ weeks. ${lastLine}\n\nOpen /startups/${startupId} in the platform or reply here if you have updates we missed.`;
    try {
      await callTelegram("sendMessage", {
        chat_id: b.telegramUserId,
        text: body,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      });
      dmCount += 1;
    } catch (err) {
      console.warn(`[alerts:founderPulse:nudge:${startupId}]`, err);
    }
  }

  if (dmCount > 0) {
    try {
      await db.update(founderPulseStates)
        .set({ lastNudgeAt: new Date(), updatedAt: new Date() } as any)
        .where(eq(founderPulseStates.startupId, startupId));
    } catch (err) {
      console.warn(`[alerts:founderPulse:nudge-stamp:${startupId}]`, err);
    }
  }
}

export async function runFounderPulseCron(): Promise<void> {
  const all = await db.select().from(startups);
  for (const s of all) {
    try {
      const next = await computeFounderPulse(s.id);
      const prev = await storage.getFounderPulseState(s.id);
      const prevStatus = prev?.status as FounderPulseStatus | undefined;

      // Group 8.5 — refresh per-channel breakdown alongside status.
      let breakdown: Record<string, number> | null = null;
      try {
        const pulse = await getFounderPulse(s.id);
        breakdown = pulse.channelBreakdown ?? null;
      } catch {}

      await db.insert(founderPulseStates).values({
        startupId: s.id,
        status: next.status,
        lastSignalAt: next.lastSignalAt ?? null,
        channelBreakdown: breakdown,
        updatedAt: new Date(),
      } as any).onConflictDoUpdate({
        target: founderPulseStates.startupId,
        set: {
          status: next.status,
          lastSignalAt: next.lastSignalAt ?? null,
          channelBreakdown: breakdown,
          updatedAt: new Date(),
        } as any,
      });

      if (next.status === "silent" && prevStatus !== "silent") {
        // collect notify targets: reviewers + startup owners (founders)
        const targets = new Set<string>();
        const owners = await db.select({ userId: startupMembers.userId })
          .from(startupMembers)
          .where(eq(startupMembers.startupId, s.id));
        for (const o of owners) if (o.userId) targets.add(o.userId);
        const revs = await db.select({ userId: reviewerAssignments.reviewerId })
          .from(reviewerAssignments)
          .where(and(eq(reviewerAssignments.entityType, "startup"), eq(reviewerAssignments.entityId, s.id)));
        for (const r of revs) if (r.userId) targets.add(r.userId);

        if (targets.size > 0) {
          await deliverAlert({
            userIds: Array.from(targets),
            type: "alert_founder_pulse",
            severity: "warning",
            category: "alert",
            title: `Founder pulse: silent — ${s.name}`,
            content: `No signals from ${s.name} for over 6 weeks. Last activity: ${next.lastSignalAt ? new Date(next.lastSignalAt).toISOString() : "never"}.`,
            linkUrl: `/startups/${s.id}`,
            relatedId: s.id,
            channels: { inApp: true, email: true, telegram: true, push: true },
          });
        }

        // Group 8.5 — direct Telegram nudge to bound founders. Throttled to
        // at most one DM per startup per NUDGE_THROTTLE_DAYS so a flapping
        // pulse doesn't spam the chat.
        await sendFounderPulseNudge(s.id, s.name, next.lastSignalAt);
      }
    } catch (err) {
      console.warn(`[alerts:founderPulse:${s.id}]`, err);
    }
  }
}
