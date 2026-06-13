import { Group2Tracker } from "./base";
import { getCredential, getEnvCredential } from "../../credentials";
import { storage } from "../../../storage";
import type { TeamMember, Startup } from "@shared/schema";

/**
 * Optional Whisper transcript-keyword extraction. Runs only when an
 * `OPENAI_API_KEY` is configured. Skipped silently otherwise.
 */
async function whisperKeywords(_videoId: string): Promise<string[]> {
  const key = getEnvCredential("OPENAI_API_KEY");
  if (!key) return [];
  // The Whisper download path is intentionally not implemented here — the
  // YouTube Data API does not expose the audio stream and we will not
  // crawl yt-dlp at run-time. We simply leave the hook in place so that
  // when a transcript-fetching service is wired in, this function returns
  // its keywords. For now: return [] so we never block the main flow.
  return [];
}

type YouTubeSearchItem = {
  id: { videoId?: string };
  snippet: { title: string; description: string; channelTitle: string; channelId: string; publishedAt: string };
};

/**
 * YouTube / Podcast Appearances — searches YouTube for recent videos that
 * mention a founder by name across (a) the team's own configured channel
 * and (b) the global YouTube index (any podcast that mentions the founder).
 *
 * Uses YouTube Data API v3 with `YOUTUBE_API_KEY`. No-ops when the key is
 * missing.
 */
export class YouTubePodcastTracker extends Group2Tracker {
  readonly sourceKey = "group2.youtube";
  readonly displayName = "YouTube / podcast appearances";
  readonly description = "Mentions of founders in recent YouTube video titles & descriptions (podcast appearances).";
  readonly requiresCredentials = true;
  readonly credentialKind = "youtube-api-key";
  protected handleField = "fullName" as const; // every member with a name is searchable

  protected async execute(ctx: import("../../base").IngestorContext): Promise<number> {
    // Override base loop because we want to poll every member by name even
    // when their `youtubeChannelId` is empty.
    if (!(await this.hasCredentials())) {
      const { MissingCredentialError } = await import("../../credentials");
      throw new MissingCredentialError(this.credentialKind!);
    }
    const startups = ctx.startup ? [ctx.startup] : await storage.getStartups();
    const allMembers = await storage.getAllTeamMembers();
    const byStartup = new Map<string, TeamMember[]>();
    for (const m of allMembers) {
      const list = byStartup.get(m.startupId) ?? [];
      list.push(m);
      byStartup.set(m.startupId, list);
    }
    let total = 0;
    for (const startup of startups) {
      for (const member of byStartup.get(startup.id) ?? []) {
        try {
          total += await this.pollMember(startup, member);
        } catch (err) {
          console.warn(`[signals:${this.sourceKey}] member ${member.id} failed:`, err);
        }
      }
    }
    return total;
  }

  private async searchYouTube(q: string, apiKey: string, channelId?: string): Promise<YouTubeSearchItem[]> {
    const params = new URLSearchParams({
      part: "snippet",
      q,
      type: "video",
      maxResults: "10",
      order: "date",
      key: apiKey,
    });
    if (channelId) params.set("channelId", channelId);
    try {
      const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`);
      if (!res.ok) return [];
      const body = (await res.json()) as { items?: YouTubeSearchItem[] };
      return Array.isArray(body.items) ? body.items : [];
    } catch {
      return [];
    }
  }

  protected async pollMember(startup: Startup, member: TeamMember): Promise<number> {
    if (!member.fullName) return 0;
    const cred = await getCredential(this.credentialKind!, startup.id);
    const apiKey = cred?.config?.token as string | undefined;
    if (!apiKey) return 0;

    const items = await this.searchYouTube(`"${member.fullName}"`, apiKey, member.youtubeChannelId ?? undefined);
    let recorded = 0;
    for (const item of items) {
      if (!item.id.videoId) continue;
      const keywords = await whisperKeywords(item.id.videoId);
      const created = await this.recordEvent({
        startupId: startup.id,
        eventType: "podcast_appearance",
        severity: "positive",
        title: `${member.fullName} on ${item.snippet.channelTitle}: ${item.snippet.title}`,
        summary: item.snippet.description.slice(0, 280),
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        occurredAt: new Date(item.snippet.publishedAt),
        dedupeKey: `${member.id}:yt:${item.id.videoId}`,
        payload: {
          provider: "youtube",
          channelId: item.snippet.channelId,
          channelTitle: item.snippet.channelTitle,
          keywords,
        },
      });
      if (created) recorded += 1;
    }
    return recorded;
  }
}
