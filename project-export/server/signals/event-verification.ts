import { db } from "../db";
import { signalEvents } from "@shared/schema";
import type { SignalEvent } from "@shared/schema";
import { eq } from "drizzle-orm";
import { storage } from "../storage";
import { chat } from "../ai-venture";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface RelatedEventsResult {
  relatedIds: string[];
  unifiedSources: string[];
}

function compactEvent(e: SignalEvent) {
  return {
    id: e.id,
    sourceKey: e.sourceKey,
    eventType: e.eventType,
    title: (e.title || "").slice(0, 140),
    summary: (e.summary || "").slice(0, 240),
    occurredAt: e.occurredAt instanceof Date ? e.occurredAt.toISOString() : e.occurredAt,
  };
}

/**
 * Group 7.4 — find events from the same startup over the last 30 days that
 * describe the same underlying fact (e.g. "Raised $5M" ↔ "₽450M раунд"). When
 * 2+ distinct source ingestors back the cluster, write the unified
 * `verifiedBy` source list onto every member event.
 */
export async function findRelatedEvents(event: SignalEvent): Promise<RelatedEventsResult> {
  if (!event.startupId) return { relatedIds: [], unifiedSources: [] };

  const since = new Date(Date.now() - 30 * DAY_MS);
  const window = await storage.getStartupSignalEventsInWindow(event.startupId, since);
  const candidates = window.filter((c) => c.id !== event.id);
  if (candidates.length === 0) return { relatedIds: [], unifiedSources: [] };

  const subject = compactEvent(event);
  const corpus = candidates.slice(0, 60).map(compactEvent);

  const system =
    "You correlate startup signal events. Given a SUBJECT event and a list of CANDIDATES " +
    "from the same startup over the last 30 days, return the candidate ids that describe " +
    "the SAME underlying fact (same fundraise, same hire, same outage, same product launch, etc.). " +
    "Be conservative — only include events that almost certainly describe the same fact. " +
    "Cross-language matches are allowed (English ↔ Russian). " +
    'Output strict JSON: {"related":[id, id, ...]}. If none match, return {"related":[]}.';

  const user = JSON.stringify({ subject, candidates: corpus }).slice(0, 8000);

  let relatedIds: string[] = [];
  if (process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    try {
      const raw = await chat(system, user, {
        json: true,
        temperature: 0.0,
        maxTokens: 400,
        timeoutMs: 12_000,
      });
      const parsed = JSON.parse(raw || "{}");
      const list = Array.isArray(parsed?.related) ? parsed.related : [];
      const validIds = new Set(candidates.map((c) => c.id));
      relatedIds = list.filter((x: any): x is string => typeof x === "string" && validIds.has(x));
    } catch {
      relatedIds = [];
    }
  }

  if (relatedIds.length === 0) return { relatedIds: [], unifiedSources: [] };

  const cluster = [event, ...candidates.filter((c) => relatedIds.includes(c.id))];
  const unifiedSources = Array.from(new Set(cluster.map((e) => e.sourceKey).filter(Boolean))).sort();
  if (unifiedSources.length < 2) return { relatedIds, unifiedSources: [] };

  for (const ev of cluster) {
    const current = (ev.verifiedBy ?? []) as string[];
    const merged = Array.from(new Set([...current, ...unifiedSources])).sort();
    const same = merged.length === current.length && merged.every((v, i) => v === current[i]);
    if (same) continue;
    try {
      await db.update(signalEvents).set({ verifiedBy: merged }).where(eq(signalEvents.id, ev.id));
    } catch (err) {
      console.warn(`[event-verification] update ${ev.id} failed:`, err);
    }
  }

  return { relatedIds, unifiedSources };
}

/**
 * Nightly sweep: walks the most recent unverified events and tries to find
 * cross-source corroboration. Bounded by `limit` to keep LLM cost predictable.
 */
export async function runVerificationSweep(limit = 200): Promise<{ scanned: number; verified: number }> {
  const since = new Date(Date.now() - 30 * DAY_MS);
  // Pull recent events platform-wide that are not yet multi-source verified.
  const recent = await db
    .select()
    .from(signalEvents)
    .orderBy(signalEvents.occurredAt);
  const candidates = recent
    .filter((e) => e.startupId && (e.verifiedBy ?? []).length < 2 && e.occurredAt && new Date(e.occurredAt as any) >= since)
    .slice(-limit);

  let verified = 0;
  for (const ev of candidates) {
    try {
      const out = await findRelatedEvents(ev);
      if (out.unifiedSources.length >= 2) verified++;
    } catch (err) {
      console.warn(`[event-verification:sweep:${ev.id}]`, err);
    }
  }
  return { scanned: candidates.length, verified };
}
