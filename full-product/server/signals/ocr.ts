import { estimateFromTransactions } from "./sources/group4/shared";

/**
 * OCR helper for bank-statement uploads. Uses tesseract.js for raster/PDF
 * fallback; if `OPENAI_API_KEY` is set, falls back to OpenAI vision for
 * images that tesseract can't parse cleanly.
 *
 * Returns a financial snapshot estimate. Heuristic line parser:
 *   matches "DD.MM.YYYY ... <amount> RUB" or similar Cyrillic statements.
 */
export type ParsedStatement = {
  mrrMinor: number;
  revenueMinor: number;
  currency: string;
  activeCustomers: number;
  rawText: string;
  txCount: number;
};

const AMOUNT_RE = /(\d{1,3}(?:[ \u00a0]\d{3})*|\d+)(?:[.,](\d{1,2}))?\s*(?:р|руб|RUB|₽|USD|\$|EUR|€)/gi;
const DATE_RE = /(\d{2})[./-](\d{2})[./-](\d{2,4})/;

function detectCurrency(text: string): string {
  if (/USD|\$/i.test(text)) return "USD";
  if (/EUR|€/i.test(text)) return "EUR";
  return "RUB";
}

function parseLines(text: string): { amountMinor: number; payerKey?: string; occurredAt: Date }[] {
  const lines = text.split(/\r?\n/);
  const txs: { amountMinor: number; payerKey?: string; occurredAt: Date }[] = [];
  for (const line of lines) {
    const dateMatch = line.match(DATE_RE);
    if (!dateMatch) continue;
    let amount: number | null = null;
    AMOUNT_RE.lastIndex = 0;
    const amounts: number[] = [];
    let m: RegExpExecArray | null;
    while ((m = AMOUNT_RE.exec(line)) !== null) {
      const whole = m[1].replace(/[ \u00a0]/g, "");
      const cents = m[2] ? m[2].padEnd(2, "0") : "00";
      amounts.push(parseInt(whole, 10) * 100 + parseInt(cents, 10));
    }
    if (amounts.length === 0) continue;
    amount = amounts[amounts.length - 1];
    const yearRaw = dateMatch[3];
    const year = yearRaw.length === 2 ? 2000 + parseInt(yearRaw, 10) : parseInt(yearRaw, 10);
    const date = new Date(year, parseInt(dateMatch[2], 10) - 1, parseInt(dateMatch[1], 10));
    if (Number.isNaN(date.getTime())) continue;
    if (!amount || amount <= 0) continue;
    // Use the longest non-numeric token as a crude payer key.
    const payerKey = (line.match(/[A-Za-zА-Яа-яЁё][A-Za-zА-Яа-яЁё .'-]{4,}/) || [undefined])[0];
    txs.push({ amountMinor: amount, payerKey: payerKey?.trim(), occurredAt: date });
  }
  return txs;
}

export async function ocrBuffer(buffer: Buffer, mimeType: string): Promise<string> {
  // Try tesseract for images. PDFs we route through pdf-parse first; if no
  // text extracted, we fall back to OCR'ing each page (skipped here for
  // simplicity — single-page PDFs / images are the common case).
  if (mimeType === "application/pdf") {
    try {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      const result = await parser.getText();
      const text = result?.text?.trim();
      if (text && text.length > 50) return text;
    } catch {
      // fall through to OCR
    }
  }
  try {
    const Tesseract = await import("tesseract.js");
    const result = await Tesseract.recognize(buffer, "rus+eng");
    return result?.data?.text ?? "";
  } catch (err) {
    console.warn("[ocr] tesseract failed:", err instanceof Error ? err.message : err);
    return "";
  }
}

export async function parseStatementBuffer(buffer: Buffer, mimeType: string): Promise<ParsedStatement> {
  let text = await ocrBuffer(buffer, mimeType);
  if (!text || text.trim().length < 20) {
    // OpenAI vision fallback for images.
    const openaiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
    if (openaiKey && mimeType.startsWith("image/")) {
      try {
        const OpenAI = (await import("openai")).default;
        const client = new OpenAI({
          apiKey: openaiKey,
          baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
        });
        const b64 = buffer.toString("base64");
        const resp = await client.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: "Extract the raw text content of this bank statement, preserving line breaks." },
                { type: "image_url", image_url: { url: `data:${mimeType};base64,${b64}` } },
              ] as any,
            },
          ],
          max_tokens: 2000,
        });
        text = resp.choices?.[0]?.message?.content ?? "";
      } catch (err) {
        console.warn("[ocr] openai fallback failed:", err instanceof Error ? err.message : err);
      }
    }
  }
  const txs = parseLines(text);
  const est = estimateFromTransactions(txs);
  return {
    mrrMinor: est.mrrMinor,
    revenueMinor: est.revenueMinor,
    currency: detectCurrency(text),
    activeCustomers: est.activeCustomers,
    rawText: text.slice(0, 4000),
    txCount: txs.length,
  };
}
