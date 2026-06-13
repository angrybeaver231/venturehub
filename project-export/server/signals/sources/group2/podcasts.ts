import { Group2Tracker } from "./base";
import { getCredential, MissingCredentialError } from "../../credentials";
import { storage } from "../../../storage";
import type { TeamMember, Startup } from "@shared/schema";

type ApplePodcastResult = {
  trackId: number;
  trackName?: string;
  collectionName?: string;
  artistName?: string;
  trackViewUrl?: string;
  releaseDate?: string;
  description?: string;
};

type SpotifyEpisode = {
  id: string;
  name: string;
  description?: string;
  external_urls?: { spotify?: string };
  release_date?: string;
  show?: { name?: string };
};

let spotifyTokenCache: { token: string; expiresAt: number } | null = null;

async function fetchSpotifyToken(clientId: string, clientSecret: string): Promise<string | null> {
  if (spotifyTokenCache && spotifyTokenCache.expiresAt > Date.now() + 30_000) {
    return spotifyTokenCache.token;
  }
  try {
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      },
      body: "grant_type=client_credentials",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!body.access_token) return null;
    spotifyTokenCache = {
      token: body.access_token,
      expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000,
    };
    return body.access_token;
  } catch {
    return null;
  }
}

async function searchApplePodcasts(query: string): Promise<ApplePodcastResult[]> {
  try {
    const url = `https://itunes.apple.com/search?media=podcast&entity=podcastEpisode&limit=10&term=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const body = (await res.json()) as { results?: ApplePodcastResult[] };
    return Array.isArray(body.results) ? body.results : [];
  } catch {
    return [];
  }
}

async function searchSpotifyEpisodes(query: string, token: string): Promise<SpotifyEpisode[]> {
  try {
    const url = `https://api.spotify.com/v1/search?type=episode&limit=10&market=US&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return [];
    const body = (await res.json()) as { episodes?: { items?: SpotifyEpisode[] } };
    return body.episodes?.items ?? [];
  } catch {
    return [];
  }
}

/**
 * Apple Podcasts + Spotify podcast appearances tracker. Searches both
 * platforms by founder full name and emits `podcast_appearance` events.
 *
 * - Apple Podcasts uses the public iTunes Search API (no key).
 * - Spotify uses the Web API Client Credentials flow with credentials of
 *   kind `spotify-client` ({ clientId, clientSecret }) — falls back to env
 *   vars `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET`.
 */
export class PodcastTracker extends Group2Tracker {
  readonly sourceKey = "group2.podcasts";
  readonly displayName = "Apple Podcasts + Spotify";
  readonly description =
    "Podcast episodes mentioning founders by name (Apple Podcasts free; Spotify Web API).";
  readonly requiresCredentials = false;
  readonly credentialKind = "spotify-client";
  protected handleField = "fullName" as const;

  protected async hasCredentials(): Promise<boolean> {
    return true; // Apple is always available; Spotify gracefully degrades.
  }

  protected async execute(ctx: import("../../base").IngestorContext): Promise<number> {
    const startups = ctx.startup ? [ctx.startup] : await storage.getStartups();
    const allMembers = await storage.getAllTeamMembers();
    const byStartup = new Map<string, TeamMember[]>();
    for (const m of allMembers) {
      const list = byStartup.get(m.startupId) ?? [];
      list.push(m);
      byStartup.set(m.startupId, list);
    }
    let total = 0;
    for (const startup of startups) {
      for (const member of byStartup.get(startup.id) ?? []) {
        try {
          total += await this.pollMember(startup, member);
        } catch (err) {
          if (err instanceof MissingCredentialError) throw err;
          console.warn(`[signals:${this.sourceKey}] member ${member.id} failed:`, err);
        }
      }
    }
    return total;
  }

  protected async pollMember(startup: Startup, member: TeamMember): Promise<number> {
    if (!member.fullName) return 0;
    let recorded = 0;

    // --- Apple Podcasts ---
    const apple = await searchApplePodcasts(`"${member.fullName}"`);
    for (const ep of apple) {
      if (!ep.trackId) continue;
      const haystack = `${ep.trackName ?? ""} ${ep.description ?? ""} ${ep.artistName ?? ""}`.toLowerCase();
      if (!haystack.includes(member.fullName.toLowerCase())) continue;
      if (await this.recordEvent({
        startupId: startup.id,
        eventType: "podcast_appearance",
        severity: "positive",
        title: `${member.fullName} on Apple Podcasts: ${ep.trackName ?? ep.collectionName ?? ""}`.slice(0, 200),
        summary: (ep.description ?? "").slice(0, 280),
        url: ep.trackViewUrl,
        occurredAt: ep.releaseDate ? new Date(ep.releaseDate) : undefined,
        payload: {
          provider: "apple-podcasts",
          trackId: ep.trackId,
          show: ep.collectionName,
          artist: ep.artistName,
        },
        dedupeKey: `${member.id}:apple-pod:${ep.trackId}`,
      })) recorded += 1;
    }

    // --- Spotify ---
    const cred = await getCredential(this.credentialKind!, startup.id);
    const clientId = (cred?.config?.clientId as string | undefined) ?? process.env.SPOTIFY_CLIENT_ID ?? null;
    const clientSecret = (cred?.config?.clientSecret as string | undefined) ?? process.env.SPOTIFY_CLIENT_SECRET ?? null;

    if (clientId && clientSecret) {
      const token = await fetchSpotifyToken(clientId, clientSecret);
      if (token) {
        const eps = await searchSpotifyEpisodes(`"${member.fullName}"`, token);
        for (const ep of eps) {
          if (!ep || !ep.id) continue;
          const haystack = `${ep.name ?? ""} ${ep.description ?? ""}`.toLowerCase();
          if (!haystack.includes(member.fullName.toLowerCase())) continue;
          if (await this.recordEvent({
            startupId: startup.id,
            eventType: "podcast_appearance",
            severity: "positive",
            title: `${member.fullName} on Spotify: ${ep.name}`.slice(0, 200),
            summary: (ep.description ?? "").slice(0, 280),
            url: ep.external_urls?.spotify,
            occurredAt: ep.release_date ? new Date(ep.release_date) : undefined,
            payload: { provider: "spotify", episodeId: ep.id, show: ep.show?.name },
            dedupeKey: `${member.id}:spotify-pod:${ep.id}`,
          })) recorded += 1;
        }
      }
    }

    return recorded;
  }
}
