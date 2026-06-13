import crypto from "crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../../db";
import { signalEvents, startupFinancials } from "@shared/schema";
import { storage } from "../../../storage";
import { dispatchSignalEvent } from "../../alerts/dispatcher";
import { getCredential } from "../../credentials";

/**
 * Webhook receiver helpers for international subscription billing
 * (Stripe / LemonSqueezy / Paddle).
 *
 * Sub-minute path: each provider POSTs to `/api/webhooks/<provider>/:startupId`,
 * we verify the provider signature, map the event to a normalised
 * `SubscriptionUpsert`, persist a per-customer cohort snapshot under sourceKey
 * `fin-intl-cohort`, and emit a `subscription_event` signal.
 *
 * Cohort snapshot payload schema:
 *   {
 *     byCustomer: { [customerId]: { signupMonth, monthlyMinor, active } },
 *     cohorts:    [ { month, mrrMinor, customers, activeCustomers, retentionPct } ],
 *     lastEventAt, lastProvider
 *   }
 *
 * The webhook secret is read from the per-startup `intl-subscriptions`
 * credential (`config.webhookSecret`).
 */

export const COHORT_SOURCE_KEY = "fin-intl-cohort";

export type SubscriptionUpsert = {
  provider: "stripe" | "lemonsqueezy" | "paddle";
  customerId: string;
  status: "active" | "cancelled";
  monthlyMinor: number;
  currency: string;
  signupAt?: string | null;
  eventType: string;
  rawId?: string;
};

type CustomerState = { signupMonth: string; monthlyMinor: number; active: boolean };
type CohortBucket = {
  month: string;
  mrrMinor: number;
  customers: number;
  activeCustomers: number;
  retentionPct: number;
};
type CohortPayload = {
  byCustomer: Record<string, CustomerState>;
  cohorts: CohortBucket[];
  lastEventAt: string;
  lastProvider: string;
};

function isoMonth(input: Date | string | number): string {
  const d = input instanceof Date ? input : new Date(input);
  return d.toISOString().slice(0, 7);
}

function isoDay(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

async function getCohortState(startupId: string): Promise<CohortPayload> {
  const [latest] = await db
    .select()
    .from(startupFinancials)
    .where(and(
      eq(startupFinancials.startupId, startupId),
      eq(startupFinancials.sourceKey, COHORT_SOURCE_KEY),
    ))
    .orderBy(desc(startupFinancials.snapshotDate))
    .limit(1);
  const payload = latest?.payload as CohortPayload | null | undefined;
  if (payload && typeof payload === "object" && payload.byCustomer) return payload;
  return {
    byCustomer: {},
    cohorts: [],
    lastEventAt: new Date().toISOString(),
    lastProvider: "unknown",
  };
}

function computeCohorts(state: CohortPayload): {
  cohorts: CohortBucket[];
  totalMrrMinor: number;
  activeCustomers: number;
} {
  const map = new Map<string, { mrrMinor: number; customers: number; active: number }>();
  for (const c of Object.values(state.byCustomer)) {
    const m = map.get(c.signupMonth) ?? { mrrMinor: 0, customers: 0, active: 0 };
    m.customers += 1;
    if (c.active) {
      m.active += 1;
      m.mrrMinor += c.monthlyMinor;
    }
    map.set(c.signupMonth, m);
  }
  const cohorts = Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({
      month,
      mrrMinor: v.mrrMinor,
      customers: v.customers,
      activeCustomers: v.active,
      retentionPct: v.customers > 0 ? (v.active / v.customers) * 100 : 0,
    }));
  const totalMrrMinor = cohorts.reduce((s, c) => s + c.mrrMinor, 0);
  const activeCustomers = cohorts.reduce((s, c) => s + c.activeCustomers, 0);
  return { cohorts, totalMrrMinor, activeCustomers };
}

async function recordSubscriptionEvent(startupId: string, evt: SubscriptionUpsert): Promise<void> {
  const dedupeKey = `${evt.provider}:${evt.rawId ?? evt.customerId}:${evt.eventType}`;
  const dedupeHash = crypto
    .createHash("sha256")
    .update(`${COHORT_SOURCE_KEY}:${dedupeKey}`)
    .digest("hex")
    .slice(0, 64);
  const inserted = await storage.recordSignalEvent({
    startupId,
    sourceKey: COHORT_SOURCE_KEY,
    eventType: "subscription_event",
    severity: evt.status === "cancelled" ? "warning" : "info",
    title: `${evt.provider}: ${evt.eventType}`,
    summary: `Customer ${evt.customerId} ${evt.eventType} (${(evt.monthlyMinor / 100).toFixed(2)} ${evt.currency})`,
    occurredAt: new Date(),
    payload: evt as any,
    dedupeHash,
    verifiedBy: [COHORT_SOURCE_KEY],
  });
  if (!inserted) return;
  try {
    const [row] = await db
      .select()
      .from(signalEvents)
      .where(eq(signalEvents.dedupeHash, dedupeHash))
      .orderBy(desc(signalEvents.occurredAt))
      .limit(1);
    if (row) dispatchSignalEvent(row).catch((err) => console.warn("[stripe-webhook:dispatch]", err));
  } catch (err) {
    console.warn("[stripe-webhook:dispatch:lookup]", err);
  }
}

export async function applySubscriptionEvent(
  startupId: string,
  evt: SubscriptionUpsert,
): Promise<{ totalMrrMinor: number; cohorts: CohortBucket[] }> {
  const state = await getCohortState(startupId);
  const existing = state.byCustomer[evt.customerId];
  const signupMonth = existing?.signupMonth
    ?? (evt.signupAt ? isoMonth(evt.signupAt) : isoMonth(new Date()));
  state.byCustomer[evt.customerId] = {
    signupMonth,
    monthlyMinor: evt.status === "active"
      ? Math.max(0, evt.monthlyMinor)
      : (existing?.monthlyMinor ?? Math.max(0, evt.monthlyMinor)),
    active: evt.status === "active",
  };
  state.lastEventAt = new Date().toISOString();
  state.lastProvider = evt.provider;
  const { cohorts, totalMrrMinor, activeCustomers } = computeCohorts(state);
  state.cohorts = cohorts;
  const today = isoDay();
  const persistedPayload: CohortPayload = { ...state, cohorts };
  await db.insert(startupFinancials).values({
    startupId,
    sourceKey: COHORT_SOURCE_KEY,
    snapshotDate: today,
    mrrMinor: totalMrrMinor,
    revenueMinor: totalMrrMinor,
    arrMinor: totalMrrMinor * 12,
    revenueLast30dMinor: totalMrrMinor,
    burnLast30dMinor: 0,
    runwayMonths: null,
    currency: evt.currency,
    activeCustomers,
    payload: persistedPayload as any,
  }).onConflictDoUpdate({
    target: [startupFinancials.startupId, startupFinancials.sourceKey, startupFinancials.snapshotDate],
    set: {
      mrrMinor: totalMrrMinor,
      revenueMinor: totalMrrMinor,
      arrMinor: totalMrrMinor * 12,
      revenueLast30dMinor: totalMrrMinor,
      currency: evt.currency,
      activeCustomers,
      payload: persistedPayload as any,
      capturedAt: new Date(),
    },
  });
  await recordSubscriptionEvent(startupId, evt);
  return { totalMrrMinor, cohorts };
}

// ── Signature verification ────────────────────────────────────────────────

function timingSafeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ba.length !== bb.length || ba.length === 0) return false;
    return crypto.timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

const REPLAY_WINDOW_SEC = 300;

export function verifyStripeSignature(rawBody: string, header: string | undefined, secret: string): boolean {
  if (!header || !secret) return false;
  const parts: Record<string, string> = {};
  for (const seg of header.split(",")) {
    const eq = seg.indexOf("=");
    if (eq > 0) parts[seg.slice(0, eq).trim()] = seg.slice(eq + 1).trim();
  }
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return false;
  const ts = parseInt(t, 10);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > REPLAY_WINDOW_SEC) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  return timingSafeEqualHex(expected, v1);
}

export function verifyLemonSqueezySignature(rawBody: string, header: string | undefined, secret: string): boolean {
  if (!header || !secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return timingSafeEqualHex(expected, header.trim());
}

export function verifyPaddleSignature(rawBody: string, header: string | undefined, secret: string): boolean {
  if (!header || !secret) return false;
  const parts: Record<string, string> = {};
  for (const seg of header.split(";")) {
    const eq = seg.indexOf("=");
    if (eq > 0) parts[seg.slice(0, eq).trim()] = seg.slice(eq + 1).trim();
  }
  const ts = parts.ts;
  const h1 = parts.h1;
  if (!ts || !h1) return false;
  const tsNum = parseInt(ts, 10);
  if (!Number.isFinite(tsNum) || Math.abs(Date.now() / 1000 - tsNum) > REPLAY_WINDOW_SEC) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${ts}:${rawBody}`).digest("hex");
  return timingSafeEqualHex(expected, h1);
}

// ── Provider event mappers ────────────────────────────────────────────────

function monthlyFromStripe(item: any): number {
  const price = item?.price;
  if (!price) return 0;
  const unit = Number(price.unit_amount ?? 0) * Number(item.quantity ?? 1);
  const interval = String(price.recurring?.interval ?? "month");
  const ic = Number(price.recurring?.interval_count ?? 1) || 1;
  switch (interval) {
    case "month": return unit / ic;
    case "year":  return unit / (12 * ic);
    case "week":  return (unit / ic) * (52 / 12);
    case "day":   return (unit / ic) * (365 / 12);
    default:      return unit;
  }
}

export function parseStripeEvent(body: any): SubscriptionUpsert | null {
  const type = String(body?.type ?? "");
  if (!type.startsWith("customer.subscription.")) return null;
  const sub = body?.data?.object;
  if (!sub) return null;
  const items: any[] = sub?.items?.data ?? [];
  const monthlyMinor = items.reduce((s, it) => s + monthlyFromStripe(it), 0);
  const currency = String(items[0]?.price?.currency ?? sub?.currency ?? "usd").toUpperCase();
  const status: SubscriptionUpsert["status"] =
    type === "customer.subscription.deleted" || sub?.status === "canceled" ? "cancelled" : "active";
  const signupAt = sub?.created ? new Date(Number(sub.created) * 1000).toISOString() : null;
  return {
    provider: "stripe",
    customerId: String(sub?.customer ?? sub?.id),
    status,
    monthlyMinor: Math.round(monthlyMinor),
    currency,
    signupAt,
    eventType: type,
    rawId: String(body?.id ?? sub?.id ?? ""),
  };
}

export function parseLemonSqueezyEvent(body: any): SubscriptionUpsert | null {
  const type = String(body?.meta?.event_name ?? "");
  if (!type.startsWith("subscription_")) return null;
  const attrs = body?.data?.attributes ?? {};
  const status: SubscriptionUpsert["status"] =
    type === "subscription_cancelled" || type === "subscription_expired" || attrs?.status === "cancelled"
      ? "cancelled"
      : "active";
  const monthlyMinor = Number(attrs?.first_subscription_item?.price ?? attrs?.unit_price ?? 0);
  const currency = String(attrs?.currency ?? "USD").toUpperCase();
  const signupAt = attrs?.created_at ?? null;
  return {
    provider: "lemonsqueezy",
    customerId: String(attrs?.customer_id ?? body?.data?.id ?? ""),
    status,
    monthlyMinor: Math.round(monthlyMinor),
    currency,
    signupAt,
    eventType: type,
    rawId: String(body?.data?.id ?? ""),
  };
}

export function parsePaddleEvent(body: any): SubscriptionUpsert | null {
  const type = String(body?.event_type ?? "");
  if (!type.startsWith("subscription.")) return null;
  const data = body?.data ?? {};
  const items: any[] = data?.items ?? [];
  const monthlyMinor = items.reduce((s, it) => {
    const unit = Number(it?.price?.unit_price?.amount ?? 0) * Number(it?.quantity ?? 1);
    const intv = String(it?.price?.billing_cycle?.interval ?? "month");
    const freq = Number(it?.price?.billing_cycle?.frequency ?? 1) || 1;
    let m = unit;
    if (intv === "month") m = unit / freq;
    else if (intv === "year") m = unit / (12 * freq);
    else if (intv === "week") m = (unit / freq) * (52 / 12);
    else if (intv === "day")  m = (unit / freq) * (365 / 12);
    return s + m;
  }, 0);
  const currency = String(
    data?.currency_code ?? items[0]?.price?.unit_price?.currency_code ?? "USD",
  ).toUpperCase();
  const status: SubscriptionUpsert["status"] =
    type === "subscription.canceled" || data?.status === "canceled" ? "cancelled" : "active";
  const signupAt = data?.created_at ?? null;
  return {
    provider: "paddle",
    customerId: String(data?.customer_id ?? data?.id ?? ""),
    status,
    monthlyMinor: Math.round(monthlyMinor),
    currency,
    signupAt,
    eventType: type,
    rawId: String(data?.id ?? ""),
  };
}

/**
 * Resolve the provider-specific webhook secret from the startup's stored
 * `intl-subscriptions` credential. Returns null if not configured (so the
 * webhook handler can reject with HTTP 400 rather than 500).
 */
export async function getStartupWebhookSecret(
  startupId: string,
  provider: SubscriptionUpsert["provider"],
): Promise<string | null> {
  const cred = await getCredential("intl-subscriptions", startupId);
  if (!cred) return null;
  const cfg = cred.config ?? {};
  if (cfg.provider && String(cfg.provider).toLowerCase() !== provider) return null;
  const secret = cfg.webhookSecret ?? cfg.webhook_secret ?? null;
  return secret ? String(secret) : null;
}
