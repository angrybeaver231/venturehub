import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Calendar as CalendarIcon,
  Video,
  GraduationCap,
  ArrowRight,
  Clock,
  Ticket,
  Building2,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  MapPin,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EventCard } from "@/components/event-card";
import { QRCodeDisplay } from "@/components/qr-code-display";
import { EventTicket } from "@/components/event-ticket";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageSEO } from "@/hooks/usePageSEO";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUpcomingEvent, formatEventDate } from "@/lib/dateUtils";
import type { Event, Video as VideoType, Course } from "@shared/schema";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import eventImage1 from "@assets/generated_images/Entrepreneur_speaking_unicorn_startup_323baa9b.png";

// ──────────────────────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────────────────────

function HeroKpi({
  label,
  value,
  subtitle,
  delta,
  icon: Icon,
  variant = "default",
  testId,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  delta?: string;
  icon: React.ElementType;
  variant?: "primary" | "emerald" | "default" | "muted";
  testId?: string;
}) {
  const styles =
    variant === "primary"
      ? "bg-primary/5 border-primary/30"
      : variant === "emerald"
      ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30"
      : variant === "muted"
      ? "bg-muted/50"
      : "bg-card";
  const accent =
    variant === "primary"
      ? "text-primary"
      : variant === "emerald"
      ? "text-emerald-700 dark:text-emerald-300"
      : "text-foreground";

  return (
    <Card className={cn("overflow-hidden", styles)} data-testid={testId}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className={cn("text-sm font-semibold", accent)}>{label}</CardTitle>
        <div
          className={cn(
            "h-8 w-8 rounded-md flex items-center justify-center bg-background/60",
            accent
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <span className="text-3xl font-bold tabular-nums" data-testid={`${testId}-value`}>
            {value}
          </span>
          {delta && (
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {delta}
            </span>
          )}
        </div>
        {subtitle && (
          <div className="mt-3 pt-3 border-t border-border/60 text-xs text-muted-foreground">
            {subtitle}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MiniCalendar({
  eventsByDate,
  language,
}: {
  eventsByDate: Map<string, { id: string; name: string }[]>;
  language: "en" | "ru";
}) {
  const today = new Date();
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() });

  const monthLabel = new Date(view.year, view.month, 1).toLocaleDateString(
    language === "ru" ? "ru-RU" : "en-US",
    { month: "long", year: "numeric" }
  );
  const firstDayIdx = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  // start grid on Sunday
  const blanks = Array.from({ length: firstDayIdx });
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const headers = language === "ru"
    ? ["В", "П", "В", "С", "Ч", "П", "С"]
    : ["S", "M", "T", "W", "T", "F", "S"];

  const isSameDay = (d: number) =>
    today.getFullYear() === view.year &&
    today.getMonth() === view.month &&
    today.getDate() === d;

  const dateKey = (d: number) =>
    `${view.year}-${String(view.month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const prevMonth = () => {
    const m = view.month - 1;
    if (m < 0) setView({ year: view.year - 1, month: 11 });
    else setView({ ...view, month: m });
  };
  const nextMonth = () => {
    const m = view.month + 1;
    if (m > 11) setView({ year: view.year + 1, month: 0 });
    else setView({ ...view, month: m });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold capitalize" data-testid="text-calendar-month">
          {monthLabel}
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="outline"
            className="h-7 w-7"
            onClick={prevMonth}
            aria-label={language === "ru" ? "Предыдущий месяц" : "Previous month"}
            data-testid="button-calendar-prev"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="h-7 w-7"
            onClick={nextMonth}
            aria-label={language === "ru" ? "Следующий месяц" : "Next month"}
            data-testid="button-calendar-next"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-[10px] uppercase font-medium text-muted-foreground text-center">
        {headers.map((h, i) => (
          <div key={i}>{h}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 text-xs">
        {blanks.map((_, i) => (
          <div key={`b-${i}`} />
        ))}
        {days.map((d) => {
          const key = dateKey(d);
          const has = eventsByDate.has(key);
          const isToday = isSameDay(d);
          return (
            <div
              key={d}
              className={cn(
                "aspect-square flex items-center justify-center rounded-full text-xs tabular-nums select-none",
                isToday && "bg-primary text-primary-foreground font-semibold",
                !isToday && has && "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 font-medium",
                !isToday && !has && "text-foreground/80"
              )}
              data-testid={`day-${key}`}
              title={has ? eventsByDate.get(key)!.map((e) => e.name).join(", ") : undefined}
            >
              {d}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-1">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-primary" />
          {language === "ru" ? "Сегодня" : "Today"}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          {language === "ru" ? "Событие" : "Event"}
        </span>
      </div>
    </div>
  );
}

function ActivityBars({
  buckets,
  language,
}: {
  buckets: { label: string; count: number }[];
  language: "en" | "ru";
}) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2 h-32">
        {buckets.map((b, i) => {
          const h = Math.max(6, Math.round((b.count / max) * 100));
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
              <div className="w-full flex-1 flex items-end">
                <div
                  className={cn(
                    "w-full rounded-t-md transition-[height] duration-500",
                    b.count > 0 ? "bg-primary" : "bg-muted"
                  )}
                  style={{ height: `${h}%` }}
                  title={`${b.count}`}
                />
              </div>
              <div className="text-[10px] text-muted-foreground tabular-nums">{b.count}</div>
              <div className="text-[10px] text-muted-foreground truncate w-full text-center">
                {b.label}
              </div>
            </div>
          );
        })}
      </div>
      <div className="text-[10px] text-muted-foreground">
        {language === "ru" ? "События за последние 6 месяцев" : "Events over the last 6 months"}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  usePageSEO({
    title: "Dashboard | Панель управления",
    description:
      "Member dashboard for Business Club at Financial University. View upcoming events, videos, and courses. Панель участника Предпринимательского Клуба Финансового Университета.",
    keywords:
      "business club dashboard, financial university, member portal, предпринимательский клуб, панель участника",
  });

  const { data: events = [] } = useQuery<Event[]>({ queryKey: ["/api/events"] });
  const { data: featuredEvent } = useQuery<Event | null>({
    queryKey: ["/api/events/featured/current"],
  });
  const { data: featuredClubEvents = [] } = useQuery<any[]>({
    queryKey: ["/api/events/featured-by-clubs"],
  });
  const { data: registrations = [] } = useQuery<any[]>({
    queryKey: ["/api/events/registrations"],
    enabled: !!user,
  });
  const { data: videos = [] } = useQuery<VideoType[]>({ queryKey: ["/api/videos"] });
  const { data: courses = [] } = useQuery<Course[]>({ queryKey: ["/api/courses"] });

  const registerMutation = useMutation({
    mutationFn: async (eventId: string) => {
      return await apiRequest(`/api/events/${eventId}/register`, {
        method: "POST",
        body: JSON.stringify({}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events/registrations"] });
      toast({ title: "Success!", description: "You've been registered for this event." });
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message || "Could not register for this event.",
        variant: "destructive",
      });
    },
  });

  const lang = (language === "ru" ? "ru" : "en") as "ru" | "en";

  // ── Derived data ─────────────────────────────────────────────────────────
  const registeredEventIds = useMemo(
    () => new Set(registrations.map((r: any) => r.eventId)),
    [registrations]
  );

  const eventsWithRegistration = useMemo(
    () =>
      events.map((e) => ({
        ...e,
        status: e.status as "upcoming" | "full" | "past",
        registered: registeredEventIds.has(e.id),
      })),
    [events, registeredEventIds]
  );

  const upcomingEvents = useMemo(
    () => eventsWithRegistration.filter((e) => e.status === "upcoming"),
    [eventsWithRegistration]
  );
  const nextEvent = upcomingEvents[0];

  const upcomingRegistrations = useMemo(() => {
    return registrations.filter((r: any) => {
      const ev = events.find((e) => e.id === r.eventId);
      return ev && isUpcomingEvent(ev.date);
    });
  }, [registrations, events]);

  const attendedCount = useMemo(
    () => registrations.filter((r: any) => r.attendanceMarked).length,
    [registrations]
  );
  const totalRegistered = registrations.length;
  const attendanceRate =
    totalRegistered > 0 ? Math.round((attendedCount / totalRegistered) * 100) : 0;

  const featuredEventWithRegistration = featuredEvent
    ? { ...featuredEvent, registered: registeredEventIds.has(featuredEvent.id) }
    : null;

  // Calendar lookup: yyyy-mm-dd → events
  const eventsByDate = useMemo(() => {
    const map = new Map<string, { id: string; name: string }[]>();
    for (const ev of events) {
      if (!ev.date) continue;
      const d = new Date(ev.date);
      if (Number.isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;
      const list = map.get(key) || [];
      list.push({ id: ev.id, name: ev.name });
      map.set(key, list);
    }
    return map;
  }, [events]);

  // Last 6 months activity buckets
  const activityBuckets = useMemo(() => {
    const now = new Date();
    const buckets: { label: string; count: number; year: number; month: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        label: d.toLocaleDateString(lang === "ru" ? "ru-RU" : "en-US", { month: "short" }),
        count: 0,
        year: d.getFullYear(),
        month: d.getMonth(),
      });
    }
    for (const ev of events) {
      if (!ev.date) continue;
      const d = new Date(ev.date);
      if (Number.isNaN(d.getTime())) continue;
      const b = buckets.find((x) => x.year === d.getFullYear() && x.month === d.getMonth());
      if (b) b.count++;
    }
    return buckets.map(({ label, count }) => ({ label, count }));
  }, [events, lang]);

  // Greeting based on hour
  const hour = new Date().getHours();
  const greeting =
    lang === "ru"
      ? hour < 12
        ? "Доброе утро"
        : hour < 18
        ? "Добрый день"
        : "Добрый вечер"
      : hour < 12
      ? "Good morning"
      : hour < 18
      ? "Good afternoon"
      : "Good evening";
  const userName = user?.firstName || (user as any)?.email?.split("@")[0] || "there";

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen p-3 sm:p-6 md:p-8 overflow-x-hidden">
      <div className="max-w-7xl mx-auto w-full space-y-6">
        {/* Greeting header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground mb-1">
              {lang === "ru" ? "Привет" : "Hello"}, {userName}!
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold" data-testid="text-greeting">
              {greeting}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">{t("dashboardSubtitle")}</p>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <HeroKpi
            label={t("upcomingEvents")}
            value={upcomingEvents.length}
            icon={CalendarIcon}
            variant="primary"
            subtitle={
              upcomingEvents.length > 0
                ? lang === "ru"
                  ? "Не пропустите следующее"
                  : "Don't miss the next one"
                : lang === "ru"
                ? "Нет запланированных"
                : "Nothing scheduled"
            }
            testId="kpi-upcoming-events"
          />
          <HeroKpi
            label={lang === "ru" ? "Мои регистрации" : "My Registrations"}
            value={upcomingRegistrations.length}
            icon={Ticket}
            variant="emerald"
            subtitle={
              totalRegistered > 0
                ? `${attendanceRate}% ${lang === "ru" ? "посещаемость" : "attendance"}`
                : lang === "ru"
                ? "Зарегистрируйтесь на событие"
                : "Register for an event"
            }
            testId="kpi-registrations"
          />
          <HeroKpi
            label={t("videosAvailable")}
            value={videos.length}
            icon={Video}
            variant="default"
            subtitle={
              lang === "ru"
                ? "Записи и прямые трансляции"
                : "Recordings & livestreams"
            }
            testId="kpi-videos"
          />
          <HeroKpi
            label={t("activeCourses")}
            value={courses.length}
            icon={GraduationCap}
            variant="muted"
            subtitle={lang === "ru" ? "Доступно для изучения" : "Available to learn"}
            testId="kpi-courses"
          />
        </div>

        {/* Featured event + Mini calendar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {featuredEventWithRegistration ? (
            <Card
              className="lg:col-span-8 overflow-hidden border-2 border-primary/30 hover-elevate"
              data-testid="card-featured-event-dashboard"
            >
              <Link href={`/events/${featuredEventWithRegistration.id}`} data-testid="link-featured-event-dashboard">
                <div className="grid grid-cols-1 sm:grid-cols-2">
                  <div className="aspect-video sm:aspect-auto sm:h-full overflow-hidden relative bg-muted">
                    <img
                      src={featuredEventWithRegistration.customImage || eventImage1}
                      alt={featuredEventWithRegistration.name}
                      className="w-full h-full object-cover"
                    />
                    <Badge className="absolute top-3 left-3 gap-1 bg-primary text-primary-foreground border-0">
                      <Sparkles className="h-3 w-3" />
                      {t("featuredEvent")}
                    </Badge>
                  </div>
                  <div className="p-5 flex flex-col justify-center">
                    <h3 className="text-xl font-bold mb-3 line-clamp-2">
                      {featuredEventWithRegistration.name}
                    </h3>
                    <div className="space-y-1.5 mb-3 text-sm text-muted-foreground">
                      <p className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-primary shrink-0" />
                        <span className="truncate">
                          {formatEventDate(featuredEventWithRegistration.date, language)}
                        </span>
                      </p>
                      <p className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary shrink-0" />
                        {featuredEventWithRegistration.time}
                      </p>
                    </div>
                    {featuredEventWithRegistration.description && (
                      <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                        {featuredEventWithRegistration.description}
                      </p>
                    )}
                    {featuredEventWithRegistration.registrationRestrictedTo &&
                      featuredEventWithRegistration.registrationRestrictedTo.length > 0 && (
                        <div
                          className="flex items-start gap-2 text-xs mb-3"
                          data-testid="badge-restriction-featured"
                        >
                          <ShieldAlert className="h-3.5 w-3.5 text-orange-500 shrink-0 mt-0.5" />
                          <span className="text-orange-600 dark:text-orange-400">
                            {language === "ru" ? "Только для: " : "Only for: "}
                            {featuredEventWithRegistration.registrationRestrictedTo
                              .map((r: string) => {
                                const labels: Record<string, { ru: string; en: string }> = {
                                  financial_university: {
                                    ru: "Финансовый университет",
                                    en: "Financial University",
                                  },
                                  other_university: { ru: "Другой вуз", en: "Other University" },
                                  school: { ru: "Школа", en: "School" },
                                  workplace: { ru: "Место работы", en: "Workplace" },
                                };
                                return labels[r]?.[lang] || r;
                              })
                              .join(", ")}
                          </span>
                        </div>
                      )}
                    <div>
                      <Badge
                        variant={featuredEventWithRegistration.registered ? "default" : "secondary"}
                        className="gap-1.5 rounded-full"
                      >
                        {featuredEventWithRegistration.registered ? (
                          <>
                            <CheckCircle2 className="h-3 w-3" />
                            {t("registered")}
                          </>
                        ) : featuredEventWithRegistration.registrationOpen === false ? (
                          t("registrationClosed")
                        ) : (
                          <>
                            {t("clickToLearnMore")}
                            <ArrowRight className="h-3 w-3" />
                          </>
                        )}
                      </Badge>
                    </div>
                  </div>
                </div>
              </Link>
            </Card>
          ) : nextEvent ? (
            <Card className="lg:col-span-8" data-testid="card-next-event">
              <CardHeader>
                <CardTitle>{t("nextEvent")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-w-sm">
                  <EventCard
                    event={nextEvent}
                    onRegister={(id) => registerMutation.mutate(id)}
                    isAdmin={user?.role === "eventAdmin" || user?.isHeadAdmin === true}
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="lg:col-span-8" data-testid="card-no-events">
              <CardContent className="py-12 flex flex-col items-center justify-center text-center gap-3">
                <CalendarIcon className="h-10 w-10 text-muted-foreground" />
                <div className="text-sm font-medium">
                  {lang === "ru" ? "Пока нет событий" : "No events yet"}
                </div>
                <div className="text-xs text-muted-foreground max-w-sm">
                  {lang === "ru"
                    ? "Загляните позже — мы анонсируем новые встречи и трансляции."
                    : "Check back soon — we'll announce new meetups and livestreams."}
                </div>
                <Button asChild variant="outline" size="sm" className="mt-2">
                  <Link href="/events" data-testid="link-explore-events">
                    {lang === "ru" ? "Все события" : "Browse all events"}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="lg:col-span-4" data-testid="card-mini-calendar">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                {lang === "ru" ? "Календарь" : "Calendar"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MiniCalendar eventsByDate={eventsByDate} language={lang} />
            </CardContent>
          </Card>
        </div>

        {/* Schedule + Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <Card className="lg:col-span-8" data-testid="card-my-schedule">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base font-semibold">
                {lang === "ru" ? "Моё расписание" : "My Schedule"}
              </CardTitle>
              <Badge variant="secondary" className="rounded-full">
                {upcomingRegistrations.length}
              </Badge>
            </CardHeader>
            <CardContent>
              {upcomingRegistrations.length > 0 ? (
                <div className="divide-y -mx-2">
                  {upcomingRegistrations.slice(0, 4).map((registration: any) => {
                    const event = events.find((e) => e.id === registration.eventId);
                    if (!event) return null;
                    return (
                      <div
                        key={registration.id}
                        className="px-2 py-3 flex items-start gap-3"
                        data-testid={`schedule-item-${registration.id}`}
                      >
                        <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <CalendarIcon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <Link href={`/events/${event.id}`}>
                            <div className="font-medium text-sm truncate hover:underline">
                              {event.name}
                            </div>
                          </Link>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3" />
                              {formatEventDate(event.date, language)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {event.time}
                            </span>
                            {event.location && (
                              <span className="flex items-center gap-1 truncate max-w-[200px]">
                                <MapPin className="h-3 w-3" />
                                <span className="truncate">{event.location}</span>
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 shrink-0"
                          onClick={() => setSelectedTicketId(registration.id)}
                          data-testid={`button-view-ticket-${registration.id}`}
                        >
                          <Ticket className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">{t("viewTicket")}</span>
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 flex flex-col items-center justify-center text-center gap-2">
                  <Ticket className="h-8 w-8 text-muted-foreground" />
                  <div className="text-sm text-muted-foreground">
                    {lang === "ru"
                      ? "Вы ещё не зарегистрированы на события"
                      : "You haven't registered for any events yet"}
                  </div>
                  <Button asChild variant="outline" size="sm" className="mt-1">
                    <Link href="/events" data-testid="link-find-events">
                      {lang === "ru" ? "Найти события" : "Find events"}
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-4" data-testid="card-activity">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                {lang === "ru" ? "Активность" : "Activity"}
              </CardTitle>
              <Badge variant="outline" className="rounded-full text-[10px]">
                <TrendingUp className="h-3 w-3 mr-1" />
                {events.length}
              </Badge>
            </CardHeader>
            <CardContent>
              <ActivityBars buckets={activityBuckets} language={lang} />
            </CardContent>
          </Card>
        </div>

        {/* Featured club picks */}
        {featuredClubEvents.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">
                {lang === "ru" ? "Рекомендации клубов" : "Club Picks"}
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredClubEvents.map((event: any) => (
                <EventCard
                  key={event.id}
                  event={{
                    ...event,
                    status: event.status as "upcoming" | "full" | "past",
                    registered: registeredEventIds.has(event.id),
                  }}
                  onRegister={(id) => registerMutation.mutate(id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* My tickets with QR */}
        {upcomingRegistrations.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Ticket className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">
                {t("registered")} ({upcomingRegistrations.length})
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingRegistrations.map((registration: any) => {
                const event = events.find((e) => e.id === registration.eventId);
                if (!event) return null;
                const initials = event.name
                  .split(" ")
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();
                return (
                  <Card key={registration.id} className="hover-elevate" data-testid={`ticket-card-${registration.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 rounded-md">
                          <AvatarImage src={event.customImage || undefined} alt={event.name} />
                          <AvatarFallback className="rounded-md bg-primary/10 text-primary text-xs">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-base truncate">{event.name}</CardTitle>
                          <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                            <div className="flex items-center gap-1.5">
                              <CalendarIcon className="h-3 w-3" />
                              {formatEventDate(event.date, language)}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3 w-3" />
                              {event.time}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button
                        onClick={() => setSelectedTicketId(registration.id)}
                        className="w-full gap-2"
                        size="sm"
                        data-testid={`button-view-ticket-grid-${registration.id}`}
                      >
                        <Ticket className="h-4 w-4" />
                        {t("viewTicket")}
                      </Button>
                      <QRCodeDisplay
                        registrationId={registration.id}
                        eventName={event.name}
                        showDownload={true}
                      />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Ticket dialog */}
        <Dialog open={!!selectedTicketId} onOpenChange={() => setSelectedTicketId(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("eventTicket")}</DialogTitle>
            </DialogHeader>
            {selectedTicketId && <EventTicket registrationId={selectedTicketId} />}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
