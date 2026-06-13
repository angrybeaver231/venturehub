# Signal source integrations

This file is the single source of truth for credentials needed by signal sources.
Add a row when you register a new source under `server/signals/sources/`.

| Group | Source key | Category | Env var(s) | How to obtain | Notes |
|-------|------------|----------|------------|---------------|-------|
| 1 — Public web | `website-heartbeat` | publicWeb | _(none — uses public HTTP)_ | n/a | Daily HEAD/GET probe of `startups.website` / `startups.domain`. |
| 1 — Public web | `github-public` | publicWeb | `GITHUB_TOKEN` _(optional, raises rate limit)_ | https://github.com/settings/tokens → fine-grained, repo:read | Reads commits + releases from `startups.githubRepoUrl`. |
| 1 — Public web | `telegram-public` | telegram | `TELEGRAM_BOT_TOKEN` | https://t.me/BotFather → /newbot | Bot must be a member of each public channel. Reads `startups.telegramChannel`. |
| 1 — Public web | `hh-vacancies` | publicWeb | `HH_RU_TOKEN` _(optional)_ | https://dev.hh.ru/admin → OAuth app | Public API works without token; reads `startups.hhEmployerId`. |
| 1 — Public web | `app-stores-watcher` | publicWeb | _(none)_ | n/a | iTunes Lookup + Play/RuStore HTML probe via `startups.appStoreIds`. |
| 1 — Financial | `egrul-watcher` | financial | _(none — public)_ | https://egrul.nalog.ru | Reads `startups.inn`; rate-limited, expect occasional skips. |
| 1 — Financial | `kontur-fokus` | financial | `KONTUR_FOKUS_API_KEY` | https://focus.kontur.ru → API key | Paid; without key the source reports `no_credentials`. |
| 1 — Financial | `kad-arbitr` | financial | _(none — public)_ | https://kad.arbitr.ru | Public search, anti-bot heavy; many runs return 0 events. |
| 1 — Financial | `fns-debt` | financial | _(none — public)_ | https://bo.nalog.ru / https://pb.nalog.ru | Reads `startups.inn`. |
| 1 — Financial | `tender-watcher` | financial | _(none — public)_ | https://zakupki.gov.ru | Searches federal procurement RSS by INN. |
| 1 — Public web | `media-mentions` | publicWeb | `OPENAI_API_KEY` _(optional, used for sentiment)_ | https://platform.openai.com/api-keys | Polls vc.ru / Habr / Forbes RSS by company name. |
| 1 — Public web | `accelerator-crawler` | publicWeb | _(none — public)_ | n/a | Crawls public participant pages (FRII, Skolkovo, Y Combinator, etc.). |
| 1 — Public web | `conference-tracker` | publicWeb | _(none — public)_ | n/a | Crawls conference agenda pages for company / founder names. |
| 1 — Public web | `domain-dns` | publicWeb | _(none — public)_ | n/a | Subdomains via crt.sh + MX records via DNS. |
| 1 — Public web | `news-press` | publicWeb | _(none — public)_ | n/a | Yandex News RSS by company name. |
| 2 — Social | `twitter-public` | social | `TWITTER_BEARER_TOKEN` | https://developer.twitter.com → project → Bearer Token | Read-only app. |
| 2 — Social | `linkedin-company` | social | `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` | https://www.linkedin.com/developers | OAuth client credentials. |
| 2 — Social | `group2.linkedin` | social | `LINKEDIN_API_TOKEN` | 3rd-party scraper provider (Phantombuster, Proxycurl, etc.) | Tracks founder/team posts, role changes (emits `founder_left` critical event). No-ops without token. |
| 2 — Social | `group2.twitter` | social | `TWITTER_BEARER_TOKEN` | https://developer.twitter.com | Founder/team X posts via API v2. No-ops without bearer. |
| 2 — Social | `group2.vk` | social | _(none — public scrape)_ | n/a | Public VK wall posts for team handles. |
| 2 — Social | `group2.habr-career` | social | _(none — public scrape)_ | n/a | Articles + vacancies posted on Habr Career. |
| 2 — Social | `group2.youtube` | social | `YOUTUBE_API_KEY` | https://console.cloud.google.com → YouTube Data API v3 | Searches YouTube for podcast appearances mentioning founders by name. |
| 3 — Founder OAuth | `github-app` | founderOAuth | `GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET` | https://github.com/settings/developers → New OAuth App. Callback: `https://<host>/api/startups/integrations/oauth/github-app/callback` | Scopes: `repo read:org read:user`. Per-startup tokens encrypted in `integration_credentials`. |
| 3 — Founder OAuth | `calendar` (google) | founderOAuth | `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` | https://console.cloud.google.com → OAuth client (Web). Callback: `https://<host>/api/startups/integrations/oauth/google-calendar/callback` | Scope: `calendar.readonly`. Auto-refresh via stored refresh_token. **Privacy:** stores meeting count + minutes + external participant *domains* only — NEVER titles or attendee emails. |
| 3 — Founder OAuth | `mail-forwarder` (gmail) | founderOAuth | `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` | Same Google Cloud project. Callback: `https://<host>/api/startups/integrations/oauth/google-mail/callback` | Scope: `gmail.metadata`. Headers-only; matches whitelist of payment providers (Stripe, YooKassa, RevenueCat, CloudPayments, Robokassa, AppsFlyer). Emits `revenue_signal`. |
| 3 — Founder OAuth | `yandex-metrika` | founderOAuth | `YANDEX_OAUTH_CLIENT_ID`, `YANDEX_OAUTH_CLIENT_SECRET` | https://oauth.yandex.ru → Register app, scope `metrika:read`. Callback: `https://<host>/api/startups/integrations/oauth/yandex-metrika/callback` | After OAuth, founder must paste their counter ID via the manual dialog. Daily visits/users/bounce via Reporting API. |
| 1 — Public web | `hh-vacancies` | publicWeb | _(none required; optional `HH_RU_TOKEN` for higher rate limits)_ | n/a | No OAuth — uses HH.ru's public vacancy API. Per-startup linkage via `startups.hhEmployerId` (founder pastes their company's HH employer ID). |
| 4 — Financial | `fin-tinkoff-business` | financial | _(per-startup `tinkoff-business` cred)_ | Tinkoff Business → Open API → Bearer token | Bank-statement operations → MRR estimate. |
| 4 — Financial | `fin-ru-bank` | financial | _(per-startup `ru-bank` cred; provider = tochka/modulbank/alfabank)_ | Provider's business-banking API console | Operation history → MRR estimate. |
| 4 — Financial | `fin-yookassa` | financial | _(per-startup `yookassa` cred: shopId + secretKey)_ | https://yookassa.ru → Settings → API | Successful captures → MRR estimate. |
| 4 — Financial | `fin-ru-acquiring` | financial | _(per-startup `ru-acquiring` cred; provider = cloudpayments/robokassa/tinkoff-acquiring)_ | Provider merchant cabinet | Online acquiring payments → MRR estimate. |
| 4 — Financial | `fin-intl-subscriptions` | financial | _(per-startup `intl-subscriptions` cred; provider = stripe/lemonsqueezy/paddle)_ | Provider dashboard → API keys | Active subscriptions → monthly recurring revenue. |
| 4 — Financial | `fin-bank-ocr` | financial | _(per-startup `bank-ocr` cred — set automatically on upload)_ | Manual PDF/JPG upload → OCR (tesseract; OPENAI_API_KEY for vision fallback) | Fallback when no API connector is available. |
| 4 — Financial OAuth | `intl-subscriptions` (Stripe) | financial | `STRIPE_OAUTH_CLIENT_ID`, `STRIPE_SECRET_KEY` | https://dashboard.stripe.com/settings/applications + https://dashboard.stripe.com/apikeys | Stripe Connect Standard OAuth — founder is redirected to Stripe and the platform receives a per-account access token (`read_only`). Token stored encrypted via AES-256-GCM. |
| 4 — Financial OAuth | `tinkoff-business` | financial | `TINKOFF_BUSINESS_OAUTH_CLIENT_ID`, `TINKOFF_BUSINESS_OAUTH_CLIENT_SECRET` | Tinkoff Business Open API → Application → OAuth | OAuth code-grant; refresh token stored encrypted. Falls back to API-token paste form when env vars are missing. |

### Financial credential security

- All Group 4 credentials are AES-256-GCM encrypted before persistence (`server/signals/crypto.ts`). The encryption key is derived from `INTEGRATION_ENCRYPTION_KEY` (preferred) or `SESSION_SECRET`. The save route refuses to persist credentials in plaintext if neither is set (HTTP 503).
- Every paste-in API key is test-called against the provider before save (`server/signals/sources/group4/validators.ts`). Founders see "ЮKassa rejected the credentials" / "Stripe rejected the API key" instead of a silent zero-MRR.
- ЮKassa intentionally has no OAuth flow — it ships only `shopId` + `secretKey`, so onboarding is hardened via a live `GET /v3/payments?limit=1` probe.
| 5 — Telegram | `telegram-channels` | telegram | `TELEGRAM_BOT_TOKEN` | https://t.me/BotFather → /newbot | Bot must be added to each channel. |
| 5 — Telegram | `telegram-workspace` | telegram | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` | https://t.me/BotFather → /newbot for the bot token. Pick any random string for the webhook secret. | Single platform-managed bot. Founders add it to a team chat via the per-startup deep link from `/startups/:id/telegram`. Set the Telegram webhook to `POST https://your-domain/api/telegram/webhook` with header `X-Telegram-Bot-Api-Secret-Token: $TELEGRAM_WEBHOOK_SECRET`. Counts metadata only — message content is never stored. |
| 6 — Internal events | `platform-events` | internal | _(none — internal)_ | n/a | Reads from local DB tables (events, applications, etc.). |
| 7 — Vitality scoring | `vitality-compute` | internal | _(none — internal)_ | n/a | Aggregates other sources into a 0-100 score in `vitality_scores`. |
| 8 — Reviewer/admin | `reviewer-actions` | internal | _(none — internal)_ | n/a | Emits signal events from admin/reviewer activity. |

## Scheduler

- The in-process scheduler runs `light-ingest-15m` every 15 minutes by default.
- For heavy/long-running jobs, deploy an external scheduler (GitHub Actions, cron-job.org, etc.) that hits:

  ```
  POST https://your-domain/api/cron/<jobName>
  x-cron-secret: $CRON_SHARED_SECRET
  ```

  Set `CRON_SHARED_SECRET` in the project secrets.

## Per-startup credentials

OAuth flows that issue tokens scoped to one startup should store the token in the
`integration_credentials` table (`startupId` + `kind` is unique). The base
ingestor reads credentials with `getCredential(kind, startupId)` which prefers
the per-startup row and falls back to the env-var of the same name (uppercased).
