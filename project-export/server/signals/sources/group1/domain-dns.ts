import dns from "dns/promises";
import net from "net";
import { SignalIngestor, type IngestorContext } from "../../base";
import { getTargetStartups, safeFetch } from "./_helpers";

function extractDomain(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const u = new URL(value.startsWith("http") ? value : `https://${value}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

// Simple WHOIS over TCP/43 — talk to whois.iana.org first to find the
// authoritative registrar server, then re-query that server. No external
// package required. Returns raw text or null on any failure.
function whoisQuery(server: string, query: string, timeoutMs = 4500): Promise<string | null> {
  return new Promise((resolve) => {
    const sock = net.createConnection(43, server);
    let data = "";
    let done = false;
    const finish = (val: string | null) => {
      if (done) return;
      done = true;
      try { sock.destroy(); } catch { /* noop */ }
      resolve(val);
    };
    sock.setEncoding("utf8");
    sock.setTimeout(timeoutMs, () => finish(data || null));
    sock.on("connect", () => sock.write(`${query}\r\n`));
    sock.on("data", (chunk) => { data += chunk; });
    sock.on("end", () => finish(data || null));
    sock.on("error", () => finish(null));
  });
}

async function fetchWhois(domain: string): Promise<string | null> {
  // 1) IANA referral.
  const iana = await whoisQuery("whois.iana.org", domain);
  if (!iana) return null;
  const ref = /refer:\s*(\S+)/i.exec(iana);
  if (!ref) return iana;
  const referral = await whoisQuery(ref[1], domain);
  return referral || iana;
}

// Parse the most common WHOIS expiry date variants. Returns ISO date string
// or null if not extractable.
function parseExpiry(whois: string): string | null {
  const patterns = [
    /Registry Expiry Date:\s*([0-9T:\-Z+ ]+)/i,
    /Registrar Registration Expiration Date:\s*([0-9T:\-Z+ ]+)/i,
    /Expiration Date:\s*([0-9T:\-Z+ ]+)/i,
    /Expiry Date:\s*([0-9T:\-Z+ ]+)/i,
    /paid-till:\s*([0-9T:\-Z+ ]+)/i, // .ru / .su / .рф (TCI)
  ];
  for (const re of patterns) {
    const m = re.exec(whois);
    if (m?.[1]) {
      const d = new Date(m[1].trim());
      if (!isNaN(d.getTime())) return d.toISOString();
    }
  }
  return null;
}

function classifyExpiry(iso: string): { severity: "info" | "warning" | "critical"; daysLeft: number } {
  const days = Math.round((new Date(iso).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  if (days < 0) return { severity: "critical", daysLeft: days };
  if (days <= 14) return { severity: "critical", daysLeft: days };
  if (days <= 60) return { severity: "warning", daysLeft: days };
  return { severity: "info", daysLeft: days };
}

type EmailPosture = {
  spfPolicy: "none" | "softfail" | "fail" | "neutral" | "pass" | "missing" | "multiple" | "unknown";
  spfRaw: string | null;
  dmarcPolicy: "none" | "quarantine" | "reject" | "missing" | "malformed";
  dmarcRaw: string | null;
};

function inspectSpf(records: string[][]): { policy: EmailPosture["spfPolicy"]; raw: string | null } {
  const flat = records.map((r) => r.join("")).filter((r) => /^v=spf1\b/i.test(r));
  if (flat.length === 0) return { policy: "missing", raw: null };
  if (flat.length > 1) return { policy: "multiple", raw: flat.join(" || ") }; // RFC 7208 violation
  const raw = flat[0];
  // Last "all" qualifier wins under RFC 7208.
  const m = /([+\-~?])all\b/i.exec(raw);
  if (!m) return { policy: "neutral", raw };
  switch (m[1]) {
    case "-": return { policy: "fail", raw };
    case "~": return { policy: "softfail", raw };
    case "+": return { policy: "pass", raw };
    case "?": return { policy: "neutral", raw };
    default: return { policy: "unknown", raw };
  }
}

function inspectDmarc(records: string[][]): { policy: EmailPosture["dmarcPolicy"]; raw: string | null } {
  const flat = records.map((r) => r.join("")).filter((r) => /^v=DMARC1\b/i.test(r));
  if (flat.length === 0) return { policy: "missing", raw: null };
  const raw = flat[0];
  const m = /\bp=([a-zA-Z]+)/.exec(raw);
  if (!m) return { policy: "malformed", raw };
  const p = m[1].toLowerCase();
  if (p === "reject" || p === "quarantine" || p === "none") return { policy: p, raw };
  return { policy: "malformed", raw };
}

async function emailPosture(domain: string): Promise<EmailPosture> {
  let spfRecords: string[][] = [];
  let dmarcRecords: string[][] = [];
  try { spfRecords = await dns.resolveTxt(domain); } catch { /* no records is itself meaningful */ }
  try { dmarcRecords = await dns.resolveTxt(`_dmarc.${domain}`); } catch { /* same */ }
  const spf = inspectSpf(spfRecords);
  const dmarc = inspectDmarc(dmarcRecords);
  return { spfPolicy: spf.policy, spfRaw: spf.raw, dmarcPolicy: dmarc.policy, dmarcRaw: dmarc.raw };
}

function postureSeverity(p: EmailPosture): { severity: "info" | "warning" | "critical"; summary: string } {
  // Critical: missing SPF (anyone can spoof your domain) or multiple SPF
  // records (RFC 7208 violation — receivers will permerror, mail bounces).
  if (p.spfPolicy === "missing" || p.spfPolicy === "multiple") {
    return {
      severity: "critical",
      summary: `Email auth misconfigured · SPF=${p.spfPolicy}, DMARC=${p.dmarcPolicy}`,
    };
  }
  // Warning: missing DMARC (recoverable — receivers fall back to SPF), DMARC
  // p=none (monitor-only), SPF +all/?all (permissive), or malformed records.
  if (
    p.dmarcPolicy === "missing" ||
    p.dmarcPolicy === "none" ||
    p.dmarcPolicy === "malformed" ||
    p.spfPolicy === "pass" ||
    p.spfPolicy === "neutral"
  ) {
    return {
      severity: "warning",
      summary: `Permissive email auth · SPF=${p.spfPolicy}, DMARC=${p.dmarcPolicy}`,
    };
  }
  return {
    severity: "info",
    summary: `Email auth healthy · SPF=${p.spfPolicy}, DMARC=${p.dmarcPolicy}`,
  };
}

export class DomainDnsSource extends SignalIngestor {
  readonly sourceKey = "domain-dns";
  readonly displayName = "Domain & DNS monitor";
  readonly category = "publicWeb";
  readonly description = "Subdomain discovery (crt.sh), MX records, WHOIS expiry watch, and SPF/DMARC posture for the company domain.";

  protected async execute(ctx: IngestorContext): Promise<number> {
    const startups = await getTargetStartups(ctx.startup);
    let created = 0;
    for (const startup of startups) {
      const domain = extractDomain(startup.domain ?? startup.website ?? null);
      if (!domain) continue;

      // crt.sh certificate transparency log — new subdomains
      const ct = await safeFetch(`https://crt.sh/?q=%25.${encodeURIComponent(domain)}&output=json`);
      if (ct?.ok) {
        type CtEntry = { name_value?: string; issuer_name?: string; not_before?: string };
        let entries: CtEntry[] = [];
        try { entries = (await ct.json()) as CtEntry[]; } catch { entries = []; }
        const seen = new Set<string>();
        for (const e of entries.slice(0, 50)) {
          const names: string[] = String(e.name_value ?? "").split(/\n+/);
          for (const name of names) {
            const n = name.trim().toLowerCase();
            if (!n || n === domain || n === `*.${domain}` || !n.endsWith(domain)) continue;
            if (seen.has(n)) continue;
            seen.add(n);
            if (await this.recordEvent({
              startupId: startup.id,
              eventType: "domain.subdomain",
              severity: "info",
              title: `Subdomain seen: ${n}`,
              url: `https://crt.sh/?q=${encodeURIComponent(n)}`,
              payload: { issuer: e.issuer_name, notBefore: e.not_before },
              dedupeKey: `${startup.id}:dns:sub:${n}`,
            })) created++;
          }
        }
      }

      // MX records — first-sight, dedupe per record string
      try {
        const mx = await dns.resolveMx(domain);
        for (const r of mx) {
          if (await this.recordEvent({
            startupId: startup.id,
            eventType: "dns.mx",
            severity: "info",
            title: `MX: ${r.exchange} (priority ${r.priority})`,
            payload: { exchange: r.exchange, priority: r.priority, domain },
            dedupeKey: `${startup.id}:dns:mx:${r.exchange}`,
          })) created++;
        }
      } catch { /* DNS lookups may fail; skip silently */ }

      // SPF / DMARC posture — emit one event per posture state per day so the
      // timeline reflects when posture changes (e.g. founder hardens DMARC).
      try {
        const posture = await emailPosture(domain);
        const sig = postureSeverity(posture);
        const day = new Date().toISOString().slice(0, 10);
        if (await this.recordEvent({
          startupId: startup.id,
          eventType: "dns.email_posture",
          severity: sig.severity,
          title: sig.summary,
          summary: posture.spfRaw ? `SPF: ${posture.spfRaw.slice(0, 200)}` : "No SPF record",
          payload: posture,
          dedupeKey: `${startup.id}:dns:posture:${posture.spfPolicy}:${posture.dmarcPolicy}:${day}`,
        })) created++;
      } catch (err) {
        console.warn(`[domain-dns] posture lookup failed for ${domain}:`, err);
      }

      // WHOIS expiry — daily snapshot if a parseable expiry is present.
      // Only emits a high-severity event when expiry falls inside warning windows.
      try {
        const whois = await fetchWhois(domain);
        if (whois) {
          const expiryIso = parseExpiry(whois);
          if (expiryIso) {
            const cls = classifyExpiry(expiryIso);
            const day = new Date().toISOString().slice(0, 10);
            const human = new Date(expiryIso).toISOString().slice(0, 10);
            const title = cls.daysLeft < 0
              ? `Domain ${domain} EXPIRED ${Math.abs(cls.daysLeft)}d ago (${human})`
              : `Domain ${domain} expires in ${cls.daysLeft}d (${human})`;
            if (await this.recordEvent({
              startupId: startup.id,
              eventType: "domain.whois_expiry",
              severity: cls.severity,
              title,
              payload: { domain, expiryAt: expiryIso, daysLeft: cls.daysLeft },
              // For "info" snapshots, dedupe per-month so we don't spam the timeline
              // every 24h. For warning/critical, dedupe per-day so each follow-up
              // pull surfaces in the founder's notifications.
              dedupeKey: cls.severity === "info"
                ? `${startup.id}:dns:whois:${expiryIso.slice(0, 7)}`
                : `${startup.id}:dns:whois:${cls.severity}:${day}`,
            })) created++;
          }
        }
      } catch (err) {
        console.warn(`[domain-dns] whois lookup failed for ${domain}:`, err);
      }
    }
    return created;
  }
}
