import crypto from "crypto";

/**
 * Deterministic PII stripper. Runs BEFORE any LLM call.
 * Removes: phone numbers, emails, passport/ID numbers, card numbers, INNs.
 * Preserves: product names, domains, GitHub usernames, common phrases.
 *
 * This is compliance-critical and must be auditable — no LLM is used here.
 */
const RX = {
  email: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  phoneIntl: /\+?\d[\d\s().-]{8,}\d/g,
  card: /\b(?:\d[ -]?){13,19}\b/g,
  passportRu: /\b\d{2}\s?\d{2}\s?\d{6}\b/g,
  innRu: /\b\d{10}\b|\b\d{12}\b/g,
};

export function stripPii(text: string): string {
  if (!text) return "";
  let out = text;
  out = out.replace(RX.email, "[email]");
  // Strip cards before phones (cards are longer digit runs).
  out = out.replace(RX.card, "[card]");
  out = out.replace(RX.passportRu, "[passport]");
  out = out.replace(RX.innRu, "[inn]");
  out = out.replace(RX.phoneIntl, "[phone]");
  return out;
}

/** SHA-256 hash an email/phone for use as a stable identifier. */
export function hashIdentifier(value: string): string {
  return crypto.createHash("sha256").update(value.toLowerCase().trim()).digest("hex");
}

/** Stable dedupe hash: collector + source_id ensures one row per unique source. */
export function dedupeHash(collector: string, sourceId: string): string {
  return crypto.createHash("sha256").update(`${collector}::${sourceId}`).digest("hex");
}
