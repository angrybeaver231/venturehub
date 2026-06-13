import { SignalIngestor, type IngestorContext } from "../../base";
import { getTargetStartups, safeFetch, fetchJson, getLastEvent } from "./_helpers";
import { MissingCredentialError, getEnvCredential } from "../../credentials";

type TgChat = { id: number; title?: string; username?: string; type?: string; description?: string };
type TgResponse<T> = { ok: boolean; result?: T };

type TgSnapshotPayload = {
  username?: string;
  subscribers: number | null;
  type?: string;
  postsLast7d: number | null;
  ts: number;
};

/**
 * Best-effort post-frequency parser from the public t.me/s/<channel> preview page.
 * The Telegram Bot API cannot read channel post history, so we scrape the public
 * web preview, which exposes recent post timestamps in <time datetime="...">.
 */
function parseRecentPostTimestamps(html: string): number[] {
  const out: number[] = [];
  const re = /<time[^>]*datetime=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const t = Date.parse(m[1]);
    if (!Number.isNaN(t)) out.push(t);
  }
  return out;
}

export class TelegramPublicSource extends SignalIngestor {
  readonly sourceKey = "telegram-public";
  readonly displayName = "Telegram channel monitor";
  readonly category = "telegram";
  readonly description = "Subscriber count, growth deltas and post-frequency for public Telegram channels (Bot API + t.me public preview).";
  readonly requiresCredentials = true;
  readonly credentialKind = "TELEGRAM_BOT_TOKEN";

  protected async execute(ctx: IngestorContext): Promise<number> {
    const token = getEnvCredential("TELEGRAM_BOT_TOKEN");
    if (!token) throw new MissingCredentialError("TELEGRAM_BOT_TOKEN");

    const startups = await getTargetStartups(ctx.startup);
    let created = 0;
    for (const startup of startups) {
      const handle = (startup.telegramChannel ?? "").trim();
      if (!handle) continue;
      const usernameOnly = handle
        .replace(/^https?:\/\/t\.me\//i, "")
        .replace(/^@/, "")
        .replace(/^\//, "");
      const chatId = `@${usernameOnly}`;

      // Read prior snapshot FIRST so deltas are vs the true historical baseline.
      const prev = await getLastEvent(startup.id, this.sourceKey, "telegram.heartbeat");
      const prevPayload = (prev?.payload ?? null) as TgSnapshotPayload | null;

      const chatRes = await safeFetch(
        `https://api.telegram.org/bot${token}/getChat?chat_id=${encodeURIComponent(chatId)}`,
      );
      const countRes = await safeFetch(
        `https://api.telegram.org/bot${token}/getChatMemberCount?chat_id=${encodeURIComponent(chatId)}`,
      );
      const day = new Date().toISOString().slice(0, 10);
      const chatPayload = await fetchJson<TgResponse<TgChat>>(chatRes);
      const countPayload = await fetchJson<TgResponse<number>>(countRes);
      const chat = chatPayload?.result ?? null;
      const count = countPayload?.result ?? null;
      if (!chat) continue;

      // Best-effort post-frequency (last 7 days) via public preview page.
      let postsLast7d: number | null = null;
      const previewRes = await safeFetch(`https://t.me/s/${encodeURIComponent(usernameOnly)}`);
      if (previewRes?.ok) {
        const html = await previewRes.text();
        const cutoff = Date.now() - 7 * 86_400_000;
        postsLast7d = parseRecentPostTimestamps(html).filter((t) => t >= cutoff).length;
      }

      // Subscriber growth delta vs previous heartbeat (using prev fetched first).
      if (typeof count === "number" && prevPayload && typeof prevPayload.subscribers === "number") {
        const delta = count - prevPayload.subscribers;
        const sinceDays = prevPayload.ts
          ? Math.max(1, Math.round((Date.now() - prevPayload.ts) / 86_400_000))
          : 1;
        if (delta !== 0) {
          const severity =
            delta > 0
              ? "positive"
              : Math.abs(delta) > prevPayload.subscribers * 0.05
                ? "warning"
                : "info";
          if (await this.recordEvent({
            startupId: startup.id,
            eventType: "telegram.growth",
            severity,
            title: `Subscribers ${delta > 0 ? "+" : ""}${delta} over ${sinceDays}d (${prevPayload.subscribers} → ${count})`,
            payload: { delta, from: prevPayload.subscribers, to: count, sinceDays },
            dedupeKey: `${startup.id}:${chatId}:growth:${day}`,
          })) created++;
        }
      }

      // Snapshot
      const snapshot: TgSnapshotPayload = {
        username: chat.username,
        subscribers: typeof count === "number" ? count : null,
        type: chat.type,
        postsLast7d,
        ts: Date.now(),
      };
      const titleSuffix = postsLast7d !== null ? ` • ${postsLast7d} posts/7d` : "";
      if (await this.recordEvent({
        startupId: startup.id,
        eventType: "telegram.heartbeat",
        severity: "info",
        title: `${chat.title ?? chatId}: ${count ?? "?"} subscribers${titleSuffix}`,
        url: `https://t.me/${(chat.username ?? usernameOnly).replace(/^@/, "")}`,
        payload: snapshot,
        dedupeKey: `${startup.id}:${chatId}:${day}`,
      })) created++;

      // Posting-frequency warning if a channel goes silent for a week.
      if (postsLast7d === 0 && prevPayload && (prevPayload.postsLast7d ?? 0) > 0) {
        if (await this.recordEvent({
          startupId: startup.id,
          eventType: "telegram.silent",
          severity: "warning",
          title: `Channel went silent: 0 posts in last 7d (was ${prevPayload.postsLast7d})`,
          payload: { postsLast7d, prev: prevPayload.postsLast7d },
          dedupeKey: `${startup.id}:${chatId}:silent:${day}`,
        })) created++;
      }
    }
    return created;
  }
}
