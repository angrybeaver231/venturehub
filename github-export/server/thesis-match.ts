import type { Investor, Startup, ThesisMatch } from "@shared/schema";

/**
 * Deterministic, offline thesis matcher.
 *
 * The original platform used an LLM to score investor↔startup fit. To keep this
 * standalone version runnable with zero API keys, we score fit with simple,
 * explainable heuristics: vertical overlap, stage focus, geography, and
 * keyword overlap between the investor thesis and the startup profile.
 *
 * Swap this out for a real LLM call if you connect an API key.
 */
export function matchStartupsToInvestor(
  investor: Investor,
  startups: Startup[],
): ThesisMatch[] {
  return startups
    .map((startup) => score(investor, startup))
    .sort((a, b) => b.score - a.score);
}

function score(investor: Investor, startup: Startup): ThesisMatch {
  const reasons: string[] = [];
  let points = 0;

  // Vertical overlap (up to 40)
  const verticalHit = investor.verticals.some((v) =>
    softEqual(v, startup.vertical),
  );
  if (verticalHit) {
    points += 40;
    reasons.push(`invests in ${startup.vertical}`);
  }

  // Stage focus (up to 30)
  if (investor.stageFocus.includes(startup.stage)) {
    points += 30;
    reasons.push(`targets ${prettyStage(startup.stage)} stage`);
  } else if (investor.stageFocus.length > 0) {
    reasons.push(
      `stage mismatch (focus: ${investor.stageFocus
        .map(prettyStage)
        .join(", ")})`,
    );
  }

  // Thesis keyword overlap with startup text (up to 20)
  const overlap = keywordOverlap(
    investor.thesis,
    `${startup.name} ${startup.description} ${startup.techStack} ${startup.vertical}`,
  );
  const kwPoints = Math.min(20, overlap * 5);
  if (kwPoints > 0) {
    points += kwPoints;
    reasons.push("thesis keywords align");
  }

  // Geography bonus (up to 10)
  if (startup.hqCity && softEqual(startup.hqCity, investor.hqCity)) {
    points += 10;
    reasons.push(`both based in ${investor.hqCity}`);
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(points)));
  const rationale =
    reasons.length > 0
      ? capitalize(reasons.join("; "))
      : "Limited overlap with this thesis";

  return { startup, score: finalScore, rationale };
}

function softEqual(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

const STOPWORDS = new Set([
  "the", "and", "for", "with", "that", "this", "are", "our", "who", "you",
  "we", "in", "of", "to", "a", "at", "on", "across", "love", "building",
  "build", "back", "invest", "founders", "teams", "early", "stage",
]);

function keywordOverlap(thesis: string, profile: string): number {
  const thesisWords = new Set(tokens(thesis));
  const profileWords = new Set(tokens(profile));
  let count = 0;
  for (const w of thesisWords) {
    if (profileWords.has(w)) count++;
  }
  return count;
}

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function prettyStage(stage: string): string {
  return stage.replace(/_/g, " ");
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
