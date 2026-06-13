// Each Group 1–5 task should add its source ingestor here, e.g.:
//
//   import { GitHubSignalSource } from "./github";
//   registerIngestor(new GitHubSignalSource());
//
// The base infrastructure (registry, scheduler, status badges, dedupe) lives in
// the parent `server/signals/` folder.

import { registerIngestor } from "../registry";
import { PlatformEventsSource } from "./platform-events";
import { VitalityComputeSource } from "./vitality-compute";
import { ReviewerActionsSource } from "./reviewer-actions";
import { LinkedInTracker } from "./group2/linkedin";
import { TwitterTracker } from "./group2/twitter";
import { VkTracker } from "./group2/vk";
import { HabrCareerTracker } from "./group2/habr-career";
import { YouTubePodcastTracker } from "./group2/youtube";
import { PodcastTracker } from "./group2/podcasts";
import { TelegramWorkspaceSource } from "./telegram-bot";

// --- Group 1: Public source parsers (Task #20) ---
import { WebsiteHeartbeatSource } from "./group1/website-heartbeat";
import { GithubPublicSource } from "./group1/github-public";
import { TelegramPublicSource } from "./group1/telegram-public";
import { HhVacanciesSource } from "./group1/hh-vacancies";
import { AppStoresSource } from "./group1/app-stores";
import { EgrulWatcherSource } from "./group1/egrul-watcher";
import { KonturFokusSource } from "./group1/kontur-fokus";
import { KadArbitrSource } from "./group1/kad-arbitr";
import { FnsDebtSource } from "./group1/fns-debt";
import { TenderWatcherSource } from "./group1/tender-watcher";
import { MediaMentionsSource } from "./group1/media-mentions";
import { AcceleratorCrawlerSource } from "./group1/accelerator-crawler";
import { ConferenceTrackerSource } from "./group1/conference-tracker";
import { DomainDnsSource } from "./group1/domain-dns";
import { NewsPressSource } from "./group1/news-press";

// Internal-category baseline sources (Groups 6, 7, 8).
registerIngestor(new PlatformEventsSource());
registerIngestor(new VitalityComputeSource());
registerIngestor(new ReviewerActionsSource());

// Group 1 — public source parsers.
registerIngestor(new WebsiteHeartbeatSource());
registerIngestor(new GithubPublicSource());
registerIngestor(new TelegramPublicSource());
registerIngestor(new HhVacanciesSource());
registerIngestor(new AppStoresSource());
registerIngestor(new EgrulWatcherSource());
registerIngestor(new KonturFokusSource());
registerIngestor(new KadArbitrSource());
registerIngestor(new FnsDebtSource());
registerIngestor(new TenderWatcherSource());
registerIngestor(new MediaMentionsSource());
registerIngestor(new AcceleratorCrawlerSource());
registerIngestor(new ConferenceTrackerSource());
registerIngestor(new DomainDnsSource());
registerIngestor(new NewsPressSource());

// Group 2 — Founder & team social trackers.
registerIngestor(new LinkedInTracker());
registerIngestor(new TwitterTracker());
registerIngestor(new VkTracker());
registerIngestor(new HabrCareerTracker());
registerIngestor(new YouTubePodcastTracker());
registerIngestor(new PodcastTracker());

// Group 3 — Founder OAuth integrations.
import "./group3";

// Group 4 — Financial verification & Verified MRR badge.
import "./group4";

// Group 5 — Telegram workspace bot
registerIngestor(new TelegramWorkspaceSource());
