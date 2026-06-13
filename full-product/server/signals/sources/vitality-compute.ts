import { SignalIngestor } from "../base";

/**
 * Stub for Group 7 (vitality scoring). Real implementation aggregates other
 * signal sources into a 0-100 score per startup and writes to `vitality_scores`.
 */
export class VitalityComputeSource extends SignalIngestor {
  readonly sourceKey = "vitality-compute";
  readonly displayName = "Vitality scoring";
  readonly category = "internal";
  readonly description = "Aggregates other signal sources into a 0-100 vitality score per startup.";

  protected async execute(): Promise<number> {
    return 0;
  }
}
