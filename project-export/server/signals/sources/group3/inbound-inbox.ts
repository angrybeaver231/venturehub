import { SignalIngestor, type IngestorContext } from "../../base";
import { storage } from "../../../storage";

/**
 * Custom forwarding inbox. Each startup gets a dedicated address
 * `<startupId>@in.ventorix.club`. Inbound mail hits POST /api/inbound-email
 * (Resend Inbound or SendGrid Inbound Parse) and is parsed into signal_events
 * by `parseInboundEmail` below.
 *
 * MX record needed (set on `in.ventorix.club`):
 *   in.ventorix.club.   3600  IN MX 10 inbound.resend.com.
 *   (or feedback.smtp.sendgrid.net for SendGrid Inbound Parse)
 *
 * This ingestor itself only emits a heartbeat so the integrations page shows
 * green when an inbox is active.
 */
export class InboundInboxSource extends SignalIngestor {
  readonly sourceKey = "inbound-inbox";
  readonly displayName = "Custom inbound inbox";
  readonly category = "founder-oauth";
  readonly scoreCategory = "financial_health" as const;
  readonly description = "Forward Stripe / ЮKassa / RevenueCat receipts to a unique inbox.";
  readonly requiresCredentials = true;
  readonly credentialKind = "inbound-inbox";

  protected async execute(ctx: IngestorContext): Promise<number> {
    const startup = ctx.startup;
    if (!startup) return 0;
    const cred = await storage.getIntegrationCredential(startup.id, this.credentialKind!);
    if (!cred || cred.status !== "active") return 0;
    return 0;
  }
}

// --- Per-sender parser library -------------------------------------------

export type ParsedInbound = {
  eventType: string;
  severity: "info" | "warning" | "positive" | "critical";
  payload: Record<string, any>;
};

type Parser = {
  match: (fromDomain: string, subject: string) => boolean;
  parse: (subject: string, fromDomain: string) => ParsedInbound;
};

const PARSERS: Parser[] = [
  // Stripe receipts / invoice / dispute
  {
    match: (d) => d.endsWith("stripe.com"),
    parse: (subject) => {
      const lower = subject.toLowerCase();
      const amount = subject.match(/(\$|€|£|₽)\s*([\d.,]+)/);
      if (/disput|chargeback/.test(lower)) {
        return {
          eventType: "subscription_event",
          severity: "warning",
          payload: { provider: "stripe", kind: "dispute", amount: amount?.[2] ?? null, currency: amount?.[1] ?? null },
        };
      }
      if (/(receipt|payment|invoice|paid)/.test(lower)) {
        return {
          eventType: "revenue_signal",
          severity: "positive",
          payload: { provider: "stripe", kind: "receipt", amount: amount?.[2] ?? null, currency: amount?.[1] ?? null },
        };
      }
      return { eventType: "inbound_email", severity: "info", payload: { provider: "stripe" } };
    },
  },
  // ЮKassa (Yandex.Kassa)
  {
    match: (d) => d.endsWith("yookassa.ru") || d.endsWith("kassa.yandex.ru"),
    parse: (subject) => {
      const amount = subject.match(/([\d.,]+)\s*(₽|RUB|руб)/i);
      const lower = subject.toLowerCase();
      const refund = /(возврат|refund)/.test(lower);
      return {
        eventType: refund ? "subscription_event" : "revenue_signal",
        severity: refund ? "warning" : "positive",
        payload: {
          provider: "yookassa",
          kind: refund ? "refund" : "payment",
          amount: amount?.[1] ?? null,
          currency: "RUB",
        },
      };
    },
  },
  // RevenueCat events (subscription created/cancelled/renewed)
  {
    match: (d) => d.endsWith("revenuecat.com"),
    parse: (subject) => {
      const lower = subject.toLowerCase();
      let kind = "event";
      if (/cancel/.test(lower)) kind = "cancellation";
      else if (/renew/.test(lower)) kind = "renewal";
      else if (/(new|trial)/.test(lower)) kind = "new_subscription";
      else if (/refund/.test(lower)) kind = "refund";
      return {
        eventType: kind === "cancellation" || kind === "refund" ? "subscription_event" : "revenue_signal",
        severity: kind === "cancellation" || kind === "refund" ? "warning" : "positive",
        payload: { provider: "revenuecat", kind },
      };
    },
  },
  // AppsFlyer install/conversion triggers
  {
    match: (d) => d.endsWith("appsflyer.com"),
    parse: (subject) => ({
      eventType: "marketing_signal",
      severity: "info",
      payload: { provider: "appsflyer" },
    }),
  },
  // Tinkoff Acquiring receipts
  {
    match: (d) => d.endsWith("tinkoff.ru") || d.endsWith("acquiring.tinkoff.ru"),
    parse: (subject) => {
      const amount = subject.match(/([\d.,]+)\s*(₽|RUB|руб)/i);
      return {
        eventType: "revenue_signal",
        severity: "positive",
        payload: { provider: "tinkoff", kind: "payment", amount: amount?.[1] ?? null, currency: "RUB" },
      };
    },
  },
  // CloudPayments
  {
    match: (d) => d.endsWith("cloudpayments.ru"),
    parse: (subject) => ({
      eventType: "revenue_signal",
      severity: "positive",
      payload: { provider: "cloudpayments", kind: "payment" },
    }),
  },
];

export function parseInboundEmail(fromDomain: string, subject: string): ParsedInbound {
  for (const p of PARSERS) {
    if (p.match(fromDomain, subject)) return p.parse(subject, fromDomain);
  }
  return {
    eventType: "inbound_email",
    severity: "info",
    payload: { provider: fromDomain },
  };
}
