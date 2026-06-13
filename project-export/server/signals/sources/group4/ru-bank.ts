import { FinancialIngestor, estimateFromTransactions, providerFetchJson, type FinancialSnapshot } from "./shared";

/**
 * Generic Russian business-bank connector covering Точка / Модульбанк /
 * Альфа-Бизнес. The integration credential carries a `provider` key that
 * picks the API base URL.
 *
 * Credential kind: `ru-bank`
 *   config: { token: string, provider: "tochka"|"modulbank"|"alfabank", accountNumber?: string }
 */
const PROVIDER_ENDPOINTS: Record<string, string> = {
  tochka: "https://enter.tochka.com/sandbox/v2/open-banking/v1.0/statements",
  modulbank: "https://api.modulbank.ru/v1/operation-history",
  alfabank: "https://baas.alfabank.ru/api/v1/statements",
};

export class RuBankSource extends FinancialIngestor {
  readonly sourceKey = "fin-ru-bank";
  readonly displayName = "RU business banks (Точка/Модульбанк/Альфа-Бизнес)";
  readonly description = "Russian business banks — operation history → MRR estimate.";
  readonly credentialKind = "ru-bank";

  protected async pullForStartup(startupId: string, config: any): Promise<FinancialSnapshot | null> {
    const token = config?.token;
    const provider = String(config?.provider || "").toLowerCase();
    const endpoint = PROVIDER_ENDPOINTS[provider];
    if (!token || !endpoint) return null;
    const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    let txs: { amountMinor: number; payerKey?: string; occurredAt: Date }[] = [];
    try {
      const data = await providerFetchJson(`${endpoint}?from=${since}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const ops: any[] = Array.isArray(data?.operations) ? data.operations : Array.isArray(data?.data) ? data.data : [];
      txs = ops
        .filter((o) => Number(o?.amount ?? 0) > 0)
        .map((o) => ({
          amountMinor: Math.round(Number(o?.amount ?? 0) * 100),
          payerKey: o?.contragentInn || o?.payerInn || o?.contragentName || undefined,
          occurredAt: new Date(o?.date || o?.operationDate || Date.now()),
        }));
    } catch {
      return null;
    }
    const est = estimateFromTransactions(txs);
    return {
      startupId,
      mrrMinor: est.mrrMinor,
      revenueMinor: est.revenueMinor,
      currency: "RUB",
      activeCustomers: est.activeCustomers,
      payload: { provider, txCount: txs.length },
    };
  }
}
