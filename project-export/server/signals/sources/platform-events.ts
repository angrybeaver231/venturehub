import { SignalIngestor } from "../base";

/**
 * Stub for Group 6 (internal events). Emits no events on its own — the real
 * implementation will read from local DB tables (events, applications, etc.)
 * and convert them into signal events. Registered now so it appears in the
 * admin sources list and gets a "live" / "idle" badge.
 */
export class PlatformEventsSource extends SignalIngestor {
  readonly sourceKey = "platform-events";
  readonly displayName = "Platform internal events";
  readonly category = "internal";
  readonly scoreCategory = "team_health" as const;
  readonly description = "Cross-platform internal events (event RSVPs, applications, course completions, etc.)";

  protected async execute(): Promise<number> {
    return 0;
  }
}
