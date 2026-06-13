import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Activity, ExternalLink, Loader2, AlertCircle, Clock, Play } from "lucide-react";
import type { SignalEvent, SignalSource } from "@shared/schema";

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

export function StartupSignalsSection({ startupId }: { startupId: string }) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const ru = language === "ru";
  const isAdmin = !!user && (user.isHeadAdmin === true || user.role === "eventAdmin" || user.role === "innoLabsAdmin");
  const [running, setRunning] = useState<string | null>(null);

  const { data: events = [], isLoading: eventsLoading } = useQuery<SignalEvent[]>({
    queryKey: ["/api/startups", startupId, "signal-events"],
    queryFn: async () => {
      const res = await fetch(`/api/startups/${startupId}/signal-events`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch signal events");
      return res.json();
    },
  });

  const { data: sources = [], isLoading: sourcesLoading } = useQuery<SignalSource[]>({
    queryKey: ["/api/signals/sources"],
    queryFn: async () => {
      const res = await fetch(`/api/signals/sources`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const runMutation = useMutation({
    mutationFn: async (sourceKey: string) => {
      setRunning(sourceKey);
      const res = await apiRequest(
        `/api/admin/signals/sources/${sourceKey}/run-for-startup/${startupId}`,
        { method: "POST" },
      );
      return res.json();
    },
    onSuccess: (data, sourceKey) => {
      toast({
        title: ru ? "Готово" : "Done",
        description: ru
          ? `Источник «${sourceKey}» создал ${data.eventsCreated ?? 0} событий (${data.status}).`
          : `Source "${sourceKey}" created ${data.eventsCreated ?? 0} events (${data.status}).`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/startups", startupId, "signal-events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/signals/sources"] });
    },
    onError: (err: Error) => {
      toast({ title: ru ? "Ошибка" : "Error", description: err.message, variant: "destructive" });
    },
    onSettled: () => setRunning(null),
  });

  const eventsBySource = new Map<string, SignalEvent[]>();
  for (const ev of events) {
    const arr = eventsBySource.get(ev.sourceKey) ?? [];
    arr.push(ev);
    eventsBySource.set(ev.sourceKey, arr);
  }

  return (
    <Card data-testid="card-startup-signals">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          {ru ? "Сигналы" : "Signals"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="events" className="w-full">
          <TabsList data-testid="tabs-signals">
            <TabsTrigger value="events" data-testid="tab-signals-events">
              {ru ? "События" : "Events"}
            </TabsTrigger>
            <TabsTrigger value="sources" data-testid="tab-signals-sources">
              {ru ? "Источники" : "Sources"}
            </TabsTrigger>
            <TabsTrigger value="bysource" data-testid="tab-signals-by-source">
              {ru ? "По источникам" : "By source"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="mt-4">
            {eventsLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                {ru ? "Загрузка…" : "Loading…"}
              </div>
            ) : events.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4" data-testid="text-no-signals">
                {ru
                  ? "Сигналов пока нет. Источники будут наполняться по мере подключения интеграций."
                  : "No signals yet. Sources will populate this feed as integrations come online."}
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 p-3 border rounded-md"
                    data-testid={`row-signal-${event.id}`}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`text-xs ${SEVERITY_CLASSES[event.severity] ?? SEVERITY_CLASSES.info}`}>
                          {event.severity}
                        </Badge>
                        <Badge variant="outline" className="text-xs">{event.sourceKey}</Badge>
                        <Badge variant="outline" className="text-xs">{event.eventType}</Badge>
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
                        >
                          <ExternalLink className="h-3 w-3" />
                          {ru ? "Источник" : "Source"}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sources" className="mt-4">
            {sourcesLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                {ru ? "Загрузка…" : "Loading…"}
              </div>
            ) : sources.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4" data-testid="text-no-sources">
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
                      data-testid={`row-startup-source-${s.sourceKey}`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{s.displayName}</span>
                          <Badge variant="outline" className="text-xs">{s.category}</Badge>
                          <Badge
                            className={`text-xs ${cls}`}
                            data-testid={`badge-startup-source-status-${s.sourceKey}`}
                          >
                            {label[ru ? "ru" : "en"]}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {s.lastRunAt
                              ? new Date(s.lastRunAt).toLocaleString(ru ? "ru-RU" : "en-US")
                              : ru ? "Никогда" : "Never"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="bysource" className="mt-4">
            {sourcesLoading || eventsLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                {ru ? "Загрузка…" : "Loading…"}
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {sources.map((s) => {
                  const cls = STATUS_CLASSES[s.status] ?? STATUS_CLASSES.idle;
                  const label = STATUS_LABELS[s.status] ?? STATUS_LABELS.idle;
                  const bucket = (eventsBySource.get(s.sourceKey) ?? []).slice(0, 5);
                  return (
                    <div
                      key={s.sourceKey}
                      className="border rounded-md p-3 space-y-2"
                      data-testid={`card-source-${s.sourceKey}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-medium text-sm">{s.displayName}</div>
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            <Badge variant="outline" className="text-xs">{s.category}</Badge>
                            <Badge className={`text-xs ${cls}`}>{label[ru ? "ru" : "en"]}</Badge>
                          </div>
                        </div>
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={running === s.sourceKey}
                            onClick={() => runMutation.mutate(s.sourceKey)}
                            data-testid={`button-run-source-${s.sourceKey}`}
                          >
                            {running === s.sourceKey ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Play className="h-3 w-3" />
                            )}
                            <span className="ml-1">{ru ? "Запустить" : "Run"}</span>
                          </Button>
                        )}
                      </div>
                      {bucket.length === 0 ? (
                        <div className="text-xs text-muted-foreground py-2">
                          {ru ? "Событий пока нет." : "No events yet."}
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {bucket.map((ev) => (
                            <div key={ev.id} className="text-xs" data-testid={`row-source-event-${ev.id}`}>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Badge className={`text-[10px] ${SEVERITY_CLASSES[ev.severity] ?? SEVERITY_CLASSES.info}`}>
                                  {ev.severity}
                                </Badge>
                                <span className="text-muted-foreground">
                                  {new Date(ev.occurredAt).toLocaleDateString(ru ? "ru-RU" : "en-US")}
                                </span>
                              </div>
                              <div className="line-clamp-2">{ev.title ?? ev.eventType}</div>
                              {ev.url && (
                                <a
                                  href={ev.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-primary hover:underline"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  {ru ? "ссылка" : "link"}
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {s.lastError && (
                        <div className="flex items-start gap-1 text-xs text-red-600 dark:text-red-400">
                          <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                          <span className="line-clamp-2">{s.lastError}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
