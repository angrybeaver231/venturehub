import { storage } from "../../../storage";
import { db } from "../../../db";
import { startupFinancials, startups, type InsertStartupFinancial } from "@shared/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { SignalIngestor, type IngestorContext } from "../../base";
import { getCredential, MissingCredentialError } from "../../credentials";
import { decryptConfig } from "../../crypto";

export type FinancialSnapshot = {
  startupId: string;
  mrrMinor: number;
  revenueMinor: number;
  // optional: providers that actually compute these can pass them; otherwise
  // they default to MRR*12 and revenueMinor respectively.
  arrMinor?: number;
  revenueLast30dMinor?: number;
  burnLast30dMinor?: number;
  runwayMonths?: number | null;
  currency: string;
  activeCustomers?: number | null;
  payload?: any;
  snapshotDate?: string;
};

function isoDate(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export async function upsertFinancialSnapshot(
  sourceKey: string,
  snap: FinancialSnapshot,
): Promise<{ previousMrrMinor: number | null }> {
  const mrr = Math.max(0, Math.round(snap.mrrMinor));
  const revenue = Math.max(0, Math.round(snap.revenueMinor));
  const row: InsertStartupFinancial = {
    startupId: snap.startupId,
    sourceKey,
    snapshotDate: snap.snapshotDate ?? isoDate(),
    mrrMinor: mrr,
    revenueMinor: revenue,
    arrMinor: Math.max(0, Math.round(snap.arrMinor ?? mrr * 12)),
    revenueLast30dMinor: Math.max(0, Math.round(snap.revenueLast30dMinor ?? revenue)),
    burnLast30dMinor: Math.max(0, Math.round(snap.burnLast30dMinor ?? 0)),
    runwayMonths: snap.runwayMonths ?? null,
    currency: snap.currency || "RUB",
    activeCustomers: snap.activeCustomers ?? null,
    payload: snap.payload ?? null,
  };
  // Look up the most recent prior snapshot for this source/startup so we can
  // emit a meaningful change event when MRR moves.
  const [prev] = await db
    .select({ mrrMinor: startupFinancials.mrrMinor })
    .from(startupFinancials)
    .where(and(
      eq(startupFinancials.startupId, snap.startupId),
      eq(startupFinancials.sourceKey, sourceKey),
    ))
    .orderBy(desc(startupFinancials.snapshotDate))
    .limit(1);

  await db.insert(startupFinancials).values(row).onConflictDoUpdate({
    target: [startupFinancials.startupId, startupFinancials.sourceKey, startupFinancials.snapshotDate],
    set: {
      mrrMinor: row.mrrMinor,
      revenueMinor: row.revenueMinor,
      arrMinor: row.arrMinor,
      revenueLast30dMinor: row.revenueLast30dMinor,
      burnLast30dMinor: row.burnLast30dMinor,
      runwayMonths: row.runwayMonths,
      currency: row.currency,
      activeCustomers: row.activeCustomers,
      payload: row.payload,
      capturedAt: new Date(),
    },
  });
  return { previousMrrMinor: prev?.mrrMinor ?? null };
}

/**
 * Base class for Group 4 (financial) connectors. Each subclass declares its
 * `credentialKind` and implements `pullForStartup(startup, config)` returning
 * a snapshot or null. The base will:
 *  - iterate startups that have an active credential of this kind (per-startup
 *    or a global credential),
 *  - throw MissingCredentialError when neither per-startup nor global creds exist,
 *  - persist snapshots to `startup_financials`,
 *  - emit a `financial.snapshot` event when a snapshot is captured, and
 *  - emit a `financial.mrr_change` event with the signed delta when MRR moves.
 */
export abstract class FinancialIngestor extends SignalIngestor {
  readonly category = "financial";
  readonly requiresCredentials = true;

  protected abstract pullForStartup(
    startupId: string,
    config: any,
  ): Promise<FinancialSnapshot | null>;

  protected async execute(_ctx: IngestorContext): Promise<number> {
    const kind = this.credentialKind!;
    const perStartup = await storage.getActiveIntegrationCredentialsByKind(kind);
    const globalCred = await getCredential(kind);
    if (perStartup.length === 0 && !globalCred) {
      throw new MissingCredentialError(kind);
    }

    let count = 0;
    if (perStartup.length > 0) {
      for (const cred of perStartup) {
        if (!cred.startupId) continue;
        const config = decryptConfig(cred.encryptedConfig);
        if (!config) continue;
        const snap = await this.safePull(cred.startupId, config);
        if (snap) {
          count += await this.persistAndEmit(snap);
        }
      }
    } else if (globalCred) {
      const allStartups = await db.select({ id: startups.id }).from(startups).limit(50);
      for (const s of allStartups) {
        const snap = await this.safePull(s.id, globalCred.config);
        if (snap) count += await this.persistAndEmit(snap);
      }
    }
    return count;
  }

  private async persistAndEmit(snap: FinancialSnapshot): Promise<number> {
    const { previousMrrMinor } = await upsertFinancialSnapshot(this.sourceKey, snap);
    const today = snap.snapshotDate ?? isoDate();
    await this.recordEvent({
      startupId: snap.startupId,
      eventType: "financial.snapshot",
      severity: "info",
      title: this.displayName,
      summary: `MRR snapshot ${(snap.mrrMinor / 100).toFixed(2)} ${snap.currency}`,
      dedupeKey: `${snap.startupId}:${today}`,
      payload: {
        mrrMinor: snap.mrrMinor,
        revenueMinor: snap.revenueMinor,
        currency: snap.currency,
      },
      verifiedBy: [this.sourceKey],
    });
    let events = 1;
    if (previousMrrMinor !== null && previousMrrMinor !== snap.mrrMinor) {
      const delta = snap.mrrMinor - previousMrrMinor;
      const pct = previousMrrMinor > 0 ? (delta / previousMrrMinor) * 100 : null;
      await this.recordEvent({
        startupId: snap.startupId,
        eventType: "financial.mrr_change",
        severity: Math.abs(delta) > previousMrrMinor * 0.2 ? "warning" : "info",
        title: this.displayName,
        summary:
          (delta > 0 ? "MRR up " : "MRR down ") +
          `${(Math.abs(delta) / 100).toFixed(2)} ${snap.currency}` +
          (pct !== null ? ` (${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%)` : ""),
        dedupeKey: `${snap.startupId}:${this.sourceKey}:mrr_change:${today}`,
        payload: {
          previousMrrMinor,
          mrrMinor: snap.mrrMinor,
          deltaMinor: delta,
          deltaPct: pct,
          currency: snap.currency,
        },
        verifiedBy: [this.sourceKey],
      });
      events++;
    }
    return events;
  }

  private async safePull(startupId: string, config: any): Promise<FinancialSnapshot | null> {
    try {
      return await this.pullForStartup(startupId, config);
    } catch (err) {
      console.warn(`[${this.sourceKey}] pull failed for ${startupId}:`, err instanceof Error ? err.message : err);
      return null;
    }
  }
}

/**
 * Heuristic: turn 30 days of transactions into an MRR estimate.
 *   - Sum gross inflows in the last 30 days → revenueMinor
 *   - Recurring (same payer + similar amount in prior 30d) → contributes to MRR
 *   - Fallback: MRR = revenueMinor (treats whole period as recurring) when
 *     transaction-level metadata isn't available.
 */
export function estimateFromTransactions(
  txs: { amountMinor: number; payerKey?: string; occurredAt: Date }[],
): { mrrMinor: number; revenueMinor: number; activeCustomers: number } {
  const now = Date.now();
  const last30 = txs.filter((t) => now - t.occurredAt.getTime() < 30 * 24 * 60 * 60 * 1000);
  const prev30 = txs.filter((t) => {
    const age = now - t.occurredAt.getTime();
    return age >= 30 * 24 * 60 * 60 * 1000 && age < 60 * 24 * 60 * 60 * 1000;
  });
  const revenue = last30.reduce((s, t) => s + Math.max(0, t.amountMinor), 0);

  if (last30.every((t) => !t.payerKey)) {
    return { mrrMinor: revenue, revenueMinor: revenue, activeCustomers: 0 };
  }

  const prevPayers = new Set(prev30.filter((t) => t.payerKey).map((t) => t.payerKey!));
  const recurring = last30.filter((t) => t.payerKey && prevPayers.has(t.payerKey));
  const mrr = recurring.reduce((s, t) => s + Math.max(0, t.amountMinor), 0);
  const customers = new Set(recurring.map((t) => t.payerKey!)).size;
  return { mrrMinor: mrr, revenueMinor: revenue, activeCustomers: customers };
}

// Provider HTTP helper with timeout and JSON parsing.
export async function providerFetchJson(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), init.timeoutMs ?? 8000);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// Re-export for convenience.
export { sql };
