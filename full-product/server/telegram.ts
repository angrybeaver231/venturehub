import { storage } from "./storage";
import { getEnvCredential } from "./signals/credentials";

export const TELEGRAM_BOT_TOKEN_ENV = "TELEGRAM_BOT_TOKEN";
export const TELEGRAM_WEBHOOK_SECRET_ENV = "TELEGRAM_WEBHOOK_SECRET";

const TELEGRAM_API_BASE = "https://api.telegram.org";

export type TelegramUser = {
  id: number;
  is_bot?: boolean;
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
};

export type TelegramChatPayload = {
  id: number;
  type: string;
  title?: string;
  username?: string;
};

export type TelegramMessage = {
  message_id: number;
  from?: TelegramUser;
  sender_chat?: TelegramChatPayload;
  chat: TelegramChatPayload;
  date: number;
  text?: string;
  caption?: string;
  forward_from?: TelegramUser;
  forward_from_chat?: TelegramChatPayload;
  forward_origin?: any;
  reply_to_message?: TelegramMessage;
};

export type TelegramReactionUpdate = {
  chat: TelegramChatPayload;
  message_id: number;
  user?: TelegramUser;
  actor_chat?: TelegramChatPayload;
  date: number;
  old_reaction: Array<{ type: string; emoji?: string }>;
  new_reaction: Array<{ type: string; emoji?: string }>;
};

// `chat_member` (not `my_chat_member`) reports membership changes for OTHER
// users — used for the cofounder-departed alert.
export type TelegramChatMemberUpdate = {
  chat: TelegramChatPayload;
  from: TelegramUser;
  date: number;
  old_chat_member: { user: TelegramUser; status: string };
  new_chat_member: { user: TelegramUser; status: string };
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  channel_post?: TelegramMessage;
  message_reaction?: TelegramReactionUpdate;
  my_chat_member?: {
    chat: TelegramChatPayload;
    from: TelegramUser;
    new_chat_member: { user: TelegramUser; status: string };
    old_chat_member: { user: TelegramUser; status: string };
  };
  chat_member?: TelegramChatMemberUpdate;
};

export function getTelegramBotToken(): string | null {
  return getEnvCredential(TELEGRAM_BOT_TOKEN_ENV);
}

export function getTelegramWebhookSecret(): string | null {
  return getEnvCredential(TELEGRAM_WEBHOOK_SECRET_ENV);
}

export async function callTelegram(method: string, body: Record<string, unknown>): Promise<any> {
  const token = getTelegramBotToken();
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN not configured");
  const res = await fetch(`${TELEGRAM_API_BASE}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.ok === false) {
    const description = json?.description || `HTTP ${res.status}`;
    throw new Error(`Telegram ${method} failed: ${description}`);
  }
  return json.result;
}

export async function sendTelegramMessage(chatId: number | string, text: string): Promise<void> {
  try {
    await callTelegram("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true });
  } catch (err) {
    console.error("[telegram] sendMessage failed:", err);
  }
}

export async function getTelegramChatMemberCount(chatId: number | string): Promise<number | null> {
  try {
    const result = await callTelegram("getChatMemberCount", { chat_id: chatId });
    return typeof result === "number" ? result : null;
  } catch {
    return null;
  }
}

function todayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

// Short-lived in-memory cache of incoming group message metadata, keyed by
// `chat_id:message_id`. Used solely to enrich 🚀 reaction milestones with
// the original message's author and text. Never persisted to disk; resets
// on every server restart; bounded by RECENT_MESSAGE_CACHE_LIMIT.
type CachedMessage = {
  text: string;
  authorTelegramId: number | null;
  authorUsername: string | null;
  date: number;
};
const RECENT_MESSAGE_CACHE_LIMIT = 5000;
const recentMessages = new Map<string, CachedMessage>();
function recentKey(chatId: string, messageId: number): string {
  return `${chatId}:${messageId}`;
}
function rememberMessage(message: TelegramMessage): void {
  const key = recentKey(String(message.chat.id), message.message_id);
  if (recentMessages.has(key)) recentMessages.delete(key);
  recentMessages.set(key, {
    text: (message.text || message.caption || "").slice(0, 1000),
    authorTelegramId: message.from?.id ?? null,
    authorUsername: message.from?.username ?? null,
    date: message.date,
  });
  while (recentMessages.size > RECENT_MESSAGE_CACHE_LIMIT) {
    const first = recentMessages.keys().next().value;
    if (first === undefined) break;
    recentMessages.delete(first);
  }
}
function recallMessage(chatId: string, messageId: number): CachedMessage | undefined {
  return recentMessages.get(recentKey(chatId, messageId));
}

async function recordTelegramSignalEvent(input: {
  startupId: string;
  eventType: string;
  severity?: "info" | "positive" | "warning" | "critical";
  title?: string;
  summary?: string;
  payload?: any;
  dedupeKey: string;
  occurredAt?: Date;
}): Promise<boolean> {
  const crypto = await import("crypto");
  const sourceKey = "telegram-workspace";
  const dedupeHashValue = crypto
    .createHash("sha256")
    .update(`${sourceKey}:${input.dedupeKey}`)
    .digest("hex")
    .slice(0, 64);
  return storage.recordSignalEvent({
    startupId: input.startupId,
    sourceKey,
    eventType: input.eventType,
    severity: input.severity ?? "info",
    title: input.title ?? null,
    summary: input.summary ?? null,
    url: null,
    occurredAt: input.occurredAt ?? new Date(),
    payload: input.payload ?? null,
    dedupeHash: dedupeHashValue,
    verifiedBy: ["telegram"],
  });
}

function botReply(language: string, key: "linkedChat" | "linkedFounder" | "needLink" | "forwardAck" | "milestoneAck" | "removed"): string {
  const ru = language === "ru";
  switch (key) {
    case "linkedChat":
      return ru
        ? "✅ Чат привязан к стартапу. Я считаю только метаданные — содержимое сообщений не сохраняется."
        : "✅ Chat linked to your startup. I only count metadata — message content is never stored.";
    case "linkedFounder":
      return ru
        ? "✅ Ваш Telegram-аккаунт привязан. Пересылайте мне любые посты — я добавлю их в ленту сигналов."
        : "✅ Your Telegram account is linked. Forward me any post and I'll add it to your signals timeline.";
    case "needLink":
      return ru
        ? "Откройте страницу /startups/<id>/telegram на платформе и используйте свою персональную ссылку, чтобы привязать аккаунт."
        : "Open /startups/<id>/telegram on the platform and use your personal link to bind your account.";
    case "forwardAck":
      return ru ? "📌 Принято. Добавил в таймлайн стартапа." : "📌 Got it. Added to your startup timeline.";
    case "milestoneAck":
      return ru ? "🚀 Зафиксировал как веху." : "🚀 Captured as milestone.";
    case "removed":
      return ru ? "Чат отвязан." : "Chat unlinked.";
  }
}

export async function handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
  try {
    if (update.my_chat_member) {
      const status = update.my_chat_member.new_chat_member.status;
      const chatId = String(update.my_chat_member.chat.id);
      if (status === "left" || status === "kicked") {
        await storage.setTelegramChatActive(chatId, false);
      }
      return;
    }

    if (update.chat_member) {
      await handleMemberChange(update.chat_member);
      return;
    }

    if (update.message_reaction) {
      await handleReaction(update.message_reaction);
      return;
    }

    const message = update.message ?? update.channel_post;
    if (!message) return;

    const chat = message.chat;
    const chatId = String(chat.id);
    const isPrivate = chat.type === "private";
    const day = todayKey(new Date(message.date * 1000));

    if (isPrivate) {
      await handlePrivateMessage(message);
      return;
    }

    // Group / supergroup / channel
    const text = message.text || "";
    if (text.startsWith("/start")) {
      const parts = text.split(/\s+/);
      const tokenArg = parts[1];
      if (tokenArg) {
        const binding = await storage.getTelegramFounderBindingByToken(tokenArg);
        if (binding) {
          await storage.upsertTelegramChat({
            startupId: binding.startupId,
            telegramChatId: chatId,
            title: chat.title ?? null,
            chatType: chat.type ?? null,
            isActive: true,
            lastMemberCount: null,
          });
          const memberCount = await getTelegramChatMemberCount(chatId);
          if (memberCount != null) await storage.setTelegramChatMemberCount(chatId, memberCount);
          await sendTelegramMessage(chatId, botReply(binding.language || "en", "linkedChat"));
          await recordTelegramSignalEvent({
            startupId: binding.startupId,
            eventType: "team_chat_linked",
            severity: "positive",
            title: chat.title || "Telegram chat",
            summary: `Bot added to chat (${memberCount ?? "?"} members) by founder ${binding.userId}`,
            payload: { telegramChatId: chatId, memberCount, founderUserId: binding.userId },
            dedupeKey: `linked:${chatId}`,
          });
          return;
        }
      }
    }

    const bound = await storage.getTelegramChatByChatId(chatId);
    if (!bound || !bound.isActive) return;

    // Metadata only — we count the message and the sender's telegram user id,
    // but never persist text or caption.
    const fromUserId = message.from?.id ? String(message.from.id) : null;
    await storage.bumpTelegramChatStats(chatId, day, fromUserId);

    // Buffer message metadata in a short-lived in-memory cache so that a
    // later 🚀 reaction can attribute the milestone to its author and
    // surface the original text. Nothing is persisted.
    rememberMessage(message);

    // Explicit, opt-in milestone marker. Reading the text here is necessary
    // to detect the trigger; only the matched message is captured.
    if ((text || message.caption || "").includes("#vmu")) {
      await captureMilestone(bound.startupId, message);
    }
  } catch (err) {
    console.error("[telegram] handleTelegramUpdate error:", err);
  }
}

// When a member of a bound team chat goes from a present status (member /
// administrator / creator / restricted) to a non-present status (left /
// kicked), and we recognise that telegram user as a linked cofounder of
// the same startup, emit a critical `team_member_left` signal_event so
// investors and the founder are alerted immediately.
const PRESENT_STATUSES = new Set(["creator", "administrator", "member", "restricted"]);
const ABSENT_STATUSES = new Set(["left", "kicked"]);

async function handleMemberChange(update: TelegramChatMemberUpdate): Promise<void> {
  const oldStatus = update.old_chat_member?.status;
  const newStatus = update.new_chat_member?.status;
  if (!oldStatus || !newStatus) return;
  if (!(PRESENT_STATUSES.has(oldStatus) && ABSENT_STATUSES.has(newStatus))) return;

  const chatId = String(update.chat.id);
  const bound = await storage.getTelegramChatByChatId(chatId);
  if (!bound || !bound.isActive) return;

  const leftUser = update.new_chat_member.user;
  if (!leftUser?.id) return;

  // Only escalate if the leaving user is a linked founder/cofounder of this same startup.
  const bindings = await storage.getTelegramFounderBindingsByTelegramUser(String(leftUser.id));
  const matching = bindings.find((b) => b.startupId === bound.startupId);
  if (!matching) return;

  const founder = await storage.getUser(matching.userId);
  const founderName = [founder?.firstName, founder?.lastName].filter(Boolean).join(" ").trim()
    || founder?.email
    || leftUser.username
    || `tg:${leftUser.id}`;

  await recordTelegramSignalEvent({
    startupId: bound.startupId,
    eventType: "team_member_left",
    severity: "critical",
    title: `Cofounder left team chat: ${founderName}`,
    summary: `Linked cofounder ${founderName} transitioned ${oldStatus} → ${newStatus} in ${bound.title ?? "team chat"}.`,
    payload: {
      telegramChatId: chatId,
      telegramUserId: String(leftUser.id),
      founderUserId: matching.userId,
      oldStatus,
      newStatus,
      detectedAt: new Date().toISOString(),
    },
    // Per-day dedupe so a brief leave/rejoin still surfaces if it happens on different days.
    dedupeKey: `team_member_left:${bound.startupId}:${leftUser.id}:${todayKey()}`,
  });
}

async function handleReaction(reaction: TelegramReactionUpdate): Promise<void> {
  const chatId = String(reaction.chat.id);
  const bound = await storage.getTelegramChatByChatId(chatId);
  if (!bound || !bound.isActive) return;

  const has = (reactions: typeof reaction.new_reaction) =>
    reactions.some((r) => r.type === "emoji" && r.emoji === "🚀");
  const wasRocket = has(reaction.old_reaction || []);
  const isRocket = has(reaction.new_reaction || []);
  if (wasRocket || !isRocket) return;

  const actor = reaction.user?.id ?? reaction.actor_chat?.id;
  const cached = recallMessage(chatId, reaction.message_id);
  // The original message metadata cache is in-memory and bounded; if the
  // message is older than the cache window or the server restarted between
  // the message and the reaction, we surface the milestone with an explicit
  // "text unavailable" summary and an `enrichmentMissed: true` payload flag
  // so downstream consumers can render the degraded state deterministically.
  const enrichmentMissed = !cached;
  const title = cached?.authorUsername
    ? `🚀 Milestone — @${cached.authorUsername}`
    : "🚀 Milestone reaction";
  const summary = cached?.text
    ? cached.text.slice(0, 280)
    : `Original message text unavailable (outside reaction-cache retention window). Reaction by Telegram user ${actor ?? "?"} on message ${reaction.message_id}.`;
  await recordTelegramSignalEvent({
    startupId: bound.startupId,
    eventType: "founder_marked_milestone",
    severity: "positive",
    title,
    summary,
    payload: {
      telegramChatId: chatId,
      messageId: reaction.message_id,
      actorTelegramId: actor,
      originalAuthorTelegramId: cached?.authorTelegramId ?? null,
      originalAuthorUsername: cached?.authorUsername ?? null,
      originalText: cached?.text ?? null,
      originalMessageDate: cached?.date ?? null,
      enrichmentMissed,
    },
    dedupeKey: `reaction:${chatId}:${reaction.message_id}:${actor ?? "?"}`,
    occurredAt: new Date(reaction.date * 1000),
  });
}

async function captureMilestone(startupId: string, message: TelegramMessage): Promise<void> {
  await recordTelegramSignalEvent({
    startupId,
    eventType: "founder_marked_milestone",
    severity: "positive",
    title: "Milestone tagged (#vmu)",
    summary: (message.text || message.caption || "").slice(0, 280),
    payload: {
      telegramChatId: String(message.chat.id),
      messageId: message.message_id,
      authorTelegramId: message.from?.id,
      authorUsername: message.from?.username,
    },
    dedupeKey: `vmu:${message.chat.id}:${message.message_id}`,
    occurredAt: new Date(message.date * 1000),
  });
}

async function handlePrivateMessage(message: TelegramMessage): Promise<void> {
  const fromId = message.from?.id;
  if (!fromId) return;

  const text = message.text || "";
  if (text.startsWith("/start")) {
    const parts = text.split(/\s+/);
    const tokenArg = parts[1];
    if (tokenArg) {
      const binding = await storage.getTelegramFounderBindingByToken(tokenArg);
      if (binding) {
        await storage.bindTelegramFounder(binding.id, String(fromId), message.from?.username || null);
        await sendTelegramMessage(fromId, botReply(binding.language || "en", "linkedFounder"));
        return;
      }
    }
    await sendTelegramMessage(fromId, botReply("en", "needLink"));
    return;
  }

  const bindings = await storage.getTelegramFounderBindingsByTelegramUser(String(fromId));
  if (bindings.length === 0) {
    await sendTelegramMessage(fromId, botReply("en", "needLink"));
    return;
  }

  const isForward = !!(message.forward_from || message.forward_from_chat || message.forward_origin);
  if (!isForward && !text && !message.caption) return;

  const summary = (text || message.caption || "(forwarded media)").slice(0, 500);
  // A founder may belong to multiple startups — record one forward_capture
  // signal_event per startup they own.
  for (const binding of bindings) {
    await recordTelegramSignalEvent({
      startupId: binding.startupId,
      eventType: "forward_capture",
      severity: "info",
      title: isForward ? "Founder forwarded post" : "Founder note",
      summary,
      payload: {
        telegramUserId: fromId,
        founderUserId: binding.userId,
        messageId: message.message_id,
        forwardFrom: message.forward_from?.username || message.forward_from_chat?.username || null,
      },
      dedupeKey: `forward:${binding.startupId}:${fromId}:${message.message_id}`,
      occurredAt: new Date(message.date * 1000),
    });
  }
  await sendTelegramMessage(fromId, botReply(bindings[0].language || "en", "forwardAck"));
}

/**
 * Daily aggregator. Reads yesterday's per-chat stats and emits one
 * `team_chat_health` signal_event per chat with delta info, then marks
 * the row dispatched.
 */
export async function runTelegramDailyAggregator(): Promise<number> {
  const today = todayKey();
  const stats = await storage.getUndispatchedTelegramStats(today);
  let emitted = 0;
  for (const stat of stats) {
    const bound = await storage.getTelegramChatByChatId(stat.telegramChatId);
    if (!bound) {
      await storage.markTelegramStatsDispatched(stat.id);
      continue;
    }
    const memberCount = await getTelegramChatMemberCount(stat.telegramChatId);
    const previous = bound.lastMemberCount ?? null;
    const delta = previous != null && memberCount != null ? memberCount - previous : null;
    if (memberCount != null) await storage.setTelegramChatMemberCount(stat.telegramChatId, memberCount);

    const activeMembers = stat.activeMembers ?? [];
    await recordTelegramSignalEvent({
      startupId: bound.startupId,
      eventType: "team_chat_health",
      severity: "info",
      title: bound.title || "Team chat",
      summary: `${stat.messageCount} messages, ${activeMembers.length} active members${delta != null ? `, ${delta >= 0 ? "+" : ""}${delta} member delta` : ""}`,
      payload: {
        telegramChatId: stat.telegramChatId,
        day: stat.day,
        messageCount: stat.messageCount,
        activeMemberCount: activeMembers.length,
        memberCount,
        memberDelta: delta,
      },
      dedupeKey: `health:${stat.telegramChatId}:${stat.day}`,
      occurredAt: new Date(`${stat.day}T12:00:00Z`),
    });
    await storage.markTelegramStatsDispatched(stat.id);
    emitted++;
  }
  return emitted;
}

/**
 * Returns the current user's per-(startup, user) Telegram founder binding,
 * creating one (with a fresh deep-link token) on first access.
 */
export async function getOrCreateFounderBinding(startupId: string, userId: string, language: string) {
  const existing = await storage.getTelegramFounderBinding(startupId, userId);
  if (existing) return existing;
  const { nanoid } = await import("nanoid");
  const linkToken = nanoid(20);
  return storage.createTelegramFounderBinding({ startupId, userId, linkToken, language });
}
