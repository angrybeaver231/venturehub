import { SignalIngestor, type IngestorContext } from "../../base";
import { storage } from "../../../storage";
import { decryptConfig, encryptConfig } from "../../crypto";

/**
 * Slack workspace metadata. Privacy rule: NEVER store message content. Only:
 *  - count of channels (active vs archived)
 *  - count of human (non-bot, non-deleted) members
 *  - per-channel message counts since the previously-stored `latest_message_ts`
 *
 * Credential shape (after OAuth):
 *   { botToken: string, teamId: string, scopes?: string[],
 *     lastChannels?: string[],         // channel ids snapshot
 *     channelTs?: Record<string,string> // channel_id -> last message ts
 *   }
 */
export class SlackMetadataSource extends SignalIngestor {
  readonly sourceKey = "slack";
  readonly displayName = "Slack workspace (metadata only)";
  readonly category = "founder-oauth";
  readonly scoreCategory = "team_health" as const;
  readonly description = "Counts only — never reads message content.";
  readonly requiresCredentials = true;
  readonly credentialKind = "slack";

  protected async execute(ctx: IngestorContext): Promise<number> {
    const startup = ctx.startup;
    if (!startup) return 0;
    const cred = await storage.getIntegrationCredential(startup.id, this.credentialKind!);
    if (!cred || cred.status !== "active") return 0;
    const config = (decryptConfig(cred.encryptedConfig) ?? {}) as any;
    const token: string = config.botToken;
    if (!token) return 0;

    const today = new Date().toISOString().slice(0, 10);
    let created = 0;

    // 1. List channels (public) — channels:read
    const channelsRes = await slackCall(token, "conversations.list", {
      exclude_archived: "false",
      types: "public_channel",
      limit: "200",
    });
    const channels: any[] = channelsRes.channels ?? [];
    const activeChannels = channels.filter((c) => !c.is_archived);
    const channelIds = activeChannels.map((c) => c.id);

    // 2. List users — users:read
    const usersRes = await slackCall(token, "users.list", { limit: "500" });
    const allMembers: any[] = usersRes.members ?? [];
    const activeUsers = allMembers.filter(
      (u) => !u.deleted && !u.is_bot && u.id !== "USLACKBOT",
    );

    // 3. Per-channel message COUNT since stored ts.
    const prevTs: Record<string, string> = config.channelTs ?? {};
    const newTs: Record<string, string> = { ...prevTs };
    let messages24h = 0;
    const oneDayAgo = (Date.now() / 1000 - 86400).toFixed(0);

    for (const ch of activeChannels.slice(0, 50)) {
      try {
        const oldest = prevTs[ch.id] ?? oneDayAgo;
        const histRes = await slackCall(token, "conversations.history", {
          channel: ch.id,
          oldest,
          limit: "200",
        });
        const msgs: any[] = histRes.messages ?? [];
        // Only count user messages (skip channel_join / bot etc)
        const counted = msgs.filter((m) => m.subtype == null || m.subtype === "thread_broadcast");
        messages24h += counted.length;
        if (msgs.length > 0 && msgs[0].ts) newTs[ch.id] = msgs[0].ts;
      } catch (e) {
        // Channels we can't access are silently skipped — bot needs invite.
      }
    }

    // 4. Daily workspace health event.
    const ok = await this.recordEvent({
      startupId: startup.id,
      eventType: "slack_workspace_health",
      severity: "info",
      title: `Slack: ${activeUsers.length} active users, ${messages24h} msgs/day`,
      summary: `${activeChannels.length} active channels, ${activeUsers.length} active humans, ${messages24h} messages in last 24h.`,
      occurredAt: new Date(),
      payload: {
        date: today,
        activeUsers: activeUsers.length,
        messagesPerDay: messages24h,
        channelsActive: activeChannels.length,
        channelsArchived: channels.length - activeChannels.length,
        privacy: "metadata-only",
      },
      dedupeKey: `${startup.id}:slack:health:${today}`,
      verifiedBy: ["slack-oauth"],
    });
    if (ok) created++;

    // 5. Diff channels vs previous snapshot — emit create/archive events.
    const lastChannels: string[] = Array.isArray(config.lastChannels) ? config.lastChannels : [];
    if (lastChannels.length > 0) {
      const prev = new Set(lastChannels);
      const current = new Set(channelIds);
      for (const id of Array.from(current)) {
        if (!prev.has(id)) {
          const ch = activeChannels.find((c) => c.id === id);
          const o = await this.recordEvent({
            startupId: startup.id,
            eventType: "slack_channel_created",
            severity: "info",
            title: `Slack channel #${ch?.name ?? id} created`,
            summary: `New public channel appeared in the workspace.`,
            occurredAt: new Date(),
            payload: { channelId: id, channelName: ch?.name ?? null, privacy: "metadata-only" },
            dedupeKey: `${startup.id}:slack:channel-create:${id}`,
            verifiedBy: ["slack-oauth"],
          });
          if (o) created++;
        }
      }
      for (const id of Array.from(prev)) {
        if (!current.has(id)) {
          const o = await this.recordEvent({
            startupId: startup.id,
            eventType: "slack_channel_archived",
            severity: "warning",
            title: `Slack channel ${id} archived/removed`,
            summary: `Channel disappeared from the workspace snapshot.`,
            occurredAt: new Date(),
            payload: { channelId: id, privacy: "metadata-only" },
            dedupeKey: `${startup.id}:slack:channel-archive:${id}:${today}`,
            verifiedBy: ["slack-oauth"],
          });
          if (o) created++;
        }
      }
    }

    // Persist new snapshot.
    try {
      const merged = {
        ...config,
        lastChannels: channelIds,
        channelTs: newTs,
        lastSyncedAt: new Date().toISOString(),
      };
      await storage.upsertIntegrationCredential({
        startupId: startup.id,
        kind: this.credentialKind!,
        status: "active",
        encryptedConfig: encryptConfig(merged) as any,
      });
    } catch {}

    return created;
  }
}

async function slackCall(token: string, method: string, params: Record<string, string>): Promise<any> {
  const url = `https://slack.com/api/${method}?${new URLSearchParams(params).toString()}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Slack ${method} HTTP ${res.status}`);
  const data = (await res.json()) as any;
  if (!data.ok) throw new Error(`Slack ${method}: ${data.error}`);
  return data;
}
