import { db } from "../db";
import {
  rawObservations,
  founderSignals,
  protoStartups,
  startupProfileFacts,
  personIdentities,
  scoutSourceWhitelist,
  scoutDoNotTrack,
  startups,
} from "@shared/schema";
import { eq, sql, and, or, inArray } from "drizzle-orm";
import { hashIdentifier } from "./pii";

/**
 * Privacy primitives. Required by the spec from the first commit:
 *   - Source whitelist check before any ingest.
 *   - do_not_track check before storing any identifier-bearing observation.
 *   - /api/scout/forget cascade.
 *   - Retention sweep (deletes raw_observations whose retention_until passed).
 */

export async function isSourceAllowed(collector: string, sourceIdentifier: string): Promise<boolean> {
  const [row] = await db.select().from(scoutSourceWhitelist).where(and(
    eq(scoutSourceWhitelist.collector, collector),
    eq(scoutSourceWhitelist.sourceIdentifier, sourceIdentifier),
  )).limit(1);
  if (!row) return false;
  return row.status !== "private-blocked";
}

/** Check if any identifier hint is on the do-not-track list. */
export async function isOnDoNotTrack(hints: {
  email?: string;
  tgUsername?: string;
  tgUserId?: string;
  githubLogin?: string;
  twitterHandle?: string;
  domain?: string;
}): Promise<boolean> {
  const checks: Array<{ type: string; value: string }> = [];
  if (hints.email) checks.push({ type: "email_hash", value: hashIdentifier(hints.email) });
  if (hints.tgUsername) checks.push({ type: "tg_username", value: hints.tgUsername.toLowerCase() });
  if (hints.tgUserId) checks.push({ type: "tg_user_id", value: hints.tgUserId });
  if (hints.githubLogin) checks.push({ type: "github_login", value: hints.githubLogin.toLowerCase() });
  if (hints.twitterHandle) checks.push({ type: "twitter_handle", value: hints.twitterHandle.toLowerCase() });
  if (hints.domain) checks.push({ type: "domain", value: hints.domain.toLowerCase() });
  if (!checks.length) return false;
  const conds = checks.map(
    (c) => sql`(${scoutDoNotTrack.identifierType} = ${c.type} AND ${scoutDoNotTrack.identifierValue} = ${c.value})`,
  );
  const [row] = await db.select().from(scoutDoNotTrack).where(or(...conds)!).limit(1);
  return !!row;
}

export async function addToDoNotTrack(input: {
  identifierType: string;
  identifierValue: string;
  reason?: string;
}): Promise<void> {
  await db.insert(scoutDoNotTrack).values({
    identifierType: input.identifierType,
    identifierValue: input.identifierValue.toLowerCase(),
    reason: input.reason || null,
  }).onConflictDoNothing();
}

/** /api/scout/forget — cascade delete every trace of this identifier. */
export async function forgetIdentifier(input: {
  identifierType: string;
  identifierValue: string;
}): Promise<{ rawDeleted: number; signalsDeleted: number; identitiesDeleted: number }> {
  const value = input.identifierValue.toLowerCase();
  // 1) Find all person_identities matching this identifier
  let identityKeys: string[] = [];
  const arrayCol: Record<string, string> = {
    email_hash: "email_hashes",
    tg_user_id: "tg_user_ids",
    tg_username: "display_names",
    github_login: "github_logins",
    twitter_handle: "twitter_handles",
    domain: "domains_owned",
  };
  const col = arrayCol[input.identifierType];
  let rawDeleted = 0;
  if (col) {
    // Whitelisted column name (not user input) — safe to interpolate as identifier.
    const r: any = await db.execute(
      sql`SELECT person_key FROM person_identities WHERE ${sql.raw(col)} @> ARRAY[${value}]::text[]`,
    );
    identityKeys = (r.rows || []).map((x: any) => x.person_key);
  }

  // 2) Find founder_signals tied to these person_keys, then cascade-delete
  //    raw_observations (which cascades founder_signals via FK).
  let signalIds: string[] = [];
  if (identityKeys.length) {
    const sigs = await db
      .select({ id: founderSignals.id, rawObservationId: founderSignals.rawObservationId })
      .from(founderSignals)
      .where(inArray(founderSignals.personKey, identityKeys));
    signalIds = sigs.map((s) => s.id);
    const rawIds = Array.from(new Set(sigs.map((s) => s.rawObservationId).filter(Boolean))) as string[];
    if (rawIds.length) {
      const del: any = await db
        .delete(rawObservations)
        .where(inArray(rawObservations.id, rawIds))
        .returning({ id: rawObservations.id });
      rawDeleted = Array.isArray(del) ? del.length : 0;
    }
    // Belt-and-suspenders: explicitly remove any founder_signals that survived
    // (e.g. if the FK was ever altered to SET NULL).
    if (signalIds.length) {
      await db.delete(founderSignals).where(inArray(founderSignals.id, signalIds));
    }
  }

  // 3) Delete the identities themselves (cascade not set — explicit)
  let identitiesDeleted = 0;
  if (identityKeys.length) {
    const r = await db
      .delete(personIdentities)
      .where(inArray(personIdentities.personKey, identityKeys))
      .returning({ k: personIdentities.personKey });
    identitiesDeleted = r.length;
  }

  // 4) Add to do_not_track so we don't re-ingest them tomorrow.
  await addToDoNotTrack({
    identifierType: input.identifierType,
    identifierValue: value,
    reason: "user-requested forget",
  });

  return {
    rawDeleted,
    signalsDeleted: signalIds.length,
    identitiesDeleted,
  };
}

/** Retention sweep — delete raw_observations whose retention_until has passed. */
export async function runRetentionSweep(): Promise<{ deleted: number }> {
  const result: any = await db.execute(sql.raw(
    `DELETE FROM raw_observations WHERE retention_until IS NOT NULL AND retention_until < now()`,
  ));
  return { deleted: Number(result.rowCount || 0) };
}
