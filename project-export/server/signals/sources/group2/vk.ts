import { Group2Tracker } from "./base";
import { getCredential, MissingCredentialError } from "../../credentials";
import { storage } from "../../../storage";
import type { TeamMember, Startup } from "@shared/schema";

const VK_API = "https://api.vk.com/method";
const VK_VERSION = "5.199";

type VkStoryResp = { count?: number; items?: any[] };
type VkClipResp = { count?: number; items?: any[] };
type VkAdminItem = { id: number; first_name?: string; last_name?: string; role?: string };

function extractScreenName(url: string): string | null {
  const m = url.match(/vk\.com\/([A-Za-z0-9_.\-]+)/);
  if (!m) return null;
  return m[1].split(/[/?#]/)[0] || null;
}

async function vkGet<T>(method: string, params: Record<string, string>, token: string): Promise<T | null> {
  const qs = new URLSearchParams({ ...params, v: VK_VERSION, access_token: token });
  try {
    const res = await fetch(`${VK_API}/${method}?${qs.toString()}`);
    if (!res.ok) return null;
    const body = (await res.json()) as { response?: T; error?: { error_msg?: string } };
    if (body.error) {
      console.warn(`[vk] ${method} returned error: ${body.error.error_msg}`);
      return null;
    }
    return body.response ?? null;
  } catch {
    return null;
  }
}

async function resolveScreen(screenName: string, token: string): Promise<{ ownerId: number; type: "user" | "group" } | null> {
  const r = await vkGet<{ object_id: number; type: string }>("utils.resolveScreenName", { screen_name: screenName }, token);
  if (!r || !r.object_id) return null;
  if (r.type === "user") return { ownerId: r.object_id, type: "user" };
  if (r.type === "group" || r.type === "page" || r.type === "event") return { ownerId: -r.object_id, type: "group" };
  return null;
}

/**
 * VK Public Tracker — extends the public-wall scrape with API-backed metrics:
 *   - story metrics (stories.get)
 *   - clip metrics (video.get with filter=clips)
 *   - community-admin diff (groups.getMembers?filter=managers) → emit
 *     `vk_admin_change` (severity=warning when admin removed)
 *
 * Requires `VK_SERVICE_TOKEN` in env or an `integration_credentials` row of
 * kind `vk-service-token`. Without credentials we fall back to public-only
 * post scraping.
 */
export class VkTracker extends Group2Tracker {
  readonly sourceKey = "group2.vk";
  readonly displayName = "VK — founder & team";
  readonly description =
    "Public posts, story / clip metrics, and community-admin diff for VK personal pages and groups.";
  readonly requiresCredentials = false;
  readonly credentialKind = "vk-service-token";
  protected handleField = "vkUrl" as const;

  protected async hasCredentials(): Promise<boolean> {
    return true; // public-only fallback always available
  }

  private async fetchPublicWall(url: string): Promise<Array<{ id: string }>> {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; SignalsBot/1.0)" } });
      if (!res.ok) return [];
      const html = await res.text();
      const ids = new Set<string>();
      const re = /data-post-id="([0-9_-]+)"/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(html)) !== null) ids.add(m[1]);
      return Array.from(ids).slice(0, 10).map((id) => ({ id }));
    } catch {
      return [];
    }
  }

  protected async pollMember(startup: Startup, member: TeamMember): Promise<number> {
    if (!member.vkUrl) return 0;
    let recorded = 0;

    // Public wall scrape (no creds needed)
    const posts = await this.fetchPublicWall(member.vkUrl);
    for (const post of posts) {
      const ok = await this.recordEvent({
        startupId: startup.id,
        eventType: "social_post",
        severity: "info",
        title: `${member.fullName} posted on VK`,
        url: `${member.vkUrl}?w=wall${post.id}`,
        dedupeKey: `${member.id}:vk:${post.id}`,
      });
      if (ok) recorded += 1;
    }

    // API-backed enrichment if we have a service token.
    const cred = await getCredential(this.credentialKind!, startup.id);
    const token = cred?.config?.token as string | undefined;
    if (!token) return recorded;

    const screen = extractScreenName(member.vkUrl);
    if (!screen) return recorded;
    const resolved = await resolveScreen(screen, token);
    if (!resolved) return recorded;

    const day = new Date().toISOString().slice(0, 10);
    const { ownerId, type } = resolved;

    // Stories
    const stories = await vkGet<VkStoryResp>("stories.get", { owner_id: String(ownerId) }, token);
    if (stories && typeof stories.count === "number") {
      const ok = await this.recordEvent({
        startupId: startup.id,
        eventType: "vk_story_metrics",
        severity: "info",
        title: `${member.fullName} VK stories: ${stories.count}`,
        payload: { ownerId, count: stories.count },
        dedupeKey: `${member.id}:vk:stories:${day}`,
      });
      if (ok) recorded += 1;
    }

    // Clips
    const clips = await vkGet<VkClipResp>("video.get", { owner_id: String(ownerId), filters: "clips", count: "10" }, token);
    if (clips && typeof clips.count === "number") {
      const ok = await this.recordEvent({
        startupId: startup.id,
        eventType: "vk_clips_metrics",
        severity: "info",
        title: `${member.fullName} VK clips: ${clips.count}`,
        payload: { ownerId, count: clips.count, latest: (clips.items ?? [])[0] ?? null },
        dedupeKey: `${member.id}:vk:clips:${day}`,
      });
      if (ok) recorded += 1;
    }

    // Group-only: admin diff
    if (type === "group") {
      const adminsResp = await vkGet<{ items?: VkAdminItem[] }>("groups.getMembers", {
        group_id: String(-ownerId),
        filter: "managers",
        fields: "first_name,last_name",
      }, token);
      const admins = adminsResp?.items ?? [];
      const adminIds = admins.map((a) => a.id).sort((x, y) => x - y);
      const adminKey = `${member.id}:vk:admins:snapshot`;
      const prev = await storage.getSignalEventsForStartup(startup.id, 200).catch(() => [] as any[]);
      const prevSnap = prev.find((e: any) => e.sourceKey === this.sourceKey && e.eventType === "vk_admins_snapshot");
      const prevIds: number[] = (prevSnap?.payload?.adminIds as number[] | undefined) ?? [];

      // Snapshot
      const snapOk = await this.recordEvent({
        startupId: startup.id,
        eventType: "vk_admins_snapshot",
        severity: "info",
        title: `VK admins snapshot (${adminIds.length})`,
        payload: { ownerId, adminIds, admins },
        dedupeKey: `${adminKey}:${day}`,
      });
      if (snapOk) recorded += 1;

      // Diff
      if (prevIds.length > 0) {
        const removed = prevIds.filter((id) => !adminIds.includes(id));
        const added = adminIds.filter((id) => !prevIds.includes(id));
        for (const id of removed) {
          if (await this.recordEvent({
            startupId: startup.id,
            eventType: "vk_admin_change",
            severity: "warning",
            title: `VK admin removed (id=${id})`,
            payload: { ownerId, adminId: id, change: "removed" },
            dedupeKey: `${member.id}:vk:admin-removed:${id}:${day}`,
          })) recorded += 1;
        }
        for (const id of added) {
          if (await this.recordEvent({
            startupId: startup.id,
            eventType: "vk_admin_change",
            severity: "info",
            title: `VK admin added (id=${id})`,
            payload: { ownerId, adminId: id, change: "added" },
            dedupeKey: `${member.id}:vk:admin-added:${id}:${day}`,
          })) recorded += 1;
        }
      }
    }

    if (cred && !token) {
      throw new MissingCredentialError(this.credentialKind!);
    }
    return recorded;
  }
}
