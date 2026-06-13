import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Banknote,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  Activity,
  Info,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { FinancialAnalytics } from "@shared/schema";
import { formatMoney, VerifiedMrrBadge } from "./verified-mrr-badge";
import { FinancialChart } from "./financial-chart";
import type { StartupFinancial } from "@shared/schema";

function formatPct(v: number | null, language: string): string {
  if (v === null || Number.isNaN(v)) return "—";
  const ru = language === "ru";
  const sign = v > 0 ? "+" : "";
  const fixed = Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1);
  return `${sign}${fixed}${ru ? "%" : "%"}`;
}

function MetricTile({
  label,
  value,
  hint,
  trend,
  testid,
}: {
  label: string;
  value: string;
  hint?: string;
  trend?: "up" | "down" | "flat" | null;
  testid: string;
}) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : null;
  const trendColor =
    trend === "up"
      ? "text-emerald-600 dark:text-emerald-400"
      : trend === "down"
        ? "text-red-600 dark:text-red-400"
        : "text-muted-foreground";
  return (
    <div className="rounded-md border p-3 space-y-1" data-testid={testid}>
      <div className="text-xs text-muted-foreground flex items-center gap-1">
        {label}
        {hint && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3 cursor-help opacity-60" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">{hint}</TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className={`text-lg font-semibold flex items-center gap-1 ${TrendIcon ? trendColor : ""}`}>
        {TrendIcon && <TrendIcon className="h-4 w-4" />}
        <span>{value}</span>
      </div>
    </div>
  );
}

export function FinancialStoryCard({ startupId }: { startupId: string }) {
  const { language } = useLanguage();
  const ru = language === "ru";

  const { data, isLoading } = useQuery<FinancialAnalytics>({
    queryKey: ["/api/startups", startupId, "financials", "analytics"],
    queryFn: async () => {
      const res = await fetch(`/api/startups/${startupId}/financials/analytics`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <Card data-testid="card-financial-story-loading">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            {ru ? "Финансовая история" : "Financial story"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 animate-pulse bg-muted/40 rounded-md" />
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.current) {
    return (
      <Card data-testid="card-financial-story-empty">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            {ru ? "Финансовая история" : "Financial story"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground" data-testid="text-financial-story-empty">
            {ru
              ? "Пока нет финансовых данных. Подключите банк / эквайринг / подписки на странице финансовых интеграций, чтобы появились метрики."
              : "No financial data yet. Connect a bank / acquirer / subscription provider on the financial integrations page to populate these metrics."}
          </p>
        </CardContent>
      </Card>
    );
  }

  const cur = data.current;
  const trendNetNew =
    data.netNewMrrMinor === null
      ? null
      : data.netNewMrrMinor > 0
        ? "up"
        : data.netNewMrrMinor < 0
          ? "down"
          : "flat";
  const trendGrowth =
    data.growthRatePct === null
      ? null
      : data.growthRatePct > 0
        ? "up"
        : data.growthRatePct < 0
          ? "down"
          : "flat";

  const seriesForChart: StartupFinancial[] = data.series.map((p) => ({
    id: p.date,
    startupId,
    sourceKey: "fin-aggregate",
    snapshotDate: p.date,
    mrrMinor: p.mrrMinor,
    revenueMinor: p.revenueMinor,
    arrMinor: p.mrrMinor * 12,
    revenueLast30dMinor: p.revenueMinor,
    burnLast30dMinor: 0,
    runwayMonths: null,
    currency: data.currency,
    activeCustomers: null,
    payload: null,
    capturedAt: new Date(p.date) as unknown as Date,
  }));

  return (
    <Card data-testid="card-financial-story">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 flex-wrap">
          <span className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            {ru ? "Финансовая история" : "Financial story"}
          </span>
          <span className="flex items-center gap-2">
            <VerifiedMrrBadge startupId={startupId} />
            {!data.isVerified && data.hasLiveConnector && (
              <Badge variant="outline" className="text-xs" data-testid="badge-financial-pending">
                {ru ? "Ожидание данных" : "Awaiting data"}
              </Badge>
            )}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          <MetricTile
            testid="tile-mrr"
            label="MRR"
            value={formatMoney(cur.mrrMinor, data.currency, language)}
          />
          <MetricTile
            testid="tile-arr"
            label="ARR"
            value={formatMoney(cur.arrMinor, data.currency, language)}
          />
          <MetricTile
            testid="tile-net-new-mrr"
            label={ru ? "Чистый прирост MRR (30д)" : "Net new MRR (30d)"}
            value={
              data.netNewMrrMinor === null
                ? "—"
                : `${data.netNewMrrMinor >= 0 ? "+" : "−"}${formatMoney(Math.abs(data.netNewMrrMinor), data.currency, language)}`
            }
            trend={trendNetNew}
            hint={
              ru
                ? "Разница между текущим MRR и MRR 30 дней назад."
                : "Difference between current MRR and MRR 30 days ago."
            }
          />
          <MetricTile
            testid="tile-growth"
            label={ru ? "Рост MoM" : "MoM growth"}
            value={formatPct(data.growthRatePct, language)}
            trend={trendGrowth}
          />
          <MetricTile
            testid="tile-churn"
            label={ru ? "Отток (оценка, 30д)" : "Churn (est, 30d)"}
            value={formatPct(data.churnRatePct, language)}
            hint={
              ru
                ? "Оценка по сумме отрицательных дневных изменений MRR за 30 дней. Без когорт показывает направление, а не точное значение."
                : "Estimated from the sum of negative daily MRR moves over 30 days. Without cohort data this signals direction, not exact value."
            }
          />
          <MetricTile
            testid="tile-gross-retention"
            label={ru ? "Валовое удержание" : "Gross retention"}
            value={formatPct(data.grossRetentionPct, language)}
          />
          <MetricTile
            testid="tile-net-retention"
            label={ru ? "Чистое удержание" : "Net retention"}
            value={formatPct(data.netRetentionPct, language)}
            hint={
              ru
                ? "Текущий MRR ÷ MRR 30 дней назад × 100%."
                : "Current MRR ÷ MRR 30 days ago × 100%."
            }
          />
          <MetricTile
            testid="tile-runway"
            label={ru ? "Запас по runway" : "Runway"}
            value={
              cur.runwayMonths !== null
                ? `${cur.runwayMonths} ${ru ? "мес" : "mo"}`
                : "—"
            }
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
            {ru ? "Выручка (30д):" : "Revenue (30d):"}{" "}
            <span className="font-medium text-foreground" data-testid="text-revenue-30d">
              {formatMoney(cur.revenue30dMinor, data.currency, language)}
            </span>
          </span>
          {cur.burn30dMinor > 0 && (
            <span className="flex items-center gap-1">
              <TrendingDown className="h-3 w-3" />
              {ru ? "Расход (30д):" : "Burn (30d):"}{" "}
              <span className="font-medium text-foreground" data-testid="text-burn-30d">
                {formatMoney(cur.burn30dMinor, data.currency, language)}
              </span>
            </span>
          )}
          {cur.activeCustomers !== null && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {ru ? "Активных клиентов:" : "Active customers:"}{" "}
              <span className="font-medium text-foreground" data-testid="text-active-customers">
                {cur.activeCustomers}
              </span>
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {ru ? "Источник:" : "Source:"} {cur.sourceLabel}
          </span>
        </div>

        <FinancialChart data={seriesForChart} />

        <CohortRetentionBars startupId={startupId} />

        {data.perSource.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">
              {ru ? "Разбивка по источникам" : "Per-source breakdown"}
            </h4>
            <div className="space-y-1">
              {data.perSource.map((s) => {
                const totalMrr = data.perSource.reduce((a, b) => a + b.mrrMinor, 0);
                const pct = totalMrr > 0 ? (s.mrrMinor / totalMrr) * 100 : 0;
                return (
                  <div
                    key={s.sourceKey}
                    className="rounded-md border p-2"
                    data-testid={`row-per-source-${s.sourceKey}`}
                  >
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-medium">{s.sourceLabel}</span>
                      <span className="text-muted-foreground text-xs">
                        MRR{" "}
                        <span className="text-foreground font-medium">
                          {formatMoney(s.mrrMinor, data.currency, language)}
                        </span>
                        {" · "}
                        {ru ? "выручка 30д" : "rev 30d"}{" "}
                        <span className="text-foreground font-medium">
                          {formatMoney(s.revenue30dMinor, data.currency, language)}
                        </span>
                      </span>
                    </div>
                    <div className="h-1.5 mt-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${Math.min(100, Math.max(2, pct))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type CohortBucket = {
  month: string;
  mrrMinor: number;
  customers: number;
  activeCustomers: number;
  retentionPct: number;
};

type CohortResponse = {
  cohorts: CohortBucket[];
  lastEventAt: string | null;
  lastProvider: string | null;
  totalCustomers: number;
  currency: string;
};

function CohortRetentionBars({ startupId }: { startupId: string }) {
  const { language } = useLanguage();
  const ru = language === "ru";
  const { data } = useQuery<CohortResponse>({
    queryKey: ["/api/startups", startupId, "financials", "cohorts"],
    queryFn: async () => {
      const res = await fetch(`/api/startups/${startupId}/financials/cohorts`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
  });
  if (!data || !Array.isArray(data.cohorts) || data.cohorts.length === 0) return null;
  const cohorts = data.cohorts.slice(-12);
  return (
    <div className="space-y-2" data-testid="cohort-retention-chart">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h4 className="text-sm font-semibold">
          {ru ? "Удержание по когортам (по месяцу регистрации)" : "Cohort retention (by signup month)"}
        </h4>
        <span className="text-xs text-muted-foreground">
          {ru ? "Источник:" : "Source:"} {data.lastProvider ?? "—"}
        </span>
      </div>
      <div className="grid grid-cols-6 sm:grid-cols-12 gap-1 items-end h-20">
        {cohorts.map((c) => {
          const pct = Math.max(2, Math.min(100, c.retentionPct));
          return (
            <div
              key={c.month}
              className="flex flex-col items-center gap-1"
              data-testid={`cohort-bar-${c.month}`}
            >
              <div className="w-full flex-1 flex items-end">
                <div
                  className="w-full bg-primary/80 rounded-sm"
                  style={{ height: `${pct}%` }}
                  title={`${c.month}: ${c.activeCustomers}/${c.customers} (${c.retentionPct.toFixed(0)}%)`}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">{c.month.slice(2)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Compact one-line financial summary for match rows on investor-detail and
 * thesis-match. Renders nothing when there's no current snapshot.
 */
export function FinancialMiniStats({ startupId }: { startupId: string }) {
  const { language } = useLanguage();
  const ru = language === "ru";
  const { data } = useQuery<FinancialAnalytics>({
    queryKey: ["/api/startups", startupId, "financials", "analytics"],
    queryFn: async () => {
      const res = await fetch(`/api/startups/${startupId}/financials/analytics`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
  });
  if (!data || !data.current) return null;
  const cur = data.current;
  const growth = data.growthRatePct;
  const churn = data.churnRatePct;
  return (
    <div
      className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground"
      data-testid={`mini-stats-${startupId}`}
    >
      <Badge variant="outline" className="text-xs" data-testid={`mini-mrr-${startupId}`}>
        MRR {formatMoney(cur.mrrMinor, data.currency, language)}
      </Badge>
      {growth !== null && (
        <Badge variant="outline" className="text-xs" data-testid={`mini-growth-${startupId}`}>
          {growth >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
          {formatPct(growth, language)} MoM
        </Badge>
      )}
      {churn !== null && churn > 0 && (
        <Badge variant="outline" className="text-xs" data-testid={`mini-churn-${startupId}`}>
          {ru ? "отток" : "churn"} {formatPct(churn, language)}
        </Badge>
      )}
      {cur.runwayMonths !== null && (
        <Badge variant="outline" className="text-xs" data-testid={`mini-runway-${startupId}`}>
          {ru ? "runway" : "runway"} {cur.runwayMonths}
          {ru ? "мес" : "mo"}
        </Badge>
      )}
    </div>
  );
}
