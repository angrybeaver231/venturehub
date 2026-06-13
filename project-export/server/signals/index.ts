import { ensureDefaultCronJobs, startScheduler } from "./scheduler";
import { syncIngestorsToDatabase } from "./registry";
// Side-effect import: each downstream group registers its ingestor by adding
// an `import "./xxx"` (or `registerIngestor(...)` call) inside the sources
// barrel. This guarantees they are loaded before bootstrap runs.
import "./sources";
// Group 8 — alerts dispatcher + cron handlers (must register before scheduler)
import { ALERT_DEFAULT_JOBS } from "./alerts";
import { storage } from "../storage";

export { SignalIngestor } from "./base";
export type { IngestorContext, IngestorResult, RecordEventInput } from "./base";
export { registerIngestor, getIngestor, getAllIngestors } from "./registry";
export { getCredential, requireCredential, MissingCredentialError } from "./credentials";
export { runJobByName, registerJobHandler } from "./scheduler";

export async function bootstrapSignals(): Promise<void> {
  try {
    await syncIngestorsToDatabase();
    await ensureDefaultCronJobs();
    // Ensure Group 8 alert cron jobs exist
    for (const job of ALERT_DEFAULT_JOBS) {
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
    // Pre-Revenue Discovery Engine — register its job handlers + cron rows.
    try {
      const { initScout } = await import("../scout");
      await initScout();
    } catch (err) {
      console.error("[signals] scout init failed:", err);
    }
    await startScheduler();
  } catch (err) {
    console.error("[signals] bootstrap failed:", err);
  }
}
