import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Banknote,
  ListChecks,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocation } from "wouter";
import { VitalitySparkline, useSelectedPresetId } from "@/components/vitality-score";
import type { FounderPulse, VitalityScore as VitalityScoreRow } from "@shared/schema";

interface Props {
  startupId: string;
}

interface VitalityResp {
  current: { score: number | null } | null;
  history: VitalityScoreRow[];
}

interface VerifiedMrr {
  mrrMinor: number;
  currency: string;
  isVerified: boolean;
  sourceLabel?: string;
  capturedAt?: string;
}

interface FinAnalytics {
  mrr?: { current?: number | null; momPct?: number | null } | null;
}

type MilestoneRow = { id: string; reviewStatus?: string | null };
type MilestonesResp = MilestoneRow[] | { milestones?: MilestoneRow[] };

function fmtMoney(minor: number, currency: string, language: string) {
  const major = (minor ?? 0) / 100;
  try {
    return new Intl.NumberFormat(language === "ru" ? "ru-RU" : "en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0,
    }).format(major);
  } catch {
    return `${major.toFixed(0)} ${currency || ""}`.trim();
  }
}

function vitalityClasses(score: number | null) {
  if (score == null) return "text-muted-foreground";
  if (score >= 70) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 40) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function pulseConfig(status: string | undefined, ru: boolean) {
  if (status === "active")
    return {
      label: ru ? "Активный" : "Active",
      classes: "text-emerald-600 dark:text-emerald-400",
      dot: "bg-emerald-500",
    };
  if (status === "quiet")
    return {
      label: ru ? "Тихо" : "Quiet",
      classes: "text-amber-600 dark:text-amber-400",
      dot: "bg-amber-500",
    };
  return {
    label: ru ? "Молчит" : "Silent",
    classes: "text-muted-foreground",
    dot: "bg-muted-foreground",
  };
}

interface TileProps {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon: React.ReactNode;
  onClick?: () => void;
  loading?: boolean;
  testId: string;
}

function KpiTile({ label, value, hint, icon, onClick, loading, testId }: TileProps) {
  const Inner = (
    <CardContent className="p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
          {icon}
        </div>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-24" />
      ) : (
        <div className="text-3xl font-semibold leading-none" data-testid={`${testId}-value`}>
          {value}
        </div>
      )}
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </CardContent>
  );
  return (
    <Card
      className={
        onClick
          ? "hover-elevate active-elevate-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          : undefined
      }
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      aria-label={onClick ? label : undefined}
      data-testid={testId}
    >
      {Inner}
    </Card>
  );
}

export function FounderKpiRow({ startupId }: Props) {
  const { language } = useLanguage();
  const [, navigate] = useLocation();
  const ru = language === "ru";
  const [presetId] = useSelectedPresetId();

  const vitalityKey = presetId
    ? ["/api/startups", startupId, `vitality?presetId=${encodeURIComponent(presetId)}`]
    : ["/api/startups", startupId, "vitality"];

  const { data: vitality, isLoading: loadingVit } = useQuery<VitalityResp>({
    queryKey: vitalityKey,
    staleTime: 60_000,
  });

  const { data: pulse, isLoading: loadingPulse } = useQuery<FounderPulse>({
    queryKey: ["/api/startups", startupId, "founder-pulse"],
    staleTime: 60_000,
  });

  const { data: mrr, isLoading: loadingMrr } = useQuery<VerifiedMrr | null>({
    queryKey: ["/api/startups", startupId, "verified-mrr"],
    queryFn: async () => {
      const res = await fetch(`/api/startups/${startupId}/verified-mrr`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 60_000,
  });

  const { data: fin } = useQuery<FinAnalytics | null>({
    queryKey: ["/api/startups", startupId, "financials", "analytics"],
    queryFn: async () => {
      const res = await fetch(`/api/startups/${startupId}/financials/analytics`, {
        credentials: "include",
      });
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 60_000,
  });

  const { data: milestones, isLoading: loadingMs } = useQuery<MilestonesResp>({
    queryKey: ["/api/startups", startupId, "milestones"],
    staleTime: 60_000,
  });

  const score = vitality?.current?.score ?? null;
  const history = vitality?.history ?? [];
  const prevScore = history.length >= 2 ? history[history.length - 2].score : null;
  const delta = score != null && prevScore != null ? score - prevScore : null;

  const pulseCfg = pulseConfig(pulse?.status, ru);

  const mrrAmount =
    mrr && mrr.isVerified ? fmtMoney(mrr.mrrMinor, mrr.currency, language) : null;
  const momPct = fin?.mrr?.momPct ?? null;

  const milestoneList: MilestoneRow[] = Array.isArray(milestones)
    ? milestones
    : (milestones?.milestones ?? []);
  const pendingMs = milestoneList.filter((m) => m.reviewStatus === "pending_review").length;
  const totalMs = milestoneList.length;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="founder-kpi-row">
      <KpiTile
        testId="kpi-vitality"
        label={ru ? "Жизнеспособность" : "Vitality"}
        icon={<Activity className="h-4 w-4" />}
        loading={loadingVit}
        value={
          <span className={`tabular-nums ${vitalityClasses(score)}`}>
            {score ?? "—"}
            {score != null && <span className="ml-1 text-base text-muted-foreground">/100</span>}
          </span>
        }
        hint={
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1">
              {delta != null && delta !== 0 && (
                <>
                  {delta > 0 ? (
                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <span>
                    {delta > 0 ? "+" : ""}
                    {delta} {ru ? "vs прошл." : "vs prev"}
                  </span>
                </>
              )}
              {delta == null && <span>{ru ? "первая точка" : "first datapoint"}</span>}
            </span>
            {history.length > 1 && (
              <VitalitySparkline history={history} height={20} />
            )}
          </div>
        }
      />

      <KpiTile
        testId="kpi-mrr"
        label={ru ? "MRR (подтверждён)" : "MRR (verified)"}
        icon={<Banknote className="h-4 w-4" />}
        loading={loadingMrr}
        value={
          mrrAmount ? (
            <span className="tabular-nums">{mrrAmount}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )
        }
        hint={
          mrrAmount ? (
            momPct != null ? (
              <span
                className={`flex items-center gap-1 ${
                  momPct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                }`}
              >
                {momPct >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {momPct >= 0 ? "+" : ""}
                {momPct.toFixed(1)}% {ru ? "MoM" : "MoM"}
              </span>
            ) : (
              <span>{mrr?.sourceLabel ?? (ru ? "Подтверждено" : "Verified")}</span>
            )
          ) : (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-primary hover:underline"
              onClick={() => navigate(`/startups/${startupId}/integrations`)}
              data-testid="kpi-mrr-connect"
            >
              {ru ? "Подключите банк / эквайринг" : "Connect a bank / acquirer"}
              <ArrowRight className="h-3 w-3" />
            </button>
          )
        }
        onClick={() => navigate(`/startups/${startupId}/integrations`)}
      />

      <KpiTile
        testId="kpi-pulse"
        label={ru ? "Пульс фаундера" : "Founder pulse"}
        icon={<Sparkles className="h-4 w-4" />}
        loading={loadingPulse}
        value={
          <span className={`flex items-center gap-2 ${pulseCfg.classes}`}>
            <span className={`h-2.5 w-2.5 rounded-full ${pulseCfg.dot}`} aria-hidden />
            <span className="text-xl font-semibold">{pulseCfg.label}</span>
          </span>
        }
        hint={
          pulse ? (
            <span>
              {pulse.eventsLast21Days ?? 0} {ru ? "событий за 21 день" : "events in 21d"}
              {pulse.lastActivityAt && (
                <>
                  {" · "}
                  {ru ? "посл. " : "last "}
                  {new Date(pulse.lastActivityAt).toLocaleDateString(ru ? "ru-RU" : "en-US")}
                </>
              )}
            </span>
          ) : (
            <span>{ru ? "ждём первое событие" : "waiting for first signal"}</span>
          )
        }
      />

      <KpiTile
        testId="kpi-milestones"
        label={ru ? "Майлстоуны" : "Milestones"}
        icon={<ListChecks className="h-4 w-4" />}
        loading={loadingMs}
        value={
          <span className="tabular-nums">
            {totalMs}
            {pendingMs > 0 && (
              <span className="ml-2 text-base font-normal text-amber-600 dark:text-amber-400">
                · {pendingMs} {ru ? "на ревью" : "to review"}
              </span>
            )}
          </span>
        }
        hint={
          totalMs === 0
            ? ru
              ? "Майлстоуны автоматически появляются по событиям"
              : "Milestones auto-extract from your events"
            : ru
              ? "Прокрутите ниже к таймлайну"
              : "Scroll to timeline below"
        }
      />
    </div>
  );
}
