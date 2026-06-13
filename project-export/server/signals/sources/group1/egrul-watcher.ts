import { SignalIngestor, type IngestorContext } from "../../base";
import { getTargetStartups, safeFetch, getLastEvent } from "./_helpers";
import { storage } from "../../../storage";
import type { Investor } from "@shared/schema";

type EgrulRow = {
  n?: string;
  g?: string;
  a?: string;
  o?: string;
  p?: string;
  k?: string;
  i?: string;
  r?: string;
  capital?: string;
};

type EgrulSnapshot = {
  ogrn?: string;
  director?: string;
  address?: string;
  capital?: string | null;
  okved?: string | null;
  legalName?: string;
  founders?: string[];
};

function diffSnapshot(prev: EgrulSnapshot, next: EgrulSnapshot): string[] {
  const changes: string[] = [];
  for (const k of ["director", "address", "capital", "okved", "legalName"] as const) {
    if ((prev[k] ?? "") !== (next[k] ?? "")) {
      changes.push(`${k}: "${prev[k] ?? "-"}" → "${next[k] ?? "-"}"`);
    }
  }
  return changes;
}

// --- Levenshtein-ratio fuzzy matcher for investor names ---
function tokenize(s: string): string[] {
  return s.toLowerCase().replace(/["«»"".'`()]/g, " ").split(/\s+/).filter(Boolean);
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m: number[][] = [];
  for (let i = 0; i <= b.length; i++) m[i] = [i];
  for (let j = 0; j <= a.length; j++) m[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      m[i][j] = b[i - 1] === a[j - 1]
        ? m[i - 1][j - 1]
        : Math.min(m[i - 1][j - 1], m[i][j - 1], m[i - 1][j]) + 1;
    }
  }
  return m[b.length][a.length];
}

export function levenshteinRatio(a: string, b: string): number {
  if (!a && !b) return 1;
  const max = Math.max(a.length, b.length);
  if (max === 0) return 1;
  return 1 - levenshtein(a, b) / max;
}

export function fuzzyMatchInvestor(name: string, investors: Investor[]): { investor: Investor; score: number } | null {
  if (!name || investors.length === 0) return null;
  const target = name.toLowerCase().trim();
  const targetTokens = new Set(tokenize(target));
  let best: { investor: Investor; score: number } | null = null;
  for (const inv of investors) {
    const candidate = inv.name.toLowerCase().trim();
    if (!candidate) continue;
    const ratio = levenshteinRatio(target, candidate);
    const candTokens = new Set(tokenize(candidate));
    let overlap = 0;
    targetTokens.forEach((t) => { if (candTokens.has(t)) overlap++; });
    const tokenScore = overlap / Math.max(1, Math.min(targetTokens.size, candTokens.size));
    const score = Math.max(ratio, tokenScore);
    if (score >= 0.78 && (!best || score > best.score)) {
      best = { investor: inv, score };
    }
  }
  return best;
}

// --- Self-test (development assertion) ---
(() => {
  const stub: Investor[] = [
    { id: "1", name: "Sequoia Capital", kind: "vcFund", logo: null, thesis: null, description: null, website: null, contactEmail: null, hqCity: null, checkSizeMin: null, checkSizeMax: null, stageFocus: null, verticals: null, geographies: null, aum: null, portfolioCount: 0, status: "active", createdBy: null, createdAt: null } as unknown as Investor,
    { id: "2", name: "ФРИИ Инвест", kind: "vcFund", logo: null, thesis: null, description: null, website: null, contactEmail: null, hqCity: null, checkSizeMin: null, checkSizeMax: null, stageFocus: null, verticals: null, geographies: null, aum: null, portfolioCount: 0, status: "active", createdBy: null, createdAt: null } as unknown as Investor,
  ];
  const m1 = fuzzyMatchInvestor("Sequoia Capital LLC", stub);
  if (!m1 || m1.investor.id !== "1") {
    console.warn("[egrul-watcher] fuzzyMatchInvestor self-test failed for Sequoia");
  }
  const m2 = fuzzyMatchInvestor("ФРИИ Инвест", stub);
  if (!m2 || m2.investor.id !== "2") {
    console.warn("[egrul-watcher] fuzzyMatchInvestor self-test failed for ФРИИ");
  }
  const m3 = fuzzyMatchInvestor("Random Pizza Place", stub);
  if (m3) console.warn("[egrul-watcher] fuzzyMatchInvestor false positive on Random");
})();

function extractFounders(row: EgrulRow): string[] {
  const blob = `${row.p ?? ""} ${row.i ?? ""}`;
  // Heuristic: split on semicolons or commas, prefer chunks containing a name pattern.
  return blob
    .split(/[;,\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3 && s.length <= 200);
}

export class EgrulWatcherSource extends SignalIngestor {
  readonly sourceKey = "egrul-watcher";
  readonly displayName = "ЕГРЮЛ watcher";
  readonly category = "financial";
  readonly description =
    "Director / founder / address / capital / OKVED change detection from the FNS open registry. Matches new founders against the investors table.";

  protected async execute(ctx: IngestorContext): Promise<number> {
    const startups = await getTargetStartups(ctx.startup);
    let created = 0;
    const investors = await storage.getInvestors().catch(() => [] as Investor[]);

    for (const startup of startups) {
      const inn = (startup.inn ?? "").trim();
      if (!inn) continue;

      const prev = await getLastEvent(startup.id, this.sourceKey, "egrul.snapshot");
      const prevPayload = (prev?.payload ?? null) as EgrulSnapshot | null;

      const res = await safeFetch(
        "https://egrul.nalog.ru/",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `vyp3CaptchaToken=&page=&query=${encodeURIComponent(inn)}&region=&PreventChromeAutocomplete=`,
        },
      );
      if (!res?.ok) continue;
      const text = await res.text();
      const tokenMatch = text.match(/"t"\s*:\s*"([^"]+)"/);
      const token = tokenMatch?.[1];
      if (!token) continue;

      const resultRes = await safeFetch(`https://egrul.nalog.ru/search-result/${token}`);
      if (!resultRes?.ok) continue;
      let data: { rows?: EgrulRow[] } | null = null;
      try { data = (await resultRes.json()) as { rows?: EgrulRow[] }; } catch { continue; }
      const rows = data?.rows ?? [];
      const day = new Date().toISOString().slice(0, 10);

      for (const row of rows.slice(0, 3)) {
        const founders = extractFounders(row);
        const snapshot: EgrulSnapshot = {
          ogrn: row.o,
          director: row.g,
          address: row.a,
          capital: row.capital ?? null,
          okved: row.r ?? null,
          legalName: row.n,
          founders,
        };

        if (prevPayload && (prevPayload.ogrn ?? "") === (snapshot.ogrn ?? "")) {
          const changes = diffSnapshot(prevPayload, snapshot);
          if (changes.length > 0) {
            if (await this.recordEvent({
              startupId: startup.id,
              eventType: "egrul.change",
              severity: "warning",
              title: `ЕГРЮЛ changes detected (${changes.length})`,
              summary: changes.join("; ").slice(0, 280),
              payload: { changes, from: prevPayload, to: snapshot },
              dedupeKey: `${startup.id}:egrul:change:${snapshot.ogrn ?? inn}:${day}`,
            })) created++;
          }

          // Detect new founders (founder_change)
          const prevFounders = new Set((prevPayload.founders ?? []).map((s) => s.toLowerCase()));
          const newFounders = founders.filter((f) => !prevFounders.has(f.toLowerCase()));
          for (const founder of newFounders) {
            const match = fuzzyMatchInvestor(founder, investors);
            if (match) {
              if (await this.recordEvent({
                startupId: startup.id,
                eventType: "investor_took_stake",
                severity: "positive",
                title: `Investor took stake: ${match.investor.name}`,
                summary: `New ЕГРЮЛ founder "${founder}" matched investor "${match.investor.name}" (score ${(match.score * 100).toFixed(0)}%).`,
                payload: {
                  founder,
                  investorId: match.investor.id,
                  investorName: match.investor.name,
                  matchScore: match.score,
                },
                dedupeKey: `${startup.id}:egrul:investor-stake:${match.investor.id}:${day}`,
              })) created++;
            } else {
              if (await this.recordEvent({
                startupId: startup.id,
                eventType: "founder_change",
                severity: "warning",
                title: `New founder detected in ЕГРЮЛ`,
                summary: founder.slice(0, 280),
                payload: { founder },
                dedupeKey: `${startup.id}:egrul:founder-change:${founder}:${day}`,
              })) created++;
            }
          }
        }

        if (await this.recordEvent({
          startupId: startup.id,
          eventType: "egrul.snapshot",
          severity: "info",
          title: row.n ?? `ЕГРЮЛ: ${inn}`,
          summary: row.g ?? row.a ?? undefined,
          url: row.k ? `https://egrul.nalog.ru/index.html?vyp3CaptchaToken=${token}` : undefined,
          payload: snapshot,
          dedupeKey: `${startup.id}:egrul:${row.o ?? inn}:${day}`,
        })) created++;
      }
    }
    return created;
  }
}
