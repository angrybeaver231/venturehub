import { FinancialIngestor, estimateFromTransactions, providerFetchJson, type FinancialSnapshot } from "./shared";

/**
 * Tinkoff Business Open API — list operations on the company's RUB account
 * for the last 60 days, then estimate MRR from recurring inflows.
 *
 * Credential kind: `tinkoff-business`
 *   config: { token: string, accountNumber?: string }
 */
export class TinkoffBusinessSource extends FinancialIngestor {
  readonly sourceKey = "fin-tinkoff-business";
  readonly displayName = "Tinkoff Business";
  readonly description = "Tinkoff Business Open API — RUB account operations → MRR estimate.";
  readonly credentialKind = "tinkoff-business";

  protected async pullForStartup(startupId: string, config: any): Promise<FinancialSnapshot | null> {
    const token = config?.token;
    if (!token) return null;
    const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const url = `https://business.tinkoff.ru/openapi/api/v1/bank-statement?from=${since}`;
    let txs: { amountMinor: number; payerKey?: string; occurredAt: Date }[] = [];
    try {
      const data = await providerFetchJson(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const ops: any[] = Array.isArray(data?.operations) ? data.operations : [];
      txs = ops
        .filter((o) => o?.typeOfOperation === "Credit" || o?.direction === "in")
        .map((o) => ({
          amountMinor: Math.round(Number(o?.amount ?? 0) * 100),
          payerKey: o?.payerInn || o?.payerName || undefined,
          occurredAt: new Date(o?.date || o?.executedAt || Date.now()),
        }));
    } catch {
      // Network or auth error — return null so the run records 0 events
      // without crashing the whole batch.
      return null;
    }
    const est = estimateFromTransactions(txs);
    return {
      startupId,
      mrrMinor: est.mrrMinor,
      revenueMinor: est.revenueMinor,
      currency: "RUB",
      activeCustomers: est.activeCustomers,
      payload: { provider: "tinkoff-business", txCount: txs.length },
    };
  }
}
