import { SignalIngestor } from "../base";

/**
 * Stub for Group 8 (reviewer/admin actions). Real implementation emits
 * signal events from reviewer assignments and admin moderation activity.
 */
export class ReviewerActionsSource extends SignalIngestor {
  readonly sourceKey = "reviewer-actions";
  readonly displayName = "Reviewer & admin actions";
  readonly category = "internal";
  readonly scoreCategory = "team_health" as const;
  readonly description = "Emits signal events from reviewer assignments and admin moderation activity.";

  protected async execute(): Promise<number> {
    return 0;
  }
}
