import { recordObservation } from "../ingest";

/**
 * Wave-1 active collector: `github-trending`.
 *
 * Uses the GitHub Search API (`/search/repositories`) to find recently
 * created repositories with traction (>= 2 stars) matching the supplied
 * topics. Each repo becomes a raw_observation; the owner login is recorded
 * as `authorGithubLogin` so the identity layer can stitch this human
 * across collectors.
 *
 * Requires `GITHUB_TOKEN` for higher rate-limits; falls back to anonymous
 * (60 req/h) if not set.
 */

const COLLECTOR = "github-trending";

export interface GithubTrendingParams {
  topics?: string[];
  daysBack?: number;
  count?: number;
  minStars?: number;
}

export async function runGithubTrending(
  params: GithubTrendingParams = {},
): Promise<{ observations: number; queried: number; skipped: number }> {
  const token = process.env.GITHUB_TOKEN;
  const daysBack = Math.max(1, Math.min(365, params.daysBack ?? 30));
  const since = new Date(Date.now() - daysBack * 86_400_000).toISOString().slice(0, 10);
  const count = Math.min(50, Math.max(5, params.count ?? 20));
  const minStars = Math.max(0, params.minStars ?? 2);

  // GitHub topics are lower-case, hyphenated. Map our verticals to a few
  // useful default topics if none supplied.
  const topics = (params.topics?.length ? params.topics : ["startup", "saas"])
    .map((t) => t.toLowerCase().replace(/[^a-z0-9-]+/g, "-"))
    .filter((t) => t.length > 1)
    .slice(0, 5);

  const topicQ = topics.map((t) => `topic:${t}`).join(" ");
  const q = `${topicQ} created:>=${since} stars:>=${minStars}`;
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=updated&per_page=${count}`;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15_000);
  let observations = 0;
  let skipped = 0;
  try {
    const r = await fetch(url, {
      headers: {
        accept: "application/vnd.github+json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      signal: ctrl.signal,
    });
    if (!r.ok) return { observations: 0, queried: 0, skipped: 0 };
    const j: any = await r.json();
    const items: any[] = Array.isArray(j?.items) ? j.items : [];
    for (const repo of items) {
      const owner = repo?.owner?.login;
      if (!owner) continue;
      const text =
        `Building on GitHub: ${repo.name}. ${repo.description || ""}. ` +
        `Stars: ${repo.stargazers_count}, forks: ${repo.forks_count}. ` +
        `Language: ${repo.language || "n/a"}. ` +
        `Topics: ${(repo.topics || []).slice(0, 8).join(", ")}. ` +
        `Owner: ${owner}. Repository: ${repo.html_url}.` +
        (repo.homepage ? ` Homepage: ${repo.homepage}.` : "");
      let domainHint: string | undefined;
      if (repo.homepage) {
        try {
          domainHint = new URL(repo.homepage).hostname.replace(/^www\./, "");
        } catch {
          // not a URL
        }
      }
      const result = await recordObservation({
        collector: COLLECTOR,
        sourceId: `gh:${repo.id}`,
        sourceUrl: repo.html_url,
        text,
        authorGithubLogin: owner,
        domainHint,
        retentionDays: 365,
        trustedSource: true,
        extraPayload: {
          kind: "github_repo",
          githubOrg: owner,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          topics: repo.topics,
          createdAt: repo.created_at,
          updatedAt: repo.updated_at,
        },
      });
      if (result.ok && result.observation) observations++;
      else skipped++;
    }
    return { observations, queried: items.length, skipped };
  } catch {
    return { observations: 0, queried: 0, skipped: 0 };
  } finally {
    clearTimeout(t);
  }
}
