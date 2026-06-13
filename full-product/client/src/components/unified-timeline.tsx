import { useMemo, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Activity, ExternalLink, Loader2, ShieldCheck, Sparkles, History, Clock, AlertCircle, ChevronDown,
} from "lucide-react";
import type { SignalEvent, SignalSource, Milestone } from "@shared/schema";
import { DiffSinceModal } from "./diff-since-modal";

const SEVERITY_CLASSES: Record<string, string> = {
  info: "bg-muted text-muted-foreground",
  positive: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  critical: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

const STATUS_CLASSES: Record<string, string> = {
  live: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  no_credentials: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  error: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  disabled: "bg-muted text-muted-foreground",
  idle: "bg-muted text-muted-foreground",
};

const STATUS_LABELS: Record<string, { en: string; ru: string }> = {
  live: { en: "Live", ru: "Активен" },
  no_credentials: { en: "No credentials", ru: "Нет ключей" },
  error: { en: "Error", ru: "Ошибка" },
  disabled: { en: "Disabled", ru: "Отключён" },
  idle: { en: "Idle", ru: "Ожидает" },
};

const SEVERITIES = ["info", "positive", "warning", "critical"] as const;

const KIND_CLASSES: Record<string, string> = {
  fundraise: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  product_release: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  team_hire: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  mrr_milestone: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  user_milestone: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300",
  partnership: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  media_coverage: "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300",
  regulatory: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  other: "bg-muted text-muted-foreground",
};

const KIND_LABELS: Record<string, { en: string; ru: string }> = {
  fundraise: { en: "Fundraise", ru: "Привлечение" },
  product_release: { en: "Product release", ru: "Релиз продукта" },
  team_hire: { en: "Hire", ru: "Найм" },
  mrr_milestone: { en: "MRR milestone", ru: "MRR-веха" },
  user_milestone: { en: "User milestone", ru: "Пользовательская веха" },
  partnership: { en: "Partnership", ru: "Партнёрство" },
  media_coverage: { en: "Media", ru: "СМИ" },
  regulatory: { en: "Regulatory", ru: "Регулирование" },
  other: { en: "Other", ru: "Другое" },
};

type TimelinePage = { events: SignalEvent[]; nextCursor: string | null };

export function UnifiedTimeline({ startupId }: { startupId: string }) {
  const { language } = useLanguage();
  const ru = language === "ru";

  const [severity, setSeverity] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [source, setSource] = useState<string>("all");
  const [after, setAfter] = useState<string>("");
  const [before, setBefore] = useState<string>("");
  const [diffOpen, setDiffOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  const { data: sources = [] } = useQuery<SignalSource[]>({
    queryKey: ["/api/signals/sources"],
    queryFn: async () => {
      const res = await fetch(`/api/signals/sources`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const s of sources) if (s.category) set.add(s.category);
    return Array.from(set).sort();
  }, [sources]);

  const visibleSources = useMemo(() => {
    if (category === "all") return sources;
    return sources.filter((s) => s.category === category);
  }, [sources, category]);

  const filterParams = useMemo(() => {
    const p = new URLSearchParams();
    if (severity !== "all") p.set("severity", severity);
    if (category !== "all") p.set("category", category);
    if (source !== "all") p.set("source", source);
    if (after) p.set("after", new Date(after).toISOString());
    if (before) p.set("before", new Date(before).toISOString());
    p.set("limit", "25");
    return p.toString();
  }, [severity, category, source, after, before]);

  const timelineQuery = useInfiniteQuery<TimelinePage>({
    queryKey: ["/api/startups", startupId, "timeline", filterParams],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const p = new URLSearchParams(filterParams);
      if (pageParam) p.set("cursor", pageParam as string);
      const res = await fetch(`/api/startups/${startupId}/timeline?${p.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch timeline");
      return res.json();
    },
    getNextPageParam: (last) => last.nextCursor,
  });

  const { data: milestones = [], isLoading: msLoading } = useQuery<Milestone[]>({
    queryKey: ["/api/startups", startupId, "milestones"],
    queryFn: async () => {
      const res = await fetch(`/api/startups/${startupId}/milestones`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const events = timelineQuery.data?.pages.flatMap((p) => p.events) ?? [];

  const filtersActive =
    severity !== "all" || category !== "all" || source !== "all" || after !== "" || before !== "";

  const resetFilters = () => {
    setSeverity("all");
    setCategory("all");
    setSource("all");
    setAfter("");
    setBefore("");
  };

  return (
    <Card data-testid="card-unified-timeline">
      <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          {ru ? "Лента и вехи" : "Timeline & milestones"}
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDiffOpen(true)}
          data-testid="button-open-diff"
        >
          <History className="h-4 w-4 mr-1" />
          {ru ? "Что изменилось за 30 дней" : "What changed in 30 days"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pinned milestones (top of unified feed) */}
        <div className="space-y-2" data-testid="section-pinned-milestones">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <Sparkles className="h-3.5 w-3.5" />
            {ru ? "Закреплённые вехи" : "Pinned milestones"}
          </div>
          {msLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              {ru ? "Загрузка…" : "Loading…"}
            </div>
          ) : milestones.length === 0 ? (
            <div className="text-sm text-muted-foreground" data-testid="text-no-milestones">
              {ru
                ? "Вехи появятся здесь после ночной обработки сигналов."
                : "Milestones will appear here after the nightly signals pass."}
            </div>
          ) : (
            <div className="space-y-2">
              {milestones.map((m) => {
                const ids = m.sourceEventIds ?? [];
                const cls = KIND_CLASSES[m.kind] ?? KIND_CLASSES.other;
                const label = KIND_LABELS[m.kind] ?? KIND_LABELS.other;
                return (
                  <div
                    key={m.id}
                    className="flex items-start gap-3 p-3 border rounded-md bg-muted/30"
                    data-testid={`row-milestone-${m.id}`}
                  >
                    <Sparkles className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`text-xs ${cls}`}>{label[ru ? "ru" : "en"]}</Badge>
                        <Badge variant="outline" className="text-xs">
                          {ru ? "Уверенность" : "Confidence"}: {m.confidence}%
                        </Badge>
                        {ids.length >= 2 && (
                          <Badge className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                            <ShieldCheck className="h-3 w-3 mr-1" />
                            {ru ? `${ids.length} событий` : `${ids.length} events`}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(m.occurredAt).toLocaleDateString(ru ? "ru-RU" : "en-US", {
                            year: "numeric", month: "short", day: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="font-medium text-sm" data-testid={`text-milestone-title-${m.id}`}>{m.title}</div>
                      {m.description && (
                        <p className="text-sm text-muted-foreground" data-testid={`text-milestone-desc-${m.id}`}>{m.description}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center pt-2 border-t">
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger className="w-auto min-w-[140px]" data-testid="select-filter-severity">
              <SelectValue placeholder={ru ? "Уровень" : "Severity"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ru ? "Все уровни" : "All severities"}</SelectItem>
              {SEVERITIES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={(v) => { setCategory(v); setSource("all"); }}>
            <SelectTrigger className="w-auto min-w-[160px]" data-testid="select-filter-category">
              <SelectValue placeholder={ru ? "Категория" : "Category"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ru ? "Все категории" : "All categories"}</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="w-auto min-w-[160px]" data-testid="select-filter-source">
              <SelectValue placeholder={ru ? "Источник" : "Source"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ru ? "Все источники" : "All sources"}</SelectItem>
              {visibleSources.map((s) => (
                <SelectItem key={s.sourceKey} value={s.sourceKey}>{s.displayName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">{ru ? "С" : "From"}</span>
            <Input
              type="date"
              value={after}
              onChange={(e) => setAfter(e.target.value)}
              className="w-auto min-w-[140px]"
              data-testid="input-filter-after"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">{ru ? "По" : "To"}</span>
            <Input
              type="date"
              value={before}
              onChange={(e) => setBefore(e.target.value)}
              className="w-auto min-w-[140px]"
              data-testid="input-filter-before"
            />
          </div>
          {filtersActive && (
            <Button variant="ghost" size="sm" onClick={resetFilters} data-testid="button-reset-filters">
              {ru ? "Сбросить" : "Reset"}
            </Button>
          )}
        </div>

        {/* Unified events feed */}
        {timelineQuery.isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            {ru ? "Загрузка…" : "Loading…"}
          </div>
        ) : events.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4" data-testid="text-no-timeline">
            {ru ? "Событий нет." : "No events yet."}
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {events.map((event) => {
                const verifiedSources = (event.verifiedBy ?? []).filter(Boolean);
                const isVerified = verifiedSources.length >= 2;
                return (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 p-3 border rounded-md"
                    data-testid={`row-timeline-${event.id}`}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`text-xs ${SEVERITY_CLASSES[event.severity] ?? SEVERITY_CLASSES.info}`}>
                          {event.severity}
                        </Badge>
                        <Badge variant="outline" className="text-xs">{event.sourceKey}</Badge>
                        <Badge variant="outline" className="text-xs">{event.eventType}</Badge>
                        {isVerified && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Badge
                                className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 cursor-pointer"
                                data-testid={`badge-verified-${event.id}`}
                              >
                                <ShieldCheck className="h-3 w-3 mr-1" />
                                {ru ? `Подтверждено (${verifiedSources.length})` : `Verified (${verifiedSources.length})`}
                              </Badge>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto" data-testid={`popover-verified-${event.id}`}>
                              <div className="space-y-1">
                                <p className="text-xs font-medium">
                                  {ru ? "Подтверждено источниками:" : "Confirmed by sources:"}
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {verifiedSources.map((s) => (
                                    <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                                  ))}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(event.occurredAt).toLocaleString(ru ? "ru-RU" : "en-US")}
                        </span>
                      </div>
                      {event.title && <div className="font-medium text-sm">{event.title}</div>}
                      {event.summary && <p className="text-sm text-muted-foreground">{event.summary}</p>}
                      {event.url && (
                        <a
                          href={event.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          data-testid={`link-event-source-${event.id}`}
                        >
                          <ExternalLink className="h-3 w-3" />
                          {ru ? "Источник" : "Source"}
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {timelineQuery.hasNextPage && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => timelineQuery.fetchNextPage()}
                  disabled={timelineQuery.isFetchingNextPage}
                  data-testid="button-load-more-timeline"
                >
                  {timelineQuery.isFetchingNextPage ? (
                    <><Loader2 className="h-4 w-4 mr-1 animate-spin" />{ru ? "Загрузка…" : "Loading…"}</>
                  ) : (
                    ru ? "Загрузить ещё" : "Load more"
                  )}
                </Button>
              </div>
            )}
          </>
        )}

        {/* Sources (collapsible secondary detail, not a separate primary tab) */}
        <Collapsible open={sourcesOpen} onOpenChange={setSourcesOpen} className="pt-2 border-t">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between" data-testid="button-toggle-sources">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {ru ? `Источники (${sources.length})` : `Sources (${sources.length})`}
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${sourcesOpen ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            {sources.length === 0 ? (
              <div className="text-sm text-muted-foreground py-2" data-testid="text-no-sources">
                {ru
                  ? "Источники появятся здесь по мере того, как команды будут регистрировать их."
                  : "Sources will appear here as feature teams register them."}
              </div>
            ) : (
              <div className="space-y-2">
                {sources.map((s) => {
                  const cls = STATUS_CLASSES[s.status] ?? STATUS_CLASSES.idle;
                  const label = STATUS_LABELS[s.status] ?? STATUS_LABELS.idle;
                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-3 p-2 border rounded-md"
                      data-testid={`row-source-${s.sourceKey}`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{s.displayName}</span>
                          <Badge variant="outline" className="text-xs">{s.category}</Badge>
                          <Badge className={`text-xs ${cls}`}>{label[ru ? "ru" : "en"]}</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {s.lastRunAt
                              ? new Date(s.lastRunAt).toLocaleString(ru ? "ru-RU" : "en-US")
                              : ru ? "Никогда" : "Never"}
                          </span>
                          {s.lastError && (
                            <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                              <AlertCircle className="h-3 w-3" />
                              {s.lastError.slice(0, 60)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>

      <DiffSinceModal startupId={startupId} open={diffOpen} onOpenChange={setDiffOpen} defaultDays={30} />
    </Card>
  );
}
