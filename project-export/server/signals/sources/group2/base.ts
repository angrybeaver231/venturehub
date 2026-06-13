import { SignalIngestor, type IngestorContext } from "../../base";
import { storage } from "../../../storage";
import { getCredential, MissingCredentialError } from "../../credentials";
import type { TeamMember, Startup } from "@shared/schema";

/**
 * Base class for the five Group 2 founder/team social trackers. Each subclass
 * implements `pollMember(startup, member)` which inspects one platform handle
 * and emits 0+ signal_events. The base loops over every startup and every
 * configured team member.
 *
 * Sources without a credential gracefully no-op (the framework marks the
 * source as `no_credentials` thanks to MissingCredentialError).
 */
export abstract class Group2Tracker extends SignalIngestor {
  readonly category = "social";

  /** Which field on TeamMember holds the handle for this platform. */
  protected abstract handleField: keyof TeamMember;

  /**
   * Poll one team member's profile. Implementations should:
   *   1. Fetch the platform's data for `member[handleField]`.
   *   2. Call `this.recordEvent({...})` for each new social trace.
   *   3. Return the number of events recorded.
   * Throw `MissingCredentialError` to signal "no credentials configured" —
   * the base catches that and marks the source as `no_credentials`.
   */
  protected abstract pollMember(startup: Startup, member: TeamMember): Promise<number>;

  /**
   * Optional pre-flight credential probe. Returning false short-circuits the
   * run with status=no_credentials when the source needs an env var/OAuth
   * token that is not set. Public-scrape sources can leave the default true.
   */
  protected async hasCredentials(): Promise<boolean> {
    if (!this.credentialKind) return true;
    const cred = await getCredential(this.credentialKind);
    return cred !== null;
  }

  protected async execute(ctx: IngestorContext): Promise<number> {
    if (!(await this.hasCredentials())) {
      throw new MissingCredentialError(this.credentialKind ?? this.sourceKey);
    }

    const startups = ctx.startup ? [ctx.startup] : await storage.getStartups();
    const allMembers = await storage.getAllTeamMembers();
    const membersByStartup = new Map<string, TeamMember[]>();
    for (const m of allMembers) {
      const list = membersByStartup.get(m.startupId) ?? [];
      list.push(m);
      membersByStartup.set(m.startupId, list);
    }

    let total = 0;
    for (const startup of startups) {
      const members = (membersByStartup.get(startup.id) ?? []).filter(
        (m) => !!m[this.handleField],
      );
      for (const member of members) {
        try {
          total += await this.pollMember(startup, member);
        } catch (err) {
          if (err instanceof MissingCredentialError) throw err;
          // Per-member failures should not abort the whole run; the framework
          // will still mark the source as `live` with a warning event.
          console.warn(`[signals:${this.sourceKey}] member ${member.id} failed:`, err);
        }
      }
    }
    return total;
  }
}
