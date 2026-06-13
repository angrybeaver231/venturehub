import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
import type { Event } from "@shared/schema";
import {
  ArrowRight,
  ArrowUpRight,
  Calendar,
  MapPin,
  Users,
  ChevronDown,
  Briefcase,
  Send,
} from "lucide-react";
import { PublicSidebar, PublicMobileTopBar, buildPublicNavItems } from "@/components/public-sidebar";
import businessClubLogo from "@assets/photo_5393419750937327414_c_1761607336354.jpg";
import eventImage1 from "@assets/generated_images/Entrepreneur_speaking_unicorn_startup_323baa9b.png";
import eventImage2 from "@assets/generated_images/Entrepreneurship_workshop_collaboration_2ef5955a.png";
import eventImage3 from "@assets/generated_images/Startup_pitch_presentation_eefea7d9.png";
import eventImage4 from "@assets/generated_images/TechStar_competition_rocket_launch_2454c85e.png";
import programImage1 from "@assets/generated_images/Innovation_workshop_holographic_ideas_a992d104.png";
import programImage2 from "@assets/generated_images/Startup_rocket_launch_office_97ec3a13.png";
import programImage3 from "@assets/generated_images/Professional_networking_handshake_event_f69a0231.png";
import { useEffect, useMemo, useState } from "react";

/* ----------------------------- date helpers ---------------------------- */

const MONTHS: Record<string, number> = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  jan: 0, feb: 1, mar: 2, apr: 3, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
  январь: 0, января: 0, янв: 0,
  февраль: 1, февраля: 1, фев: 1,
  март: 2, марта: 2, мар: 2,
  апрель: 3, апреля: 3, апр: 3,
  май: 4, мая: 4,
  июнь: 5, июня: 5, июн: 5,
  июль: 6, июля: 6, июл: 6,
  август: 7, августа: 7, авг: 7,
  сентябрь: 8, сентября: 8, сен: 8, сент: 8,
  октябрь: 9, октября: 9, окт: 9,
  ноябрь: 10, ноября: 10, ноя: 10,
  декабрь: 11, декабря: 11, дек: 11,
};

function parseEventDate(dateStr: string | null | undefined, timeStr?: string | null): Date | null {
  if (!dateStr) return null;
  const direct = new Date(`${dateStr} ${timeStr || ""}`.trim());
  if (!isNaN(direct.getTime())) return direct;
  const m = dateStr.trim().toLowerCase().match(/(\d{1,2})\s+([a-zа-яё]+)\.?\s+(\d{4})/);
  if (m) {
    const day = parseInt(m[1], 10);
    const monthIdx = MONTHS[m[2]];
    const year = parseInt(m[3], 10);
    if (monthIdx !== undefined && !isNaN(day) && !isNaN(year)) {
      let h = 0, min = 0;
      const tm = (timeStr || "").trim().match(/(\d{1,2}):(\d{2})/);
      if (tm) { h = parseInt(tm[1], 10); min = parseInt(tm[2], 10); }
      return new Date(year, monthIdx, day, h, min, 0);
    }
  }
  return null;
}

function useCountdown(target: Date | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target?.getTime()]);
  if (!target) return null;
  const diff = Math.max(0, target.getTime() - now);
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1000),
  };
}

const pad = (n: number) => n.toString().padStart(2, "0");

/* ----------------------- countdown block (Figma) ----------------------- */

function CountdownDigit({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center min-w-0 flex-1">
      <span
        className="font-['Inter'] font-black tabular-nums text-white leading-none tracking-tight
                   text-[56px] sm:text-[80px] md:text-[96px] lg:text-[112px]"
      >
        {value}
      </span>
      <span className="mt-2 font-['Inter'] font-bold text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-white/70">
        {label}
      </span>
    </div>
  );
}

function CountdownColon() {
  return (
    <span
      aria-hidden="true"
      className="shrink-0 font-['Inter'] font-black text-white/40 leading-none -mt-1 sm:-mt-2
                 text-[28px] sm:text-[48px] md:text-[64px] lg:text-[80px]"
    >
      :
    </span>
  );
}

/* ------------------------ section heading (Figma) ---------------------- */

function SectionHeading({ title, kicker, action, testId }: {
  title: string;
  kicker?: string;
  action?: React.ReactNode;
  testId?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-8 md:mb-10">
      <div>
        {kicker && (
          <div className="mb-3 inline-flex items-center gap-2">
            <span className="h-1 w-7 rounded-full bg-amber-500" />
            <span className="font-['Inter'] text-[10px] font-extrabold uppercase tracking-[0.22em] text-zinc-500">
              {kicker}
            </span>
          </div>
        )}
        <h2
          className="font-['Inter'] font-black tracking-tight text-zinc-900 leading-[1.05]
                     text-[34px] sm:text-[42px] md:text-[48px]"
          data-testid={testId}
        >
          {title}
        </h2>
      </div>
      {action && <div className="hidden sm:block">{action}</div>}
    </div>
  );
}

/* ------------------------------ event card ----------------------------- */

function EventCard({
  date, location, audience, title, status, image, href, language,
}: {
  date: string;
  location: string;
  audience: string;
  title: string;
  status?: string;
  image: string;
  href: string;
  language: "en" | "ru";
}) {
  return (
    <div className="group bg-white rounded-md overflow-hidden flex flex-col" data-testid="card-event">
      <div className="p-4 flex gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          <Meta icon={Calendar}>{date}</Meta>
          <Meta icon={MapPin}>{location}</Meta>
          <Meta icon={Users}>{audience}</Meta>
        </div>
        <div className="w-[140px] h-[100px] rounded-md overflow-hidden shrink-0 bg-zinc-100">
          <img src={image} alt={title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        </div>
      </div>
      <div className="px-4 pb-3 flex items-center gap-2 min-h-[60px]">
        <h3 className="font-['Inter'] font-bold text-[15px] text-zinc-900 leading-snug line-clamp-2 flex-1">
          {title}
        </h3>
        {status && (
          <span className="shrink-0 inline-flex items-center rounded-sm bg-amber-100 px-2 py-0.5 text-[10px] font-['Inter'] font-extrabold uppercase tracking-wide text-amber-800">
            {status}
          </span>
        )}
      </div>
      <div className="border-t border-zinc-200" />
      <Link
        href={href}
        className="h-[52px] flex items-center justify-center text-zinc-900 font-['Inter'] font-extrabold text-[12px] uppercase tracking-[0.18em] hover-elevate"
        data-testid="link-event-learn-more"
      >
        {language === "ru" ? "Подробнее" : "Learn More"}
      </Link>
    </div>
  );
}

function Meta({ icon: Icon, children }: { icon: typeof Calendar; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-zinc-700">
      <Icon className="h-3.5 w-3.5 text-zinc-500 shrink-0" strokeWidth={2} />
      <span className="font-['Fustat'] text-[13px] truncate">{children}</span>
    </div>
  );
}

/* -------------------------------- main --------------------------------- */

export default function Landing() {
  const { t, language, setLanguage } = useLanguage();

  const { data: featuredEvent } = useQuery<Event | null>({
    queryKey: ["/api/events/featured/current"],
  });
  const { data: platformStats } = useQuery<{ members: number; events: number; courses: number }>({
    queryKey: ["/api/public/stats"],
  });

  const targetDate = useMemo(
    () => parseEventDate(featuredEvent?.date, featuredEvent?.time),
    [featuredEvent?.date, featuredEvent?.time],
  );
  const countdown = useCountdown(targetDate);

  const yearLabel = new Date().getFullYear();

  const dateRangeLabel = useMemo(() => {
    if (!targetDate) return language === "ru" ? "Новый набор открыт" : "New cohort open now";
    return new Intl.DateTimeFormat(language === "ru" ? "ru-RU" : "en-US", {
      day: "numeric", month: "long", year: "numeric",
    }).format(targetDate);
  }, [targetDate, language]);

  const navItems = buildPublicNavItems(language, scrollTo);

  // Fallback content for the "Upcoming Events" row
  const upcomingFallback = [
    {
      title: t("landingEvent1Title"),
      date: language === "ru" ? "Каждый месяц" : "Monthly",
      location: language === "ru" ? "Москва, ФУ" : "Moscow, FinUni",
      audience: language === "ru" ? "Открыто для всех" : "Open to all",
      image: eventImage1,
      status: language === "ru" ? "набор" : "open",
      href: "/login",
    },
    {
      title: t("landingEvent2Title"),
      date: language === "ru" ? "Еженедельно" : "Weekly",
      location: language === "ru" ? "Гибрид" : "Hybrid",
      audience: language === "ru" ? "Студенты" : "Students",
      image: eventImage2,
      status: language === "ru" ? "набор" : "open",
      href: "/login",
    },
    {
      title: t("landingEvent4Title"),
      date: language === "ru" ? "Ежегодно" : "Annual",
      location: language === "ru" ? "Москва" : "Moscow",
      audience: language === "ru" ? "Команды" : "Teams",
      image: eventImage4,
      status: "TechStar",
      href: "/techstar",
    },
  ];

  const eventsForRow = featuredEvent
    ? [
        {
          title: featuredEvent.name,
          date: [featuredEvent.date, featuredEvent.time].filter(Boolean).join(" • "),
          location: featuredEvent.location || (language === "ru" ? "Москва" : "Moscow"),
          audience: language === "ru" ? "Открытая регистрация" : "Open registration",
          image: featuredEvent.customImage || eventImage1,
          status: language === "ru" ? "новое" : "featured",
          href: "/login",
        },
        ...upcomingFallback.slice(0, 2),
      ]
    : upcomingFallback;

  // Highlights row (replaces "Club Qualification Leaders")
  const highlights = [
    {
      title: t("landingProgram1Title"),
      meta: language === "ru" ? `${platformStats?.events || 0}+ событий` : `${platformStats?.events || 0}+ events`,
      image: programImage1,
      href: "/login",
    },
    {
      title: t("landingProgram2Title"),
      meta: language === "ru" ? "Студия и менторы" : "Studio & mentors",
      image: programImage2,
      href: "/login",
    },
    {
      title: t("landingProgram3Title"),
      meta: language === "ru" ? `${platformStats?.members || 0}+ участников` : `${platformStats?.members || 0}+ members`,
      image: programImage3,
      href: "/login",
    },
  ];

  // "Road to" progress derived from member count toward a target
  const memberTarget = 1000;
  const memberPct = Math.max(8, Math.min(96, Math.round(((platformStats?.members || 0) / memberTarget) * 100)));

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-zinc-900 overflow-x-hidden font-['Fustat']">
      <PublicSidebar items={navItems} language={language} activeId="home" onLanguageToggle={() => setLanguage(language === "en" ? "ru" : "en")} />
      <PublicMobileTopBar language={language} onLanguageToggle={() => setLanguage(language === "en" ? "ru" : "en")} />

      {/* Content shifted right of the sidebar on lg+ */}
      <div className="lg:pl-[110px] pt-[56px] lg:pt-0">

        {/* HERO */}
        <section className="relative min-h-screen lg:min-h-[calc(100vh-0px)] bg-zinc-950 overflow-hidden flex flex-col">
          {/* layered background */}
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(245,158,11,0.20)_0%,transparent_60%)]" />
            <div className="absolute -top-40 -right-40 w-[900px] h-[900px] rounded-full bg-[radial-gradient(circle,rgba(245,158,11,0.18)_0%,transparent_60%)]" />
            <div className="absolute -bottom-40 -left-40 w-[800px] h-[800px] rounded-full bg-[radial-gradient(circle,rgba(255,54,0,0.10)_0%,transparent_65%)]" />
            {/* subtle grid */}
            <div className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage: "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
                backgroundSize: "80px 80px",
              }}
            />
          </div>

          <div className="relative z-10 flex-1 flex items-center justify-center px-6 pt-16 pb-32">
            <div className="mx-auto max-w-5xl w-full text-center">

              {/* Date pill */}
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              >
                <span
                  className="inline-flex items-center rounded-full px-5 py-1.5 font-['Inter'] text-[12px] font-extrabold uppercase tracking-[0.16em] text-zinc-950 bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 shadow-[0_8px_30px_rgba(245,158,11,0.25)]"
                  data-testid="text-hero-daterange"
                >
                  {dateRangeLabel}
                </span>
              </motion.div>

              {/* SEO-only H1: real keyword-rich heading for search engines (visually hidden) */}
              <h1 className="sr-only">
                {language === "ru"
                  ? "Студенческий предпринимательский клуб Финансового университета — студенческий бизнес клуб ПК Финуниверситет"
                  : "Student Entrepreneurship Club of Financial University — Student Business Club"}
              </h1>

              {/* Wordmark logo */}
              <motion.div
                initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
                className="mt-10 font-['Inter'] font-black tracking-[-0.04em] text-white leading-[0.82]"
                data-testid="text-hero-title"
                aria-hidden="true"
              >
                <span className="block text-[88px] sm:text-[140px] md:text-[200px] lg:text-[240px]">
                  {language === "ru" ? "ПК" : "EC"}
                  <span className="text-amber-400 ml-2 sm:ml-4">{String(yearLabel + 1).slice(-2)}</span>
                </span>
              </motion.div>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
                className="mt-6 mx-auto max-w-2xl font-['Fustat'] text-[14px] md:text-[16px] text-white/75 leading-relaxed"
                data-testid="text-hero-subtitle"
              >
                {language === "ru"
                  ? "Главный студенческий предпринимательский клуб Финансового университета. Студенческий бизнес клуб для будущих предпринимателей: события, акселератор, менторы и реальные стартапы."
                  : "The flagship student entrepreneurship club at Financial University. A student business club for future founders: events, accelerator, mentors, and real startups."}
              </motion.p>

              {/* Countdown */}
              {countdown && (
                <motion.div
                  initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.45 }}
                  className="mt-12 md:mt-16 mx-auto max-w-3xl"
                  data-testid="hero-countdown"
                >
                  <div className="flex items-start justify-center gap-0.5 sm:gap-2 md:gap-4 overflow-hidden">
                    <CountdownDigit value={pad(countdown.days)} label={language === "ru" ? "дни" : "days"} />
                    <CountdownColon />
                    <CountdownDigit value={pad(countdown.hours)} label={language === "ru" ? "часы" : "hours"} />
                    <CountdownColon />
                    <CountdownDigit value={pad(countdown.minutes)} label={language === "ru" ? "мин" : "min"} />
                    <CountdownColon />
                    <CountdownDigit value={pad(countdown.seconds)} label={language === "ru" ? "сек" : "sec"} />
                  </div>
                </motion.div>
              )}

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }}
                className="mt-12 flex items-center justify-center gap-3 flex-wrap"
              >
                <Button
                  size="lg" asChild
                  className="rounded-full bg-amber-400 text-zinc-950 hover:bg-amber-300 border-0 font-['Inter'] font-extrabold uppercase tracking-[0.16em] text-[12px] gap-2 px-7"
                >
                  <Link href="/login" data-testid="link-hero-login">
                    {t("landingHeroCTA")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  size="lg" variant="outline"
                  onClick={() => scrollTo("about")}
                  className="rounded-full border border-white/20 bg-white/5 text-white hover:text-white font-['Inter'] font-extrabold uppercase tracking-[0.16em] text-[12px] gap-2 px-7 backdrop-blur-sm"
                  data-testid="button-learn-more"
                >
                  {t("landingLearnMore")}
                </Button>
              </motion.div>
            </div>
          </div>

          {/* Scroll indicator */}
          <button
            type="button"
            onClick={() => scrollTo("about")}
            className="relative z-10 mx-auto mb-6 inline-flex items-center gap-3 text-white/70 hover:text-white"
            data-testid="button-scroll-info"
          >
            <span className="font-['Inter'] text-[11px] font-bold uppercase tracking-[0.22em]">
              {language === "ru" ? "прокрутите для информации" : "scroll for more info"}
            </span>
            <ChevronDown className="h-4 w-4 animate-bounce" />
          </button>
        </section>

        {/* BODY: cream */}
        <main className="bg-[#F5F5F5]">

          {/* PLATFORM STATS — live from /api/public/stats */}
          <section id="about" className="px-6 lg:px-12 xl:px-20 pt-16 md:pt-24 pb-10">
            <div className="max-w-7xl mx-auto">
              <div className="mb-8 inline-flex items-center gap-2">
                <span className="h-1 w-7 rounded-full bg-amber-500" />
                <span className="font-['Inter'] text-[10px] font-extrabold uppercase tracking-[0.22em] text-zinc-500">
                  {language === "ru" ? "Платформа в цифрах" : "Platform in numbers"}
                </span>
              </div>
              <h2
                className="font-['Inter'] font-black tracking-tight text-zinc-900 leading-[1.05] text-[34px] sm:text-[44px] md:text-[52px]"
                data-testid="text-stats-title"
              >
                {language === "ru" ? "Сообщество, которое растёт" : "A community that keeps growing"}
              </h2>

              <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {[
                  {
                    value: platformStats?.members ?? 0,
                    label: language === "ru" ? "участников" : "members",
                    testId: "stat-members",
                  },
                  {
                    value: platformStats?.events ?? 0,
                    label: language === "ru" ? "мероприятий" : "events",
                    testId: "stat-events",
                  },
                  {
                    value: platformStats?.courses ?? 0,
                    label: language === "ru" ? "курсов" : "courses",
                    testId: "stat-courses",
                  },
                  {
                    value: Math.max(1, yearLabel - 2020),
                    label: language === "ru" ? "лет работы" : "years active",
                    testId: "stat-years",
                  },
                ].map((s, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.06 }}
                    className="bg-white rounded-md p-6 md:p-7"
                    data-testid={s.testId}
                  >
                    <div className="font-['Inter'] font-black tabular-nums tracking-tight text-zinc-900 text-[44px] sm:text-[56px] md:text-[64px] leading-none">
                      {s.value}
                      <span className="text-amber-500">+</span>
                    </div>
                    <div className="mt-3 font-['Inter'] font-bold uppercase tracking-[0.18em] text-[10px] sm:text-[11px] text-zinc-500">
                      {s.label}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* UPCOMING EVENTS */}
          <section id="events" className="px-6 lg:px-12 xl:px-20 py-12 md:py-16">
            <div className="max-w-7xl mx-auto">
              <SectionHeading
                title={language === "ru" ? "Ближайшие события" : "Upcoming Events"}
                action={
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-3 group"
                    data-testid="link-events-see-all"
                  >
                    <span className="h-px w-[80px] bg-zinc-400 group-hover:w-[110px] transition-all" />
                    <span className="font-['Inter'] text-[12px] font-extrabold uppercase tracking-[0.18em] text-zinc-700">
                      {language === "ru" ? "Все события" : "See all"}
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-zinc-700" />
                  </Link>
                }
                testId="text-events-title"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
                {eventsForRow.map((ev, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.08 }}
                  >
                    <EventCard {...ev} language={language} />
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* HIGHLIGHTS — programs/community spotlights, like Figma "leaders" */}
          <section id="programs" className="px-6 lg:px-12 xl:px-20 py-12 md:py-16">
            <div className="max-w-7xl mx-auto">
              <SectionHeading
                title={language === "ru" ? "Что мы делаем" : "What we do"}
                testId="text-highlights-title"
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
                {highlights.map((h, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.08 }}
                    className="bg-white rounded-md overflow-hidden"
                    data-testid={`card-highlight-${i}`}
                  >
                    <div className="aspect-[16/10] w-full overflow-hidden bg-zinc-100">
                      <img src={h.image} alt={h.title} className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" />
                    </div>
                    <div className="p-5">
                      <h3
                        className="font-['Inter'] font-black tracking-tight text-zinc-900 text-[24px] md:text-[28px] leading-tight"
                        data-testid={`text-highlight-title-${i}`}
                      >
                        {h.title}
                      </h3>
                      <div className="mt-2 font-['Fustat'] text-[14px] text-zinc-600">
                        {h.meta}
                      </div>
                      <Link
                        href={h.href}
                        className="mt-4 inline-flex items-center gap-2 font-['Inter'] text-[11px] font-extrabold uppercase tracking-[0.2em] text-zinc-900 hover:text-amber-600"
                        data-testid={`link-highlight-${i}`}
                      >
                        {language === "ru" ? "Узнать больше" : "Learn more"}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-8 flex justify-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-3 group"
                  data-testid="link-visit-platform"
                >
                  <span className="h-px w-[60px] bg-zinc-400 group-hover:w-[100px] transition-all" />
                  <span className="font-['Inter'] text-[12px] font-extrabold uppercase tracking-[0.18em] text-zinc-700">
                    {language === "ru" ? "Войти в платформу" : "Visit the platform"}
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-zinc-700" />
                </Link>
              </div>
            </div>
          </section>

          {/* WEEKLY SCHEDULE — "How to join" steps */}
          <section className="px-6 lg:px-12 xl:px-20 py-12 md:py-20">
            <div className="max-w-7xl mx-auto">
              <h2
                className="font-['Inter'] font-black tracking-tight text-zinc-900 leading-[1.05] text-[34px] sm:text-[44px] md:text-[52px]"
                data-testid="text-howto-title"
              >
                {language === "ru" ? "Как присоединиться" : "How to join"}
              </h2>
              <p className="mt-3 font-['Fustat'] text-zinc-600 text-[16px] md:text-[20px]">
                {language === "ru" ? "Четыре шага до твоего первого события." : "Four steps to your first event."}
              </p>

              <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { step: "01", title: language === "ru" ? "Регистрация" : "Sign up", desc: language === "ru" ? "Создай аккаунт на платформе" : "Create your platform account" },
                  { step: "02", title: language === "ru" ? "Выбери событие" : "Pick an event", desc: language === "ru" ? "Найди подходящий формат" : "Find the format that fits you" },
                  { step: "03", title: language === "ru" ? "Подключайся" : "Take part", desc: language === "ru" ? "Учись, общайся, прокачивайся" : "Learn, network, grow" },
                  { step: "04", title: language === "ru" ? "Запускай стартап" : "Launch a startup", desc: language === "ru" ? "От идеи до прототипа" : "From idea to prototype" },
                ].map((s, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.08 }}
                    className="bg-white rounded-md p-6 flex flex-col gap-3 min-h-[200px]"
                    data-testid={`step-${i}`}
                  >
                    <div className="font-['Inter'] font-black text-[36px] text-amber-500 leading-none">
                      {s.step}
                    </div>
                    <h3 className="font-['Inter'] font-bold text-[18px] text-zinc-900">{s.title}</h3>
                    <p className="font-['Fustat'] text-[14px] text-zinc-600 leading-relaxed">{s.desc}</p>
                  </motion.div>
                ))}
              </div>

              <div className="mt-10">
                <Button
                  asChild
                  size="lg"
                  className="rounded-full bg-zinc-900 text-white hover:bg-zinc-800 border-0 font-['Inter'] font-extrabold uppercase tracking-[0.18em] text-[12px] gap-2 px-7"
                >
                  <Link href="/register" data-testid="link-howto-register">
                    {t("landingJoinCTA")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </section>

          {/* CONTACT + CAREERS */}
          <section id="contact" className="px-6 lg:px-12 xl:px-20 py-12 md:py-20">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div>
                <SectionHeading
                  title={t("landingContactTitle")}
                  kicker={language === "ru" ? "Связаться" : "Get in touch"}
                  testId="text-contact-title"
                />
                <p className="font-['Fustat'] text-[16px] text-zinc-600 leading-relaxed">
                  {t("landingContactDescription")}
                </p>
                <div className="mt-6 flex gap-3 flex-wrap">
                  <Button
                    asChild
                    className="rounded-full bg-zinc-900 text-white hover:bg-zinc-800 font-['Inter'] font-extrabold uppercase tracking-[0.16em] text-[11px] gap-2 px-6"
                  >
                    <a href="https://t.me/bc_fin" target="_blank" rel="noopener noreferrer" data-testid="link-contact-telegram">
                      <Send className="h-4 w-4" />
                      Telegram: @bc_fin
                    </a>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="rounded-full border border-zinc-900/20 bg-transparent text-zinc-900 font-['Inter'] font-extrabold uppercase tracking-[0.16em] text-[11px] gap-2 px-6"
                  >
                    <a href="https://t.me/+FjrcMjVyIe4xNmI6" target="_blank" rel="noopener noreferrer" data-testid="link-contact-telegram-group">
                      <Users className="h-4 w-4" />
                      {language === "ru" ? "Группа в Telegram" : "Telegram Group"}
                    </a>
                  </Button>
                </div>
              </div>

              <div className="bg-white rounded-md p-7 md:p-9">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-md bg-amber-100 flex items-center justify-center shrink-0">
                    <Briefcase className="h-5 w-5 text-amber-700" />
                  </div>
                  <div className="flex-1">
                    <div className="font-['Inter'] text-[10px] font-extrabold uppercase tracking-[0.2em] text-amber-600">
                      {language === "ru" ? "Карьера" : "Careers"}
                    </div>
                    <h3 className="mt-1 font-['Inter'] font-black text-[24px] text-zinc-900 leading-tight" data-testid="text-careers-cta-title">
                      {t("careersCTA")}
                    </h3>
                    <p className="mt-2 font-['Fustat'] text-[14px] text-zinc-600" data-testid="text-careers-cta-desc">
                      {t("careersCTADesc")}
                    </p>
                    <Link
                      href="/careers"
                      className="mt-5 inline-flex items-center gap-2 font-['Inter'] text-[12px] font-extrabold uppercase tracking-[0.18em] text-zinc-900 hover:text-amber-600"
                      data-testid="button-view-careers"
                    >
                      {t("viewCareers")}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SEO content block — broad-intent entrepreneurship queries */}
          <section
            id="seo-faq"
            className="px-6 lg:px-12 xl:px-20 pt-12 md:pt-16 pb-10 bg-white"
            aria-label={language === "ru" ? "О клубе и стартапах для студентов" : "About the club and student startups"}
          >
            <div className="max-w-5xl mx-auto">
              <h2 className="font-['Inter'] font-black text-zinc-900 text-[28px] md:text-[40px] tracking-[-0.02em] leading-[1.05]">
                {language === "ru"
                  ? "Хочешь сделать стартап или открыть свой бизнес — начни здесь"
                  : "Want to build a startup or start your own business — begin here"}
              </h2>
              <p className="mt-5 font-['Fustat'] text-[15px] md:text-[17px] text-zinc-700 leading-relaxed max-w-3xl">
                {language === "ru"
                  ? "Предпринимательский Клуб Финансового университета — это бизнес клуб для студентов, которые ещё только думают о собственном деле, ищут идею для стартапа или уже запускают первый продукт. Мы помогаем разобраться, с чего начать бизнес, как найти команду, как протестировать идею и как привлечь первых клиентов и инвестиции. Сюда приходят, чтобы попасть в студенческий бизнес клуб, найти ментора, поучаствовать в акселераторе и встретить таких же предпринимателей."
                  : "The Entrepreneurship Club at Financial University is a business club for students who are just thinking about starting their own venture, looking for a startup idea, or launching their first product. We help you figure out where to start a business, how to find a team, validate an idea, and attract first customers and investors. People come here to join a student business club, find a mentor, take part in an accelerator, and meet other founders."}
              </p>

              <div className="mt-10 grid md:grid-cols-2 gap-x-10 gap-y-8">
                {(language === "ru"
                  ? [
                      {
                        q: "Что такое студенческий предпринимательский клуб и зачем туда идти?",
                        a: "Студенческий предпринимательский клуб — это сообщество, где студенты учатся запускать стартапы и развивать бизнес ещё во время учёбы. Внутри: мероприятия, встречи с фаундерами, акселератор, менторы и команда единомышленников.",
                      },
                      {
                        q: "Хочу сделать стартап, но не знаю с чего начать — что делать?",
                        a: "Запишись в клуб, приходи на ближайшее событие и поговори с менторами. Мы помогаем превратить сырую идею в первую гипотезу, найти кофаундера и сделать MVP за несколько недель.",
                      },
                      {
                        q: "Как открыть свой бизнес студенту с нуля?",
                        a: "Начни с маленького: поговори с потенциальными клиентами, проверь, нужен ли им твой продукт, собери команду из 1–2 человек и сделай минимальный прототип. В клубе есть пошаговые программы и менторы, которые проведут через каждый этап.",
                      },
                      {
                        q: "Я только начинаю думать о бизнесе — мне сюда?",
                        a: "Да. Большинство участников клуба пришли без идеи и без опыта. Сообщество, события и встречи с предпринимателями помогают определиться с направлением и сделать первые шаги.",
                      },
                      {
                        q: "Где найти команду и кофаундера для стартапа?",
                        a: "На наших нетворкинг-событиях и в платформе клуба: участники указывают навыки и то, что ищут (идея, кофаундер, дизайнер, разработчик), и платформа подбирает мэтчи.",
                      },
                      {
                        q: "Как попасть в акселератор и получить менторов?",
                        a: "Зарегистрируйся на платформе, заполни профиль стартапа и подай заявку на ближайший набор акселератора. Менторы доступны участникам клуба после первого события.",
                      },
                    ]
                  : [
                      {
                        q: "What is a student entrepreneurship club and why join one?",
                        a: "A student entrepreneurship club is a community where students learn how to launch startups and grow a business while still studying — events, founder talks, an accelerator, mentors and like-minded peers.",
                      },
                      {
                        q: "I want to build a startup but don't know where to start — what now?",
                        a: "Join the club, come to the next event and talk to mentors. We help turn a raw idea into a first hypothesis, find a co-founder and ship an MVP in a few weeks.",
                      },
                      {
                        q: "How do I start my own business as a student from scratch?",
                        a: "Start small: talk to potential customers, validate that they need the product, build a team of 1–2 people and ship a minimal prototype. The club has step-by-step programs and mentors for every stage.",
                      },
                      {
                        q: "I'm only just thinking about a business — is this for me?",
                        a: "Yes. Most members joined with no idea and no experience. The community, events and founder meetups help you find a direction and take the first steps.",
                      },
                      {
                        q: "Where can I find a team and a co-founder for a startup?",
                        a: "At our networking events and on the club platform — members list skills and what they are looking for (idea, co-founder, designer, developer) and the platform matches you.",
                      },
                      {
                        q: "How do I get into the accelerator and meet mentors?",
                        a: "Sign up on the platform, complete a startup profile and apply to the next accelerator cohort. Mentors are available to club members after the first event.",
                      },
                    ]
                ).map((item, i) => (
                  <div key={i} data-testid={`faq-item-${i}`}>
                    <h3 className="font-['Inter'] font-extrabold text-zinc-900 text-[16px] md:text-[18px] leading-snug">
                      {item.q}
                    </h3>
                    <p className="mt-2 font-['Fustat'] text-[14px] md:text-[15px] text-zinc-600 leading-relaxed">
                      {item.a}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-10">
                <Button
                  asChild
                  className="rounded-full bg-zinc-900 text-white hover:bg-zinc-800 border-0 font-['Inter'] font-extrabold uppercase tracking-[0.16em] text-[12px] gap-2 px-7"
                >
                  <Link href="/login" data-testid="link-seo-cta">
                    {language === "ru" ? "Вступить в клуб" : "Join the club"}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </section>

          {/* FOOTER — EWC-inspired: stylized wordmark + link columns */}
          <footer className="bg-zinc-950 text-white pt-14 pb-10 mt-12 relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
            <div className="px-6 lg:px-12 xl:px-20 max-w-7xl mx-auto">
              {/* Top: bear logo (no text) + wordmark */}
              <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-6">
                <img
                  src={businessClubLogo}
                  alt=""
                  className="h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28 lg:h-36 lg:w-36 rounded-md object-cover shrink-0"
                  data-testid="img-footer-logo"
                />
                <h2
                  className="font-['Inter'] font-black italic tracking-[-0.04em] leading-[0.85] text-white text-center md:text-right select-none text-[28px] sm:text-[36px] md:text-[48px] lg:text-[60px]"
                  data-testid="text-footer-wordmark"
                >
                  {language === "ru" ? (
                    <>
                      ПРЕДПРИНИМАТЕЛЬСКИЙ
                      <br />
                      <span className="text-amber-400">КЛУБ</span>
                    </>
                  ) : (
                    <>
                      ENTREPRENEURSHIP
                      <br />
                      <span className="text-amber-400">CLUB</span>
                    </>
                  )}
                </h2>
              </div>

              <div className="mt-10 h-px bg-white/10" />

              {/* Link columns */}
              <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-8">
                <div>
                  <h4 className="font-['Inter'] text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/45 mb-4">
                    {language === "ru" ? "Платформа" : "Platform"}
                  </h4>
                  <ul className="space-y-3 font-['Fustat'] text-[13px] text-white/80">
                    <li><button onClick={() => scrollTo("about")} className="hover:text-amber-400" data-testid="footer-link-about">{language === "ru" ? "О нас" : "About"}</button></li>
                    <li><button onClick={() => scrollTo("events")} className="hover:text-amber-400" data-testid="footer-link-events">{language === "ru" ? "События" : "Events"}</button></li>
                    <li><button onClick={() => scrollTo("programs")} className="hover:text-amber-400" data-testid="footer-link-programs">{language === "ru" ? "Программы" : "Programs"}</button></li>
                    <li><Link href="/careers" className="hover:text-amber-400" data-testid="footer-link-careers">{language === "ru" ? "Карьера" : "Careers"}</Link></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-['Inter'] text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/45 mb-4">
                    {language === "ru" ? "Сообщество" : "Community"}
                  </h4>
                  <ul className="space-y-3 font-['Fustat'] text-[13px] text-white/80">
                    <li><Link href="/login" className="hover:text-amber-400" data-testid="footer-link-login">{language === "ru" ? "Войти" : "Sign in"}</Link></li>
                    <li><Link href="/register" className="hover:text-amber-400" data-testid="footer-link-register">{language === "ru" ? "Регистрация" : "Register"}</Link></li>
                    <li><Link href="/candidate/login" className="hover:text-amber-400" data-testid="footer-link-candidates">{language === "ru" ? "Кандидатам" : "Candidates"}</Link></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-['Inter'] text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/45 mb-4">
                    {language === "ru" ? "Контакты" : "Contact"}
                  </h4>
                  <ul className="space-y-3 font-['Fustat'] text-[13px] text-white/80">
                    <li><a href="https://t.me/bc_fin" target="_blank" rel="noreferrer" className="hover:text-amber-400" data-testid="footer-link-telegram">Telegram: @bc_fin</a></li>
                    <li><button onClick={() => scrollTo("contact")} className="hover:text-amber-400" data-testid="footer-link-contact">{language === "ru" ? "Группа в Telegram" : "Telegram Group"}</button></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-['Inter'] text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/45 mb-4">
                    {language === "ru" ? "Язык" : "Language"}
                  </h4>
                  <button
                    onClick={() => setLanguage(language === "en" ? "ru" : "en")}
                    className="inline-flex items-center gap-2 font-['Fustat'] text-[13px] text-white/80 hover:text-amber-400"
                    data-testid="footer-language-toggle"
                  >
                    <span className="font-['Inter'] font-bold uppercase tracking-[0.18em] text-[11px]">
                      {language === "ru" ? "Русский" : "English"}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Bottom row */}
              <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <p className="font-['Inter'] text-[10px] uppercase tracking-[0.22em] text-white/40">
                  © {yearLabel} {t("landingFooterRights")}
                </p>
                <p className="font-['Inter'] text-[10px] uppercase tracking-[0.22em] text-white/30">
                  Powered by Ventorix
                </p>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}

function scrollTo(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}
