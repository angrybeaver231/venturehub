import { storage } from "../storage";
import { db } from "../db";
import { signalEvents } from "@shared/schema";
import type { FounderPulse } from "@shared/schema";
import { and, eq, gte, like, sql } from "drizzle-orm";

const PULSE_WINDOW_DAYS = 21;
const PULSE_WINDOW_MS = PULSE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
const ACTIVE_THRESHOLD = 5;
const QUIET_THRESHOLD = 1;

// Map sourceKey → coarse channel bucket used in the pulse breakdown.
function channelOf(sourceKey: string): string {
  const k = sourceKey.toLowerCase();
  if (k.startsWith("group2.linkedin") || k.includes("linkedin")) return "linkedin";
  if (k.startsWith("group2.twitter") || k.includes("twitter") || k.includes("x.com")) return "twitter";
  if (k.startsWith("group2.vk") || k.includes("vk.com") || k.includes("vkontakte")) return "vk";
  if (k.startsWith("group2.habr")) return "habr";
  if (k.startsWith("group2.youtube") || k.includes("youtube")) return "youtube";
  if (k.startsWith("group2.")) return "social_other";
  return k;
}

/**
 * Founder Pulse — derived from Group 2 social trace events emitted by the
 * five social trackers (linkedin / twitter / vk / habr-career / youtube).
 * Returns the count of social-trace events in the last 21 days plus a
 * coarse status ("active" / "quiet" / "silent") consumed by Group 8 alerts
 * and surfaced as a small badge on startup cards.
 *
 * NOTE: Group 6 (Vitality) owns the weighting of this signal. Group 8
 * (Alerts) owns delivery. This task only computes the metric.
 */
export async function getFounderPulse(startupId: string): Promise<FounderPulse> {
  const { count, lastOccurredAt } = await storage.countSignalEvents({
    startupId,
    sourceKeyPrefix: "group2.",
    sinceMs: PULSE_WINDOW_MS,
  });

  let status: FounderPulse["status"] = "silent";
  if (count >= ACTIVE_THRESHOLD) status = "active";
  else if (count >= QUIET_THRESHOLD) status = "quiet";

  // Per-channel breakdown (group2.* social trackers) for the same window.
  const since = new Date(Date.now() - PULSE_WINDOW_MS);
  let channelBreakdown: Record<string, number> = {};
  try {
    const rows = await db
      .select({ sourceKey: signalEvents.sourceKey, n: sql<number>`count(*)::int` })
      .from(signalEvents)
      .where(and(
        eq(signalEvents.startupId, startupId),
        gte(signalEvents.occurredAt, since),
        like(signalEvents.sourceKey, "group2.%"),
      ))
      .groupBy(signalEvents.sourceKey);
    for (const r of rows) {
      const ch = channelOf(r.sourceKey);
      channelBreakdown[ch] = (channelBreakdown[ch] ?? 0) + (r.n ?? 0);
    }
  } catch (err) {
    console.warn("[founder-pulse] channelBreakdown failed:", err);
  }

  // Persisted state (when present) carries the last DM nudge timestamp.
  let lastNudgeAt: string | null = null;
  try {
    const persisted = await storage.getFounderPulseState(startupId);
    lastNudgeAt = (persisted as any)?.lastNudgeAt ? new Date((persisted as any).lastNudgeAt).toISOString() : null;
  } catch {}

  return {
    status,
    lastActivityAt: lastOccurredAt ? lastOccurredAt.toISOString() : null,
    eventsLast21Days: count,
    channelBreakdown,
    lastNudgeAt,
  };
}
