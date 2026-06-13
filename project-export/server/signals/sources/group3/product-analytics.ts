import { SignalIngestor, type IngestorContext } from "../../base";
import { storage } from "../../../storage";
import { decryptConfig, encryptConfig } from "../../crypto";
import crypto from "crypto";

/**
 * Product analytics ingestor — pulls a daily DAU/WAU/MAU snapshot from the
 * configured provider (Plausible, Mixpanel, Amplitude, GA4) and emits
 * `analytics_pull` (info) plus `analytics_anomaly` (warning) when the
 * latest DAU drops > 30% vs the trailing 7-day average.
 *
 * Credential shape:
 *   { provider: "plausible" | "mixpanel" | "amplitude" | "ga4",
 *     apiKey?: string,        // Plausible bearer / Amplitude apiKey / Mixpanel apiSecret
 *     apiSecret?: string,     // Amplitude secret / Mixpanel secret (optional)
 *     projectId?: string,     // Plausible site_id / Mixpanel project_id / GA4 propertyId
 *     siteId?: string,        // alias for projectId (Plausible)
 *     serviceAccountJson?: string }  // GA4 service account JSON (raw string)
 */

export type AnalyticsSnapshot = {
  provider: string;
  dau: number;
  wau: number;
  mau: number;
  sessions30d: number;
  snapshotDate: string;
};

export class ProductAnalyticsSource extends SignalIngestor {
  readonly sourceKey = "product-analytics";
  readonly displayName = "Product analytics (Plausible / Mixpanel / Amplitude / GA4)";
  readonly category = "founder-oauth";
  readonly scoreCategory = "tech_activity" as const;
  readonly description = "Per-product analytics snapshot used by the vitality engine.";
  readonly requiresCredentials = true;
  readonly credentialKind = "product-analytics";

  protected async execute(ctx: IngestorContext): Promise<number> {
    const startup = ctx.startup;
    if (!startup) return 0;
    const cred = await storage.getIntegrationCredential(startup.id, this.credentialKind!);
    if (!cred || cred.status !== "active") return 0;
    const config = (decryptConfig(cred.encryptedConfig) ?? {}) as any;
    const provider: string = config.provider ?? "unknown";
    const today = new Date().toISOString().slice(0, 10);

    let snapshot: AnalyticsSnapshot;
    try {
      switch (provider) {
        case "plausible":
          snapshot = await fetchPlausible(config);
          break;
        case "mixpanel":
          snapshot = await fetchMixpanel(config);
          break;
        case "amplitude":
          snapshot = await fetchAmplitude(config);
          break;
        case "ga4":
          snapshot = await fetchGa4(config);
          break;
        default:
          return 0;
      }
    } catch (err: any) {
      console.warn(`[product-analytics:${provider}] fetch failed:`, err?.message ?? err);
      return 0;
    }

    let created = 0;
    const ok = await this.recordEvent({
      startupId: startup.id,
      eventType: "analytics_pull",
      severity: "info",
      title: `Analytics snapshot (${provider}): DAU ${snapshot.dau}`,
      summary: `DAU ${snapshot.dau}, WAU ${snapshot.wau}, MAU ${snapshot.mau}, sessions ${snapshot.sessions30d}.`,
      occurredAt: new Date(),
      payload: snapshot,
      dedupeKey: `${startup.id}:product-analytics:${provider}:${today}`,
      verifiedBy: [`product-analytics:${provider}`],
    });
    if (ok) created++;

    // Anomaly: compare today's DAU against trailing 7-day average of prior pulls.
    try {
      const since = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
      const recent = await storage.getStartupSignalEventsInWindow(startup.id, since);
      const dauHistory = recent
        .filter((e) => e.sourceKey === this.sourceKey && e.eventType === "analytics_pull")
        .map((e) => Number((e.payload as any)?.dau))
        .filter((n) => Number.isFinite(n) && n > 0);
      if (dauHistory.length >= 3) {
        const prior = dauHistory.slice(0, 7);
        const avg = prior.reduce((a, b) => a + b, 0) / prior.length;
        if (snapshot.dau > 0 && avg > 0 && snapshot.dau < avg * 0.7) {
          const anomaly = await this.recordEvent({
            startupId: startup.id,
            eventType: "analytics_anomaly",
            severity: "warning",
            title: `DAU dropped ${Math.round(((avg - snapshot.dau) / avg) * 100)}% vs 7-day avg`,
            summary: `Today's DAU ${snapshot.dau} is below 70% of the trailing 7-day average (${avg.toFixed(1)}).`,
            occurredAt: new Date(),
            payload: { provider, dau: snapshot.dau, trailingAvg: avg, drop: 1 - snapshot.dau / avg },
            dedupeKey: `${startup.id}:product-analytics:anomaly:${provider}:${today}`,
            verifiedBy: [`product-analytics:${provider}`],
          });
          if (anomaly) created++;
        }
      }
    } catch (err: any) {
      console.warn(`[product-analytics] anomaly check failed:`, err?.message ?? err);
    }

    // Persist the latest snapshot back into the credential config so the UI
    // can show "last DAU" without requerying signal_events.
    try {
      const merged = { ...config, lastSnapshot: snapshot };
      await storage.upsertIntegrationCredential({
        startupId: startup.id,
        kind: this.credentialKind!,
        status: "active",
        encryptedConfig: encryptConfig(merged) as any,
      });
    } catch {}

    return created;
  }
}

// --- Provider adapters ----------------------------------------------------

async function fetchPlausible(config: any): Promise<AnalyticsSnapshot> {
  const siteId = config.siteId || config.projectId;
  const apiKey = config.apiKey;
  if (!siteId || !apiKey) throw new Error("Plausible needs siteId + apiKey");
  const headers = { Authorization: `Bearer ${apiKey}` };

  const aggregate = async (period: string, metrics: string) => {
    const url = `https://plausible.io/api/v1/stats/aggregate?site_id=${encodeURIComponent(siteId)}&period=${period}&metrics=${metrics}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Plausible ${period} ${res.status}`);
    return (await res.json()) as any;
  };

  const day = await aggregate("day", "visitors,pageviews");
  const week = await aggregate("7d", "visitors");
  const month = await aggregate("30d", "visitors,visits");

  return {
    provider: "plausible",
    dau: Number(day.results?.visitors?.value ?? 0),
    wau: Number(week.results?.visitors?.value ?? 0),
    mau: Number(month.results?.visitors?.value ?? 0),
    sessions30d: Number(month.results?.visits?.value ?? 0),
    snapshotDate: new Date().toISOString().slice(0, 10),
  };
}

async function fetchMixpanel(config: any): Promise<AnalyticsSnapshot> {
  const projectId = config.projectId;
  const secret = config.apiSecret || config.apiKey;
  if (!secret) throw new Error("Mixpanel needs apiSecret (project secret)");
  const auth = `Basic ${Buffer.from(`${secret}:`).toString("base64")}`;
  const baseHeaders: Record<string, string> = { Authorization: auth, Accept: "application/json" };
  if (projectId) baseHeaders["X-Mixpanel-Project-Id"] = projectId;

  const runJql = async (script: string): Promise<any> => {
    const res = await fetch("https://mixpanel.com/api/2.0/jql", {
      method: "POST",
      headers: { ...baseHeaders, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ script }).toString(),
    });
    if (!res.ok) throw new Error(`Mixpanel JQL ${res.status}: ${await res.text()}`);
    return res.json();
  };

  const usersForWindow = (days: number) => `function main() {
    return Events({ from_date: '${isoDaysAgo(days)}', to_date: '${todayIso()}' })
      .groupByUser([], () => 1)
      .reduce(mixpanel.reducer.count());
  }`;

  const sessionsForWindow = (days: number) => `function main() {
    return Events({ from_date: '${isoDaysAgo(days)}', to_date: '${todayIso()}' })
      .reduce(mixpanel.reducer.count());
  }`;

  const [dau, wau, mau, sessions30d] = await Promise.all([
    runJql(usersForWindow(0)),
    runJql(usersForWindow(7)),
    runJql(usersForWindow(30)),
    runJql(sessionsForWindow(30)),
  ]);

  return {
    provider: "mixpanel",
    dau: numberFromJqlReducer(dau),
    wau: numberFromJqlReducer(wau),
    mau: numberFromJqlReducer(mau),
    sessions30d: numberFromJqlReducer(sessions30d),
    snapshotDate: new Date().toISOString().slice(0, 10),
  };
}

function numberFromJqlReducer(payload: any): number {
  if (Array.isArray(payload) && payload.length > 0 && typeof payload[0] === "number") return payload[0];
  if (typeof payload === "number") return payload;
  return 0;
}

async function fetchAmplitude(config: any): Promise<AnalyticsSnapshot> {
  const apiKey = config.apiKey;
  const secret = config.apiSecret;
  if (!apiKey || !secret) throw new Error("Amplitude needs apiKey + apiSecret");
  const auth = `Basic ${Buffer.from(`${apiKey}:${secret}`).toString("base64")}`;
  const headers = { Authorization: auth, Accept: "application/json" };

  const fetchActive = async (window: "day" | "week" | "month") => {
    const start = window === "day" ? isoCompactDaysAgo(1) : window === "week" ? isoCompactDaysAgo(7) : isoCompactDaysAgo(30);
    const end = isoCompactDaysAgo(0);
    const m = window === "day" ? "active" : window === "week" ? "active" : "active";
    const url = `https://amplitude.com/api/2/users?m=${m}&start=${start}&end=${end}&i=${window === "day" ? 1 : 7}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Amplitude ${window} ${res.status}`);
    const data: any = await res.json();
    const series: number[] = data.data?.series?.[0] ?? [];
    return series.length ? series[series.length - 1] : 0;
  };

  const sessions = async () => {
    const url = `https://amplitude.com/api/2/sessions/length?start=${isoCompactDaysAgo(30)}&end=${isoCompactDaysAgo(0)}`;
    const res = await fetch(url, { headers });
    if (!res.ok) return 0;
    const data: any = await res.json();
    const series: number[] = data.data?.series?.[0] ?? [];
    return series.reduce((a, b) => a + Number(b || 0), 0);
  };

  const [dau, wau, mau, sessions30d] = await Promise.all([
    fetchActive("day").catch(() => 0),
    fetchActive("week").catch(() => 0),
    fetchActive("month").catch(() => 0),
    sessions().catch(() => 0),
  ]);

  return {
    provider: "amplitude",
    dau,
    wau,
    mau,
    sessions30d,
    snapshotDate: new Date().toISOString().slice(0, 10),
  };
}

async function fetchGa4(config: any): Promise<AnalyticsSnapshot> {
  const propertyId = config.projectId;
  if (!propertyId) throw new Error("GA4 needs propertyId in projectId");
  const saRaw = config.serviceAccountJson;
  if (!saRaw) throw new Error("GA4 needs serviceAccountJson");
  const sa = typeof saRaw === "string" ? JSON.parse(saRaw) : saRaw;
  const accessToken = await getGa4AccessToken(sa);

  const runReport = async (days: number) => {
    const res = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(propertyId)}:runReport`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
          metrics: [{ name: "activeUsers" }, { name: "sessions" }],
        }),
      },
    );
    if (!res.ok) throw new Error(`GA4 ${days}d ${res.status}: ${await res.text()}`);
    const data: any = await res.json();
    const row = data.rows?.[0];
    return {
      users: Number(row?.metricValues?.[0]?.value ?? 0),
      sessions: Number(row?.metricValues?.[1]?.value ?? 0),
    };
  };

  const [day, week, month] = await Promise.all([runReport(1), runReport(7), runReport(30)]);

  return {
    provider: "ga4",
    dau: day.users,
    wau: week.users,
    mau: month.users,
    sessions30d: month.sessions,
    snapshotDate: new Date().toISOString().slice(0, 10),
  };
}

async function getGa4AccessToken(sa: any): Promise<string> {
  if (!sa.client_email || !sa.private_key) throw new Error("Invalid service account JSON");
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const enc = (obj: any) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");
  const signingInput = `${enc(header)}.${enc(claim)}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();
  const signature = signer.sign(sa.private_key).toString("base64url");
  const jwt = `${signingInput}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }).toString(),
  });
  if (!res.ok) throw new Error(`GA4 token exchange ${res.status}: ${await res.text()}`);
  const data: any = await res.json();
  if (!data.access_token) throw new Error("GA4 token exchange returned no access_token");
  return data.access_token;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
function isoDaysAgo(d: number): string {
  return new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
function isoCompactDaysAgo(d: number): string {
  return new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString().slice(0, 10).replace(/-/g, "");
}
