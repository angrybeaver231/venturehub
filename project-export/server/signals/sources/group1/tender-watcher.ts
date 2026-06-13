import { SignalIngestor, type IngestorContext } from "../../base";
import { getTargetStartups, safeFetch, stripHtml } from "./_helpers";

type TenderRow = {
  registryNumber: string;
  title: string;
  url: string;
  amount?: number;
  status: "active" | "won" | "lost" | "cancelled" | "completed" | "unknown";
  publishDate?: string;
  fz: "44" | "223" | "unknown";
};

const STATUS_MAP: Array<[RegExp, TenderRow["status"]]> = [
  [/исполнен|завершен|completed/i, "completed"],
  [/победитель|выиграл|won/i, "won"],
  [/отменен|cancel/i, "cancelled"],
  [/прекращ|отказ|lost/i, "lost"],
  [/подача заявок|приём|active|объявлен/i, "active"],
];

function inferStatus(text: string): TenderRow["status"] {
  for (const [re, st] of STATUS_MAP) {
    if (re.test(text)) return st;
  }
  return "unknown";
}

function parseAmount(text: string): number | undefined {
  // Match "1 234 567,89 ₽" or "1234567.89 руб"
  const m = text.match(/([\d\s]{3,}(?:[.,]\d+)?)\s*(?:₽|руб|rub)/i);
  if (!m) return undefined;
  const raw = m[1].replace(/\s+/g, "").replace(",", ".");
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : undefined;
}

function parseEisHtml(html: string): TenderRow[] {
  const rows: TenderRow[] = [];
  // The EIS results page renders each tender as a div block with a registry link.
  const blockRe = /<div[^>]+class="[^"]*search-registry-entrys?-block[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/gi;
  const matches = html.match(blockRe) ?? [];
  for (const block of matches) {
    const linkMatch = block.match(/href="(\/epz\/order\/notice\/[^"]+regNumber=(\d+)[^"]*)"/);
    if (!linkMatch) continue;
    const url = `https://zakupki.gov.ru${linkMatch[1]}`;
    const registryNumber = linkMatch[2];
    const text = stripHtml(block);
    const titleMatch = block.match(/<div[^>]+class="registry-entry__body-href"[^>]*>([\s\S]*?)<\/div>/i);
    const title = titleMatch ? stripHtml(titleMatch[1]).slice(0, 200) : text.slice(0, 200);
    const fz: TenderRow["fz"] = /Закон.{0,3}44|44-ФЗ/i.test(text) ? "44"
      : /Закон.{0,3}223|223-ФЗ/i.test(text) ? "223"
      : "unknown";
    const dateMatch = text.match(/(\d{2}\.\d{2}\.\d{4})/);
    rows.push({
      registryNumber,
      title,
      url,
      amount: parseAmount(text),
      status: inferStatus(text),
      publishDate: dateMatch?.[1],
      fz,
    });
  }
  return rows;
}

export class TenderWatcherSource extends SignalIngestor {
  readonly sourceKey = "tender-watcher";
  readonly displayName = "Tenders (zakupki.gov.ru EIS)";
  readonly category = "financial";
  readonly description =
    "Procurement / tender participations from the public zakupki.gov.ru EIS extended-search index. Pulls amount, status, FZ. Dedupes on registry number.";

  protected async execute(ctx: IngestorContext): Promise<number> {
    const startups = await getTargetStartups(ctx.startup);
    let created = 0;
    for (const startup of startups) {
      const inn = (startup.inn ?? "").trim();
      if (!inn) continue;
      const url =
        `https://zakupki.gov.ru/epz/order/extendedsearch/results.html?searchString=${encodeURIComponent(inn)}` +
        `&morphology=on&fz44=on&fz223=on&pageNumber=1&recordsPerPage=_50`;
      const res = await safeFetch(url);
      if (!res?.ok) continue;
      const html = await res.text();
      const rows = parseEisHtml(html);
      for (const row of rows.slice(0, 30)) {
        const severity = row.status === "won" || row.status === "completed" ? "positive"
          : row.status === "lost" || row.status === "cancelled" ? "warning"
          : "info";
        if (await this.recordEvent({
          startupId: startup.id,
          eventType: "tender_event",
          severity,
          title: row.title,
          summary: `${row.fz === "unknown" ? "" : `${row.fz}-ФЗ `}${row.status}${row.amount ? ` · ${row.amount.toLocaleString("ru-RU")} ₽` : ""}`,
          url: row.url,
          occurredAt: row.publishDate ? parseRuDate(row.publishDate) : undefined,
          payload: {
            inn,
            registryNumber: row.registryNumber,
            amount: row.amount ?? null,
            status: row.status,
            fz: row.fz,
          },
          dedupeKey: `${startup.id}:tender:${row.registryNumber}`,
        })) created++;
      }
    }
    return created;
  }
}

function parseRuDate(d: string): Date | undefined {
  const m = d.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return undefined;
  return new Date(`${m[3]}-${m[2]}-${m[1]}T00:00:00Z`);
}
