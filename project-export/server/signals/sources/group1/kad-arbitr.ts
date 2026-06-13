import { SignalIngestor, type IngestorContext } from "../../base";
import { getTargetStartups, safeFetch, fetchJson } from "./_helpers";

type KadCase = {
  CaseId?: string;
  Id?: string;
  Number?: string;
  CaseNumberKad?: string;
  CourtName?: string;
  Date?: string;
};
type KadResponse = { Result?: { Items?: KadCase[] } };

export class KadArbitrSource extends SignalIngestor {
  readonly sourceKey = "kad-arbitr";
  readonly displayName = "kad.arbitr.ru cases";
  readonly category = "financial";
  readonly description = "Arbitration court cases where the company is plaintiff or defendant.";

  protected async execute(ctx: IngestorContext): Promise<number> {
    const startups = await getTargetStartups(ctx.startup);
    let created = 0;
    for (const startup of startups) {
      const inn = (startup.inn ?? "").trim();
      if (!inn) continue;
      const res = await safeFetch(
        "https://kad.arbitr.ru/Kad/SearchInstances",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ Page: 1, Count: 25, Sides: [{ Inn: inn, Type: 1 }] }),
        },
        15_000,
      );
      const data = await fetchJson<KadResponse>(res);
      const items = data?.Result?.Items ?? [];
      for (const item of items.slice(0, 10)) {
        const id = item.CaseId ?? item.Id ?? item.Number ?? `${inn}:${item.Date ?? ""}`;
        if (await this.recordEvent({
          startupId: startup.id,
          eventType: "kad.case",
          severity: "warning",
          title: `Court case ${item.CaseNumberKad ?? id}`,
          summary: item.CourtName ?? undefined,
          url: item.CaseId ? `https://kad.arbitr.ru/Card/${item.CaseId}` : undefined,
          occurredAt: item.Date ? new Date(item.Date) : undefined,
          payload: item,
          dedupeKey: `${startup.id}:kad:${id}`,
        })) created++;
      }
    }
    return created;
  }
}
