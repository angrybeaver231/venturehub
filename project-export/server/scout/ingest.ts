import { db } from "../db";
import {
  rawObservations,
  founderSignals,
  type InsertRawObservation,
} from "@shared/schema";
import { eq } from "drizzle-orm";
import { dedupeHash, stripPii, hashIdentifier } from "./pii";
import { isSourceAllowed, isOnDoNotTrack } from "./privacy";
import { classifyIntent, extractEntities, cleanDomain } from "./classifier";
import { upsertIdentity, bumpCredibility } from "./identity";

/**
 * The single entry point every collector uses to record an observation.
 * Performs (in order):
 *   1) source-whitelist check
 *   2) do-not-track check on identifier hints
 *   3) PII strip on the text payload
 *   4) dedupe via SHA(collector + sourceId)
 *   5) inserts into raw_observations
 *
 * Returns the inserted row, or null if blocked / duplicate.
 */
export interface ObservationInput {
  collector: string;
  sourceUrl?: string;
  sourceId: string;          // unique-within-collector id used for dedupe
  sourceIdentifier?: string; // for whitelist (chat_id, subreddit, etc.)
  text: string;              // raw text — will be PII-stripped before storage
  authorHandle?: string;
  authorTgUserId?: string;
  authorGithubLogin?: string;
  authorTwitterHandle?: string;
  authorEmail?: string;
  domainHint?: string;
  retentionDays?: number;    // default 90
  extraPayload?: Record<string, any>;
  /** When true, skip the whitelist check (used for inbound first-party data). */
  trustedSource?: boolean;
}

export async function recordObservation(input: ObservationInput) {
  const collector = input.collector;
  const sourceIdent = input.sourceIdentifier || input.sourceUrl || input.sourceId;
  if (!input.trustedSource) {
    if (!sourceIdent) {
      return { ok: false, reason: "source_not_whitelisted" as const };
    }
    const allowed = await isSourceAllowed(collector, sourceIdent);
    if (!allowed) return { ok: false, reason: "source_not_whitelisted" as const };
  }

  const blocked = await isOnDoNotTrack({
    email: input.authorEmail,
    tgUsername: input.authorHandle,
    tgUserId: input.authorTgUserId,
    githubLogin: input.authorGithubLogin,
    twitterHandle: input.authorTwitterHandle,
    domain: input.domainHint,
  });
  if (blocked) return { ok: false, reason: "do_not_track" as const };

  const redacted = stripPii(input.text || "");
  const hash = dedupeHash(collector, input.sourceId);
  const retentionDays = input.retentionDays ?? 90;

  const value: InsertRawObservation = {
    collector,
    sourceUrl: input.sourceUrl || null,
    sourceId: input.sourceId,
    dedupeHash: hash,
    rawPayload: {
      // We never store the original text. Only the redacted version.
      textRedacted: redacted,
      author: {
        handle: input.authorHandle || null,
        emailHash: input.authorEmail ? hashIdentifier(input.authorEmail) : null,
        tgUserId: input.authorTgUserId || null,
        githubLogin: input.authorGithubLogin || null,
        twitterHandle: input.authorTwitterHandle || null,
      },
      domainHint: cleanDomain(input.domainHint),
      ...input.extraPayload,
    },
    piiStatus: "stripped",
    processingStatus: "pending",
    retentionUntil: new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000),
  };
  try {
    const [row] = await db.insert(rawObservations).values(value)
      .onConflictDoNothing({ target: rawObservations.dedupeHash })
      .returning();
    return { ok: true as const, observation: row || null, deduped: !row };
  } catch (err: any) {
    return { ok: false as const, reason: "db_error" as const, error: err?.message };
  }
}

/**
 * Process a batch of pending raw_observations — runs intent classifier and (if
 * not irrelevant) entity extractor, then writes a founder_signals row.
 */
export async function runClassificationBatch(batchSize = 50): Promise<{
  classified: number;
  irrelevant: number;
  failed: number;
  signals: number;
}> {
  const pending = await db.select().from(rawObservations)
    .where(eq(rawObservations.processingStatus, "pending"))
    .limit(batchSize);

  let classified = 0;
  let irrelevant = 0;
  let failed = 0;
  let signals = 0;

  for (const obs of pending) {
    const text = (obs.rawPayload as any)?.textRedacted || "";
    if (!text) {
      await db.update(rawObservations)
        .set({ processingStatus: "irrelevant" })
        .where(eq(rawObservations.id, obs.id));
      irrelevant++;
      continue;
    }
    const intent = await classifyIntent(text);
    if (!intent) {
      await db.update(rawObservations)
        .set({ processingStatus: "failed" })
        .where(eq(rawObservations.id, obs.id));
      failed++;
      continue;
    }
    classified++;
    if (intent.intent === "irrelevant" || intent.confidence < 0.5) {
      await db.update(rawObservations)
        .set({ processingStatus: "irrelevant" })
        .where(eq(rawObservations.id, obs.id));
      irrelevant++;
      continue;
    }

    const author = (obs.rawPayload as any)?.author || {};
    const ents = await extractEntities(text, {
      sourceUrl: obs.sourceUrl || undefined,
      authorHandle: author.handle,
    });

    const personKey = await upsertIdentity({
      tgUserId: author.tgUserId || ents?.person?.tgUserId || null,
      tgUsername: author.handle || ents?.person?.handle || null,
      githubLogin: author.githubLogin || ents?.person?.githubLogin || null,
      twitterHandle: author.twitterHandle || ents?.person?.twitterHandle || null,
      emailHash: author.emailHash || null,
      displayName: ents?.person?.displayName || null,
      domain: ents?.project?.domain || null,
    });

    if (personKey) await bumpCredibility(personKey, 0.5);

    await db.insert(founderSignals).values({
      rawObservationId: obs.id,
      intent: intent.intent,
      intentConfidence: String(intent.confidence),
      entities: (ents as any) || {},
      stageEstimate: intent.stageEstimate,
      vertical: ents?.project?.vertical || intent.vertical || null,
      projectName: ents?.project?.name || intent.projectName || null,
      domain: ents?.project?.domain || null,
      githubOrg: ents?.project?.githubOrg || null,
      personKey: personKey || null,
    });
    signals++;
    await db.update(rawObservations)
      .set({ processingStatus: "extracted" })
      .where(eq(rawObservations.id, obs.id));
  }
  return { classified, irrelevant, failed, signals };
}
