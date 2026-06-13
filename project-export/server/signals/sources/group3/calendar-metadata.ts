import { SignalIngestor, type IngestorContext } from "../../base";
import { storage } from "../../../storage";
import { decryptConfig, encryptConfig } from "../../crypto";

/**
 * Google Calendar metadata source. Privacy rule: NEVER store event titles or
 * attendee emails. Only meeting count, total minutes, and the *domain* of each
 * external participant.
 *
 * Credential shape:
 *   { provider: "google", accessToken, refreshToken?, expiresAt? }
 */
export class CalendarMetadataSource extends SignalIngestor {
  readonly sourceKey = "calendar";
  readonly displayName = "Calendar (Google)";
  readonly category = "founder-oauth";
  readonly scoreCategory = "team_health" as const;
  readonly description = "Meeting metadata only — no titles, no attendee emails.";
  readonly requiresCredentials = true;
  readonly credentialKind = "calendar";

  protected async execute(ctx: IngestorContext): Promise<number> {
    const startup = ctx.startup;
    if (!startup) return 0;
    const cred = await storage.getIntegrationCredential(startup.id, this.credentialKind!);
    if (!cred || cred.status !== "active") return 0;

    let config: any = decryptConfig(cred.encryptedConfig) ?? {};
    if (config.provider !== "google") return 0; // Yandex calendar not implemented yet

    const token = await ensureGoogleToken(startup.id, this.credentialKind!, config);
    if (!token) return 0;
    config = token.config;

    const now = new Date();
    const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const params = new URLSearchParams({
      timeMin: start.toISOString(),
      timeMax: now.toISOString(),
      singleEvents: "true",
      maxResults: "250",
    });
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
      { headers: { Authorization: `Bearer ${config.accessToken}` } },
    );
    if (!res.ok) {
      if (res.status === 401) {
        await storage.upsertIntegrationCredential({
          startupId: startup.id,
          kind: this.credentialKind!,
          status: "expired",
          encryptedConfig: cred.encryptedConfig as any,
        });
      }
      throw new Error(`Google Calendar API failed: ${res.status}`);
    }
    const data: any = await res.json();
    const events: any[] = (data.items || []).filter((e: any) => e.start?.dateTime);

    // Self-domain so we can exclude it from "external" tally. Best signal:
    // the `self: true` attendee on any event we organize. Fall back to the
    // organizer's own email domain.
    let selfDomain: string | null = null;
    for (const ev of events) {
      const selfAttendee = (ev.attendees ?? []).find((a: any) => a.self);
      const candidate = selfAttendee?.email || ev.organizer?.email || "";
      const d = (candidate.split("@")[1] || "").toLowerCase();
      if (d) {
        selfDomain = d;
        break;
      }
    }

    let totalMinutes = 0;
    const externalDomains = new Set<string>();
    for (const ev of events) {
      const startMs = new Date(ev.start.dateTime).getTime();
      const endMs = ev.end?.dateTime ? new Date(ev.end.dateTime).getTime() : startMs + 30 * 60_000;
      totalMinutes += Math.max(0, Math.round((endMs - startMs) / 60_000));
      for (const a of ev.attendees ?? []) {
        if (a.self) continue;
        const email: string = a.email || "";
        const domain = (email.split("@")[1] || "").toLowerCase();
        if (!domain) continue;
        if (selfDomain && domain === selfDomain) continue;
        externalDomains.add(domain);
      }
    }

    const today = now.toISOString().slice(0, 10);
    const created = await this.recordEvent({
      startupId: startup.id,
      eventType: "calendar_metadata_pull",
      severity: "info",
      title: `Calendar: ${events.length} meetings, ${totalMinutes} min`,
      summary: `Counts only — ${events.length} meetings totalling ${totalMinutes}min across ${externalDomains.size} external domains.`,
      occurredAt: now,
      payload: {
        date: today,
        meetingCount: events.length,
        totalMinutes,
        externalDomains: Array.from(externalDomains).slice(0, 50),
        privacy: "metadata-only",
      },
      dedupeKey: `${startup.id}:calendar:google:${today}`,
      verifiedBy: ["google-calendar-oauth"],
    });
    return created ? 1 : 0;
  }
}

/** Returns a fresh access token, refreshing & persisting if expired. */
export async function ensureGoogleToken(
  startupId: string,
  kind: string,
  config: any,
): Promise<{ config: any } | null> {
  if (!config.accessToken) return null;
  const expiresAt: number | null = config.expiresAt ?? null;
  // 60 second grace period
  if (!expiresAt || expiresAt > Date.now() + 60_000) return { config };
  if (!config.refreshToken) return { config }; // can't refresh; let API call fail with 401

  const cid = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const csec = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!cid || !csec) return { config };

  const body = new URLSearchParams({
    client_id: cid,
    client_secret: csec,
    refresh_token: config.refreshToken,
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) return { config };
  const data: any = await res.json();
  if (!data.access_token) return { config };

  const newConfig = {
    ...config,
    accessToken: data.access_token,
    expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : null,
  };
  await storage.upsertIntegrationCredential({
    startupId,
    kind,
    status: "active",
    encryptedConfig: encryptConfig(newConfig) as any,
  });
  return { config: newConfig };
}
