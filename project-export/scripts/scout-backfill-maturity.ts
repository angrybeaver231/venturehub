/**
 * One-shot backfill — re-evaluates every existing proto_startup against:
 *   - the brand blacklist (`isBlacklisted`)
 *   - the maturity check (`runMaturityCheck` over batches of 50)
 *
 * Nothing is deleted; clusters are only flipped to `blacklisted` /
 * `too_mature`. Re-running is safe.
 *
 * Run with:
 *   npx tsx scripts/scout-backfill-maturity.ts
 */

import "dotenv/config";
import { db } from "../server/db";
import { protoStartups } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { isBlacklisted, seedBlacklistIfEmpty } from "../server/scout/blacklist";
import { runMaturityCheck } from "../server/scout/maturity-check";

async function main() {
  console.log("[backfill] ensuring blacklist is seeded...");
  await seedBlacklistIfEmpty();

  console.log("[backfill] scanning all clusters for blacklist hits...");
  const all = await db.select().from(protoStartups);
  console.log(`[backfill] total clusters: ${all.length}`);

  let blacklisted = 0;
  for (const c of all) {
    const bl = await isBlacklisted({ domain: c.domain, companyName: c.canonicalName });
    if (bl.blocked && c.clusterStatus !== "blacklisted") {
      await db.update(protoStartups).set({
        clusterStatus: "blacklisted",
        isBlacklisted: true,
        excludedReason: `${bl.matchedBy} (${bl.reason || ""})`.trim(),
      }).where(eq(protoStartups.id, c.id));
      blacklisted++;
    }
  }
  console.log(`[backfill] flipped ${blacklisted} clusters to 'blacklisted'`);

  console.log("[backfill] running maturity-check in batches of 50 until exhausted...");
  let totalScanned = 0;
  let totalBlocked = 0;
  // Force re-check by clearing checked_at on remaining active rows.
  await db.execute(sql`
    UPDATE proto_startups
    SET maturity_flags = COALESCE(maturity_flags, '{}'::jsonb) - 'checked_at'
    WHERE cluster_status IN ('active', 'promoted_lead')
  `);
  for (let i = 0; i < 200; i++) {
    const r = await runMaturityCheck(50);
    totalScanned += r.scanned;
    totalBlocked += r.blocked;
    if (r.scanned < 50) break;
  }
  console.log(`[backfill] maturity-check scanned=${totalScanned} blocked=${totalBlocked}`);

  // Summary.
  const summary: any = await db.execute(sql`
    SELECT cluster_status, COUNT(*)::int AS n
    FROM proto_startups
    GROUP BY cluster_status
    ORDER BY n DESC
  `);
  console.log("[backfill] final cluster_status histogram:");
  for (const row of summary.rows || []) {
    console.log(`  ${row.cluster_status.padEnd(20)} ${row.n}`);
  }
  console.log("[backfill] done.");
  process.exit(0);
}

main().catch((err) => {
  console.error("[backfill] failed:", err);
  process.exit(1);
});
