import type { Express, Request, Response } from "express";
import crypto from "crypto";
import { storage } from "../../../storage";
import { encryptConfig, isEncryptionConfigured } from "../../crypto";
import { isAuthenticated, isNotFrozen } from "../../../auth";

type OAuthProvider = {
  kind: string;
  label: string;
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

const PROVIDERS: Record<string, OAuthProvider> = {
  // Stripe Connect Standard OAuth — yields a `stripe_user_id` (account id)
  // and `access_token` we can use as the API key for the Group 4 connector.
  "intl-subscriptions:stripe": {
    kind: "intl-subscriptions",
    label: "Stripe",
    clientId: () => process.env.STRIPE_OAUTH_CLIENT_ID,
    clientSecret: () => process.env.STRIPE_SECRET_KEY,
    authorizeUrl: ({ state, redirectUri }) => {
      const cid = process.env.STRIPE_OAUTH_CLIENT_ID || "";
      const params = new URLSearchParams({
        response_type: "code",
        client_id: cid,
        scope: "read_only",
        state,
        redirect_uri: redirectUri,
      });
      return `https://connect.stripe.com/oauth/authorize?${params.toString()}`;
    },
    exchange: async ({ code, clientSecret }) => {
      const body = new URLSearchParams({
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
      });
      const res = await fetch("https://connect.stripe.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      const data: any = await res.json();
      if (!res.ok || !data?.access_token) {
        throw new Error(data?.error_description || data?.error || `Stripe OAuth failed (${res.status})`);
      }
      return {
        config: {
          provider: "stripe",
          apiKey: data.access_token,
          stripeUserId: data.stripe_user_id,
          refreshToken: data.refresh_token,
          tokenType: data.token_type,
          scope: data.scope,
          obtainedAt: new Date().toISOString(),
          currency: "USD",
        },
      };
    },
  },
  // Tinkoff Business Open API OAuth (auth-code grant). Optional: set
  // TINKOFF_BUSINESS_OAUTH_CLIENT_ID / TINKOFF_BUSINESS_OAUTH_CLIENT_SECRET.
  "tinkoff-business": {
    kind: "tinkoff-business",
    label: "Tinkoff Business",
    clientId: () => process.env.TINKOFF_BUSINESS_OAUTH_CLIENT_ID,
    clientSecret: () => process.env.TINKOFF_BUSINESS_OAUTH_CLIENT_SECRET,
    authorizeUrl: ({ state, redirectUri }) => {
      const cid = process.env.TINKOFF_BUSINESS_OAUTH_CLIENT_ID || "";
      const params = new URLSearchParams({
        response_type: "code",
        client_id: cid,
        state,
        redirect_uri: redirectUri,
      });
      return `https://business.tinkoff.ru/openapi/oauth/authorize?${params.toString()}`;
    },
    exchange: async ({ code, redirectUri, clientId, clientSecret }) => {
      const body = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      });
      const res = await fetch("https://business.tinkoff.ru/openapi/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      const data: any = await res.json().catch(() => ({}));
      if (!res.ok || !data?.access_token) {
        throw new Error(data?.error_description || data?.error || `Tinkoff OAuth failed (${res.status})`);
      }
      return {
        config: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresIn: data.expires_in,
          obtainedAt: new Date().toISOString(),
        },
      };
    },
  },
};

export function listOAuthSupport(): { kind: string; provider?: string; configured: boolean }[] {
  return Object.entries(PROVIDERS).map(([key, p]) => {
    const [kind, provider] = key.split(":");
    return {
      kind,
      provider: provider ?? undefined,
      configured: !!(p.clientId() && p.clientSecret()),
    };
  });
}

function buildRedirectUri(req: Request, key: string): string {
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
  const host = (req.headers["x-forwarded-host"] as string) || req.get("host");
  return `${proto}://${host}/api/startups/financial-integrations/oauth/${encodeURIComponent(key)}/callback`;
}

const STATE_SECRET = () =>
  process.env.SESSION_SECRET || process.env.INTEGRATION_ENCRYPTION_KEY || "fallback-state-secret";

function signState(payload: { startupId: string; key: string; nonce: string; userId: string }): string {
  const json = JSON.stringify(payload);
  const sig = crypto.createHmac("sha256", STATE_SECRET()).update(json).digest("base64url");
  return `${Buffer.from(json, "utf8").toString("base64url")}.${sig}`;
}

function verifyState(state: string): { startupId: string; key: string; nonce: string; userId: string } | null {
  const [b64, sig] = state.split(".");
  if (!b64 || !sig) return null;
  let json: string;
  try {
    json = Buffer.from(b64, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const expected = crypto.createHmac("sha256", STATE_SECRET()).update(json).digest("base64url");
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return null;
  }
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function registerFinancialOAuthRoutes(
  app: Express,
  canEdit: (req: any, startupId: string) => Promise<boolean>,
): void {
  app.get("/api/startups/financial-integrations/oauth/:key/start", isAuthenticated, isNotFrozen, async (req: any, res: Response) => {
    try {
      const key = String(req.params.key);
      const provider = PROVIDERS[key];
      if (!provider) return res.status(404).json({ message: "Unknown OAuth provider" });
      const startupId = String(req.query.startupId || "");
      if (!startupId) return res.status(400).json({ message: "startupId required" });
      if (!(await canEdit(req, startupId))) return res.status(403).json({ message: "Forbidden" });
      const cid = provider.clientId();
      const csec = provider.clientSecret();
      if (!cid || !csec) {
        return res.status(503).json({
          message: `OAuth for ${provider.label} is not configured on this server. Ask the platform admin to set the OAuth client id/secret.`,
        });
      }
      const userId = req.user?.claims?.sub || req.user?.id || "";
      const state = signState({ startupId, key, nonce: crypto.randomBytes(8).toString("hex"), userId });
      const redirectUri = buildRedirectUri(req, key);
      res.json({ authorizeUrl: provider.authorizeUrl({ state, redirectUri }) });
    } catch (e: any) {
      res.status(500).json({ message: e?.message ?? "OAuth start failed" });
    }
  });

  app.get("/api/startups/financial-integrations/oauth/:key/callback", async (req: Request, res: Response) => {
    const renderHtml = (title: string, body: string) =>
      res.send(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head><body style="font-family:sans-serif;padding:40px;text-align:center"><h2>${title}</h2><p>${body}</p><script>setTimeout(()=>window.close(),2500);if(window.opener){window.opener.postMessage({type:'fin-oauth',ok:${body.startsWith("Connected") ? "true" : "false"}},'*');}</script></body></html>`);
    try {
      const key = String(req.params.key);
      const provider = PROVIDERS[key];
      if (!provider) return renderHtml("Unknown OAuth provider", "This provider is not registered.");
      const code = String(req.query.code || "");
      const state = String(req.query.state || "");
      const err = req.query.error ? String(req.query.error_description || req.query.error) : null;
      if (err) return renderHtml(`${provider.label} cancelled`, err);
      if (!code) return renderHtml(`${provider.label} error`, "Missing authorization code.");
      const parsed = verifyState(state);
      if (!parsed) return renderHtml("Invalid state", "OAuth state could not be verified.");
      if (!isEncryptionConfigured()) {
        return renderHtml("Encryption not configured", "INTEGRATION_ENCRYPTION_KEY (or SESSION_SECRET) must be set.");
      }
      const cid = provider.clientId()!;
      const csec = provider.clientSecret()!;
      const redirectUri = buildRedirectUri(req, key);
      const { config } = await provider.exchange({ code, redirectUri, clientId: cid, clientSecret: csec });
      await storage.upsertIntegrationCredential({
        startupId: parsed.startupId,
        kind: provider.kind,
        status: "active",
        encryptedConfig: encryptConfig(config) as any,
      });
      return renderHtml(`Connected ${provider.label}`, "You can close this window and return to the dashboard.");
    } catch (e: any) {
      return renderHtml("OAuth failed", e?.message ?? "Unknown error");
    }
  });
}
