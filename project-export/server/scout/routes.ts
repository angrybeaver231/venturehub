import type { Express } from "express";
import { db } from "../db";
import {
  rawObservations,
  founderSignals,
  protoStartups,
  startupProfileFacts,
  personIdentities,
  scoutSourceWhitelist,
  scoutDoNotTrack,
  scoutBlacklist,
  insertScoutBlacklistSchema,
} from "@shared/schema";
import { eq, desc, sql, inArray } from "drizzle-orm";
import {
  normaliseDomain,
  normaliseCompanyName,
  normaliseInn,
  _resetBlacklistCache,
} from "./blacklist";
import { runMaturityCheck } from "./maturity-check";
import { isAuthenticated, isHeadAdmin } from "../auth";
import { runClassificationBatch } from "./ingest";
import { runClusterUpdate, runStaleOut } from "./clustering";
import { runProfileBuilder } from "./profile-builder";
import { runScoreRecompute } from "./scoring";
import { runPromotionGate } from "./promotion";
import { forgetIdentifier, addToDoNotTrack, runRetentionSweep } from "./privacy";
import { hashIdentifier } from "./pii";
import { runDiscoverNow } from "./discover";
import { z } from "zod";

/**
 * /api/admin/scout/*  — head-admin-only management API for the discovery engine.
 * /api/scout/*        — public privacy endpoints (opt-out, forget).
 */
export function registerScoutRoutes(app: Express): void {
  // ------- Public privacy endpoints (no auth — anyone can opt out of being scouted) -------

  app.post("/api/scout/opt-out", async (req, res) => {
    try {
      const { identifierType, identifierValue, reason } = req.body || {};
      if (!identifierType || !identifierValue) {
        return res.status(400).json({ message: "identifierType and identifierValue are required" });
      }
      const allowed = ["email", "tg_username", "tg_user_id", "github_login", "twitter_handle", "domain"];
      if (!allowed.includes(identifierType)) {
        return res.status(400).json({ message: "invalid identifierType" });
      }
      const finalValue =
        identifierType === "email"
          ? hashIdentifier(String(identifierValue))
          : String(identifierValue).toLowerCase();
      const finalType = identifierType === "email" ? "email_hash" : identifierType;
      await addToDoNotTrack({
        identifierType: finalType,
        identifierValue: finalValue,
        reason: reason || "user opt-out",
      });
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/scout/forget", async (req, res) => {
    try {
      const { identifierType, identifierValue } = req.body || {};
      if (!identifierType || !identifierValue) {
        return res.status(400).json({ message: "identifierType and identifierValue are required" });
      }
      const finalValue =
        identifierType === "email"
          ? hashIdentifier(String(identifierValue))
          : String(identifierValue).toLowerCase();
      const finalType = identifierType === "email" ? "email_hash" : identifierType;
      const result = await forgetIdentifier({ identifierType: finalType, identifierValue: finalValue });
      res.json({ ok: true, ...result });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ------- Admin (head-admin only) -------

  app.get("/api/admin/scout/overview", isAuthenticated, isHeadAdmin, async (_req, res) => {
    try {
      const [counts]: any = await db.execute(sql`
        SELECT
          (SELECT COUNT(*) FROM raw_observations)                                AS raw_total,
          (SELECT COUNT(*) FROM raw_observations WHERE processing_status='pending') AS raw_pending,
          (SELECT COUNT(*) FROM founder_signals)                                  AS signals_total,
          (SELECT COUNT(*) FROM proto_startups WHERE cluster_status='active')     AS clusters_active,
          (SELECT COUNT(*) FROM proto_startups WHERE cluster_status='promoted_lead')   AS clusters_lead,
          (SELECT COUNT(*) FROM proto_startups WHERE cluster_status='promoted_startup') AS clusters_promoted,
          (SELECT COUNT(*) FROM proto_startups WHERE cluster_status='stale')      AS clusters_stale,
          (SELECT COUNT(*) FROM person_identities)                                AS persons_total,
          (SELECT COUNT(*) FROM scout_do_not_track)                               AS dnt_total
      `);
      res.json(counts.rows?.[0] || {});
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/scout/raw-observations", isAuthenticated, isHeadAdmin, async (req, res) => {
    try {
      const limit = Math.min(200, Number(req.query.limit) || 50);
      const collector = req.query.collector ? String(req.query.collector) : null;
      const status = req.query.status ? String(req.query.status) : null;
      let q = db.select().from(rawObservations).$dynamic();
      const conds: any[] = [];
      if (collector) conds.push(eq(rawObservations.collector, collector));
      if (status) conds.push(eq(rawObservations.processingStatus, status));
      if (conds.length) q = q.where(sql`${conds.reduce((a, b) => sql`${a} AND ${b}`)}`);
      const rows = await q.orderBy(desc(rawObservations.collectedAt)).limit(limit);
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Default (no `status` query) returns ONLY clusters that should be visible
  // in the active scout feed: 'active', 'promoted_lead', 'promoted_startup'.
  // Hidden by default: 'too_mature', 'blacklisted', 'stale', 'duplicate'.
  // Pass `?status=blacklisted` or `?status=too_mature` explicitly to inspect
  // the filtered buckets (used by /admin/scout/filtered).
  const DEFAULT_VISIBLE_STATUSES = ["active", "promoted_lead", "promoted_startup"];
  app.get("/api/admin/scout/clusters", isAuthenticated, isHeadAdmin, async (req, res) => {
    try {
      const status = req.query.status ? String(req.query.status) : null;
      const limit = Math.min(200, Number(req.query.limit) || 50);
      const whereExpr = status
        ? eq(protoStartups.clusterStatus, status)
        : inArray(protoStartups.clusterStatus, DEFAULT_VISIBLE_STATUSES);
      const rows = await db.select().from(protoStartups)
        .where(whereExpr)
        .orderBy(desc(protoStartups.lastSignalAt))
        .limit(limit);
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Unblock a cluster — flips it back to 'active' and clears the blacklist
  // flag. Used from /admin/scout/filtered when an admin reviews a false
  // positive.
  app.post("/api/admin/scout/clusters/:id/unblock", isAuthenticated, isHeadAdmin, async (req: any, res) => {
    try {
      const [cluster] = await db.select().from(protoStartups).where(eq(protoStartups.id, req.params.id));
      if (!cluster) return res.status(404).json({ message: "not found" });
      const audit = `unblocked by ${req.user?.claims?.sub || "?"} at ${new Date().toISOString()}; was ${cluster.clusterStatus}`;
      await db.update(protoStartups).set({
        clusterStatus: "active",
        isBlacklisted: false,
        excludedReason: null,
        maturityFlags: {
          ...(cluster.maturityFlags || {}),
          blocked_by: [],
          checked_at: cluster.maturityFlags?.checked_at || null,
          audit: [...(((cluster.maturityFlags as any)?.audit) || []), audit],
        } as any,
      }).where(eq(protoStartups.id, cluster.id));
      res.json({ ok: true, audit });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ------- Brand blacklist management -------
  app.get("/api/admin/scout/blacklist", isAuthenticated, isHeadAdmin, async (req, res) => {
    try {
      const limit = Math.min(500, Number(req.query.limit) || 200);
      const offset = Math.max(0, Number(req.query.offset) || 0);
      const matchType = req.query.matchType ? String(req.query.matchType) : null;
      const whereExpr = matchType ? eq(scoutBlacklist.matchType, matchType) : sql`true`;
      const [{ count }] = await db.select({ count: sql<number>`count(*)::int` })
        .from(scoutBlacklist).where(whereExpr);
      const rows = await db.select().from(scoutBlacklist)
        .where(whereExpr)
        .orderBy(desc(scoutBlacklist.createdAt))
        .limit(limit)
        .offset(offset);
      res.json({ total: Number(count), rows });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/admin/scout/blacklist", isAuthenticated, isHeadAdmin, async (req: any, res) => {
    try {
      const parsed = insertScoutBlacklistSchema.safeParse(req.body || {});
      if (!parsed.success) {
        return res.status(400).json({ message: "invalid params", issues: parsed.error.issues });
      }
      const { matchType, value, reason } = parsed.data;
      if (!["domain", "company_name", "inn", "tg_channel"].includes(matchType)) {
        return res.status(400).json({ message: "matchType must be domain | company_name | inn | tg_channel" });
      }
      const normalised =
        matchType === "domain" ? normaliseDomain(value)
        : matchType === "company_name" ? normaliseCompanyName(value)
        : matchType === "inn" ? normaliseInn(value)
        : value.trim().toLowerCase().replace(/^@/, "");
      if (!normalised) return res.status(400).json({ message: "value is empty after normalisation" });
      const [row] = await db.insert(scoutBlacklist).values({
        matchType,
        value: normalised,
        reason: reason || null,
        createdBy: req.user?.claims?.sub || null,
      }).onConflictDoUpdate({
        target: [scoutBlacklist.matchType, scoutBlacklist.value],
        set: { reason: reason || null },
      }).returning();
      _resetBlacklistCache();
      res.json(row);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/admin/scout/blacklist/:id", isAuthenticated, isHeadAdmin, async (req, res) => {
    await db.delete(scoutBlacklist).where(eq(scoutBlacklist.id, req.params.id));
    _resetBlacklistCache();
    res.json({ ok: true });
  });

  app.get("/api/admin/scout/clusters/:id", isAuthenticated, isHeadAdmin, async (req, res) => {
    try {
      const [cluster] = await db.select().from(protoStartups).where(eq(protoStartups.id, req.params.id));
      if (!cluster) return res.status(404).json({ message: "not found" });
      const sigs = await db.select().from(founderSignals)
        .where(eq(founderSignals.protoStartupId, cluster.id))
        .orderBy(desc(founderSignals.occurredAt))
        .limit(100);
      const facts = await db.select().from(startupProfileFacts)
        .where(eq(startupProfileFacts.protoStartupId, cluster.id))
        .orderBy(desc(startupProfileFacts.extractedAt));
      res.json({ cluster, signals: sigs, facts });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/scout/whitelist", isAuthenticated, isHeadAdmin, async (_req, res) => {
    const rows = await db.select().from(scoutSourceWhitelist).orderBy(desc(scoutSourceWhitelist.createdAt));
    res.json(rows);
  });

  app.post("/api/admin/scout/whitelist", isAuthenticated, isHeadAdmin, async (req: any, res) => {
    try {
      const { collector, sourceIdentifier, status, notes } = req.body || {};
      if (!collector || !sourceIdentifier) return res.status(400).json({ message: "collector + sourceIdentifier required" });
      const [row] = await db.insert(scoutSourceWhitelist).values({
        collector,
        sourceIdentifier,
        status: status || "admin-approved",
        notes: notes || null,
        approvedBy: req.user?.claims?.sub || null,
      }).onConflictDoUpdate({
        target: [scoutSourceWhitelist.collector, scoutSourceWhitelist.sourceIdentifier],
        set: { status: status || "admin-approved", notes: notes || null },
      }).returning();
      res.json(row);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/admin/scout/whitelist/:id", isAuthenticated, isHeadAdmin, async (req, res) => {
    await db.delete(scoutSourceWhitelist).where(eq(scoutSourceWhitelist.id, req.params.id));
    res.json({ ok: true });
  });

  app.get("/api/admin/scout/do-not-track", isAuthenticated, isHeadAdmin, async (_req, res) => {
    const rows = await db.select().from(scoutDoNotTrack).orderBy(desc(scoutDoNotTrack.createdAt)).limit(500);
    res.json(rows);
  });

  // ------- Manual job triggers (head admin only) -------
  type Trigger = { name: string; fn: () => Promise<any> };
  const triggers: Record<string, Trigger> = {
    classify:     { name: "classify",     fn: () => runClassificationBatch(100) },
    cluster:      { name: "cluster",      fn: () => runClusterUpdate(200) },
    profile:      { name: "profile",      fn: () => runProfileBuilder() },
    score:        { name: "score",        fn: () => runScoreRecompute() },
    stale:        { name: "stale",        fn: () => runStaleOut(60) },
    promotion:    { name: "promotion",    fn: () => runPromotionGate() },
    retention:    { name: "retention",    fn: () => runRetentionSweep() },
    maturity:     { name: "maturity",     fn: () => runMaturityCheck(50) },
  };
  app.post("/api/admin/scout/run/:job", isAuthenticated, isHeadAdmin, async (req, res) => {
    const t = triggers[req.params.job];
    if (!t) return res.status(404).json({ message: "unknown job" });
    try {
      const result = await t.fn();
      res.json({ ok: true, job: t.name, result });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ------- Active discovery (the "Find startups now" button) -------
  const discoverSchema = z.object({
    verticals: z.array(z.string().max(60)).max(10).optional(),
    region: z.string().max(60).optional(),
    keywords: z.string().max(400).optional(),
    count: z.coerce.number().int().min(3).max(25).optional(),
    useOpenAi: z.boolean().optional(),
    useTelegram: z.boolean().optional(),
    useGithub: z.boolean().optional(),
  });
  app.post("/api/admin/scout/discover", isAuthenticated, isHeadAdmin, async (req, res) => {
    const parsed = discoverSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ message: "invalid params", issues: parsed.error.issues });
    }
    try {
      const result = await runDiscoverNow(parsed.data);
      res.json({ ok: true, ...result });
    } catch (err: any) {
      res.status(500).json({ message: err?.message || "discover failed" });
    }
  });
}
