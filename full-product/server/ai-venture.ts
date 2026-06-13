import OpenAI from "openai";
import type { Startup, StartupMetric, StartupReadiness, Evaluation } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const MODEL = "gpt-4o-mini";

export async function chat(
  system: string,
  user: string,
  opts?: { json?: boolean; temperature?: number; timeoutMs?: number; maxTokens?: number },
) {
  // Bounded request — never let a stalled OpenAI call hang the caller.
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts?.timeoutMs ?? 25_000);
  try {
    const resp = await openai.chat.completions.create(
      {
        model: MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: opts?.temperature ?? 0.4,
        max_tokens: opts?.maxTokens ?? 1400,
        ...(opts?.json ? { response_format: { type: "json_object" as const } } : {}),
      },
      { signal: ctrl.signal },
    );
    return resp.choices[0]?.message?.content || "";
  } finally {
    clearTimeout(t);
  }
}

export interface DiffSummaryInput {
  startupName: string;
  days: number;
  countsBySeverity: Record<string, number>;
  topEvents: Array<{
    severity: string | null;
    eventType: string | null;
    title: string | null;
    summary: string | null;
    occurredAt: string | null;
  }>;
  newMilestones: Array<{ kind: string | null; title: string | null; occurredAt: string | null }>;
  language?: "en" | "ru";
}

// Compact, investor-grade exec summary of a startup's last-N-days activity.
// Returns plain text (no markdown), 2-4 sentences max, written for a busy VC.
export async function summarizeDiff(input: DiffSummaryInput): Promise<string> {
  const lang = input.language === "ru" ? "Russian" : "English";
  const sysParts = [
    `You are an investment analyst writing a concise ${lang} executive summary of recent activity at a portfolio startup.`,
    `Output 2-4 plain-text sentences (no markdown, no bullet points, no preamble).`,
    `Lead with the most material change. Mention severity and direction (positive vs negative).`,
    `Be specific: cite event types (e.g. "MRR jumped", "team member left", "domain expiring") rather than generic platitudes.`,
    `Never invent facts that are not in the data. If activity is uneventful, say so.`,
  ].join(" ");
  const payload = {
    startup: input.startupName,
    windowDays: input.days,
    counts: input.countsBySeverity,
    topEvents: input.topEvents.slice(0, 10),
    newMilestones: input.newMilestones.slice(0, 5),
  };
  // Diff summary is small, time-sensitive (called inside an HTTP request),
  // and bounded: tighter timeout + smaller token budget than the default.
  const out = await chat(
    sysParts,
    `Summarise the changes for this startup over the last ${input.days} days.\n\nDATA:\n${JSON.stringify(payload, null, 2)}`,
    { temperature: 0.3, timeoutMs: 8_000, maxTokens: 220 },
  );
  return out.trim();
}

export interface InvestmentMemoInput {
  startup: Startup;
  metrics: StartupMetric[];
  readiness?: StartupReadiness | null;
  evaluations?: Evaluation[];
  language?: "en" | "ru";
}

export interface InvestmentMemo {
  oneLiner: string;
  thesis: string;
  strengths: string[];
  redFlags: string[];
  market: string;
  traction: string;
  team: string;
  suggestedNextSteps: string[];
  recommendation: "strongInterest" | "interested" | "watchlist" | "pass";
  confidence: number;
}

export async function generateInvestmentMemo(input: InvestmentMemoInput): Promise<InvestmentMemo> {
  const lang = input.language === "ru" ? "Russian" : "English";
  const s = input.startup;

  const metricsText = input.metrics.length
    ? input.metrics.slice(0, 12).map(m => `- ${m.month}: users=${m.users ?? "-"}, MRR=${m.mrr ?? "-"}, revenue=${m.revenue ?? "-"}, pilots=${m.pilots ?? "-"}`).join("\n")
    : "No metrics submitted yet.";

  const evalText = input.evaluations?.length
    ? `Reviewer averages across ${input.evaluations.length} evaluations: team=${avg(input.evaluations.map(e => e.teamScore))}, product=${avg(input.evaluations.map(e => e.productScore))}, market=${avg(input.evaluations.map(e => e.marketScore))}, traction=${avg(input.evaluations.map(e => e.tractionScore))}, fit=${avg(input.evaluations.map(e => e.strategicFitScore))}, risk=${avg(input.evaluations.map(e => e.riskScore))}`
    : "No reviewer evaluations yet.";

  const readinessText = input.readiness
    ? `Live B2B pilots: ${input.readiness.hasLiveB2BPilots}; Bank/Fintech: ${input.readiness.hasBankFintechExperience}; Regulated: ${input.readiness.isRegulated}; Security reviewed: ${input.readiness.isSecurityReviewed}; completeness=${input.readiness.completenessScore}%`
    : "No readiness profile.";

  const system = `You are a senior venture-capital analyst writing internal investment memos. Be concise, specific, and skeptical. Write in ${lang}. Output only valid JSON matching the requested schema. Never invent metrics that were not provided. Where data is missing, say so explicitly in the field.`;

  const user = `Produce a structured investment memo for the following startup. Return JSON with keys: oneLiner (string, <=140 chars), thesis (string, 2-3 sentences), strengths (array of 3-5 concise bullets), redFlags (array of 3-5 concise bullets), market (string, 2 sentences with TAM/competitive note), traction (string, 1-2 sentences citing the metrics provided), team (string, 1-2 sentences), suggestedNextSteps (array of 3-5 actionable items for the deal team), recommendation (one of: strongInterest, interested, watchlist, pass), confidence (number 0-1).

STARTUP
Name: ${s.name}
Vertical: ${s.vertical || "n/a"}
Stage: ${s.stage || "n/a"}
HQ: ${s.hqCity || "n/a"}
Team size: ${s.teamSize ?? "n/a"}
Tech stack: ${s.techStack || "n/a"}
Website: ${s.website || "n/a"}
Description: ${s.description || "n/a"}

METRICS (most recent first)
${metricsText}

READINESS
${readinessText}

EVALUATIONS
${evalText}`;

  const raw = await chat(system, user, { json: true, temperature: 0.3 });
  try {
    const parsed = JSON.parse(raw);
    return {
      oneLiner: String(parsed.oneLiner || "").slice(0, 200),
      thesis: String(parsed.thesis || ""),
      strengths: arr(parsed.strengths),
      redFlags: arr(parsed.redFlags),
      market: String(parsed.market || ""),
      traction: String(parsed.traction || ""),
      team: String(parsed.team || ""),
      suggestedNextSteps: arr(parsed.suggestedNextSteps),
      recommendation: ["strongInterest", "interested", "watchlist", "pass"].includes(parsed.recommendation) ? parsed.recommendation : "watchlist",
      confidence: typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : 0.5,
    };
  } catch {
    throw new Error("Failed to parse investment memo response");
  }
}

export interface ThesisMatchInput {
  thesis: string;
  startups: Array<Pick<Startup, "id" | "name" | "vertical" | "stage" | "description" | "hqCity" | "teamSize" | "techStack">>;
  language?: "en" | "ru";
  topK?: number;
}

export interface ThesisMatch {
  startupId: string;
  score: number;
  fit: string;
}

export async function matchStartupsToThesis(input: ThesisMatchInput): Promise<ThesisMatch[]> {
  const lang = input.language === "ru" ? "Russian" : "English";
  const top = Math.max(1, Math.min(20, input.topK ?? 8));

  if (input.startups.length === 0) return [];

  const list = input.startups.slice(0, 80).map((s, i) =>
    `[${i + 1}] id=${s.id} | name=${s.name} | vertical=${s.vertical || "-"} | stage=${s.stage || "-"} | HQ=${s.hqCity || "-"} | team=${s.teamSize ?? "-"} | stack=${s.techStack || "-"}\n  description: ${(s.description || "").slice(0, 350)}`
  ).join("\n\n");

  const system = `You are a senior VC analyst. Score the fit of each startup to the investor thesis on a 0-100 scale. Be honest and discriminating: most should not score above 60. Write rationales in ${lang}. Output only JSON: { "matches": [{ "startupId": "<id>", "score": <0-100>, "fit": "<1-2 sentence rationale>" }] } sorted descending by score, returning at most ${top} entries.`;

  const user = `INVESTOR THESIS:\n${input.thesis}\n\nCANDIDATES:\n${list}`;

  const raw = await chat(system, user, { json: true, temperature: 0.2 });
  try {
    const parsed = JSON.parse(raw);
    const matches = Array.isArray(parsed.matches) ? parsed.matches : [];
    const validIds = new Set(input.startups.map(s => s.id));
    return matches
      .filter((m: any) => m && validIds.has(m.startupId))
      .map((m: any) => ({
        startupId: String(m.startupId),
        score: Math.max(0, Math.min(100, Number(m.score) || 0)),
        fit: String(m.fit || ""),
      }))
      .sort((a: ThesisMatch, b: ThesisMatch) => b.score - a.score)
      .slice(0, top);
  } catch {
    throw new Error("Failed to parse thesis match response");
  }
}

export interface DraftBriefInput {
  oneLiner: string;
  companyName?: string;
  industry?: string;
  language?: "en" | "ru";
}

export interface DraftedBrief {
  title: string;
  description: string;
  vertical: string;
  targetStage: string;
  technologies: string;
  geography: string;
  timeline: string;
  budgetFormat: string;
  evaluationCriteria: string[];
}

export async function draftBriefFromThesis(input: DraftBriefInput): Promise<DraftedBrief> {
  const lang = input.language === "ru" ? "Russian" : "English";

  const system = `You are an experienced corporate innovation lead. Draft a startup-scouting brief from a one-line problem statement. Write in ${lang}. Be concrete, avoid fluff. Output only JSON.`;

  const user = `Company: ${input.companyName || "n/a"}
Industry: ${input.industry || "n/a"}
Problem / thesis (one line): ${input.oneLiner}

Return JSON with fields:
- title (string, <=80 chars)
- description (string, 3-5 sentences explaining the problem and what success looks like)
- vertical (string, e.g. "Fintech", "AI/ML")
- targetStage (one of: idea, mvp, seed, seriesA, seriesB, growth, scaleUp)
- technologies (comma-separated string)
- geography (string)
- timeline (string, e.g. "12 weeks pilot")
- budgetFormat (string, e.g. "Paid pilot $25-100k")
- evaluationCriteria (array of 4-6 short criteria)`;

  const raw = await chat(system, user, { json: true, temperature: 0.5 });
  try {
    const parsed = JSON.parse(raw);
    return {
      title: String(parsed.title || "").slice(0, 200),
      description: String(parsed.description || ""),
      vertical: String(parsed.vertical || ""),
      targetStage: String(parsed.targetStage || "seed"),
      technologies: String(parsed.technologies || ""),
      geography: String(parsed.geography || ""),
      timeline: String(parsed.timeline || ""),
      budgetFormat: String(parsed.budgetFormat || ""),
      evaluationCriteria: arr(parsed.evaluationCriteria),
    };
  } catch {
    throw new Error("Failed to parse drafted brief response");
  }
}

// ===== Milestone extraction (Task #26 — Group 7) =====
// Cluster a batch of recent signal_events for one startup into named, dated
// milestones. Idempotency is handled at storage layer via sourceEventIds overlap.
export interface MilestoneCandidate {
  kind: string;
  title: string;
  description: string;
  occurredAt: string; // ISO
  confidence: number;
  sourceEventIds: string[];
}

export const VENTURE_MODEL = MODEL;

export async function extractMilestonesFromEvents(
  events: Array<{ id: string; sourceKey: string; eventType: string; severity: string; title: string | null; summary: string | null; url: string | null; occurredAt: Date | string }>,
  language: "en" | "ru" = "en",
): Promise<MilestoneCandidate[]> {
  if (events.length === 0) return [];
  const lang = language === "ru" ? "Russian" : "English";
  const allowed = ["fundraise", "product_release", "team_hire", "mrr_milestone", "user_milestone", "partnership", "media_coverage", "regulatory", "other"];
  const lines = events.slice(0, 80).map((e) => {
    const dt = e.occurredAt instanceof Date ? e.occurredAt.toISOString() : new Date(e.occurredAt).toISOString();
    return `id=${e.id} | ${dt} | ${e.sourceKey}/${e.eventType} (${e.severity}) | ${(e.title ?? "").slice(0, 140)} :: ${(e.summary ?? "").slice(0, 220)}`;
  }).join("\n");

  const system = `You extract significant company milestones from a stream of raw signal events about a single startup. Cluster events that describe the same underlying milestone (e.g. a fundraise mentioned in 3 sources is ONE milestone). Be conservative: only emit a milestone when there is clear evidence in the events. Write titles and descriptions in ${lang}. Output only valid JSON.`;

  const user = `Allowed kinds: ${allowed.join(", ")}.

Return JSON: { "milestones": [ { "kind": "<one of allowed>", "title": "<<=120 chars>", "description": "<2-3 sentences>", "occurredAt": "<ISO date of the event>", "confidence": <0-100>, "sourceEventIds": ["<event id>", ...] } ] }

Rules:
- Only include milestones supported by ≥1 event id from the list below.
- Use the event date for occurredAt (the earliest if multiple).
- Higher confidence (>=70) when ≥2 distinct sources confirm the same milestone.
- Skip noise (low-severity activity, routine commits, follower count updates).
- Limit to at most 20 milestones.

EVENTS:
${lines}`;

  const raw = await chat(system, user, { json: true, temperature: 0.2 });
  let parsed: any;
  try { parsed = JSON.parse(raw); } catch { return []; }
  const items = Array.isArray(parsed.milestones) ? parsed.milestones : [];
  const validIds = new Set(events.map((e) => e.id));
  const out: MilestoneCandidate[] = [];
  for (const m of items) {
    if (!m || typeof m !== "object") continue;
    const kind = allowed.includes(m.kind) ? m.kind : "other";
    const title = String(m.title || "").trim().slice(0, 200);
    if (!title) continue;
    const sourceEventIds = Array.isArray(m.sourceEventIds)
      ? m.sourceEventIds.map(String).filter((id: string) => validIds.has(id))
      : [];
    if (sourceEventIds.length === 0) continue;
    let occurredAt: string;
    const d = new Date(m.occurredAt);
    if (Number.isNaN(d.getTime())) {
      const ev = events.find((e) => e.id === sourceEventIds[0]);
      occurredAt = (ev?.occurredAt instanceof Date ? ev.occurredAt : new Date(ev?.occurredAt || Date.now())).toISOString();
    } else {
      occurredAt = d.toISOString();
    }
    out.push({
      kind,
      title,
      description: String(m.description || "").slice(0, 1000),
      occurredAt,
      confidence: Math.max(0, Math.min(100, Math.round(Number(m.confidence) || 50))),
      sourceEventIds,
    });
  }
  return out.slice(0, 20);
}

// ===== Group 8.2 — Natural-language inconsistency explanation =====
// Wraps a detector hit (founder-reported metric vs. passive signal) with a
// short, reviewer-facing English/Russian sentence. Falls back to the
// hit.reason when the LLM is unavailable.
export async function inconsistencyReason(
  hit: { reason: string; details: Record<string, any> },
  language: "en" | "ru" = "en",
): Promise<string> {
  if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) return hit.reason;
  const lang = language === "ru" ? "Russian" : "English";
  const system = `You are a portfolio analyst. Write ONE concise ${lang} sentence (<=180 chars) explaining why a founder-reported metric is inconsistent with passive signals. No preamble, no markdown.`;
  const user = `Reason code: ${hit.reason}\nEvidence: ${JSON.stringify(hit.details).slice(0, 600)}`;
  try {
    const raw = await chat(system, user, { temperature: 0.2, maxTokens: 160, timeoutMs: 12_000 });
    const cleaned = String(raw || "").trim().replace(/^["']|["']$/g, "").slice(0, 220);
    return cleaned || hit.reason;
  } catch {
    return hit.reason;
  }
}

// ===== Group 8.3 — Natural-language → alert-rule DSL =====
// Translates a user prompt ("alert me when a fintech raises >$1M") into the
// JSON DSL consumed by the alert dispatcher. Returns `null` when the model
// produced an unparseable response so the caller can show an error.
export interface NlAlertRuleResult {
  dsl: { all?: any[]; any?: any[] };
  explanation: string;
}

export async function nlAlertRuleToDsl(
  prompt: string,
  language: "en" | "ru" = "en",
): Promise<NlAlertRuleResult | null> {
  if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) return null;
  const lang = language === "ru" ? "Russian" : "English";
  const system = `You convert a plain-${lang} alert rule description into the platform's JSON condition DSL.

Schema:
{
  "all"?: Cond[],         // ALL must match
  "any"?: Cond[]          // ANY must match
}
Cond = { "field": string, "op": "eq"|"neq"|"gt"|"gte"|"lt"|"lte"|"contains"|"in", "value": any }

Allowed fields:
- event.type            (e.g. "round_raised", "site_down", "founder_departed")
- event.severity        ("info" | "positive" | "warning" | "critical")
- event.payload.<key>   (e.g. event.payload.amountUsd, event.payload.currency)
- startup.vertical      ("fintech", "saas", "healthtech", ...)
- startup.stage         ("idea", "mvp", "seed", "seriesA", ...)
- startup.name

Output JSON only, shape:
{ "dsl": { ... }, "explanation": "<one ${lang} sentence (<=140 chars) describing what the rule will fire on>" }

Rules:
- Always emit at least one Cond inside "all" or "any".
- Numeric thresholds (e.g. "> $1M") use "gt"/"gte" with raw numbers and the matching payload field. Assume amountUsd for USD when no field is given.
- Vertical/stage values must be lower_snake_case identifiers.
- If the request is ambiguous, choose the most plausible interpretation and explain it.`;

  const user = prompt.slice(0, 1500);
  let raw = "";
  try {
    raw = await chat(system, user, { json: true, temperature: 0.1, maxTokens: 400 });
  } catch {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    const dsl = parsed?.dsl;
    if (!dsl || typeof dsl !== "object") return null;
    const hasAll = Array.isArray(dsl.all) && dsl.all.length > 0;
    const hasAny = Array.isArray(dsl.any) && dsl.any.length > 0;
    if (!hasAll && !hasAny) return null;
    return {
      dsl: {
        ...(hasAll ? { all: dsl.all } : {}),
        ...(hasAny ? { any: dsl.any } : {}),
      },
      explanation: String(parsed.explanation || "").slice(0, 240),
    };
  } catch {
    return null;
  }
}

function avg(nums: Array<number | null | undefined>): string {
  const valid = nums.filter((n): n is number => typeof n === "number");
  if (valid.length === 0) return "n/a";
  return (valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(1);
}

function arr(v: any): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter(x => typeof x === "string" && x.trim().length > 0).slice(0, 8);
}
