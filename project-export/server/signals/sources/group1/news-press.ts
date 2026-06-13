import { SignalIngestor, type IngestorContext } from "../../base";
import { getTargetStartups, safeFetch, parseFeedItems } from "./_helpers";

// Diversified Russian business-press set: aggregator-style RSS feeds (always
// pulled — filtered per-startup by needle match against item title +
// description). Yandex News query is also fired per-startup below as a
// best-effort fallback. Sources are diversified to avoid concentration risk
// on any single newsroom.
const STATIC_FEEDS: Array<{ url: string; source: string }> = [
  { url: "https://rssexport.rbc.ru/rbcnews/news/30/full.rss", source: "rbc" },
  { url: "https://www.vedomosti.ru/rss/news.xml", source: "vedomosti" },
  { url: "https://www.kommersant.ru/RSS/news.xml", source: "kommersant" },
];

// Returns the first ≥5-char "anchor" from a startup name suitable for matching.
// Trims trailing legal forms and stopwords so e.g. "Acme Labs LLC" → "acme labs".
function nameAnchor(name: string): string {
  return name
    .replace(/\b(LLC|Inc|Ltd|Corp|GmbH|AG|ООО|ОАО|ЗАО|ПАО|АО)\b\.?/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export class NewsPressSource extends SignalIngestor {
  readonly sourceKey = "news-press";
  readonly displayName = "News & press releases";
  readonly category = "publicWeb";
  readonly description = "Aggregator news feeds (RBC / Vedomosti / Kommersant) plus per-startup Yandex News query, filtered by company name. Sources are diversified to avoid concentration risk on any single newsroom.";

  protected async execute(ctx: IngestorContext): Promise<number> {
    const startups = await getTargetStartups(ctx.startup);
    if (startups.length === 0) return 0;

    // Pull the static aggregator feeds once per run.
    const aggregated: Array<{ title: string; link: string; pubDate?: string; description?: string; source: string }> = [];
    for (const feed of STATIC_FEEDS) {
      const res = await safeFetch(feed.url);
      if (!res?.ok) continue;
      const xml = await res.text();
      for (const it of parseFeedItems(xml)) aggregated.push({ ...it, source: feed.source });
    }

    let created = 0;
    for (const startup of startups) {
      const needle = nameAnchor(startup.name);
      if (needle.length < 4) continue;

      // 1. Filter aggregator items by needle in title or description.
      const aggMatches = aggregated.filter((it) => {
        const hay = `${it.title} ${it.description ?? ""}`.toLowerCase();
        return hay.includes(needle);
      });
      for (const m of aggMatches.slice(0, 10)) {
        if (await this.recordEvent({
          startupId: startup.id,
          eventType: "news.mention",
          severity: "info",
          title: m.title.slice(0, 200),
          summary: m.description?.slice(0, 280),
          url: m.link,
          occurredAt: m.pubDate ? new Date(m.pubDate) : undefined,
          payload: { source: m.source },
          dedupeKey: `${startup.id}:news:${m.link || m.title}`,
        })) created++;
      }

      // 2. Best-effort per-startup Yandex News query (often deprecated; kept as
      // fallback because it returns hits even when name has no aggregator match).
      const yUrl = `https://news.yandex.ru/yandsearch?text=${encodeURIComponent(startup.name.trim())}&rss=on`;
      const yRes = await safeFetch(yUrl);
      if (yRes?.ok) {
        const xml = await yRes.text();
        for (const item of parseFeedItems(xml).slice(0, 10)) {
          if (await this.recordEvent({
            startupId: startup.id,
            eventType: "news.mention",
            severity: "info",
            title: item.title.slice(0, 200),
            summary: item.description?.slice(0, 280),
            url: item.link,
            occurredAt: item.pubDate ? new Date(item.pubDate) : undefined,
            payload: { source: "yandex-news" },
            dedupeKey: `${startup.id}:news:${item.link || item.title}`,
          })) created++;
        }
      }
    }
    return created;
  }
}
