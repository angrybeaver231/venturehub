import { db } from "../db";
import {
  protoStartups,
  founderSignals,
  startupProfileFacts,
  rawObservations,
  type ProtoStartup,
} from "@shared/schema";
import { eq, and, sql, inArray, desc } from "drizzle-orm";

/**
 * Profile-builder. Triggered once a cluster crosses
 *    signal_count >= 3 AND source_diversity >= 2.
 *
 * Writes one fact per derivable field into startup_profile_facts. Each fact
 * carries provenance (raw_observation_ids, extractedBy, llmModel). Subsequent
 * runs supersede stale facts via the supersededBy chain.
 *
 * For Sprint 0 we extract a small but meaningful set:
 *   - canonical_name, domain, github_org, vertical, stage
 *   - founder_count, claims (rolled up from signals)
 *   - first_observed_intent (earliest signal intent)
 */

const TRIGGER_SIGNAL_COUNT = 3;
const TRIGGER_SOURCE_DIVERSITY = 2;

export async function findClustersReadyForProfileBuild(): Promise<ProtoStartup[]> {
  return db.select().from(protoStartups).where(sql`
    ${protoStartups.signalCount} >= ${TRIGGER_SIGNAL_COUNT}
    AND ${protoStartups.sourceDiversity} >= ${TRIGGER_SOURCE_DIVERSITY}
    AND ${protoStartups.clusterStatus} = 'active'
  `).limit(50);
}

export async function buildProfileForCluster(cluster: ProtoStartup): Promise<number> {
  const sigs = await db.select().from(founderSignals)
    .where(eq(founderSignals.protoStartupId, cluster.id))
    .orderBy(desc(founderSignals.occurredAt))
    .limit(200);
  if (!sigs.length) return 0;

  const allRawIds = sigs.map((s) => s.rawObservationId);

  // Roll up claims from extracted entities.
  const claims = new Set<string>();
  for (const s of sigs) {
    const ents: any = s.entities || {};
    const c = ents?.project?.claims;
    if (Array.isArray(c)) c.forEach((x: any) => claims.add(String(x)));
  }

  const facts: Array<{ field: string; value: any; confidence: number; sourceIds: string[] }> = [];

  if (cluster.canonicalName) {
    facts.push({
      field: "canonical_name",
      value: { name: cluster.canonicalName, aliases: cluster.aliases },
      confidence: 0.85,
      sourceIds: allRawIds.slice(0, 10),
    });
  }
  if (cluster.domain) {
    facts.push({
      field: "domain",
      value: { domain: cluster.domain },
      confidence: 0.9,
      sourceIds: allRawIds.slice(0, 5),
    });
  }
  if (cluster.githubOrg) {
    facts.push({
      field: "github_org",
      value: { org: cluster.githubOrg },
      confidence: 0.9,
      sourceIds: allRawIds.slice(0, 5),
    });
  }
  if (cluster.vertical) {
    facts.push({
      field: "vertical",
      value: { vertical: cluster.vertical },
      confidence: 0.7,
      sourceIds: allRawIds.slice(0, 5),
    });
  }
  if (cluster.stage) {
    facts.push({
      field: "stage",
      value: { stage: cluster.stage },
      confidence: 0.6,
      sourceIds: allRawIds.slice(0, 5),
    });
  }
  facts.push({
    field: "founder_count",
    value: { count: cluster.founderPersonKeys.length, personKeys: cluster.founderPersonKeys },
    confidence: 0.8,
    sourceIds: allRawIds.slice(0, 10),
  });
  if (claims.size) {
    facts.push({
      field: "founder_claims",
      value: { claims: Array.from(claims).slice(0, 12) },
      confidence: 0.5,
      sourceIds: allRawIds.slice(0, 20),
    });
  }
  facts.push({
    field: "first_observed_intent",
    value: { intent: sigs[sigs.length - 1].intent, occurredAt: sigs[sigs.length - 1].occurredAt },
    confidence: 0.9,
    sourceIds: [sigs[sigs.length - 1].rawObservationId],
  });

  // Supersede prior facts for the same field, then insert fresh.
  for (const f of facts) {
    const existing = await db.select().from(startupProfileFacts).where(and(
      eq(startupProfileFacts.protoStartupId, cluster.id),
      eq(startupProfileFacts.field, f.field),
      sql`${startupProfileFacts.supersededBy} IS NULL`,
    ));
    const [inserted] = await db.insert(startupProfileFacts).values({
      protoStartupId: cluster.id,
      field: f.field,
      value: f.value,
      confidence: String(f.confidence),
      provenance: {
        rawObservationIds: f.sourceIds,
        extractedBy: "profile-builder",
        builtAt: new Date().toISOString(),
      },
    }).returning();
    for (const old of existing) {
      await db.update(startupProfileFacts)
        .set({ supersededBy: inserted.id })
        .where(eq(startupProfileFacts.id, old.id));
    }
  }
  return facts.length;
}

export async function runProfileBuilder(): Promise<{ clusters: number; facts: number }> {
  const clusters = await findClustersReadyForProfileBuild();
  let totalFacts = 0;
  for (const c of clusters) {
    try {
      totalFacts += await buildProfileForCluster(c);
    } catch (err) {
      console.error(`[scout/profile-builder] cluster ${c.id} failed:`, err);
    }
  }
  return { clusters: clusters.length, facts: totalFacts };
}
