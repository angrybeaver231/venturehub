import { FinancialIngestor, estimateFromTransactions, providerFetchJson, type FinancialSnapshot } from "./shared";

/**
 * ЮKassa (YooKassa) — list payments via Basic auth with shopId:secretKey.
 *
 * Credential kind: `yookassa`
 *   config: { shopId: string, secretKey: string }
 */
export class YooKassaSource extends FinancialIngestor {
  readonly sourceKey = "fin-yookassa";
  readonly displayName = "ЮKassa (YooKassa)";
  readonly description = "ЮKassa payments → MRR estimate from successful captures.";
  readonly credentialKind = "yookassa";

  protected async pullForStartup(startupId: string, config: any): Promise<FinancialSnapshot | null> {
    const shopId = config?.shopId;
    const secretKey = config?.secretKey || config?.token;
    if (!shopId || !secretKey) return null;

    const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const auth = Buffer.from(`${shopId}:${secretKey}`).toString("base64");
    let txs: { amountMinor: number; payerKey?: string; occurredAt: Date }[] = [];
    try {
      const data = await providerFetchJson(
        `https://api.yookassa.ru/v3/payments?status=succeeded&created_at.gte=${encodeURIComponent(since)}&limit=100`,
        { headers: { Authorization: `Basic ${auth}` } },
      );
      const items: any[] = Array.isArray(data?.items) ? data.items : [];
      txs = items.map((p) => ({
        amountMinor: Math.round(Number(p?.amount?.value ?? 0) * 100),
        payerKey: p?.payment_method?.id || p?.payer?.id || undefined,
        occurredAt: new Date(p?.captured_at || p?.created_at || Date.now()),
      }));
    } catch {
      return null;
    }
    // Geography breakdown from optional ip_country / payment_method.country
    const geography: Record<string, number> = {};
    let refused = 0;
    for (const p of (await safeRefusalPull(auth)) ?? []) {
      refused += 1;
      const c = p?.recipient?.country || p?.metadata?.country;
      if (c) geography[c] = (geography[c] ?? 0) + 1;
    }
    const totalAttempted = txs.length + refused;
    const refusalPct = totalAttempted > 0 ? (refused / totalAttempted) * 100 : 0;
    // Retention: payers seen in BOTH the last 30d and prior 30d / payers in prior 30d.
    const now = Date.now();
    const recent = new Set(
      txs
        .filter((t) => now - t.occurredAt.getTime() < 30 * 24 * 60 * 60 * 1000 && t.payerKey)
        .map((t) => t.payerKey!),
    );
    const prior = new Set(
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
    prior.forEach((p) => { if (recent.has(p)) retained++; });
    const retentionPct = prior.size > 0 ? (retained / prior.size) * 100 : null;

    const est = estimateFromTransactions(txs);
    return {
      startupId,
      mrrMinor: est.mrrMinor,
      revenueMinor: est.revenueMinor,
      currency: "RUB",
      activeCustomers: est.activeCustomers,
      payload: {
        provider: "yookassa",
        txCount: txs.length,
        retentionPct,
        refusalPct,
        geography,
      },
    };
  }
}

async function safeRefusalPull(auth: string): Promise<any[] | null> {
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const data = await providerFetchJson(
      `https://api.yookassa.ru/v3/payments?status=canceled&created_at.gte=${encodeURIComponent(since)}&limit=100`,
      { headers: { Authorization: `Basic ${auth}` } },
    );
    return Array.isArray(data?.items) ? data.items : [];
  } catch {
    return null;
  }
}
