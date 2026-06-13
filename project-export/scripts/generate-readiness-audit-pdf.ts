import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

type Row = {
  n: number;
  feature: string;
  rating: number;
  reality: string;
  blocker: string;
  action: string;
  changeNote?: string;
};

type Group = { title: string; rows: Row[] };

const data: Group[] = [
  {
    title: "Group 1 — Public-source parsers (15 features)",
    rows: [
      { n: 1, feature: "Website Heartbeat", rating: 8, reality: "146 lines, real TLS/HTTP + Last-Modified diff.", blocker: "Detects only header-level changes; single-region probe.", action: "~3d  Add Puppeteer screenshot-hash diff; multi-region probes from 3 PoPs; per-page latency budgets." },
      { n: 2, feature: "GitHub / GitLab Activity", rating: 9, reality: "298 lines, 8 real API calls, dedupe.", blocker: "No Bitbucket / Gitea; no per-author velocity breakdown.", action: "~2d  Add Bitbucket + Gitea adapters reusing the existing base; emit per-author commit counts." },
      { n: 3, feature: "Telegram Channel Monitor", rating: 8, reality: "Real Bot API + t.me/s/ scrape.", blocker: "No engagement (reaction) metric; private channels silently fail.", action: "~2d  Pull messages.getReplies via MTProto; add UX warning when channel is private." },
      { n: 4, feature: "HH.ru Vacancy Tracker", rating: 9, reality: "Real public API + auto-resolve employerId by company name (strict score-gated suggestions, manual override preserved).", blocker: "No salary trend tracking yet.", action: "~1d  Track median salary band over time; surface trend on startup card.", changeNote: "Iter 1: Added auto-resolve via /employers search with stricter matching; rating 8 → 9." },
      { n: 5, feature: "App Store / Play / RuStore", rating: 7, reality: "iTunes API + Play HTML + RuStore HTML.", blocker: "HTML scrapers break on store redesigns; no review sentiment.", action: "~5d / paid  Switch to AppFollow or Sensor Tower API; pipe reviews through gpt-4o-mini for sentiment." },
      { n: 6, feature: "ЕГРЮЛ Watcher", rating: 9, reality: "Real FNS API + Levenshtein/token fuzzy matcher against the investors table; emits investor_took_stake (positive) when a new учредитель matches a known investor; founder_change (warning) otherwise.", blocker: "FNS rate-limited; Datanewton fallback would require a paid contract.", action: "~2d  Add Datanewton/Checko fallback adapter when budget allows.", changeNote: "Iter 2: Added fuzzy investor match + self-test; rating 7 → 9." },
      { n: 7, feature: "Контур.Фокус / СПАРК", rating: 3, reality: "Wired but no real calls.", blocker: "Requires a paid commercial contract (~₽300k–₽1M/yr).", action: "~5d + ₽contract  Sign Контур or СПАРК agreement, get API key, implement REST calls into the existing ingestor stub." },
      { n: 8, feature: "Арбитражные дела (kad.arbitr)", rating: 5, reality: "Real POST to kad.arbitr.", blocker: "Cloudflare bot-detection blocks ~50% of requests; no amount parsing.", action: "~4d / paid  Add rotating residential proxy or buy Casebook/Pravo.ru API; parse claim amounts; tag plaintiff vs defendant." },
      { n: 9, feature: "Налоговая задолженность", rating: 5, reality: "Light scraper. FNS has no API for this.", blocker: "Reliability moderate; no severity scaling.", action: "~3d / paid  Switch to Контур/Datanewton paid feed; add блокировка счёта signal; severity tied to ruble amount." },
      { n: 10, feature: "Tender Tracker (zakupki)", rating: 8, reality: "Replaced RSS with the public zakupki.gov.ru EIS extended-search HTML parser. Extracts amount, status (won/lost/cancelled/completed/active), 44/223-ФЗ flag, publish date. Dedupe on registry number.", blocker: "Falls back to HTML parsing rather than the cleaner OpenData JSON feed; B2B-Center private tenders still need auth.", action: "~2d  Switch primary path to zakupki OpenData JSON feed; add B2B-Center auth.", changeNote: "Iter 2: Real EIS HTML parser w/ status & amount; rating 6 → 8." },
      { n: 11, feature: "Media Mentions", rating: 9, reality: "RSS for vc.ru / rb.ru / Habr / Forbes / РБК / Ведомости / Коммерсант + deterministic RU+EN keyword sentiment classifier piping titles through scoring before emit.", blocker: "No paid Brand24-grade providers; sentiment is rule-based, not LLM-grade.", action: "~2d  Optional gpt-4o-mini sentiment fallback for ambiguous titles; Brand24 API plug-in if budget appears.", changeNote: "Iter 1: Added 3 new RU feeds + RU/EN sentiment; rating 6 → 9." },
      { n: 12, feature: "Accelerator DB Crawler", rating: 9, reality: "Five real per-accelerator parsers (ФРИИ, Сколково, YC, Antler, 500 Global) + RU↔EN normalising matcher with self-test; emits accelerator_appearance with payload.cohort.", blocker: "Five accelerators today; long tail (Plug&Play, Techstars, Founders Factory) deferred.", action: "~2d  Extend portfolio fetchers to 10+ more accelerators.", changeNote: "Iter 2: Per-accelerator structured parsers + matcher; rating 4 → 9." },
      { n: 13, feature: "Conference Speaker Tracker", rating: 9, reality: "Expanded to 34 conferences (RIW, Slush, TC Disrupt, AI Journey, Web Summit, ProductCamp, RuCode, Aurora, YC Demo Day, …); role inference (keynote/panelist/speaker/moderator/mention); matches both team-member fullName and startup name.", blocker: "Agenda-PDF parsing via OpenAI vision deferred (works only on HTML agendas today).", action: "~3d  Optional gpt-4o-mini agenda-PDF extraction.", changeNote: "Iter 2: 4 → 34 conferences with role inference; rating 4 → 9." },
      { n: 14, feature: "Domain & DNS Monitor", rating: 9, reality: "crt.sh + MX + WHOIS expiry watch + SPF/DKIM/DMARC posture check (DMARC missing → warning, expiring < 30d → critical).", blocker: "No subdomain takeover detection; WHOIS only on second-level domain.", action: "~2d  Subdomain takeover detection (CNAME → unclaimed S3/Heroku/etc); WHOIS for newly-discovered subdomains.", changeNote: "Iter 1: Added WHOIS + SPF/DMARC posture check; rating 7 → 9." },
      { n: 15, feature: "News & Press Releases", rating: 8, reality: "Yandex + Google News + ТАСС + cross-source dedupe by normalised URL/title.", blocker: "No NewsAPI; no publish-date confidence scoring on Google News snippets.", action: "~2d  Add NewsAPI as third aggregator; per-source confidence weighting; dedupe by canonical URL.", changeNote: "Iter 1: Added Google News + ТАСС, cross-aggregator dedupe; rating 6 → 8." },
    ],
  },
  {
    title: "Group 2 — Founder / team social (5 features)",
    rows: [
      { n: 1, feature: "LinkedIn Tracker", rating: 6, reality: "Real Proxycurl integration.", blocker: "Proxycurl is paid (~$0.01/lookup); founder-left detection is keyword-based.", action: "~3d + budget  Add per-company budget cap + cache; LLM-verify \"founder left\" before alerting; weekly new-hire digest." },
      { n: 2, feature: "X / Twitter Monitor", rating: 4, reality: "Real Twitter API v2 code.", blocker: "Free tier is unusable for any real volume.", action: "~2d + $100/mo  Buy Basic plan or pivot to twitterapi.io / Apify scrapers; engagement-rate trend; mention sentiment." },
      { n: 3, feature: "VK Public Tracker", rating: 9, reality: "Public-wall scrape + real VK API (stories.get, video.get?filter=clips, groups.getMembers?filter=managers snapshot diff). Emits vk_story_metrics, vk_clips_metrics, vk_admins_snapshot, vk_admin_change (warning on remove). Gracefully no-ops without VK_SERVICE_TOKEN.", blocker: "VK Ads API still requires a paid agency contract.", action: "~2d  Plug VK Ads API when budget appears.", changeNote: "Iter 2: Stories + clips + admin diff; rating 6 → 9." },
      { n: 4, feature: "Habr Career Tracker", rating: 8, reality: "Real career scrape + Habr articles by team-member usernames + skill graph from article hubs; emits habr_post_published, habr_skill_added, habr_skill_snapshot.", blocker: "GitHub cross-reference deferred (teamMembers.github column does not yet exist — schema add owned by main_agent).", action: "~1d  Add teamMembers.github + cross-reference Habr ↔ GitHub commits.", changeNote: "Iter 2: + Habr articles + skill graph; rating 6 → 8." },
      { n: 5, feature: "YouTube / Podcast Appearances", rating: 9, reality: "YouTube Data API + dedicated PodcastTracker for Apple Podcasts (free iTunes Search API) and Spotify Web API (Client Credentials flow); separate ingestor registered. Optional Whisper transcript hook (silent without OPENAI_API_KEY).", blocker: "Whisper transcription only fires when an OpenAI key is present.", action: "~1d  Always-on Whisper when budget allows.", changeNote: "Iter 2: + Apple Podcasts + Spotify + Whisper hook; rating 7 → 9." },
    ],
  },
  {
    title: "Group 3 — OAuth integrations (7 features)",
    rows: [
      { n: 1, feature: "GitHub App (private repos)", rating: 8, reality: "Real OAuth + commits / PRs / releases polling.", blocker: "OAuth user-token (not a true GitHub App); polling not push.", action: "~3d  Convert to a real GitHub App with per-org install + finer scopes; add webhook receiver for push events." },
      { n: 2, feature: "Я.Метрика Connector", rating: 8, reality: "Real OAuth + Reporting API.", blocker: "Only DAU/WAU/MAU; no goals, cohorts, or anomaly detection.", action: "~3d  Pull goal/conversion data; cohort retention; anomaly detection on daily traffic dips." },
      { n: 3, feature: "Plausible / Mixpanel / Amplitude / GA4", rating: 9, reality: "Four real adapters (Plausible REST Bearer, Mixpanel JQL Basic auth, Amplitude Dashboard REST Basic auth, GA4 runReport with RS256 service-account JWT). Common AnalyticsSnapshot normaliser. Emits analytics_pull (info) daily + analytics_anomaly (warning) on >30% DAU drop vs 7-day baseline. lastSnapshot persisted via encryptConfig.", blocker: "Anomaly threshold is fixed at 30%.", action: "~1d  Per-startup configurable anomaly threshold.", changeNote: "Iter 2: Stub → 4 real adapters + anomaly detection; rating 2 → 9." },
      { n: 4, feature: "Google / Я Calendar", rating: 8, reality: "Real Calendar API, privacy-correct.", blocker: "Google only; no investor-domain auto-tagging.", action: "~3d  Add Я.Календарь / CalDAV adapter; auto-tag meetings whose participant domain is in the investors table." },
      { n: 5, feature: "Gmail filtered forwarder", rating: 9, reality: "Gmail History API incremental pull (lastHistoryId persisted to encrypted config; falls back to messages.list q= + baseline historyId on 404 / first run). Whitelist expanded to ≥30 senders across payments/analytics/recurring/payroll. Subject-only classification (release/invoice/failure/chargeback) — never bodies.", blocker: "Я.Почта IMAP still TBD (Yandex API quirks).", action: "~3d  Add Я.Почта IMAP adapter.", changeNote: "Iter 2: + History API + 30-sender whitelist + subject classifier; rating 7 → 9." },
      { n: 6, feature: "Custom Forwarding Inbox", rating: 9, reality: "parseInboundEmail() per-sender parser library (Stripe, ЮKassa, RevenueCat, AppsFlyer, Tinkoff, CloudPayments) returning ParsedInbound{eventType,severity,payload} — provider/kind/amount only, never raw subject text. /api/inbound-email rewired through it; persists subjectHash + bodyLength for dedupe but never the subject string. Founder UI on /startups/:id/integrations shows the unique address + last-10 metadata; the GET /recent endpoint is locked to founders/cofounders/headAdmins.", blocker: "Attachment OCR not yet wired into the inbound webhook.", action: "~2d  Pipe email attachments through tesseract + bank-template router.", changeNote: "Iter 2: Per-sender parser library + UI + auth/privacy hardened (subject text removed, /recent ACL'd); rating 5 → 9." },
      { n: 7, feature: "Slack Connector", rating: 9, reality: "Full OAuth (scopes channels:read, users:read, channels:history, team:read) → encrypted bot-token storage. Daily metadata aggregator via conversations.list / users.list / conversations.history (counts only, never bodies); diff-based slack_channel_created / slack_channel_archived events; daily slack_workspace_health event with activeUsers / messagesPerDay / channelsActive. Manifest at docs/slack-app-manifest.yaml.", blocker: "Slack manifest still needs to be uploaded to api.slack.com manually before founders can install.", action: "~1h  Upload manifest + register redirect URL.", changeNote: "Iter 2: Full OAuth + metadata + diff events; rating 2 → 9." },
    ],
  },
  {
    title: "Group 4 — Financial verification (7 features)",
    rows: [
      { n: 1, feature: "Tinkoff Business", rating: 4, reality: "Credential type + UI but 0 real API calls.", blocker: "No actual API integration.", action: "~3d + partner reg  Register as Tinkoff Business partner, implement /secured/statement, classify inbound vs outbound." },
      { n: 2, feature: "Точка / Модульбанк / Альфа", rating: 5, reality: "Only Modulbank URL is real.", blocker: "Точка / Альфа / Сбер not implemented.", action: "~5d  Implement Точка REST + Альфа OpenAPI + Сбер Business; per-bank rate-limit handling; common operation-list normaliser." },
      { n: 3, feature: "ЮKassa", rating: 8, reality: "Real api.yookassa.ru calls.", blocker: "Polling not webhooks; no refund/chargeback metrics.", action: "~2d  Subscribe to ЮKassa webhooks for instant events; track refunds + chargeback ratios; geography breakdown UI." },
      { n: 4, feature: "CloudPayments / Robokassa / Tinkoff Acquiring", rating: 5, reality: "Only CloudPayments URL is real.", blocker: "Robokassa + Tinkoff Acquiring not implemented.", action: "~3d  Implement Robokassa OperationStateExt + Tinkoff Acquiring /v2/GetState; add recurring-payment retention metric." },
      { n: 5, feature: "Stripe / LemonSqueezy / Paddle", rating: 9, reality: "Webhook receivers per provider with HMAC-SHA256 signature verification + replay window. POST /api/webhooks/{stripe,lemonsqueezy,paddle}/:startupId on express.raw() so signatures verify against exact bytes. Subscription events emit subscription_event sub-minute and update per-startup signup-month cohort buckets persisted as fin-intl-cohort daily snapshot in startup_financials. Cohort retention bars on the Financial Story Card.", blocker: "Cohort built from webhook events forward only — no Stripe customers.list backfill yet.", action: "~1d  Stripe customers.list backfill on first install.", changeNote: "Iter 2: Webhooks + cohort MRR + UI bars; rating 7 → 9." },
      { n: 6, feature: "Bank Statement OCR", rating: 9, reality: "Per-bank header-detected templates for Sberbank / Tinkoff / Alfa-Bank with bank-specific account/period/transaction regex. parseStatementSmart() routes by header, falls back to the existing generic parser + OpenAI vision. Transactions persisted in snapshot payload. CSV export endpoint /api/startups/:id/financials/statement-csv.", blocker: "Multi-page table-aware layouts can still drop columns on heavily-formatted statements.", action: "~2d  Table-detection pass via Tesseract LSTM TSV output.", changeNote: "Iter 2: Per-bank templates + CSV export; rating 6 → 9." },
      { n: 7, feature: "Verified MRR Badge", rating: 8, reality: "Fully implemented gold check.", blocker: "Single tier; no expiry warnings.", action: "~2d  Add Tier-3 \"audited financials\" badge; warn founders when verification is about to lapse; investor-facing trust score." },
    ],
  },
  {
    title: "Group 5 — Telegram workspace bot (3 features)",
    rows: [
      { n: 1, feature: "Workspace Bot (passive)", rating: 9, reality: "452 lines real, daily aggregation cron + cofounder-left detection (member-leave events cross-checked against startup_members → CRITICAL alert when a known cofounder leaves the team chat).", blocker: "No per-channel topic classifier; no weekly health email digest.", action: "~3d  Per-channel topic classifier (build vs sales); weekly health email; auto-tag chat purpose.", changeNote: "Iter 1: Added cofounder-left CRITICAL alert pipeline; rating 8 → 9." },
      { n: 2, feature: "🚀 / #vmu Trigger", rating: 8, reality: "Real, in-memory message-text cache.", blocker: "Cache lost on restart; no auto-classification.", action: "~2d  Persist message-text cache to DB; LLM auto-classify reaction-marked message (release/hire/revenue); inline confirm UI." },
      { n: 3, feature: "Founder Forward Capture", rating: 8, reality: "Real, bilingual EN/RU replies.", blocker: "No attachment handling; no voice transcription.", action: "~3d  Auto-attach screenshots/PDFs to milestones; URL preview enrichment; Whisper transcription for forwarded voice messages." },
    ],
  },
  {
    title: "Group 6 — Vitality Score engine (6 features)",
    rows: [
      { n: 1, feature: "Composite Vitality Score", rating: 8, reality: "167-line decay-weighted engine.", blocker: "Quality bound by Group 3 stubs; no explainability.", action: "~2d (after Grp 3)  Once Group 3 stubs are real, add an \"explain my score\" panel showing the top 5 contributing events to each delta." },
      { n: 2, feature: "Sub-Scores Breakdown", rating: 8, reality: "5 buckets, popover UI live.", blocker: "No per-sub-score history; no drill-down.", action: "~2d  Render sparkline per sub-score; clicking a sub-score opens a filtered timeline of its contributing events." },
      { n: 3, feature: "History Sparkline", rating: 8, reality: "12-month series.", blocker: "No event annotations; fixed time window.", action: "~2d  Overlay milestone markers on the line; configurable 3/6/12/24-month window; PNG/CSV export for IC memos." },
      { n: 4, feature: "Configurable Weights", rating: 8, reality: "Full CRUD + 3 default seeds.", blocker: "No preview before save; no A/B compare.", action: "~2d  Live preview of \"score under this preset\"; side-by-side comparison of two presets across the cohort." },
      { n: 5, feature: "Industry Benchmarks", rating: 7, reality: "Per-vertical percentiles.", blocker: "Insufficient data per vertical; no stage filter.", action: "~ongoing  Onboard ≥30 startups per vertical for stats to mean anything; add stage filter (seed vs Series A); cross-vertical comparison." },
      { n: 6, feature: "Cohort Decay Analytics", rating: 9, reality: "Pure kaplanMeier() in scoring.ts producing per-cohort {tDays,atRisk,events,censored,survival} buckets. Admin page renders K-M survival curves alongside the existing bars. GET /api/admin/cohort-analytics/lp-export.pdf streams an LP-ready PDF (pdfkit + DejaVu fonts) with title, generation date, retention bars, and per-cohort survival curves. UI Download button.", blocker: "Per-vertical / per-accelerator cohort split deferred.", action: "~2d  Add vertical/accelerator cohort split.", changeNote: "Iter 2: K-M curves + LP-export PDF; rating 7 → 9." },
    ],
  },
  {
    title: "Group 7 — Timeline (4 features)",
    rows: [
      { n: 1, feature: "Unified Event Timeline", rating: 8, reality: "Cursor pagination + filters + verification badges.", blocker: "No saved views; no bulk export.", action: "~2d  Saved-filter views per user; CSV/PDF export; group-by-week collapse for quiet startups." },
      { n: 2, feature: "Auto-Generated Milestones", rating: 9, reality: "milestone-extractor gates on confidence: ≥70 → auto_approved, else pending_review. New /admin/milestones-review page lists pending items with Approve / Reject. GET /api/admin/milestones/review, POST /:id/review, DELETE /:id. Bilingual prompt variant in the LLM call.", blocker: "No periodic fine-tune on confirmed milestones yet.", action: "~3d  Periodic fine-tune loop on approved milestones.", changeNote: "Iter 2: Confidence gating + review queue UI + bilingual prompt; rating 7 → 9." },
      { n: 3, feature: "Diff View (last 30 days)", rating: 9, reality: "Real modal + endpoint + LLM exec-summary at top of diff (gpt-4o-mini, AbortController-protected, bilingual).", blocker: "Fixed 30-day window; no shareable public link.", action: "~2d  Configurable 7/30/90-day window; shareable signed public link for IC memos.", changeNote: "Iter 1: Added LLM exec-summary with abort safety; rating 8 → 9." },
      { n: 4, feature: "Event Verification Badges", rating: 8, reality: "server/signals/event-verification.ts: findRelatedEvents() pulls 30d window via getStartupSignalEventsInWindow, asks gpt-4o-mini for related ids, sets verifiedBy[] when ≥2 distinct sourceKeys agree. Nightly cron event-verification-nightly registered. Timeline badge with tooltip listing source names already wired.", blocker: "JSON-mode model response has no schema-enforced retry — occasional malformed responses are silently dropped.", action: "~1d  Add JSON-schema response_format + retry on parse failure.", changeNote: "Iter 2: New module + LLM matcher + nightly cron; rating 7 → 8." },
    ],
  },
  {
    title: "Group 8 — Alerts (5 features)",
    rows: [
      { n: 1, feature: "Negative Signal Engine", rating: 7, reality: "Fast pipeline + delivery channels real.", blocker: "5-min cron latency; no SMS/voice escalation.", action: "~3d  Switch critical alerts to event-driven (sub-minute); add Twilio SMS + voice-call escalation for severity=critical; suppression rules." },
      { n: 2, feature: "Inconsistency Detector", rating: 8, reality: "Heuristics expanded 5 → 9 (added website_down_vs_upbeat_post, github_silence_vs_shipping_claim, deleted_repos, raised_round_vs_egrul). All flags routed through inconsistencyReason() (gpt-4o-mini, RU/EN). New POST /api/manual-review-flags/:id/counter-evidence lets the founder respond with a note + optional attachment URL; merges into details.counterEvidence and flips status to acknowledged.", blocker: "No founder-facing UI surface for the new heuristics or counter-evidence (API-only this iteration).", action: "~2d  UI surface on /my-reviews + a founder counter-evidence form.", changeNote: "Iter 2: 5 → 9 heuristics + LLM reasons + counter-evidence API; rating 7 → 8." },
      { n: 3, feature: "Custom Alert Rules", rating: 9, reality: "POST /api/alert-rules/from-natural-language calls nlAlertRuleToDsl (gpt-4o-mini) and returns a draft rule. GET /api/alert-rules/templates serves 10 starter templates (funding-in-vertical, MRR drop, churn spike, GitHub silence, founder-pulse silent, negative news, EGRUL founder change, court case opened, vacancy spree, Slack workspace death). Per-rule snooze: in-memory Map + isRuleMuted() consulted by the dispatcher; POST/DELETE /api/alert-rules/:id/mute. UI: Use template Select + NL textarea + per-row Mute/Unmute Button.", blocker: "Snooze map is in-memory; restarts clear it.", action: "~1d  Persist snoozes to a small alert_rule_snoozes table.", changeNote: "Iter 2: NL → DSL + 10 templates + snooze; rating 7 → 9." },
      { n: 4, feature: "Investor Watchlist Alerts", rating: 9, reality: "Configurable cadence per watchlist (daily/weekly/on-event), per-user dedupe LRU on event triggers, owner-collapse digests, cadence accepted on POST/PATCH.", blocker: "Plain-HTML email template; no per-startup notes shared inside the digest.", action: "~2d  Polished branded email template; per-startup notes attached to each card; founder-side acknowledgement view.", changeNote: "Iter 1: Added cadence + on-event mode + dedupe; rating 7 → 9. (Requires `npm run db:push` to add `cadence` column on prod — tracked as follow-up #45.)" },
      { n: 5, feature: "Founder Pulse Indicator", rating: 9, reality: "On active → silent transition we DM the founder bilingually via Telegram (skipped if last_nudge_at < 7d). channel_breakdown jsonb persisted on each pulse update with last-activity timestamps per channel (github / telegram / calendar / media / financials). Pulse badge popover renders the breakdown as a per-channel sparkline.", blocker: "Email fallback (when Telegram is not bound) not yet wired.", action: "~1d  Add Resend email fallback for unbound founders.", changeNote: "Iter 2: Bilingual nudge + channel breakdown + 7d throttle; rating 7 → 9." },
    ],
  },
];

const iterations: { date: string; title: string; items: string[]; notes?: string }[] = [
  {
    date: "8 May 2026",
    title: "Iteration 1 — 7 free high-leverage actions shipped",
    items: [
      "G1.4 HH.ru: auto-resolve employerId by company name (8 → 9)",
      "G1.11 Media Mentions: + RBC / Vedomosti / Kommersant feeds and deterministic RU+EN sentiment classifier (6 → 9)",
      "G1.14 Domain & DNS: + WHOIS expiry watch and SPF/DKIM/DMARC posture check (7 → 9)",
      "G1.15 News & Press: + Google News + ТАСС + cross-aggregator dedupe (6 → 8)",
      "G5.1 Telegram Workspace Bot: cofounder-left CRITICAL alert (8 → 9)",
      "G7.3 Diff View: LLM exec-summary at the top of the modal with AbortController safety (8 → 9)",
      "G8.4 Watchlist Alerts: configurable daily / weekly / on-event cadence with per-user dedupe (7 → 9)",
    ],
    notes: "All seven items shipped without paid APIs. Architect review approved. Production needs `npm run db:push` to add the `watchlists.cadence` column (follow-up #45).",
  },
  {
    date: "8 May 2026",
    title: "Iteration 2 — 19 free sub-8 features lifted",
    items: [
      "G1.6 ЕГРЮЛ: fuzzy-match new учредители against the investors table + self-test (7 → 9)",
      "G1.10 Tender Tracker: replaced RSS with public zakupki.gov.ru EIS HTML parser; status / amount / 44-223-ФЗ (6 → 8)",
      "G1.12 Accelerator DB: 5 per-accelerator structured parsers (ФРИИ, Сколково, YC, Antler, 500 Global) + RU↔EN matcher (4 → 9)",
      "G1.13 Conference Speaker: 4 → 34 conferences with role inference (4 → 9)",
      "G2.3 VK Public Tracker: + stories / clips / community-admin diff (6 → 9)",
      "G2.4 Habr Career: + Habr articles + skill graph (6 → 8)",
      "G2.5 YouTube / Podcast: + Apple Podcasts (free iTunes API) + Spotify (Client Credentials) + Whisper hook (7 → 9)",
      "G3.3 Product Analytics: stub → 4 real adapters (Plausible / Mixpanel / Amplitude / GA4) + anomaly detection (2 → 9)",
      "G3.5 Gmail forwarder: Gmail History API incremental pull + 30-sender whitelist + subject classifier (7 → 9)",
      "G3.6 Custom Forwarding Inbox: per-sender parser library + last-10 inbound UI section (5 → 9)",
      "G3.7 Slack Connector: stub → full OAuth + daily metadata + diff events + manifest (2 → 9)",
      "G4.5 Stripe / LemonSqueezy / Paddle: HMAC-verified webhooks + cohort MRR + UI bars (7 → 9)",
      "G4.6 Bank Statement OCR: per-bank templates (Sber / Tinkoff / Alfa) + CSV export (6 → 9)",
      "G6.6 Cohort Decay: Kaplan–Meier survival curves + LP-export PDF endpoint (7 → 9)",
      "G7.2 Auto-Milestones: confidence gating + admin review queue + bilingual prompt (7 → 9)",
      "G7.4 Event Verification Badges: new event-verification.ts + LLM matcher + nightly cron (7 → 8)",
      "G8.2 Inconsistency Detector: 5 → 9 heuristics + LLM reasons + counter-evidence API (7 → 8)",
      "G8.3 Custom Alert Rules: NL → DSL + 10 templates + per-rule snooze (7 → 9)",
      "G8.5 Founder Pulse: bilingual Telegram nudge + per-channel breakdown + 7d throttle (7 → 9)",
    ],
    notes: "All 19 items shipped without paid APIs. Required schema additions (milestones.review_status / reviewed_by / reviewed_at, founder_pulse_states.last_nudge_at / channel_breakdown, plus the missing alert_rules / watchlists / watchlist_startups / manual_review_flags / founder_pulse_states tables that did not exist on dev) were applied directly via additive SQL — `npm run db:push` is still blocked on prior unrelated rename prompts (system_settings / community_posts), tracked via follow-up #45. Two features (G7.4 verification, G8.2 inconsistency UI) are honestly 8 not 9 — the LLM JSON-parse path is fragile and the new heuristics still lack a founder-side UI surface.",
  },
];

function totals() {
  let count = 0, sum = 0, ge7 = 0, between5_6 = 0, le4 = 0;
  for (const g of data) for (const r of g.rows) {
    count++; sum += r.rating;
    if (r.rating >= 7) ge7++;
    else if (r.rating >= 5) between5_6++;
    else le4++;
  }
  return { count, sum, ge7, between5_6, le4, avg: sum / count };
}

const colors = {
  ink: "#0f172a",
  text: "#1f2937",
  muted: "#475569",
  faint: "#94a3b8",
  divider: "#e2e8f0",
  card: "#f8fafc",
  accent: "#0ea5e9",
  green: "#16a34a",
  yellow: "#ca8a04",
  red: "#dc2626",
  bumpBg: "#ecfdf5",
  bumpInk: "#065f46",
};

const FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
const FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";
const FONT_OBL = "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf";

function ratingColor(r: number) {
  if (r >= 8) return colors.green;
  if (r >= 5) return colors.yellow;
  return colors.red;
}

function main() {
  const t = totals();

  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 54, bottom: 54, left: 50, right: 50 },
    info: {
      Title: "Ventorix Venture OS — Honest Readiness Audit",
      Author: "Ventorix",
      Subject: "Per-feature production-readiness scoring (1–10) with action plan",
    },
  });

  doc.registerFont("Body", FONT_REG);
  doc.registerFont("Bold", FONT_BOLD);
  doc.registerFont("Italic", FONT_OBL);

  const outPath = path.resolve("exports/ventorix-readiness-audit.pdf");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const stream = fs.createWriteStream(outPath);
  doc.pipe(stream);

  const PAGE_W = doc.page.width;
  const M = doc.page.margins;
  const CONTENT_W = PAGE_W - M.left - M.right;

  // Cover header
  doc.font("Bold").fontSize(20).fillColor(colors.ink)
    .text("Ventorix Venture OS — Honest Readiness Audit", M.left, M.top, { width: CONTENT_W });
  doc.moveDown(0.4);
  doc.font("Body").fontSize(10).fillColor(colors.muted)
    .text("All ~52 spec features. Ratings 1–10 (1 = not usable, 10 = production-ready at scale). Each row shows what's stopping it from 10/10 and the concrete action to get there.", { width: CONTENT_W });

  doc.moveDown(0.8);
  // Bottom-line summary card
  const cardY = doc.y;
  const cardH = 56;
  doc.save().roundedRect(M.left, cardY, CONTENT_W, cardH, 6).fill(colors.card).restore();
  doc.font("Bold").fontSize(10).fillColor(colors.ink)
    .text("Bottom line", M.left + 14, cardY + 10);
  doc.font("Body").fontSize(9.5).fillColor(colors.text)
    .text(
      `${t.count} features audited · average ${t.avg.toFixed(2)}/10 · ${t.ge7} usable now (≥7) · ${t.between5_6} workable but rough (5–6) · ${t.le4} stubs / paid-API-gated (≤4).`,
      M.left + 14, cardY + 26, { width: CONTENT_W - 28 },
    );
  doc.y = cardY + cardH + 14;

  // Iterations log
  doc.font("Bold").fontSize(13).fillColor(colors.ink).text("Iteration log");
  doc.moveDown(0.3);
  for (const it of iterations) {
    doc.font("Bold").fontSize(10.5).fillColor(colors.ink).text(`${it.date} — ${it.title}`);
    doc.font("Body").fontSize(9.5).fillColor(colors.text);
    for (const item of it.items) {
      doc.text(`• ${item}`, { indent: 8, width: CONTENT_W - 8 });
    }
    if (it.notes) {
      doc.moveDown(0.2);
      doc.font("Italic").fontSize(9).fillColor(colors.muted).text(it.notes, { width: CONTENT_W });
    }
    doc.moveDown(0.6);
  }

  // Groups
  for (const g of data) {
    drawGroup(doc, g, M, CONTENT_W);
  }

  // Footer note
  ensureSpace(doc, 60, M);
  doc.moveDown(1.0);
  doc.font("Italic").fontSize(8.5).fillColor(colors.faint)
    .text(`Generated from scripts/generate-readiness-audit-pdf.ts on ${new Date().toISOString().slice(0, 10)}. Effort estimates assume one engineer.`, { width: CONTENT_W, align: "center" });

  doc.end();
  stream.on("finish", () => {
    console.log(`Wrote ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);
  });
}

function ensureSpace(doc: PDFKit.PDFDocument, needed: number, M: any) {
  if (doc.y + needed > doc.page.height - M.bottom) doc.addPage();
}

function drawGroup(doc: PDFKit.PDFDocument, g: Group, M: any, CONTENT_W: number) {
  ensureSpace(doc, 80, M);
  doc.moveDown(0.6);
  // group header band
  const y = doc.y;
  doc.save().rect(M.left, y, CONTENT_W, 22).fill(colors.ink).restore();
  doc.font("Bold").fontSize(11).fillColor("#ffffff")
    .text(g.title, M.left + 10, y + 5);
  doc.y = y + 28;

  for (const r of g.rows) {
    drawRow(doc, r, M, CONTENT_W);
  }
}

function drawRow(doc: PDFKit.PDFDocument, r: Row, M: any, CONTENT_W: number) {
  // Measure heights at small font
  const titleSize = 10.5;
  const bodySize = 9;
  const noteSize = 8.5;

  const x = M.left;
  const numColW = 22;
  const rateColW = 38;
  const headerRightX = x + numColW + 6;
  const headerLineW = CONTENT_W - numColW - rateColW - 12;

  // Pre-measure
  doc.font("Bold").fontSize(titleSize);
  const titleH = doc.heightOfString(r.feature, { width: headerLineW });
  doc.font("Body").fontSize(bodySize);
  const realityH = doc.heightOfString(`Reality. ${r.reality}`, { width: CONTENT_W - 16 });
  const blockerH = doc.heightOfString(`Stopping 10/10. ${r.blocker}`, { width: CONTENT_W - 16 });
  const actionH = doc.heightOfString(`Action. ${r.action}`, { width: CONTENT_W - 16 });
  let noteH = 0;
  if (r.changeNote) {
    doc.font("Italic").fontSize(noteSize);
    noteH = doc.heightOfString(r.changeNote, { width: CONTENT_W - 28 }) + 10;
  }
  const padding = 12;
  const innerH = Math.max(titleH, 14) + 2 + realityH + 4 + blockerH + 4 + actionH + (noteH ? 6 + noteH : 0);
  const cardH = innerH + padding * 2;

  ensureSpace(doc, cardH + 8, M);
  const yStart = doc.y;
  doc.save().roundedRect(x, yStart, CONTENT_W, cardH, 5).fill(colors.card).restore();

  // # column
  doc.font("Bold").fontSize(titleSize).fillColor(colors.faint)
    .text(`#${r.n}`, x + 6, yStart + padding, { width: numColW, align: "left" });

  // Title
  doc.font("Bold").fontSize(titleSize).fillColor(colors.ink)
    .text(r.feature, headerRightX, yStart + padding, { width: headerLineW });

  // Rating pill
  const pillW = rateColW - 4;
  const pillH = 18;
  const pillX = x + CONTENT_W - rateColW + 2;
  const pillY = yStart + padding - 2;
  doc.save().roundedRect(pillX, pillY, pillW, pillH, 9).fill(ratingColor(r.rating)).restore();
  doc.font("Bold").fontSize(10).fillColor("#ffffff")
    .text(`${r.rating}/10`, pillX, pillY + 4, { width: pillW, align: "center" });

  let cursorY = yStart + padding + Math.max(titleH, 14) + 4;

  doc.font("Body").fontSize(bodySize).fillColor(colors.text);
  doc.text("Reality. ", x + padding, cursorY, { continued: true })
    .font("Body").fillColor(colors.muted).text(r.reality, { width: CONTENT_W - padding * 2 });
  cursorY = doc.y + 2;

  doc.font("Body").fontSize(bodySize).fillColor(colors.text);
  doc.text("Stopping 10/10. ", x + padding, cursorY, { continued: true })
    .font("Body").fillColor(colors.muted).text(r.blocker, { width: CONTENT_W - padding * 2 });
  cursorY = doc.y + 2;

  doc.font("Body").fontSize(bodySize).fillColor(colors.text);
  doc.text("Action. ", x + padding, cursorY, { continued: true })
    .font("Body").fillColor(colors.muted).text(r.action, { width: CONTENT_W - padding * 2 });
  cursorY = doc.y;

  if (r.changeNote) {
    cursorY += 6;
    const bandH = noteH;
    doc.save().roundedRect(x + padding, cursorY, CONTENT_W - padding * 2, bandH, 4).fill(colors.bumpBg).restore();
    doc.font("Italic").fontSize(noteSize).fillColor(colors.bumpInk)
      .text(r.changeNote, x + padding + 8, cursorY + 5, { width: CONTENT_W - padding * 2 - 16 });
  }

  doc.y = yStart + cardH + 6;
}

main();
