import { SignalIngestor, type IngestorContext } from "../../base";
import { getTargetStartups, safeFetch, fetchJson, getLastEvent } from "./_helpers";
import { storage } from "../../../storage";

type HhVacancy = {
  id: string;
  name: string;
  alternate_url: string;
  area?: { name?: string };
  published_at?: string;
  salary?: { from?: number | null; to?: number | null; currency?: string | null } | null;
};
type HhResponse = { found?: number; items?: HhVacancy[] };
type HhSnapshot = { total: number; sampleSize: number; ts: number; medianSalaryRub?: number | null };
type HhEmployerSearch = { items?: Array<{ id: string; name: string; open_vacancies?: number }> };

const HH_HEADERS_BASE: Record<string, string> = {
  Accept: "application/json",
  "User-Agent": "Ventorix-Signals/1.0",
};

function buildHhHeaders(): Record<string, string> {
  const h = { ...HH_HEADERS_BASE };
  const token = process.env.HH_RU_TOKEN;
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

// Normalize for fuzzy comparison: lowercase, drop legal forms, drop common
// punctuation, collapse whitespace. Symmetric — applied to both haystack
// and needle so "ООО «Acme Labs»" and "Acme Labs" compare equal.
function normalizeCompanyName(s: string): string {
  return s
    .toLowerCase()
    .replace(/«|»|"|"|"|'|'|'|`|\(.*?\)/g, " ")
    .replace(/\b(llc|inc|ltd|corp|co|gmbh|ag|sa|bv|ооо|оао|зао|пао|ао|ип)\b\.?/gi, " ")
    .replace(/[.,\-_/\\]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Public HH search by company name. Returns ONLY a confidently-matched
// employer id, otherwise null. We deliberately reject ambiguous matches
// because the resolved id is persisted to the startup row — a wrong bind
// would permanently poison HH signals for that startup until manually
// corrected. Confidence rules:
//   1) Exact normalized match (single candidate, or first by relevance) → accept
//   2) Single candidate that contains the full normalized name → accept
//   3) Otherwise → reject (return null) and try again on a later run when
//      maybe HH has indexed the company more accurately
async function resolveEmployerIdByName(name: string): Promise<string | null> {
  const normNeedle = normalizeCompanyName(name);
  if (normNeedle.length < 3) return null;
  const url = `https://api.hh.ru/employers?text=${encodeURIComponent(name.trim())}&only_with_vacancies=true&per_page=10`;
  const res = await safeFetch(url, { headers: buildHhHeaders() });
  const data = await fetchJson<HhEmployerSearch>(res);
  const items = data?.items ?? [];
  if (items.length === 0) return null;

  const scored = items.map((i) => {
    const norm = normalizeCompanyName(i.name ?? "");
    let score: "exact" | "contains" | "loose" = "loose";
    if (norm === normNeedle) score = "exact";
    else if (norm.includes(normNeedle) || normNeedle.includes(norm)) score = "contains";
    return { ...i, _norm: norm, _score: score };
  });

  const exact = scored.filter((s) => s._score === "exact");
  if (exact.length === 1) return exact[0].id;
  if (exact.length > 1) {
    // Multiple exact matches — bind only if the leader has 2× more open
    // vacancies than the runner-up (proxy for "this is the real one").
    const sorted = [...exact].sort((a, b) => (b.open_vacancies ?? 0) - (a.open_vacancies ?? 0));
    const top = sorted[0].open_vacancies ?? 0;
    const next = sorted[1].open_vacancies ?? 0;
    if (top >= 2 * Math.max(next, 1)) return sorted[0].id;
    return null;
  }

  const contains = scored.filter((s) => s._score === "contains");
  if (contains.length === 1) return contains[0].id;

  // Anything else is too ambiguous to safely persist.
  return null;
}

// Convert any HH salary object (RUB / USD / EUR) to a rough RUB number for trend
// purposes only. Static rates are deliberate — we want stable comparability over
// time, not FX-accurate amounts.
function salaryToRub(s?: HhVacancy["salary"]): number | null {
  if (!s) return null;
  const mid = s.from && s.to ? (s.from + s.to) / 2 : (s.from ?? s.to ?? null);
  if (mid == null) return null;
  const cur = (s.currency || "RUR").toUpperCase();
  const rate = cur === "USD" ? 90 : cur === "EUR" ? 98 : 1;
  return Math.round(mid * rate);
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
}

export class HhVacanciesSource extends SignalIngestor {
  readonly sourceKey = "hh-vacancies";
  readonly displayName = "HH.ru vacancies";
  readonly category = "publicWeb";
  readonly description = "Open vacancy count, hiring deltas, new postings, and median salary band trend via the public HH.ru API. Auto-resolves employerId from the company name when missing.";

  protected async execute(ctx: IngestorContext): Promise<number> {
    const startups = await getTargetStartups(ctx.startup);

    let created = 0;
    for (const startup of startups) {
      let employer = (startup.hhEmployerId ?? "").trim();

      // Auto-resolve when missing — cache the resolved id back on the startup
      // row so we never pay this lookup cost again. Fail closed (skip startup)
      // if the search returns nothing.
      if (!employer) {
        const resolved = await resolveEmployerIdByName(startup.name).catch(() => null);
        if (!resolved) continue;
        try {
          await storage.updateStartup(startup.id, { hhEmployerId: resolved } as any);
        } catch (err) {
          console.warn(`[hh-vacancies] failed to persist resolved employerId for ${startup.id}:`, err);
        }
        employer = resolved;
        // Emit a one-time info event so admins can see the auto-link in the timeline.
        if (await this.recordEvent({
          startupId: startup.id,
          eventType: "hh.employer_resolved",
          severity: "info",
          title: `HH.ru employer auto-linked: ${employer}`,
          url: `https://hh.ru/employer/${employer}`,
          payload: { employerId: employer, source: "auto-resolve" },
          dedupeKey: `${startup.id}:hh:resolved:${employer}`,
        })) created++;
      }

      // Fetch previous snapshot FIRST so delta is computed against the true
      // historical baseline (not the snapshot we are about to insert).
      const prev = await getLastEvent(startup.id, this.sourceKey, "hh.snapshot");
      const prevPayload = (prev?.payload ?? null) as HhSnapshot | null;

      const res = await safeFetch(
        `https://api.hh.ru/vacancies?employer_id=${encodeURIComponent(employer)}&per_page=20`,
        { headers: buildHhHeaders() },
      );
      const data = await fetchJson<HhResponse>(res);
      if (!data) continue;
      const items = data.items ?? [];
      const total = typeof data.found === "number" ? data.found : items.length;
      const day = new Date().toISOString().slice(0, 10);

      // Median salary across the current sample (RUB, FX-normalised).
      const salaries = items.map((v) => salaryToRub(v.salary)).filter((n): n is number => typeof n === "number" && n > 0);
      const medianSalaryRub = median(salaries);

      // Vacancy count delta vs prior snapshot
      if (prevPayload && typeof prevPayload.total === "number" && prevPayload.total !== total) {
        const delta = total - prevPayload.total;
        if (await this.recordEvent({
          startupId: startup.id,
          eventType: "hh.delta",
          severity: delta > 0 ? "positive" : "warning",
          title: `Open vacancies ${delta > 0 ? "+" : ""}${delta} (${prevPayload.total} → ${total})`,
          payload: { delta, from: prevPayload.total, to: total },
          dedupeKey: `${startup.id}:hh:delta:${day}`,
        })) created++;
      }

      // Median salary trend event — only when both snapshots have a salary number
      // and the move is at least ±5% (avoids noise from one or two new postings).
      if (
        prevPayload?.medianSalaryRub != null &&
        medianSalaryRub != null &&
        Math.abs(medianSalaryRub - prevPayload.medianSalaryRub) / prevPayload.medianSalaryRub >= 0.05
      ) {
        const pct = Math.round(((medianSalaryRub - prevPayload.medianSalaryRub) / prevPayload.medianSalaryRub) * 100);
        if (await this.recordEvent({
          startupId: startup.id,
          eventType: "hh.salary_trend",
          severity: pct > 0 ? "positive" : "warning",
          title: `Median salary band ${pct > 0 ? "+" : ""}${pct}% (≈${medianSalaryRub.toLocaleString("ru-RU")} ₽)`,
          payload: { from: prevPayload.medianSalaryRub, to: medianSalaryRub, pct, sampleSize: salaries.length },
          dedupeKey: `${startup.id}:hh:salary:${day}`,
        })) created++;
      }

      // Snapshot
      const snapshot: HhSnapshot = { total, sampleSize: items.length, ts: Date.now(), medianSalaryRub };
      if (await this.recordEvent({
        startupId: startup.id,
        eventType: "hh.snapshot",
        severity: "info",
        title: medianSalaryRub != null
          ? `HH.ru: ${total} open vacancies · median ≈${medianSalaryRub.toLocaleString("ru-RU")} ₽`
          : `HH.ru: ${total} open vacancies`,
        url: `https://hh.ru/employer/${employer}`,
        payload: snapshot,
        dedupeKey: `${startup.id}:hh:snapshot:${day}`,
      })) created++;

      for (const v of items.slice(0, 10)) {
        if (await this.recordEvent({
          startupId: startup.id,
          eventType: "hh.vacancy",
          severity: "positive",
          title: `Hiring: ${v.name}`,
          summary: v.area?.name ?? undefined,
          url: v.alternate_url,
          occurredAt: v.published_at ? new Date(v.published_at) : undefined,
          payload: { id: v.id, area: v.area?.name, salaryRub: salaryToRub(v.salary) },
          dedupeKey: `${startup.id}:hh:vac:${v.id}`,
        })) created++;
      }
    }
    return created;
  }
}
