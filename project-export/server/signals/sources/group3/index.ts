// Group 3 — Founder OAuth integrations.
// Each card on /startups/:id/integrations has a corresponding ingestor here.
// Ingestors run per-startup when credentials are present; otherwise they
// silently mark themselves as `no_credentials` so the integrations page can
// surface a "Not connected" state without spamming errors.

import { registerIngestor } from "../../registry";
import { GitHubAppSource } from "./github-app";
import { YandexMetrikaSource } from "./yandex-metrika";
import { ProductAnalyticsSource } from "./product-analytics";
import { CalendarMetadataSource } from "./calendar-metadata";
import { MailForwarderSource } from "./mail-forwarder";
import { InboundInboxSource } from "./inbound-inbox";
import { SlackMetadataSource } from "./slack-metadata";

export const GROUP3_SOURCE_KEYS = [
  "github-app",
  "yandex-metrika",
  "product-analytics",
  "calendar",
  "mail-forwarder",
  "inbound-inbox",
  "slack",
] as const;

export type Group3SourceKey = (typeof GROUP3_SOURCE_KEYS)[number];

registerIngestor(new GitHubAppSource());
registerIngestor(new YandexMetrikaSource());
registerIngestor(new ProductAnalyticsSource());
registerIngestor(new CalendarMetadataSource());
registerIngestor(new MailForwarderSource());
registerIngestor(new InboundInboxSource());
registerIngestor(new SlackMetadataSource());
