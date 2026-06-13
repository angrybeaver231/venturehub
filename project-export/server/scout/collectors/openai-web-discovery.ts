import OpenAI from "openai";
import { recordObservation } from "../ingest";
import { isBlacklisted } from "../blacklist";

/**
 * Wave-1 active collector: `openai-web-discovery`.
 *
 * Triggered by the admin "Find startups now" button. Uses gpt-4o-mini with
 * the web_search_preview tool (Responses API) to find real early-stage
 * startups matching the supplied verticals/region/keywords, then synthesises
 * a plain-text observation for each candidate so the existing classifier +
 * entity-extractor pipeline picks them up unchanged.
 *
 * Falls back to chat.completions (no web access) if the Responses API or
 * web_search tool isn't available on the configured OpenAI key — in that
 * case candidates come from the model's training data.
 */

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const COLLECTOR = "openai-web-discovery";
const MODEL = "gpt-4o-mini";

export interface DiscoveryParams {
  verticals?: string[];
  region?: string;
  keywords?: string;
  count?: number;
}

interface Candidate {
  name: string;
  domain?: string | null;
  vertical?: string | null;
  // New strict prompt asks for `stage_estimate`. We still accept legacy
  // `stage` for backwards compatibility with cached responses.
  stage?: string | null;
  stage_estimate?: string | null;
  description?: string | null;
  founders?: Array<{ name?: string; role?: string; handle?: string | null }>;
  links?: string[];
  evidence_url?: string | null;
  signal?: string | null;
}

/**
 * Returns the downstream stage to write into the synthesised observation,
 * or null if the candidate must be dropped on stage grounds.
 *
 *   idea | building | mvp           -> kept as-is
 *   launched_recently               -> downgraded to "mvp" so the cluster
 *                                       stage gate (which only accepts
 *                                       idea/building/mvp) lets it through
 *   launched | scaled | growth | "" -> dropped
 */
function normaliseCandidateStage(c: Candidate): string | null {
  const raw = (c.stage_estimate || c.stage || "").toString().trim().toLowerCase();
  if (raw === "idea" || raw === "building" || raw === "mvp") return raw;
  if (raw === "launched_recently") return "mvp";
  return null;
}

const CUTOFF_YEAR = new Date().getUTCFullYear() - 3;

const SYSTEM = `You are a venture-scout researcher specializing in EARLIEST-stage startups.
Your job: find startups that match the user-supplied parameters AND meet ALL of these strict criteria. If a candidate fails ANY criterion, you MUST omit it.

HARD EXCLUSION CRITERIA (omit immediately if any apply):
1. Company is older than 3 years (founded before ${CUTOFF_YEAR}).
2. Company has more than 30 employees.
3. Company has annual revenue above 50 million rubles (or ~500K USD equivalent).
4. Company has raised Series A or later (anything beyond seed).
5. Company is a well-known brand in its market — if a typical investor in that vertical would recognize the name, EXCLUDE IT.
6. Company is a subsidiary, spin-off, or product line of a larger established corporation.

EXAMPLES OF COMPANIES YOU MUST NEVER RETURN (illustrative, not exhaustive):
Skyeng, GetCourse, Yandex Praktikum, Netology, Skillbox, Geekbrains, Foxford, Uchi.ru, Stepik, Coursera, Lingualeo, Puzzle English, SkillFactory, Yandex (any product), VK (any product), Mail.ru, Ozon, Wildberries, Avito, Tinkoff, Sber (any product), MTS, Beeline, Kaspersky, 1C, JetBrains, ABBYY, Samokat, Delivery Club, Kinopoisk, ivi, okko, Litres, M.Video, DNS, Citilink, Sportmaster, Lamoda, VkusVill, Pyaterochka, Magnit. If you are about to suggest any of these — STOP.

POSITIVE SIGNALS (look for these):
- Founder is actively posting "build in public" content in the last 6 months
- Company appeared on Product Hunt / Indie Hackers / startup-diplom.ru in the last 12 months
- Founder is asking for first users, first hires, or co-founders
- Recent participation in pre-seed / seed accelerators (ФРИИ, Сколково pre-seed track, Y Combinator latest batch)
- Company has a domain registered in the last 24 months

OUTPUT REQUIREMENTS:
- Each entry MUST include: name, domain (or null if truly no domain), founders (at least one named person), and at least one verifiable link (Telegram, GitHub, Product Hunt, news article from the last 12 months).
- Each entry MUST include "stage_estimate": one of "idea" | "building" | "mvp" | "launched_recently".
- "launched_recently" means launched within the last 12 months. If launched earlier — exclude.
- NEVER invent companies. If you are not confident the company exists and matches all criteria — omit it.
- If you cannot find {count} qualifying startups, return fewer. It is BETTER to return 3 real pre-revenue startups than 20 with established brands mixed in.

For each candidate also return (used downstream by our classifier):
  name (project name)
  domain (bare hostname or null)
  vertical (short label like "fintech", "edtech", "saas")
  stage_estimate (see above)
  description (1-2 sentences focused on what they're building today)
  signal (one short clause describing the recent action: "launched MVP on
    ProductHunt", "raising pre-seed on AngelList", "seeking first users on
    Indie Hackers", "shipped weekly progress thread on X", etc.)
  founders (array of {name, role, handle}; handle may be "@telegram" or null)
  links (web/socials/github)
  evidence_url (the public URL where you found this)

Output ONLY a JSON object: {"candidates":[...]}`;

function buildPrompt(p: DiscoveryParams): string {
  const lines: string[] = [];
  lines.push(`Find ${Math.min(25, Math.max(3, p.count ?? 10))} real early-stage startups.`);
  if (p.verticals?.length) lines.push(`Verticals: ${p.verticals.join(", ")}.`);
  if (p.region) lines.push(`Region / language preference: ${p.region}.`);
  if (p.keywords) lines.push(`Additional keywords: ${p.keywords}.`);
  lines.push(`Use web search to ground every entry in a real public source.`);
  lines.push(`Return ONLY a JSON object: {"candidates":[...]}`);
  return lines.join("\n");
}

async function callWithWebSearch(prompt: string): Promise<string | null> {
  // First try the Responses API with web_search_preview tool (real-time web).
  try {
    const resp: any = await (openai as any).responses.create({
      model: MODEL,
      tools: [{ type: "web_search_preview" }],
      input: [
        { role: "system", content: SYSTEM },
        { role: "user", content: prompt },
      ],
    });
    const text =
      resp?.output_text ??
      resp?.output?.flatMap?.((o: any) =>
        (o?.content || []).map((c: any) => c?.text || ""),
      ).join("\n") ??
      "";
    if (text && text.length > 10) return text;
  } catch {
    // ignore — fall through to chat.completions
  }
  // Fallback: chat.completions (no live web; uses training data).
  try {
    const resp = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 2200,
      response_format: { type: "json_object" },
    });
    return resp.choices[0]?.message?.content || null;
  } catch {
    return null;
  }
}

function parseCandidates(raw: string | null): Candidate[] {
  if (!raw) return [];
  // Web-search responses may wrap the JSON in prose; extract the largest
  // {...} block and parse that.
  let slice = raw.trim();
  const start = slice.indexOf("{");
  const end = slice.lastIndexOf("}");
  if (start >= 0 && end > start) slice = slice.slice(start, end + 1);
  try {
    const parsed = JSON.parse(slice);
    const list = Array.isArray(parsed?.candidates) ? parsed.candidates : [];
    return list.filter((c: any) => c && typeof c.name === "string" && c.name.length > 1);
  } catch {
    return [];
  }
}

function synthesizeText(c: Candidate): string {
  const parts: string[] = [];
  // Lead with the signal so the intent classifier latches onto it.
  if (c.signal) parts.push(c.signal + ".");
  parts.push(`Project: ${c.name}.`);
  if (c.description) parts.push(c.description);
  if (c.vertical) parts.push(`Vertical: ${c.vertical}.`);
  if (c.stage) parts.push(`Stage: ${c.stage}.`);
  if (c.domain) parts.push(`Domain: ${c.domain}.`);
  if (c.founders?.length) {
    const ppl = c.founders
      .filter((f) => f && (f.name || f.handle))
      .slice(0, 4)
      .map((f) =>
        `${f.name || "?"}${f.role ? ` (${f.role})` : ""}${f.handle ? ` ${f.handle}` : ""}`,
      )
      .join(", ");
    if (ppl) parts.push(`Founders: ${ppl}.`);
  }
  if (c.links?.length) parts.push(`Links: ${c.links.slice(0, 5).join(" ")}.`);
  return parts.join(" ");
}

function pickHandle(c: Candidate): string | undefined {
  for (const f of c.founders || []) {
    const h = f?.handle;
    if (h && typeof h === "string" && h.startsWith("@")) return h.replace(/^@/, "");
  }
  return undefined;
}

function pickDomain(c: Candidate): string | undefined {
  if (c.domain) return c.domain.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  for (const link of c.links || []) {
    try {
      return new URL(link).hostname.replace(/^www\./, "");
    } catch {
      // not a URL
    }
  }
  return undefined;
}

function slugFor(c: Candidate): string {
  const base = c.domain || c.name || "candidate";
  return base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
}

export async function runOpenAiDiscovery(
  params: DiscoveryParams = {},
): Promise<{ observations: number; candidates: number; skipped: number; usedWebSearch: boolean }> {
  if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    return { observations: 0, candidates: 0, skipped: 0, usedWebSearch: false };
  }
  const prompt = buildPrompt(params);
  const raw = await callWithWebSearch(prompt);
  const candidates = parseCandidates(raw);
  let observations = 0;
  let skipped = 0;
  let droppedByBlacklist = 0;
  let droppedByStage = 0;
  for (const c of candidates) {
    const text = synthesizeText(c);
    if (!text || text.length < 20) {
      skipped++;
      continue;
    }
    const domain = pickDomain(c) || undefined;
    // Brand blacklist check — drop before we even create a raw_observation.
    const bl = await isBlacklisted({ domain, companyName: c.name });
    if (bl.blocked) {
      droppedByBlacklist++;
      console.log(`[scout/openai-web] dropped by blacklist: ${c.name} (${bl.matchedBy})`);
      continue;
    }
    // Stage gate — drop established / unknown-stage candidates here so they
    // don't even enter the pipeline.
    const stage = normaliseCandidateStage(c);
    if (!stage) {
      droppedByStage++;
      continue;
    }
    // Persist the normalised stage on the candidate so the downstream
    // classifier sees a clean value.
    c.stage = stage;
    c.stage_estimate = stage;
    const result = await recordObservation({
      collector: COLLECTOR,
      sourceId: `openai-web:${slugFor(c)}`,
      sourceUrl: c.evidence_url || c.links?.[0] || undefined,
      text,
      authorHandle: pickHandle(c),
      domainHint: domain,
      retentionDays: 365,
      trustedSource: true,
      extraPayload: {
        kind: "openai_web_discovery",
        candidate: c,
        searchParams: params,
      },
    });
    if (result.ok && result.observation) observations++;
    else skipped++;
  }
  if (droppedByBlacklist || droppedByStage) {
    console.log(
      `[scout/openai-web] dropped ${droppedByBlacklist} by blacklist, ${droppedByStage} by stage gate`,
    );
  }
  return {
    observations,
    candidates: candidates.length,
    skipped,
    droppedByBlacklist,
    droppedByStage,
    usedWebSearch: !!raw,
  } as any;
}
