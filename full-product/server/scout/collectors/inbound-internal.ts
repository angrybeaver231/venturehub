import { db } from "../../db";
import {
  events,
  eventRegistrations,
  clubs,
  userClubMemberships as clubMembers,
  startups as startupsTable,
} from "@shared/schema";
import { eq, sql, gte, desc } from "drizzle-orm";
import { recordObservation } from "../ingest";

/**
 * Wave-1 collector: `inbound-internal`.
 *
 * Pulls signals from first-party TeamHub data — every new event registration,
 * every club join, every "tell us about your startup" landing-page submission —
 * and converts them into raw_observations.
 *
 * Spec: "Inbound signals — TeamHub events, club joins, landing form."
 *
 * `trustedSource: true` because this is our own database; no whitelist needed.
 * Retention is set to 365 days for inbound (per spec).
 */

const COLLECTOR = "inbound-internal";

let lastRunAt: Date | null = null;

export async function runInboundInternal(): Promise<{
  observations: number;
  skipped: number;
}> {
  const since = lastRunAt || new Date(Date.now() - 24 * 60 * 60 * 1000);
  const now = new Date();
  let observations = 0;
  let skipped = 0;

  // 1) New event registrations — most signal-rich source. Each registration
  //    means a real human is interested in a real event.
  let regs: any[] = [];
  try {
    regs = await db
      .select({
        id: eventRegistrations.id,
        eventId: eventRegistrations.eventId,
        userId: eventRegistrations.userId,
        registeredAt: eventRegistrations.registeredAt,
      })
      .from(eventRegistrations)
      .where(gte(eventRegistrations.registeredAt, since))
      .orderBy(desc(eventRegistrations.registeredAt))
      .limit(500);
  } catch {
    // Schema may differ; swallow and continue with the other branches.
  }

  for (const r of regs) {
    let evt: any = null;
    try {
      [evt] = await db.select().from(events).where(eq(events.id, r.eventId));
    } catch {
      // ignore
    }
    const text = evt
      ? `Event registration: ${evt.title || ""}. Description: ${evt.description || ""}`
      : `Event registration ${r.eventId}`;
    const result = await recordObservation({
      collector: COLLECTOR,
      sourceId: `eventreg:${r.id}`,
      sourceUrl: evt ? `/events/${evt.id}` : undefined,
      text,
      retentionDays: 365,
      trustedSource: true,
      extraPayload: {
        kind: "event_registration",
        eventId: r.eventId,
        userId: r.userId,
      },
    });
    if (result.ok && result.observation) observations++;
    else skipped++;
  }

  // 2) New club members — joining a startup-related club is a strong signal.
  let joins: any[] = [];
  try {
    joins = await db
      .select()
      .from(clubMembers)
      .where(gte(clubMembers.createdAt as any, since))
      .orderBy(desc(clubMembers.createdAt as any))
      .limit(500);
  } catch {
    // schema may not have joinedAt or table may differ
  }
  for (const j of joins) {
    let club: any = null;
    try {
      [club] = await db.select().from(clubs).where(eq(clubs.id, j.clubId));
    } catch {}
    const text = club
      ? `Club join: ${club.name || ""}. ${club.description || ""}`
      : `Club join ${j.clubId}`;
    const result = await recordObservation({
      collector: COLLECTOR,
      sourceId: `clubjoin:${j.id || `${j.clubId}:${j.userId}`}`,
      sourceUrl: club ? `/clubs/${club.slug || club.id}` : undefined,
      text,
      retentionDays: 365,
      trustedSource: true,
      extraPayload: { kind: "club_join", clubId: j.clubId, userId: j.userId },
    });
    if (result.ok && result.observation) observations++;
    else skipped++;
  }

  // 3) Newly created startups in our own DB (founders who self-registered) —
  //    we mirror them as observations so the discovery loop also runs over them.
  let newStartups: any[] = [];
  try {
    newStartups = await db
      .select()
      .from(startupsTable)
      .where(gte(startupsTable.createdAt, since))
      .orderBy(desc(startupsTable.createdAt))
      .limit(200);
  } catch {}
  for (const s of newStartups) {
    const text = `New startup: ${s.name}. ${s.description || ""}. Vertical: ${s.vertical || "n/a"}. Stage: ${s.stage || "n/a"}.`;
    const result = await recordObservation({
      collector: COLLECTOR,
      sourceId: `startup-self:${s.id}`,
      sourceUrl: `/startups/${s.id}`,
      text,
      retentionDays: 365,
      trustedSource: true,
      domainHint: s.website ? new URL(s.website).hostname : undefined,
      extraPayload: {
        kind: "self_registered_startup",
        startupId: s.id,
        vertical: s.vertical,
        stage: s.stage,
      },
    });
    if (result.ok && result.observation) observations++;
    else skipped++;
  }

  lastRunAt = now;
  return { observations, skipped };
}
