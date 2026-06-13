import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

const FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
const FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";
const FONT_MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf";

const out = path.resolve("exports/ventorix-product-report.pdf");
fs.mkdirSync(path.dirname(out), { recursive: true });

const doc = new PDFDocument({
  size: "A4",
  margins: { top: 56, bottom: 56, left: 56, right: 56 },
  bufferPages: true,
  info: {
    Title: "Ventorix — How the Product Actually Works",
    Author: "Ventorix",
    Subject: "End-to-end product walkthrough for founders and investors",
  },
});
doc.pipe(fs.createWriteStream(out));

doc.registerFont("Body", FONT_REG);
doc.registerFont("Bold", FONT_BOLD);
doc.registerFont("Mono", FONT_MONO);

const PAGE_W = doc.page.width;
const PAGE_H = doc.page.height;
const M = 56;
const CONTENT_W = PAGE_W - M * 2;

const COLORS = {
  text: "#111827",
  muted: "#4b5563",
  faint: "#6b7280",
  accent: "#2563eb",
  rule: "#d1d5db",
  panel: "#f3f4f6",
  panelBorder: "#e5e7eb",
  green: "#15803d",
  amber: "#b45309",
  red: "#b91c1c",
};

function ensureSpace(needed: number) {
  if (doc.y + needed > PAGE_H - M) doc.addPage();
}

function h1(t: string) {
  doc.addPage();
  doc.font("Bold").fontSize(22).fillColor(COLORS.text).text(t);
  doc.moveDown(0.4);
  doc
    .moveTo(M, doc.y)
    .lineTo(PAGE_W - M, doc.y)
    .lineWidth(1.2)
    .strokeColor(COLORS.accent)
    .stroke();
  doc.moveDown(0.6);
}

function h2(t: string) {
  ensureSpace(60);
  doc.moveDown(0.5);
  doc.font("Bold").fontSize(14).fillColor(COLORS.text).text(t);
  doc.moveDown(0.25);
}

function h3(t: string) {
  ensureSpace(40);
  doc.moveDown(0.3);
  doc.font("Bold").fontSize(11).fillColor(COLORS.text).text(t);
  doc.moveDown(0.15);
}

function p(t: string) {
  ensureSpace(20);
  doc
    .font("Body")
    .fontSize(10)
    .fillColor(COLORS.text)
    .text(t, { align: "left", lineGap: 2 });
  doc.moveDown(0.3);
}

function muted(t: string) {
  ensureSpace(18);
  doc.font("Body").fontSize(9).fillColor(COLORS.muted).text(t, { lineGap: 2 });
  doc.moveDown(0.3);
}

function bullet(t: string) {
  ensureSpace(18);
  const x = doc.x;
  doc
    .font("Body")
    .fontSize(10)
    .fillColor(COLORS.text)
    .text("•  " + t, M + 8, doc.y, {
      width: CONTENT_W - 8,
      lineGap: 2,
    });
  doc.x = x;
  doc.moveDown(0.15);
}

function bullets(items: string[]) {
  for (const it of items) bullet(it);
  doc.moveDown(0.2);
}

function panel(title: string, body: string) {
  const titleH = 16;
  const padding = 10;
  // Measure body height
  doc.font("Body").fontSize(9.5);
  const bodyH = doc.heightOfString(body, {
    width: CONTENT_W - padding * 2,
    lineGap: 2,
  });
  const totalH = titleH + bodyH + padding * 2 + 6;
  ensureSpace(totalH + 10);
  const top = doc.y;
  doc
    .save()
    .roundedRect(M, top, CONTENT_W, totalH, 4)
    .fillColor(COLORS.panel)
    .fill()
    .restore();
  doc
    .save()
    .roundedRect(M, top, CONTENT_W, totalH, 4)
    .lineWidth(0.6)
    .strokeColor(COLORS.panelBorder)
    .stroke()
    .restore();
  doc
    .font("Bold")
    .fontSize(10)
    .fillColor(COLORS.accent)
    .text(title, M + padding, top + padding, { width: CONTENT_W - padding * 2 });
  doc
    .font("Body")
    .fontSize(9.5)
    .fillColor(COLORS.text)
    .text(body, M + padding, top + padding + titleH, {
      width: CONTENT_W - padding * 2,
      lineGap: 2,
    });
  doc.y = top + totalH + 8;
  doc.x = M;
}

function table(headers: string[], rows: string[][], colWeights?: number[]) {
  const weights = colWeights ?? headers.map(() => 1);
  const total = weights.reduce((a, b) => a + b, 0);
  const colWidths = weights.map((w) => (CONTENT_W * w) / total);
  const padX = 6;
  const padY = 6;

  const drawRow = (cells: string[], isHeader: boolean) => {
    doc.font(isHeader ? "Bold" : "Body").fontSize(isHeader ? 9.5 : 9);
    let maxH = 0;
    const heights = cells.map((c, i) =>
      doc.heightOfString(c, { width: colWidths[i] - padX * 2, lineGap: 1.5 }),
    );
    maxH = Math.max(...heights) + padY * 2;
    ensureSpace(maxH + 4);
    const top = doc.y;
    if (isHeader) {
      doc.save().rect(M, top, CONTENT_W, maxH).fillColor("#eef2ff").fill().restore();
    }
    let x = M;
    cells.forEach((c, i) => {
      doc
        .fillColor(COLORS.text)
        .text(c, x + padX, top + padY, {
          width: colWidths[i] - padX * 2,
          lineGap: 1.5,
        });
      x += colWidths[i];
    });
    // Borders
    doc
      .save()
      .lineWidth(0.4)
      .strokeColor(COLORS.rule)
      .moveTo(M, top + maxH)
      .lineTo(M + CONTENT_W, top + maxH)
      .stroke()
      .restore();
    doc.y = top + maxH;
    doc.x = M;
  };
  drawRow(headers, true);
  rows.forEach((r) => drawRow(r, false));
  doc.moveDown(0.5);
}

// ─── Cover ────────────────────────────────────────────────────────────────
doc.font("Bold").fontSize(28).fillColor(COLORS.text);
doc.text("Ventorix", M, 140);
doc.font("Bold").fontSize(20).fillColor(COLORS.accent);
doc.text("How the Product Actually Works", M, 180);
doc.font("Body").fontSize(13).fillColor(COLORS.muted);
doc.text(
  "An end-to-end walkthrough of every founder and investor surface as it behaves today, grounded in the live codebase.",
  M,
  220,
  { width: CONTENT_W, lineGap: 3 },
);
doc.moveDown(2);
doc.font("Body").fontSize(10).fillColor(COLORS.faint);
const today = new Date().toLocaleDateString("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});
doc.text(`Generated ${today}`, M, 320);
doc.text("Iteration 2 — post free-feature lift", M, 336);

// Table of contents
doc.font("Bold").fontSize(13).fillColor(COLORS.text).text("Contents", M, 400);
doc.moveDown(0.5);
const toc = [
  "0.  Top-level architecture",
  "1.  Shared entry point — login and onboarding",
  "2.  Founder customer journey (7 stages)",
  "3.  Investor customer journey (7 stages)",
  "4.  Admin / platform operator journey",
  "5.  The background data engine",
  "6.  Cross-cutting features",
  "7.  What still requires manual setup",
  "8.  Two end-to-end CJ stories",
];
doc.font("Body").fontSize(10.5).fillColor(COLORS.text);
toc.forEach((line) => {
  doc.text(line, M + 6, doc.y);
  doc.moveDown(0.2);
});

// ─── 0. Architecture ──────────────────────────────────────────────────────
h1("0. Top-level architecture");
p(
  "Ventorix is a single full-stack TypeScript application (React 18 + Vite frontend, Express backend, Drizzle ORM on Neon Postgres). All product surfaces — startup detail, investor portfolio, alerts, integrations — read from a single canonical event log called signal_events.",
);
panel(
  "Data flow at a glance",
  "External sources → ingestor classes (one per source, registered in server/signals/sources/index.ts) → recordEvent() with sha256 dedupe → signal_events table. From there the same row is consumed by: the Vitality Score engine (5 buckets, decay-weighted), the auto-milestone extractor (gpt-4o-mini, confidence-gated), the cross-source verification matcher (sets verifiedBy[]), the inconsistency detector (9 heuristics → manual review flags), and the alert dispatcher (in-app + email + Telegram). Background work runs through a single in-process node-cron scheduler with 26 registered jobs.",
);
h3("Persistent data planes");
bullets([
  "Postgres (Neon) — primary data: users, startups, investors, signal_events, financials, vitality snapshots, milestones, alert rules.",
  "Object Storage — bank statement uploads, attachments, certificates.",
  "Encrypted-at-rest creds — integration_credentials table, AES-GCM via INTEGRATION_ENCRYPTION_KEY.",
  "Short-lived in-memory caches — Telegram message-text enrichment cache, alert-rule snoozes.",
]);

// ─── 1. Auth & onboarding ─────────────────────────────────────────────────
h1("1. Shared entry point — login and onboarding");
h2("1.1 Landing");
p(
  "/ renders pages/landing.tsx — a public, bilingual marketing page with sample startup cards. /techstar is an alternate denser variant. Public pages a non-logged-in visitor can already see: /careers, /news, /news/:id, /universities/:slug, /clubs/:slug, /p/:slug (custom landing pages built in /admin/landing).",
);
h2("1.2 Sign-in");
p(
  "One-click POST /api/login. OAuth is the primary path (OAUTH_*). Google, GitHub, and Yandex OAuth are also wired. After OAuth callback, passport creates the session; isAuthenticated middleware gates everything from then on. A frozen account (set by eventAdmin or headAdmin) is read-only — every mutation route returns 403 with code: ACCOUNT_FROZEN.",
);
h2("1.3 First-touch onboarding");
p(
  "New users land on /dashboard, which detects the incomplete-profile state and surfaces a chat-style onboarding powered by GigaChat. It collects: full name, role (founder / investor / corporate / student), org type (Financial University or external), language, and — for FU students — group number.",
);
h2("1.4 The TeamHub sidebar groups (what every logged-in user sees)");
bullets([
  "Dashboard",
  "Events (all events, my tickets, scan attendance for organisers)",
  "Learning (courses, videos, livestreams, challenges, certificates, grading)",
  "Venture OS  ←  the focus of the rest of this report",
  "Careers (browse jobs, recruitment management)",
  "Members (searchable directory)",
  "News",
  "Messages",
  "Data (admin-only — reports, org merge, landing builder, reporting, signals)",
]);
p(
  "A notification bell sits in the topbar showing severity-coloured dots and three category tabs (alerts / reviews / system). Clicking any notification deep-links to the source object.",
);

// ─── 2. Founder journey ───────────────────────────────────────────────────
h1("2. The founder customer journey");

h2("Stage 1 — Claim or create a startup");
p(
  "From /startups, the founder either finds a startup that was seeded by an admin and clicks Claim, or creates a new one via the Add startup button. The create form (createStartupSchema in shared/schema.ts) collects name, slug, description, vertical, stage, country, founded year, website, logo upload, optional aliases (RU/EN), optional INN. On create, the requesting user becomes the startup's founder member and can invite cofounders later from the Team tab.",
);

h2("Stage 2 — Founder dashboard view (/startups/:id)");
p("The startup-detail page is the founder's home. Top to bottom:");
h3("Header strip");
bullets([
  "Logo, name, vertical, stage, country.",
  "Vitality Score badge — colour-coded 0–100. Click to open popover with preset switcher (Balanced / Tech-heavy / Market-focused / any custom preset), 5 sub-scores breakdown, and 12-month sparkline.",
  "Verified MRR gold-check badge — shown only when a financial connector is currently active and MRR > 0 within the last 35 days.",
  "Founder Pulse badge — green (active) / amber (silent < 7d) / red (silent ≥ 7d). Popover shows a per-channel breakdown sparkline: github, telegram, calendar, media, financials.",
  "Quick actions: Integrations, Telegram bot, Diff (last 30 days), Edit.",
]);

h3("Vitality breakdown popover");
bullets([
  "Tech activity — github, deploys",
  "Team health — telegram chat health, hh.ru, cofounder presence",
  "Market presence — vk, habr, podcasts, news",
  "Financial health — bank connectors, stripe webhooks",
  "Legal hygiene — egrul, court, tenders",
]);

h3("Financial Story Card");
bullets([
  "Multi-metric tiles: MRR, ARR, Revenue 30d, Burn 30d, Runway months, Active customers.",
  "90-day MRR trend line (recharts).",
  "Per-source contribution bars — T-Bank vs Modulbank vs ЮKassa vs Stripe — so the founder sees exactly which connector is moving the number.",
  "Cohort retention bars (Stripe / Lemon Squeezy / Paddle today; bank connectors don't expose customer creation timestamps).",
]);

h3("Unified Timeline");
bullets([
  "Cursor-paginated, infinite-scroll.",
  "Filters: category (tech / team / market / financial / legal), source, severity, date range.",
  "Each row: source icon, severity dot, title, summary, occurred-at, green check verification badge when 2+ sources independently confirmed the event (tooltip lists contributing source names).",
  "What changed in 30 days button → DiffSinceModal with an LLM exec-summary at the top (gpt-4o-mini, bilingual EN/RU, AbortController-protected).",
]);

h3("Milestones strip");
p(
  "Auto-extracted milestones gated by confidence ≥ 70 are shown inline as approved (green ✓). Sub-70 milestones go to the admin review queue at /admin/milestones/review.",
);

h2("Stage 3 — Connecting integrations (the heart of the product)");
p(
  "There are two integration pages on purpose — they map to two different audiences and review processes.",
);

h3("A. /startups/:id/integrations — non-financial connectors (Group 3)");
table(
  ["Card", "What it pulls", "Credential", "How founder gets it"],
  [
    [
      "GitHub App",
      "Commits, PRs, releases, contributors, deleted-repo events",
      "OAuth user-token",
      "One-click GitHub OAuth",
    ],
    [
      "Yandex Метрика",
      "DAU/WAU/MAU, traffic anomalies",
      "OAuth",
      "One-click Yandex OAuth",
    ],
    [
      "Product analytics",
      "DAU/WAU/MAU + >30% drop anomaly events",
      "Provider dropdown (Plausible / Mixpanel / Amplitude / GA4) + API key (or service-account JSON for GA4)",
      "Self-issued in each tool",
    ],
    [
      "Calendar",
      "Meeting count, duration, attendee-domain set (NEVER titles or emails)",
      "OAuth (Google)",
      "One-click Google OAuth",
    ],
    [
      "Filtered mailbox",
      "Gmail History API incremental pull, subject-only classification of 30+ payment/analytics senders",
      "OAuth (Google)",
      "One-click Google OAuth",
    ],
    [
      "Inbound forwarding inbox",
      "Unique address <startupId>@in.ventorix.club + last-10 inbound metadata. Parser detects Stripe / ЮKassa / RevenueCat / AppsFlyer / Tinkoff / CloudPayments",
      "None — MX setup",
      "Founder sets a forwarding rule in their email client",
    ],
    [
      "Slack",
      "Daily metadata: active users, messages/day, channels active, channel-create/archive diff. Counts only, never message content",
      "OAuth",
      "One-click Slack OAuth (manifest at docs/slack-app-manifest.yaml)",
    ],
  ],
  [1.5, 3, 1.8, 2.5],
);
muted(
  "Privacy is a first-class label on every card: each dialog explains what is read, what is never read (calendar titles, email bodies, slack messages), and how to revoke.",
);

h3("B. /startups/:id/financial-integrations — financial connectors (Group 4)");
table(
  ["Card", "What it pulls", "How"],
  [
    [
      "Tinkoff Business (T-Bank)",
      "Last 60d inflows → MRR + ARR + revenue 30d + active customers via INN-recurring detection. Works for ООО and ИП.",
      "Founder issues personal API token at business.tbank.ru/openapi/api-keys, pastes into card.",
    ],
    [
      "RU business banks",
      "Same shape for Tochka / Modulbank / Alfabank — provider dropdown.",
      "Self-issued token from each bank's business panel.",
    ],
    [
      "ЮKassa",
      "Real polling of api.yookassa.ru.",
      "Account ID + secret key from ЮKassa dashboard.",
    ],
    [
      "RU acquiring",
      "CloudPayments / Robokassa / Tinkoff Acquiring.",
      "Provider key from each tool.",
    ],
    [
      "Stripe / Lemon Squeezy / Paddle",
      "Webhook receivers — POST /api/webhooks/{stripe,lemonsqueezy,paddle}/:startupId with HMAC verification — sub-minute event emission + signup-month cohort buckets.",
      "Add the URL as a webhook in each provider's dashboard with the signing secret.",
    ],
    [
      "Bank statement OCR",
      "Upload Sber/Tinkoff/Alfa PDF → header detection routes to per-bank template parser → CSV export available.",
      "Founder uploads PDFs whenever they want — works without any other integration.",
    ],
  ],
  [1.4, 3, 2],
);
muted(
  "Each financial connector contributes to the Verified MRR badge the moment data flows in, and contributes points into the financial_health Vitality bucket.",
);

h2("Stage 4 — Telegram workspace bot (/startups/:id/telegram)");
bullets([
  "Page shows per-founder deep links — each cofounder gets their own personal token so multiple team members can each bind their own Telegram identity.",
  "Founder clicks → opens Telegram → presses Start → bot replies bilingually confirming binding.",
  "Founder then adds the bot to their team chat — passive aggregation begins: message counts, distinct active members, member-count delta. NO message content stored.",
  "Daily team-health signal at 05:00 UTC → emits team_chat_health with activeMembers + messagesYesterday + memberDelta.",
  "🚀 reaction or #vmu hashtag → real-time founder_marked_milestone event with original message text + author (pulled from short-lived in-memory cache, never persisted).",
  "DM forwards → forward_capture events.",
  "Cofounder-leave detection runs nightly: if a known cofounder leaves the team chat, fires a CRITICAL alert.",
]);

h2("Stage 5 — Receiving alerts and review flags");
h3("/my-reviews");
p(
  "Manual review flags raised by the inconsistency detector. Each flag carries a 1-sentence LLM-generated reason in the founder's language.",
);
bullets([
  "Claimed founder MRR vs Stripe/ЮKassa MRR delta > 50%",
  "Claimed team size vs Telegram chat member count",
  "Claimed 'we shipped X' vs no GitHub commits in 30d",
  "Claimed 'raised round' vs no ЕГРЮЛ change",
  "Website down > 7d while founder posts upbeat updates",
  "HH vacancies closed all at once + founder claims 'team growing'",
  "Deleted GitHub repos in last 30d",
  "Negative news + founder reports positive metrics",
  "Generic numeric inconsistency",
]);
p(
  "The founder can attach counter-evidence via POST /api/manual-review-flags/:id/counter-evidence — a note plus optional URL — which flips the flag to acknowledged.",
);

h2("Stage 6 — Founder Pulse nudge (the silent-founder safety net)");
panel(
  "When status transitions active → silent",
  "If lastNudgeAt is null or > 7 days ago: bilingual DM via Telegram (if bound), otherwise email fallback. lastNudgeAt is updated. channelBreakdown jsonb is refreshed with the freshest per-channel timestamp (github / telegram / calendar / media / financials).",
);

h2("Stage 7 — Looking at investors who care");
p(
  "From the founder's startup-detail page, a small 'Investors watching this startup' strip lists matched investors (computed by Thesis Match), with their thesis tags and cadence preference. Founders see who is paying attention without seeing the investor's private notes.",
);

// ─── 3. Investor journey ──────────────────────────────────────────────────
h1("3. The investor customer journey");

h2("Stage 1 — Become an investor (/investors)");
p(
  "Investor signs up like any user, then either claims an existing investor profile or creates one. Profile captures: fund name, type (VC / angel / corporate / family office), AUM band, ticket size range, stage focus, vertical focus, geography focus, public LinkedIn/website, investment thesis text (free-form, up to ~500 words). Other team members can be added as investor_members (analyst / partner / scout).",
);

h2("Stage 2 — Build the watchlist (/watchlists)");
bullets([
  "Investor creates one or more watchlists ('Fintech Series A', 'Russian deeptech', etc.).",
  "Each watchlist has a cadence: daily digest / weekly digest / on-event (instant). Stored in the watchlists.cadence column.",
  "Investor adds startups via search modal (autocomplete on startup name).",
  "watchlist-digest-weekly cron (Mon 06:00 UTC = 09:00 MSK) sends weekly digests. Daily cadence runs at 06:00 UTC daily. On-event fires immediately on negative signals.",
  "Per-user dedupe via LRU cache prevents repeating the same event in consecutive digests.",
]);

h2("Stage 3 — AI thesis matching (/thesis-match)");
p(
  "Investor pastes (or auto-loads from their profile) their thesis text. Click Match → server calls gpt-4o-mini via chat() in server/ai-venture.ts with a structured prompt: extract verticals, stages, geography, keywords from the thesis, then score every startup on:",
);
bullets([
  "Tag overlap with vertical / stage / geography",
  "Thesis-keyword fit",
  "Vitality score",
  "Freshness of signals (decayed)",
  "Verified MRR availability",
]);
p("Each ranked match row shows:");
bullets([
  "Startup name + logo + Verified MRR gold check",
  "Match reasons (bullet list of which thesis facets matched)",
  "Vitality score badge with the same preset switcher used elsewhere",
  "FinancialMiniStats strip — MRR, MoM, churn, runway",
  "Add to watchlist + Open profile buttons",
]);
p(
  "Investor can save a thesis as a recurring match — re-runs nightly and surfaces new matches in the notification bell.",
);

h2("Stage 4 — Custom alert rules (/alerts/rules)");
h3("Build via template");
p(
  "10 starter templates: funding-in-vertical, MRR drop, churn spike, GitHub silence, founder-pulse silent, negative news, EGRUL founder change, court case opened, vacancy spree, Slack workspace death.",
);
h3("Build via natural language");
panel(
  "Example",
  "Investor types: 'alert me when any fintech raises >$1M' → POST /api/alert-rules/from-natural-language → nlAlertRuleToDsl() (gpt-4o-mini) returns the DSL { all: [{field:'event.type', op:'eq', value:'funding_round'}, {field:'startup.vertical', op:'eq', value:'fintech'}, {field:'event.payload.amountUsd', op:'gt', value:1000000}] } → investor confirms → rule saved.",
);
p(
  "Per-rule mute/snooze button. The dispatcher checks isRuleMuted() before firing. Deliveries land in: in-app notification bell, email (Resend), Telegram (if TELEGRAM_BOT_TOKEN is set and investor has linked a personal chat).",
);

h2("Stage 5 — Investor detail page (/investors/:id)");
bullets([
  "Profile header with thesis + tags",
  "Portfolio matches strip: same Vitality + Verified-MRR + FinancialMiniStats per row",
  "Activity feed: recent signals across watched + matched startups",
  "Notes — private notes per startup (only the investor and their team see them)",
]);

h2("Stage 6 — Daily/weekly digest in inbox");
p("The Resend-delivered digest contains:");
bullets([
  "Per-startup card: logo, name, Vitality delta vs last digest, MRR delta, top 3 newest events with severity dots",
  "'Open in Ventorix' deep links",
  "Owner-collapse: if the investor watches 5 startups all owned by the same accelerator, the digest groups them under that accelerator header",
]);

h2("Stage 7 — When something bad happens");
panel(
  "Negative-signal fast path",
  "Severity ≥ warning flows through dispatcher.ts. The 5-min cron negative-signals-5m batches warning-level events. Critical events (cofounder-leave Telegram, MRR drop > 20%, court case opened, EGRUL founder change without prior comms) take an event-driven sub-minute path. The investor's notification bell shows a red dot with a tooltip; email + Telegram delivery happen in parallel.",
);

// ─── 4. Admin journey ─────────────────────────────────────────────────────
h1("4. The admin / platform-operator journey");
bullets([
  "/admin/signals — every signal source with last-run status, next-run schedule, 'Trigger now' button.",
  "/admin/cohort-analytics — Kaplan–Meier survival curves, retention bars, 'Recompute all Vitality scores' button, LP-export PDF download (DejaVuSans-rendered, Cyrillic-safe).",
  "/admin/milestones/review — pending milestones (extracted with confidence < 70). Approve / Reject buttons. Approval moves to reviewStatus = approved; rejection deletes the row.",
  "/admin/news, /admin/landing, /admin/careers, /admin/reports — content & ops surfaces.",
]);

// ─── 5. Background data engine ────────────────────────────────────────────
h1("5. The background data engine");
h2("5.1 Cron jobs (26 registered)");
h3("Light ingest (every 15 min)");
p(
  "light-ingest-15m runs every non-internal source: GitHub, HH, EGRUL, tender, accelerator, conference, VK, Habr, podcast, news, media, domain, telegram-channel, calendar, mailbox, slack, product-analytics, financial-Tinkoff, financial-RU-banks, financial-ЮKassa, financial-acquiring, financial-intl-subs.",
);
h3("Daily aggregators");
bullets([
  "financials-aggregate-daily — computes per-startup fin-aggregate snapshot (MRR = max across sources, revenue = sum, runway = min). Prunes rows > 400 days. Emits financial.mrr_change events.",
  "vitality-recompute-nightly — recomputes Vitality scores for all startups.",
  "extract-milestones-daily (03:00 UTC) — runs the LLM milestone extractor; gates by confidence.",
  "event-verification-nightly — runs cross-source fuzzy matcher; updates verifiedBy[] on signal events.",
  "telegram-daily-aggregate (05:00 UTC) — emits team_chat_health events.",
  "founder-pulse-daily — recomputes per-founder pulse states + sends bilingual nudges on transitions.",
  "inconsistency-nightly — runs all 9 heuristics, raises manual review flags.",
]);
h3("Weekly");
bullets([
  "watchlist-digest-weekly (Mon 06:00 UTC = 09:00 MSK) — sends weekly digests.",
  "accelerator-portfolio-refresh — re-pulls all 5 accelerator portfolios.",
  "conference-roster-refresh — re-pulls speaker rosters for the 34 conferences.",
]);
h3("Event-driven (no cron)");
bullets([
  "Negative signal fast-path",
  "Stripe / LemonSqueezy / Paddle webhooks (sub-minute)",
  "Inbound email webhook",
  "Telegram webhook (passive metadata + 🚀/#vmu + DM forwards)",
]);

h2("5.2 Where signals come from — the full inventory");
table(
  ["Score category", "Sources"],
  [
    [
      "tech_activity",
      "github-app, gitlab, deploy-monitor, website-heartbeat",
    ],
    [
      "team_health",
      "hh.ru, telegram-workspace, slack-metadata, calendar",
    ],
    [
      "market_presence",
      "vk, habr-career, youtube, podcasts (Apple+Spotify), news/RSS, accelerator-crawler, conference-tracker, domain-dns, app-store, play-store, rustore",
    ],
    [
      "financial_health",
      "fin-tinkoff-business, fin-ru-bank, fin-yookassa, fin-ru-acquiring, fin-intl-subscriptions (webhooks), fin-bank-ocr, plausible, mixpanel, amplitude, ga4",
    ],
    [
      "legal_hygiene",
      "egrul-watcher, tender-watcher, court-watcher, tax-debt, mail-forwarder, inbound-inbox",
    ],
  ],
  [1.2, 3],
);

h2("5.3 How a signal becomes everything else");
panel(
  "Pipeline",
  "ingestor pulls external source → recordEvent() (sha256 dedupe by sourceKey:naturalKey) → signal_events row (severity, payload, occurredAt, sourceKey, dedupeHash, verifiedBy[]) → fans out to: Vitality recompute, milestone extractor, verification matcher, inconsistency detector, alert dispatcher (cron + event-driven). Each downstream stage writes its own table (vitality_scores, milestones, manual_review_flags, notifications) and the UI reads from all of them per surface.",
);

// ─── 6. Cross-cutting ─────────────────────────────────────────────────────
h1("6. Cross-cutting features");

h2("6.1 PWA");
bullets([
  "Service worker (client/src/service-worker.ts) caches the shell, supports offline browsing of the timeline + previously-seen startup detail.",
  "'Install Ventorix' prompt fires on second visit (handled in pwa-install-prompt.tsx).",
  "Push notification payloads are stored on notifications.push_payload — mobile push delivery is currently a no-op placeholder.",
]);

h2("6.2 Bilingual everywhere");
p(
  "LanguageContext provider wraps the app; toggle in topbar. All ingestor-generated copy that surfaces to users (alert text, milestone titles, inconsistency reasons, founder-pulse nudges, Telegram bot replies) is generated in both EN and RU at write time and chosen at render time.",
);

h2("6.3 Privacy hygiene the code actually enforces");
bullets([
  "Calendar / Slack / filtered mailbox / inbound inbox never store: meeting titles, attendee emails, slack message content, email bodies, email subject text. Only counts, durations, sender/participant domains, subject hash + classification label.",
  "Telegram bot never persists message text; the in-memory cache for 🚀 enrichment is short-lived and bounded.",
  "/api/startups/:id/inbound-inbox/recent is locked to founders/cofounders/headAdmins only.",
  "Investor private notes are not visible to founders or other investors.",
]);

h2("6.4 Subscription / plans");
bullets([
  "company_plans and company_usage tables back per-company plan tier.",
  "/subscription page lets a corporate or accelerator account upgrade.",
  "Usage counters track: startups under management, watchlist seats, alert rules per user.",
]);

h2("6.5 Audit log");
p(
  "Every mutation route writes to activity_logs (actorUserId, entityType, entityId, action, details). Surfaced in /admin/reports.",
);

// ─── 7. Manual setup ──────────────────────────────────────────────────────
h1("7. What still requires manual setup (to be honest)");
table(
  ["Item", "Status", "Action required"],
  [
    [
      "Slack OAuth manifest",
      "Code done; manifest at docs/slack-app-manifest.yaml",
      "Upload manifest to api.slack.com once (~1h, manual portal action)",
    ],
    [
      "Wildcard custom domain",
      "Needed for landing pages at *.ecfinuni.com",
      "DNS + the hosting platform wildcard",
    ],
    [
      "INBOUND_EMAIL_DOMAIN MX",
      "For <startupId>@in.ventorix.club",
      "Set MX record + env override",
    ],
    [
      "Production npm run db:push",
      "Adds watchlists.cadence, founder_pulse_states.last_nudge_at, channel_breakdown, milestones.review_status/reviewed_by/reviewed_at, alert_rules, manual_review_flags",
      "Run once in prod (currently blocked on unrelated rename prompts — follow-up #45)",
    ],
    [
      "Spotify Client Credentials",
      "SPOTIFY_CLIENT_ID/SECRET env vars",
      "Self-register a Spotify app",
    ],
    [
      "Mobile push delivery",
      "Payloads built; no APNs/FCM transport",
      "Wire one transport to ship",
    ],
  ],
  [1.4, 2.2, 2.4],
);

// ─── 8. CJ stories ────────────────────────────────────────────────────────
h1("8. Two end-to-end CJ stories");

h2("A founder, day one to day thirty");
p(
  "She signs in via Google (5s). Onboarding chat asks her role and language; she picks 'founder' and 'Russian'. She lands on the dashboard, navigates to Venture OS → Startups, clicks Add startup. Fills in name 'Pulse Health', vertical 'healthtech', stage 'MVP', website. The startup card appears immediately. She clicks into it — Vitality is 35 (the baseline; no signals yet). She visits Integrations and one-clicks GitHub OAuth and Google Calendar OAuth. She visits Financial integrations and pastes her T-Bank Business token. She visits Telegram bot, copies her personal deep link, opens it, presses Start in Telegram, then adds the bot to her team chat. She walks away.",
);
p(
  "Within 15 minutes the first GitHub commits, calendar metadata, and bank inflows arrive — Vitality climbs to 51. By day three the milestone extractor has auto-approved her first three milestones from the GitHub releases. By day seven she gets a green Verified MRR badge because T-Bank has shown 30 days of recurring inflows. By day ten she opens 'Diff in last 30 days' and sees an LLM exec-summary in Russian: 'За 30 дней: 47 коммитов в основной репозиторий, MRR вырос на 18%, команда прибавила 1 человека по данным Telegram, проведено 6 встреч с инвесторами.'",
);
p(
  "By day twenty she stops pushing to GitHub for a long weekend; on day twenty-seven the Founder Pulse bot DMs her in Russian: 'Мы давно тебя не видели в активности — всё в порядке?' She acknowledges, attaches a counter-evidence note to the auto-raised inconsistency flag ('vacation, back Monday').",
);

h2("An investor, day one to a closed deal");
p(
  "He signs in, picks 'investor' in onboarding, fills out his fund profile and pastes a 200-word thesis ('Pre-seed/seed Russian B2B SaaS, ARR < $500k, technical founders, runway > 12 months'). He goes to Thesis matching, clicks Match, and gets 23 ranked startups. The top three all have Verified MRR badges and Vitality > 70. He clicks Pulse Health → reads the timeline → opens Diff in last 30 days → sees the same exec-summary the founder saw. He clicks Add to watchlist, creates a new watchlist 'Russian B2B SaaS Q2', picks on-event cadence. He visits Alert rules, clicks the MRR drop template, scopes it to his watchlist, saves. He goes back to Thesis Matching, saves the thesis as a recurring match.",
);
p(
  "Day eight, one of the watchlisted startups gets a team_chat_health event with a sudden 5-member drop and a CRITICAL cofounder-leave alert — his phone buzzes with a Telegram DM: '🔴 Critical: cofounder Ivan Petrov left team chat at <Startup>'. He decides to pass on that one. Day fifteen, his nightly recurring thesis match surfaces a brand-new startup that scored 91 on his thesis — he opens it, reads the founder pulse breakdown (active across all 5 channels), and reaches out via the in-app Messages tab. Two weeks later he has a closed deal.",
);

// ─── Footer / page numbers ────────────────────────────────────────────────
const range = doc.bufferedPageRange();
for (let i = 0; i < range.count; i++) {
  doc.switchToPage(i);
  doc
    .font("Body")
    .fontSize(8)
    .fillColor(COLORS.faint)
    .text(
      `Ventorix — How the Product Actually Works   ·   p. ${i + 1} / ${range.count}`,
      M,
      PAGE_H - 36,
      { width: CONTENT_W, align: "center", lineBreak: false },
    );
}

doc.end();

doc.on("end", () => {
  const stat = fs.statSync(out);
  console.log(`Wrote ${out} (${(stat.size / 1024).toFixed(1)} KB)`);
});
