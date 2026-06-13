import { storage } from "../../storage";
import { db } from "../../db";
import { startupMembers, watchlistStartups, watchlists, reviewerAssignments } from "@shared/schema";
import type { SignalEvent } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { evaluate } from "./dsl";
import { deliverAlert } from "./deliver";
import { notifyOnEventWatchlists } from "./watchlistDigest";
import { isRuleMuted } from "./snoozes";

const NEGATIVE_EVENT_TYPES = new Set([
  "lawsuit_filed",
  "founder_departed",
  "cto_departed",
  "executive_departed",
  "app_down",
  "site_down",
  "tax_debt",
  "tax_debt_appeared",
  "security_breach",
  "domain_expired",
  "company_liquidated",
  "bankruptcy_filed",
]);

export function isNegativeEvent(event: { eventType?: string | null; severity?: string | null }): boolean {
  if (event.severity === "critical") return true;
  if (event.eventType && NEGATIVE_EVENT_TYPES.has(event.eventType)) return true;
  return false;
}

async function findWatchersOfStartup(startupId: string): Promise<string[]> {
  const ids = new Set<string>();

  // Founders / team
  const members = await db
    .select({ userId: startupMembers.userId })
    .from(startupMembers)
    .where(eq(startupMembers.startupId, startupId));
  for (const m of members) if (m.userId) ids.add(m.userId);

  // Watchlist owners
  const wlRows = await db
    .select({ userId: watchlists.userId })
    .from(watchlistStartups)
    .innerJoin(watchlists, eq(watchlists.id, watchlistStartups.watchlistId))
    .where(eq(watchlistStartups.startupId, startupId));
  for (const w of wlRows) if (w.userId) ids.add(w.userId);

  // Reviewers assigned to this startup
  const revs = await db
    .select({ userId: reviewerAssignments.reviewerId })
    .from(reviewerAssignments)
    .where(
      and(
        eq(reviewerAssignments.entityType, "startup"),
        eq(reviewerAssignments.entityId, startupId),
      ),
    );
  for (const r of revs) if (r.userId) ids.add(r.userId);

  return Array.from(ids);
}

// Hooked from SignalIngestor.recordEvent after a successful insert. Runs the
// negative-signal fast path AND custom-rule evaluation against this event.
// Failures here must never block ingestion, so everything is swallowed.
export async function dispatchSignalEvent(event: SignalEvent): Promise<void> {
  try {
    const startup = event.startupId ? await storage.getStartup(event.startupId) : null;

    // 1) Negative-signal fast path → notify watchers immediately
    if (isNegativeEvent(event) && event.startupId) {
      const watchers = await findWatchersOfStartup(event.startupId);
      if (watchers.length > 0) {
        await deliverAlert({
          userIds: watchers,
          type: "alert_critical",
          severity: "critical",
          category: "alert",
          title: event.title || `Critical signal: ${event.eventType}`,
          content: event.summary || `${startup?.name ?? "Startup"} — ${event.eventType}`,
          linkUrl: event.url || (event.startupId ? `/startups/${event.startupId}` : undefined),
          relatedId: event.id,
          channels: { inApp: true, email: true, telegram: true, push: true },
        });
      }
    }

    // 1b) On-event watchlists — owner-defined cadence="on_event" lists get an
    // immediate single-event mini-digest for warning+critical signals.
    try {
      await notifyOnEventWatchlists(event);
    } catch (err) {
      console.warn("[alerts:on_event_watchlists]", err);
    }

    // 2) Custom rules
    const rules = await storage.listAlertRules({ isActive: true });
    for (const rule of rules) {
      try {
        if (isRuleMuted(rule.id)) continue;
        if (!evaluate(rule.conditionDsl, { event, startup })) continue;

        const userIds: string[] = [];
        if (rule.ownerType === "user") {
          userIds.push(rule.ownerId);
        } else if (rule.ownerType === "company") {
          // Notify all admins/members of the owning company
          const cu = await (storage as any).getCompanyUsers?.(rule.ownerId);
          if (Array.isArray(cu)) {
            for (const u of cu) if (u.userId) userIds.push(u.userId);
          }
        }
        if (userIds.length === 0) continue;

        const channels = (rule.deliveryChannels ?? ["inApp"]) as string[];
        await deliverAlert({
          userIds,
          type: "alert_custom_rule",
          severity: (event.severity as any) ?? "info",
          category: "alert",
          title: `Rule "${rule.name}" matched`,
          content: event.title
            ? `${event.title}\n${event.summary ?? ""}`
            : `${event.eventType} on ${startup?.name ?? "—"}`,
          linkUrl: event.url || (event.startupId ? `/startups/${event.startupId}` : undefined),
          relatedId: rule.id,
          channels: {
            inApp: channels.includes("inApp"),
            email: channels.includes("email"),
            telegram: channels.includes("telegram"),
            push: channels.includes("push"),
          },
        });
      } catch (err) {
        console.warn(`[alerts:rule:${rule.id}]`, err);
      }
    }
  } catch (err) {
    console.warn("[alerts:dispatch]", err);
  }
}
