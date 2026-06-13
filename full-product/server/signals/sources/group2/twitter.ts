import { Group2Tracker } from "./base";
import { getCredential } from "../../credentials";
import type { TeamMember, Startup } from "@shared/schema";

type TwitterTweet = {
  id: string;
  text: string;
  created_at: string;
  public_metrics?: { like_count: number; retweet_count: number; reply_count: number };
};

/**
 * X / Twitter Monitor — recent posts and engagement on a founder's handle.
 * Uses X API v2 with `TWITTER_BEARER_TOKEN`. No-ops when the bearer token
 * is missing.
 */
export class TwitterTracker extends Group2Tracker {
  readonly sourceKey = "group2.twitter";
  readonly displayName = "X / Twitter — founder & team";
  readonly description = "Recent X posts, mentions, and reactions from team handles.";
  readonly requiresCredentials = true;
  readonly credentialKind = "twitter-bearer-token";
  protected handleField = "twitterHandle" as const;

  private async fetchRecentTweets(handle: string, bearer: string): Promise<TwitterTweet[]> {
    const username = handle.replace(/^@/, "");
    try {
      const userRes = await fetch(`https://api.twitter.com/2/users/by/username/${encodeURIComponent(username)}`, {
        headers: { Authorization: `Bearer ${bearer}` },
      });
      if (!userRes.ok) return [];
      const userBody = (await userRes.json()) as { data?: { id?: string } };
      const userId = userBody.data?.id;
      if (!userId) return [];
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const url = `https://api.twitter.com/2/users/${userId}/tweets?max_results=20&start_time=${since}&tweet.fields=created_at,public_metrics`;
      const tweetsRes = await fetch(url, { headers: { Authorization: `Bearer ${bearer}` } });
      if (!tweetsRes.ok) return [];
      const body = (await tweetsRes.json()) as { data?: TwitterTweet[] };
      return Array.isArray(body.data) ? body.data : [];
    } catch {
      return [];
    }
  }

  private async fetchMentions(handle: string, bearer: string): Promise<TwitterTweet[]> {
    const username = handle.replace(/^@/, "");
    try {
      const userRes = await fetch(`https://api.twitter.com/2/users/by/username/${encodeURIComponent(username)}`, {
        headers: { Authorization: `Bearer ${bearer}` },
      });
      if (!userRes.ok) return [];
      const userBody = (await userRes.json()) as { data?: { id?: string } };
      const userId = userBody.data?.id;
      if (!userId) return [];
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const url = `https://api.twitter.com/2/users/${userId}/mentions?max_results=20&start_time=${since}&tweet.fields=created_at,public_metrics`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${bearer}` } });
      if (!res.ok) return [];
      const body = (await res.json()) as { data?: TwitterTweet[] };
      return Array.isArray(body.data) ? body.data : [];
    } catch {
      return [];
    }
  }

  protected async pollMember(startup: Startup, member: TeamMember): Promise<number> {
    if (!member.twitterHandle) return 0;
    const cred = await getCredential(this.credentialKind!, startup.id);
    const bearer = cred?.config?.token as string | undefined;
    if (!bearer) return 0;

    const tweets = await this.fetchRecentTweets(member.twitterHandle, bearer);
    const mentions = await this.fetchMentions(member.twitterHandle, bearer);
    let recorded = 0;
    const handle = member.twitterHandle.replace(/^@/, "");
    for (const m of mentions) {
      const created = await this.recordEvent({
        startupId: startup.id,
        eventType: "social_mention",
        severity: "info",
        title: `${member.fullName} was mentioned on X`,
        summary: m.text.slice(0, 280),
        url: `https://x.com/i/web/status/${m.id}`,
        occurredAt: new Date(m.created_at),
        dedupeKey: `${member.id}:mention:${m.id}`,
        payload: m.public_metrics ?? null,
      });
      if (created) recorded += 1;
    }
    for (const tweet of tweets) {
      const reactions = (tweet.public_metrics?.like_count ?? 0) + (tweet.public_metrics?.retweet_count ?? 0);
      const created = await this.recordEvent({
        startupId: startup.id,
        eventType: "social_post",
        severity: reactions > 50 ? "positive" : "info",
        title: `${member.fullName} posted on X`,
        summary: tweet.text.slice(0, 280),
        url: `https://x.com/${handle}/status/${tweet.id}`,
        occurredAt: new Date(tweet.created_at),
        dedupeKey: `${member.id}:tweet:${tweet.id}`,
        payload: tweet.public_metrics ?? null,
      });
      if (created) recorded += 1;
    }
    return recorded;
  }
}
