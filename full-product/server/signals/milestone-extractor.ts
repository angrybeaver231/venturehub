import { storage } from "../storage";
import { extractMilestonesFromEvents, VENTURE_MODEL } from "../ai-venture";

const LOOKBACK_DAYS = 7;
// Group 7.2: milestones with confidence below this threshold land in the
// admin review queue (`reviewStatus = pending_review`) instead of being
// auto-approved and surfaced on the public timeline.
export const MILESTONE_AUTO_APPROVE_CONFIDENCE = 70;

/**
 * Extract milestones from recent signal events for one startup.
 * Idempotent: storage.upsertMilestoneByEventOverlap matches existing rows
 * by sourceEventIds overlap (per startup + kind).
 */
export async function extractMilestonesForStartup(startupId: string): Promise<number> {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const events = await storage.getStartupSignalEventsInWindow(startupId, since);
  if (events.length === 0) return 0;
  const candidates = await extractMilestonesFromEvents(
    events.map((e) => ({
      id: e.id,
      sourceKey: e.sourceKey,
      eventType: e.eventType,
      severity: e.severity,
      title: e.title,
      summary: e.summary,
      url: e.url,
      occurredAt: e.occurredAt,
    })),
  );
  let count = 0;
  for (const c of candidates) {
    try {
      const reviewStatus = c.confidence >= MILESTONE_AUTO_APPROVE_CONFIDENCE
        ? "auto_approved"
        : "pending_review";
      await storage.upsertMilestoneByEventOverlap({
        startupId,
        kind: c.kind,
        title: c.title,
        description: c.description,
        occurredAt: new Date(c.occurredAt),
        confidence: c.confidence,
        sourceEventIds: c.sourceEventIds,
        llmModel: VENTURE_MODEL,
        reviewStatus,
      } as any);
      count += 1;
    } catch (err) {
      console.error(`[milestones] upsert failed for startup ${startupId}:`, err);
    }
  }
  return count;
}

export async function extractMilestonesForAllStartups(): Promise<{ startups: number; milestones: number }> {
  const ids = await storage.listAllStartupIdsWithSignals();
  let total = 0;
  for (const id of ids) {
    try {
      total += await extractMilestonesForStartup(id);
    } catch (err) {
      console.error(`[milestones] startup ${id} failed:`, err);
    }
  }
  return { startups: ids.length, milestones: total };
}
