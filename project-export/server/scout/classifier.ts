import OpenAI from "openai";

/**
 * LLM intent classifier + entity extractor for the Pre-Revenue Discovery Engine.
 * Uses gpt-4o-mini (cheapest frontier model). Each call is bounded by an
 * AbortController so a stalled OpenAI request never blocks the cron.
 */
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const MODEL = "gpt-4o-mini";

export type Intent =
  | "looking_for_cofounder"
  | "launching_mvp"
  | "seeking_users"
  | "fundraising_pre_seed"
  | "sharing_progress_metric"
  | "asking_for_feedback"
  | "announcing_pivot"
  | "looking_for_advisor"
  | "recruiting_first_hires"
  | "irrelevant";

export interface IntentResult {
  intent: Intent;
  confidence: number;
  projectName: string | null;
  vertical: string | null;
  stageEstimate: "idea" | "building" | "mvp" | "launched" | "unknown";
  evidenceQuote: string;
}

const INTENT_SYSTEM = `You are a venture-scouting classifier. Read a short message
(may be Russian or English) and decide what the AUTHOR is trying to do.

Return ONLY a JSON object with these keys:
  intent: one of "looking_for_cofounder" | "launching_mvp" | "seeking_users" |
          "fundraising_pre_seed" | "sharing_progress_metric" | "asking_for_feedback" |
          "announcing_pivot" | "looking_for_advisor" | "recruiting_first_hires" | "irrelevant"
  confidence: 0.0..1.0
  project_name: string | null
  vertical: string | null   (e.g. "fintech", "healthtech", "edtech", "saas", "ai")
  stage_estimate: "idea" | "building" | "mvp" | "launched" | "unknown"
  evidence_quote: short snippet from the message (or "")

Rules:
  - "irrelevant" means the message is not about a startup/project the author is
    building. Default to "irrelevant" if you are unsure.
  - confidence < 0.5 means low confidence — caller will discard.
  - Never invent a project name; if not present, use null.`;

export async function classifyIntent(redactedText: string): Promise<IntentResult | null> {
  if (!redactedText || redactedText.trim().length < 8) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const resp = await openai.chat.completions.create(
      {
        model: MODEL,
        messages: [
          { role: "system", content: INTENT_SYSTEM },
          { role: "user", content: redactedText.slice(0, 2000) },
        ],
        temperature: 0.1,
        max_tokens: 200,
        response_format: { type: "json_object" },
      },
      { signal: ctrl.signal },
    );
    const raw = resp.choices[0]?.message?.content || "";
    const parsed = JSON.parse(raw);
    const intent = (parsed.intent || "irrelevant") as Intent;
    return {
      intent,
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0)),
      projectName: parsed.project_name || null,
      vertical: parsed.vertical || null,
      stageEstimate: (parsed.stage_estimate || "unknown") as IntentResult["stageEstimate"],
      evidenceQuote: String(parsed.evidence_quote || "").slice(0, 280),
    };
  } catch (err) {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export interface ExtractedEntities {
  person: {
    handle: string | null;
    displayName: string | null;
    tgUserId: string | null;
    githubLogin: string | null;
    twitterHandle: string | null;
  };
  project: {
    name: string | null;
    domain: string | null;
    githubOrg: string | null;
    vertical: string | null;
    claims: string[];
  };
  linksExtracted: string[];
}

const ENTITY_SYSTEM = `Extract structured entities from a short startup-related
message. Return ONLY this JSON shape:

{
  "person": { "handle": null, "display_name": null, "tg_user_id": null,
              "github_login": null, "twitter_handle": null },
  "project": { "name": null, "domain": null, "github_org": null,
               "vertical": null, "claims": [] },
  "links_extracted": []
}

Rules:
  - Use null for any field not clearly stated.
  - "domain" must be the bare hostname (no http://, no path).
  - "github_org" is the GitHub org/user name only (e.g. "acme-team").
  - "claims" is up to 3 short factual statements ("MVP launched", "200 paying users").
  - Do NOT invent values. Be conservative.`;

export async function extractEntities(
  redactedText: string,
  hints?: { sourceUrl?: string; authorHandle?: string },
): Promise<ExtractedEntities | null> {
  if (!redactedText) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20_000);
  const hintsBlock = hints
    ? `\n[author handle hint: ${hints.authorHandle || "n/a"}]\n[source url: ${hints.sourceUrl || "n/a"}]\n`
    : "";
  try {
    const resp = await openai.chat.completions.create(
      {
        model: MODEL,
        messages: [
          { role: "system", content: ENTITY_SYSTEM },
          { role: "user", content: hintsBlock + redactedText.slice(0, 2000) },
        ],
        temperature: 0.1,
        max_tokens: 400,
        response_format: { type: "json_object" },
      },
      { signal: ctrl.signal },
    );
    const raw = resp.choices[0]?.message?.content || "";
    const j = JSON.parse(raw);
    return {
      person: {
        handle: j?.person?.handle || null,
        displayName: j?.person?.display_name || null,
        tgUserId: j?.person?.tg_user_id ? String(j.person.tg_user_id) : null,
        githubLogin: j?.person?.github_login || null,
        twitterHandle: j?.person?.twitter_handle || null,
      },
      project: {
        name: j?.project?.name || null,
        domain: cleanDomain(j?.project?.domain),
        githubOrg: j?.project?.github_org || null,
        vertical: j?.project?.vertical || null,
        claims: Array.isArray(j?.project?.claims) ? j.project.claims.slice(0, 5).map(String) : [],
      },
      linksExtracted: Array.isArray(j?.links_extracted)
        ? j.links_extracted.slice(0, 10).map(String)
        : [],
    };
  } catch (err) {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export function cleanDomain(value: unknown): string | null {
  if (!value || typeof value !== "string") return null;
  let v = value.trim().toLowerCase();
  v = v.replace(/^https?:\/\//, "").replace(/^www\./, "");
  v = v.split("/")[0];
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(v)) return null;
  return v;
}

/** LLM judge: are these two cluster blurbs the same project? */
export async function judgeSameCluster(
  a: { name?: string | null; domain?: string | null; description?: string | null },
  b: { name?: string | null; domain?: string | null; description?: string | null },
): Promise<{ verdict: "yes" | "no" | "maybe"; reason: string } | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12_000);
  try {
    const resp = await openai.chat.completions.create(
      {
        model: MODEL,
        messages: [
          {
            role: "system",
            content:
              "Two startup blurbs are given. Decide if they describe the SAME project. " +
              'Reply with JSON {"verdict":"yes"|"no"|"maybe","reason":"..."}',
          },
          { role: "user", content: `A: ${JSON.stringify(a)}\nB: ${JSON.stringify(b)}` },
        ],
        temperature: 0.0,
        max_tokens: 120,
        response_format: { type: "json_object" },
      },
      { signal: ctrl.signal },
    );
    const j = JSON.parse(resp.choices[0]?.message?.content || "{}");
    const verdict = j.verdict === "yes" || j.verdict === "no" ? j.verdict : "maybe";
    return { verdict, reason: String(j.reason || "").slice(0, 200) };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}
