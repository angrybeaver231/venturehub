import { describe, it, expect, vi, beforeEach } from "vitest";

const insertValuesMock = vi.fn();
const insertOnConflictMock = vi.fn().mockResolvedValue(undefined);
const selectChain = {
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn(),
};

vi.mock("../server/db", () => ({
  db: {
    insert: vi.fn(() => ({
      values: (row: any) => {
        insertValuesMock(row);
        return { onConflictDoUpdate: insertOnConflictMock };
      },
    })),
    select: vi.fn(() => selectChain),
  },
}));

vi.mock("../server/storage", () => ({
  storage: {},
}));

import { upsertFinancialSnapshot, estimateFromTransactions } from "../server/signals/sources/group4/shared";

describe("estimateFromTransactions", () => {
  it("falls back to revenue=mrr when no payer keys are present", () => {
    const now = Date.now();
    const r = estimateFromTransactions([
      { amountMinor: 10_000, occurredAt: new Date(now - 24 * 60 * 60 * 1000) },
      { amountMinor: 5_000, occurredAt: new Date(now - 5 * 24 * 60 * 60 * 1000) },
    ]);
    expect(r.revenueMinor).toBe(15_000);
    expect(r.mrrMinor).toBe(15_000);
    expect(r.activeCustomers).toBe(0);
  });

  it("only counts recurring payers (present in both 30d windows) toward MRR", () => {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const txs = [
      { amountMinor: 1000, payerKey: "alice", occurredAt: new Date(now - 5 * day) },
      { amountMinor: 2000, payerKey: "bob", occurredAt: new Date(now - 10 * day) },
      { amountMinor: 9999, payerKey: "carol", occurredAt: new Date(now - 2 * day) },
      { amountMinor: 1000, payerKey: "alice", occurredAt: new Date(now - 40 * day) },
      { amountMinor: 2000, payerKey: "bob", occurredAt: new Date(now - 45 * day) },
    ];
    const r = estimateFromTransactions(txs);
    expect(r.revenueMinor).toBe(1000 + 2000 + 9999);
    expect(r.mrrMinor).toBe(3000);
    expect(r.activeCustomers).toBe(2);
  });

  it("ignores negative amounts in revenue total", () => {
    const now = Date.now();
    const r = estimateFromTransactions([
      { amountMinor: 1000, occurredAt: new Date(now - 1000) },
      { amountMinor: -500, occurredAt: new Date(now - 1000) },
    ]);
    expect(r.revenueMinor).toBe(1000);
  });
});

describe("upsertFinancialSnapshot", () => {
  beforeEach(() => {
    insertValuesMock.mockClear();
    insertOnConflictMock.mockClear();
    selectChain.from.mockReturnThis();
    selectChain.where.mockReturnThis();
    selectChain.orderBy.mockReturnThis();
    selectChain.limit.mockReset();
  });

  it("derives ARR=MRR*12 and revenueLast30d=revenueMinor by default", async () => {
    selectChain.limit.mockResolvedValueOnce([]);
    const result = await upsertFinancialSnapshot("fin-yookassa", {
      startupId: "s1",
      mrrMinor: 50_000,
      revenueMinor: 200_000,
      currency: "RUB",
    });
    expect(result.previousMrrMinor).toBeNull();
    const row = insertValuesMock.mock.calls[0][0];
    expect(row.startupId).toBe("s1");
    expect(row.sourceKey).toBe("fin-yookassa");
    expect(row.mrrMinor).toBe(50_000);
    expect(row.revenueMinor).toBe(200_000);
    expect(row.arrMinor).toBe(50_000 * 12);
    expect(row.revenueLast30dMinor).toBe(200_000);
    expect(row.burnLast30dMinor).toBe(0);
    expect(row.currency).toBe("RUB");
    expect(row.snapshotDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns previous MRR when a snapshot for the same source exists", async () => {
    selectChain.limit.mockResolvedValueOnce([{ mrrMinor: 12_345 }]);
    const result = await upsertFinancialSnapshot("fin-tinkoff-business", {
      startupId: "s2",
      mrrMinor: 20_000,
      revenueMinor: 0,
      currency: "RUB",
    });
    expect(result.previousMrrMinor).toBe(12_345);
  });

  it("clamps negative numbers and respects explicit overrides", async () => {
    selectChain.limit.mockResolvedValueOnce([]);
    await upsertFinancialSnapshot("fin-bank-ocr", {
      startupId: "s3",
      mrrMinor: -10,
      revenueMinor: 1000,
      arrMinor: 999,
      revenueLast30dMinor: 555,
      burnLast30dMinor: 100,
      runwayMonths: 8,
      currency: "USD",
    });
    const row = insertValuesMock.mock.calls[0][0];
    expect(row.mrrMinor).toBe(0);
    expect(row.arrMinor).toBe(999);
    expect(row.revenueLast30dMinor).toBe(555);
    expect(row.burnLast30dMinor).toBe(100);
    expect(row.runwayMonths).toBe(8);
    expect(row.currency).toBe("USD");
  });
});
