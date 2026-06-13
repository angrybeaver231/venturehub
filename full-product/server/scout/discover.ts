import { runOpenAiDiscovery } from "./collectors/openai-web-discovery";
import { runTgPublicChannels } from "./collectors/tg-public-channels";
import { runGithubTrending } from "./collectors/github-trending";
import { runClassificationBatch } from "./ingest";
import { runClusterUpdate } from "./clustering";
import { runProfileBuilder } from "./profile-builder";
import { runScoreRecompute } from "./scoring";

/**
 * "Find startups now" orchestrator — invoked by the admin button on
 * /admin/scout. Runs the selected discovery collectors in parallel, then
 * walks the rest of the pipeline (classify → cluster → profile → score)
 * synchronously so the user sees fresh proto-startups in a single click.
 */

export interface DiscoverRequest {
  verticals?: string[];
  region?: string;
  keywords?: string;
  count?: number;
  useOpenAi?: boolean;
  useTelegram?: boolean;
  useGithub?: boolean;
}

export interface DiscoverResult {
  sources: Record<string, any>;
  classify: { classified: number; irrelevant: number; failed: number; signals: number };
  cluster: { clustered: number; created: number };
  profile: { clusters: number; facts: number };
  score: { updated: number };
}

export async function runDiscoverNow(req: DiscoverRequest = {}): Promise<DiscoverResult> {
  const useOpenAi = req.useOpenAi ?? true;
  const useTelegram = req.useTelegram ?? true;
  const useGithub = req.useGithub ?? true;

  const tasks: Array<{ label: string; run: () => Promise<any> }> = [];
  if (useOpenAi) {
    tasks.push({
      label: "openai",
      run: () =>
        runOpenAiDiscovery({
          verticals: req.verticals,
          region: req.region,
          keywords: req.keywords,
          count: req.count,
        }),
    });
  }
  if (useTelegram) {
    tasks.push({ label: "telegram", run: () => runTgPublicChannels() });
  }
  if (useGithub) {
    tasks.push({
      label: "github",
      run: () => runGithubTrending({ topics: req.verticals, count: req.count }),
    });
  }

  const settled = await Promise.allSettled(tasks.map((t) => t.run()));
  const sources: Record<string, any> = {};
  let totalObservations = 0;
  settled.forEach((s, i) => {
    const label = tasks[i].label;
    if (s.status === "fulfilled") {
      sources[label] = s.value;
      totalObservations += Number((s.value as any)?.observations ?? 0);
    } else {
      sources[label] = { error: String(s.reason?.message || s.reason) };
    }
  });

  // Drain the pipeline. We deliberately bound the synchronous batch so a
  // single admin click returns in well under a minute even at the maximum
  // count=25 × 3 sources = 75 observations. `runClassificationBatch` makes
  // ~2 OpenAI calls per observation sequentially, so 30 items ≈ ~60s worst
  // case. Anything beyond that is left for the `scout-classify-10m` cron.
  const SYNC_CAP = 30;
  const classifyBatch = Math.min(SYNC_CAP, Math.max(1, totalObservations));
  const classify = classifyBatch
    ? await runClassificationBatch(classifyBatch)
    : { classified: 0, irrelevant: 0, failed: 0, signals: 0 };
  const cluster = await runClusterUpdate(Math.max(20, classify.signals + 5));
  const profile = await runProfileBuilder();
  const score = await runScoreRecompute();

  return { sources, classify, cluster, profile, score };
}
