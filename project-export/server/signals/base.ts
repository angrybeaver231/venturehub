import crypto from "crypto";
import { storage } from "../storage";
import { db } from "../db";
import { signalEvents } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import type { Startup, SignalEventSeverity, InsertSignalEvent, SignalSourceStatus, VitalityCategory } from "@shared/schema";
import { MissingCredentialError } from "./credentials";
import { dispatchSignalEvent } from "./alerts/dispatcher";

export type IngestorContext = {
  startup?: Startup;
};

export type RecordEventInput = {
  startupId?: string;
  eventType: string;
  severity?: SignalEventSeverity;
  title?: string;
  summary?: string;
  url?: string;
  occurredAt?: Date;
  payload?: any;
  dedupeKey: string;
  verifiedBy?: string[];
};

export type IngestorResult = {
  eventsCreated: number;
  status: "live" | "no_credentials" | "error" | "disabled";
  error?: string;
};

export abstract class SignalIngestor {
  abstract readonly sourceKey: string;
  abstract readonly displayName: string;
  abstract readonly category: string;
  /** Vitality sub-score this source's events feed into. `null` for purely
   *  internal sources (compute jobs, etc.) that don't contribute to scoring. */
  readonly scoreCategory: VitalityCategory | null = null;
  readonly description?: string;
  readonly requiresCredentials: boolean = false;
  readonly credentialKind?: string;

  protected abstract execute(ctx: IngestorContext): Promise<number>;

  async run(ctx: IngestorContext = {}): Promise<IngestorResult> {
    const source = await storage.getSignalSourceByKey(this.sourceKey);
    if (source?.isPaused) {
      return { eventsCreated: 0, status: "disabled" };
    }

    const run = await storage.createIngestionRun({
      sourceKey: this.sourceKey,
      startupId: ctx.startup?.id ?? null,
      startedAt: new Date(),
      status: "running",
      eventsCreated: 0,
    });

    let eventsCreated = 0;
    let status: IngestorResult["status"] = "live";
    let errorMessage: string | undefined;

    try {
      eventsCreated = await this.execute(ctx);
    } catch (err) {
      if (err instanceof MissingCredentialError) {
        status = "no_credentials";
        errorMessage = err.message;
      } else {
        status = "error";
        errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`[signals:${this.sourceKey}]`, err);
      }
    }

    await storage.finishIngestionRun(run.id, {
      finishedAt: new Date(),
      eventsCreated,
      status,
      error: errorMessage ?? null,
    });
    await storage.markSignalSourceStatus(this.sourceKey, status, errorMessage ?? null);

    return { eventsCreated, status, error: errorMessage };
  }

  /**
   * Hash a per-source dedupe key into the value stored in `signal_events.dedupe_hash`.
   * Exposed as a helper so source-specific code can pre-check dedupe state if needed.
   */
  dedupe(dedupeKey: string): string {
    return crypto
      .createHash("sha256")
      .update(`${this.sourceKey}:${dedupeKey}`)
      .digest("hex")
      .slice(0, 64);
  }

  /**
   * Manually update this source's status row. The base `run()` already calls
   * this at the end of each run, but ingestors may need to mark a partial
   * status mid-run (e.g. credentials revoked).
   */
  async markStatus(status: SignalSourceStatus | "live" | "no_credentials" | "error" | "disabled" | "idle", error: string | null = null): Promise<void> {
    await storage.markSignalSourceStatus(this.sourceKey, status, error);
  }

  protected async recordEvent(input: RecordEventInput): Promise<boolean> {
    const dedupeHash = this.dedupe(input.dedupeKey);

    const event: InsertSignalEvent = {
      startupId: input.startupId ?? null,
      sourceKey: this.sourceKey,
      eventType: input.eventType,
      severity: input.severity ?? "info",
      title: input.title ?? null,
      summary: input.summary ?? null,
      url: input.url ?? null,
      occurredAt: input.occurredAt ?? new Date(),
      payload: input.payload ?? null,
      dedupeHash,
      verifiedBy: input.verifiedBy ?? null,
    };
    const inserted = await storage.recordSignalEvent(event);
    if (inserted) {
      // Fire-and-forget alerts dispatch (negative-signal fast-path + custom rules).
      // Look up the freshly inserted row to pass to the dispatcher with a stable id.
      try {
        const [row] = await db.select().from(signalEvents)
          .where(eq(signalEvents.dedupeHash, dedupeHash))
          .orderBy(desc(signalEvents.occurredAt))
          .limit(1);
        if (row) {
          dispatchSignalEvent(row).catch((err) => console.warn("[signals:dispatch]", err));
        }
      } catch (err) {
        console.warn("[signals:dispatch:lookup]", err);
      }
    }
    return inserted;
  }
}
