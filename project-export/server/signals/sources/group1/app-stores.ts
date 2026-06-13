import { SignalIngestor, type IngestorContext } from "../../base";
import { getTargetStartups, safeFetch, fetchJson, getLastEvent } from "./_helpers";

type ItunesApp = {
  trackViewUrl: string;
  version: string;
  averageUserRating?: number;
  userRatingCount?: number;
  currentVersionReleaseDate?: string;
};
type ItunesResponse = { results?: ItunesApp[] };

type StoreSnapshot = {
  store: "appstore" | "googleplay" | "rustore";
  version?: string;
  rating: number | null;
  ratingCount: number;
  releaseDate?: string;
  ts: number;
};

/** Best-effort rating + review-count extractor from a Play Store details HTML page. */
function parsePlayStore(html: string): { rating: number | null; ratingCount: number } {
  let rating: number | null = null;
  let ratingCount = 0;
  // <div aria-label="Rated 4.5 stars out of five stars">
  const ratingMatch = html.match(/Rated\s+([\d.]+)\s+stars/i);
  if (ratingMatch) rating = parseFloat(ratingMatch[1]);
  // "1.2K reviews" / "1,234 reviews"
  const reviewsMatch = html.match(/([\d,.]+\s*[KkMm]?)\s*reviews?/);
  if (reviewsMatch) {
    const raw = reviewsMatch[1].replace(/,/g, "");
    const m = raw.match(/^([\d.]+)\s*([KkMm])?$/);
    if (m) {
      const base = parseFloat(m[1]);
      const mult = m[2]?.toLowerCase() === "m" ? 1_000_000 : m[2]?.toLowerCase() === "k" ? 1_000 : 1;
      ratingCount = Math.round(base * mult);
    }
  }
  return { rating, ratingCount };
}

/** Best-effort rating + review-count from a RuStore page. */
function parseRuStore(html: string): { rating: number | null; ratingCount: number } {
  let rating: number | null = null;
  let ratingCount = 0;
  const ratingMatch = html.match(/"rating"\s*:\s*([\d.]+)/) || html.match(/Рейтинг[^0-9]*([\d.,]+)/);
  if (ratingMatch) rating = parseFloat(ratingMatch[1].replace(",", "."));
  const reviewsMatch = html.match(/"reviewsCount"\s*:\s*(\d+)/) || html.match(/(\d[\d\s]*)\s*(?:отзыв|оценок|reviews?)/i);
  if (reviewsMatch) ratingCount = parseInt(reviewsMatch[1].replace(/\s/g, ""), 10) || 0;
  return { rating, ratingCount };
}

export class AppStoresSource extends SignalIngestor {
  readonly sourceKey = "app-stores-watcher";
  readonly displayName = "App stores (App Store / Play / RuStore)";
  readonly category = "publicWeb";
  readonly description = "Last-update date, rating and review-count delta for mobile apps across App Store, Google Play and RuStore.";

  protected async execute(ctx: IngestorContext): Promise<number> {
    const startups = await getTargetStartups(ctx.startup);
    let created = 0;
    for (const startup of startups) {
      const ids = startup.appStoreIds ?? null;
      if (!ids) continue;

      // ----- Apple -----
      if (ids.appStore) {
        const r = await safeFetch(`https://itunes.apple.com/lookup?id=${encodeURIComponent(ids.appStore)}`);
        const data = await fetchJson<ItunesResponse>(r);
        const app = data?.results?.[0];
        if (app) {
          const day = new Date().toISOString().slice(0, 10);
          const snapshot: StoreSnapshot = {
            store: "appstore",
            version: app.version,
            rating: typeof app.averageUserRating === "number" ? app.averageUserRating : null,
            ratingCount: app.userRatingCount ?? 0,
            releaseDate: app.currentVersionReleaseDate,
            ts: Date.now(),
          };

          // Read prior snapshot BEFORE inserting current.
          const prev = await getLastEvent(startup.id, this.sourceKey, "appstore.snapshot");
          const prevPayload = (prev?.payload ?? null) as StoreSnapshot | null;
          if (prevPayload) {
            created += await this.emitStoreDelta(startup.id, "appstore", app.trackViewUrl, prevPayload, snapshot, day);
          }

          if (await this.recordEvent({
            startupId: startup.id,
            eventType: "appstore.snapshot",
            severity: "info",
            title: `App Store: v${app.version} • ${app.averageUserRating?.toFixed?.(1) ?? "?"}★ (${app.userRatingCount ?? 0})`,
            url: app.trackViewUrl,
            payload: snapshot,
            dedupeKey: `${startup.id}:appstore:${ids.appStore}:${day}`,
          })) created++;
        }
      }

      // ----- Google Play -----
      if (ids.googlePlay) {
        const url = `https://play.google.com/store/apps/details?id=${encodeURIComponent(ids.googlePlay)}&hl=en`;
        const r = await safeFetch(url);
        if (r?.ok) {
          const html = await r.text();
          const { rating, ratingCount } = parsePlayStore(html);
          const day = new Date().toISOString().slice(0, 10);
          const snapshot: StoreSnapshot = { store: "googleplay", rating, ratingCount, ts: Date.now() };

          const prev = await getLastEvent(startup.id, this.sourceKey, "googleplay.snapshot");
          const prevPayload = (prev?.payload ?? null) as StoreSnapshot | null;
          if (prevPayload) {
            created += await this.emitStoreDelta(startup.id, "googleplay", url, prevPayload, snapshot, day);
          }

          if (await this.recordEvent({
            startupId: startup.id,
            eventType: "googleplay.snapshot",
            severity: "info",
            title: `Google Play: ${rating?.toFixed(1) ?? "?"}★ (${ratingCount.toLocaleString()})`,
            url,
            payload: snapshot,
            dedupeKey: `${startup.id}:googleplay:${ids.googlePlay}:${day}`,
          })) created++;
        }
      }

      // ----- RuStore -----
      if (ids.ruStore) {
        const url = `https://apps.rustore.ru/app/${encodeURIComponent(ids.ruStore)}`;
        const r = await safeFetch(url);
        if (r?.ok) {
          const html = await r.text();
          const { rating, ratingCount } = parseRuStore(html);
          const day = new Date().toISOString().slice(0, 10);
          const snapshot: StoreSnapshot = { store: "rustore", rating, ratingCount, ts: Date.now() };

          const prev = await getLastEvent(startup.id, this.sourceKey, "rustore.snapshot");
          const prevPayload = (prev?.payload ?? null) as StoreSnapshot | null;
          if (prevPayload) {
            created += await this.emitStoreDelta(startup.id, "rustore", url, prevPayload, snapshot, day);
          }

          if (await this.recordEvent({
            startupId: startup.id,
            eventType: "rustore.snapshot",
            severity: "info",
            title: `RuStore: ${rating?.toFixed(1) ?? "?"}★ (${ratingCount.toLocaleString()})`,
            url,
            payload: snapshot,
            dedupeKey: `${startup.id}:rustore:${ids.ruStore}:${day}`,
          })) created++;
        }
      }
    }
    return created;
  }

  private async emitStoreDelta(
    startupId: string,
    store: StoreSnapshot["store"],
    url: string,
    prev: StoreSnapshot,
    next: StoreSnapshot,
    day: string,
  ): Promise<number> {
    const reviewDelta = next.ratingCount - prev.ratingCount;
    const ratingDelta =
      next.rating !== null && prev.rating !== null
        ? +(next.rating - prev.rating).toFixed(2)
        : 0;
    if (reviewDelta === 0 && ratingDelta === 0) return 0;
    const severity =
      ratingDelta < -0.2
        ? "warning"
        : ratingDelta > 0.1 || reviewDelta > 0
          ? "positive"
          : "info";
    const inserted = await this.recordEvent({
      startupId,
      eventType: `${store}.delta`,
      severity,
      title: `${store} delta: ${ratingDelta >= 0 ? "+" : ""}${ratingDelta}★, ${reviewDelta >= 0 ? "+" : ""}${reviewDelta} reviews`,
      url,
      payload: { ratingDelta, reviewDelta, from: prev, to: next },
      dedupeKey: `${startupId}:${store}:delta:${day}`,
    });
    return inserted ? 1 : 0;
  }
}
