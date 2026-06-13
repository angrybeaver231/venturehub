import { Group2Tracker } from "./base";
import { getCredential } from "../../credentials";
import { storage } from "../../../storage";
import type { TeamMember, Startup } from "@shared/schema";

type ProxycurlExperience = {
  company?: string | null;
  title?: string | null;
  starts_at?: { year?: number; month?: number; day?: number } | null;
  ends_at?: { year?: number; month?: number; day?: number } | null;
};

type ProxycurlActivity = {
  activity_status?: string;
  link?: string;
  title?: string;
};

type ProxycurlPersonProfile = {
  occupation?: string | null;
  headline?: string | null;
  experiences?: ProxycurlExperience[];
  activities?: ProxycurlActivity[];
  connections?: number;
};

type LinkedInProfile = {
  currentRole: string | null;
  posts: Array<{ id: string; url: string; text: string; postedAt: string }>;
  newConnectionsCount: number | null;
};

/**
 * LinkedIn Tracker — posts, position changes, and new connections.
 *
 * Specifically watches for the founder's `currentRole` no longer mentioning
 * the startup name and emits a CRITICAL `founder_left` event. This is one of
 * the strongest negative leading signals in the playbook.
 *
 * Provider: Proxycurl (https://nubela.co/proxycurl) — the most common
 * compliant LinkedIn data provider. Set `LINKEDIN_API_TOKEN` (or store
 * per-startup) to a Proxycurl bearer key. Without a token the source is a
 * graceful no-op (`status=no_credentials`).
 */
export class LinkedInTracker extends Group2Tracker {
  readonly sourceKey = "group2.linkedin";
  readonly displayName = "LinkedIn — founder & team";
  readonly description = "Posts, role changes, and new industry connections from team members' LinkedIn profiles.";
  readonly requiresCredentials = true;
  readonly credentialKind = "linkedin-api-token";
  protected handleField = "linkedinUrl" as const;

  private async fetchProfile(url: string, token: string): Promise<LinkedInProfile | null> {
    try {
      const apiUrl = `https://nubela.co/proxycurl/api/v2/linkedin?url=${encodeURIComponent(url)}`;
      const res = await fetch(apiUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const body = (await res.json()) as ProxycurlPersonProfile;
      const currentExp = (body.experiences ?? []).find((e) => !e.ends_at) ?? body.experiences?.[0];
      const currentRole =
        body.occupation ??
        body.headline ??
        (currentExp ? [currentExp.title, currentExp.company].filter(Boolean).join(" @ ") : null) ??
        null;
      const posts = (body.activities ?? [])
        .filter((a) => !!a.link && !!a.title)
        .slice(0, 10)
        .map((a) => ({
          id: a.link ?? "",
          url: a.link ?? "",
          text: a.title ?? "",
          postedAt: new Date().toISOString(),
        }));
      return {
        currentRole,
        posts,
        newConnectionsCount: typeof body.connections === "number" ? body.connections : null,
      };
    } catch {
      return null;
    }
  }

  protected async pollMember(startup: Startup, member: TeamMember): Promise<number> {
    if (!member.linkedinUrl) return 0;
    const cred = await getCredential(this.credentialKind!, startup.id);
    const token = cred?.config?.token as string | undefined;
    if (!token) return 0;

    const profile = await this.fetchProfile(member.linkedinUrl, token);
    if (!profile) return 0;

    let recorded = 0;
    const startupNameNeedle = startup.name.toLowerCase();

    if (profile.currentRole && member.lastKnownPosition && profile.currentRole !== member.lastKnownPosition) {
      const stillMentionsStartup = profile.currentRole.toLowerCase().includes(startupNameNeedle);
      const eventType = member.isFounder && !stillMentionsStartup ? "founder_left" : "position_change";
      const severity = eventType === "founder_left" ? "critical" : "info";
      const created = await this.recordEvent({
        startupId: startup.id,
        eventType,
        severity,
        title: `${member.fullName}: ${profile.currentRole}`,
        summary: `Was: ${member.lastKnownPosition}. Now: ${profile.currentRole}.`,
        url: member.linkedinUrl,
        dedupeKey: `${member.id}:role:${profile.currentRole}`,
        payload: { previous: member.lastKnownPosition, current: profile.currentRole, isFounder: member.isFounder },
      });
      if (created) recorded += 1;
      await storage.updateTeamMember(member.id, { lastKnownPosition: profile.currentRole });
    } else if (profile.currentRole && !member.lastKnownPosition) {
      await storage.updateTeamMember(member.id, { lastKnownPosition: profile.currentRole });
    }

    for (const post of profile.posts) {
      const created = await this.recordEvent({
        startupId: startup.id,
        eventType: "social_post",
        severity: "positive",
        title: `${member.fullName} posted on LinkedIn`,
        summary: post.text.slice(0, 280),
        url: post.url,
        occurredAt: new Date(post.postedAt),
        dedupeKey: `${member.id}:post:${post.id}`,
      });
      if (created) recorded += 1;
    }

    if (typeof profile.newConnectionsCount === "number") {
      const previous = member.lastConnectionCount;
      const current = profile.newConnectionsCount;
      const delta = previous == null ? 0 : current - previous;
      if (delta > 0) {
        const stamp = new Date().toISOString().slice(0, 10);
        const created = await this.recordEvent({
          startupId: startup.id,
          eventType: "new_connections",
          severity: "info",
          title: `${member.fullName}: +${delta} new connections`,
          summary: `Connections grew from ${previous} to ${current}.`,
          dedupeKey: `${member.id}:connections:${stamp}:${current}`,
          payload: { previous, current, delta },
        });
        if (created) recorded += 1;
      }
      if (previous !== current) {
        await storage.updateTeamMember(member.id, { lastConnectionCount: current });
      }
    }

    return recorded;
  }
}
