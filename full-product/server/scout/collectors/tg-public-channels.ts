import { db } from "../../db";
import { scoutSourceWhitelist } from "@shared/schema";
import { and, eq } from "drizzle-orm";
import { recordObservation } from "../ingest";

/**
 * Wave-1 active collector: `tg-public-channel`.
 *
 * For every channel in the whitelist (`collector='tg-public-channel'`,
 * `status='admin-approved'`), fetches the public preview page at
 * `https://t.me/s/<channel>` and parses recent posts out of the HTML —
 * no MTProto, no bot token required, only public channels with the web
 * preview enabled.
 *
 * Each parsed post becomes a raw_observation; the existing classifier +
 * entity-extractor pipeline does the rest.
 *
 * Spec: privacy — only whitelisted public channels, never private chats.
 */

const COLLECTOR = "tg-public-channel";

interface ParsedPost {
  postId: string;
  url: string;
  text: string;
  authorHandle: string;
  postedAt?: string;
}

function decodeEntities(s: string): string {
  return s
    .replace(/<br\s*\/?>(\s*)/g, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&hellip;/g, "…")
    .replace(/\s+/g, " ")
    .trim();
}

function parseTgmePreview(channel: string, html: string): ParsedPost[] {
  const posts: ParsedPost[] = [];
  const blocks = html.split(/<div class="tgme_widget_message [^"]*"/);
  for (const block of blocks.slice(1)) {
    const dataPost = /data-post="([^"]+)"/.exec(block)?.[1];
    if (!dataPost) continue;
    const postId = dataPost.split("/").pop() || dataPost;
    const textMatch = /<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/.exec(block);
    if (!textMatch) continue;
    const text = decodeEntities(textMatch[1]).slice(0, 1500);
    if (text.length < 20) continue;
    const dateBlock = /<a class="tgme_widget_message_date"[^>]*href="([^"]+)"[\s\S]*?<time[^>]*datetime="([^"]+)"/.exec(block);
    posts.push({
      postId,
      url: dateBlock?.[1] || `https://t.me/${dataPost}`,
      text,
      authorHandle: channel,
      postedAt: dateBlock?.[2],
    });
  }
  return posts;
}

function normalizeChannelHandle(raw: string): string {
  return raw
    .trim()
    .replace(/^@/, "")
    .replace(/^https?:\/\/t\.me\//, "")
    .replace(/^s\//, "")
    .replace(/\/$/, "");
}

async function fetchChannel(channel: string): Promise<ParsedPost[]> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const r = await fetch(`https://t.me/s/${channel}`, {
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; VentorixScout/1.0; +https://ventorix.club)",
        accept: "text/html",
      },
      signal: ctrl.signal,
    });
    if (!r.ok) return [];
    const html = await r.text();
    return parseTgmePreview(channel, html);
  } catch {
    return [];
  } finally {
    clearTimeout(t);
  }
}

export async function runTgPublicChannels(): Promise<{
  channels: number;
  observations: number;
  skipped: number;
}> {
  const sources = await db.select().from(scoutSourceWhitelist).where(
    and(
      eq(scoutSourceWhitelist.collector, COLLECTOR),
      eq(scoutSourceWhitelist.status, "admin-approved"),
    ),
  );
  let observations = 0;
  let skipped = 0;
  for (const src of sources) {
    const channel = normalizeChannelHandle(src.sourceIdentifier);
    if (!channel) continue;
    const posts = await fetchChannel(channel);
    for (const p of posts) {
      const result = await recordObservation({
        collector: COLLECTOR,
        sourceId: `tg:${channel}/${p.postId}`,
        sourceIdentifier: src.sourceIdentifier,
        sourceUrl: p.url,
        text: p.text,
        authorHandle: p.authorHandle,
        retentionDays: 90,
        extraPayload: {
          kind: "tg_public_post",
          channel,
          postedAt: p.postedAt,
        },
      });
      if (result.ok && result.observation) observations++;
      else skipped++;
    }
  }
  return { channels: sources.length, observations, skipped };
}
