import tls from "tls";
import { SignalIngestor, type IngestorContext } from "../../base";
import { getTargetStartups, safeFetchPublic, normalizeUrl, assertSafePublicUrl } from "./_helpers";

type SslInfo = { validTo: string; daysRemaining: number; issuer?: string };

async function checkSslExpiry(host: string, port = 443, timeoutMs = 8000): Promise<SslInfo | null> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (v: SslInfo | null) => {
      if (settled) return;
      settled = true;
      resolve(v);
    };
    try {
      const socket = tls.connect(
        { host, port, servername: host, timeout: timeoutMs, rejectUnauthorized: false },
        () => {
          const cert = socket.getPeerCertificate();
          socket.end();
          if (!cert || !cert.valid_to) return done(null);
          const validTo = cert.valid_to;
          const t = Date.parse(validTo);
          if (Number.isNaN(t)) return done(null);
          const daysRemaining = Math.round((t - Date.now()) / 86_400_000);
          const issuer = cert.issuer?.O ?? cert.issuer?.CN;
          done({ validTo, daysRemaining, issuer });
        },
      );
      socket.on("error", () => done(null));
      socket.on("timeout", () => {
        socket.destroy();
        done(null);
      });
    } catch {
      done(null);
    }
  });
}

export class WebsiteHeartbeatSource extends SignalIngestor {
  readonly sourceKey = "website-heartbeat";
  readonly displayName = "Website heartbeat";
  readonly category = "publicWeb";
  readonly description = "Daily uptime / SSL / last-modified probe of each startup site.";

  protected async execute(ctx: IngestorContext): Promise<number> {
    const startups = await getTargetStartups(ctx.startup);
    let created = 0;
    for (const startup of startups) {
      const raw = normalizeUrl(startup.website ?? startup.domain ?? null);
      if (!raw) continue;

      // SSRF guard: resolve and reject private/internal hosts before any fetch.
      let url: URL;
      try {
        url = await assertSafePublicUrl(raw);
      } catch {
        continue;
      }

      const res = await safeFetchPublic(url.toString(), { method: "GET" }, 10_000);
      const day = new Date().toISOString().slice(0, 10);
      if (!res) {
        if (await this.recordEvent({
          startupId: startup.id,
          eventType: "website.down",
          severity: "warning",
          title: `Website unreachable: ${url.toString()}`,
          summary: "No response from the homepage during heartbeat probe.",
          url: url.toString(),
          dedupeKey: `${startup.id}:down:${day}`,
        })) created++;
        continue;
      }

      const lastModified = res.headers.get("last-modified") ?? null;
      if (!res.ok) {
        if (await this.recordEvent({
          startupId: startup.id,
          eventType: "website.error",
          severity: res.status >= 500 ? "warning" : "info",
          title: `Website returned HTTP ${res.status}`,
          url: url.toString(),
          payload: { status: res.status, lastModified },
          dedupeKey: `${startup.id}:status:${res.status}:${day}`,
        })) created++;
      } else {
        if (await this.recordEvent({
          startupId: startup.id,
          eventType: "website.up",
          severity: "info",
          title: `Website healthy (HTTP ${res.status})`,
          url: url.toString(),
          payload: { status: res.status, lastModified },
          dedupeKey: `${startup.id}:up:${day}`,
        })) created++;
      }

      // Stale-content check
      if (lastModified) {
        const lm = new Date(lastModified);
        if (!Number.isNaN(lm.getTime())) {
          const ageDays = Math.round((Date.now() - lm.getTime()) / 86_400_000);
          if (ageDays >= 180) {
            if (await this.recordEvent({
              startupId: startup.id,
              eventType: "website.stale",
              severity: "warning",
              title: `Homepage unchanged for ${ageDays} days`,
              url: url.toString(),
              payload: { lastModified, ageDays },
              dedupeKey: `${startup.id}:stale:${lm.toISOString().slice(0, 10)}`,
            })) created++;
          }
        }
      }

      // SSL expiry — only for https
      if (url.protocol === "https:") {
        const ssl = await checkSslExpiry(url.hostname, url.port ? parseInt(url.port, 10) : 443);
        if (ssl) {
          let severity: "info" | "warning" | "critical" = "info";
          if (ssl.daysRemaining <= 0) severity = "critical";
          else if (ssl.daysRemaining <= 14) severity = "warning";
          else if (ssl.daysRemaining <= 30) severity = "info";

          if (severity !== "info" || ssl.daysRemaining <= 30) {
            if (await this.recordEvent({
              startupId: startup.id,
              eventType: severity === "critical" ? "website.ssl_expired" : "website.ssl_expiring",
              severity,
              title: ssl.daysRemaining <= 0
                ? `SSL certificate expired ${Math.abs(ssl.daysRemaining)}d ago`
                : `SSL certificate expires in ${ssl.daysRemaining} days`,
              url: url.toString(),
              payload: { validTo: ssl.validTo, daysRemaining: ssl.daysRemaining, issuer: ssl.issuer },
              dedupeKey: `${startup.id}:ssl:${ssl.validTo}`,
            })) created++;
          }
        }
      }
    }
    return created;
  }
}
