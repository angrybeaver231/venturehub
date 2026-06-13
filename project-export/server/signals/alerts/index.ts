import { registerJobHandler } from "../scheduler";
import { runFounderPulseCron } from "./founderPulse";
import { runInconsistencyCron } from "./inconsistency";
import { runWatchlistDigestsForCadence } from "./watchlistDigest";

// Negative-signal "scan" handler — the dispatcher already fires immediately on
// recordEvent, so this 5-min cron is a safety-net that just guarantees the job
// row stays green and could be extended to scan back-filled events.
registerJobHandler("runNegativeSignalsScan", async () => {
  // No-op safety net: dispatch already happens at insert time.
  // Reserved for future back-fill scans.
});

registerJobHandler("runFounderPulseCron", async () => {
  await runFounderPulseCron();
});

registerJobHandler("runInconsistencyCron", async () => {
  await runInconsistencyCron();
});

registerJobHandler("runWatchlistDigestsCron", async () => {
  await runWatchlistDigestsForCadence("weekly");
});

registerJobHandler("runWatchlistDigestsDailyCron", async () => {
  await runWatchlistDigestsForCadence("daily");
});

export const ALERT_DEFAULT_JOBS = [
  {
    jobName: "negative-signals-5m",
    schedule: "*/5 * * * *",
    handler: "runNegativeSignalsScan",
    description: "Negative signal back-fill scan (dispatch is live; this is the safety net)",
    isHeavy: false,
  },
  {
    jobName: "watchlist-digest-weekly",
    schedule: "0 6 * * 1", // Monday 06:00 UTC = 09:00 MSK
    handler: "runWatchlistDigestsCron",
    description: "Investor watchlist weekly digest (Monday 09:00 MSK) — for cadence='weekly'",
    isHeavy: true,
  },
  {
    jobName: "watchlist-digest-daily",
    schedule: "0 7 * * *", // Daily 07:00 UTC = 10:00 MSK
    handler: "runWatchlistDigestsDailyCron",
    description: "Investor watchlist daily digest (10:00 MSK) — for cadence='daily'",
    isHeavy: false,
  },
  {
    jobName: "founder-pulse-daily",
    schedule: "0 7 * * *",
    handler: "runFounderPulseCron",
    description: "Daily founder pulse recompute + transition alerts",
    isHeavy: false,
  },
  {
    jobName: "inconsistency-nightly",
    schedule: "0 3 * * *",
    handler: "runInconsistencyCron",
    description: "Nightly anti-fraud inconsistency detector",
    isHeavy: false,
  },
];
