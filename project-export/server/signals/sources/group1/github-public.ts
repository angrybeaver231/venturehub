import { SignalIngestor, type IngestorContext } from "../../base";
import { getTargetStartups, parseRepo, safeFetch, fetchJson } from "./_helpers";

type GhCommit = {
  sha: string;
  html_url: string;
  commit?: {
    message?: string;
    committer?: { date?: string };
    author?: { date?: string; name?: string };
  };
  author?: { login?: string } | null;
};

type GhRelease = {
  id: number;
  name?: string | null;
  tag_name?: string;
  body?: string | null;
  html_url?: string;
  published_at?: string | null;
};

type GhPull = { id: number; html_url: string; title: string; number: number; user?: { login?: string } | null };
type GhContributor = { login?: string; contributions?: number };

type GlCommit = { id: string; web_url: string; message?: string; committed_date?: string; author_name?: string };
type GlRelease = { tag_name: string; name?: string; description?: string | null; released_at?: string; _links?: { self?: string } };
type GlMr = { id: number; web_url: string; title: string; iid: number; author?: { username?: string } };

const WINDOWS_DAYS = [7, 30, 90] as const;

function parseGitlabRepo(url: string | null | undefined): { host: string; projectPath: string } | null {
  if (!url) return null;
  const m = url.match(/^(https?:\/\/)?([\w.-]*gitlab[\w.-]*)\/([^?#]+?)(?:\.git)?(?:[?#].*)?$/i);
  if (!m) return null;
  const host = m[2].replace(/^www\./, "");
  const projectPath = m[3].replace(/\/+$/, "");
  if (!projectPath.includes("/")) return null;
  return { host, projectPath };
}

export class GithubPublicSource extends SignalIngestor {
  readonly sourceKey = "github-public";
  readonly displayName = "GitHub / GitLab public activity";
  readonly category = "publicWeb";
  readonly description = "Commits, releases, PRs/MRs and contributors from public GitHub or GitLab repos linked to a startup.";

  protected async execute(ctx: IngestorContext): Promise<number> {
    const startups = await getTargetStartups(ctx.startup);
    let created = 0;

    for (const startup of startups) {
      const url = startup.githubRepoUrl;
      const gh = parseRepo(url);
      const gl = !gh ? parseGitlabRepo(url) : null;
      if (gh) {
        created += await this.runGithub(startup.id, gh.owner, gh.repo);
      } else if (gl) {
        created += await this.runGitlab(startup.id, gl.host, gl.projectPath);
      }
    }
    return created;
  }

  private async runGithub(startupId: string, owner: string, repo: string): Promise<number> {
    const token = process.env.GITHUB_TOKEN;
    const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    let created = 0;
    const day = new Date().toISOString().slice(0, 10);

    // Commits — last 90d window
    const since90 = new Date(Date.now() - 90 * 86_400_000).toISOString();
    const commitsRes = await safeFetch(
      `https://api.github.com/repos/${owner}/${repo}/commits?since=${since90}&per_page=100`,
      { headers },
    );
    const commits = (await fetchJson<GhCommit[]>(commitsRes)) ?? [];

    for (const c of commits.slice(0, 10)) {
      const sha = c.sha;
      const message = (c.commit?.message ?? "").split("\n")[0].slice(0, 140);
      const date = c.commit?.committer?.date ?? c.commit?.author?.date;
      if (await this.recordEvent({
        startupId,
        eventType: "github.commit",
        severity: "positive",
        title: `Commit: ${message}`,
        url: c.html_url,
        occurredAt: date ? new Date(date) : undefined,
        payload: { sha, author: c.author?.login ?? c.commit?.author?.name },
        dedupeKey: `${startupId}:${owner}/${repo}:commit:${sha}`,
      })) created++;
    }

    const rollups: Record<string, number> = {};
    for (const win of WINDOWS_DAYS) {
      const cutoff = Date.now() - win * 86_400_000;
      rollups[`d${win}`] = commits.filter((c) => {
        const d = c.commit?.committer?.date ?? c.commit?.author?.date;
        return d ? Date.parse(d) >= cutoff : false;
      }).length;
    }
    if (await this.recordEvent({
      startupId,
      eventType: "github.activity",
      severity: rollups.d7 > 0 ? "positive" : rollups.d30 > 0 ? "info" : "warning",
      title: `Commits — 7d:${rollups.d7} • 30d:${rollups.d30} • 90d:${rollups.d90}`,
      url: `https://github.com/${owner}/${repo}/commits`,
      payload: { repo: `${owner}/${repo}`, ...rollups },
      dedupeKey: `${startupId}:${owner}/${repo}:activity:${day}`,
    })) created++;

    const releaseRes = await safeFetch(
      `https://api.github.com/repos/${owner}/${repo}/releases/latest`,
      { headers },
    );
    const release = await fetchJson<GhRelease>(releaseRes);
    if (release?.id) {
      if (await this.recordEvent({
        startupId,
        eventType: "github.release",
        severity: "positive",
        title: `Release: ${release.name || release.tag_name}`,
        summary: (release.body ?? "").slice(0, 280) || undefined,
        url: release.html_url,
        occurredAt: release.published_at ? new Date(release.published_at) : undefined,
        payload: { tag: release.tag_name },
        dedupeKey: `${startupId}:${owner}/${repo}:release:${release.id}`,
      })) created++;
    }

    const prRes = await safeFetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls?state=open&per_page=20`,
      { headers },
    );
    const prs = (await fetchJson<GhPull[]>(prRes)) ?? [];
    if (prRes?.ok) {
      if (await this.recordEvent({
        startupId,
        eventType: "github.prs",
        severity: prs.length > 0 ? "positive" : "info",
        title: `${prs.length} open pull requests`,
        url: `https://github.com/${owner}/${repo}/pulls`,
        payload: { count: prs.length, repo: `${owner}/${repo}` },
        dedupeKey: `${startupId}:${owner}/${repo}:prs:${day}`,
      })) created++;
    }
    for (const pr of prs.slice(0, 5)) {
      if (await this.recordEvent({
        startupId,
        eventType: "github.pr",
        severity: "info",
        title: `PR #${pr.number}: ${pr.title}`,
        url: pr.html_url,
        payload: { author: pr.user?.login },
        dedupeKey: `${startupId}:${owner}/${repo}:pr:${pr.id}`,
      })) created++;
    }

    const contribRes = await safeFetch(
      `https://api.github.com/repos/${owner}/${repo}/contributors?per_page=30`,
      { headers },
    );
    const contributors = (await fetchJson<GhContributor[]>(contribRes)) ?? [];
    if (contributors.length > 0) {
      if (await this.recordEvent({
        startupId,
        eventType: "github.contributors",
        severity: "info",
        title: `${contributors.length} contributors (top 30)`,
        url: `https://github.com/${owner}/${repo}/graphs/contributors`,
        payload: {
          count: contributors.length,
          top: contributors.slice(0, 5).map((c) => ({ login: c.login, contributions: c.contributions })),
        },
        dedupeKey: `${startupId}:${owner}/${repo}:contributors:${day}`,
      })) created++;
    }
    return created;
  }

  private async runGitlab(startupId: string, host: string, projectPath: string): Promise<number> {
    const token = process.env.GITLAB_TOKEN;
    const headers: Record<string, string> = { Accept: "application/json" };
    if (token) headers["PRIVATE-TOKEN"] = token;
    const projectId = encodeURIComponent(projectPath);
    const apiBase = `https://${host}/api/v4/projects/${projectId}`;
    const webBase = `https://${host}/${projectPath}`;
    let created = 0;
    const day = new Date().toISOString().slice(0, 10);

    // Commits last 90d
    const since90 = new Date(Date.now() - 90 * 86_400_000).toISOString();
    const commitsRes = await safeFetch(
      `${apiBase}/repository/commits?since=${since90}&per_page=100`,
      { headers },
    );
    const commits = (await fetchJson<GlCommit[]>(commitsRes)) ?? [];

    for (const c of commits.slice(0, 10)) {
      if (await this.recordEvent({
        startupId,
        eventType: "gitlab.commit",
        severity: "positive",
        title: `Commit: ${(c.message ?? "").split("\n")[0].slice(0, 140)}`,
        url: c.web_url,
        occurredAt: c.committed_date ? new Date(c.committed_date) : undefined,
        payload: { sha: c.id, author: c.author_name },
        dedupeKey: `${startupId}:${projectPath}:gl:commit:${c.id}`,
      })) created++;
    }

    const rollups: Record<string, number> = {};
    for (const win of WINDOWS_DAYS) {
      const cutoff = Date.now() - win * 86_400_000;
      rollups[`d${win}`] = commits.filter(
        (c) => c.committed_date && Date.parse(c.committed_date) >= cutoff,
      ).length;
    }
    if (await this.recordEvent({
      startupId,
      eventType: "gitlab.activity",
      severity: rollups.d7 > 0 ? "positive" : rollups.d30 > 0 ? "info" : "warning",
      title: `Commits — 7d:${rollups.d7} • 30d:${rollups.d30} • 90d:${rollups.d90}`,
      url: `${webBase}/-/commits`,
      payload: { repo: projectPath, ...rollups },
      dedupeKey: `${startupId}:${projectPath}:gl:activity:${day}`,
    })) created++;

    // Latest release
    const relRes = await safeFetch(`${apiBase}/releases?per_page=1`, { headers });
    const releases = (await fetchJson<GlRelease[]>(relRes)) ?? [];
    const release = releases[0];
    if (release) {
      if (await this.recordEvent({
        startupId,
        eventType: "gitlab.release",
        severity: "positive",
        title: `Release: ${release.name || release.tag_name}`,
        summary: (release.description ?? "").slice(0, 280) || undefined,
        url: `${webBase}/-/releases/${encodeURIComponent(release.tag_name)}`,
        occurredAt: release.released_at ? new Date(release.released_at) : undefined,
        payload: { tag: release.tag_name },
        dedupeKey: `${startupId}:${projectPath}:gl:release:${release.tag_name}`,
      })) created++;
    }

    // Open MRs
    const mrRes = await safeFetch(
      `${apiBase}/merge_requests?state=opened&per_page=20`,
      { headers },
    );
    const mrs = (await fetchJson<GlMr[]>(mrRes)) ?? [];
    if (mrRes?.ok) {
      if (await this.recordEvent({
        startupId,
        eventType: "gitlab.mrs",
        severity: mrs.length > 0 ? "positive" : "info",
        title: `${mrs.length} open merge requests`,
        url: `${webBase}/-/merge_requests`,
        payload: { count: mrs.length, repo: projectPath },
        dedupeKey: `${startupId}:${projectPath}:gl:mrs:${day}`,
      })) created++;
    }
    for (const mr of mrs.slice(0, 5)) {
      if (await this.recordEvent({
        startupId,
        eventType: "gitlab.mr",
        severity: "info",
        title: `MR !${mr.iid}: ${mr.title}`,
        url: mr.web_url,
        payload: { author: mr.author?.username },
        dedupeKey: `${startupId}:${projectPath}:gl:mr:${mr.id}`,
      })) created++;
    }

    // Contributors
    const cRes = await safeFetch(`${apiBase}/repository/contributors?per_page=30`, { headers });
    const cs = (await fetchJson<Array<{ name?: string; commits?: number; email?: string }>>(cRes)) ?? [];
    if (cs.length > 0) {
      if (await this.recordEvent({
        startupId,
        eventType: "gitlab.contributors",
        severity: "info",
        title: `${cs.length} contributors (top 30)`,
        url: `${webBase}/-/graphs/master`,
        payload: {
          count: cs.length,
          top: cs.slice(0, 5).map((c) => ({ name: c.name, contributions: c.commits })),
        },
        dedupeKey: `${startupId}:${projectPath}:gl:contributors:${day}`,
      })) created++;
    }
    return created;
  }
}
