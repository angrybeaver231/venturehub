import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, RefreshCw, Download } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis, Legend, LineChart, Line } from "recharts";
import { scoreColor } from "@/components/vitality-score";

type Activity = { count: number; percent: number | null };
type Cohort = {
  cohort: string;
  startups: number;
  averageScore: number | null;
  activeLast30Days: Activity;
  activeLast90Days: Activity;
  activeLast180Days: Activity;
};

export default function AdminCohortAnalyticsPage() {
  const { language } = useLanguage();
  const ru = language === "ru";
  const { toast } = useToast();

  const { data, isLoading } = useQuery<{
    cohorts: Cohort[];
    totalStartups: number;
    totalScored: number;
    survival?: {
      silenceDays: number;
      bucketDays: number;
      horizonDays: number;
      buckets: Array<{ tDays: number; atRisk: number; events: number; censored: number; survival: number }>;
    };
  }>({
    queryKey: ["/api/admin/cohort-analytics"],
  });

  const recomputeAll = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/api/admin/vitality/recompute-all", { method: "POST" });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: ru ? "Пересчёт запущен" : "Recompute started" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cohort-analytics"] });
    },
    onError: (e: any) => toast({ title: ru ? "Ошибка" : "Error", description: e.message, variant: "destructive" }),
  });

  const chartData = (data?.cohorts ?? []).map((c) => ({
    cohort: c.cohort,
    active30: c.activeLast30Days.percent ?? 0,
    active90: c.activeLast90Days.percent ?? 0,
    active180: c.activeLast180Days.percent ?? 0,
  }));

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="text-cohort-title">
            <Activity className="h-7 w-7" />
            {ru ? "Когортная аналитика витальности" : "Cohort vitality analytics"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {ru
              ? "Группировка стартапов по кварталу основания. Удержание считается по последней активности (сигнальные события за 30 / 90 / 180 дней)."
              : "Startups grouped by founding quarter. Retention is measured by recent activity windows of 30 / 90 / 180 days."}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => { window.open("/api/admin/cohort-analytics/lp-export.pdf", "_blank"); }}
            data-testid="button-lp-export"
          >
            <Download className="h-4 w-4 mr-2" />
            {ru ? "Скачать LP-отчёт" : "Download LP report"}
          </Button>
          <Button onClick={() => recomputeAll.mutate()} disabled={recomputeAll.isPending} data-testid="button-recompute-all">
            <RefreshCw className={`h-4 w-4 mr-2 ${recomputeAll.isPending ? "animate-spin" : ""}`} />
            {ru ? "Пересчитать всё" : "Recompute all"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{ru ? "Стартапов всего" : "Total startups"}</CardTitle>
              </CardHeader>
              <CardContent><div className="text-2xl font-bold" data-testid="stat-total-startups">{data?.totalStartups ?? 0}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{ru ? "С оценкой" : "With score"}</CardTitle>
              </CardHeader>
              <CardContent><div className="text-2xl font-bold" data-testid="stat-total-scored">{data?.totalScored ?? 0}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{ru ? "Когорт" : "Cohorts"}</CardTitle>
              </CardHeader>
              <CardContent><div className="text-2xl font-bold" data-testid="stat-cohort-count">{data?.cohorts.length ?? 0}</div></CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{ru ? "Активность по когортам (%)" : "Cohort activity (%)"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72 w-full" data-testid="chart-cohort-activity">
                <ResponsiveContainer>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="cohort" fontSize={12} />
                    <YAxis fontSize={12} domain={[0, 100]} />
                    <RTooltip formatter={(v: any) => `${v}%`} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="active30" name={ru ? "Активные 30д" : "Active 30d"} fill="hsl(142 76% 45%)" />
                    <Bar dataKey="active90" name={ru ? "Активные 90д" : "Active 90d"} fill="hsl(38 92% 50%)" />
                    <Bar dataKey="active180" name={ru ? "Активные 180д" : "Active 180d"} fill="hsl(262 70% 55%)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {data?.survival && data.survival.buckets.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {ru ? "Кривая выживаемости (Каплан–Мейер)" : "Kaplan–Meier survival curve"}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {ru
                    ? `«Смерть» = тишина более ${data.survival.silenceDays} дней. Кривая показывает долю стартапов, остающихся «живыми» по сигналам платформы.`
                    : `"Death" = silent for more than ${data.survival.silenceDays} days. The curve shows the share of startups still active based on platform signals.`}
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-72 w-full" data-testid="chart-km-survival">
                  <ResponsiveContainer>
                    <LineChart data={data.survival.buckets.map((b) => ({
                      tDays: b.tDays,
                      survivalPct: Math.round(b.survival * 100),
                      atRisk: b.atRisk,
                      events: b.events,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="tDays" fontSize={12} label={{ value: ru ? "Дни" : "Days", position: "insideBottom", offset: -4, fontSize: 11 }} />
                      <YAxis fontSize={12} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                      <RTooltip formatter={(v: any, name: string) => name === "survivalPct" ? `${v}%` : v} labelFormatter={(l: any) => `${ru ? "День" : "Day"} ${l}`} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="survivalPct" name={ru ? "Выживаемость S(t)" : "Survival S(t)"} stroke="hsl(262 70% 55%)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="overflow-x-auto mt-4">
                  <table className="w-full text-xs" data-testid="table-km-survival">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-1 pr-3">{ru ? "День" : "Day"}</th>
                        <th className="py-1 pr-3">S(t)</th>
                        <th className="py-1 pr-3">{ru ? "В группе риска" : "At risk"}</th>
                        <th className="py-1 pr-3">{ru ? "События" : "Events"}</th>
                        <th className="py-1 pr-3">{ru ? "Цензурировано" : "Censored"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.survival.buckets.map((b) => (
                        <tr key={b.tDays} className="border-b" data-testid={`row-km-${b.tDays}`}>
                          <td className="py-1 pr-3">{b.tDays}</td>
                          <td className="py-1 pr-3 font-medium">{Math.round(b.survival * 100)}%</td>
                          <td className="py-1 pr-3">{b.atRisk}</td>
                          <td className="py-1 pr-3">{b.events}</td>
                          <td className="py-1 pr-3">{b.censored}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{ru ? "Подробности когорт" : "Cohort breakdown"}</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-cohorts">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">{ru ? "Когорта" : "Cohort"}</th>
                    <th className="py-2 pr-4">{ru ? "Стартапы" : "Startups"}</th>
                    <th className="py-2 pr-4">{ru ? "Средний балл" : "Avg score"}</th>
                    <th className="py-2 pr-4">{ru ? "Активные 30д" : "Active 30d"}</th>
                    <th className="py-2 pr-4">{ru ? "Активные 90д" : "Active 90d"}</th>
                    <th className="py-2 pr-4">{ru ? "Активные 180д" : "Active 180d"}</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.cohorts ?? []).map((c) => (
                    <tr key={c.cohort} className="border-b" data-testid={`row-cohort-${c.cohort}`}>
                      <td className="py-2 pr-4 font-medium">{c.cohort}</td>
                      <td className="py-2 pr-4">{c.startups}</td>
                      <td className="py-2 pr-4">
                        {c.averageScore != null ? (
                          <Badge variant="outline" className={scoreColor(c.averageScore)}>{c.averageScore}/100</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <ActivityCell a={c.activeLast30Days} total={c.startups} />
                      <ActivityCell a={c.activeLast90Days} total={c.startups} />
                      <ActivityCell a={c.activeLast180Days} total={c.startups} />
                    </tr>
                  ))}
                  {(data?.cohorts.length ?? 0) === 0 && (
                    <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">{ru ? "Нет данных" : "No data"}</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function ActivityCell({ a, total }: { a: Activity; total: number }) {
  if (a.percent == null) {
    return <td className="py-2 pr-4 text-muted-foreground">—</td>;
  }
  return (
    <td className="py-2 pr-4">
      <span className="font-medium">{a.percent}%</span>
      <span className="text-muted-foreground ml-1">({a.count}/{total})</span>
    </td>
  );
}
