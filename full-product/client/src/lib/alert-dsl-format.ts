// Humanize the alert DSL into a short bilingual sentence.
// Keep it pure & dependency-free so it can render anywhere — modal preview,
// rule cards, notifications dropdown, etc.

type Lang = "en" | "ru";
type Op = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains" | "in";
type Cond = { field: string; op: Op; value: any };
type Expr = { all?: Array<Cond | Expr>; any?: Array<Cond | Expr> };

const FIELD_LABEL: Record<string, { en: string; ru: string }> = {
  "event.type": { en: "event type", ru: "тип события" },
  "event.severity": { en: "severity", ru: "важность" },
  "event.payload.amountUsd": { en: "round size", ru: "размер раунда" },
  "event.payload.amount": { en: "amount", ru: "сумма" },
  "event.payload.currency": { en: "currency", ru: "валюта" },
  "event.payload.deltaPct": { en: "% change", ru: "% изменения" },
  "startup.vertical": { en: "vertical", ru: "вертикаль" },
  "startup.stage": { en: "stage", ru: "стадия" },
  "startup.name": { en: "startup name", ru: "название стартапа" },
};

const OP_LABEL: Record<Op, { en: string; ru: string }> = {
  eq: { en: "is", ru: "равно" },
  neq: { en: "is not", ru: "не равно" },
  gt: { en: ">", ru: ">" },
  gte: { en: "≥", ru: "≥" },
  lt: { en: "<", ru: "<" },
  lte: { en: "≤", ru: "≤" },
  contains: { en: "contains", ru: "содержит" },
  in: { en: "is one of", ru: "входит в" },
};

const EVENT_TYPE_LABEL: Record<string, { en: string; ru: string }> = {
  round_raised: { en: "fundraising round announced", ru: "объявлен раунд" },
  site_down: { en: "website went down", ru: "сайт недоступен" },
  founder_departed: { en: "founder left", ru: "ушёл фаундер" },
  team_chat_health: { en: "team chat health update", ru: "здоровье командного чата" },
  financial_mrr_change: { en: "MRR changed", ru: "изменился MRR" },
  founder_marked_milestone: { en: "founder marked a milestone", ru: "фаундер отметил майлстоун" },
  forward_capture: { en: "founder forwarded a message", ru: "фаундер переслал сообщение" },
};

const SEVERITY_LABEL: Record<string, { en: string; ru: string }> = {
  critical: { en: "critical", ru: "критическая" },
  warning: { en: "warning", ru: "предупреждение" },
  info: { en: "info", ru: "инфо" },
  positive: { en: "positive", ru: "позитивное" },
};

const VERTICAL_LABEL: Record<string, { en: string; ru: string }> = {
  fintech: { en: "fintech", ru: "финтех" },
  saas: { en: "SaaS", ru: "SaaS" },
  edtech: { en: "edtech", ru: "edtech" },
  healthtech: { en: "healthtech", ru: "healthtech" },
  legaltech: { en: "legaltech", ru: "legaltech" },
  agritech: { en: "agritech", ru: "agritech" },
  proptech: { en: "proptech", ru: "proptech" },
  other: { en: "other", ru: "другое" },
};

const STAGE_LABEL: Record<string, { en: string; ru: string }> = {
  idea: { en: "idea", ru: "идея" },
  mvp: { en: "MVP", ru: "MVP" },
  seed: { en: "seed", ru: "seed" },
  seriesA: { en: "Series A", ru: "Series A" },
  seriesB: { en: "Series B", ru: "Series B" },
  growth: { en: "growth", ru: "growth" },
  scaleUp: { en: "scale-up", ru: "scale-up" },
};

function pick(map: Record<string, { en: string; ru: string }> | undefined, key: string, lang: Lang): string {
  if (!map) return key;
  const v = map[key];
  return v ? v[lang] : key;
}

function fieldLabel(field: string, lang: Lang): string {
  if (FIELD_LABEL[field]) return FIELD_LABEL[field][lang];
  // event.payload.<key> → "<key>"
  if (field.startsWith("event.payload.")) {
    const tail = field.slice("event.payload.".length);
    return tail.replace(/([A-Z])/g, " $1").toLowerCase();
  }
  return field;
}

function valueLabel(field: string, value: any, lang: Lang): string {
  if (value == null) return "—";
  if (Array.isArray(value)) return value.map((v) => valueLabel(field, v, lang)).join(", ");
  if (field === "event.type") return pick(EVENT_TYPE_LABEL, String(value), lang);
  if (field === "event.severity") return pick(SEVERITY_LABEL, String(value), lang);
  if (field === "startup.vertical") return pick(VERTICAL_LABEL, String(value), lang);
  if (field === "startup.stage") return pick(STAGE_LABEL, String(value), lang);
  if (field === "event.payload.amountUsd" && typeof value === "number") {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}k`;
    return `$${value}`;
  }
  if (typeof value === "string") return `«${value}»`;
  return String(value);
}

function isExpr(x: any): x is Expr {
  return x && typeof x === "object" && (Array.isArray(x.all) || Array.isArray(x.any));
}

function describeCond(c: Cond, lang: Lang): string {
  return `${fieldLabel(c.field, lang)} ${OP_LABEL[c.op]?.[lang] ?? c.op} ${valueLabel(c.field, c.value, lang)}`;
}

export function humanizeDsl(expr: any, language: Lang = "en"): string {
  if (!expr || typeof expr !== "object") {
    return language === "ru" ? "Условие не задано" : "No condition set";
  }
  if (isExpr(expr)) {
    const join = expr.all
      ? language === "ru" ? " и " : " AND "
      : language === "ru" ? " или " : " OR ";
    const arr = expr.all ?? expr.any ?? [];
    if (arr.length === 0) return language === "ru" ? "Пустое правило" : "Empty rule";
    return arr.map((c) => humanizeDsl(c, language)).join(join);
  }
  return describeCond(expr as Cond, language);
}

// Conservative client-side validation — checks structure only.
export function isValidDsl(expr: any): boolean {
  if (!isExpr(expr)) return false;
  const arr = expr.all ?? expr.any ?? [];
  if (arr.length === 0) return false;
  return arr.every((c: any) => {
    if (isExpr(c)) return isValidDsl(c);
    return c && typeof c.field === "string" && typeof c.op === "string" && "value" in c;
  });
}
