import { storage } from "../../storage";
import { sendEmail } from "../../emailService";
import { deliverAlert } from "./deliver";
import type { SignalEvent } from "@shared/schema";

const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;

type Cadence = "daily" | "weekly";

function windowMsForCadence(cadence: Cadence): number {
  return cadence === "daily" ? DAY : WEEK;
}

function escHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

const SEV_DOT: Record<string, string> = {
  critical: "background:#dc2626;",
  warning: "background:#d97706;",
  positive: "background:#16a34a;",
  info: "background:#6b7280;",
};

function renderDigestHtml(opts: { name: string; cadence: Cadence; sections: string[]; eventCount: number; startupCount: number }): string {
  const cadenceLabel = opts.cadence === "daily" ? "daily" : "every Monday 09:00 MSK";
  return `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;padding:20px;max-width:640px;color:#1a1a1a;">
      <div style="border-bottom:2px solid #0b3d91;padding-bottom:12px;margin-bottom:16px;">
        <h2 style="margin:0;color:#0b3d91;">Watchlist: ${escHtml(opts.name)}</h2>
        <p style="color:#666;margin:4px 0 0;font-size:13px;">
          ${opts.eventCount} new signal${opts.eventCount === 1 ? "" : "s"} across
          ${opts.startupCount} startup${opts.startupCount === 1 ? "" : "s"} · sent ${cadenceLabel}.
        </p>
      </div>
      ${opts.sections.join("")}
      <hr style="border:0;border-top:1px solid #e6e8ec;margin:20px 0 8px;"/>
      <p style="color:#888;font-size:11px;margin:0;">Ventorix · Watchlist Digest. Manage cadence at <a href="/watchlists" style="color:#0b3d91;">/watchlists</a>.</p>
    </div>`;
}

function renderSection(name: string, startupId: string, evs: SignalEvent[]): string {
  const items = evs.slice(0, 10).map((e) => {
    const date = e.occurredAt ? new Date(e.occurredAt).toISOString().slice(0, 10) : "";
    const sev = e.severity ?? "info";
    const dot = SEV_DOT[sev] ?? SEV_DOT.info;
    return `<li style="margin:4px 0;line-height:1.5;">
      <span style="display:inline-block;width:8px;height:8px;border-radius:50%;${dot}margin-right:6px;vertical-align:middle;"></span>
      <span style="color:#666;font-size:12px;">${date}</span>
      <span style="margin-left:6px;">${escHtml((e.title ?? e.eventType ?? "").toString())}</span>
    </li>`;
  }).join("");
  return `<h3 style="margin:18px 0 4px;font-size:14px;"><a href="/startups/${startupId}" style="color:#0b3d91;text-decoration:none;">${escHtml(name)}</a></h3><ul style="padding-left:18px;margin:4px 0;">${items}</ul>`;
}

async function sendDigestForList(args: {
  watchlistId: string;
  watchlistName: string;
  ownerUserId: string;
  cadence: Cadence;
  startupIds: string[];
  since: Date;
}): Promise<void> {
  const events = await storage.getSignalEventsSince(args.since, args.startupIds);
  if (events.length === 0) return;

  const byStartup = new Map<string, SignalEvent[]>();
  for (const e of events) {
    if (!e.startupId) continue;
    const arr = byStartup.get(e.startupId) ?? [];
    arr.push(e);
    byStartup.set(e.startupId, arr);
  }

  const sections: string[] = [];
  const textSections: string[] = [];
  for (const [startupId, evs] of Array.from(byStartup.entries())) {
    const startup = await storage.getStartup(startupId);
    const name = startup?.name ?? startupId;
    sections.push(renderSection(name, startupId, evs));
    textSections.push(`${name} (${evs.length} events)`);
  }

  const owner = await storage.getUser(args.ownerUserId);
  const subject = `${args.cadence === "daily" ? "Daily" : "Weekly"} watchlist digest: ${args.watchlistName}`;
  const html = renderDigestHtml({
    name: args.watchlistName,
    cadence: args.cadence,
    sections,
    eventCount: events.length,
    startupCount: byStartup.size,
  });
  const text = `${subject}\n\n${textSections.join("\n")}`;

  if (owner?.email) {
    try {
      await sendEmail({ to: [owner.email], subject, html, text });
    } catch (err) {
      console.warn("[alerts:digest:email]", err);
    }
  }
  await deliverAlert({
    userIds: [args.ownerUserId],
    type: "alert_watchlist_digest",
    severity: "info",
    category: "alert",
    title: subject,
    content: textSections.join("\n"),
    linkUrl: `/watchlists`,
    relatedId: args.watchlistId,
    channels: { inApp: true },
  });
}

// Cadence-aware digest cron. Called by `runDailyDigest` and `runWeeklyDigest`
// via `server/signals/alerts/index.ts`.
export async function runWatchlistDigestsForCadence(cadence: Cadence): Promise<void> {
  const since = new Date(Date.now() - windowMsForCadence(cadence));
  const lists = await storage.getAllWatchlistsWithStartups({ cadence });
  for (const wl of lists) {
    if (wl.startupIds.length === 0) continue;
    try {
      await sendDigestForList({
        watchlistId: wl.id,
        watchlistName: wl.name,
        ownerUserId: wl.userId,
        cadence,
        startupIds: wl.startupIds,
        since,
      });
    } catch (err) {
      console.warn(`[alerts:digest:${wl.id}]`, err);
    }
  }
}

// Backwards-compatible weekly entry point.
export async function runWatchlistDigestsCron(): Promise<void> {
  await runWatchlistDigestsForCadence("weekly");
}

// Per-user, per-event in-memory dedupe so that overlapping watchlists owned by
// the same user produce ONE alert per event (instead of one alert per matching
// watchlist). Bounded LRU; entries auto-evict when the cache exceeds its cap so
// memory cannot grow unboundedly. The cooldown also collapses an event that
// somehow re-arrives within the window. Restart-tolerant by design — losing
// state after a restart only means at-most-one redundant notification, which
// is acceptable.
const ON_EVENT_DEDUPE_TTL_MS = 6 * 60 * 60 * 1000; // 6h
const ON_EVENT_DEDUPE_MAX = 5000;
const onEventNotified = new Map<string, number>();
function onEventDedupeAndPrune(userId: string, eventId: string): boolean {
  const key = `${userId}:${eventId}`;
  const now = Date.now();
  const seen = onEventNotified.get(key);
  if (seen && now - seen < ON_EVENT_DEDUPE_TTL_MS) return false;
  if (onEventNotified.size >= ON_EVENT_DEDUPE_MAX) {
    // Drop the 10% oldest entries
    const cutoff = now - ON_EVENT_DEDUPE_TTL_MS;
    for (const [k, ts] of Array.from(onEventNotified.entries())) {
      if (ts < cutoff) onEventNotified.delete(k);
    }
    if (onEventNotified.size >= ON_EVENT_DEDUPE_MAX) {
      const sorted = Array.from(onEventNotified.entries()).sort((a, b) => a[1] - b[1]);
      for (let i = 0; i < Math.floor(ON_EVENT_DEDUPE_MAX * 0.1); i++) onEventNotified.delete(sorted[i][0]);
    }
  }
  onEventNotified.set(key, now);
  return true;
}

// Called by the alert dispatcher whenever a new warning/critical signal_event
// lands. For each watchlist with cadence="on_event" containing this startup,
// emit ONE single-event mini-digest per OWNER (collapsed across overlapping
// watchlists). The dispatcher already runs a separate critical-signal alert
// path for negative events, so we suppress emails when the dispatcher will
// already email; this surface is informational/in-app only by default and is
// gated behind explicit per-user dedupe to prevent notification storms.
export async function notifyOnEventWatchlists(event: SignalEvent): Promise<void> {
  if (!event.startupId) return;
  if (event.severity !== "warning" && event.severity !== "critical") return;
  const lists = await storage.getWatchlistsContainingStartup(event.startupId, { cadence: "on_event" });
  if (lists.length === 0) return;
  const startup = await storage.getStartup(event.startupId);
  const name = startup?.name ?? event.startupId;

  // Collapse to one notification per owning user (a user with three overlapping
  // watchlists containing this startup gets ONE alert, not three).
  const byOwner = new Map<string, typeof lists>();
  for (const wl of lists) {
    const arr = byOwner.get(wl.userId) ?? [];
    arr.push(wl);
    byOwner.set(wl.userId, arr);
  }

  for (const [userId, ownersLists] of Array.from(byOwner.entries())) {
    if (!onEventDedupeAndPrune(userId, event.id)) continue;
    const wl = ownersLists[0];
    const wlNames = ownersLists.map((l) => l.name).join(", ");
    try {
      const sevWord = event.severity === "critical" ? "Critical" : "Warning";
      const subject = `[${sevWord}] ${name}: ${event.title ?? event.eventType}`;
      // For critical events the dispatcher already runs the negative-signal
      // alert path (which sends email). We avoid double-emailing by sending
      // email here only for warning-level events. In-app delivery is always
      // sent because the dispatcher's negative-signal path emits a different
      // notification type and we want a watchlist-attributed in-app entry.
      if (event.severity === "warning") {
        const owner = await storage.getUser(userId);
        if (owner?.email) {
          try {
            const html = renderDigestHtml({
              name: wlNames,
              cadence: "daily",
              sections: [renderSection(name, event.startupId, [event])],
              eventCount: 1,
              startupCount: 1,
            });
            await sendEmail({ to: [owner.email], subject, html, text: `${subject}\n\n${event.summary ?? ""}` });
          } catch (err) {
            console.warn("[alerts:on_event:email]", err);
          }
        }
      }
      await deliverAlert({
        userIds: [userId],
        type: "alert_watchlist_event",
        severity: event.severity as any,
        category: "alert",
        title: subject,
        content: ownersLists.length > 1
          ? `${event.summary ?? event.title ?? event.eventType ?? ""}\n(matches watchlists: ${wlNames})`
          : event.summary ?? event.title ?? event.eventType ?? "",
        linkUrl: `/startups/${event.startupId}`,
        relatedId: wl.id,
        channels: { inApp: true },
      });
    } catch (err) {
      console.warn(`[alerts:on_event:${userId}]`, err);
    }
  }
}
