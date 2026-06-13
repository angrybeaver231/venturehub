import { db } from "../db";
import {
  protoStartups,
  startups,
  startupProfileFacts,
  type ProtoStartup,
} from "@shared/schema";
import { eq, sql } from "drizzle-orm";

/**
 * Promotion gate.
 *
 *   readiness >= 60  ->  upgrade cluster_status to 'promoted_lead'
 *                        (kept inside scout — no startup row yet).
 *   readiness >= 80
 *     OR sourceDiversity >= 4
 *                    ->  create an unclaimed startup row, link it to the
 *                        cluster, and flip cluster_status to 'promoted_startup'.
 *                        From this moment the existing Vitality / Pulse /
 *                        Watchlist pipeline picks the startup up automatically.
 */

const LEAD_THRESHOLD = 60;
const STARTUP_READINESS_THRESHOLD = 80;
const STARTUP_DIVERSITY_THRESHOLD = 4;

async function getFactValue(protoId: string, field: string): Promise<any> {
  const [row] = await db.select().from(startupProfileFacts).where(sql`
    ${startupProfileFacts.protoStartupId} = ${protoId}
    AND ${startupProfileFacts.field} = ${field}
    AND ${startupProfileFacts.supersededBy} IS NULL
  `).limit(1);
  return row?.value || null;
}

export async function promoteCluster(cluster: ProtoStartup): Promise<"none" | "lead" | "startup"> {
  if (cluster.clusterStatus === "promoted_startup") return "none";
  const eligibleForStartup =
    cluster.readinessScore >= STARTUP_READINESS_THRESHOLD ||
    cluster.sourceDiversity >= STARTUP_DIVERSITY_THRESHOLD;

  if (eligibleForStartup) {
    if (cluster.promotedStartupId) {
      // Already linked — nothing to do but ensure status is correct.
      await db.update(protoStartups)
        .set({ clusterStatus: "promoted_startup" })
        .where(eq(protoStartups.id, cluster.id));
      return "none";
    }
    const name =
      cluster.canonicalName ||
      (await getFactValue(cluster.id, "canonical_name"))?.name ||
      cluster.domain ||
      cluster.githubOrg ||
      "Unnamed pre-revenue startup";
    const description =
      `Auto-discovered by Ventorix Pre-Revenue Discovery Engine ` +
      `(${cluster.signalCount} signals across ${cluster.sourceDiversity} sources, ` +
      `readiness ${cluster.readinessScore}).`;

    const [newStartup] = await db.insert(startups).values({
      name: String(name).slice(0, 200),
      description,
      stage: cluster.stage || "ideation",
      vertical: cluster.vertical || null,
      website: cluster.domain ? `https://${cluster.domain}` : null,
      // status is the existing column on `startups` — we mark it 'unclaimed' so
      // the Founder claim flow can pick it up.
      status: "unclaimed",
    } as any).returning();

    await db.update(protoStartups).set({
      clusterStatus: "promoted_startup",
      promotedStartupId: newStartup.id,
    }).where(eq(protoStartups.id, cluster.id));

    return "startup";
  }

  if (cluster.readinessScore >= LEAD_THRESHOLD && cluster.clusterStatus === "active") {
    await db.update(protoStartups)
      .set({ clusterStatus: "promoted_lead" })
      .where(eq(protoStartups.id, cluster.id));
    return "lead";
  }
  return "none";
}

export async function runPromotionGate(): Promise<{ leads: number; startups: number; scanned: number }> {
  const candidates = await db.select().from(protoStartups).where(sql`
    ${protoStartups.clusterStatus} IN ('active', 'promoted_lead')
    AND ${protoStartups.readinessScore} >= ${LEAD_THRESHOLD}
  `).limit(500);
  let leads = 0;
  let startupsPromoted = 0;
  for (const c of candidates) {
    try {
      const r = await promoteCluster(c);
      if (r === "lead") leads++;
      if (r === "startup") startupsPromoted++;
    } catch (err) {
      console.error(`[scout/promotion] cluster ${c.id} failed:`, err);
    }
  }
  return { leads, startups: startupsPromoted, scanned: candidates.length };
}
