import { SignalIngestor, type IngestorContext } from "../../base";
import { storage } from "../../../storage";
import { decryptConfig, encryptConfig } from "../../crypto";

/**
 * Yandex Metrika web traffic source. Pulls daily visits / users / bounce rate
 * via the Reporting API and emits a `traffic_pulse` event.
 *
 * Credential shape:
 *   { token: string, refreshToken?: string, expiresAt?: number, counterId: string }
 */
export class YandexMetrikaSource extends SignalIngestor {
  readonly sourceKey = "yandex-metrika";
  readonly displayName = "Yandex Metrika";
  readonly category = "founder-oauth";
  readonly scoreCategory = "market_presence" as const;
  readonly description = "Daily web traffic from Yandex Metrika.";
  readonly requiresCredentials = true;
  readonly credentialKind = "yandex-metrika";

  protected async execute(ctx: IngestorContext): Promise<number> {
    const startup = ctx.startup;
    if (!startup) return 0;
    const cred = await storage.getIntegrationCredential(startup.id, this.credentialKind!);
    if (!cred || cred.status !== "active") return 0;

    let config: any = decryptConfig(cred.encryptedConfig) ?? {};
    if (!config.token || !config.counterId) return 0;

    // Refresh token if needed
    if (config.expiresAt && config.expiresAt < Date.now() + 60_000 && config.refreshToken) {
      const cid = process.env.YANDEX_OAUTH_CLIENT_ID;
      const csec = process.env.YANDEX_OAUTH_CLIENT_SECRET;
      if (cid && csec) {
        try {
          const body = new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: config.refreshToken,
            client_id: cid,
            client_secret: csec,
          });
          const r = await fetch("https://oauth.yandex.ru/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: body.toString(),
          });
          if (r.ok) {
            const d: any = await r.json();
            if (d.access_token) {
              config = {
                ...config,
                token: d.access_token,
                refreshToken: d.refresh_token ?? config.refreshToken,
                expiresAt: d.expires_in ? Date.now() + d.expires_in * 1000 : null,
              };
              await storage.upsertIntegrationCredential({
                startupId: startup.id,
                kind: this.credentialKind!,
                status: "active",
                encryptedConfig: encryptConfig(config) as any,
              });
            }
          }
        } catch (e) {
          console.warn("[yandex-metrika] refresh failed:", e);
        }
      }
    }

    // Pull yesterday's metrics
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const date = yesterday.toISOString().slice(0, 10);
    const params = new URLSearchParams({
      ids: String(config.counterId),
      metrics: "ym:s:visits,ym:s:users,ym:s:bounceRate,ym:s:avgVisitDurationSeconds",
      date1: date,
      date2: date,
      accuracy: "full",
    });
    const res = await fetch(
      `https://api-metrika.yandex.net/stat/v1/data?${params.toString()}`,
      { headers: { Authorization: `OAuth ${config.token}` } },
    );
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        await storage.upsertIntegrationCredential({
          startupId: startup.id,
          kind: this.credentialKind!,
          status: "expired",
          encryptedConfig: cred.encryptedConfig as any,
        });
      }
      throw new Error(`Yandex Metrika API failed: ${res.status}`);
    }
    const data: any = await res.json();
    // Metrika returns `totals` as a flat array of metric values matching the
    // order of the `metrics` query param: [visits, users, bounceRate, avgDur].
    const totalsArr: number[] = Array.isArray(data?.totals) ? data.totals : [];
    const [visits = 0, users = 0, bounceRate = 0, avgDuration = 0] = totalsArr;

    const created = await this.recordEvent({
      startupId: startup.id,
      eventType: "traffic_pulse",
      severity: visits > 100 ? "positive" : "info",
      title: `Yandex Metrika: ${Math.round(visits)} visits / ${Math.round(users)} users`,
      summary: `Traffic for ${date}: ${Math.round(visits)} visits, ${Math.round(users)} unique users, bounce ${bounceRate.toFixed(1)}%, avg duration ${Math.round(avgDuration)}s.`,
      occurredAt: yesterday,
      payload: {
        date,
        counterId: config.counterId,
        visits: Math.round(visits),
        users: Math.round(users),
        bounceRate: Number(bounceRate.toFixed(2)),
        avgDurationSec: Math.round(avgDuration),
      },
      dedupeKey: `${startup.id}:metrika:${config.counterId}:${date}`,
      verifiedBy: ["yandex-metrika-oauth"],
    });
    return created ? 1 : 0;
  }
}
