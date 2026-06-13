import { Group2Tracker } from "./base";
import { storage } from "../../../storage";
import type { TeamMember, Startup } from "@shared/schema";

type HabrPost = { id: string; title: string; href: string; hubs: string[] };
type HabrVacancy = { id: string; title: string; href: string };

function extractCareerUsername(url: string): string | null {
  const m = url.match(/career\.habr\.com\/([A-Za-z0-9_.\-]+)/);
  if (!m) return null;
  return m[1].split(/[/?#]/)[0] || null;
}

async function safeFetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; SignalsBot/1.0)" } });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/**
 * Habr Career Tracker — extends the existing career-page scrape with:
 *   - Habr articles authored by team-member usernames
 *     (https://habr.com/ru/users/<username>/posts/)
 *   - Skill graph derived from article hubs/tags
 *
 * Public scrape only — no API key needed.
 */
export class HabrCareerTracker extends Group2Tracker {
  readonly sourceKey = "group2.habr-career";
  readonly displayName = "Habr Career — founder & team";
  readonly description =
    "Career profile + Habr articles + skill graph derived from article hubs/tags.";
  readonly requiresCredentials = false;
  protected handleField = "habrCareerUrl" as const;

  protected async hasCredentials(): Promise<boolean> {
    return true;
  }

  private async fetchProfile(url: string): Promise<{ posts: Array<{ id: string; title: string; href: string }>; vacancies: HabrVacancy[] }> {
    const html = await safeFetchText(url);
    if (!html) return { posts: [], vacancies: [] };
    const posts: Array<{ id: string; title: string; href: string }> = [];
    const vacancies: HabrVacancy[] = [];
    const postRe = /href="(\/companies\/[^"]+\/articles\/(\d+)[^"]*)"[^>]*>([^<]+)</g;
    let pm: RegExpExecArray | null;
    while ((pm = postRe.exec(html)) !== null) {
      posts.push({ id: pm[2], href: `https://career.habr.com${pm[1]}`, title: pm[3].trim() });
    }
    const vacRe = /href="(\/vacancies\/(\d+)[^"]*)"[^>]*>([^<]+)</g;
    let vm: RegExpExecArray | null;
    while ((vm = vacRe.exec(html)) !== null) {
      vacancies.push({ id: vm[2], href: `https://career.habr.com${vm[1]}`, title: vm[3].trim() });
    }
    return { posts: posts.slice(0, 10), vacancies: vacancies.slice(0, 10) };
  }

  private async fetchHabrArticles(username: string): Promise<HabrPost[]> {
    const html = await safeFetchText(`https://habr.com/ru/users/${encodeURIComponent(username)}/posts/`);
    if (!html) return [];
    const out: HabrPost[] = [];
    const cardRe = /<article[^>]+class="[^"]*tm-articles-list__item[^"]*"[^>]*>([\s\S]*?)<\/article>/g;
    const cards = html.match(cardRe) ?? [];
    for (const card of cards.slice(0, 15)) {
      const titleM = card.match(/<a[^>]+href="(\/ru\/articles\/(\d+)[^"]*)"[^>]*>\s*<span[^>]*>([^<]+)<\/span>/);
      if (!titleM) continue;
      const id = titleM[2];
      const href = `https://habr.com${titleM[1]}`;
      const title = titleM[3].trim();
      const hubs: string[] = [];
      const hubRe = /<a[^>]+class="[^"]*tm-publication-hub__link[^"]*"[^>]*>\s*<span[^>]*>([^<]+)<\/span>/g;
      let hm: RegExpExecArray | null;
      while ((hm = hubRe.exec(card)) !== null) hubs.push(hm[1].trim());
      out.push({ id, title, href, hubs });
    }
    return out;
  }

  protected async pollMember(startup: Startup, member: TeamMember): Promise<number> {
    if (!member.habrCareerUrl) return 0;
    let recorded = 0;
    const { posts, vacancies } = await this.fetchProfile(member.habrCareerUrl);
    for (const post of posts) {
      if (await this.recordEvent({
        startupId: startup.id,
        eventType: "social_post",
        severity: "positive",
        title: `${member.fullName}: ${post.title}`,
        url: post.href,
        dedupeKey: `${member.id}:habr-post:${post.id}`,
      })) recorded += 1;
    }
    for (const vac of vacancies) {
      if (await this.recordEvent({
        startupId: startup.id,
        eventType: "team_hiring",
        severity: "positive",
        title: `Hiring: ${vac.title}`,
        summary: `Posted by ${member.fullName}`,
        url: vac.href,
        dedupeKey: `${member.id}:habr-vac:${vac.id}`,
      })) recorded += 1;
    }

    // Habr articles + skill graph
    const username = extractCareerUsername(member.habrCareerUrl);
    if (!username) return recorded;
    const articles = await this.fetchHabrArticles(username);
    const knownSkillsKey = `${member.id}:habr-skills:set`;
    const prevEvents = await storage.getSignalEventsForStartup(startup.id, 200).catch(() => [] as any[]);
    const skillSnap = prevEvents.find((e: any) => e.sourceKey === this.sourceKey && e.eventType === "habr_skill_snapshot");
    const knownSkills = new Set<string>((skillSnap?.payload?.skills as string[] | undefined) ?? []);

    for (const a of articles) {
      if (await this.recordEvent({
        startupId: startup.id,
        eventType: "habr_post_published",
        severity: "positive",
        title: `${member.fullName} on Habr: ${a.title}`,
        url: a.href,
        payload: { username, articleId: a.id, hubs: a.hubs },
        dedupeKey: `${member.id}:habr-article:${a.id}`,
      })) recorded += 1;
    }

    const allSkills = new Set<string>(knownSkills);
    for (const a of articles) for (const h of a.hubs) allSkills.add(h);
    const newSkills = Array.from(allSkills).filter((s) => !knownSkills.has(s));
    for (const skill of newSkills) {
      if (await this.recordEvent({
        startupId: startup.id,
        eventType: "habr_skill_added",
        severity: "info",
        title: `${member.fullName} added skill via Habr: ${skill}`,
        payload: { username, skill },
        dedupeKey: `${member.id}:habr-skill:${skill}`,
      })) recorded += 1;
    }

    if (allSkills.size > 0) {
      const day = new Date().toISOString().slice(0, 10);
      await this.recordEvent({
        startupId: startup.id,
        eventType: "habr_skill_snapshot",
        severity: "info",
        title: `Skill graph: ${allSkills.size} hubs`,
        payload: { username, skills: Array.from(allSkills) },
        dedupeKey: `${knownSkillsKey}:${day}`,
      });
    }

    return recorded;
  }
}
