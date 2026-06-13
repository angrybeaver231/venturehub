import { db } from "../db";
import {
  protoStartups,
  founderSignals,
  rawObservations,
  type FounderSignal,
  type ProtoStartup,
} from "@shared/schema";
import { eq, sql, desc } from "drizzle-orm";
import { isBlacklisted } from "./blacklist";

/**
 * Cluster builder — folds new founder_signals into proto_startups.
 *
 * MVP matching strategy (no pgvector required):
 *   1. Exact match on (domain | github_org)
 *   2. Exact match on canonical name (case-insensitive, normalized)
 *   3. Otherwise: create a new cluster seeded by this signal — IF it passes
 *      the brand-blacklist gate AND the collector-aware stage gate.
 *
 * Two gates run before a cluster is created:
 *
 *   1. brand blacklist (./blacklist.ts) — drops Skyeng / GetCourse / Yandex /
 *      Sber / etc. The signal is marked processing_status='blacklisted' with
 *      a `blacklist:domain:skyeng.ru` audit string.
 *
 *   2. stage gate — only `idea | building | mvp` signals open new clusters.
 *      For the inbound-internal collector we accept `unknown` too (those are
 *      our own users — pre-revenue by default). For external collectors
 *      (openai-web-discovery, tg-public-channels, github-trending) `unknown`
 *      is rejected as wrong_stage — too risky.
 *
 * Existing-cluster folds are NOT gated: once a cluster exists, every new
 * signal helps it grow.
 */

function normalizeName(name: string | null | undefined): string | null {
  if (!name) return null;
  return name.toLowerCase().replace(/[^a-z0-9а-яё]+/giu, " ").trim();
}

const STAGE_ALLOWED = new Set(["idea", "building", "mvp"]);
const COLLECTORS_ALLOWING_UNKNOWN_STAGE = new Set(["inbound-internal"]);

function stageGate(stage: string | null | undefined, collector: string): { ok: boolean; reason?: string } {
  const s = (stage || "").toLowerCase();
  if (STAGE_ALLOWED.has(s)) return { ok: true };
  if (s === "unknown" || s === "") {
    if (COLLECTORS_ALLOWING_UNKNOWN_STAGE.has(collector)) return { ok: true };
    return { ok: false, reason: "wrong_stage:unknown_external" };
  }
  // launched / launched_recently / scaled / etc.
  return { ok: false, reason: `wrong_stage:${s}` };
}

async function findExistingCluster(s: FounderSignal): Promise<ProtoStartup | null> {
  if (s.domain) {
    const [byDomain] = await db.select().from(protoStartups)
      .where(eq(protoStartups.domain, s.domain)).limit(1);
    if (byDomain) return byDomain;
  }
  if (s.githubOrg) {
    const [byGh] = await db.select().from(protoStartups)
      .where(eq(protoStartups.githubOrg, s.githubOrg)).limit(1);
    if (byGh) return byGh;
  }
  const norm = normalizeName(s.projectName);
  if (norm && norm.length >= 3) {
    const [byName] = await db.select().from(protoStartups)
      .where(sql`lower(${protoStartups.canonicalName}) = ${norm}`)
      .limit(1);
    if (byName) return byName;
  }
  return null;
}

async function markSignalRejected(
  sig: FounderSignal,
  status: "blacklisted" | "wrong_stage",
  audit: string,
): Promise<void> {
  // Park the signal so it's not retried forever and so existing-cluster
  // folds don't pick it up. We use the same `_pending` sentinel pattern as
  // the dangling-signal branch but route via raw_observations status so the
  // audit shows up in /admin/scout/raw-observations.
  await db.update(founderSignals)
    .set({ protoStartupId: `_${status}` })
    .where(eq(founderSignals.id, sig.id));
  await db.update(rawObservations)
    .set({ processingStatus: status, processingError: audit })
    .where(eq(rawObservations.id, sig.rawObservationId));
}

/** Run cluster-update for a batch of unclustered signals. Idempotent. */
export async function runClusterUpdate(batchSize = 100): Promise<{
  clustered: number;
  created: number;
  blacklisted: number;
  wrongStage: number;
}> {
  // Pull the collector alongside each signal — needed by the stage gate.
  const candidates = await db
    .select({
      sig: founderSignals,
      collector: rawObservations.collector,
    })
    .from(founderSignals)
    .innerJoin(rawObservations, eq(rawObservations.id, founderSignals.rawObservationId))
    .where(sql`${founderSignals.protoStartupId} IS NULL`)
    .orderBy(desc(founderSignals.occurredAt))
    .limit(batchSize);

  let clustered = 0;
  let created = 0;
  let blacklisted = 0;
  let wrongStage = 0;

  for (const { sig, collector } of candidates) {
    const existing = await findExistingCluster(sig);
    if (existing) {
      await foldIntoCluster(existing, sig);
      clustered++;
      continue;
    }

    if (!(sig.projectName || sig.domain || sig.githubOrg)) {
      // No identifiers — leave it dangling for the next pass (entity-extractor
      // may enrich later) or for stale-out.
      await db.update(founderSignals)
        .set({ protoStartupId: "_pending" })
        .where(eq(founderSignals.id, sig.id));
      continue;
    }

    // Gate 1: brand blacklist.
    const bl = await isBlacklisted({
      domain: sig.domain,
      companyName: sig.projectName,
    });
    if (bl.blocked) {
      await markSignalRejected(sig, "blacklisted", `blacklist:${bl.matchedBy}`);
      blacklisted++;
      console.log(`[scout/cluster] blacklisted ${sig.domain || sig.projectName} via ${bl.matchedBy}`);
      continue;
    }

    // Gate 2: stage (collector-aware).
    const sg = stageGate(sig.stageEstimate, collector);
    if (!sg.ok) {
      await markSignalRejected(sig, "wrong_stage", sg.reason || "wrong_stage");
      wrongStage++;
      continue;
    }

    await createClusterFromSignal(sig);
    created++;
  }
  return { clustered, created, blacklisted, wrongStage };
}

async function foldIntoCluster(cluster: ProtoStartup, sig: FounderSignal): Promise<void> {
  // Update aliases + counters + last_signal_at.
  const aliasAdd = sig.projectName && !cluster.aliases.includes(sig.projectName) ? sig.projectName : null;
  const personAdd = sig.personKey && !cluster.founderPersonKeys.includes(sig.personKey) ? sig.personKey : null;

  await db.update(protoStartups).set({
    aliases: aliasAdd ? [...cluster.aliases, aliasAdd] : cluster.aliases,
    founderPersonKeys: personAdd ? [...cluster.founderPersonKeys, personAdd] : cluster.founderPersonKeys,
    signalCount: cluster.signalCount + 1,
    domain: cluster.domain || sig.domain || null,
    githubOrg: cluster.githubOrg || sig.githubOrg || null,
    vertical: cluster.vertical || sig.vertical || null,
    stage: sig.stageEstimate || cluster.stage || null,
    lastSignalAt: new Date(),
  }).where(eq(protoStartups.id, cluster.id));

  await db.update(founderSignals)
    .set({ protoStartupId: cluster.id })
    .where(eq(founderSignals.id, sig.id));

  await refreshSourceDiversity(cluster.id);
}

async function createClusterFromSignal(sig: FounderSignal): Promise<void> {
  const [created] = await db.insert(protoStartups).values({
    cluserSeedSignalId: sig.id,
    canonicalName: sig.projectName || null,
    aliases: sig.projectName ? [sig.projectName] : [],
    domain: sig.domain || null,
    githubOrg: sig.githubOrg || null,
    vertical: sig.vertical || null,
    stage: sig.stageEstimate || null,
    founderPersonKeys: sig.personKey ? [sig.personKey] : [],
    signalCount: 1,
    sourceDiversity: 1,
    clusterStatus: "active",
  }).returning();

  await db.update(founderSignals)
    .set({ protoStartupId: created.id })
    .where(eq(founderSignals.id, sig.id));
}

/** Recount distinct collectors that contributed signals to this cluster. */
async function refreshSourceDiversity(protoId: string): Promise<void> {
  await db.execute(sql`
    UPDATE proto_startups
    SET source_diversity = (
      SELECT COUNT(DISTINCT r.collector)
      FROM founder_signals fs
      JOIN raw_observations r ON r.id = fs.raw_observation_id
      WHERE fs.proto_startup_id = ${protoId}
    )
    WHERE id = ${protoId}
  `);
}

/** Stale-out — clusters with no new signals in N days are marked stale. */
export async function runStaleOut(staleDays = 60): Promise<number> {
  const result: any = await db.execute(sql`
    UPDATE proto_startups
    SET cluster_status = 'stale'
    WHERE cluster_status = 'active'
      AND last_signal_at < now() - (${staleDays}::int * interval '1 day')
  `);
  return Number(result.rowCount || 0);
}
