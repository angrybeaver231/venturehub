import { SignalIngestor, type IngestorContext } from "../../base";
import { getTargetStartups, safeFetch, fetchJson } from "./_helpers";
import { MissingCredentialError, getEnvCredential } from "../../credentials";

type KonturEntry = {
  UL?: { legalName?: { short?: string; full?: string } };
  briefReport?: { summary?: { greenStatements?: unknown; yellowStatements?: unknown; redStatements?: unknown } };
};

export class KonturFokusSource extends SignalIngestor {
  readonly sourceKey = "kontur-fokus";
  readonly displayName = "Контур.Фокус / SPARK";
  readonly category = "financial";
  readonly description = "Annual revenue, director disqualifications, bankruptcy data via Контур.Фокус.";
  readonly requiresCredentials = true;
  readonly credentialKind = "KONTUR_FOKUS_API_KEY";

  protected async execute(ctx: IngestorContext): Promise<number> {
    const apiKey = getEnvCredential("KONTUR_FOKUS_API_KEY");
    if (!apiKey) throw new MissingCredentialError("KONTUR_FOKUS_API_KEY");

    const startups = await getTargetStartups(ctx.startup);
    let created = 0;
    for (const startup of startups) {
      const inn = (startup.inn ?? "").trim();
      if (!inn) continue;
      const res = await safeFetch(
        `https://focus-api.kontur.ru/api3/req?inn=${encodeURIComponent(inn)}&key=${encodeURIComponent(apiKey)}`,
      );
      const data = await fetchJson<KonturEntry | KonturEntry[]>(res);
      if (!data) continue;
      const entry: KonturEntry | undefined = Array.isArray(data) ? data[0] : data;
      if (!entry) continue;
      const day = new Date().toISOString().slice(0, 10);
      const summary = entry.briefReport?.summary;
      const summaryText = summary
        ? `green:${String(summary.greenStatements ?? "?")} / yellow:${String(summary.yellowStatements ?? "?")} / red:${String(summary.redStatements ?? "?")}`
        : undefined;
      const hasRed = summary?.redStatements ? Number(summary.redStatements) > 0 : false;
      if (await this.recordEvent({
        startupId: startup.id,
        eventType: "kontur.snapshot",
        severity: hasRed ? "warning" : "info",
        title: entry.UL?.legalName?.short ?? entry.UL?.legalName?.full ?? `INN ${inn}`,
        summary: summaryText,
        payload: entry,
        dedupeKey: `${startup.id}:kontur:${inn}:${day}`,
      })) created++;
    }
    return created;
  }
}
