import { db } from "../db";
import { protoStartups, founderSignals, type ProtoStartup } from "@shared/schema";
import { eq, sql, desc, gte } from "drizzle-orm";

/**
 * Scoring formulas — pure-ish (read DB, no side effects beyond writing the
 * score columns on proto_startups).
 *
 *  Readiness Score (0..100)
 *    +60 source_diversity >= 3
 *    +20 (last_signal_at - first_signal_at) >= 30 days
 *    +30 has any of (domain | github_org | canonical_name)
 *    +15 founderPersonKeys.length >= 2
 *    -50 cluster_status === 'stale'
 *    Clamped to [0, 100].
 *
 *  Cluster Heat (0..100)
 *    Velocity of signals over last 14 days, plus intent-escalation bonus.
 *    +5 per signal in last 14d (capped 60)
 *    +20 if intent escalated from "looking_for_*" to "launching_mvp" or "seeking_users"
 *    +10 if a new founder appeared in last 14d
 *    Clamped to [0, 100].
 */

export function computeReadiness(p: ProtoStartup): number {
  let score = 0;
  if (p.sourceDiversity >= 3) score += 60;
  const persistDays =
    (new Date(p.lastSignalAt).getTime() - new Date(p.firstSignalAt).getTime()) /
    (1000 * 60 * 60 * 24);
  if (persistDays >= 30) score += 20;
  if (p.domain || p.githubOrg || p.canonicalName) score += 30;
  if (p.founderPersonKeys.length >= 2) score += 15;
  if (p.clusterStatus === "stale") score -= 50;
  return Math.max(0, Math.min(100, score));
}

const ESCALATION_HIGH = new Set(["launching_mvp", "seeking_users", "fundraising_pre_seed"]);
const ESCALATION_LOW = new Set(["looking_for_cofounder", "asking_for_feedback"]);

export async function computeHeat(protoId: string): Promise<number> {
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const recent = await db.select().from(founderSignals)
    .where(sql`${founderSignals.protoStartupId} = ${protoId} AND ${founderSignals.occurredAt} >= ${since.toISOString()}`)
    .orderBy(desc(founderSignals.occurredAt));
  const velocity = Math.min(60, recent.length * 5);
  const hasHigh = recent.some((r) => ESCALATION_HIGH.has(r.intent));
  const hasLow = recent.some((r) => ESCALATION_LOW.has(r.intent));
  const escalation = hasHigh && hasLow ? 20 : 0;
  const distinctPersons = new Set(recent.map((r) => r.personKey).filter(Boolean));
  const newFounderBonus = distinctPersons.size >= 2 ? 10 : 0;
  return Math.max(0, Math.min(100, velocity + escalation + newFounderBonus));
}

/** Recompute readiness + heat for all active clusters. */
export async function runScoreRecompute(): Promise<{ updated: number }> {
  const active = await db.select().from(protoStartups)
    .where(sql`${protoStartups.clusterStatus} IN ('active', 'promoted_lead')`)
    .limit(2000);
  let updated = 0;
  for (const p of active) {
    const readiness = computeReadiness(p);
    const heat = await computeHeat(p.id);
    if (readiness !== p.readinessScore || heat !== p.clusterHeat) {
      await db.update(protoStartups)
        .set({ readinessScore: readiness, clusterHeat: heat })
        .where(eq(protoStartups.id, p.id));
      updated++;
    }
  }
  return { updated };
}
