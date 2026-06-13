import { db } from "../db";
import { scoutBlacklist } from "@shared/schema";
import { sql } from "drizzle-orm";
import { INITIAL_BLACKLIST } from "./blacklist-seed";

/**
 * Brand-blacklist gate for the Pre-Revenue Discovery Engine.
 *
 *   isBlacklisted({ domain, companyName, inn })
 *
 * is called from `clustering.ts` (before creating a proto_startup) and from
 * the `openai-web-discovery` collector (before recording an observation).
 *
 * Both inputs and stored values are normalised the same way so that
 * `Skyeng`, `СКАЙЭНГ`, `ООО "Skyeng"`, `https://www.skyeng.ru/`, and
 * `skyeng.ru` all collide on the same blacklist row.
 *
 * Results are cached in-memory for 10 minutes — the function is hit once per
 * raw observation, which during a "Find startups now" burst can be ~75 calls
 * in a few seconds. We cache positive AND negative results to keep DB load
 * negligible.
 */

// Two-letter "single-label" effective TLDs we know of. Any domain whose last
// two labels look like this should keep the *third* label (eTLD+1 = three
// labels). Everything else is two labels.
const MULTI_LABEL_TLDS = new Set([
  "co.uk", "com.ru", "org.uk", "co.jp", "co.kr", "com.au", "com.br",
  "com.ua", "com.cn", "co.il", "ac.uk", "gov.uk",
]);

const JURIDIC_RE = new RegExp(
  String.raw`^(ооо|ао|зао|пао|ип|нко|ано|оао|llc|ltd|inc|gmbh|sa|sarl|ооо\.|ao\.|oao\.|zao\.|pao\.|ip\.|llc\.|ltd\.|inc\.)\s+`,
  "i"
);

export function normaliseCompanyName(input: string): string {
  let s = input.normalize("NFKC").trim().toLowerCase();
  // Strip surrounding quotes / brackets / dashes.
  s = s.replace(/[«»"'`“”„‟()\[\]<>]/g, "");
  // Strip leading juridic prefix (one pass — covers most real cases).
  s = s.replace(JURIDIC_RE, "");
  // Strip trailing juridic suffix.
  s = s.replace(/\s+(llc|ltd|inc|gmbh|sa|sarl)\.?$/i, "");
  // Collapse whitespace.
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

export function normaliseDomain(input: string): string {
  let s = input.trim().toLowerCase();
  // Strip protocol + path so we can take a raw URL.
  s = s.replace(/^[a-z]+:\/\//, "");
  s = s.split("/")[0];
  s = s.split("?")[0];
  s = s.split("#")[0];
  // Strip leading www.
  s = s.replace(/^www\./, "");
  // Strip trailing dot, port.
  s = s.replace(/\.+$/, "").split(":")[0];
  if (!s) return "";
  // Reduce to eTLD+1.
  const labels = s.split(".");
  if (labels.length <= 2) return s;
  const last2 = labels.slice(-2).join(".");
  if (MULTI_LABEL_TLDS.has(last2)) {
    return labels.slice(-3).join(".");
  }
  return labels.slice(-2).join(".");
}

export function normaliseInn(input: string): string {
  return input.trim().replace(/\D+/g, "");
}

// ---------- 10-minute TTL cache ----------------------------------------------
type CacheValue = { blocked: boolean; reason?: string; matchedBy?: string };
const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { value: CacheValue; expiresAt: number }>();

function cacheGet(key: string): CacheValue | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}
function cachePut(key: string, value: CacheValue) {
  if (cache.size > 5000) cache.clear(); // crude bound
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

/** Test-only: drop all cached blacklist lookups. */
export function _resetBlacklistCache() {
  cache.clear();
}

// ---------- Public API -------------------------------------------------------

export interface BlacklistInput {
  domain?: string | null;
  companyName?: string | null;
  inn?: string | null;
  tgChannel?: string | null;
}

export async function isBlacklisted(
  input: BlacklistInput
): Promise<{ blocked: boolean; reason?: string; matchedBy?: string }> {
  const checks: Array<{ matchType: string; value: string }> = [];
  if (input.domain) {
    const v = normaliseDomain(input.domain);
    if (v) checks.push({ matchType: "domain", value: v });
  }
  if (input.companyName) {
    const v = normaliseCompanyName(input.companyName);
    if (v) checks.push({ matchType: "company_name", value: v });
  }
  if (input.inn) {
    const v = normaliseInn(input.inn);
    if (v) checks.push({ matchType: "inn", value: v });
  }
  if (input.tgChannel) {
    const v = input.tgChannel.trim().toLowerCase().replace(/^@/, "");
    if (v) checks.push({ matchType: "tg_channel", value: v });
  }
  if (!checks.length) return { blocked: false };

  const cacheKey = checks.map((c) => `${c.matchType}:${c.value}`).join("|");
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  // One round-trip — OR over all (matchType, value) tuples.
  const orFragments = checks.map(
    (c) => sql`(${scoutBlacklist.matchType} = ${c.matchType} AND ${scoutBlacklist.value} = ${c.value})`
  );
  // Compose with sql.join.
  const whereExpr = sql.join(orFragments, sql` OR `);
  const rows = await db.select().from(scoutBlacklist).where(whereExpr).limit(1);

  let result: CacheValue;
  if (rows.length) {
    const row = rows[0];
    result = {
      blocked: true,
      reason: row.reason || undefined,
      matchedBy: `${row.matchType}:${row.value}`,
    };
  } else {
    result = { blocked: false };
  }
  cachePut(cacheKey, result);
  return result;
}

/**
 * Idempotent seeder. Runs once at boot — if `scout_blacklist` is empty, copy
 * the curated INITIAL_BLACKLIST in. If admins have started managing it
 * manually, leave the existing rows alone.
 */
export async function seedBlacklistIfEmpty(): Promise<{ inserted: number; skipped: boolean }> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(scoutBlacklist);
  if (Number(count) > 0) {
    return { inserted: 0, skipped: true };
  }
  const rows = INITIAL_BLACKLIST.map((e) => ({
    matchType: e.matchType,
    value:
      e.matchType === "domain"
        ? normaliseDomain(e.value)
        : e.matchType === "company_name"
        ? normaliseCompanyName(e.value)
        : e.matchType === "inn"
        ? normaliseInn(e.value)
        : e.value.trim().toLowerCase().replace(/^@/, ""),
    reason: e.reason,
  }));
  // chunk to avoid massive single insert
  const CHUNK = 100;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const r = await db
      .insert(scoutBlacklist)
      .values(slice)
      .onConflictDoNothing()
      .returning({ id: scoutBlacklist.id });
    inserted += r.length;
  }
  console.log(`[scout/blacklist] seeded ${inserted} rows`);
  return { inserted, skipped: false };
}
