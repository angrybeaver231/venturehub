import { describe, it, expect, vi, beforeEach } from "vitest";
import type { StartupFinancial } from "@shared/schema";

const dbState: {
  selectRows: StartupFinancial[];
  inserted: any[];
  deletedWhere: any | null;
  deletedRowsRemaining: StartupFinancial[];
} = {
  selectRows: [],
  inserted: [],
  deletedWhere: null,
  deletedRowsRemaining: [],
};

const selectImpl = () => {
  const chain: any = {
    from: () => chain,
    where: () => chain,
    orderBy: () => Promise.resolve(dbState.selectRows),
    limit: (_n: number) => Promise.resolve(dbState.selectRows),
    then: (resolve: any) => resolve(dbState.selectRows),
  };
  return chain;
};

const insertImpl = (_table: any) => ({
  values: (vals: any) => ({
    onConflictDoUpdate: (_opts: any) => {
      dbState.inserted.push(vals);
      return Promise.resolve();
    },
  }),
});

const deleteImpl = (_table: any) => ({
  where: (cond: any) => {
    dbState.deletedWhere = cond;
    return Promise.resolve();
  },
});

vi.mock("../server/db", () => ({
  db: {
    select: () => selectImpl(),
    insert: (t: any) => insertImpl(t),
    delete: (t: any) => deleteImpl(t),
  },
}));

const storageMocks = vi.hoisted(() => ({
  getIntegrationCredentialsForStartup: vi.fn(async (_id: string) => [] as any[]),
  markSignalSourceStatus: vi.fn(async (_k: string, _s: string, _e: any) => {}),
}));

vi.mock("../server/storage", () => ({
  storage: storageMocks,
}));

const sqlCalls = vi.hoisted(() => ({ list: [] as Array<{ strings: any; values: any[] }> }));

vi.mock("drizzle-orm", async () => {
  const actual = await vi.importActual<any>("drizzle-orm");
  const sqlFn = (strings: any, ...values: any[]) => {
    sqlCalls.list.push({ strings, values });
    return { _: "sql", strings, values };
  };
  return {
    ...actual,
    eq: (..._a: any[]) => ({ _: "eq" }),
    and: (..._a: any[]) => ({ _: "and" }),
    desc: (..._a: any[]) => ({ _: "desc" }),
    gt: (..._a: any[]) => ({ _: "gt" }),
    inArray: (..._a: any[]) => ({ _: "inArray" }),
    sql: Object.assign(sqlFn, { raw: () => ({ _: "raw" }) }),
  };
});

vi.mock("../server/signals/scheduler", () => ({
  registerJobHandler: vi.fn(),
}));

import { runDailyAggregator } from "../server/signals/sources/group4/daily-aggregator";

function makeRow(overrides: Partial<StartupFinancial>): StartupFinancial {
  return {
    id: "row-" + Math.random().toString(36).slice(2),
    startupId: "s1",
    sourceKey: "fin-yookassa",
    snapshotDate: "2026-01-01",
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

describe("runDailyAggregator", () => {
  beforeEach(() => {
    dbState.selectRows = [];
    dbState.inserted = [];
    dbState.deletedWhere = null;
    sqlCalls.list.length = 0;
    storageMocks.markSignalSourceStatus.mockClear();
  });

  it("computes per-startup fin-aggregate values: MRR=max, revenue=sum, burn=sum, runway=min, ARR=MRR*12", async () => {
    const recent = new Date();
    dbState.selectRows = [
      makeRow({
        startupId: "s1",
        sourceKey: "fin-yookassa",
        mrrMinor: 50_000,
        revenueLast30dMinor: 120_000,
        burnLast30dMinor: 30_000,
        runwayMonths: 9,
        currency: "RUB",
        capturedAt: recent,
      }),
      makeRow({
        startupId: "s1",
        sourceKey: "fin-tinkoff-business",
        mrrMinor: 80_000,
        revenueLast30dMinor: 200_000,
        burnLast30dMinor: 50_000,
        runwayMonths: 6,
        currency: "RUB",
        capturedAt: recent,
      }),
      makeRow({
        startupId: "s1",
        sourceKey: "fin-intl-subscriptions",
        mrrMinor: 40_000,
        revenueLast30dMinor: 90_000,
        burnLast30dMinor: 0,
        runwayMonths: null,
        currency: "RUB",
        capturedAt: recent,
      }),
    ];

    await runDailyAggregator();

    expect(dbState.inserted).toHaveLength(1);
    const agg = dbState.inserted[0];
    expect(agg.startupId).toBe("s1");
    expect(agg.sourceKey).toBe("fin-aggregate");
    expect(agg.mrrMinor).toBe(80_000); // max
    expect(agg.arrMinor).toBe(80_000 * 12); // MRR * 12
    expect(agg.revenueLast30dMinor).toBe(120_000 + 200_000 + 90_000); // sum
    expect(agg.revenueMinor).toBe(120_000 + 200_000 + 90_000);
    expect(agg.burnLast30dMinor).toBe(30_000 + 50_000 + 0); // sum
    expect(agg.runwayMonths).toBe(6); // min, ignoring nulls
    expect(agg.currency).toBe("RUB");
    expect(agg.payload).toEqual({
      sources: expect.arrayContaining([
        "fin-yookassa",
        "fin-tinkoff-business",
        "fin-intl-subscriptions",
      ]),
    });
    expect(agg.snapshotDate).toBe(new Date().toISOString().slice(0, 10));
  });

  it("keeps only the freshest snapshot per source when grouping", async () => {
    const newer = new Date();
    const older = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    // Source ordering follows desc(capturedAt) — newer comes first.
    dbState.selectRows = [
      makeRow({
        startupId: "s1",
        sourceKey: "fin-yookassa",
        mrrMinor: 70_000,
        capturedAt: newer,
      }),
      makeRow({
        startupId: "s1",
        sourceKey: "fin-yookassa",
        mrrMinor: 10_000,
        capturedAt: older,
      }),
    ];

    await runDailyAggregator();

    expect(dbState.inserted).toHaveLength(1);
    expect(dbState.inserted[0].mrrMinor).toBe(70_000);
  });

  it("aggregates each startup independently", async () => {
    const recent = new Date();
    dbState.selectRows = [
      makeRow({ startupId: "s1", sourceKey: "fin-yookassa", mrrMinor: 10_000, capturedAt: recent }),
      makeRow({ startupId: "s2", sourceKey: "fin-tinkoff-business", mrrMinor: 25_000, capturedAt: recent }),
    ];

    await runDailyAggregator();

    expect(dbState.inserted).toHaveLength(2);
    const byStartup = Object.fromEntries(dbState.inserted.map((r) => [r.startupId, r]));
    expect(byStartup.s1.mrrMinor).toBe(10_000);
    expect(byStartup.s2.mrrMinor).toBe(25_000);
  });

  it("returns null runway when no source reports a runway", async () => {
    dbState.selectRows = [
      makeRow({ startupId: "s1", sourceKey: "fin-yookassa", mrrMinor: 5_000, runwayMonths: null }),
    ];
    await runDailyAggregator();
    expect(dbState.inserted[0].runwayMonths).toBeNull();
  });

  it("falls back to RUB when no source provides a currency", async () => {
    dbState.selectRows = [
      makeRow({ startupId: "s1", sourceKey: "fin-yookassa", currency: "" as any }),
    ];
    await runDailyAggregator();
    expect(dbState.inserted[0].currency).toBe("RUB");
  });

  it("prunes snapshots older than 400 days using a `capturedAt < now-400d` cutoff", async () => {
    dbState.selectRows = [];
    const before = Date.now();
    await runDailyAggregator();
    const after = Date.now();

    // The delete branch must fire.
    expect(dbState.deletedWhere).not.toBeNull();

    // Find the sql tagged-template call used for the prune predicate. The
    // production code is `sql\`${startupFinancials.capturedAt} < ${oldCutoff}\``,
    // so we look for a call whose templated values include a Date roughly
    // 400 days before "now" (with a generous tolerance for slow CI).
    const fourHundredDaysMs = 400 * 24 * 60 * 60 * 1000;
    const expectedMin = before - fourHundredDaysMs - 5_000;
    const expectedMax = after - fourHundredDaysMs + 5_000;

    const pruneCall = sqlCalls.list.find((c) =>
      c.values.some((v) => v instanceof Date && v.getTime() >= expectedMin && v.getTime() <= expectedMax),
    );
    expect(pruneCall, "expected a sql call with a ~400-day-old Date cutoff").toBeTruthy();

    // Verify the templated SQL is a less-than comparison (i.e., older rows).
    const joined = (pruneCall!.strings as ArrayLike<string>) ? Array.from(pruneCall!.strings as any).join(" ") : "";
    expect(joined).toContain("<");
    // And the cutoff must NOT be a much shorter window (e.g., the 35-day
    // verified window) — anything newer than 200 days ago is wrong.
    const twoHundredDaysMs = 200 * 24 * 60 * 60 * 1000;
    const cutoff = pruneCall!.values.find((v) => v instanceof Date) as Date;
    expect(after - cutoff.getTime()).toBeGreaterThan(twoHundredDaysMs);
  });

  it("uses a 400-day prune cutoff: rows ~399 days old are kept, rows ~401 days old are deleted", async () => {
    dbState.selectRows = [];
    await runDailyAggregator();
    const cutoff = sqlCalls.list
      .flatMap((c) => c.values)
      .find((v): v is Date => v instanceof Date)!;
    expect(cutoff).toBeInstanceOf(Date);

    const day = 24 * 60 * 60 * 1000;
    const justUnder400d = new Date(Date.now() - 399 * day);
    const justOver400d = new Date(Date.now() - 401 * day);

    // The production predicate is `capturedAt < cutoff`, so simulate it.
    expect(justUnder400d.getTime() < cutoff.getTime()).toBe(false); // kept
    expect(justOver400d.getTime() < cutoff.getTime()).toBe(true);   // pruned
  });

  it("marks the synthetic fin-aggregator source as live", async () => {
    dbState.selectRows = [];
    await runDailyAggregator();
    expect(storageMocks.markSignalSourceStatus).toHaveBeenCalledWith(
      "fin-aggregator",
      "live",
      null,
    );
  });
});
