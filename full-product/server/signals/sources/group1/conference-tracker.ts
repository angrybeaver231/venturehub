import { SignalIngestor, type IngestorContext } from "../../base";
import { getTargetStartups, safeFetch, stripHtml } from "./_helpers";
import { storage } from "../../../storage";

type Conference = {
  name: string;
  url: string;
  /** Optional secondary URL: agenda / speakers page if different from main. */
  speakersUrl?: string;
};

// 30+ conferences across RU + global. The generic parser strips HTML and
// substring-matches; per-event tweaks live in `extractCorpus`.
const CONFERENCES: Conference[] = [
  { name: "RIW", url: "https://riw.moscow/program/" },
  { name: "Startup Village", url: "https://startupvillage.ru/" },
  { name: "ПМЭФ", url: "https://forumspb.com/programme/" },
  { name: "Web Summit", url: "https://websummit.com/speakers" },
  { name: "Slush", url: "https://www.slush.org/speakers/" },
  { name: "TechCrunch Disrupt", url: "https://techcrunch.com/events/tc-disrupt-2025/agenda/" },
  { name: "AI Journey", url: "https://aij.ru/" },
  { name: "RIF", url: "https://rif.ru/program" },
  { name: "ProductCamp", url: "https://productcamp.ru/" },
  { name: "RuCode", url: "https://rucode.net/" },
  { name: "Aurora Tech Award", url: "https://auroratechaward.com/" },
  { name: "ФРИИ конференции", url: "https://www.iidf.ru/events/" },
  { name: "RB.ru events", url: "https://rb.ru/events/" },
  { name: "vc.ru events", url: "https://vc.ru/events" },
  { name: "Y Combinator Demo Day", url: "https://www.ycombinator.com/demoday" },
  { name: "Habr Conf", url: "https://habr.com/ru/conferences/" },
  { name: "TechCrunch Early Stage", url: "https://techcrunch.com/events/tc-early-stage-2025/" },
  { name: "SXSW", url: "https://www.sxsw.com/conference/speakers/" },
  { name: "Collision", url: "https://collisionconf.com/speakers" },
  { name: "Money 20/20", url: "https://us.money2020.com/agenda/speakers" },
  { name: "Finovate", url: "https://informaconnect.com/finovate/speakers/" },
  { name: "GITEX", url: "https://www.gitex.com/speakers" },
  { name: "VivaTech", url: "https://vivatechnology.com/speakers" },
  { name: "DLD Conference", url: "https://dld-conference.com/speakers" },
  { name: "Bits & Pretzels", url: "https://www.bitsandpretzels.com/speakers/" },
  { name: "RISE Conf", url: "https://riseconf.com/speakers" },
  { name: "Mobile World Congress", url: "https://www.mwcbarcelona.com/agenda/speakers" },
  { name: "Slush Tokyo", url: "https://www.slush.org/tokyo/" },
  { name: "AfricArena", url: "https://www.africarena.com/speakers" },
  { name: "Latitude59", url: "https://latitude59.ee/speakers/" },
  { name: "Pirate Summit", url: "https://piratesummit.com/" },
  { name: "Slush Asia", url: "https://www.slush.org/" },
  { name: "ITMO Tech Week", url: "https://itmo.ru/events" },
  { name: "Skolkovo Tech Day", url: "https://sk.ru/events/" },
];

async function fetchCorpus(conf: Conference): Promise<string> {
  const urls = [conf.url, conf.speakersUrl].filter((u): u is string => !!u);
  let text = "";
  for (const u of urls) {
    const res = await safeFetch(u);
    if (!res?.ok) continue;
    const html = await res.text();
    text += " " + stripHtml(html).toLowerCase();
  }
  return text;
}

function inferRole(text: string, needle: string): string {
  const idx = text.indexOf(needle);
  if (idx < 0) return "speaker";
  const ctx = text.slice(Math.max(0, idx - 80), idx + 80);
  if (/(panelist|panel)/i.test(ctx)) return "panelist";
  if (/(keynote)/i.test(ctx)) return "keynote";
  if (/(moderator|host)/i.test(ctx)) return "moderator";
  if (/(speaker|выступ|спикер|докладчик)/i.test(ctx)) return "speaker";
  return "mention";
}

export class ConferenceTrackerSource extends SignalIngestor {
  readonly sourceKey = "conference-tracker";
  readonly displayName = "Conference speaker tracker";
  readonly category = "publicWeb";
  readonly description =
    "Detects founder names or company mentions across 30+ public conference agendas (RU + global).";

  protected async execute(ctx: IngestorContext): Promise<number> {
    const startups = await getTargetStartups(ctx.startup);
    if (startups.length === 0) return 0;

    const corpora: Array<{ conf: Conference; text: string }> = [];
    for (const conf of CONFERENCES) {
      try {
        const text = await fetchCorpus(conf);
        if (text.length > 0) corpora.push({ conf, text });
      } catch (err) {
        console.warn(`[conference-tracker] ${conf.name} failed:`, err);
      }
    }

    let created = 0;
    for (const startup of startups) {
      const needles: Array<{ needle: string; type: "company" | "person" }> = [];
      const startupNeedle = startup.name.toLowerCase().trim();
      if (startupNeedle.length >= 3) needles.push({ needle: startupNeedle, type: "company" });

      const teamMembers = await storage.getAllTeamMembers().catch(() => []);
      const ourTeam = teamMembers.filter((m) => m.startupId === startup.id);
      for (const tm of ourTeam) {
        if (tm.fullName && tm.fullName.length >= 4) needles.push({ needle: tm.fullName.toLowerCase(), type: "person" });
      }
      const members = await storage.getStartupMembers(startup.id).catch(() => [] as any[]);
      for (const m of members) {
        const fn = (m.user?.firstName ?? "").trim();
        const ln = (m.user?.lastName ?? "").trim();
        if (fn && ln) needles.push({ needle: `${fn} ${ln}`.toLowerCase(), type: "person" });
      }

      for (const { conf, text } of corpora) {
        for (const { needle, type } of needles) {
          if (!text.includes(needle)) continue;
          const role = inferRole(text, needle);
          if (await this.recordEvent({
            startupId: startup.id,
            eventType: "conference_speaking",
            severity: "positive",
            title: `${type === "company" ? startup.name : needle} appeared on ${conf.name}`,
            summary: `Role inferred: ${role}`,
            url: conf.url,
            payload: { event: conf.name, role, match: needle, matchType: type },
            dedupeKey: `${startup.id}:conf:${conf.name}:${needle}`,
          })) created++;
        }
      }
    }
    return created;
  }
}
