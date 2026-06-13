import { safeFetch, stripHtml } from "./_helpers";

export type AcceleratorEntry = {
  companyName: string;
  cohort?: string;
  url?: string;
};

export type AcceleratorParser = {
  name: string;
  fetchPortfolio(): Promise<AcceleratorEntry[]>;
};

function uniq(entries: AcceleratorEntry[]): AcceleratorEntry[] {
  const seen = new Set<string>();
  const out: AcceleratorEntry[] = [];
  for (const e of entries) {
    const key = e.companyName.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

// Russian↔English transliteration normaliser. Strips spaces, punctuation, lowercases.
const TRANSLIT_MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh",
  з: "z", и: "i", й: "i", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts",
  ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

export function normaliseName(name: string): string {
  const lower = (name || "").toLowerCase().trim();
  let out = "";
  for (const ch of lower) {
    if (TRANSLIT_MAP[ch] !== undefined) out += TRANSLIT_MAP[ch];
    else if (/[a-z0-9]/.test(ch)) out += ch;
  }
  return out;
}

export function namesMatch(a: string, b: string): boolean {
  const na = normaliseName(a);
  const nb = normaliseName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.length >= 4 && nb.includes(na)) return true;
  if (nb.length >= 4 && na.includes(nb)) return true;
  return false;
}

const FRII: AcceleratorParser = {
  name: "ФРИИ",
  async fetchPortfolio() {
    const res = await safeFetch("https://www.iidf.ru/portfolio/");
    if (!res?.ok) return [];
    const html = await res.text();
    const out: AcceleratorEntry[] = [];
    const re = /<a[^>]+href="(\/portfolio\/[^"]+)"[^>]*>\s*([^<]{2,80})\s*<\/a>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const name = m[2].replace(/\s+/g, " ").trim();
      if (name.length < 2 || name.length > 80) continue;
      out.push({ companyName: name, url: `https://www.iidf.ru${m[1]}` });
    }
    return uniq(out);
  },
};

const SKOLKOVO: AcceleratorParser = {
  name: "Сколково",
  async fetchPortfolio() {
    const res = await safeFetch("https://navigator.sk.ru/api/companies?pageSize=200&pageIndex=0");
    if (!res?.ok) return [];
    let body: any = null;
    try { body = await res.json(); } catch { return []; }
    const items: any[] = body?.items ?? body?.data ?? body ?? [];
    if (!Array.isArray(items)) return [];
    return uniq(items
      .map((it) => ({
        companyName: String(it.name ?? it.title ?? "").trim(),
        url: it.id ? `https://navigator.sk.ru/orn/${it.id}` : undefined,
      }))
      .filter((e) => e.companyName));
  },
};

const YC: AcceleratorParser = {
  name: "Y Combinator",
  async fetchPortfolio() {
    // YC ships an Algolia-backed JSON endpoint; fall back to public JSON-in-script.
    const res = await safeFetch("https://www.ycombinator.com/companies.json");
    if (res?.ok) {
      try {
        const arr = (await res.json()) as Array<{ name: string; batch?: string; website?: string }>;
        if (Array.isArray(arr)) {
          return uniq(arr.map((c) => ({
            companyName: c.name,
            cohort: c.batch,
            url: c.website,
          })));
        }
      } catch {}
    }
    const html = await safeFetch("https://www.ycombinator.com/companies");
    if (!html?.ok) return [];
    const text = await html.text();
    const m = text.match(/<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!m) return [];
    try {
      const data = JSON.parse(m[1]);
      const cs: any[] = data?.props?.pageProps?.companies ?? [];
      return uniq(cs.map((c) => ({
        companyName: String(c.name ?? ""),
        cohort: c.batch,
        url: c.website ?? c.url,
      })).filter((e) => e.companyName));
    } catch { return []; }
  },
};

const ANTLER: AcceleratorParser = {
  name: "Antler",
  async fetchPortfolio() {
    const res = await safeFetch("https://www.antler.co/portfolio");
    if (!res?.ok) return [];
    const html = await res.text();
    const out: AcceleratorEntry[] = [];
    const re = /<h[1-6][^>]*>\s*([^<]{2,60})\s*<\/h[1-6]>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const name = m[1].replace(/\s+/g, " ").trim();
      if (name.length < 2 || /portfolio|cohort|antler/i.test(name)) continue;
      out.push({ companyName: name });
    }
    return uniq(out);
  },
};

const FIVE_HUNDRED: AcceleratorParser = {
  name: "500 Global",
  async fetchPortfolio() {
    const res = await safeFetch("https://500.co/companies");
    if (!res?.ok) return [];
    const html = await res.text();
    const out: AcceleratorEntry[] = [];
    const re = /<a[^>]+href="https?:\/\/[^"]+"[^>]*>\s*<[^>]+>\s*([A-Z][\w\s\.\-&]{1,40})\s*</g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      out.push({ companyName: m[1].trim() });
    }
    if (out.length === 0) {
      // Fallback: scrape all bold or strong tags
      const re2 = /<strong[^>]*>\s*([^<]{2,60})\s*<\/strong>/g;
      let m2: RegExpExecArray | null;
      while ((m2 = re2.exec(html)) !== null) {
        out.push({ companyName: m2[1].trim() });
      }
    }
    return uniq(out);
  },
};

export const ACCELERATOR_PARSERS: AcceleratorParser[] = [FRII, SKOLKOVO, YC, ANTLER, FIVE_HUNDRED];

// --- Self-test (development assertion) ---
// Asserts the matcher behaves as expected for known synonyms.
(() => {
  const cases: Array<[string, string, boolean]> = [
    ["Сбербанк", "Sberbank", true],
    ["ВТБ Bank", "VTB Bank", true],
    ["Acme Corp", "Acme", true],
    ["Foo", "Bar", false],
  ];
  for (const [a, b, expected] of cases) {
    if (namesMatch(a, b) !== expected) {
      console.warn(`[_accelerator_parsers] namesMatch self-test failed for (${a}, ${b}) — expected ${expected}`);
    }
  }
})();
