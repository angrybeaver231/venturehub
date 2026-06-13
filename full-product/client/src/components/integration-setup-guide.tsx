import type { ReactNode } from "react";
import {
  Github,
  BarChart3,
  LineChart,
  CalendarDays,
  Mail,
  Inbox,
  MessagesSquare,
  Banknote,
  CreditCard,
  Repeat,
  ExternalLink,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export type IntegrationCategory =
  | "code"
  | "analytics"
  | "communication"
  | "mail-calendar"
  | "banking"
  | "payments"
  | "subscriptions";

export type UnifiedIntegrationKind =
  // Group 3
  | "github-app"
  | "yandex-metrika"
  | "product-analytics"
  | "calendar"
  | "mail-forwarder"
  | "inbound-inbox"
  | "slack"
  // Group 4 (financial)
  | "tinkoff-business"
  | "ru-bank"
  | "bank-statement-ocr"
  | "yookassa"
  | "ru-acquiring"
  | "intl-subscriptions";

export interface IntegrationMeta {
  kind: UnifiedIntegrationKind;
  category: IntegrationCategory;
  /** "financial" → POST /financial-integrations, "group3" → POST /integrations/:kind */
  api: "financial" | "group3";
  icon: ReactNode;
  nameEn: string;
  nameRu: string;
  shortEn: string;
  shortRu: string;
  docsUrl?: string;
  stepsEn: string[];
  stepsRu: string[];
  /** When true, the integration is shown as "Coming soon" and cannot be connected. */
  comingSoon?: boolean;
}

export const INTEGRATION_CATALOG: IntegrationMeta[] = [
  {
    kind: "github-app",
    category: "code",
    api: "group3",
    icon: <Github className="h-5 w-5" />,
    nameEn: "GitHub",
    nameRu: "GitHub",
    shortEn: "Track commits, releases, and PR activity from your team's repositories.",
    shortRu: "Коммиты, релизы и активность PR из репозиториев команды.",
    docsUrl: "https://docs.github.com/en/apps/creating-github-apps",
    stepsEn: [
      "Click 'Connect with OAuth' below — this is the easiest path. If OAuth is unavailable, follow the manual steps.",
      "Open https://github.com/settings/apps → New GitHub App.",
      "Set callback URL to https://YOUR-DOMAIN/api/startups/integrations/oauth/github-app/callback.",
      "Grant 'Repository: Contents (Read)', 'Metadata (Read)', 'Pull requests (Read)' permissions.",
      "Install the app on your repos. Copy the Installation ID from the URL bar.",
      "Generate an installation access token (or a classic Personal Access Token with repo:read scope) and paste both below.",
    ],
    stepsRu: [
      "Нажмите «Подключить через OAuth» ниже — это самый простой путь. Если OAuth недоступен, действуйте по шагам ниже.",
      "Откройте https://github.com/settings/apps → New GitHub App.",
      "Укажите callback URL: https://ВАШ-ДОМЕН/api/startups/integrations/oauth/github-app/callback.",
      "Дайте права: Repository → Contents (Read), Metadata (Read), Pull requests (Read).",
      "Установите приложение на нужные репозитории. Скопируйте Installation ID из адресной строки.",
      "Создайте Installation Access Token (или классический Personal Access Token со scope repo:read) и вставьте оба значения ниже.",
    ],
  },
  {
    kind: "yandex-metrika",
    category: "analytics",
    api: "group3",
    icon: <BarChart3 className="h-5 w-5" />,
    nameEn: "Yandex Metrika",
    nameRu: "Яндекс Метрика",
    shortEn: "Daily traffic, unique visitors, and goals from Yandex Metrika.",
    shortRu: "Ежедневный трафик, уникальные посетители и цели из Метрики.",
    docsUrl: "https://yandex.ru/dev/metrika/doc/api2/concept/about.html",
    stepsEn: [
      "Sign in to https://oauth.yandex.com → Register a new app.",
      "Enable scope 'Yandex.Metrica statistics (read-only)'.",
      "Click 'Connect with OAuth' below. We'll handle the redirect for you.",
      "Manual fallback: open the Metrika dashboard → ⚙ Settings → API → copy your OAuth token.",
      "Copy the Counter ID (8-digit number) from the same Settings page.",
      "Paste the token + counter ID below.",
    ],
    stepsRu: [
      "Войдите в https://oauth.yandex.ru → «Зарегистрировать новое приложение».",
      "Выберите доступ «Яндекс.Метрика — получение статистики».",
      "Нажмите «Подключить через OAuth» ниже — мы сами выполним редирект.",
      "Без OAuth: откройте Метрику → ⚙ Настройки → API → скопируйте OAuth-токен.",
      "Скопируйте номер счётчика (8-значное число) на той же странице.",
      "Вставьте токен и номер счётчика ниже.",
    ],
  },
  {
    kind: "product-analytics",
    category: "analytics",
    api: "group3",
    icon: <LineChart className="h-5 w-5" />,
    nameEn: "Product analytics (Plausible / Mixpanel / Amplitude / GA4)",
    nameRu: "Продуктовая аналитика (Plausible / Mixpanel / Amplitude / GA4)",
    shortEn: "DAU, WAU, MAU and anomaly detection from your product analytics tool.",
    shortRu: "DAU, WAU, MAU и поиск аномалий из вашего продуктового аналитика.",
    docsUrl: "https://plausible.io/docs/stats-api",
    stepsEn: [
      "Pick your provider in the form below.",
      "Plausible: Account → API keys → Generate. Copy the key. Project ID = your site domain (e.g. acme.com).",
      "Mixpanel: Project Settings → Service Accounts → 'New'. Username goes in API key, secret in API secret. Project ID is the numeric Project ID.",
      "Amplitude: Settings → Projects → API key + Secret key. Project ID is the numeric Project ID.",
      "GA4: Google Cloud Console → IAM → Service Accounts → create JSON key. Paste the entire JSON. Project ID is your GA4 Property ID (numbers only).",
      "Save. We pull metrics every 24h and emit an anomaly event when DAU drops > 30%.",
    ],
    stepsRu: [
      "Выберите провайдера в форме ниже.",
      "Plausible: Account → API keys → Generate. Скопируйте ключ. Project ID — это домен сайта (например, acme.com).",
      "Mixpanel: Project Settings → Service Accounts → «New». Username — это API key, secret — API secret. Project ID — числовой ID проекта.",
      "Amplitude: Settings → Projects → API key + Secret key. Project ID — числовой ID проекта.",
      "GA4: Google Cloud Console → IAM → Service Accounts → создайте JSON-ключ. Вставьте JSON целиком. Project ID — числовой Property ID GA4.",
      "Сохраните. Мы тянем метрики раз в сутки и поднимаем аномалию при падении DAU > 30%.",
    ],
  },
  {
    kind: "calendar",
    category: "mail-calendar",
    api: "group3",
    comingSoon: true,
    icon: <CalendarDays className="h-5 w-5" />,
    nameEn: "Calendar (Google / Yandex)",
    nameRu: "Календарь (Google / Yandex)",
    shortEn: "Meeting frequency and customer-facing time. Metadata only — never event titles or attendees.",
    shortRu: "Частота встреч и время с клиентами. Только метаданные — без заголовков и участников.",
    docsUrl: "https://developers.google.com/calendar/api/guides/overview",
    stepsEn: [
      "Easiest: click 'Connect with OAuth' below.",
      "Manual Google: Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 client. Enable Calendar API.",
      "Generate a refresh token via OAuth Playground (https://developers.google.com/oauthplayground) with scope https://www.googleapis.com/auth/calendar.readonly.",
      "Manual Yandex: https://oauth.yandex.com → register app with 'Calendar (read-only)' scope. Copy access + refresh tokens.",
      "Paste both tokens below. We never read titles, descriptions, or attendee emails.",
    ],
    stepsRu: [
      "Самый простой путь — кнопка «Подключить через OAuth» ниже.",
      "Google вручную: Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 client. Включите Calendar API.",
      "Получите refresh token через OAuth Playground (https://developers.google.com/oauthplayground) со scope https://www.googleapis.com/auth/calendar.readonly.",
      "Yandex вручную: https://oauth.yandex.ru → создайте приложение со scope «Календарь (только чтение)». Скопируйте access и refresh токены.",
      "Вставьте оба токена ниже. Мы никогда не читаем заголовки, описания и адреса участников.",
    ],
  },
  {
    kind: "mail-forwarder",
    category: "mail-calendar",
    api: "group3",
    comingSoon: true,
    icon: <Mail className="h-5 w-5" />,
    nameEn: "Filtered mailbox (Gmail / Yandex)",
    nameRu: "Фильтрованный ящик (Gmail / Yandex)",
    shortEn: "Detect transactional emails (Stripe, Tinkoff, ЮKassa) — subject + sender only.",
    shortRu: "Распознаём транзакционные письма (Stripe, Тинькофф, ЮKassa) — только тема и отправитель.",
    docsUrl: "https://developers.google.com/gmail/api/guides",
    stepsEn: [
      "Gmail: Google Cloud Console → enable Gmail API → OAuth 2.0 client. Required scope: https://www.googleapis.com/auth/gmail.metadata.",
      "Get a refresh token via OAuth Playground.",
      "Yandex Mail: https://oauth.yandex.com → app with scope 'mail:imap_ro'.",
      "Edit the whitelist below to control which sender domains we look at.",
      "Paste the access token. We only read subject + sender headers, never body.",
    ],
    stepsRu: [
      "Gmail: Google Cloud Console → включите Gmail API → OAuth 2.0 client. Scope: https://www.googleapis.com/auth/gmail.metadata.",
      "Получите refresh token через OAuth Playground.",
      "Yandex Mail: https://oauth.yandex.ru → создайте приложение со scope «mail:imap_ro».",
      "Отредактируйте белый список ниже, чтобы выбрать, чьи письма читать.",
      "Вставьте access токен. Мы читаем только заголовки темы и отправителя, без тела письма.",
    ],
  },
  {
    kind: "inbound-inbox",
    category: "mail-calendar",
    api: "group3",
    icon: <Inbox className="h-5 w-5" />,
    nameEn: "Inbound forwarding inbox",
    nameRu: "Форвардинг-ящик",
    shortEn: "Get a unique address — forward Stripe / ЮKassa / RevenueCat receipts to it.",
    shortRu: "Уникальный адрес — пересылайте на него чеки Stripe / ЮKassa / RevenueCat.",
    stepsEn: [
      "Click 'Connect' to provision your unique address.",
      "Copy the address shown on the card.",
      "In Stripe: Developers → Webhooks → Email receipts → add the address.",
      "In ЮKassa: Settings → Notifications → forward email receipts.",
      "Optional: set up a Gmail/Outlook filter to auto-forward matching messages.",
      "We extract amount, currency, and provider from subject + sender. We never store the email body.",
    ],
    stepsRu: [
      "Нажмите «Подключить», чтобы получить уникальный адрес.",
      "Скопируйте адрес, который появится на карточке.",
      "В Stripe: Developers → Webhooks → Email receipts → добавьте адрес.",
      "В ЮKassa: Настройки → Уведомления → перенаправление чеков на e-mail.",
      "Опционально: фильтр в Gmail/Outlook для автопересылки нужных писем.",
      "Из заголовков мы достаём сумму, валюту и провайдера. Тело письма не сохраняется.",
    ],
  },
  {
    kind: "slack",
    category: "communication",
    api: "group3",
    comingSoon: true,
    icon: <MessagesSquare className="h-5 w-5" />,
    nameEn: "Slack",
    nameRu: "Slack",
    shortEn: "Workspace health: active users, channels, message volume. No content stored.",
    shortRu: "Здоровье воркспейса: активные участники, каналы, объём сообщений. Без хранения текста.",
    docsUrl: "https://api.slack.com/apps",
    stepsEn: [
      "Open https://api.slack.com/apps → Create New App → From scratch.",
      "Pick your workspace.",
      "OAuth & Permissions → add bot scopes: channels:read, users:read, conversations.history.",
      "Install to workspace and approve.",
      "Copy the Bot User OAuth Token (starts with xoxb-) and your Team ID (Workspace settings → About).",
      "Paste both below.",
    ],
    stepsRu: [
      "Откройте https://api.slack.com/apps → Create New App → From scratch.",
      "Выберите воркспейс.",
      "OAuth & Permissions → добавьте bot scopes: channels:read, users:read, conversations.history.",
      "Установите приложение в воркспейс и подтвердите.",
      "Скопируйте Bot User OAuth Token (начинается с xoxb-) и Team ID (настройки воркспейса → About).",
      "Вставьте оба значения ниже.",
    ],
  },
  // ---- Financial ----
  {
    kind: "tinkoff-business",
    category: "banking",
    api: "financial",
    icon: <Banknote className="h-5 w-5" />,
    nameEn: "Tinkoff Business",
    nameRu: "Тинькофф Бизнес",
    shortEn: "Daily MRR, runway, and burn from your business account.",
    shortRu: "Ежедневный MRR, runway и burn по расчётному счёту.",
    docsUrl: "https://www.tinkoff.ru/business/openapi/",
    stepsEn: [
      "Sign in to Tinkoff Business → Settings → API.",
      "Click 'Generate token' (Bearer / Bank API).",
      "Copy the token and your account number (20-digit).",
      "Paste both below. We pull daily snapshots and never write back.",
    ],
    stepsRu: [
      "Войдите в Тинькофф Бизнес → Настройки → API.",
      "Нажмите «Сгенерировать токен» (Bearer / Bank API).",
      "Скопируйте токен и номер счёта (20 цифр).",
      "Вставьте оба значения ниже. Мы только читаем — записи в банк не делаем.",
    ],
  },
  {
    kind: "ru-bank",
    category: "banking",
    api: "financial",
    icon: <Banknote className="h-5 w-5" />,
    nameEn: "Точка / Модульбанк / Альфа-Бизнес",
    nameRu: "Точка / Модульбанк / Альфа-Бизнес",
    shortEn: "Daily balance + revenue snapshots from RU business banks.",
    shortRu: "Ежедневный баланс и выручка из российских бизнес-банков.",
    stepsEn: [
      "Pick your bank below.",
      "Точка: Settings → API & integrations → Generate token.",
      "Модульбанк: Profile → Modulbank API → Issue token.",
      "Альфа-Бизнес: Open API portal → 'My applications' → create read-only token.",
      "Paste the token below.",
    ],
    stepsRu: [
      "Выберите банк ниже.",
      "Точка: Настройки → API → Сгенерировать токен.",
      "Модульбанк: Профиль → Modulbank API → Выпустить токен.",
      "Альфа-Бизнес: портал Open API → «Мои приложения» → создайте read-only токен.",
      "Вставьте токен ниже.",
    ],
  },
  {
    kind: "bank-statement-ocr",
    category: "banking",
    api: "financial",
    icon: <Banknote className="h-5 w-5" />,
    nameEn: "Bank statement (PDF / OCR)",
    nameRu: "Банковская выписка (PDF / OCR)",
    shortEn: "No API access? Just upload your monthly PDF statement and we'll extract the numbers.",
    shortRu: "Нет доступа к API? Загрузите PDF-выписку — мы сами достанем цифры.",
    stepsEn: [
      "Export your monthly statement from internet-bank as PDF.",
      "Drop it on the upload panel below — we autodetect Sberbank, Tinkoff, Alfa-Bank templates.",
      "We extract turnover, balance, counterparties; never store the file.",
      "Repeat each month, or set up a recurring email export and forward to the inbound inbox.",
    ],
    stepsRu: [
      "В интернет-банке выгрузите выписку за месяц в PDF.",
      "Перетащите файл в панель ниже — мы автоматически распознаём шаблоны Сбербанка, Тинькофф, Альфы.",
      "Извлекаем оборот, баланс и контрагентов; сам файл не храним.",
      "Повторяйте раз в месяц или настройте автоотправку выписки на форвардинг-ящик.",
    ],
  },
  {
    kind: "yookassa",
    category: "payments",
    api: "financial",
    icon: <CreditCard className="h-5 w-5" />,
    nameEn: "ЮKassa",
    nameRu: "ЮKassa",
    shortEn: "Payment volume, refusal rate, geography from ЮKassa.",
    shortRu: "Объём платежей, доля отказов, география из ЮKassa.",
    docsUrl: "https://yookassa.ru/developers/api",
    stepsEn: [
      "Sign in to https://yookassa.ru → Settings → API keys.",
      "Copy your shopId.",
      "Click 'Issue secret key' and copy it (live key starts with live_).",
      "Paste both below.",
    ],
    stepsRu: [
      "Войдите в https://yookassa.ru → Настройки → API ключи.",
      "Скопируйте shopId.",
      "Нажмите «Выпустить секретный ключ» и скопируйте его (live-ключ начинается с live_).",
      "Вставьте оба значения ниже.",
    ],
  },
  {
    kind: "ru-acquiring",
    category: "payments",
    api: "financial",
    icon: <Wallet className="h-5 w-5" />,
    nameEn: "RU acquiring (CloudPayments / Robokassa / Tinkoff)",
    nameRu: "Эквайринг РФ (CloudPayments / Robokassa / Тинькофф)",
    shortEn: "Acquiring throughput + refusals from RU payment gateways.",
    shortRu: "Оборот эквайринга и отказы из российских платёжных шлюзов.",
    stepsEn: [
      "Pick your acquirer below.",
      "CloudPayments: Settings → API → Public ID + API password.",
      "Robokassa: Technical settings → Merchant login + Password #2.",
      "Tinkoff Acquiring: Personal cabinet → Terminal → terminalKey + password.",
      "Paste both fields below.",
    ],
    stepsRu: [
      "Выберите эквайера ниже.",
      "CloudPayments: Настройки → API → Public ID + API password.",
      "Robokassa: Технические настройки → Логин + Пароль №2.",
      "Тинькофф Эквайринг: личный кабинет → терминал → terminalKey + пароль.",
      "Вставьте оба значения ниже.",
    ],
  },
  {
    kind: "intl-subscriptions",
    category: "subscriptions",
    api: "financial",
    icon: <Repeat className="h-5 w-5" />,
    nameEn: "Stripe / Lemon Squeezy / Paddle",
    nameRu: "Stripe / Lemon Squeezy / Paddle",
    shortEn: "Real-time subscription MRR + cohort retention from international gateways.",
    shortRu: "MRR подписок в реальном времени и удержание по когортам.",
    docsUrl: "https://docs.stripe.com/keys",
    stepsEn: [
      "Pick your provider below.",
      "Stripe: Developers → API keys → reveal Restricted key with read access to charges, customers, subscriptions.",
      "Lemon Squeezy: Settings → API → Create new API key.",
      "Paddle: Authentication → API key (read-only).",
      "Paste the key + currency (USD / EUR / RUB) below.",
      "Optional: also wire the webhook at /api/webhooks/<provider> for real-time signal events.",
    ],
    stepsRu: [
      "Выберите провайдера ниже.",
      "Stripe: Developers → API keys → создайте Restricted key с правами read для charges, customers, subscriptions.",
      "Lemon Squeezy: Settings → API → Create new API key.",
      "Paddle: Authentication → API key (read-only).",
      "Вставьте ключ и валюту (USD / EUR / RUB) ниже.",
      "Опционально: настройте вебхук на /api/webhooks/<provider> для событий в реальном времени.",
    ],
  },
];

export const CATEGORY_LABELS: Record<IntegrationCategory, { en: string; ru: string; icon: ReactNode }> = {
  code: { en: "Code", ru: "Код", icon: <Github className="h-4 w-4" /> },
  analytics: { en: "Analytics", ru: "Аналитика", icon: <BarChart3 className="h-4 w-4" /> },
  communication: { en: "Communication", ru: "Коммуникация", icon: <MessagesSquare className="h-4 w-4" /> },
  "mail-calendar": { en: "Mail & Calendar", ru: "Почта и календарь", icon: <Mail className="h-4 w-4" /> },
  banking: { en: "Banking", ru: "Банки", icon: <Banknote className="h-4 w-4" /> },
  payments: { en: "Payments", ru: "Платежи", icon: <CreditCard className="h-4 w-4" /> },
  subscriptions: { en: "Subscriptions", ru: "Подписки", icon: <Repeat className="h-4 w-4" /> },
};

export function SetupGuideContent({
  meta,
  language,
}: {
  meta: IntegrationMeta;
  language: "en" | "ru";
}) {
  const ru = language === "ru";
  const steps = ru ? meta.stepsRu : meta.stepsEn;
  return (
    <div className="space-y-3" data-testid={`guide-${meta.kind}`}>
      <p className="text-sm text-muted-foreground">{ru ? meta.shortRu : meta.shortEn}</p>
      <ol className="space-y-2 list-decimal list-inside text-sm">
        {steps.map((s, i) => (
          <li key={i} data-testid={`guide-step-${meta.kind}-${i}`}>
            {s}
          </li>
        ))}
      </ol>
      {meta.docsUrl && (
        <Button asChild variant="outline" size="sm" data-testid={`button-docs-${meta.kind}`}>
          <a href={meta.docsUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-2" />
            {ru ? "Открыть документацию" : "Open provider docs"}
          </a>
        </Button>
      )}
    </div>
  );
}
