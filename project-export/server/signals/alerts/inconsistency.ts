import { storage } from "../../storage";
import { db } from "../../db";
import { startups, startupMembers, reviewerAssignments, signalEvents, startupMetrics } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import { deliverAlert } from "./deliver";
import { inconsistencyReason } from "../../ai-venture";

const DAY = 24 * 60 * 60 * 1000;

export type InconsistencyHit = {
  reason: string;
  details: Record<string, any>;
};

// Compares the latest founder-reported metrics against passive signals.
// Standalone (Group 7's diff helper isn't built yet) — keeps the rules small
// and explicit so they're easy to extend.
export async function detectInconsistenciesForStartup(startupId: string): Promise<InconsistencyHit[]> {
  const hits: InconsistencyHit[] = [];

  // Latest metric submitted by the founder
  const [metric] = await db.select().from(startupMetrics)
    .where(eq(startupMetrics.startupId, startupId))
    .orderBy(desc(startupMetrics.createdAt))
    .limit(1);

  // Most recent passive signals
  const recent = await db.select().from(signalEvents)
    .where(eq(signalEvents.startupId, startupId))
    .orderBy(desc(signalEvents.occurredAt))
    .limit(50);

  const lastSiteCheck = recent.find((e) => e.eventType === "site_status" || e.eventType === "site_down" || e.eventType === "app_down");
  const lastGithubActivity = recent.find((e) => e.sourceKey === "github" || e.eventType?.startsWith("github_"));
  const paymentSignals = recent.filter((e) =>
    e.sourceKey?.startsWith("fin-") ||
    e.eventType === "payment_received" ||
    e.eventType === "mrr_change",
  );
  const productReleases = recent.filter((e) =>
    e.eventType === "product_release" || e.eventType === "release_published",
  );

  if (metric && Number((metric as any).mrr ?? 0) > 0) {
    if (lastSiteCheck && (lastSiteCheck.eventType === "site_down" || lastSiteCheck.eventType === "app_down" || (lastSiteCheck.payload as any)?.status === "down")) {
      hits.push({
        reason: "Reported MRR conflicts with site/app down signal",
        details: { mrr: (metric as any).mrr, lastSiteCheck: { type: lastSiteCheck.eventType, occurredAt: lastSiteCheck.occurredAt } },
      });
    }
    if (!lastGithubActivity || (lastGithubActivity.occurredAt && (Date.now() - new Date(lastGithubActivity.occurredAt).getTime()) > 180 * DAY)) {
      hits.push({
        reason: "Reported MRR but GitHub silent for 6+ months",
        details: { mrr: (metric as any).mrr, lastGithubActivity: lastGithubActivity?.occurredAt ?? null },
      });
    }
    // Group 8.2 — MRR claimed but no payment-processor signals at all in
    // the last 90 days. The Group 4 fin-* sources (Tinkoff, YooKassa, OCR)
    // mint a signal_event whenever cash actually moves; their absence is a
    // strong "self-reported only" tell.
    const sinceFin = Date.now() - 90 * DAY;
    const recentFin = paymentSignals.filter((e) => e.occurredAt && new Date(e.occurredAt).getTime() >= sinceFin);
    if (recentFin.length === 0) {
      hits.push({
        reason: "Reported MRR but no payment processor signals in 90d",
        details: { mrr: (metric as any).mrr, paymentSignalCount90d: 0 },
      });
    }
  }

  // Founder claims a reported team size but the platform shows fewer
  // confirmed members (a generous +5 buffer for advisors / unbound contractors).
  const reportedTeam = Number((metric as any)?.teamSize ?? 0);
  if (reportedTeam > 0) {
    try {
      const members = await db.select({ id: startupMembers.id })
        .from(startupMembers)
        .where(eq(startupMembers.startupId, startupId));
      if (reportedTeam > members.length + 5) {
        hits.push({
          reason: "Reported team size much larger than confirmed members",
          details: { reportedTeam, confirmedMembers: members.length },
        });
      }
    } catch {}
  }

  // ===== Group 8.2 — additional heuristics =====

  // website_down_vs_upbeat_post: site/app marked down but the founder
  // posted a positive milestone-flavoured signal (release/launch/raise) in
  // the same 14-day window.
  if (lastSiteCheck && (lastSiteCheck.eventType === "site_down" || lastSiteCheck.eventType === "app_down")) {
    const downAt = lastSiteCheck.occurredAt ? new Date(lastSiteCheck.occurredAt).getTime() : 0;
    if (downAt > 0) {
      const upbeat = recent.find((e) =>
        e.severity === "positive"
        && e.occurredAt
        && Math.abs(new Date(e.occurredAt).getTime() - downAt) <= 14 * DAY,
      );
      if (upbeat) {
        hits.push({
          reason: "website_down_vs_upbeat_post",
          details: {
            siteEvent: { type: lastSiteCheck.eventType, occurredAt: lastSiteCheck.occurredAt },
            upbeatEvent: { type: upbeat.eventType, title: upbeat.title, occurredAt: upbeat.occurredAt },
          },
        });
      }
    }
  }

  // github_silence_vs_shipping_claim: founder reports a product release
  // event yet the GitHub source has been silent for 60+ days.
  const recentRelease = productReleases[0];
  if (recentRelease) {
    const lastGhMs = lastGithubActivity?.occurredAt ? new Date(lastGithubActivity.occurredAt).getTime() : 0;
    const silentDays = lastGhMs > 0 ? (Date.now() - lastGhMs) / DAY : Infinity;
    if (silentDays >= 60) {
      hits.push({
        reason: "github_silence_vs_shipping_claim",
        details: {
          claimedRelease: { title: recentRelease.title, occurredAt: recentRelease.occurredAt },
          githubSilentDays: Number.isFinite(silentDays) ? Math.round(silentDays) : null,
        },
      });
    }
  }

  // deleted_repos: GitHub source has emitted a "repo_deleted" /
  // "org_archived" signal — surfaces as a flag for review.
  const repoDeleted = recent.find((e) =>
    e.sourceKey === "github" && (e.eventType === "repo_deleted" || e.eventType === "org_archived"),
  );
  if (repoDeleted) {
    hits.push({
      reason: "deleted_repos",
      details: {
        eventType: repoDeleted.eventType,
        occurredAt: repoDeleted.occurredAt,
        title: repoDeleted.title,
      },
    });
  }

  // raised_round_vs_egrul: founder/news event claims a fundraise but no
  // ЕГРЮЛ capital change was detected in the 90 days around the round.
  const raisedRound = recent.find((e) =>
    e.eventType === "round_raised" || e.eventType === "fundraise_announced",
  );
  if (raisedRound && raisedRound.occurredAt) {
    const roundMs = new Date(raisedRound.occurredAt).getTime();
    const egrulSignal = recent.find((e) =>
      (e.sourceKey === "egrul-watcher" || e.eventType?.startsWith("egrul_"))
      && e.occurredAt
      && Math.abs(new Date(e.occurredAt).getTime() - roundMs) <= 90 * DAY,
    );
    if (!egrulSignal) {
      hits.push({
        reason: "raised_round_vs_egrul",
        details: {
          raisedAt: raisedRound.occurredAt,
          raisedTitle: raisedRound.title,
          egrulMatchedWithin90d: false,
        },
      });
    }
  }

  // Stage = "growth" / "seriesA" but no product release or site_up signals
  // in the last 365 days — strongly suggests stale self-reporting.
  const [startup] = await db.select().from(startups).where(eq(startups.id, startupId)).limit(1);
  if (startup && (startup.stage === "growth" || startup.stage === "seriesA" || startup.stage === "seriesB")) {
    const sinceYear = Date.now() - 365 * DAY;
    const recentReleases = productReleases.filter((e) => e.occurredAt && new Date(e.occurredAt).getTime() >= sinceYear);
    const livenessSignal = recent.find((e) => e.occurredAt && new Date(e.occurredAt).getTime() >= sinceYear);
    if (recentReleases.length === 0 && !livenessSignal) {
      hits.push({
        reason: "Late-stage profile but no product or activity signals in 12 months",
        details: { stage: startup.stage, lastSignalAt: recent[0]?.occurredAt ?? null },
      });
    }
  }

  return hits;
}

async function getReviewersForStartup(startupId: string): Promise<string[]> {
  const rows = await db.select({ userId: reviewerAssignments.reviewerId })
    .from(reviewerAssignments)
    .where(and(eq(reviewerAssignments.entityType, "startup"), eq(reviewerAssignments.entityId, startupId)));
  return rows.map((r) => r.userId).filter(Boolean) as string[];
}

export async function flagInconsistenciesForStartup(startupId: string): Promise<number> {
  const hits = await detectInconsistenciesForStartup(startupId);
  if (hits.length === 0) return 0;

  const reviewers = await getReviewersForStartup(startupId);
  for (const hit of hits) {
    // de-dupe: don't open duplicate flags for the same reason still open
    const existing = await storage.listManualReviewFlags({
      entityType: "startup",
      entityId: startupId,
      status: "open",
    });
    if (existing.some((f) => f.reason === hit.reason)) continue;

    // Generate a NL explanation for reviewers (best-effort, non-blocking).
    let humanReason = hit.reason;
    try {
      humanReason = await inconsistencyReason(hit, "en");
    } catch {}

    await storage.createManualReviewFlag({
      entityType: "startup",
      entityId: startupId,
      reviewerId: reviewers[0] ?? null,
      reason: hit.reason,
      details: { ...hit.details, humanReason },
      status: "open",
    } as any);

    if (reviewers.length > 0) {
      await deliverAlert({
        userIds: reviewers,
        type: "alert_inconsistency",
        severity: "warning",
        category: "review",
        title: `Manual review needed: ${hit.reason}`,
        content: humanReason || JSON.stringify(hit.details, null, 2),
        linkUrl: `/my-reviews`,
        relatedId: startupId,
        channels: { inApp: true, email: true, push: true },
      });
    }
  }
  return hits.length;
}

export async function runInconsistencyCron(): Promise<void> {
  const all = await db.select({ id: startups.id }).from(startups);
  for (const s of all) {
    try {
      await flagInconsistenciesForStartup(s.id);
    } catch (err) {
      console.warn(`[alerts:inconsistency:${s.id}]`, err);
    }
  }
}
