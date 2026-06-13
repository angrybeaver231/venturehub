import { SignalIngestor, type IngestorContext } from "../../base";
import { getTargetStartups } from "./_helpers";
import { ACCELERATOR_PARSERS, namesMatch, type AcceleratorEntry } from "./_accelerator_parsers";

export class AcceleratorCrawlerSource extends SignalIngestor {
  readonly sourceKey = "accelerator-crawler";
  readonly displayName = "Accelerator participant crawler";
  readonly category = "publicWeb";
  readonly description =
    "Per-accelerator structured parsers (ФРИИ, Сколково, YC, Antler, 500 Global). Matches startup names with RU↔EN normalisation.";

  protected async execute(ctx: IngestorContext): Promise<number> {
    const startups = await getTargetStartups(ctx.startup);
    if (startups.length === 0) return 0;

    // Cache portfolio fetches per run.
    const portfolios: Array<{ accelerator: string; entries: AcceleratorEntry[] }> = [];
    for (const parser of ACCELERATOR_PARSERS) {
      try {
        const entries = await parser.fetchPortfolio();
        portfolios.push({ accelerator: parser.name, entries });
      } catch (err) {
        console.warn(`[accelerator-crawler] ${parser.name} failed:`, err);
      }
    }

    let created = 0;
    for (const startup of startups) {
      for (const portfolio of portfolios) {
        const match = portfolio.entries.find((e) => namesMatch(e.companyName, startup.name));
        if (!match) continue;
        const ok = await this.recordEvent({
          startupId: startup.id,
          eventType: "accelerator_appearance",
          severity: "positive",
          title: `${startup.name} listed in ${portfolio.accelerator}${match.cohort ? ` (${match.cohort})` : ""}`,
          summary: `Matched ${portfolio.accelerator} portfolio entry "${match.companyName}".`,
          url: match.url,
          payload: {
            accelerator: portfolio.accelerator,
            cohort: match.cohort ?? null,
            matchedName: match.companyName,
          },
          dedupeKey: `${startup.id}:accel:${portfolio.accelerator}:${match.cohort ?? "all"}`,
        });
        if (ok) created++;
      }
    }
    return created;
  }
}
