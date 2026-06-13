import { db } from "../db";
import { protoStartups, founderSignals, rawObservations } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

/**
 * Maturity-check job for the Pre-Revenue Discovery Engine.
 *
 * Picks ≤ batchSize active clusters whose maturity has never been checked
 * (or was checked more than 30 days ago) and tries to enrich them with:
 *
 *   - domain age   ← RDAP (rdap.org) — public, ~1 RPS limit
 *   - employee est ← count(distinct contributors) over the cluster's
 *                    GitHub-collector signals from the last 12 months
 *   - company age  ← TODO: requires ИНН + ЕГРЮЛ; left as a stub field that
 *                    the EGRUL collector can fill once it's wired up.
 *   - revenue      ← TODO: requires ФНС reporting; only applied if the data
 *                    is available (false positives are worse than false
 *                    negatives here).
 *
 * After enrichment the cluster is flipped to `cluster_status = 'too_mature'`
 * and `maturity_flags.blocked_by` is populated when ANY of:
 *   - companyAgeYears > 5
 *   - domainAgeYears  > 5  (and companyAgeYears not known to be smaller)
 *   - employeeCountEstimate > 50
 *   - annualRevenueRub > 100_000_000
 *
 * Idempotent — re-running on an already-checked cluster within 30 days
 * is a no-op.
 */

const RDAP_TIMEOUT_MS = 7000;
const RDAP_CONCURRENCY = 2;
const STALE_AGE_DAYS = 30;

interface RdapResult {
  registeredAt: Date | null;
  source: "rdap";
}

async function fetchRdapRegistration(domain: string): Promise<RdapResult | null> {
  const url = `https://rdap.org/domain/${encodeURIComponent(domain)}`;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), RDAP_TIMEOUT_MS);
    const resp = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/rdap+json" },
    });
    clearTimeout(t);
    if (!resp.ok) return null;
    const json: any = await resp.json();
    const events: any[] = Array.isArray(json?.events) ? json.events : [];
    const reg = events.find((e) => String(e?.eventAction).toLowerCase() === "registration");
    if (!reg?.eventDate) return null;
    const d = new Date(reg.eventDate);
    if (isNaN(d.getTime())) return null;
    return { registeredAt: d, source: "rdap" };
  } catch {
    return null;
  }
}

function yearsBetween(then: Date, now: Date = new Date()): number {
  const ms = now.getTime() - then.getTime();
  return Math.round((ms / (365.25 * 24 * 3600 * 1000)) * 100) / 100;
}

async function estimateEmployeesFromGithub(protoId: string): Promise<number | null> {
  // Distinct resolved persons (person_key) attached to this cluster's GitHub
  // signals collected in the last 12 months. Crude but cheap.
  const since = new Date(Date.now() - 365 * 24 * 3600 * 1000);
  const rows: any = await db.execute(sql`
    SELECT COUNT(DISTINCT fs.person_key) AS contributors
    FROM founder_signals fs
    JOIN raw_observations r ON r.id = fs.raw_observation_id
    WHERE fs.proto_startup_id = ${protoId}
      AND r.collector LIKE 'github%'
      AND fs.person_key IS NOT NULL
      AND r.collected_at >= ${since.toISOString()}
  `);
  const n = Number(rows.rows?.[0]?.contributors ?? 0);
  return n > 0 ? n : null;
}

async function processCluster(c: typeof protoStartups.$inferSelect): Promise<{
  changed: boolean;
  blocked: boolean;
}> {
  const sources: Record<string, { value: any; source: string; checked_at: string }> = {
    ...((c.maturityFlags?.sources as any) || {}),
  };
  const now = new Date();

  let domainAgeYears: number | null = c.domainAgeYears == null ? null : Number(c.domainAgeYears);
  if (c.domain && domainAgeYears == null) {
    const r = await fetchRdapRegistration(c.domain);
    if (r?.registeredAt) {
      domainAgeYears = yearsBetween(r.registeredAt);
      sources["domain_age"] = {
        value: r.registeredAt.toISOString(),
        source: "rdap",
        checked_at: now.toISOString(),
      };
    } else {
      sources["domain_age"] = { value: null, source: "rdap", checked_at: now.toISOString() };
    }
  }

  let employeeCountEstimate: number | null = c.employeeCountEstimate ?? null;
  const ghEst = await estimateEmployeesFromGithub(c.id);
  if (ghEst != null) {
    employeeCountEstimate = ghEst;
    sources["employee_count"] = {
      value: ghEst,
      source: "github",
      checked_at: now.toISOString(),
    };
  }

  // company age + revenue: stubbed (require EGRUL/ФНС integrations).
  const companyAgeYears: number | null = c.companyAgeYears == null ? null : Number(c.companyAgeYears);
  const annualRevenueRub: number | null = c.annualRevenueRub ?? null;

  // Apply maturity rules.
  const blockedBy: string[] = [];
  if (companyAgeYears != null && companyAgeYears > 5) blockedBy.push(`company_age:${companyAgeYears}y`);
  if (domainAgeYears != null && domainAgeYears > 5 && (companyAgeYears == null || companyAgeYears > 5)) {
    blockedBy.push(`domain_age:${domainAgeYears}y`);
  }
  if (employeeCountEstimate != null && employeeCountEstimate > 50) {
    blockedBy.push(`employees:${employeeCountEstimate}`);
  }
  if (annualRevenueRub != null && annualRevenueRub > 100_000_000) {
    blockedBy.push(`revenue:${annualRevenueRub}`);
  }

  const tooMature = blockedBy.length > 0;
  const newStatus = tooMature ? "too_mature" : c.clusterStatus;

  await db.update(protoStartups).set({
    domainAgeYears: domainAgeYears == null ? null : domainAgeYears.toString(),
    employeeCountEstimate: employeeCountEstimate ?? null,
    companyAgeYears: companyAgeYears == null ? null : companyAgeYears.toString(),
    annualRevenueRub: annualRevenueRub ?? null,
    maturityFlags: {
      sources,
      blocked_by: blockedBy,
      checked_at: now.toISOString(),
    },
    clusterStatus: newStatus,
    excludedReason: tooMature ? blockedBy.join(", ") : c.excludedReason,
  }).where(eq(protoStartups.id, c.id));

  return { changed: true, blocked: tooMature };
}

/** Run a single batch. */
export async function runMaturityCheck(batchSize = 50): Promise<{
  scanned: number;
  blocked: number;
}> {
  // Pull clusters that are still in the "active feed" buckets and either
  // have never been checked or were checked > 30 days ago.
  const cutoff = new Date(Date.now() - STALE_AGE_DAYS * 24 * 3600 * 1000).toISOString();
  const rows = await db.select().from(protoStartups).where(sql`
    ${protoStartups.clusterStatus} IN ('active', 'promoted_lead')
    AND (
      ${protoStartups.maturityFlags} IS NULL
      OR (${protoStartups.maturityFlags}->>'checked_at') IS NULL
      OR (${protoStartups.maturityFlags}->>'checked_at')::timestamptz < ${cutoff}
    )
  `).limit(batchSize);

  let scanned = 0;
  let blocked = 0;
  // Bounded concurrency.
  for (let i = 0; i < rows.length; i += RDAP_CONCURRENCY) {
    const chunk = rows.slice(i, i + RDAP_CONCURRENCY);
    const results = await Promise.allSettled(chunk.map((c) => processCluster(c)));
    for (const r of results) {
      if (r.status === "fulfilled") {
        scanned++;
        if (r.value.blocked) blocked++;
      } else {
        scanned++;
        console.error("[scout/maturity] cluster failed:", r.reason);
      }
    }
  }
  if (scanned) console.log(`[scout/maturity] scanned=${scanned} blocked=${blocked}`);
  return { scanned, blocked };
}
