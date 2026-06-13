import { registerIngestor } from "../../registry";
import { TinkoffBusinessSource } from "./tinkoff-business";
import { RuBankSource } from "./ru-bank";
import { YooKassaSource } from "./yookassa";
import { RuAcquiringSource } from "./ru-acquiring";
import { IntlSubscriptionsSource } from "./intl-subscriptions";
import { BankStatementOcrSource } from "./bank-ocr";
import "./daily-aggregator";
import { GROUP4_FINANCIAL_KINDS } from "./daily-aggregator";

export type FinancialCredentialKind = (typeof GROUP4_FINANCIAL_KINDS)[number];

registerIngestor(new TinkoffBusinessSource());
registerIngestor(new RuBankSource());
registerIngestor(new YooKassaSource());
registerIngestor(new RuAcquiringSource());
registerIngestor(new IntlSubscriptionsSource());
registerIngestor(new BankStatementOcrSource());

export {
  GROUP4_FINANCIAL_KINDS,
  getVerifiedMrrForStartup,
  getVerifiedMrrMap,
  getFinancialHistory,
  getFinancialAnalytics,
  runDailyAggregator,
  startupHasLiveFinancialConnector,
} from "./daily-aggregator";
