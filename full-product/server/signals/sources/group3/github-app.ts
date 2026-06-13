import { SignalIngestor, type IngestorContext } from "../../base";
import { storage } from "../../../storage";
import { decryptConfig } from "../../crypto";

/**
 * GitHub source for private-repo signals (commits, PRs, releases).
 *
 * Credential shape (either form is accepted):
 *   { accessToken: string, login?: string }                 // OAuth App user-to-server
 *   { installationId: string, installationToken: string }   // Legacy GitHub App
 *
 * Activity is read from the user's own repos (all repos visible to the token,
 * filtered by `pushed_at` in the last 24h). Commit bursts, releases and merged
 * PRs are emitted as separate events.
 */
export class GitHubAppSource extends SignalIngestor {
  readonly sourceKey = "github-app";
  readonly displayName = "GitHub (private repos)";
  readonly category = "founder-oauth";
  readonly scoreCategory = "tech_activity" as const;
  readonly description = "Private commits, PRs and releases via GitHub OAuth.";
  readonly requiresCredentials = true;
  readonly credentialKind = "github-app";

  protected async execute(ctx: IngestorContext): Promise<number> {
    const startup = ctx.startup;
    if (!startup) return 0;
    const cred = await storage.getIntegrationCredential(startup.id, this.credentialKind!);
    if (!cred || cred.status !== "active") return 0;

    const config: any = decryptConfig(cred.encryptedConfig) ?? {};
    const token: string | undefined = config.accessToken || config.installationToken;
    if (!token) return 0;

    const headers = {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "Ventorix-Signals/1.0",
    };

    let totalCreated = 0;

    // Step 1: list recently-pushed repos (last 24h activity).
    const reposRes = await fetch("https://api.github.com/user/repos?per_page=50&sort=pushed&direction=desc", {
      headers,
    });
    if (!reposRes.ok) {
      // Token might be expired or revoked — surface as no_credentials path.
      if (reposRes.status === 401) {
        await storage.upsertIntegrationCredential({
          startupId: startup.id,
          kind: this.credentialKind!,
          status: "expired",
          encryptedConfig: cred.encryptedConfig as any,
        });
      }
      throw new Error(`GitHub /user/repos failed: ${reposRes.status}`);
    }
    const repos: any[] = await reposRes.json();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const activeRepos = repos.filter(
      (r) => r.pushed_at && new Date(r.pushed_at) > since && !r.archived,
    );

    for (const repo of activeRepos.slice(0, 10)) {
      const fullName = repo.full_name as string;

      // Commits
      try {
        const commitsRes = await fetch(
          `https://api.github.com/repos/${fullName}/commits?since=${since.toISOString()}&per_page=30`,
          { headers },
        );
        if (commitsRes.ok) {
          const commits: any[] = await commitsRes.json();
          if (commits.length > 0) {
            const created = await this.recordEvent({
              startupId: startup.id,
              eventType: commits.length >= 10 ? "commit_burst" : "commit_activity",
              severity: commits.length >= 10 ? "positive" : "info",
              title: `${commits.length} commits in ${repo.name}`,
              summary: `${commits.length} commits pushed to ${fullName} in the last 24h.`,
              url: `https://github.com/${fullName}/commits`,
              occurredAt: new Date(commits[0].commit.author.date),
              payload: {
                repo: fullName,
                commitCount: commits.length,
                latestSha: commits[0].sha,
                authors: Array.from(
                  new Set(commits.map((c) => c.commit?.author?.email ?? "unknown")),
                ).slice(0, 10),
              },
              dedupeKey: `${startup.id}:gh-commits:${fullName}:${since.toISOString().slice(0, 10)}`,
              verifiedBy: ["github-oauth"],
            });
            if (created) totalCreated++;
          }
        }
      } catch (e) {
        console.warn(`[github-app] commits ${fullName}:`, e);
      }

      // Releases
      try {
        const relRes = await fetch(
          `https://api.github.com/repos/${fullName}/releases?per_page=5`,
          { headers },
        );
        if (relRes.ok) {
          const releases: any[] = await relRes.json();
          for (const rel of releases.filter((r) => new Date(r.published_at) > since)) {
            const created = await this.recordEvent({
              startupId: startup.id,
              eventType: "release_published",
              severity: "positive",
              title: `${rel.name || rel.tag_name} released in ${repo.name}`,
              summary: rel.body?.slice(0, 200) ?? `Release ${rel.tag_name}`,
              url: rel.html_url,
              occurredAt: new Date(rel.published_at),
              payload: { repo: fullName, tag: rel.tag_name, prerelease: !!rel.prerelease },
              dedupeKey: `${startup.id}:gh-release:${fullName}:${rel.id}`,
              verifiedBy: ["github-oauth"],
            });
            if (created) totalCreated++;
          }
        }
      } catch (e) {
        console.warn(`[github-app] releases ${fullName}:`, e);
      }

      // Merged PRs
      try {
        const prRes = await fetch(
          `https://api.github.com/repos/${fullName}/pulls?state=closed&per_page=20&sort=updated&direction=desc`,
          { headers },
        );
        if (prRes.ok) {
          const prs: any[] = await prRes.json();
          const recentMerged = prs.filter(
            (p) => p.merged_at && new Date(p.merged_at) > since,
          );
          for (const pr of recentMerged.slice(0, 10)) {
            const created = await this.recordEvent({
              startupId: startup.id,
              eventType: "pr_merged",
              severity: "info",
              title: `PR #${pr.number} merged: ${pr.title}`,
              summary: pr.body?.slice(0, 200) ?? "",
              url: pr.html_url,
              occurredAt: new Date(pr.merged_at),
              payload: { repo: fullName, prNumber: pr.number, author: pr.user?.login },
              dedupeKey: `${startup.id}:gh-pr:${fullName}:${pr.number}`,
              verifiedBy: ["github-oauth"],
            });
            if (created) totalCreated++;
          }
        }
      } catch (e) {
        console.warn(`[github-app] pulls ${fullName}:`, e);
      }
    }

    return totalCreated;
  }
}
