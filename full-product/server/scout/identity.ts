import crypto from "crypto";
import { db } from "../db";
import { personIdentities } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

/**
 * Person-identity layer. Same human shows up across tg/github/twitter — we
 * collapse them into one canonical row keyed by `personKey`.
 *
 * Lookup strategy: any of (tgUserId | githubLogin | twitterHandle | emailHash)
 * is enough to merge — they are sparse but globally unique within their domain.
 */

export interface IdentityHints {
  tgUserId?: string | null;
  tgUsername?: string | null;
  githubLogin?: string | null;
  twitterHandle?: string | null;
  emailHash?: string | null;
  displayName?: string | null;
  domain?: string | null;
}

function newPersonKey(hints: IdentityHints): string {
  // Prefer a stable identifier so the key is reproducible across reboots.
  const seed =
    hints.tgUserId ||
    hints.githubLogin ||
    hints.twitterHandle ||
    hints.emailHash ||
    hints.tgUsername ||
    crypto.randomUUID();
  return "p_" + crypto.createHash("sha1").update(seed).digest("hex").slice(0, 16);
}

/** Find existing identity that overlaps with these hints. Returns null if none. */
export async function findIdentity(hints: IdentityHints): Promise<string | null> {
  const conds: string[] = [];
  const params: any[] = [];
  if (hints.tgUserId) { params.push(hints.tgUserId); conds.push(`${hints.tgUserId} = ANY(tg_user_ids)`); }
  if (hints.githubLogin) { params.push(hints.githubLogin); conds.push(`'${hints.githubLogin.replace(/'/g, "''")}' = ANY(github_logins)`); }
  if (hints.twitterHandle) { params.push(hints.twitterHandle); conds.push(`'${hints.twitterHandle.replace(/'/g, "''")}' = ANY(twitter_handles)`); }
  if (hints.emailHash) { params.push(hints.emailHash); conds.push(`'${hints.emailHash.replace(/'/g, "''")}' = ANY(email_hashes)`); }
  if (!conds.length) return null;
  const rows: any = await db.execute(
    sql.raw(`SELECT person_key FROM person_identities WHERE ${conds.join(" OR ")} LIMIT 1`),
  );
  return rows.rows?.[0]?.person_key || null;
}

/** Upsert an identity from a new signal. Returns the personKey. */
export async function upsertIdentity(hints: IdentityHints): Promise<string | null> {
  const hasAnything =
    hints.tgUserId || hints.githubLogin || hints.twitterHandle ||
    hints.emailHash || hints.tgUsername;
  if (!hasAnything) return null;

  const existingKey = await findIdentity(hints);
  if (existingKey) {
    await mergeFields(existingKey, hints);
    return existingKey;
  }

  const personKey = newPersonKey(hints);
  await db.insert(personIdentities).values({
    personKey,
    tgUserIds: hints.tgUserId ? [hints.tgUserId] : [],
    githubLogins: hints.githubLogin ? [hints.githubLogin] : [],
    twitterHandles: hints.twitterHandle ? [hints.twitterHandle] : [],
    emailHashes: hints.emailHash ? [hints.emailHash] : [],
    domainsOwned: hints.domain ? [hints.domain] : [],
    displayNames: hints.displayName ? [hints.displayName] : [],
  }).onConflictDoNothing();
  return personKey;
}

async function mergeFields(personKey: string, hints: IdentityHints): Promise<void> {
  // Postgres array_append + dedup via a SET expression. We use a SQL CASE so a
  // null hint is a no-op for that column.
  const merges: string[] = [];
  if (hints.tgUserId) merges.push(`tg_user_ids = (SELECT array(SELECT DISTINCT unnest(tg_user_ids || ARRAY['${hints.tgUserId}'])))`);
  if (hints.githubLogin) merges.push(`github_logins = (SELECT array(SELECT DISTINCT unnest(github_logins || ARRAY['${hints.githubLogin.replace(/'/g, "''")}'])))`);
  if (hints.twitterHandle) merges.push(`twitter_handles = (SELECT array(SELECT DISTINCT unnest(twitter_handles || ARRAY['${hints.twitterHandle.replace(/'/g, "''")}'])))`);
  if (hints.emailHash) merges.push(`email_hashes = (SELECT array(SELECT DISTINCT unnest(email_hashes || ARRAY['${hints.emailHash}'])))`);
  if (hints.displayName) merges.push(`display_names = (SELECT array(SELECT DISTINCT unnest(display_names || ARRAY['${hints.displayName.replace(/'/g, "''")}'])))`);
  if (hints.domain) merges.push(`domains_owned = (SELECT array(SELECT DISTINCT unnest(domains_owned || ARRAY['${hints.domain.replace(/'/g, "''")}'])))`);
  merges.push(`last_seen_at = now()`);
  await db.execute(sql.raw(
    `UPDATE person_identities SET ${merges.join(", ")} WHERE person_key = '${personKey}'`,
  ));
}

/** Bump credibility score for a person (signal observed = +0.5, max 100). */
export async function bumpCredibility(personKey: string, delta: number): Promise<void> {
  await db.execute(sql.raw(
    `UPDATE person_identities
     SET credibility_score = LEAST(100, GREATEST(0, COALESCE(credibility_score,0)::numeric + ${delta}))
     WHERE person_key = '${personKey}'`,
  ));
}
