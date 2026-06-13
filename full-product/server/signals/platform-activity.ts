import { storage } from "../storage";
import type { SignalEventSeverity } from "@shared/schema";

/**
 * Group 6 — platform activity helper.
 *
 * Bridges in-app founder actions (logins, edits, uploads, etc.) to:
 *   1. `signal_events` — so the vitality score actually moves on real platform
 *      usage instead of sitting at the 35 baseline forever.
 *   2. `startups.last_activity_at` — drives the active/inactive flag (a startup
 *      is "inactive" once nothing — founder action OR integrated source — has
 *      touched it for STARTUP_INACTIVITY_DAYS).
 *
 * Events are deduped per (startup, eventType, day) so a chatty UI doesn't spam
 * the score with hundreds of duplicate +1s.
 */

function dayKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

export async function touchStartupActivity(startupId: string, when: Date = new Date()): Promise<void> {
  try {
    await storage.touchStartupActivity(startupId, when);
  } catch (err) {
    console.error("[platform-activity] touch failed", startupId, err);
  }
}

export async function recordPlatformEvent(opts: {
  startupId: string;
  eventType: string;
  severity?: SignalEventSeverity;
  title?: string;
  summary?: string;
  occurredAt?: Date;
}): Promise<void> {
  const occurredAt = opts.occurredAt ?? new Date();
  const dedupeHash = `platform-events:${opts.startupId}:${opts.eventType}:${dayKey(occurredAt)}`;
  try {
    await storage.recordSignalEvent({
      startupId: opts.startupId,
      sourceKey: "platform-events",
      eventType: opts.eventType,
      severity: opts.severity ?? "info",
      title: opts.title ?? null,
      summary: opts.summary ?? null,
      occurredAt,
      dedupeHash,
      payload: null,
      url: null,
    } as any);
  } catch (err) {
    console.error("[platform-activity] recordSignalEvent failed", opts.eventType, err);
  }
  // recordSignalEvent already calls touchStartupActivity, so no second update.
}

/**
 * Called from the login flow. For every startup the user is a member of, we
 * (a) bump lastActivityAt and (b) emit a once-per-day positive
 * "platform.founder_login" event into signal_events so the vitality score
 * reflects continued founder engagement.
 */
export async function recordFounderLogin(userId: string): Promise<void> {
  try {
    const memberships = await storage.getUserStartups(userId);
    for (const m of memberships) {
      const startupId = m?.startup?.id ?? m?.startupId;
      if (!startupId) continue;
      await recordPlatformEvent({
        startupId,
        eventType: "platform.founder_login",
        severity: "positive",
        title: "Founder logged in",
      });
    }
  } catch (err) {
    console.error("[platform-activity] recordFounderLogin failed", userId, err);
  }
}

/**
 * Called from any authenticated mutating route that targets a startup the
 * caller belongs to. Emits a once-per-day positive "platform.founder_action"
 * event and bumps lastActivityAt.
 */
export async function recordFounderAction(opts: {
  userId: string;
  startupId: string;
  action: string;
}): Promise<void> {
  try {
    // Make sure the user is actually a member of this startup before crediting.
    const memberships = await storage.getUserStartups(opts.userId);
    const isMember = memberships.some((m: any) => (m?.startup?.id ?? m?.startupId) === opts.startupId);
    if (!isMember) return;
    await recordPlatformEvent({
      startupId: opts.startupId,
      eventType: "platform.founder_action",
      severity: "positive",
      title: `Founder action: ${opts.action}`,
    });
  } catch (err) {
    console.error("[platform-activity] recordFounderAction failed", opts.action, err);
  }
}
