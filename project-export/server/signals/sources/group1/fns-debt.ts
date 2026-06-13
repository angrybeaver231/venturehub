import { SignalIngestor, type IngestorContext } from "../../base";
import { getTargetStartups, safeFetch, fetchJson } from "./_helpers";

type FnsOrg = {
  id?: string;
  shortName?: string;
  fullName?: string;
  ogrn?: string;
  region?: string;
  taxDebt?: number | null;
  hasDebt?: boolean;
};
type FnsResponse = { content?: FnsOrg[] };

export class FnsDebtSource extends SignalIngestor {
  readonly sourceKey = "fns-debt";
  readonly displayName = "ФНС tax debt";
  readonly category = "financial";
  readonly description = "Tax-debt status from the open FNS dataset (bo.nalog.ru / pb.nalog.ru). Debt is a hard-negative signal.";

  protected async execute(ctx: IngestorContext): Promise<number> {
    const startups = await getTargetStartups(ctx.startup);
    let created = 0;
    for (const startup of startups) {
      const inn = (startup.inn ?? "").trim();
      if (!inn) continue;

      const res = await safeFetch(
        `https://bo.nalog.ru/nbo/organizations/?query=${encodeURIComponent(inn)}&page=0&size=5`,
      );
      const data = await fetchJson<FnsResponse>(res);
      if (!data) continue;
      const content = data.content ?? [];
      const day = new Date().toISOString().slice(0, 10);
      for (const org of content.slice(0, 3)) {
        const hasDebt = org.hasDebt === true || (typeof org.taxDebt === "number" && org.taxDebt > 0);
        if (await this.recordEvent({
          startupId: startup.id,
          eventType: hasDebt ? "fns.debt" : "fns.snapshot",
          severity: hasDebt ? "critical" : "info",
          title: hasDebt
            ? `Tax debt detected${typeof org.taxDebt === "number" ? `: ${org.taxDebt.toLocaleString("ru-RU")} ₽` : ""} — ${org.shortName ?? org.fullName ?? `INN ${inn}`}`
            : (org.shortName ?? org.fullName ?? `INN ${inn}`),
          summary: org.region ?? undefined,
          url: org.id ? `https://bo.nalog.ru/organizations-card/${org.id}` : undefined,
          payload: { id: org.id, ogrn: org.ogrn, region: org.region, taxDebt: org.taxDebt, hasDebt },
          dedupeKey: `${startup.id}:fns:${hasDebt ? "debt" : "snap"}:${org.id ?? inn}:${day}`,
        })) created++;
      }
    }
    return created;
  }
}
