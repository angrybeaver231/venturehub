import { describe, it, expect, vi, beforeEach } from "vitest";
import type { StartupFinancial } from "@shared/schema";

// Queue of responses for sequential `db.select()...` calls.
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

import { getVerifiedMrrForStartup } from "../server/signals/sources/group4/daily-aggregator";

function makeRow(overrides: Partial<StartupFinancial>): StartupFinancial {
  return {
    id: "row-" + Math.random(),
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

describe("getVerifiedMrrForStartup", () => {
  beforeEach(() => {
    dbResponses.length = 0;
    credentialsState.creds = [];
  });

  it("returns null when the startup has no financial snapshots", async () => {
    // 1st query (window-filtered) → empty; 2nd fallback (latest ever) → empty
    dbResponses.push([], []);
    const v = await getVerifiedMrrForStartup("s1");
    expect(v).toBeNull();
  });

  it("returns unverified for snapshots outside the 35-day window", async () => {
    const old = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    dbResponses.push([], [makeRow({ capturedAt: old, mrrMinor: 100_000 })]);
    credentialsState.creds = [{ kind: "yookassa", status: "active" }];
    const v = await getVerifiedMrrForStartup("s1");
    expect(v).not.toBeNull();
    expect(v!.isVerified).toBe(false);
    expect(v!.hasLiveConnector).toBe(false);
  });

  it("returns unverified when in-window MRR exists but no active connector", async () => {
    const recent = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    dbResponses.push([makeRow({ capturedAt: recent, mrrMinor: 100_000 })]);
    credentialsState.creds = [];
    const v = await getVerifiedMrrForStartup("s1");
    expect(v!.isVerified).toBe(false);
    expect(v!.hasLiveConnector).toBe(false);
  });

  it("returns verified when in-window MRR > 0 AND active financial connector exists", async () => {
    const recent = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    dbResponses.push([
      makeRow({ capturedAt: recent, mrrMinor: 50_000, sourceKey: "fin-yookassa" }),
      makeRow({ capturedAt: recent, mrrMinor: 75_000, sourceKey: "fin-aggregate" }),
    ]);
    credentialsState.creds = [{ kind: "yookassa", status: "active" }];
    const v = await getVerifiedMrrForStartup("s1");
    expect(v!.isVerified).toBe(true);
    expect(v!.hasLiveConnector).toBe(true);
    expect(v!.mrrMinor).toBe(75_000);
    expect(v!.sourceKey).toBe("fin-aggregate");
    expect(v!.sourceLabel).toBe("Aggregated");
  });

  it("uses the highest-MRR per-source row when no aggregate is present", async () => {
    const recent = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    dbResponses.push([
      makeRow({ capturedAt: recent, mrrMinor: 30_000, sourceKey: "fin-yookassa" }),
      makeRow({ capturedAt: recent, mrrMinor: 90_000, sourceKey: "fin-tinkoff-business" }),
    ]);
    credentialsState.creds = [{ kind: "tinkoff-business", status: "active" }];
    const v = await getVerifiedMrrForStartup("s1");
    expect(v!.mrrMinor).toBe(90_000);
    expect(v!.sourceKey).toBe("fin-tinkoff-business");
    expect(v!.isVerified).toBe(true);
  });

  it("does not verify when only inactive credentials exist", async () => {
    const recent = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    dbResponses.push([makeRow({ capturedAt: recent, mrrMinor: 100_000 })]);
    credentialsState.creds = [{ kind: "yookassa", status: "expired" }];
    const v = await getVerifiedMrrForStartup("s1");
    expect(v!.isVerified).toBe(false);
  });
});
