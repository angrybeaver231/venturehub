import { db } from "../../../db";
import {
  startupFinancials,
  type StartupFinancial,
  type VerifiedMrr,
  type FinancialAnalytics,
} from "@shared/schema";
import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { storage } from "../../../storage";
import { registerJobHandler } from "../../scheduler";

export const GROUP4_FINANCIAL_KINDS = [
  "tinkoff-business",
  "ru-bank",
  "yookassa",
  "ru-acquiring",
  "intl-subscriptions",
  "bank-ocr",
] as const;

const SOURCE_LABELS: Record<string, string> = {
  "fin-tinkoff-business": "Tinkoff Business",
  "fin-ru-bank": "RU business banks",
  "fin-yookassa": "ЮKassa",
  "fin-ru-acquiring": "RU acquiring",
  "fin-intl-subscriptions": "Stripe / Lemon Squeezy / Paddle",
  "fin-bank-ocr": "Bank statement OCR",
  "fin-aggregate": "Aggregated",
};

const VERIFIED_WINDOW_MS = 35 * 24 * 60 * 60 * 1000;

export async function startupHasLiveFinancialConnector(startupId: string): Promise<boolean> {
  const creds = await storage.getIntegrationCredentialsForStartup(startupId);
  return creds.some(
    (c) =>
      c.status === "active" &&
      (GROUP4_FINANCIAL_KINDS as readonly string[]).includes(c.kind),
  );
}

/**
 * Returns the freshest snapshot per startup. Verified iff non-zero MRR within
 * the 35-day window AND the startup has at least one active financial
 * connector right now.
 */
export async function getVerifiedMrrForStartup(startupId: string): Promise<VerifiedMrr | null> {
  const cutoff = new Date(Date.now() - VERIFIED_WINDOW_MS);
  // Prefer the aggregate row; if absent, fall back to the highest-MRR per-source
  // snapshot in the window.
  const rows = await db
    .select()
    .from(startupFinancials)
    .where(and(eq(startupFinancials.startupId, startupId), gt(startupFinancials.capturedAt, cutoff)))
    .orderBy(desc(startupFinancials.capturedAt));
  let best: StartupFinancial | undefined;
  if (rows.length > 0) {
    best = rows.find((r) => r.sourceKey === "fin-aggregate");
    if (!best) best = rows.reduce((a, b) => (b.mrrMinor > a.mrrMinor ? b : a));
  } else {
    const [latest] = await db
      .select()
      .from(startupFinancials)
      .where(eq(startupFinancials.startupId, startupId))
      .orderBy(desc(startupFinancials.capturedAt))
      .limit(1);
    if (!latest) return null;
    return rowToVerified(latest, false, false);
  }
  const hasLive = await startupHasLiveFinancialConnector(startupId);
  const isVerified = best.mrrMinor > 0 && hasLive;
  return rowToVerified(best, isVerified, hasLive);
}

export async function getVerifiedMrrMap(startupIds: string[]): Promise<Record<string, VerifiedMrr>> {
  if (startupIds.length === 0) return {};
  const out: Record<string, VerifiedMrr> = {};
  await Promise.all(
    startupIds.map(async (id) => {
      const v = await getVerifiedMrrForStartup(id);
      if (v) out[id] = v;
    }),
  );
  return out;
}

export async function getFinancialHistory(startupId: string): Promise<StartupFinancial[]> {
  return db
    .select()
    .from(startupFinancials)
    .where(eq(startupFinancials.startupId, startupId))
    .orderBy(startupFinancials.snapshotDate);
}

/**
 * Compute richer analytics from the snapshot history:
 *  - latest aggregate snapshot (current)
 *  - aggregate snapshot ~30 days ago (previous30d) — used for net-new / growth
 *  - 90-day aggregate trend series
 *  - per-source latest contribution
 *  - churn proxy: sum of negative MRR deltas across aggregate rows in the
 *    trailing 30 days, divided by the starting MRR. Without per-customer
 *    cohorts we can only infer churn from the aggregate MRR direction.
 *  - gross retention = 1 - churn; net retention = current / prev30 MRR.
 */
export async function getFinancialAnalytics(startupId: string): Promise<FinancialAnalytics> {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const rows = await db
    .select()
    .from(startupFinancials)
    .where(and(
      eq(startupFinancials.startupId, startupId),
      gt(startupFinancials.capturedAt, ninetyDaysAgo),
    ))
    .orderBy(startupFinancials.snapshotDate);

  const aggregateRows = rows.filter((r) => r.sourceKey === "fin-aggregate");
  const perSourceRows = rows.filter((r) => r.sourceKey !== "fin-aggregate");

  const hasLive = await startupHasLiveFinancialConnector(startupId);
  const latestAgg = aggregateRows.length ? aggregateRows[aggregateRows.length - 1] : null;
  const currency = latestAgg?.currency
    || rows.find((r) => r.currency)?.currency
    || "RUB";

  // Find the aggregate row closest to 30 days before the latest aggregate.
  let previous30d: FinancialAnalytics["previous30d"] = null;
  if (latestAgg && aggregateRows.length > 1) {
    const latestTs = new Date(latestAgg.snapshotDate).getTime();
    const targetTs = latestTs - 30 * 24 * 60 * 60 * 1000;
    let best = aggregateRows[0];
    let bestDiff = Math.abs(new Date(best.snapshotDate).getTime() - targetTs);
    for (const r of aggregateRows) {
      const diff = Math.abs(new Date(r.snapshotDate).getTime() - targetTs);
      if (diff < bestDiff) { best = r; bestDiff = diff; }
    }
    if (best && best.snapshotDate !== latestAgg.snapshotDate) {
      previous30d = {
        mrrMinor: best.mrrMinor,
        capturedAt: best.capturedAt instanceof Date ? best.capturedAt.toISOString() : String(best.capturedAt),
      };
    }
  }

  // Trailing-30d churn proxy from aggregate row deltas.
  let churnPct: number | null = null;
  if (latestAgg && aggregateRows.length > 1) {
    const cutoff = new Date(latestAgg.snapshotDate).getTime() - 30 * 24 * 60 * 60 * 1000;
    const window = aggregateRows.filter((r) => new Date(r.snapshotDate).getTime() >= cutoff);
    if (window.length > 1) {
      const startMrr = window[0].mrrMinor;
      let negativeSum = 0;
      for (let i = 1; i < window.length; i++) {
        const d = window[i].mrrMinor - window[i - 1].mrrMinor;
        if (d < 0) negativeSum += -d;
      }
      if (startMrr > 0) churnPct = (negativeSum / startMrr) * 100;
      else if (negativeSum === 0) churnPct = 0;
    }
  }

  const netNew = latestAgg && previous30d
    ? latestAgg.mrrMinor - previous30d.mrrMinor
    : null;
  const growthPct = latestAgg && previous30d && previous30d.mrrMinor > 0
    ? ((latestAgg.mrrMinor - previous30d.mrrMinor) / previous30d.mrrMinor) * 100
    : null;
  const grossRetentionPct = churnPct !== null ? Math.max(0, 100 - churnPct) : null;
  const netRetentionPct = latestAgg && previous30d && previous30d.mrrMinor > 0
    ? (latestAgg.mrrMinor / previous30d.mrrMinor) * 100
    : null;

  // Per-source: keep freshest row per non-aggregate sourceKey.
  const latestPerSource = new Map<string, StartupFinancial>();
  for (const r of perSourceRows) {
    const cur = latestPerSource.get(r.sourceKey);
    if (!cur || new Date(r.snapshotDate) > new Date(cur.snapshotDate)) {
      latestPerSource.set(r.sourceKey, r);
    }
  }

  const series = aggregateRows.map((r) => ({
    date: r.snapshotDate,
    mrrMinor: r.mrrMinor,
    revenueMinor: r.revenueLast30dMinor || r.revenueMinor || 0,
  }));

  // Match the freshness window used by `getVerifiedMrrForStartup`: the latest
  // aggregate snapshot must be within the last 35 days, MRR must be > 0, and
  // there must be at least one currently active financial connector.
  const verifiedCutoff = Date.now() - VERIFIED_WINDOW_MS;
  const latestAggCapturedAt = latestAgg
    ? (latestAgg.capturedAt instanceof Date ? latestAgg.capturedAt.getTime() : new Date(latestAgg.capturedAt).getTime())
    : 0;
  const isVerified = !!(
    latestAgg &&
    latestAgg.mrrMinor > 0 &&
    hasLive &&
    latestAggCapturedAt >= verifiedCutoff
  );

  return {
    startupId,
    currency,
    isVerified,
    hasLiveConnector: hasLive,
    current: latestAgg
      ? {
          mrrMinor: latestAgg.mrrMinor,
          arrMinor: latestAgg.arrMinor,
          revenue30dMinor: latestAgg.revenueLast30dMinor,
          burn30dMinor: latestAgg.burnLast30dMinor,
          runwayMonths: latestAgg.runwayMonths,
          activeCustomers: latestAgg.activeCustomers,
          capturedAt: latestAgg.capturedAt instanceof Date
            ? latestAgg.capturedAt.toISOString()
            : String(latestAgg.capturedAt),
          sourceLabel: SOURCE_LABELS[latestAgg.sourceKey] ?? latestAgg.sourceKey,
        }
      : null,
    previous30d,
    netNewMrrMinor: netNew,
    growthRatePct: growthPct,
    churnRatePct: churnPct,
    grossRetentionPct,
    netRetentionPct,
    series,
    perSource: Array.from(latestPerSource.values()).map((r) => ({
      sourceKey: r.sourceKey,
      sourceLabel: SOURCE_LABELS[r.sourceKey] ?? r.sourceKey,
      mrrMinor: r.mrrMinor,
      revenue30dMinor: r.revenueLast30dMinor || r.revenueMinor || 0,
      capturedAt: r.capturedAt instanceof Date ? r.capturedAt.toISOString() : String(r.capturedAt),
    })),
  };
}

function rowToVerified(row: StartupFinancial, isVerified: boolean, hasLiveConnector: boolean): VerifiedMrr {
  return {
    startupId: row.startupId,
    mrrMinor: row.mrrMinor,
    arrMinor: row.arrMinor,
    revenueMinor: row.revenueMinor,
    revenueLast30dMinor: row.revenueLast30dMinor,
    burnLast30dMinor: row.burnLast30dMinor,
    runwayMonths: row.runwayMonths,
    currency: row.currency,
    sourceKey: row.sourceKey,
    sourceLabel: SOURCE_LABELS[row.sourceKey] ?? row.sourceKey,
    capturedAt: row.capturedAt instanceof Date ? row.capturedAt.toISOString() : String(row.capturedAt),
    isVerified,
    hasLiveConnector,
  };
}

function isoDate(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Daily aggregator:
 *  1. For every startup with snapshots in the last 35 days, recompute and
 *     write a per-startup `fin-aggregate` snapshot for today combining all
 *     non-aggregate sources.
 *  2. Prune snapshots older than 400 days.
 *  3. Mark the synthetic `fin-aggregator` source as live for ops visibility.
 */
export async function runDailyAggregator(): Promise<void> {
  const cutoff = new Date(Date.now() - VERIFIED_WINDOW_MS);
  const recent = await db
    .select()
    .from(startupFinancials)
    .where(and(
      gt(startupFinancials.capturedAt, cutoff),
      sql`${startupFinancials.sourceKey} <> 'fin-aggregate'`,
    ))
    .orderBy(desc(startupFinancials.capturedAt));

  // Group by startup; keep the freshest row per source.
  const byStartup = new Map<string, Map<string, StartupFinancial>>();
  for (const r of recent) {
    let m = byStartup.get(r.startupId);
    if (!m) { m = new Map(); byStartup.set(r.startupId, m); }
    if (!m.has(r.sourceKey)) m.set(r.sourceKey, r);
  }

  const today = isoDate();
  for (const [startupId, perSource] of Array.from(byStartup.entries())) {
    const rows = Array.from(perSource.values());
    const currency = rows.find((r) => r.currency)?.currency || "RUB";
    // Aggregate strategy: MRR = max across sources (avoid double-counting the
    // same recurring revenue reported by both bank + acquirer); revenue30d =
    // sum (banks see distinct flows); burn = sum; runway = min over reporters.
    const mrr = rows.reduce((a, r) => Math.max(a, r.mrrMinor), 0);
    const revenue = rows.reduce((s, r) => s + (r.revenueLast30dMinor || r.revenueMinor || 0), 0);
    const burn = rows.reduce((s, r) => s + (r.burnLast30dMinor || 0), 0);
    const runways = rows.map((r) => r.runwayMonths).filter((x): x is number => typeof x === "number");
    const runwayMonths = runways.length ? Math.min(...runways) : null;
    const arr = mrr * 12;

    await db.insert(startupFinancials).values({
      startupId,
      sourceKey: "fin-aggregate",
      snapshotDate: today,
      mrrMinor: mrr,
      revenueMinor: revenue,
      arrMinor: arr,
      revenueLast30dMinor: revenue,
      burnLast30dMinor: burn,
      runwayMonths,
      currency,
      activeCustomers: null,
      payload: { sources: rows.map((r) => r.sourceKey) },
    }).onConflictDoUpdate({
      target: [startupFinancials.startupId, startupFinancials.sourceKey, startupFinancials.snapshotDate],
      set: {
        mrrMinor: mrr,
        revenueMinor: revenue,
        arrMinor: arr,
        revenueLast30dMinor: revenue,
        burnLast30dMinor: burn,
        runwayMonths,
        currency,
        capturedAt: new Date(),
      },
    });
  }

  // Prune snapshots older than 400 days.
  const oldCutoff = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000);
  await db.delete(startupFinancials).where(sql`${startupFinancials.capturedAt} < ${oldCutoff}`);

  await storage.markSignalSourceStatus("fin-aggregator", "live", null);
}

registerJobHandler("runFinancialsAggregator", async () => {
  await runDailyAggregator();
});

// Re-export for downstream usage (kept here to avoid duplicate exports).
export { inArray };
