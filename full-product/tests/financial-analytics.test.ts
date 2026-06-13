import { describe, it, expect, vi, beforeEach } from "vitest";
import type { StartupFinancial } from "@shared/schema";

const dbResponses: StartupFinancial[][] = [];

const selectImpl = () => {
  const next = dbResponses.shift() ?? [];
  const chain: any = {
    from: () => chain,
    where: () => chain,
    orderBy: () => chain,
    limit: (_n: number) => Promise.resolve(next),
    then: (resolve: any) => resolve(next),
  };
  return chain;
};

vi.mock("../server/db", () => ({
  db: { select: () => selectImpl() },
}));

const credentialsState: { creds: any[] } = { creds: [] };
vi.mock("../server/storage", () => ({
  storage: {
    getIntegrationCredentialsForStartup: vi.fn(async (_id: string) => credentialsState.creds),
  },
}));

vi.mock("drizzle-orm", async () => {
  const actual = await vi.importActual<any>("drizzle-orm");
  return {
    ...actual,
    eq: (..._a: any[]) => ({ _: "eq" }),
    and: (..._a: any[]) => ({ _: "and" }),
    desc: (..._a: any[]) => ({ _: "desc" }),
    gt: (..._a: any[]) => ({ _: "gt" }),
    inArray: (..._a: any[]) => ({ _: "inArray" }),
    sql: Object.assign(() => ({ _: "sql" }), { raw: () => ({ _: "raw" }) }),
  };
});

vi.mock("../server/signals/scheduler", () => ({
  registerJobHandler: vi.fn(),
}));

import { getFinancialAnalytics } from "../server/signals/sources/group4/daily-aggregator";

const DAY = 24 * 60 * 60 * 1000;

function isoDate(offsetDays: number): string {
  return new Date(Date.now() - offsetDays * DAY).toISOString().slice(0, 10);
}

function makeRow(overrides: Partial<StartupFinancial>): StartupFinancial {
  const offset = 0;
  return {
    id: "row-" + Math.random(),
    startupId: "s1",
    sourceKey: "fin-aggregate",
    snapshotDate: isoDate(offset),
    mrrMinor: 0,
    revenueMinor: 0,
    arrMinor: 0,
    revenueLast30dMinor: 0,
    burnLast30dMinor: 0,
    runwayMonths: null,
    currency: "RUB",
    activeCustomers: null,
    payload: null,
    capturedAt: new Date(),
    ...overrides,
  } as StartupFinancial;
}

function aggRow(daysAgo: number, mrrMinor: number, extras: Partial<StartupFinancial> = {}): StartupFinancial {
  return makeRow({
    sourceKey: "fin-aggregate",
    snapshotDate: isoDate(daysAgo),
    capturedAt: new Date(Date.now() - daysAgo * DAY),
    mrrMinor,
    arrMinor: mrrMinor * 12,
    ...extras,
  });
}

describe("getFinancialAnalytics", () => {
  beforeEach(() => {
    dbResponses.length = 0;
    credentialsState.creds = [];
  });

  it("returns an empty/null analytics object when there are no snapshots", async () => {
    dbResponses.push([]);
    const a = await getFinancialAnalytics("s1");
    expect(a.current).toBeNull();
    expect(a.previous30d).toBeNull();
    expect(a.netNewMrrMinor).toBeNull();
    expect(a.growthRatePct).toBeNull();
    expect(a.churnRatePct).toBeNull();
    expect(a.grossRetentionPct).toBeNull();
    expect(a.netRetentionPct).toBeNull();
    expect(a.series).toEqual([]);
    expect(a.perSource).toEqual([]);
    expect(a.isVerified).toBe(false);
    expect(a.hasLiveConnector).toBe(false);
    expect(a.currency).toBe("RUB");
  });

  it("falls back to non-aggregate currency when no aggregate row has currency", async () => {
    dbResponses.push([
      makeRow({ sourceKey: "fin-yookassa", snapshotDate: isoDate(1), mrrMinor: 1000, currency: "USD" }),
    ]);
    const a = await getFinancialAnalytics("s1");
    expect(a.currency).toBe("USD");
    expect(a.current).toBeNull();
    expect(a.perSource).toHaveLength(1);
    expect(a.perSource[0].sourceKey).toBe("fin-yookassa");
    expect(a.perSource[0].sourceLabel).toBe("ЮKassa");
  });

  it("returns current snapshot but no growth/churn when there is only a single aggregate row", async () => {
    dbResponses.push([aggRow(1, 100_000)]);
    credentialsState.creds = [{ kind: "yookassa", status: "active" }];
    const a = await getFinancialAnalytics("s1");
    expect(a.current?.mrrMinor).toBe(100_000);
    expect(a.current?.arrMinor).toBe(1_200_000);
    expect(a.previous30d).toBeNull();
    expect(a.netNewMrrMinor).toBeNull();
    expect(a.growthRatePct).toBeNull();
    expect(a.churnRatePct).toBeNull();
    expect(a.grossRetentionPct).toBeNull();
    expect(a.netRetentionPct).toBeNull();
    expect(a.series).toHaveLength(1);
    expect(a.isVerified).toBe(true);
    expect(a.hasLiveConnector).toBe(true);
  });

  it("computes net-new MRR, MoM growth, and net retention from latest vs ~30d-ago aggregate", async () => {
    dbResponses.push([
      aggRow(30, 100_000),
      aggRow(15, 110_000),
      aggRow(1, 150_000),
    ]);
    const a = await getFinancialAnalytics("s1");
    expect(a.current?.mrrMinor).toBe(150_000);
    expect(a.previous30d?.mrrMinor).toBe(100_000);
    expect(a.netNewMrrMinor).toBe(50_000);
    expect(a.growthRatePct).toBeCloseTo(50, 5);
    expect(a.netRetentionPct).toBeCloseTo(150, 5);
  });

  it("computes churn proxy from the sum of negative aggregate MRR deltas / starting MRR", async () => {
    // Window: starts at 100_000; drops to 80_000 (-20k), rises to 90_000, drops to 70_000 (-20k).
    // negativeSum = 40_000; startMrr = 100_000 → churn = 40%.
    dbResponses.push([
      aggRow(28, 100_000),
      aggRow(20, 80_000),
      aggRow(10, 90_000),
      aggRow(1, 70_000),
    ]);
    const a = await getFinancialAnalytics("s1");
    expect(a.churnRatePct).toBeCloseTo(40, 5);
    expect(a.grossRetentionPct).toBeCloseTo(60, 5);
  });

  it("reports churn = 0 and gross retention = 100 for all-flat MRR history", async () => {
    dbResponses.push([
      aggRow(28, 50_000),
      aggRow(20, 50_000),
      aggRow(10, 50_000),
      aggRow(1, 50_000),
    ]);
    const a = await getFinancialAnalytics("s1");
    expect(a.churnRatePct).toBe(0);
    expect(a.grossRetentionPct).toBe(100);
    expect(a.netNewMrrMinor).toBe(0);
    expect(a.growthRatePct).toBe(0);
  });

  it("leaves growth/retention null when starting MRR is zero", async () => {
    dbResponses.push([
      aggRow(30, 0),
      aggRow(1, 25_000),
    ]);
    const a = await getFinancialAnalytics("s1");
    expect(a.netNewMrrMinor).toBe(25_000);
    expect(a.growthRatePct).toBeNull();
    expect(a.netRetentionPct).toBeNull();
    // No negative deltas in window → churnPct collapses to 0.
    expect(a.churnRatePct).toBe(0);
    expect(a.grossRetentionPct).toBe(100);
  });

  it("exposes runway from the latest aggregate snapshot", async () => {
    dbResponses.push([
      aggRow(30, 100_000, { runwayMonths: 8 }),
      aggRow(1, 120_000, { runwayMonths: 12, burnLast30dMinor: 5000, revenueLast30dMinor: 200_000, activeCustomers: 42 }),
    ]);
    const a = await getFinancialAnalytics("s1");
    expect(a.current?.runwayMonths).toBe(12);
    expect(a.current?.burn30dMinor).toBe(5000);
    expect(a.current?.revenue30dMinor).toBe(200_000);
    expect(a.current?.activeCustomers).toBe(42);
    expect(a.current?.sourceLabel).toBe("Aggregated");
  });

  it("keeps the freshest row per non-aggregate source in perSource", async () => {
    dbResponses.push([
      makeRow({ sourceKey: "fin-yookassa", snapshotDate: isoDate(20), mrrMinor: 10_000 }),
      makeRow({ sourceKey: "fin-yookassa", snapshotDate: isoDate(2), mrrMinor: 30_000, revenueLast30dMinor: 90_000 }),
      makeRow({ sourceKey: "fin-tinkoff-business", snapshotDate: isoDate(5), mrrMinor: 25_000, revenueMinor: 60_000 }),
      aggRow(1, 55_000),
    ]);
    const a = await getFinancialAnalytics("s1");
    const yk = a.perSource.find((p) => p.sourceKey === "fin-yookassa");
    const tk = a.perSource.find((p) => p.sourceKey === "fin-tinkoff-business");
    expect(yk?.mrrMinor).toBe(30_000);
    expect(yk?.revenue30dMinor).toBe(90_000);
    expect(yk?.sourceLabel).toBe("ЮKassa");
    // revenueLast30dMinor is 0 → falls back to revenueMinor.
    expect(tk?.revenue30dMinor).toBe(60_000);
    expect(a.perSource.find((p) => p.sourceKey === "fin-aggregate")).toBeUndefined();
  });

  it("returns a 90-day series shape ordered as the input rows, with revenue fallback", async () => {
    dbResponses.push([
      aggRow(60, 40_000, { revenueLast30dMinor: 0, revenueMinor: 80_000 }),
      aggRow(30, 60_000, { revenueLast30dMinor: 100_000 }),
      aggRow(1, 90_000, { revenueLast30dMinor: 150_000 }),
    ]);
    const a = await getFinancialAnalytics("s1");
    expect(a.series).toHaveLength(3);
    expect(a.series.map((s) => s.mrrMinor)).toEqual([40_000, 60_000, 90_000]);
    expect(a.series[0].revenueMinor).toBe(80_000);
    expect(a.series[1].revenueMinor).toBe(100_000);
    expect(a.series[2].revenueMinor).toBe(150_000);
  });

  it("is not verified when MRR is recent but no live connector is registered", async () => {
    dbResponses.push([aggRow(1, 100_000)]);
    credentialsState.creds = [];
    const a = await getFinancialAnalytics("s1");
    expect(a.hasLiveConnector).toBe(false);
    expect(a.isVerified).toBe(false);
  });

  it("is not verified when latest aggregate is older than the 35-day window", async () => {
    dbResponses.push([aggRow(40, 100_000)]);
    credentialsState.creds = [{ kind: "yookassa", status: "active" }];
    const a = await getFinancialAnalytics("s1");
    expect(a.hasLiveConnector).toBe(true);
    expect(a.isVerified).toBe(false);
  });
});
