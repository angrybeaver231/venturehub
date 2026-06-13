import cron, { ScheduledTask } from "node-cron";
import { storage } from "../storage";
import { getAllIngestors, getIngestor } from "./registry";
import { computeVitality } from "./scoring";
import { DEFAULT_VITALITY_WEIGHTS } from "@shared/schema";

const tasks = new Map<string, ScheduledTask>();

type JobHandler = (jobName: string) => Promise<void>;
const handlers = new Map<string, JobHandler>();

export function registerJobHandler(name: string, handler: JobHandler): void {
  handlers.set(name, handler);
}

handlers.set("runAllLightSources", async () => {
  // Skip sources that have their own per-source cron job to avoid double-runs.
  const allJobs = await storage.getAllCronJobs();
  const ownScheduledKeys = new Set(
    allJobs
      .filter((j) => j.handler === "runSource")
      .map((j) => j.jobName.replace(/^source:/, "")),
  );
  for (const ingestor of getAllIngestors()) {
    if (ingestor.category === "internal") continue;
    if (ownScheduledKeys.has(ingestor.sourceKey)) continue;
    try {
      await ingestor.run();
    } catch (err) {
      console.error(`[scheduler] runAllLightSources ${ingestor.sourceKey}:`, err);
    }
  }
});

handlers.set("runAllHeavySources", async () => {
  for (const ingestor of getAllIngestors()) {
    try {
      await ingestor.run();
    } catch (err) {
      console.error(`[scheduler] runAllHeavySources ${ingestor.sourceKey}:`, err);
    }
  }
});

handlers.set("runSource", async (jobName) => {
  const sourceKey = jobName.replace(/^source:/, "");
  const ingestor = getIngestor(sourceKey);
  if (!ingestor) return;
  await ingestor.run();
});

handlers.set("extractMilestonesNightly", async () => {
  const { extractMilestonesForAllStartups } = await import("./milestone-extractor");
  await extractMilestonesForAllStartups();
});

/**
 * Group 6 — recompute the vitality score snapshot for every startup.
 * Pure: reads `signal_events` + `signal_sources` and writes `vitality_scores`.
 */
handlers.set("recomputeVitality", async () => {
  const [startups, sources, allEvents] = await Promise.all([
    storage.getStartups(),
    storage.getAllSignalSources(),
    storage.getAllSignalEvents(),
  ]);
  const eventsByStartup = new Map<string, typeof allEvents>();
  for (const ev of allEvents) {
    if (!ev.startupId) continue;
    const arr = eventsByStartup.get(ev.startupId) ?? [];
    arr.push(ev);
    eventsByStartup.set(ev.startupId, arr);
  }
  const now = new Date();
  for (const startup of startups) {
    const events = eventsByStartup.get(startup.id) ?? [];
    const result = computeVitality(events, sources, DEFAULT_VITALITY_WEIGHTS, now);
    await storage.insertVitalityScore({
      startupId: startup.id,
      score: result.composite,
      subscores: result.subscores,
      computedAt: now,
      isLatest: true,
    });
  }
  // After all snapshots are written, materialise per-vertical industry
  // benchmarks so request-time reads do not need to recompute them. We store
  // them under a synthetic startupId-less row in `vitality_scores` is not
  // appropriate; instead the cache lives in-process.
  await refreshVitalityBenchmarkCache();
});

// In-memory cache of per-vertical benchmark distributions, refreshed nightly
// by `recomputeVitality` and on-demand if stale (>26h). Read by API handlers
// to avoid recomputing percentile populations on every request.
type BenchmarkSnapshot = {
  vertical: string;
  composites: number[];
  subscores: Record<string, number[]>;
};
const benchmarkCache = new Map<string, BenchmarkSnapshot>();
let benchmarkCacheRefreshedAt = 0;

export function getBenchmarkCache(): { snapshots: Map<string, BenchmarkSnapshot>; refreshedAt: number } {
  return { snapshots: benchmarkCache, refreshedAt: benchmarkCacheRefreshedAt };
}

export async function refreshVitalityBenchmarkCache(): Promise<void> {
  const startups = await storage.getStartups();
  const scores = await storage.getLatestVitalityScoresForStartups(startups.map((s) => s.id));
  const scoreById = new Map(scores.map((s) => [s.startupId, s] as const));
  benchmarkCache.clear();
  for (const s of startups) {
    if (!s.vertical) continue;
    const snap = benchmarkCache.get(s.vertical) ?? {
      vertical: s.vertical,
      composites: [],
      subscores: { tech_activity: [], team_health: [], market_presence: [], financial_health: [], legal_hygiene: [] },
    };
    const sc = scoreById.get(s.id);
    if (sc) {
      snap.composites.push(sc.score);
      const subs = sc.subscores as Record<string, unknown> | null;
      if (subs && typeof subs === "object") {
        for (const cat of Object.keys(snap.subscores)) {
          const v = subs[cat];
          if (typeof v === "number" && Number.isFinite(v)) snap.subscores[cat].push(v);
        }
      }
    }
    benchmarkCache.set(s.vertical, snap);
  }
  benchmarkCacheRefreshedAt = Date.now();
}

handlers.set("runEventVerificationSweep", async () => {
  const { runVerificationSweep } = await import("./event-verification");
  await runVerificationSweep(200);
});

handlers.set("runTelegramDailyAggregator", async () => {
  const ingestor = getIngestor("telegram-workspace");
  if (!ingestor) return;
  await ingestor.run();
});


export async function runJobByName(jobName: string): Promise<void> {
  const job = await storage.getCronJobByName(jobName);
  if (!job) {
    throw new Error(`Unknown cron job: ${jobName}`);
  }
  if (job.isPaused) {
    return;
  }
  const handler = handlers.get(job.handler);
  if (!handler) {
    throw new Error(`No handler registered for: ${job.handler}`);
  }
  await storage.markCronJobStarted(job.id);
  try {
    await handler(job.jobName);
    await storage.markCronJobFinished(job.id, "ok", null);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await storage.markCronJobFinished(job.id, "error", message);
    throw err;
  }
}

export async function startScheduler(): Promise<void> {
  for (const task of Array.from(tasks.values())) task.stop();
  tasks.clear();

  const jobs = await storage.getAllCronJobs();
  for (const job of jobs) {
    if (job.isPaused) continue;
    if (!cron.validate(job.schedule)) {
      console.warn(`[scheduler] invalid schedule for ${job.jobName}: ${job.schedule}`);
      continue;
    }
    const task = cron.schedule(job.schedule, () => {
      runJobByName(job.jobName).catch((err) =>
        console.error(`[scheduler] ${job.jobName} failed:`, err),
      );
    });
    tasks.set(job.jobName, task);
  }
  console.log(`[scheduler] registered ${tasks.size} cron jobs`);
}

const DEFAULT_JOBS = [
  {
    jobName: "light-ingest-15m",
    schedule: "*/15 * * * *",
    handler: "runAllLightSources",
    description: "Run every light/in-process signal source every 15 minutes",
    isHeavy: false,
  },
  {
    jobName: "extract-milestones-daily",
    schedule: "0 3 * * *",
    handler: "extractMilestonesNightly",
    description: "Nightly LLM pass that clusters recent signal_events into milestones (Group 7)",
    isHeavy: false,
  },
  {
    jobName: "financials-aggregate-daily",
    schedule: "0 4 * * *",
    handler: "runFinancialsAggregator",
    description: "Daily housekeeping for startup_financials snapshots (Group 4)",
    isHeavy: false,
  },
  {
    jobName: "vitality-recompute-nightly",
    schedule: "30 3 * * *",
    handler: "recomputeVitality",
    description: "Group 6 — recompute the vitality score for every startup nightly at 03:30",
    isHeavy: false,
  },
  // --- Group 1 per-source schedules (Task #20) ---
  // News & media — 15 min
  { jobName: "source:news-press",         schedule: "*/15 * * * *", handler: "runSource", description: "Yandex News mentions per startup",       isHeavy: false },
  { jobName: "source:media-mentions",     schedule: "*/15 * * * *", handler: "runSource", description: "Tech media RSS mentions",                isHeavy: false },
  // GitHub — hourly
  { jobName: "source:github-public",      schedule: "0 * * * *",   handler: "runSource", description: "Public GitHub repo activity",            isHeavy: false },
  // Telegram + HH — every 30 min
  { jobName: "source:telegram-public",    schedule: "*/30 * * * *", handler: "runSource", description: "Telegram channel snapshot",              isHeavy: false },
  { jobName: "source:hh-vacancies",       schedule: "*/30 * * * *", handler: "runSource", description: "HH.ru open vacancies",                   isHeavy: false },
  // Daily probes
  { jobName: "source:website-heartbeat",  schedule: "0 6 * * *",   handler: "runSource", description: "Daily uptime/SSL probe",                 isHeavy: false },
  { jobName: "source:app-stores-watcher", schedule: "0 7 * * *",   handler: "runSource", description: "Daily app store snapshot",               isHeavy: false },
  { jobName: "source:tender-watcher",     schedule: "0 8 * * *",   handler: "runSource", description: "Daily zakupki.gov.ru poll",              isHeavy: false },
  { jobName: "source:domain-dns",         schedule: "30 8 * * *",  handler: "runSource", description: "Daily crt.sh + MX scan",                 isHeavy: false },
  { jobName: "source:accelerator-crawler",schedule: "0 9 * * *",   handler: "runSource", description: "Daily accelerator portfolio crawl",     isHeavy: false },
  { jobName: "source:conference-tracker", schedule: "30 9 * * *",  handler: "runSource", description: "Daily conference agenda crawl",         isHeavy: false },
  // Weekly registries
  { jobName: "source:egrul-watcher",      schedule: "0 4 * * 1",   handler: "runSource", description: "Weekly ЕГРЮЛ registry watch",           isHeavy: false },
  { jobName: "source:fns-debt",           schedule: "30 4 * * 1",  handler: "runSource", description: "Weekly ФНС debt snapshot",               isHeavy: false },
  { jobName: "source:kontur-fokus",       schedule: "0 5 * * 1",   handler: "runSource", description: "Weekly Контур.Фокус pull",               isHeavy: true  },
  { jobName: "source:kad-arbitr",         schedule: "30 5 * * 1",  handler: "runSource", description: "Weekly arbitration cases",               isHeavy: false },
  {
    jobName: "event-verification-nightly",
    schedule: "0 4 * * *",
    handler: "runEventVerificationSweep",
    description: "Group 7.4 — LLM cross-source corroboration sweep over recent signal events",
    isHeavy: false,
  },
  {
    jobName: "telegram-daily-aggregate",
    schedule: "5 0 * * *",
    handler: "runTelegramDailyAggregator",
    description: "Roll up per-chat per-day Telegram metadata into team_chat_health signal events",
    isHeavy: false,
  },
];

export async function ensureDefaultCronJobs(): Promise<void> {
  for (const job of DEFAULT_JOBS) {
    const existing = await storage.getCronJobByName(job.jobName);
    if (!existing) {
      await storage.createCronJob({
        jobName: job.jobName,
        schedule: job.schedule,
        handler: job.handler,
        description: job.description,
        isHeavy: job.isHeavy,
        isPaused: false,
      });
    }
  }
}
