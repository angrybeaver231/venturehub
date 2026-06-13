import { SignalIngestor, type IngestorContext } from "../../base";
import { storage } from "../../../storage";
import { decryptConfig, encryptConfig } from "../../crypto";
import { ensureGoogleToken } from "./calendar-metadata";

/**
 * Whitelist of transactional email senders, grouped by category. Subject-only
 * classification — bodies are NEVER fetched (we use Gmail metadata scope).
 */
export const MAIL_PROVIDER_GROUPS: Record<string, string[]> = {
  payments: [
    "stripe.com",
    "yookassa.ru",
    "tinkoff.ru",
    "cloudpayments.ru",
    "robokassa.ru",
    "modulbank.ru",
    "tochka.com",
    "sberbank.ru",
    "alfabank.ru",
    "paypal.com",
    "paddle.com",
    "lemonsqueezy.com",
  ],
  analytics: [
    "appsflyer.com",
    "adjust.com",
    "branch.io",
    "mixpanel.com",
    "amplitude.com",
  ],
  recurring: [
    "revenuecat.com",
    "chargebee.com",
    "recurly.com",
  ],
  payroll: [
    "gusto.com",
    "paymo.biz",
  ],
};

export const DEFAULT_MAIL_WHITELIST: string[] = Object.values(MAIL_PROVIDER_GROUPS).flat();

export function categoryFor(domain: string): string | null {
  for (const [cat, list] of Object.entries(MAIL_PROVIDER_GROUPS)) {
    if (list.some((d) => domain === d || domain.endsWith(`.${d}`))) return cat;
  }
  return null;
}

/** Subject-only classifier into release/invoice/failure/chargeback/other. */
export function classifySubject(subject: string): string {
  const s = subject.toLowerCase();
  if (/(chargeback|disput|спор|возврат)/i.test(s)) return "chargeback";
  if (/(fail|declin|ошибк|неуспеш|отклон)/i.test(s)) return "failure";
  if (/(invoice|счёт|счет)/i.test(s)) return "invoice";
  if (/(release|deploy|launch|релиз|выпуск)/i.test(s)) return "release";
  if (/(receipt|payment|оплат|платёж|чек)/i.test(s)) return "invoice";
  return "other";
}

/**
 * Gmail metadata source. Headers-only (no bodies). Uses Gmail History API
 * for incremental polling once a baseline `historyId` is captured.
 *
 * Credential shape:
 *   { provider: "gmail", accessToken, refreshToken?, expiresAt?,
 *     whitelist?: string[], lastHistoryId?: string }
 */
export class MailForwarderSource extends SignalIngestor {
  readonly sourceKey = "mail-forwarder";
  readonly displayName = "Filtered mailbox (Gmail)";
  readonly category = "founder-oauth";
  readonly scoreCategory = "financial_health" as const;
  readonly description = "Read-only Gmail metadata for payment-provider receipts. No bodies.";
  readonly requiresCredentials = true;
  readonly credentialKind = "mail-forwarder";

  protected async execute(ctx: IngestorContext): Promise<number> {
    const startup = ctx.startup;
    if (!startup) return 0;
    const cred = await storage.getIntegrationCredential(startup.id, this.credentialKind!);
    if (!cred || cred.status !== "active") return 0;

    let config: any = decryptConfig(cred.encryptedConfig) ?? {};
    if (config.provider !== "gmail") return 0;

    const refreshed = await ensureGoogleToken(startup.id, this.credentialKind!, config);
    if (!refreshed) return 0;
    config = refreshed.config;

    const whitelist: string[] = Array.isArray(config.whitelist) && config.whitelist.length > 0
      ? config.whitelist
      : DEFAULT_MAIL_WHITELIST;

    const ids = await listMessageIds(config, whitelist);
    if (ids.messageIds.length === 0) {
      // Persist baseline historyId even if no new messages.
      if (ids.nextHistoryId && ids.nextHistoryId !== config.lastHistoryId) {
        await this.persistConfig(startup.id, { ...config, lastHistoryId: ids.nextHistoryId });
      }
      return 0;
    }

    let totalCreated = 0;
    for (const id of ids.messageIds.slice(0, 50)) {
      try {
        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
          { headers: { Authorization: `Bearer ${config.accessToken}` } },
        );
        if (!msgRes.ok) continue;
        const msg: any = await msgRes.json();
        const headers = (msg.payload?.headers || []) as Array<{ name: string; value: string }>;
        const from = headers.find((h) => h.name === "From")?.value || "";
        const subject = headers.find((h) => h.name === "Subject")?.value || "";
        const date = headers.find((h) => h.name === "Date")?.value;
        const fromDomain = (from.match(/@([^>\s]+)/)?.[1] || "").toLowerCase();
        if (!fromDomain || !whitelist.some((w) => fromDomain === w || fromDomain.endsWith(`.${w}`))) continue;

        const subjectClass = classifySubject(subject);
        const category = categoryFor(fromDomain);
        const severity = subjectClass === "chargeback" || subjectClass === "failure" ? "warning" : "info";
        const created = await this.recordEvent({
          startupId: startup.id,
          eventType: "payment_provider_email",
          severity,
          title: `${category ?? "uncategorised"} ${subjectClass} from ${fromDomain}`,
          summary: `${category ?? "uncategorised"} / ${subjectClass} from ${fromDomain}`,
          occurredAt: date ? new Date(date) : new Date(),
          payload: {
            provider: fromDomain,
            category,
            subjectClass,
            subjectHash: hashStr(subject),
            messageId: id,
            privacy: "headers-only",
          },
          dedupeKey: `${startup.id}:gmail:${id}`,
          verifiedBy: ["gmail-oauth"],
        });
        if (created) totalCreated++;
      } catch (e) {
        console.warn(`[mail-forwarder] message ${id}:`, e);
      }
    }

    if (ids.nextHistoryId && ids.nextHistoryId !== config.lastHistoryId) {
      await this.persistConfig(startup.id, { ...config, lastHistoryId: ids.nextHistoryId });
    }
    return totalCreated;
  }

  private async persistConfig(startupId: string, config: any): Promise<void> {
    await storage.upsertIntegrationCredential({
      startupId,
      kind: this.credentialKind!,
      status: "active",
      encryptedConfig: encryptConfig(config) as any,
    });
  }
}

/**
 * Returns new message ids since the last poll. If we have a `lastHistoryId`,
 * uses Gmail's History API for an incremental delta. Otherwise falls back to
 * messages.list with a 24h `q` filter and captures the current historyId as
 * the new baseline.
 */
async function listMessageIds(
  config: any,
  whitelist: string[],
): Promise<{ messageIds: string[]; nextHistoryId: string | null }> {
  const auth = { Authorization: `Bearer ${config.accessToken}` };

  if (config.lastHistoryId) {
    const params = new URLSearchParams({
      startHistoryId: String(config.lastHistoryId),
      historyTypes: "messageAdded",
      maxResults: "200",
    });
    const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/history?${params.toString()}`, {
      headers: auth,
    });
    if (res.status === 404) {
      // historyId expired — fall back to 24h scan + new baseline.
      return await listFallback(config, whitelist, auth);
    }
    if (!res.ok) {
      throw new Error(`Gmail history failed: ${res.status}`);
    }
    const data: any = await res.json();
    const messageIds = new Set<string>();
    for (const h of data.history || []) {
      for (const m of h.messagesAdded || []) {
        if (m.message?.id) messageIds.add(m.message.id);
      }
    }
    const nextHistoryId = data.historyId ? String(data.historyId) : config.lastHistoryId;
    return { messageIds: Array.from(messageIds), nextHistoryId };
  }

  return await listFallback(config, whitelist, auth);
}

async function listFallback(
  config: any,
  whitelist: string[],
  auth: Record<string, string>,
): Promise<{ messageIds: string[]; nextHistoryId: string | null }> {
  const since = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
  const fromQuery = whitelist.map((d) => `from:${d}`).join(" OR ");
  const q = encodeURIComponent(`(${fromQuery}) after:${since}`);
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${q}&maxResults=50`,
    { headers: auth },
  );
  if (!listRes.ok) {
    if (listRes.status === 401) {
      throw new Error(`Gmail list failed: 401 (token expired)`);
    }
    throw new Error(`Gmail list failed: ${listRes.status}`);
  }
  const list: any = await listRes.json();
  const messageIds: string[] = (list.messages || []).map((m: any) => m.id);

  // Capture profile.historyId as the new baseline.
  let nextHistoryId: string | null = null;
  try {
    const profileRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", { headers: auth });
    if (profileRes.ok) {
      const profile: any = await profileRes.json();
      nextHistoryId = profile.historyId ? String(profile.historyId) : null;
    }
  } catch {}
  return { messageIds, nextHistoryId };
}

function hashStr(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}
