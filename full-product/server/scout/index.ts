/**
 * Pre-Revenue Discovery Engine — module wiring.
 *
 * Registers cron-job handlers with the existing in-process scheduler and
 * ensures default cron rows exist in the `cron_jobs` table.
 *
 * Layers (each runs as its own cron):
 *   discovery-inbound      every 15m   collectors/inbound-internal
 *   intent-classify        every 10m   processes pending raw_observations
 *   cluster-update         every 15m   folds signals into proto_startups
 *   profile-builder        every 30m   writes startup_profile_facts
 *   score-recompute        every 2h    readiness + heat
 *   stale-out              daily 03:00 mark old clusters stale
 *   promotion-gate         daily 04:00 promote into startups
 *   retention-sweep        daily 02:00 delete expired raw_observations
 */

import { storage } from "../storage";
import { registerJobHandler } from "../signals/scheduler";
import { runClassificationBatch } from "./ingest";
import { runClusterUpdate, runStaleOut } from "./clustering";
import { runProfileBuilder } from "./profile-builder";
import { runScoreRecompute } from "./scoring";
import { runPromotionGate } from "./promotion";
import { runRetentionSweep } from "./privacy";
import { runInboundInternal } from "./collectors/inbound-internal";
import { runTgCommunityWatcher } from "./collectors/tg-watcher-stub";
import { seedBlacklistIfEmpty } from "./blacklist";
import { runMaturityCheck } from "./maturity-check";

let initialized = false;

const SCOUT_JOBS = [
  { jobName: "scout:discovery-inbound",   schedule: "*/15 * * * *", handler: "scoutDiscoveryInbound",  description: "Pre-revenue scout: inbound TeamHub signals" },
  { jobName: "scout:discovery-tg",        schedule: "*/15 * * * *", handler: "scoutDiscoveryTg",       description: "Pre-revenue scout: tg-community-watcher (stub until MTProto creds set)" },
  { jobName: "scout:classify",            schedule: "*/10 * * * *", handler: "scoutClassify",          description: "Pre-revenue scout: PII-strip + intent-classify + entity-extract" },
  { jobName: "scout:cluster-update",      schedule: "*/15 * * * *", handler: "scoutClusterUpdate",     description: "Pre-revenue scout: fold signals into proto_startups" },
  { jobName: "scout:profile-builder",     schedule: "*/30 * * * *", handler: "scoutProfileBuilder",    description: "Pre-revenue scout: auto-fill startup_profile_facts" },
  { jobName: "scout:score-recompute",     schedule: "0 */2 * * *",  handler: "scoutScoreRecompute",    description: "Pre-revenue scout: readiness + cluster heat" },
  { jobName: "scout:stale-out",           schedule: "0 3 * * *",    handler: "scoutStaleOut",          description: "Pre-revenue scout: mark stale clusters" },
  { jobName: "scout:promotion-gate",      schedule: "0 4 * * *",    handler: "scoutPromotionGate",     description: "Pre-revenue scout: promote into startups table" },
  { jobName: "scout:retention-sweep",     schedule: "0 2 * * *",    handler: "scoutRetentionSweep",    description: "Pre-revenue scout: delete expired raw_observations" },
  { jobName: "scout:maturity-check",      schedule: "*/30 * * * *", handler: "scoutMaturityCheck",     description: "Pre-revenue scout: enrich clusters with company/domain age + flag too_mature" },
];

export async function initScout(): Promise<void> {
  if (initialized) return;
  initialized = true;

  // Seed brand blacklist on first boot. No-op if admins have already
  // populated `scout_blacklist`.
  try {
    await seedBlacklistIfEmpty();
  } catch (err) {
    console.warn("[scout] blacklist seed failed:", err);
  }

  registerJobHandler("scoutDiscoveryInbound", async () => {
    const r = await runInboundInternal();
    console.log(`[scout/inbound] +${r.observations} obs (skipped ${r.skipped})`);
  });
  registerJobHandler("scoutDiscoveryTg", async () => {
    const r = await runTgCommunityWatcher();
    if (r.observations) console.log(`[scout/tg] +${r.observations} obs`);
  });
  registerJobHandler("scoutClassify", async () => {
    const r = await runClassificationBatch(100);
    console.log(`[scout/classify] classified=${r.classified} irrelevant=${r.irrelevant} signals=${r.signals} failed=${r.failed}`);
  });
  registerJobHandler("scoutClusterUpdate", async () => {
    const r = await runClusterUpdate(200);
    console.log(`[scout/cluster] clustered=${r.clustered} created=${r.created}`);
  });
  registerJobHandler("scoutProfileBuilder", async () => {
    const r = await runProfileBuilder();
    console.log(`[scout/profile] clusters=${r.clusters} facts=${r.facts}`);
  });
  registerJobHandler("scoutScoreRecompute", async () => {
    const r = await runScoreRecompute();
    console.log(`[scout/score] updated=${r.updated}`);
  });
  registerJobHandler("scoutStaleOut", async () => {
    const n = await runStaleOut(60);
    console.log(`[scout/stale] marked=${n}`);
  });
  registerJobHandler("scoutPromotionGate", async () => {
    const r = await runPromotionGate();
    console.log(`[scout/promotion] scanned=${r.scanned} leads=${r.leads} startups=${r.startups}`);
  });
  registerJobHandler("scoutRetentionSweep", async () => {
    const r = await runRetentionSweep();
    if (r.deleted) console.log(`[scout/retention] deleted=${r.deleted}`);
  });
  registerJobHandler("scoutMaturityCheck", async () => {
    const r = await runMaturityCheck(50);
    if (r.scanned) console.log(`[scout/maturity] scanned=${r.scanned} blocked=${r.blocked}`);
  });

  // Ensure cron rows exist (so the in-process scheduler picks them up on next
  // startScheduler() call).
  for (const job of SCOUT_JOBS) {
    const existing = await storage.getCronJobByName(job.jobName);
    if (!existing) {
      try {
        await storage.createCronJob({
          jobName: job.jobName,
          schedule: job.schedule,
          handler: job.handler,
          description: job.description,
          isHeavy: false,
          isPaused: false,
        });
      } catch (err) {
        console.warn(`[scout] cron job ${job.jobName} not registered:`, err);
      }
    }
  }
}
