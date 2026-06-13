import type { Express, Request } from "express";
import crypto from "crypto";
import { z } from "zod";
import { storage } from "./storage";
import { isAuthenticated, isNotFrozen } from "./auth";
import { GROUP3_SOURCE_KEYS, type Group3SourceKey } from "./signals/sources/group3";
import { DEFAULT_MAIL_WHITELIST } from "./signals/sources/group3/mail-forwarder";
import { parseInboundEmail } from "./signals/sources/group3/inbound-inbox";
import { getIngestor } from "./signals/registry";
import { encryptConfig, decryptConfig, isEncryptionConfigured } from "./signals/crypto";

const SOURCE_KEY_SET = new Set<string>(GROUP3_SOURCE_KEYS);

const INBOUND_DOMAIN = process.env.INBOUND_EMAIL_DOMAIN || "in.ventorix.club";

function inboxAddressFor(startupId: string): string {
  return `${startupId}@${INBOUND_DOMAIN}`;
}

async function userCanManageStartup(userId: string, startupId: string): Promise<boolean> {
  const dbUser = await storage.getUser(userId);
  if (dbUser?.isHeadAdmin || dbUser?.role === "innoLabsAdmin") return true;
  const userStartups = await storage.getUserStartups(userId);
  return userStartups.some(
    (us) => us.startupId === startupId && (us.role === "founder" || us.role === "cofounder"),
  );
}

const connectSchemas: Record<Group3SourceKey, z.ZodType<any>> = {
  "github-app": z.object({
    installationId: z.string().min(1),
    installationToken: z.string().min(1).optional(),
  }),
  "yandex-metrika": z.object({
    token: z.string().min(8),
    counterId: z.string().min(1),
  }),
  "product-analytics": z.object({
    provider: z.enum(["plausible", "mixpanel", "amplitude", "ga4"]),
    apiKey: z.string().min(1).optional(),
    apiSecret: z.string().min(1).optional(),
    projectId: z.string().min(1).optional(),
    siteId: z.string().min(1).optional(),
    serviceAccountJson: z.string().min(1).optional(),
  }),
  calendar: z.object({
    provider: z.enum(["google", "yandex"]),
    accessToken: z.string().min(8),
    refreshToken: z.string().optional(),
    expiresAt: z.number().optional(),
  }),
  "mail-forwarder": z.object({
    provider: z.enum(["gmail", "yandex"]),
    accessToken: z.string().min(8),
    refreshToken: z.string().optional(),
    whitelist: z.array(z.string().min(1)).default(DEFAULT_MAIL_WHITELIST),
  }),
  "inbound-inbox": z.object({}).default({}),
  slack: z.object({
    botToken: z.string().min(8),
    teamId: z.string().min(1),
    scopes: z.array(z.string()).optional(),
  }),
};

function maskedConfig(kind: Group3SourceKey, config: any): any {
  if (!config) return null;
  const safe: any = {};
  for (const [key, value] of Object.entries(config)) {
    if (typeof value === "string" && /token|secret|apikey|json|key/i.test(key)) {
      safe[key] = `***${value.slice(-4)}`;
    } else {
      safe[key] = value;
    }
  }
  if (kind === "inbound-inbox") {
    safe.address = (config as any).address;
  }
  return safe;
}

// Best-effort provider-side revoke. Failures don't block local disconnect, but
// are surfaced in the response so the founder knows to revoke manually.
async function revokeAtProvider(kind: Group3SourceKey, config: any): Promise<string | null> {
  try {
    if (!config) return null;
    if (kind === "calendar" && config.provider === "google" && config.accessToken) {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(config.accessToken)}`, {
        method: "POST",
      });
      return "google_oauth_revoked";
    }
    if (kind === "mail-forwarder" && config.provider === "gmail" && config.accessToken) {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(config.accessToken)}`, {
        method: "POST",
      });
      return "google_oauth_revoked";
    }
    if (kind === "slack" && config.botToken) {
      await fetch("https://slack.com/api/auth.revoke", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.botToken}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });
      return "slack_revoked";
    }
    if (kind === "github-app" && config.installationId && config.installationToken) {
      // GitHub app installation tokens are short-lived; we just expire them by
      // calling the token's delete endpoint. Founders should also uninstall
      // the app from the org settings page.
      await fetch(`https://api.github.com/installation/token`, {
        method: "DELETE",
        headers: {
          Authorization: `token ${config.installationToken}`,
          Accept: "application/vnd.github+json",
        },
      });
      return "github_token_revoked";
    }
    return null;
  } catch (e: any) {
    return `revoke_failed:${e.message}`;
  }
}

// --- Inbound webhook signature verification --------------------------------
//
// Resend Inbound forwards via Svix and signs each request with three headers:
//   svix-id, svix-timestamp, svix-signature  (signature = base64(HMAC-SHA256))
// SendGrid Inbound Parse can sign with an Ed25519 key (the public key is set
// in the SendGrid dashboard) using `X-Twilio-Email-Event-Webhook-Signature`
// and `X-Twilio-Email-Event-Webhook-Timestamp`.
//
// We require ONE of:
//   - RESEND_INBOUND_SECRET (svix-style)
//   - SENDGRID_INBOUND_PUBLIC_KEY (Ed25519 verify)
//   - INBOUND_EMAIL_SHARED_SECRET (X-Inbound-Secret header — fallback for tests)
// If none of these are configured, the webhook refuses traffic in production.
function verifyInboundSignature(req: Request, rawBody: string): { ok: boolean; reason?: string } {
  const sharedSecret = process.env.INBOUND_EMAIL_SHARED_SECRET;
  if (sharedSecret) {
    const provided = req.header("X-Inbound-Secret") || "";
    if (
      provided.length === sharedSecret.length &&
      crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(sharedSecret))
    ) {
      return { ok: true };
    }
    return { ok: false, reason: "shared_secret_mismatch" };
  }

  const resendSecret = process.env.RESEND_INBOUND_SECRET;
  if (resendSecret) {
    const id = req.header("svix-id");
    const ts = req.header("svix-timestamp");
    const sig = req.header("svix-signature");
    if (!id || !ts || !sig) return { ok: false, reason: "missing_svix_headers" };
    // Reject replays older than 5 minutes.
    const skew = Math.abs(Date.now() / 1000 - Number(ts));
    if (!Number.isFinite(skew) || skew > 300) return { ok: false, reason: "stale_timestamp" };
    const secretBytes = resendSecret.startsWith("whsec_")
      ? Buffer.from(resendSecret.slice(6), "base64")
      : Buffer.from(resendSecret, "utf8");
    const toSign = `${id}.${ts}.${rawBody}`;
    const expected = crypto.createHmac("sha256", secretBytes).update(toSign).digest("base64");
    const provided = sig
      .split(" ")
      .map((s) => s.split(",")[1])
      .filter(Boolean);
    const match = provided.some(
      (p) =>
        p.length === expected.length &&
        crypto.timingSafeEqual(Buffer.from(p), Buffer.from(expected)),
    );
    return match ? { ok: true } : { ok: false, reason: "svix_signature_mismatch" };
  }

  const sgPub = process.env.SENDGRID_INBOUND_PUBLIC_KEY;
  if (sgPub) {
    const sig = req.header("X-Twilio-Email-Event-Webhook-Signature");
    const ts = req.header("X-Twilio-Email-Event-Webhook-Timestamp");
    if (!sig || !ts) return { ok: false, reason: "missing_sendgrid_headers" };
    try {
      const keyDer = Buffer.from(sgPub, "base64");
      const pubKey = crypto.createPublicKey({ key: keyDer, format: "der", type: "spki" });
      const ok = crypto.verify(
        null,
        Buffer.from(ts + rawBody, "utf8"),
        pubKey,
        Buffer.from(sig, "base64"),
      );
      return ok ? { ok: true } : { ok: false, reason: "sendgrid_signature_mismatch" };
    } catch (e: any) {
      return { ok: false, reason: `sendgrid_verify_error:${e.message}` };
    }
  }

  // No verification mechanism configured — refuse by default.
  return { ok: false, reason: "no_verification_configured" };
}

export function registerGroup3Routes(app: Express): void {
  // List all 7 connector cards with status for a startup.
  app.get("/api/startups/:id/integrations", isAuthenticated, async (req: any, res) => {
    try {
      const startupId = req.params.id;
      const startup = await storage.getStartup(startupId);
      if (!startup) return res.status(404).json({ message: "Startup not found" });
      const userId = req.user?.claims?.sub || req.user?.id;
      const canManage = await userCanManageStartup(userId, startupId);

      const creds = await storage.listIntegrationCredentials(startupId);
      const credByKind = new Map(creds.map((c) => [c.kind, c]));

      const cards = GROUP3_SOURCE_KEYS.map((kind) => {
        const cred = credByKind.get(kind);
        const ingestor = getIngestor(kind);
        const status = cred ? cred.status : "not_connected";
        const decrypted = cred ? decryptConfig(cred.encryptedConfig) : null;
        return {
          kind,
          displayName: ingestor?.displayName ?? kind,
          description: ingestor?.description ?? null,
          status,
          connected: !!cred && cred.status === "active",
          updatedAt: cred?.updatedAt ?? null,
          config: decrypted ? maskedConfig(kind, decrypted) : null,
          inboxAddress: kind === "inbound-inbox" ? inboxAddressFor(startupId) : undefined,
        };
      });

      res.json({ canManage, cards });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Connect / update a card. For inbound-inbox this just provisions the
  // address; for everything else it accepts paste-in OAuth or API tokens.
  // All credential payloads are AES-256-GCM encrypted before being persisted.
  app.post("/api/startups/:id/integrations/:kind", isAuthenticated, isNotFrozen, async (req: any, res) => {
    try {
      if (!isEncryptionConfigured()) {
        return res.status(503).json({
          message:
            "INTEGRATION_ENCRYPTION_KEY (or SESSION_SECRET) is not configured; refusing to store credentials in plaintext.",
        });
      }

      const startupId = req.params.id;
      const kind = req.params.kind as string;
      if (!SOURCE_KEY_SET.has(kind)) {
        return res.status(400).json({ message: "Unknown integration kind" });
      }
      const userId = req.user?.claims?.sub || req.user?.id;
      const canManage = await userCanManageStartup(userId, startupId);
      if (!canManage) return res.status(403).json({ message: "Only founders can manage integrations" });

      const schema = connectSchemas[kind as Group3SourceKey];
      const config = schema.parse(req.body ?? {});

      let storedConfig: any = config;
      if (kind === "inbound-inbox") {
        storedConfig = { address: inboxAddressFor(startupId), createdAt: new Date().toISOString() };
      }

      const cred = await storage.upsertIntegrationCredential({
        startupId,
        kind,
        status: "active",
        encryptedConfig: encryptConfig(storedConfig) as any,
      });

      res.json({
        kind: cred.kind,
        status: cred.status,
        connected: true,
        config: maskedConfig(kind as Group3SourceKey, storedConfig),
        inboxAddress: kind === "inbound-inbox" ? inboxAddressFor(startupId) : undefined,
      });
    } catch (e: any) {
      if (e.name === "ZodError") {
        return res.status(400).json({ message: e.errors?.[0]?.message ?? "Invalid input" });
      }
      res.status(500).json({ message: e.message });
    }
  });

  // Disconnect: best-effort revoke at the provider, then delete the local row
  // so the source goes back to not_connected on the integrations page.
  app.delete("/api/startups/:id/integrations/:kind", isAuthenticated, isNotFrozen, async (req: any, res) => {
    try {
      const startupId = req.params.id;
      const kind = req.params.kind as string;
      if (!SOURCE_KEY_SET.has(kind)) {
        return res.status(400).json({ message: "Unknown integration kind" });
      }
      const userId = req.user?.claims?.sub || req.user?.id;
      const canManage = await userCanManageStartup(userId, startupId);
      if (!canManage) return res.status(403).json({ message: "Only founders can manage integrations" });

      const existing = await storage.getIntegrationCredential(startupId, kind);
      let revokeResult: string | null = null;
      if (existing?.encryptedConfig) {
        const config = decryptConfig(existing.encryptedConfig);
        revokeResult = await revokeAtProvider(kind as Group3SourceKey, config);
      }
      await storage.deleteIntegrationCredential(startupId, kind);
      res.json({ ok: true, revoke: revokeResult });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Inbound mail webhook. Compatible with Resend Inbound (Svix-signed) and
  // SendGrid Inbound Parse (Ed25519). Each forwarding inbox routes by the
  // local-part of `to` to the matching startup. Body parsed (Stripe / ЮKassa
  // / RevenueCat receipts → revenue_signal).
  //
  // Hardening:
  //   1. Provider signature MUST verify (svix / sendgrid / shared secret).
  //   2. Target startup MUST have an active `inbound-inbox` credential.
  app.post("/api/inbound-email", async (req, res) => {
    try {
      const rawBody =
        typeof (req as any).rawBody === "string"
          ? (req as any).rawBody
          : JSON.stringify(req.body ?? {});

      const verify = verifyInboundSignature(req, rawBody);
      if (!verify.ok) {
        console.warn(`[inbound-email] rejected: ${verify.reason}`);
        return res.status(401).json({ message: "Unauthorized webhook", reason: verify.reason });
      }

      const body = req.body ?? {};
      const to: string = body.to || body.envelope?.to?.[0] || body.toEmail || "";
      const from: string = body.from || body.envelope?.from || body.fromEmail || "";
      const subject: string = body.subject || "";
      const text: string = body.text || body.plain || "";

      if (!to || !from) {
        return res.status(400).json({ message: "Missing to/from" });
      }

      const localPart = to.split("@")[0]?.trim();
      if (!localPart) return res.status(400).json({ message: "Invalid recipient" });

      const startup = await storage.getStartup(localPart);
      if (!startup) {
        console.warn(`[inbound-email] no startup for local-part=${localPart}`);
        return res.json({ ok: false, reason: "unknown_inbox" });
      }

      // Require the target startup to have explicitly connected the inbound
      // inbox. Otherwise we silently drop — this prevents an attacker from
      // injecting events into startups that never opted in.
      const inboxCred = await storage.getIntegrationCredential(startup.id, "inbound-inbox");
      if (!inboxCred || inboxCred.status !== "active") {
        return res.json({ ok: false, reason: "inbox_not_provisioned" });
      }

      const fromDomain = (from.match(/@([^>\s]+)/)?.[1] || "").toLowerCase();

      const parsed = parseInboundEmail(fromDomain, subject);
      const eventType = parsed.eventType;
      const severity = parsed.severity;
      const subjectHash = crypto.createHash("sha256").update(subject || "").digest("hex").slice(0, 32);
      const payload: any = {
        ...parsed.payload,
        fromDomain,
        subjectHash,
        bodyLength: text.length,
        privacy: "metadata-only",
      };

      const dedupeKey = `${startup.id}:inbound:${fromDomain}:${subjectHash}:${Date.now().toString().slice(0, -3)}`;
      const ingestor = getIngestor("inbound-inbox");
      const dedupeHash = ingestor
        ? ingestor.dedupe(dedupeKey)
        : crypto.createHash("sha256").update(`inbound-inbox:${dedupeKey}`).digest("hex").slice(0, 64);

      const created = await storage.recordSignalEvent({
        startupId: startup.id,
        sourceKey: "inbound-inbox",
        eventType,
        severity,
        title: `Inbound ${parsed.payload?.provider ?? eventType} from ${fromDomain}`,
        summary: `Forwarded email from ${fromDomain}`,
        url: null,
        occurredAt: new Date(),
        payload,
        dedupeHash,
        verifiedBy: ["inbound-email"],
      });

      res.json({ ok: true, created });
    } catch (e: any) {
      console.error("[inbound-email] error:", e);
      res.status(500).json({ message: e.message });
    }
  });

  // Last 10 inbound emails for the integrations UI (metadata only).
  app.get(
    "/api/startups/:id/inbound-inbox/recent",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const startupId = String(req.params.id);
        const userId = req.user?.claims?.sub || req.user?.id;
        if (!userId || !(await userCanManageStartup(userId, startupId))) {
          return res.status(403).json({ message: "Not authorised for this startup" });
        }
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const events = await storage.getStartupSignalEventsInWindow(startupId, since);
        const filtered = events
          .filter((e: any) => e.sourceKey === "inbound-inbox")
          .slice(0, 10)
          .map((e: any) => ({
            id: e.id,
            occurredAt: e.occurredAt,
            eventType: e.eventType,
            severity: e.severity,
            payload: {
              fromDomain: e.payload?.fromDomain ?? null,
              provider: e.payload?.provider ?? null,
              kind: e.payload?.kind ?? null,
              amount: e.payload?.amount ?? null,
              currency: e.payload?.currency ?? null,
            },
          }));
        res.json({ events: filtered });
      } catch (e: any) {
        res.status(500).json({ message: e?.message ?? "Failed to load inbound emails" });
      }
    },
  );

  // Slack-specific OAuth shortcuts. The generic flow lives at
  // /api/startups/integrations/oauth/:key/{start,callback}; these aliases keep
  // the documented public URLs stable for the Slack app manifest.
  app.get(
    "/api/integrations/slack/oauth/start",
    isAuthenticated,
    isNotFrozen,
    async (req: any, res) => {
      const startupId = String(req.query.startupId || "");
      if (!startupId) return res.status(400).json({ message: "startupId required" });
      res.redirect(
        `/api/startups/integrations/oauth/slack/start?startupId=${encodeURIComponent(startupId)}`,
      );
    },
  );
  app.get("/api/integrations/slack/oauth/callback", (req, res) => {
    const qs = new URLSearchParams(req.query as any).toString();
    res.redirect(`/api/startups/integrations/oauth/slack/callback?${qs}`);
  });
}
