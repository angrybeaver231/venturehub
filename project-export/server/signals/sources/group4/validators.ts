import { z } from "zod";

export type ValidationResult =
  | { ok: true; normalized: Record<string, any>; supportsOAuth?: boolean }
  | { ok: false; message: string };

const TIMEOUT_MS = 8000;

async function probe(url: string, init: RequestInit): Promise<{ status: number; bodyText: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    const bodyText = await res.text().catch(() => "");
    return { status: res.status, bodyText };
  } finally {
    clearTimeout(timer);
  }
}

const SCHEMAS: Record<string, z.ZodType<any>> = {
  "tinkoff-business": z.object({
    token: z.string().min(8, "API token required"),
    accountNumber: z.string().optional(),
  }),
  "ru-bank": z.object({
    provider: z.enum(["tochka", "modulbank", "alfabank"]),
    token: z.string().min(8, "API token required"),
    accountNumber: z.string().optional(),
  }),
  yookassa: z.object({
    shopId: z.string().min(1, "shopId required"),
    secretKey: z.string().min(8, "secretKey required"),
  }),
  "ru-acquiring": z.object({
    provider: z.enum(["cloudpayments", "robokassa", "tinkoff-acquiring"]),
    publicId: z.string().min(1).optional(),
    apiSecret: z.string().min(1).optional(),
    terminalKey: z.string().optional(),
    password: z.string().optional(),
  }),
  "intl-subscriptions": z.object({
    provider: z.enum(["stripe", "lemonsqueezy", "paddle"]),
    apiKey: z.string().min(8, "API key required"),
    currency: z.string().optional(),
  }),
};

export function getValidationSchema(kind: string): z.ZodType<any> | null {
  return SCHEMAS[kind] ?? null;
}

async function testTinkoffBusiness(cfg: any): Promise<ValidationResult> {
  try {
    const { status } = await probe("https://business.tinkoff.ru/openapi/api/v1/company", {
      headers: { Authorization: `Bearer ${cfg.token}` },
    });
    if (status === 401 || status === 403) {
      return { ok: false, message: "Tinkoff rejected the API token (401/403)" };
    }
    return { ok: true, normalized: cfg, supportsOAuth: true };
  } catch (e: any) {
    return { ok: false, message: `Could not reach Tinkoff Business API: ${e?.message ?? e}` };
  }
}

async function testRuBank(cfg: any): Promise<ValidationResult> {
  const endpoints: Record<string, string> = {
    tochka: "https://enter.tochka.com/sandbox/v2/open-banking/v1.0/accounts",
    modulbank: "https://api.modulbank.ru/v1/account-info",
    alfabank: "https://baas.alfabank.ru/api/v1/accounts",
  };
  const url = endpoints[cfg.provider];
  if (!url) return { ok: false, message: "Unknown bank provider" };
  try {
    const { status } = await probe(url, { headers: { Authorization: `Bearer ${cfg.token}` } });
    if (status === 401 || status === 403) {
      return { ok: false, message: `${cfg.provider} rejected the API token (${status})` };
    }
    return { ok: true, normalized: cfg };
  } catch (e: any) {
    return { ok: false, message: `Could not reach ${cfg.provider} API: ${e?.message ?? e}` };
  }
}

async function testYooKassa(cfg: any): Promise<ValidationResult> {
  const auth = Buffer.from(`${cfg.shopId}:${cfg.secretKey}`).toString("base64");
  try {
    const { status, bodyText } = await probe(
      "https://api.yookassa.ru/v3/payments?limit=1",
      { headers: { Authorization: `Basic ${auth}` } },
    );
    if (status === 401 || status === 403) {
      return { ok: false, message: "ЮKassa rejected the shopId / secretKey" };
    }
    if (status >= 500) {
      return { ok: false, message: `ЮKassa upstream error (${status})` };
    }
    if (status >= 400 && /invalid_credentials|unauthorized/i.test(bodyText)) {
      return { ok: false, message: "ЮKassa rejected the credentials" };
    }
    return { ok: true, normalized: cfg };
  } catch (e: any) {
    return { ok: false, message: `Could not reach ЮKassa: ${e?.message ?? e}` };
  }
}

async function testRuAcquiring(cfg: any): Promise<ValidationResult> {
  if (cfg.provider === "cloudpayments") {
    if (!cfg.publicId || !cfg.apiSecret) {
      return { ok: false, message: "publicId and apiSecret are required for CloudPayments" };
    }
    const auth = Buffer.from(`${cfg.publicId}:${cfg.apiSecret}`).toString("base64");
    try {
      const { status } = await probe("https://api.cloudpayments.ru/test", {
        method: "POST",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
        body: "{}",
      });
      if (status === 401 || status === 403) {
        return { ok: false, message: "CloudPayments rejected the credentials" };
      }
      return { ok: true, normalized: cfg };
    } catch (e: any) {
      return { ok: false, message: `Could not reach CloudPayments: ${e?.message ?? e}` };
    }
  }
  if (cfg.provider === "robokassa") {
    if (!(cfg.apiSecret || cfg.password)) {
      return { ok: false, message: "apiSecret required for Robokassa" };
    }
    return { ok: true, normalized: cfg };
  }
  if (cfg.provider === "tinkoff-acquiring") {
    if (!(cfg.terminalKey || cfg.publicId) || !(cfg.password || cfg.apiSecret)) {
      return { ok: false, message: "terminalKey + password required for Tinkoff Acquiring" };
    }
    return { ok: true, normalized: cfg };
  }
  return { ok: false, message: "Unknown acquiring provider" };
}

async function testIntlSubscriptions(cfg: any): Promise<ValidationResult> {
  if (cfg.provider === "stripe") {
    try {
      const { status, bodyText } = await probe("https://api.stripe.com/v1/account", {
        headers: { Authorization: `Bearer ${cfg.apiKey}` },
      });
      if (status === 401) return { ok: false, message: "Stripe rejected the API key" };
      if (status >= 400) return { ok: false, message: `Stripe error (${status}): ${bodyText.slice(0, 120)}` };
      return { ok: true, normalized: cfg, supportsOAuth: true };
    } catch (e: any) {
      return { ok: false, message: `Could not reach Stripe: ${e?.message ?? e}` };
    }
  }
  if (cfg.provider === "lemonsqueezy") {
    try {
      const { status } = await probe("https://api.lemonsqueezy.com/v1/users/me", {
        headers: { Authorization: `Bearer ${cfg.apiKey}`, Accept: "application/vnd.api+json" },
      });
      if (status === 401 || status === 403) {
        return { ok: false, message: "Lemon Squeezy rejected the API key" };
      }
      return { ok: true, normalized: cfg };
    } catch (e: any) {
      return { ok: false, message: `Could not reach Lemon Squeezy: ${e?.message ?? e}` };
    }
  }
  if (cfg.provider === "paddle") {
    try {
      const { status } = await probe("https://api.paddle.com/event-types", {
        headers: { Authorization: `Bearer ${cfg.apiKey}` },
      });
      if (status === 401 || status === 403) {
        return { ok: false, message: "Paddle rejected the API key" };
      }
      return { ok: true, normalized: cfg };
    } catch (e: any) {
      return { ok: false, message: `Could not reach Paddle: ${e?.message ?? e}` };
    }
  }
  return { ok: false, message: "Unknown subscription provider" };
}

export async function validateFinancialCredential(
  kind: string,
  rawConfig: unknown,
): Promise<ValidationResult> {
  const schema = SCHEMAS[kind];
  if (!schema) return { ok: false, message: `Unknown integration kind: ${kind}` };
  const parsed = schema.safeParse(rawConfig);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.errors[0]?.message ?? "Invalid config" };
  }
  const cfg = parsed.data;
  switch (kind) {
    case "tinkoff-business":
      return testTinkoffBusiness(cfg);
    case "ru-bank":
      return testRuBank(cfg);
    case "yookassa":
      return testYooKassa(cfg);
    case "ru-acquiring":
      return testRuAcquiring(cfg);
    case "intl-subscriptions":
      return testIntlSubscriptions(cfg);
    default:
      return { ok: true, normalized: cfg };
  }
}
