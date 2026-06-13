import {
  VITALITY_CATEGORIES,
  DEFAULT_VITALITY_WEIGHTS,
  type VitalityCategory,
  type VitalityWeights,
  type SignalEvent,
  type SignalSource,
} from "@shared/schema";

/**
 * Group 6 — Vitality Score engine.
 *
 * Pure scoring functions: take signal events + source metadata + a weight
 * preset and return a composite 0-100 score and 5 sub-scores. Has no
 * dependency on the database layer; the recompute job loads inputs and
 * writes outputs.
 *
 * Decay: events lose weight as they age. Piecewise linear with reference
 * points at (0d → 1.0), (90d → 0.5), (365d → 0). Older events contribute
 * nothing.
 */

const SEVERITY_POINTS: Record<string, number> = {
  positive: 4,
  info: 1,
  warning: -2,
  critical: -4,
};

const BASELINE = 0;
const SCALE = 5;

export function decayFactor(occurredAt: Date | string, now: Date = new Date()): number {
  const occurred = occurredAt instanceof Date ? occurredAt : new Date(occurredAt);
  const days = Math.max(0, (now.getTime() - occurred.getTime()) / (1000 * 60 * 60 * 24));
  if (days >= 365) return 0;
  if (days <= 90) return 1 - 0.5 * (days / 90);
  return 0.5 * (1 - (days - 90) / 275);
}

export function severityPoints(severity: string | null | undefined): number {
  return SEVERITY_POINTS[severity ?? "info"] ?? 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export type SubScoreBreakdown = {
  category: VitalityCategory;
  score: number;
  rawPoints: number;
  eventCount: number;
};

export type VitalityComputation = {
  composite: number;
  subscores: Record<VitalityCategory, number>;
  breakdown: SubScoreBreakdown[];
  totalEvents: number;
  weightsUsed: VitalityWeights;
};

export function normalizeWeights(weights: Partial<VitalityWeights> | null | undefined): VitalityWeights {
  const merged: VitalityWeights = { ...DEFAULT_VITALITY_WEIGHTS };
  if (weights) {
    for (const c of VITALITY_CATEGORIES) {
      const v = (weights as Record<string, unknown>)[c];
      if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
        merged[c] = v;
      }
    }
  }
  // If everything is zero, fall back to default to avoid NaN composites.
  const sum = VITALITY_CATEGORIES.reduce((acc, c) => acc + merged[c], 0);
  if (sum <= 0) return { ...DEFAULT_VITALITY_WEIGHTS };
  return merged;
}

export function computeVitality(
  events: Pick<SignalEvent, "sourceKey" | "severity" | "occurredAt">[],
  sources: Pick<SignalSource, "sourceKey" | "scoreCategory">[],
  weights: Partial<VitalityWeights> | null = null,
  now: Date = new Date(),
): VitalityComputation {
  const sourceCategory = new Map<string, VitalityCategory | null>();
  for (const s of sources) {
    sourceCategory.set(s.sourceKey, (s.scoreCategory ?? null) as VitalityCategory | null);
  }

  const rawPerCategory: Record<VitalityCategory, number> = {
    tech_activity: 0,
    team_health: 0,
    market_presence: 0,
    financial_health: 0,
    legal_hygiene: 0,
  };
  const countPerCategory: Record<VitalityCategory, number> = {
    tech_activity: 0,
    team_health: 0,
    market_presence: 0,
    financial_health: 0,
    legal_hygiene: 0,
  };

  let totalEvents = 0;
  for (const ev of events) {
    const cat = sourceCategory.get(ev.sourceKey);
    if (!cat) continue;
    const occurred = ev.occurredAt instanceof Date ? ev.occurredAt : new Date(ev.occurredAt as unknown as string);
    const factor = decayFactor(occurred, now);
    if (factor <= 0) continue;
    const pts = severityPoints(ev.severity) * factor;
    rawPerCategory[cat] += pts;
    countPerCategory[cat] += 1;
    totalEvents += 1;
  }

  const subscores: Record<VitalityCategory, number> = {
    tech_activity: 0,
    team_health: 0,
    market_presence: 0,
    financial_health: 0,
    legal_hygiene: 0,
  };
  const breakdown: SubScoreBreakdown[] = [];
  for (const cat of VITALITY_CATEGORIES) {
    const raw = rawPerCategory[cat];
    const score = Math.round(clamp(BASELINE + SCALE * raw, 0, 100));
    subscores[cat] = score;
    breakdown.push({
      category: cat,
      score,
      rawPoints: Math.round(raw * 100) / 100,
      eventCount: countPerCategory[cat],
    });
  }

  const w = normalizeWeights(weights);
  const wSum = VITALITY_CATEGORIES.reduce((acc, c) => acc + w[c], 0);
  const composite = Math.round(
    VITALITY_CATEGORIES.reduce((acc, c) => acc + (subscores[c] * w[c]) / wSum, 0),
  );

  return {
    composite: clamp(composite, 0, 100),
    subscores,
    breakdown,
    totalEvents,
    weightsUsed: w,
  };
}

/**
 * Group 6.6 — Kaplan–Meier survival estimator for a startup cohort.
 *
 * Each subject is described by `{ enteredAt, lastSeenAt, eventOccurred }`:
 *   - `enteredAt`         when the startup joined the cohort
 *   - `lastSeenAt`        most recent observation we have for them
 *   - `eventOccurred`     true if a "death" event happened (e.g. went silent
 *                          for >`silenceDays`); false = right-censored.
 *
 * Returns the survival function S(t) sampled at `bucketDays` intervals up to
 * `horizonDays`. S(0) = 1. Each bucket lists `{ tDays, atRisk, events,
 * survival }` so the caller can render both the curve and the at-risk table.
 */
export type KMInput = {
  enteredAt: Date | string;
  lastSeenAt: Date | string | null;
  eventOccurred: boolean;
};

export type KMBucket = {
  tDays: number;
  atRisk: number;
  events: number;
  censored: number;
  survival: number;
};

export function kaplanMeier(
  subjects: KMInput[],
  opts: { bucketDays?: number; horizonDays?: number; now?: Date } = {},
): KMBucket[] {
  const bucket = Math.max(1, opts.bucketDays ?? 30);
  const horizon = Math.max(bucket, opts.horizonDays ?? 360);
  const now = opts.now ?? new Date();
  const ms = 1000 * 60 * 60 * 24;

  // Convert to (durationDays, eventOccurred) pairs.
  type Obs = { duration: number; event: boolean };
  const obs: Obs[] = [];
  for (const s of subjects) {
    const entered = s.enteredAt instanceof Date ? s.enteredAt : new Date(s.enteredAt);
    const last = s.lastSeenAt
      ? s.lastSeenAt instanceof Date ? s.lastSeenAt : new Date(s.lastSeenAt)
      : now;
    const dur = Math.max(0, (last.getTime() - entered.getTime()) / ms);
    if (!Number.isFinite(dur)) continue;
    obs.push({ duration: dur, event: !!s.eventOccurred });
  }

  const buckets: KMBucket[] = [{ tDays: 0, atRisk: obs.length, events: 0, censored: 0, survival: 1 }];
  let survival = 1;

  for (let t = bucket; t <= horizon; t += bucket) {
    const start = t - bucket;
    // At-risk = subjects whose duration >= start (haven't yet been removed)
    const atRisk = obs.filter((o) => o.duration >= start).length;
    const events = obs.filter((o) => o.event && o.duration >= start && o.duration < t).length;
    const censored = obs.filter((o) => !o.event && o.duration >= start && o.duration < t).length;
    if (atRisk > 0 && events > 0) {
      survival = survival * (1 - events / atRisk);
    }
    buckets.push({
      tDays: t,
      atRisk,
      events,
      censored,
      survival: Math.max(0, Math.min(1, survival)),
    });
  }
  return buckets;
}

/**
 * Compute percentile rank (0-100) of `value` within `population`. Returns
 * null if the population has fewer than 2 entries (no meaningful rank).
 */
export function percentile(value: number, population: number[]): number | null {
  const sorted = population.filter((n) => Number.isFinite(n)).slice().sort((a, b) => a - b);
  if (sorted.length < 2) return null;
  let count = 0;
  for (const n of sorted) {
    if (n < value) count++;
    else if (n === value) count += 0.5;
  }
  return Math.round((count / sorted.length) * 100);
}
