import { FinancialIngestor, estimateFromTransactions, type FinancialSnapshot } from "./shared";
import { ocrBuffer, parseStatementBuffer, type ParsedStatement } from "../../ocr";

/**
 * Bank statement OCR fallback + per-bank PDF templates for Sberbank /
 * Tinkoff / Alfa-Bank.
 *
 * Upload flow:
 *   1. `parseStatementSmart(buffer, mimeType)` runs OCR (pdf-parse → tesseract
 *      → optional OpenAI vision via `parseStatementBuffer`).
 *   2. The bank is detected from header strings (`detectBank`).
 *   3. The bank-specific parser extracts account number, period, and a list
 *      of transactions ({date, counterparty, amountMinor, direction}).
 *   4. If header detection fails or the per-bank parser yields nothing, we
 *      fall back to the generic estimator from `ocr.ts`.
 *
 * Sample fixtures (verbatim text after pdf-parse extraction):
 *
 *   Sberbank:
 *     ПАО Сбербанк России
 *     Выписка по счёту № 40702810038000123456
 *     За период с 01.03.2026 по 31.03.2026
 *     01.03.2026  ООО Ромашка   Зачисление  150 000,00 RUB
 *     05.03.2026  ИП Иванов     Списание    -24 500,00 RUB
 *     Итого зачислений: 150 000,00 RUB
 *
 *   Tinkoff:
 *     АО «Тинькофф Банк»
 *     Счёт № 40802810700000999111
 *     Период: 01.03.2026 — 31.03.2026
 *     01.03.2026  ИП Петров   +250 000,00  RUB  Поступление
 *     03.03.2026  Aviasales   -18 200,00   RUB  Списание
 *
 *   Alfa-Bank:
 *     АО "Альфа-Банк"
 *     Account No. 40702810600400000777  EUR
 *     Period: 01.03.2026 - 31.03.2026
 *     01.03.2026  ACME GMBH   Credit  10 000,00 EUR
 *     12.03.2026  AWS         Debit   -1 250,75 EUR
 */

export type BankKind = "sber" | "tinkoff" | "alfa" | "generic";

export type BankTransaction = {
  date: string; // YYYY-MM-DD
  counterparty: string;
  amountMinor: number; // always positive
  direction: "in" | "out";
};

export type RichParsedStatement = ParsedStatement & {
  bank: BankKind;
  accountNumber: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  totalsInMinor: number;
  totalsOutMinor: number;
  transactions: BankTransaction[];
};

const BANK_HEADERS: Array<{ bank: BankKind; pattern: RegExp; accountRe: RegExp | null }> = [
  {
    bank: "sber",
    pattern: /(ПАО\s*Сбербанк|Сбербанк\s*России|SBERBANK|PJSC\s+Sberbank)/i,
    accountRe: /(?:счёт[уа]?|account)\s*(?:№|No\.?|#)?\s*(\d{15,25})/i,
  },
  {
    bank: "tinkoff",
    pattern: /(Тинькофф\s*Банк|АО\s*«?Тинькофф|Tinkoff\s*Bank)/i,
    accountRe: /(?:Счёт|Account)\s*(?:№|No\.?)?\s*(\d{15,25})/i,
  },
  {
    bank: "alfa",
    pattern: /(АО\s*«?Альфа[- ]?Банк|Альфа[- ]?Банк|Alfa[- ]?Bank)/i,
    accountRe: /(?:Счёт|Account)\s*(?:№|No\.?)?\s*(\d{15,25})/i,
  },
];

export function detectBank(text: string): { bank: BankKind; accountRe: RegExp | null } {
  for (const h of BANK_HEADERS) {
    if (h.pattern.test(text)) return { bank: h.bank, accountRe: h.accountRe };
  }
  return { bank: "generic", accountRe: null };
}

const PERIOD_RE = /(?:за\s+период|период|period)[:\s]*(?:с\s+)?(\d{2}[.\-/]\d{2}[.\-/]\d{2,4})\s*(?:по|to|—|–|-)\s*(\d{2}[.\-/]\d{2}[.\-/]\d{2,4})/i;
const AMOUNT_RE = /([+-]?\d{1,3}(?:[ \u00a0]\d{3})*(?:[.,]\d{2}))/g;
const DATE_RE = /(\d{2})[.\-/](\d{2})[.\-/](\d{2,4})/;
const OUT_KEY = /(списан|расход|payment|debit|оплат|withdraw|charge)/i;
const IN_KEY = /(зачислен|поступ|приход|credit|deposit|incoming)/i;
const CURRENCY_RE = /\b(RUB|USD|EUR)\b|([₽$€])/;

function detectStatementCurrency(text: string): string {
  const m = text.match(CURRENCY_RE);
  if (!m) return "RUB";
  const tag = (m[1] ?? m[2] ?? "").toUpperCase();
  if (tag === "USD" || tag === "$") return "USD";
  if (tag === "EUR" || tag === "€") return "EUR";
  return "RUB";
}

function parseAmountStr(s: string): number {
  const cleaned = s.replace(/[\s\u00a0]/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function parseDateMatch(m: RegExpMatchArray): Date {
  const yearRaw = m[3];
  const year = yearRaw.length === 2 ? 2000 + parseInt(yearRaw, 10) : parseInt(yearRaw, 10);
  return new Date(year, parseInt(m[2], 10) - 1, parseInt(m[1], 10));
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function extractCounterparty(line: string): string {
  const stripped = line
    .replace(DATE_RE, "")
    .replace(AMOUNT_RE, "")
    .replace(/[«»"]/g, "")
    .replace(/\b(RUB|USD|EUR)\b|[₽$€]/gi, "")
    .replace(/(Списан\w*|Зачисл\w*|Поступ\w*|Приход|Расход|Credit|Debit)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.length > 80 ? stripped.slice(0, 80) : stripped;
}

/**
 * Parses raw statement text into a structured per-bank result. Bank-agnostic
 * row parsing (date + last numeric amount + direction keywords) — bank
 * detection only changes the account-number anchor, since that's the
 * field where layouts diverge most.
 */
export function parseBankStatement(text: string): RichParsedStatement {
  const { bank, accountRe } = detectBank(text);
  const accountMatch = accountRe ? text.match(accountRe) : null;
  const accountNumber = accountMatch ? accountMatch[1] : null;
  const period = text.match(PERIOD_RE);
  const periodStart = period?.[1] ?? null;
  const periodEnd = period?.[2] ?? null;
  const currency = detectStatementCurrency(text);

  const transactions: BankTransaction[] = [];
  let totalsInMinor = 0;
  let totalsOutMinor = 0;

  for (const line of text.split(/\r?\n/)) {
    const dm = line.match(DATE_RE);
    if (!dm) continue;
    const date = parseDateMatch(dm);
    if (Number.isNaN(date.getTime())) continue;
    const amountMatches = Array.from(line.matchAll(AMOUNT_RE));
    if (!amountMatches.length) continue;
    const lastAmount = amountMatches[amountMatches.length - 1];
    const signedRaw = lastAmount[1];
    const signedMinor = parseAmountStr(signedRaw);
    if (signedMinor === 0) continue;
    let direction: "in" | "out";
    if (signedMinor < 0 || OUT_KEY.test(line)) direction = "out";
    else if (IN_KEY.test(line) || /^\+/.test(signedRaw.trim())) direction = "in";
    else direction = "in";
    const amountMinor = Math.abs(signedMinor);
    transactions.push({
      date: isoDay(date),
      counterparty: extractCounterparty(line),
      amountMinor,
      direction,
    });
    if (direction === "in") totalsInMinor += amountMinor;
    else totalsOutMinor += amountMinor;
  }

  const inflow = transactions.filter((t) => t.direction === "in");
  const est = estimateFromTransactions(inflow.map((t) => ({
    amountMinor: t.amountMinor,
    payerKey: t.counterparty || undefined,
    occurredAt: new Date(t.date),
  })));

  return {
    bank,
    accountNumber,
    periodStart,
    periodEnd,
    transactions,
    totalsInMinor,
    totalsOutMinor,
    mrrMinor: est.mrrMinor,
    revenueMinor: est.revenueMinor || totalsInMinor,
    activeCustomers: est.activeCustomers,
    rawText: text.slice(0, 4000),
    txCount: transactions.length,
    currency,
  };
}

/**
 * Smart entry point used by the upload route. Runs OCR via the existing
 * pipeline, attempts per-bank parsing, and falls back to the generic
 * `parseStatementBuffer` whenever the per-bank parser yields zero
 * transactions and no bank header was detected.
 */
export async function parseStatementSmart(
  buffer: Buffer,
  mimeType: string,
): Promise<RichParsedStatement> {
  const text = await ocrBuffer(buffer, mimeType);
  if (text && text.trim().length >= 20) {
    const rich = parseBankStatement(text);
    if (rich.bank !== "generic" || rich.transactions.length > 0) return rich;
  }
  // Fall back to the generic estimator (handles OpenAI vision path for images).
  const generic = await parseStatementBuffer(buffer, mimeType);
  return {
    ...generic,
    bank: "generic",
    accountNumber: null,
    periodStart: null,
    periodEnd: null,
    transactions: [],
    totalsInMinor: generic.revenueMinor,
    totalsOutMinor: 0,
  };
}

/**
 * Credential kind: `bank-ocr`
 *   config: { lastUploadAt: string, fileName: string }
 *
 * The scheduled run is a no-op — the upload endpoint inserts the snapshot
 * directly via `parseStatementSmart` + `upsertFinancialSnapshot`.
 */
export class BankStatementOcrSource extends FinancialIngestor {
  readonly sourceKey = "fin-bank-ocr";
  readonly displayName = "Bank statement OCR fallback";
  readonly description = "Manual PDF/JPG bank statement upload → OCR → MRR estimate.";
  readonly credentialKind = "bank-ocr";

  protected async pullForStartup(_startupId: string, _config: any): Promise<FinancialSnapshot | null> {
    return null;
  }
}
