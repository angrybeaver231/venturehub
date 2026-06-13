import { FinancialIngestor, providerFetchJson, type FinancialSnapshot } from "./shared";

/**
 * International subscription billing (Stripe / Lemon Squeezy / Paddle).
 * Reads the active subscription list and aggregates monthly amounts.
 *
 * Credential kind: `intl-subscriptions`
 *   config: { provider: "stripe"|"lemonsqueezy"|"paddle",
 *             apiKey: string, currency?: string }
 */
type Endpoint = {
  url: string;
  parse: (data: any) => { monthlyMinor: number; activeCustomers: number };
};

function monthlyFromStripeInterval(amount: number, interval: string, intervalCount: number): number {
  const ic = intervalCount || 1;
  switch (interval) {
    case "month":
      return amount / ic;
    case "year":
      return amount / (12 * ic);
    case "week":
      return (amount / ic) * (52 / 12);
    case "day":
      return (amount / ic) * (365 / 12);
    default:
      return amount;
  }
}

const PROVIDERS: Record<string, Endpoint> = {
  stripe: {
    url: "https://api.stripe.com/v1/subscriptions?status=active&limit=100",
    parse: (data) => {
      const subs: any[] = Array.isArray(data?.data) ? data.data : [];
      let total = 0;
      const customers = new Set<string>();
      for (const s of subs) {
        const items: any[] = s?.items?.data || [];
        for (const it of items) {
          const price = it?.price;
          if (!price) continue;
          const monthly = monthlyFromStripeInterval(
            Number(price?.unit_amount ?? 0) * Number(it?.quantity ?? 1),
            String(price?.recurring?.interval ?? "month"),
            Number(price?.recurring?.interval_count ?? 1),
          );
          total += monthly;
        }
        if (s?.customer) customers.add(String(s.customer));
      }
      return { monthlyMinor: Math.round(total), activeCustomers: customers.size };
    },
  },
  lemonsqueezy: {
    url: "https://api.lemonsqueezy.com/v1/subscriptions?filter[status]=active",
    parse: (data) => {
      const subs: any[] = Array.isArray(data?.data) ? data.data : [];
      let total = 0;
      const customers = new Set<string>();
      for (const s of subs) {
        const attrs = s?.attributes ?? {};
        const monthly = Number(attrs?.first_subscription_item?.price ?? attrs?.unit_price ?? 0);
        total += monthly; // already monthly, in cents
        if (attrs?.customer_id) customers.add(String(attrs.customer_id));
      }
      return { monthlyMinor: Math.round(total), activeCustomers: customers.size };
    },
  },
  paddle: {
    url: "https://api.paddle.com/subscriptions?status=active&per_page=100",
    parse: (data) => {
      const subs: any[] = Array.isArray(data?.data) ? data.data : [];
      let total = 0;
      const customers = new Set<string>();
      for (const s of subs) {
        const items: any[] = s?.items ?? [];
        for (const it of items) {
          const monthly = Number(it?.price?.unit_price?.amount ?? 0) * Number(it?.quantity ?? 1);
          total += monthly;
        }
        if (s?.customer_id) customers.add(String(s.customer_id));
      }
      return { monthlyMinor: Math.round(total), activeCustomers: customers.size };
    },
  },
};

export class IntlSubscriptionsSource extends FinancialIngestor {
  readonly sourceKey = "fin-intl-subscriptions";
  readonly displayName = "International billing (Stripe/Lemon Squeezy/Paddle)";
  readonly description = "Active subscriptions → monthly recurring revenue.";
  readonly credentialKind = "intl-subscriptions";

  protected async pullForStartup(startupId: string, config: any): Promise<FinancialSnapshot | null> {
    const provider = String(config?.provider || "stripe").toLowerCase();
    const def = PROVIDERS[provider];
    const apiKey = config?.apiKey || config?.token;
    if (!def || !apiKey) return null;
    let parsed = { monthlyMinor: 0, activeCustomers: 0 };
    try {
      const data = await providerFetchJson(def.url, {
        headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      });
      parsed = def.parse(data);
    } catch {
      return null;
    }
    return {
      startupId,
      mrrMinor: parsed.monthlyMinor,
      revenueMinor: parsed.monthlyMinor,
      currency: String(config?.currency || "USD"),
      activeCustomers: parsed.activeCustomers,
      payload: { provider },
    };
  }
}
