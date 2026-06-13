import type { Express, Request, Response } from "express";
import crypto from "crypto";
import { storage } from "../storage";
import { encryptConfig, isEncryptionConfigured } from "./crypto";
import { isAuthenticated, isNotFrozen } from "../auth";

type Group3OAuthProvider = {
  kind: string;
  label: string;
  scopes: string[];
  clientId: () => string | undefined;
  clientSecret: () => string | undefined;
  authorizeUrl: (params: { state: string; redirectUri: string }) => string;
  exchange: (params: {
    code: string;
    redirectUri: string;
    clientId: string;
    clientSecret: string;
  }) => Promise<{ config: Record<string, any> }>;
};

const PROVIDERS: Record<string, Group3OAuthProvider> = {
  // GitHub OAuth App — user-to-server token with repo scope. Simpler than
  // a full GitHub App install flow and gives us read access to private repos
  // owned by the connecting user (and orgs they grant).
  "github-app": {
    kind: "github-app",
    label: "GitHub",
    scopes: ["repo", "read:org", "read:user"],
    clientId: () => process.env.GITHUB_OAUTH_CLIENT_ID,
    clientSecret: () => process.env.GITHUB_OAUTH_CLIENT_SECRET,
    authorizeUrl: ({ state, redirectUri }) => {
      const params = new URLSearchParams({
        client_id: process.env.GITHUB_OAUTH_CLIENT_ID || "",
        redirect_uri: redirectUri,
        scope: "repo read:org read:user",
        state,
        allow_signup: "false",
      });
      return `https://github.com/login/oauth/authorize?${params.toString()}`;
    },
    exchange: async ({ code, redirectUri, clientId, clientSecret }) => {
      const res = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri }),
      });
      const data: any = await res.json();
      if (!res.ok || !data?.access_token) {
        throw new Error(data?.error_description || data?.error || `GitHub OAuth failed (${res.status})`);
      }
      // Fetch the username so the founder can confirm the right account is connected.
      let login: string | null = null;
      try {
        const me = await fetch("https://api.github.com/user", {
          headers: { Authorization: `token ${data.access_token}`, Accept: "application/vnd.github+json" },
        });
        if (me.ok) {
          const u: any = await me.json();
          login = u?.login ?? null;
        }
      } catch {}
      return {
        config: {
          accessToken: data.access_token,
          tokenType: data.token_type ?? "bearer",
          scope: data.scope ?? "repo",
          login,
          obtainedAt: new Date().toISOString(),
        },
      };
    },
  },

  // Google Calendar — readonly access to event metadata. NEVER stores titles
  // or attendee emails — the polling logic strips those fields.
  "google-calendar": {
    kind: "calendar",
    label: "Google Calendar",
    scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
    clientId: () => process.env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: () => process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    authorizeUrl: ({ state, redirectUri }) => {
      const params = new URLSearchParams({
        client_id: process.env.GOOGLE_OAUTH_CLIENT_ID || "",
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "https://www.googleapis.com/auth/calendar.readonly",
        access_type: "offline",
        prompt: "consent",
        state,
      });
      return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    },
    exchange: async ({ code, redirectUri, clientId, clientSecret }) => {
      const body = new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      });
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      const data: any = await res.json();
      if (!res.ok || !data?.access_token) {
        throw new Error(data?.error_description || data?.error || `Google OAuth failed (${res.status})`);
      }
      return {
        config: {
          provider: "google",
          accessToken: data.access_token,
          refreshToken: data.refresh_token ?? null,
          expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : null,
          scope: data.scope,
          obtainedAt: new Date().toISOString(),
        },
      };
    },
  },

  // Gmail metadata — readonly headers/sender, no body content.
  "google-mail": {
    kind: "mail-forwarder",
    label: "Gmail",
    scopes: ["https://www.googleapis.com/auth/gmail.metadata"],
    clientId: () => process.env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: () => process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    authorizeUrl: ({ state, redirectUri }) => {
      const params = new URLSearchParams({
        client_id: process.env.GOOGLE_OAUTH_CLIENT_ID || "",
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "https://www.googleapis.com/auth/gmail.metadata",
        access_type: "offline",
        prompt: "consent",
        state,
      });
      return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    },
    exchange: async ({ code, redirectUri, clientId, clientSecret }) => {
      const body = new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      });
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      const data: any = await res.json();
      if (!res.ok || !data?.access_token) {
        throw new Error(data?.error_description || data?.error || `Google OAuth failed (${res.status})`);
      }
      return {
        config: {
          provider: "gmail",
          accessToken: data.access_token,
          refreshToken: data.refresh_token ?? null,
          expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : null,
          scope: data.scope,
          whitelist: ["stripe.com", "yookassa.ru", "revenuecat.com", "cloudpayments.ru", "robokassa.ru"],
          obtainedAt: new Date().toISOString(),
        },
      };
    },
  },

  // Yandex Metrika — read-only metrika scope.
  "yandex-metrika": {
    kind: "yandex-metrika",
    label: "Yandex Metrika",
    scopes: ["metrika:read"],
    clientId: () => process.env.YANDEX_OAUTH_CLIENT_ID,
    clientSecret: () => process.env.YANDEX_OAUTH_CLIENT_SECRET,
    authorizeUrl: ({ state, redirectUri }) => {
      const params = new URLSearchParams({
        client_id: process.env.YANDEX_OAUTH_CLIENT_ID || "",
        redirect_uri: redirectUri,
        response_type: "code",
        state,
      });
      return `https://oauth.yandex.ru/authorize?${params.toString()}`;
    },
    exchange: async ({ code, clientId, clientSecret }) => {
      const body = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
      });
      const res = await fetch("https://oauth.yandex.ru/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      const data: any = await res.json();
      if (!res.ok || !data?.access_token) {
        throw new Error(data?.error_description || data?.error || `Yandex OAuth failed (${res.status})`);
      }
      return {
        config: {
          token: data.access_token,
          refreshToken: data.refresh_token ?? null,
          expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : null,
          obtainedAt: new Date().toISOString(),
          counterId: null, // founder must fill in via follow-up dialog
        },
      };
    },
  },

  // Slack — bot-token OAuth (workspace install).
  // Scopes are metadata-only: channels:read, users:read, channels:history.
  slack: {
    kind: "slack",
    label: "Slack",
    scopes: ["channels:read", "users:read", "channels:history", "team:read"],
    clientId: () => process.env.SLACK_OAUTH_CLIENT_ID,
    clientSecret: () => process.env.SLACK_OAUTH_CLIENT_SECRET,
    authorizeUrl: ({ state, redirectUri }) => {
      const params = new URLSearchParams({
        client_id: process.env.SLACK_OAUTH_CLIENT_ID || "",
        scope: "channels:read,users:read,channels:history,team:read",
        redirect_uri: redirectUri,
        state,
      });
      return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
    },
    exchange: async ({ code, redirectUri, clientId, clientSecret }) => {
      const body = new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      });
      const res = await fetch("https://slack.com/api/oauth.v2.access", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      const data: any = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data?.error || `Slack OAuth failed (${res.status})`);
      }
      return {
        config: {
          botToken: data.access_token,
          teamId: data.team?.id ?? null,
          teamName: data.team?.name ?? null,
          scopes: (data.scope ?? "").split(","),
          obtainedAt: new Date().toISOString(),
        },
      };
    },
  },

  // HH.ru intentionally NOT here: their public vacancy search API works
  // unauthenticated, and per-startup employer linkage is captured via the
  // `startups.hhEmployerId` field (paste a company URL or employer id on the
  // startup profile). The hh-vacancies ingestor uses that directly.
};

export function listGroup3OAuthSupport(): { key: string; kind: string; label: string; configured: boolean }[] {
  return Object.entries(PROVIDERS).map(([key, p]) => ({
    key,
    kind: p.kind,
    label: p.label,
    configured: !!(p.clientId() && p.clientSecret()),
  }));
}

function buildRedirectUri(req: Request, key: string): string {
  const proto = (req.headers["x-forwarded-proto"] as string)?.split(",")[0] || req.protocol || "https";
  const host = (req.headers["x-forwarded-host"] as string) || req.get("host");
  return `${proto}://${host}/api/startups/integrations/oauth/${encodeURIComponent(key)}/callback`;
}

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function stateSecret(): string | null {
  // Refuse to issue/verify state without a real secret. No hardcoded fallback —
  // anything else would let an attacker forge state for arbitrary startups.
  const s = process.env.SESSION_SECRET || process.env.INTEGRATION_ENCRYPTION_KEY;
  return s && s.length >= 16 ? s : null;
}

type StatePayload = { startupId: string; key: string; nonce: string; userId: string; issuedAt: number };

function signState(payload: Omit<StatePayload, "issuedAt">): string | null {
  const secret = stateSecret();
  if (!secret) return null;
  const full: StatePayload = { ...payload, issuedAt: Date.now() };
  const json = JSON.stringify(full);
  const sig = crypto.createHmac("sha256", secret).update(json).digest("base64url");
  return `${Buffer.from(json, "utf8").toString("base64url")}.${sig}`;
}

function verifyState(state: string): StatePayload | null {
  const secret = stateSecret();
  if (!secret) return null;
  const [b64, sig] = state.split(".");
  if (!b64 || !sig) return null;
  let json: string;
  try {
    json = Buffer.from(b64, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const expected = crypto.createHmac("sha256", secret).update(json).digest("base64url");
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return null;
  }
  let parsed: StatePayload;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof parsed.issuedAt !== "number" || Date.now() - parsed.issuedAt > STATE_TTL_MS) {
    return null;
  }
  return parsed;
}

function escHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function userCanManageStartup(userId: string, startupId: string): Promise<boolean> {
  const dbUser = await storage.getUser(userId);
  if (dbUser?.isHeadAdmin || (dbUser as any)?.role === "innoLabsAdmin") return true;
  const userStartups = await storage.getUserStartups(userId);
  return userStartups.some(
    (us: any) => us.startupId === startupId && (us.role === "founder" || us.role === "cofounder"),
  );
}

export function registerGroup3OAuthRoutes(app: Express): void {
  app.get("/api/startups/integrations/oauth/support", (_req, res) => {
    res.json({ providers: listGroup3OAuthSupport() });
  });

  app.get(
    "/api/startups/integrations/oauth/:key/start",
    isAuthenticated,
    isNotFrozen,
    async (req: any, res: Response) => {
      try {
        const key = String(req.params.key);
        const provider = PROVIDERS[key];
        if (!provider) return res.status(404).json({ message: "Unknown OAuth provider" });
        const startupId = String(req.query.startupId || "");
        if (!startupId) return res.status(400).json({ message: "startupId required" });
        const userId = req.user?.claims?.sub || req.user?.id || "";
        if (!(await userCanManageStartup(userId, startupId))) {
          return res.status(403).json({ message: "Only founders can manage integrations" });
        }
        const cid = provider.clientId();
        const csec = provider.clientSecret();
        if (!cid || !csec) {
          return res.status(503).json({
            message: `OAuth for ${provider.label} is not configured on this server. Ask the platform admin to set the OAuth client id/secret.`,
          });
        }
        const state = signState({ startupId, key, nonce: crypto.randomBytes(8).toString("hex"), userId });
        if (!state) {
          return res.status(503).json({
            message: "Server not configured to sign OAuth state. Set SESSION_SECRET (≥16 chars).",
          });
        }
        const redirectUri = buildRedirectUri(req, key);
        res.json({ authorizeUrl: provider.authorizeUrl({ state, redirectUri }) });
      } catch (e: any) {
        res.status(500).json({ message: e?.message ?? "OAuth start failed" });
      }
    },
  );

  app.get("/api/startups/integrations/oauth/:key/callback", async (req: Request, res: Response) => {
    // All user-controllable strings (provider error text, etc.) MUST be HTML-
    // escaped before being interpolated into this template. The `ok` flag is a
    // pure boolean and the rest of the template is static, so the postMessage
    // payload cannot be tampered with by query strings.
    const renderHtml = (title: string, body: string, ok: boolean) =>
      res.send(
        `<!doctype html><html><head><meta charset="utf-8"><title>${escHtml(title)}</title></head><body style="font-family:sans-serif;padding:40px;text-align:center"><h2>${escHtml(title)}</h2><p>${escHtml(body)}</p><script>setTimeout(()=>window.close(),2500);if(window.opener){window.opener.postMessage({type:'group3-oauth',ok:${ok ? "true" : "false"}},'*');}</script></body></html>`,
      );
    try {
      const key = String(req.params.key);
      const provider = PROVIDERS[key];
      if (!provider) return renderHtml("Unknown OAuth provider", "This provider is not registered.", false);
      const code = String(req.query.code || "");
      const state = String(req.query.state || "");
      const err = req.query.error ? String(req.query.error_description || req.query.error) : null;
      if (err) return renderHtml(`${provider.label} cancelled`, err, false);
      if (!code) return renderHtml(`${provider.label} error`, "Missing authorization code.", false);
      const parsed = verifyState(state);
      if (!parsed) return renderHtml("Invalid state", "OAuth state could not be verified or has expired.", false);
      // Bind state to the URL key so a code intended for, e.g., google-calendar
      // cannot be replayed at the google-mail callback (same Google client +
      // token endpoint would otherwise allow flow confusion).
      if (parsed.key !== key) {
        return renderHtml("State mismatch", "OAuth state does not match this callback.", false);
      }
      if (!isEncryptionConfigured()) {
        return renderHtml(
          "Encryption not configured",
          "INTEGRATION_ENCRYPTION_KEY (or SESSION_SECRET) must be set.",
          false,
        );
      }
      const cid = provider.clientId()!;
      const csec = provider.clientSecret()!;
      const redirectUri = buildRedirectUri(req, key);
      const { config } = await provider.exchange({ code, redirectUri, clientId: cid, clientSecret: csec });

      // Merge with any existing config (e.g. preserve counterId set after Yandex OAuth)
      const existing = await storage.getIntegrationCredential(parsed.startupId, provider.kind);
      let mergedConfig: any = config;
      if (existing?.encryptedConfig) {
        try {
          const { decryptConfig } = await import("./crypto");
          const prev = decryptConfig(existing.encryptedConfig);
          if (prev && typeof prev === "object") {
            mergedConfig = { ...(prev as any), ...config };
          }
        } catch {}
      }

      await storage.upsertIntegrationCredential({
        startupId: parsed.startupId,
        kind: provider.kind,
        status: "active",
        encryptedConfig: encryptConfig(mergedConfig) as any,
      });
      return renderHtml(
        `Connected ${provider.label}`,
        "You can close this window and return to the dashboard.",
        true,
      );
    } catch (e: any) {
      return renderHtml("OAuth failed", e?.message ?? "Unknown error", false);
    }
  });
}
