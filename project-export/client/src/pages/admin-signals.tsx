import { useQuery, useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Activity, Play, Clock, AlertCircle, Loader2 } from "lucide-react";
import type { SignalSource, CronJob } from "@shared/schema";

const STATUS_VARIANTS: Record<string, { label: { en: string; ru: string }; cls: string }> = {
  live: { label: { en: "Live", ru: "Активен" }, cls: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  no_credentials: { label: { en: "No credentials", ru: "Нет ключей" }, cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  error: { label: { en: "Error", ru: "Ошибка" }, cls: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
  disabled: { label: { en: "Disabled", ru: "Отключён" }, cls: "bg-muted text-muted-foreground" },
  idle: { label: { en: "Idle", ru: "Ожидает" }, cls: "bg-muted text-muted-foreground" },
};

function formatTime(date: Date | string | null | undefined, ru: boolean): string {
  if (!date) return ru ? "—" : "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString(ru ? "ru-RU" : "en-US", { dateStyle: "short", timeStyle: "short" });
}

export default function AdminSignalsPage() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const ru = language === "ru";

  const { data: sources = [], isLoading: sourcesLoading } = useQuery<SignalSource[]>({
    queryKey: ["/api/admin/signals/sources"],
  });

  const { data: cronJobsData = [], isLoading: jobsLoading } = useQuery<CronJob[]>({
    queryKey: ["/api/admin/signals/cron-jobs"],
  });

  const pauseSourceMutation = useMutation({
    mutationFn: async ({ sourceKey, isPaused }: { sourceKey: string; isPaused: boolean }) => {
      return apiRequest(`/api/admin/signals/sources/${sourceKey}/pause`, { method: "POST", body: JSON.stringify({ isPaused }) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/signals/sources"] });
    },
    onError: (err: any) => toast({ title: ru ? "Ошибка" : "Error", description: err.message, variant: "destructive" }),
  });

  const runSourceMutation = useMutation({
    mutationFn: async (sourceKey: string) => {
      const res = await apiRequest(`/api/admin/signals/sources/${sourceKey}/run`, { method: "POST" });
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: ru ? "Запуск завершён" : "Run completed",
        description: ru
          ? `Создано событий: ${data.eventsCreated} • статус: ${data.status}`
          : `Events created: ${data.eventsCreated} • status: ${data.status}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/signals/sources"] });
    },
    onError: (err: any) => toast({ title: ru ? "Ошибка" : "Error", description: err.message, variant: "destructive" }),
  });

  const pauseJobMutation = useMutation({
    mutationFn: async ({ jobName, isPaused }: { jobName: string; isPaused: boolean }) => {
      return apiRequest(`/api/admin/signals/cron-jobs/${jobName}/pause`, { method: "POST", body: JSON.stringify({ isPaused }) });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/signals/cron-jobs"] }),
    onError: (err: any) => toast({ title: ru ? "Ошибка" : "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="container max-w-6xl mx-auto py-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold flex items-center gap-2" data-testid="text-signals-title">
          <Activity className="h-6 w-6" />
          {ru ? "Сигналы и расписания" : "Signals & Scheduling"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {ru
            ? "Состояние всех источников сигналов и фоновых задач. Включайте/отключайте источники и запускайте их вручную."
            : "Status of every signal source and background job. Pause sources or trigger a manual run."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle data-testid="text-sources-section">{ru ? "Источники сигналов" : "Signal sources"}</CardTitle>
        </CardHeader>
        <CardContent>
          {sourcesLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              {ru ? "Загрузка…" : "Loading…"}
            </div>
          ) : sources.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4" data-testid="text-no-sources">
              {ru
                ? "Источники появятся здесь по мере того, как команды будут регистрировать их в server/signals/sources."
                : "Sources will appear here as feature teams register them in server/signals/sources."}
            </div>
          ) : (
            <div className="space-y-6">
              {Array.from(
                sources.reduce((map, s) => {
                  if (!map.has(s.category)) map.set(s.category, []);
                  map.get(s.category)!.push(s);
                  return map;
                }, new Map<string, SignalSource[]>()).entries(),
              ).map(([category, categorySources]) => (
                <div key={category} className="space-y-2" data-testid={`group-category-${category}`}>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {category}
                  </h3>
                  <div className="space-y-3">
              {categorySources.map((s) => {
                const status = STATUS_VARIANTS[s.status] ?? STATUS_VARIANTS.idle;
                return (
                  <div
                    key={s.id}
                    className="flex items-start justify-between gap-4 p-3 border rounded-md"
                    data-testid={`row-source-${s.sourceKey}`}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium" data-testid={`text-source-name-${s.sourceKey}`}>{s.displayName}</span>
                        <Badge variant="outline" className="text-xs">{s.category}</Badge>
                        <Badge className={`text-xs ${status.cls}`} data-testid={`badge-source-status-${s.sourceKey}`}>
                          {status.label[ru ? "ru" : "en"]}
                        </Badge>
                        {s.requiresCredentials && (
                          <Badge variant="outline" className="text-xs">{s.credentialKind ?? "credentials"}</Badge>
                        )}
                      </div>
                      {s.description && <p className="text-sm text-muted-foreground">{s.description}</p>}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {ru ? "Последний запуск:" : "Last run:"} {formatTime(s.lastRunAt, ru)}
                        </span>
                        {s.lastError && (
                          <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                            <AlertCircle className="h-3 w-3" />
                            {s.lastError.slice(0, 80)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">{ru ? "Активен" : "Enabled"}</span>
                        <Switch
                          checked={!s.isPaused}
                          onCheckedChange={(checked) =>
                            pauseSourceMutation.mutate({ sourceKey: s.sourceKey, isPaused: !checked })
                          }
                          data-testid={`switch-source-${s.sourceKey}`}
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => runSourceMutation.mutate(s.sourceKey)}
                        disabled={runSourceMutation.isPending}
                        data-testid={`button-run-source-${s.sourceKey}`}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        {ru ? "Запустить" : "Run"}
                      </Button>
                    </div>
                  </div>
                );
              })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle data-testid="text-cron-section">{ru ? "Расписания (cron)" : "Cron jobs"}</CardTitle>
        </CardHeader>
        <CardContent>
          {jobsLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              {ru ? "Загрузка…" : "Loading…"}
            </div>
          ) : cronJobsData.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4">
              {ru ? "Нет настроенных задач." : "No cron jobs configured."}
            </div>
          ) : (
            <div className="space-y-3">
              {cronJobsData.map((job) => (
                <div
                  key={job.id}
                  className="flex items-start justify-between gap-4 p-3 border rounded-md"
                  data-testid={`row-cron-${job.jobName}`}
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium font-mono text-sm" data-testid={`text-cron-name-${job.jobName}`}>{job.jobName}</span>
                      <Badge variant="outline" className="text-xs font-mono">{job.schedule}</Badge>
                      {job.isHeavy && <Badge variant="outline" className="text-xs">{ru ? "тяжёлый" : "heavy"}</Badge>}
                      {job.lastStatus && (
                        <Badge className={`text-xs ${job.lastStatus === "ok" ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" : job.lastStatus === "error" ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" : "bg-muted text-muted-foreground"}`}>
                          {job.lastStatus}
                        </Badge>
                      )}
                    </div>
                    {job.description && <p className="text-sm text-muted-foreground">{job.description}</p>}
                    <div className="text-xs text-muted-foreground">
                      {ru ? "Последний запуск:" : "Last run:"} {formatTime(job.lastRunAt, ru)}
                      {job.lastError && <span className="text-red-600 dark:text-red-400 ml-2">• {job.lastError.slice(0, 80)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs shrink-0">
                    <span className="text-muted-foreground">{ru ? "Активен" : "Enabled"}</span>
                    <Switch
                      checked={!job.isPaused}
                      onCheckedChange={(checked) => pauseJobMutation.mutate({ jobName: job.jobName, isPaused: !checked })}
                      data-testid={`switch-cron-${job.jobName}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
