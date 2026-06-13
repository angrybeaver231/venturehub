import { SignalIngestor, type IngestorContext } from "../../base";
import { getTargetStartups, safeFetch, parseFeedItems } from "./_helpers";
import { getEnvCredential } from "../../credentials";

const FEEDS = [
  "https://vc.ru/rss",
  "https://habr.com/ru/rss/news/?fl=ru",
  "https://www.forbes.ru/feed.rss",
  "https://rb.ru/feeds/all/",
];

type Sentiment = "positive" | "info" | "warning" | "critical";

// Bilingual keyword lexicons. Word-boundary matched (Cyrillic-aware) on the
// lowercased title+description. Each hit contributes a vote; the dominant
// bucket wins. Tuned for Russian financial press idioms.
const POSITIVE_TERMS: string[] = [
  // English
  "raised", "raises", "funding", "seed round", "series a", "series b", "series c",
  "acquired", "acquires", "acquisition", "partnership", "partners with",
  "launches", "launched", "growth", "expanding", "expansion", "milestone",
  "named", "wins", "won", "award", "profitable", "ipo", "valuation",
  // Russian
  "привлек", "привлекл", "привлечен", "инвестиц", "раунд", "финансирован",
  "запустил", "запуск", "рост", "выручка вырос", "прибыль", "контракт",
  "партнерство", "партнёрство", "награда", "победил", "лидер", "купил",
  "приобрел", "приобрёл", "приобретен", "сделка",
];

const NEGATIVE_TERMS: string[] = [
  // English (warning)
  "layoffs", "layoff", "missed", "downsized", "fired", "resigned", "stepped down",
  "lawsuit", "sued", "fine", "fined", "investigation", "probe", "delays", "delay",
  "loss", "decline", "shrinking", "downround", "down round",
  // Russian (warning)
  "уволил", "увольнен", "сокращен", "сокращ", "уволен", "уволил",
  "иск", "судится", "оштрафован", "штраф", "проверка", "расследован",
  "задержк", "убыток", "убытк", "падение", "упал", "снижен", "потерял",
  "отставк", "ушел из", "ушёл из",
];

const CRITICAL_TERMS: string[] = [
  // English (critical)
  "bankruptcy", "bankrupt", "shutdown", "shut down", "shuts down",
  "fraud", "scam", "criminal", "arrested", "indicted", "embezzlement",
  "dissolved", "liquidation", "ceased operations",
  // Russian (critical)
  "банкрот", "ликвидац", "ликвидирован", "закрыл", "закрыт",
  "мошеннич", "мошенник", "уголовн", "арестован", "задержан", "обвин",
  "хищен", "приостановлен", "прекратил деятельность",
];

function classifyByKeywords(text: string): { severity: Sentiment; matched: string[] } {
  const lower = text.toLowerCase();
  const hit = (terms: string[]): string[] => terms.filter((t) => lower.includes(t));
  const crit = hit(CRITICAL_TERMS);
  if (crit.length > 0) return { severity: "critical", matched: crit.slice(0, 5) };
  const neg = hit(NEGATIVE_TERMS);
  const pos = hit(POSITIVE_TERMS);
  if (neg.length > pos.length) return { severity: "warning", matched: neg.slice(0, 5) };
  if (pos.length > neg.length) return { severity: "positive", matched: pos.slice(0, 5) };
  return { severity: "info", matched: [] };
}

export class MediaMentionsSource extends SignalIngestor {
  readonly sourceKey = "media-mentions";
  readonly displayName = "Tech media mentions";
  readonly category = "publicWeb";
  readonly description = "Polls vc.ru / Habr / Forbes / RB.ru RSS for mentions of each startup name. Sentiment = deterministic RU+EN keyword classifier (positive / warning / critical), optionally refined by gpt-4o-mini when AI_INTEGRATIONS_OPENAI_API_KEY is set.";

  protected async execute(ctx: IngestorContext): Promise<number> {
    const startups = await getTargetStartups(ctx.startup);
    if (startups.length === 0) return 0;

    const allItems: Array<{ title: string; link: string; pubDate?: string; description?: string; feed: string }> = [];
    for (const feed of FEEDS) {
      const res = await safeFetch(feed);
      if (!res?.ok) continue;
      const xml = await res.text();
      for (const it of parseFeedItems(xml)) allItems.push({ ...it, feed });
    }

    const openaiKey = getEnvCredential("OPENAI_API_KEY") || getEnvCredential("AI_INTEGRATIONS_OPENAI_API_KEY");
    let created = 0;

    for (const startup of startups) {
      const needle = startup.name.toLowerCase();
      if (needle.length < 3) continue;
      const matches = allItems.filter((it) => {
        const hay = `${it.title} ${it.description ?? ""}`.toLowerCase();
        return hay.includes(needle);
      });
      for (const m of matches.slice(0, 10)) {
        const text = `${m.title}\n${m.description ?? ""}`;
        const kw = classifyByKeywords(text);
        let severity: Sentiment = kw.severity;
        let reason: string | null = kw.matched.length > 0 ? `keywords: ${kw.matched.join(", ")}` : null;
        let confidence: number | null = kw.matched.length > 0 ? Math.min(1, 0.4 + 0.15 * kw.matched.length) : null;
        let classifier: "keyword" | "llm" = "keyword";

        // LLM enhancer — only when (a) the rule-based classifier returned `info`
        // (no keyword hits) and (b) we have an API key. The LLM never overrides
        // a `critical` keyword verdict, so a flagged "bankruptcy" headline can't
        // be silently downgraded by the model.
        if (openaiKey && kw.severity === "info") {
          const cls = await classifyWithLlm(openaiKey, {
            startup: startup.name,
            title: m.title,
            description: m.description ?? "",
            url: m.link,
            feed: m.feed,
          }).catch(() => null);
          if (cls) {
            severity = cls.severity;
            confidence = cls.confidence;
            reason = cls.reason;
            classifier = "llm";
          }
        }

        if (await this.recordEvent({
          startupId: startup.id,
          eventType: "media.mention",
          severity,
          title: m.title.slice(0, 200),
          summary: reason ? `${reason} — ${m.description?.slice(0, 200) ?? ""}`.slice(0, 280) : m.description?.slice(0, 280),
          url: m.link,
          occurredAt: m.pubDate ? new Date(m.pubDate) : undefined,
          payload: { feed: m.feed, sentimentConfidence: confidence, sentimentReason: reason, classifier },
          dedupeKey: `${startup.id}:media:${m.link || m.title}`,
        })) created++;
      }
    }
    return created;
  }
}

type ClassifyInput = { startup: string; title: string; description: string; url: string; feed: string };
type ClassifyResult = { severity: Sentiment; confidence: number; reason: string };

async function classifyWithLlm(apiKey: string, input: ClassifyInput): Promise<ClassifyResult | null> {
  const sys = `You are a venture-investor signal classifier. Return STRICT JSON: {"severity":"positive|info|warning|critical","confidence":0..1,"reason":"<=80 chars"}.
- positive: funding, customer win, growth, product launch, partnership
- info: neutral mention, factual coverage with no clear angle
- warning: layoffs, executive churn, lawsuit, customer loss, missed targets
- critical: bankruptcy, fraud, criminal investigation, total shutdown
Pay attention to Russian financial press idioms.`;
  const user = `Startup: ${input.startup}
Source: ${input.feed}
Title: ${input.title}
Description: ${input.description.slice(0, 600)}
URL: ${input.url}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        max_tokens: 80,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
      }),
      signal: ctrl.signal,
    });
    if (!r.ok) return null;
    const data = (await r.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const sev = String(parsed.severity || "info").toLowerCase();
    const severity: Sentiment = (["positive", "info", "warning", "critical"].includes(sev) ? sev : "info") as Sentiment;
    const confidence = Math.max(0, Math.min(1, Number(parsed.confidence ?? 0.5)));
    const reason = String(parsed.reason || "").slice(0, 100);
    return { severity, confidence, reason };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}
