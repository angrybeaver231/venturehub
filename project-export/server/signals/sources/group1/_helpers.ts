import dns from "dns/promises";
import net from "net";
import { storage } from "../../../storage";
import type { Startup, SignalEvent } from "@shared/schema";

export async function getTargetStartups(provided?: Startup): Promise<Startup[]> {
  if (provided) return [provided];
  const all = await storage.getStartups();
  return all.filter((s) => s.status !== "archived");
}

/**
 * SSRF guard for founder-supplied URLs. Only allow http/https with public IPs.
 * Blocks loopback, private, link-local, multicast, and IPv6 ULA/link-local ranges.
 */
function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map((n) => parseInt(n, 10));
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a >= 224) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    return false;
  }
  if (net.isIPv6(ip)) {
    const lc = ip.toLowerCase();
    if (lc === "::1" || lc === "::") return true;
    if (lc.startsWith("fe80:") || lc.startsWith("fc") || lc.startsWith("fd")) return true;
    if (lc.startsWith("ff")) return true;
    return false;
  }
  return true;
}

export async function assertSafePublicUrl(rawUrl: string): Promise<URL> {
  const u = new URL(rawUrl);
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error(`Blocked non-http(s) scheme: ${u.protocol}`);
  }
  const host = u.hostname;
  if (!host || host === "localhost") throw new Error("Blocked host");
  let addrs: string[] = [];
  if (net.isIP(host)) {
    addrs = [host];
  } else {
    const records = await dns.lookup(host, { all: true });
    addrs = records.map((r) => r.address);
  }
  for (const ip of addrs) {
    if (isPrivateIp(ip)) {
      throw new Error(`Blocked private/internal address ${ip} for ${host}`);
    }
  }
  return u;
}

export async function safeFetch(
  url: string,
  init: RequestInit = {},
  timeoutMs = 12_000,
): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        "User-Agent":
          "BusinessClubVentureOS/1.0 (+https://ecfinuni.com signals)",
        ...(init.headers ?? {}),
      },
    });
    clearTimeout(t);
    return res;
  } catch {
    return null;
  }
}

/**
 * SSRF-safe fetch for founder-controlled URLs (websites, domains).
 * Resolves host, blocks private/loopback/link-local IPs, then fetches.
 */
export async function safeFetchPublic(
  url: string,
  init: RequestInit = {},
  timeoutMs = 12_000,
): Promise<Response | null> {
  try {
    await assertSafePublicUrl(url);
  } catch {
    return null;
  }
  return safeFetch(url, init, timeoutMs);
}

export function parseRepo(url: string | null | undefined): { owner: string; repo: string } | null {
  if (!url) return null;
  const m = url.match(/github\.com[/:]([^/]+)\/([^/?#.]+)/i);
  if (!m) return null;
  return { owner: m[1], repo: m[2].replace(/\.git$/, "") };
}

export function normalizeUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Pull the most recent event of a given (sourceKey, eventType) for a startup,
 * for delta/change detection. Returns null if none exists.
 */
export async function getLastEvent(
  startupId: string,
  sourceKey: string,
  eventType: string,
): Promise<SignalEvent | null> {
  const events = await storage.getSignalEventsForStartup(startupId, 100);
  for (const ev of events) {
    if (ev.sourceKey === sourceKey && ev.eventType === eventType) return ev;
  }
  return null;
}

export function parseFeedItems(xml: string): Array<{ title: string; link: string; pubDate?: string; description?: string }> {
  const items: Array<{ title: string; link: string; pubDate?: string; description?: string }> = [];
  const itemRe = /<(item|entry)\b[\s\S]*?<\/\1>/gi;
  const matches = xml.match(itemRe) ?? [];
  for (const block of matches) {
    const title = (block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/<!\[CDATA\[|\]\]>/g, "").trim();
    let link = "";
    const linkAttr = block.match(/<link[^>]*href=["']([^"']+)["']/i);
    if (linkAttr) link = linkAttr[1];
    if (!link) link = (block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] ?? "").trim();
    const pubDate = (block.match(/<(pubDate|updated|published)[^>]*>([\s\S]*?)<\//i)?.[2] ?? "").trim();
    const description = stripHtml((block.match(/<(description|summary|content)[^>]*>([\s\S]*?)<\//i)?.[2] ?? "").replace(/<!\[CDATA\[|\]\]>/g, ""));
    if (title || link) items.push({ title: title || link, link, pubDate, description });
  }
  return items;
}

export async function fetchJson<T>(res: Response | null): Promise<T | null> {
  if (!res || !res.ok) return null;
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
