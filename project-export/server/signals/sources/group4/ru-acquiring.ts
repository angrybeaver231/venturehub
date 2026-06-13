import { FinancialIngestor, estimateFromTransactions, providerFetchJson, type FinancialSnapshot } from "./shared";

/**
 * RU acquiring connector (CloudPayments / Robokassa / Tinkoff Acquiring).
 * Single ingestor; the credential payload picks the actual provider.
 *
 * Credential kind: `ru-acquiring`
 *   config: { provider: "cloudpayments"|"robokassa"|"tinkoff-acquiring",
 *             publicId?: string, apiSecret?: string, terminalKey?: string, password?: string }
 */
const ENDPOINTS: Record<string, { url: string; auth: (c: any) => Record<string, string> }> = {
  cloudpayments: {
    url: "https://api.cloudpayments.ru/payments/list",
    auth: (c) => ({
      Authorization: `Basic ${Buffer.from(`${c.publicId}:${c.apiSecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    }),
  },
  robokassa: {
    url: "https://partner.robokassa.ru/api/v1/payments",
    auth: (c) => ({ Authorization: `Bearer ${c.apiSecret || c.token}` }),
  },
  "tinkoff-acquiring": {
    url: "https://securepay.tinkoff.ru/v2/GetState",
    auth: (c) => ({ Authorization: `Bearer ${c.password || c.token}` }),
  },
};

export class RuAcquiringSource extends FinancialIngestor {
  readonly sourceKey = "fin-ru-acquiring";
  readonly displayName = "RU acquiring (CloudPayments/Robokassa/Tinkoff)";
  readonly description = "Russian online acquiring — successful payments → MRR estimate.";
  readonly credentialKind = "ru-acquiring";

  protected async pullForStartup(startupId: string, config: any): Promise<FinancialSnapshot | null> {
    const provider = String(config?.provider || "").toLowerCase();
    const def = ENDPOINTS[provider];
    if (!def) return null;
    const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    let txs: { amountMinor: number; payerKey?: string; occurredAt: Date }[] = [];
    try {
      const data = await providerFetchJson(`${def.url}?from=${encodeURIComponent(since)}`, {
        method: "POST",
        headers: def.auth(config),
        body: JSON.stringify({ CreatedDateGte: since, Status: "Completed" }),
      });
      const items: any[] =
        (Array.isArray(data?.Model) && data.Model) ||
        (Array.isArray(data?.payments) && data.payments) ||
        (Array.isArray(data?.items) && data.items) ||
        [];
      txs = items
        .filter((p) => (p?.Status || p?.status) === "Completed" || p?.Success === true)
        .map((p) => ({
          amountMinor: Math.round(Number(p?.Amount ?? p?.amount ?? 0) * 100),
          payerKey: p?.AccountId || p?.SubscriptionId || p?.payerId || undefined,
          occurredAt: new Date(p?.CreatedDate || p?.created_at || p?.PaymentDate || Date.now()),
        }));
    } catch {
      return null;
    }
    // Geography from BIN country / IpCountry where exposed; refusal share
    // from declined items in the same response.
    const geography: Record<string, number> = {};
    let succeeded = 0;
    let refused = 0;
    for (const item of (await safeRawList(def, config)) ?? []) {
      const ok =
        (item?.Status || item?.status) === "Completed" || item?.Success === true;
      if (ok) succeeded++;
      else refused++;
      const c = item?.IpCountry || item?.IssuerBankCountry || item?.country;
      if (c) geography[c] = (geography[c] ?? 0) + 1;
    }
    const total = succeeded + refused;
    const refusalPct = total > 0 ? (refused / total) * 100 : 0;
    const now = Date.now();
    const recentPayers = new Set(
      txs
        .filter((t) => now - t.occurredAt.getTime() < 30 * 24 * 60 * 60 * 1000 && t.payerKey)
        .map((t) => t.payerKey!),
    );
    const priorPayers = new Set(
      txs
        .filter(
          (t) =>
            t.payerKey &&
            now - t.occurredAt.getTime() >= 30 * 24 * 60 * 60 * 1000 &&
            now - t.occurredAt.getTime() < 60 * 24 * 60 * 60 * 1000,
        )
        .map((t) => t.payerKey!),
    );
    let retained = 0;
    priorPayers.forEach((p) => { if (recentPayers.has(p)) retained++; });
    const retentionPct = priorPayers.size > 0 ? (retained / priorPayers.size) * 100 : null;

    const est = estimateFromTransactions(txs);
    return {
      startupId,
      mrrMinor: est.mrrMinor,
      revenueMinor: est.revenueMinor,
      currency: "RUB",
      activeCustomers: est.activeCustomers,
      payload: { provider, txCount: txs.length, retentionPct, refusalPct, geography },
    };
  }
}

async function safeRawList(def: { url: string; auth: (c: any) => Record<string, string> }, config: any): Promise<any[] | null> {
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const data = await providerFetchJson(`${def.url}?from=${encodeURIComponent(since)}`, {
      method: "POST",
      headers: def.auth(config),
      body: JSON.stringify({ CreatedDateGte: since }),
    });
    return (
      (Array.isArray(data?.Model) && data.Model) ||
      (Array.isArray(data?.payments) && data.payments) ||
      (Array.isArray(data?.items) && data.items) ||
      []
    );
  } catch {
    return null;
  }
}
