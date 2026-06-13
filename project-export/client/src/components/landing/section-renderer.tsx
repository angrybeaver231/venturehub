import DOMPurify from "dompurify";
import { Calendar, MapPin, ChevronDown } from "lucide-react";
import { useState } from "react";
import type { LandingSection, LandingTheme } from "@/lib/landing-blocks";

interface RendererProps {
  section: LandingSection;
  theme: LandingTheme;
}

function safeHtml(html: string) {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["p","br","strong","em","u","s","ol","ul","li","a","h1","h2","h3","h4","h5","blockquote","code","pre","img","figure","figcaption","hr","span","div"],
    ALLOWED_ATTR: ["href","target","rel","src","alt","class"],
  });
}

function videoEmbed(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/embed${u.pathname}`;
    }
    if (u.hostname.includes("rutube.ru")) {
      const m = u.pathname.match(/\/video\/([^/]+)/);
      if (m) return `https://rutube.ru/play/embed/${m[1]}`;
    }
    if (u.hostname.includes("vimeo.com")) {
      const m = u.pathname.match(/\/(\d+)/);
      if (m) return `https://player.vimeo.com/video/${m[1]}`;
    }
  } catch {}
  return url;
}

export function SectionRenderer({ section, theme }: RendererProps) {
  const d = section.data || {};
  const accent = theme.accent;
  const primary = theme.primary;

  switch (section.type) {
    case "hero":
      return (
        <section className="relative min-h-[80vh] flex items-center overflow-hidden" data-section-type="hero">
          {d.bgImage && (
            <img src={d.bgImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/55 to-black/85" />
          <div className="relative max-w-6xl mx-auto px-6 lg:px-12 py-24 lg:py-32 w-full">
            {d.eyebrow && (
              <div
                className="text-[11px] font-bold tracking-[0.3em] uppercase mb-6"
                style={{ color: accent }}
              >
                {d.eyebrow}
              </div>
            )}
            <h1 className="font-black tracking-tight leading-[0.95] text-4xl sm:text-6xl lg:text-7xl xl:text-8xl mb-6">
              {d.title}
            </h1>
            {d.subtitle && (
              <p className="text-lg lg:text-2xl max-w-3xl opacity-85 leading-snug mb-8">{d.subtitle}</p>
            )}
            {(d.date || d.location) && (
              <div className="flex flex-wrap gap-6 mb-8 text-sm lg:text-base opacity-80">
                {d.date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> {d.date}
                  </div>
                )}
                {d.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> {d.location}
                  </div>
                )}
              </div>
            )}
            {d.ctaText && d.ctaUrl && (
              <a
                href={d.ctaUrl}
                className="inline-flex items-center px-8 h-14 rounded-md font-bold uppercase tracking-wider text-sm transition-transform hover:scale-[1.02]"
                style={{ background: accent, color: "#000" }}
              >
                {d.ctaText}
              </a>
            )}
          </div>
        </section>
      );

    case "richText":
      return (
        <section className="py-20 lg:py-28 px-6 lg:px-12" data-section-type="richText">
          <div className="max-w-3xl mx-auto">
            {d.heading && (
              <h2 className="text-3xl lg:text-5xl font-bold tracking-tight mb-8">{d.heading}</h2>
            )}
            <div
              className="prose prose-invert max-w-none text-lg leading-relaxed opacity-85"
              dangerouslySetInnerHTML={{ __html: safeHtml(d.body || "") }}
            />
          </div>
        </section>
      );

    case "stats":
      return (
        <section className="py-20 lg:py-28 px-6 lg:px-12 border-y border-white/5" data-section-type="stats">
          <div className="max-w-6xl mx-auto">
            {d.heading && (
              <h2 className="text-2xl lg:text-3xl font-bold tracking-tight mb-12 text-center opacity-80">
                {d.heading}
              </h2>
            )}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {(d.items || []).map((item: any, i: number) => (
                <div key={i} className="text-center">
                  <div className="font-black text-5xl lg:text-7xl tracking-tight mb-2" style={{ color: accent }}>
                    {item.value}
                  </div>
                  <div className="text-xs lg:text-sm uppercase tracking-wider opacity-70">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      );

    case "features":
      return (
        <section className="py-20 lg:py-28 px-6 lg:px-12" data-section-type="features">
          <div className="max-w-6xl mx-auto">
            {d.heading && (
              <h2 className="text-3xl lg:text-5xl font-bold tracking-tight mb-12">{d.heading}</h2>
            )}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(d.items || []).map((item: any, i: number) => (
                <div key={i} className="p-8 rounded-md bg-white/5 border border-white/10">
                  <div className="h-1 w-10 mb-5" style={{ background: accent }} />
                  <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                  <p className="opacity-75 leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      );

    case "speakers":
      return (
        <section className="py-20 lg:py-28 px-6 lg:px-12" data-section-type="speakers">
          <div className="max-w-6xl mx-auto">
            {d.heading && (
              <h2 className="text-3xl lg:text-5xl font-bold tracking-tight mb-12">{d.heading}</h2>
            )}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {(d.items || []).map((s: any, i: number) => (
                <div key={i}>
                  <div className="aspect-square rounded-md overflow-hidden bg-white/5 mb-4">
                    {s.photo ? (
                      <img src={s.photo} alt={s.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center opacity-30 text-4xl font-bold">
                        {(s.name || "?").charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="text-xs uppercase tracking-wider opacity-60 mb-1" style={{ color: accent }}>
                    {s.role}
                  </div>
                  <h3 className="text-xl font-bold mb-2">{s.name}</h3>
                  {s.bio && <p className="text-sm opacity-70 leading-relaxed">{s.bio}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      );

    case "schedule":
      return (
        <section className="py-20 lg:py-28 px-6 lg:px-12" data-section-type="schedule">
          <div className="max-w-4xl mx-auto">
            {d.heading && (
              <h2 className="text-3xl lg:text-5xl font-bold tracking-tight mb-12">{d.heading}</h2>
            )}
            <div className="space-y-4">
              {(d.items || []).map((item: any, i: number) => (
                <div key={i} className="flex gap-6 p-6 rounded-md border border-white/10 bg-white/[0.02]">
                  <div className="font-mono text-lg font-bold shrink-0 w-20" style={{ color: accent }}>
                    {item.time}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold mb-1">{item.title}</h3>
                    {item.speaker && <div className="text-sm opacity-60 mb-1">{item.speaker}</div>}
                    {item.description && <p className="text-sm opacity-75">{item.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      );

    case "gallery":
      return (
        <section className="py-20 lg:py-28 px-6 lg:px-12" data-section-type="gallery">
          <div className="max-w-7xl mx-auto">
            {d.heading && (
              <h2 className="text-3xl lg:text-5xl font-bold tracking-tight mb-12">{d.heading}</h2>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {(d.images || []).map((src: string, i: number) => (
                <div key={i} className="aspect-square rounded-md overflow-hidden bg-white/5">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        </section>
      );

    case "partners":
      return (
        <section className="py-16 lg:py-20 px-6 lg:px-12 border-y border-white/5" data-section-type="partners">
          <div className="max-w-6xl mx-auto">
            {d.heading && (
              <h2 className="text-xl lg:text-2xl font-bold tracking-tight mb-10 text-center opacity-70">
                {d.heading}
              </h2>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8 items-center">
              {(d.logos || []).map((p: any, i: number) => {
                const logo = p.image ? (
                  <img src={p.image} alt={p.name} className="max-h-12 w-full object-contain opacity-70 hover:opacity-100 transition-opacity" />
                ) : (
                  <div className="text-sm font-bold opacity-50">{p.name}</div>
                );
                return p.url ? (
                  <a key={i} href={p.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center">
                    {logo}
                  </a>
                ) : (
                  <div key={i} className="flex items-center justify-center">{logo}</div>
                );
              })}
            </div>
          </div>
        </section>
      );

    case "faq": {
      return (
        <section className="py-20 lg:py-28 px-6 lg:px-12" data-section-type="faq">
          <div className="max-w-3xl mx-auto">
            {d.heading && (
              <h2 className="text-3xl lg:text-5xl font-bold tracking-tight mb-12">{d.heading}</h2>
            )}
            <div className="space-y-3">
              {(d.items || []).map((item: any, i: number) => (
                <FaqItem key={i} question={item.question} answer={item.answer} accent={accent} />
              ))}
            </div>
          </div>
        </section>
      );
    }

    case "cta":
      return (
        <section className="relative py-24 lg:py-36 px-6 lg:px-12 overflow-hidden" data-section-type="cta">
          {d.bgImage && (
            <img src={d.bgImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
          )}
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${primary}25, transparent)` }} />
          <div className="relative max-w-4xl mx-auto text-center">
            {d.eyebrow && (
              <div className="text-[11px] font-bold tracking-[0.3em] uppercase mb-5" style={{ color: accent }}>
                {d.eyebrow}
              </div>
            )}
            <h2 className="font-black tracking-tight text-4xl lg:text-6xl mb-8">{d.title}</h2>
            {d.ctaText && d.ctaUrl && (
              <a
                href={d.ctaUrl}
                className="inline-flex items-center px-8 h-14 rounded-md font-bold uppercase tracking-wider text-sm transition-transform hover:scale-[1.02]"
                style={{ background: accent, color: "#000" }}
              >
                {d.ctaText}
              </a>
            )}
          </div>
        </section>
      );

    case "video": {
      const src = videoEmbed(d.url || "");
      return (
        <section className="py-20 lg:py-28 px-6 lg:px-12" data-section-type="video">
          <div className="max-w-5xl mx-auto">
            {d.heading && (
              <h2 className="text-3xl lg:text-5xl font-bold tracking-tight mb-10">{d.heading}</h2>
            )}
            {src ? (
              <div className="aspect-video rounded-md overflow-hidden bg-black">
                <iframe
                  src={src}
                  title="video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
            ) : (
              <div className="aspect-video rounded-md bg-white/5 flex items-center justify-center opacity-50 text-sm">
                Video URL required
              </div>
            )}
          </div>
        </section>
      );
    }

    case "footer":
      return (
        <footer className="py-16 px-6 lg:px-12 border-t border-white/10 mt-12" data-section-type="footer">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between gap-6 items-start">
            <div className="text-sm opacity-60">{d.text}</div>
            <div className="flex flex-wrap gap-5">
              {(d.links || []).map((l: any, i: number) => (
                <a key={i} href={l.url} className="text-sm opacity-70 hover:opacity-100 transition-opacity" style={{ color: accent }}>
                  {l.label}
                </a>
              ))}
            </div>
          </div>
        </footer>
      );

    default:
      return null;
  }
}

function FaqItem({ question, answer, accent }: { question: string; answer: string; accent: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/10 rounded-md bg-white/[0.02] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full p-5 flex items-center justify-between gap-4 text-left hover:bg-white/[0.03]"
      >
        <span className="font-semibold">{question}</span>
        <ChevronDown
          className="h-5 w-5 shrink-0 transition-transform"
          style={{ color: accent, transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 -mt-1 text-sm opacity-80 leading-relaxed">{answer}</div>
      )}
    </div>
  );
}

export function LandingRenderer({
  sections,
  theme,
}: {
  sections: LandingSection[];
  theme: LandingTheme;
}) {
  return (
    <div
      style={{
        background: theme.bg,
        color: theme.text,
        fontFamily: theme.font === "serif" ? "'Playfair Display', Georgia, serif" : theme.font === "sans" ? "system-ui, -apple-system, sans-serif" : "'Inter', system-ui, sans-serif",
      }}
      className="min-h-screen"
    >
      {sections.map((s) => (
        <SectionRenderer key={s.id} section={s} theme={theme} />
      ))}
    </div>
  );
}
