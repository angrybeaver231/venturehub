import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { queryClient } from "@/lib/queryClient";
import { VITALITY_CATEGORIES, type VitalityCategory, type VitalityScore as VitalityScoreRow, type ScoreWeightPreset } from "@shared/schema";
import { Line, LineChart, ResponsiveContainer, YAxis, Tooltip as RTooltip } from "recharts";

const PRESET_STORAGE_KEY = "vitality-preset-id";

export function useSelectedPresetId(): [string | null, (id: string | null) => void] {
  const [presetId, setPresetId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(PRESET_STORAGE_KEY);
  });
  useEffect(() => {
    function onStorage(ev: StorageEvent) {
      if (ev.key === PRESET_STORAGE_KEY) setPresetId(ev.newValue);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  const update = (id: string | null) => {
    if (id) window.localStorage.setItem(PRESET_STORAGE_KEY, id);
    else window.localStorage.removeItem(PRESET_STORAGE_KEY);
    setPresetId(id);
    // Notify other instances in the same tab.
    window.dispatchEvent(new StorageEvent("storage", { key: PRESET_STORAGE_KEY, newValue: id }));
    queryClient.invalidateQueries({ queryKey: ["/api/startups"] });
  };
  return [presetId, update];
}

function PresetSwitcher({ startupId }: { startupId: string }) {
  const { language } = useLanguage();
  const ru = language === "ru";
  const { data: presets } = useQuery<ScoreWeightPreset[]>({ queryKey: ["/api/score-weight-presets"] });
  const [selected, setSelected] = useSelectedPresetId();
  if (!presets || presets.length === 0) return null;
  const fallback = presets.find((p) => p.isDefault)?.id ?? presets[0]?.id ?? "";
  return (
    <div className="pt-2 border-t space-y-1" data-testid={`vitality-preset-switcher-${startupId}`}>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{ru ? "Пресет весов" : "Weight preset"}</div>
      <Select value={selected ?? fallback} onValueChange={(v) => setSelected(v)}>
        <SelectTrigger className="h-8 text-xs" data-testid="select-vitality-preset"><SelectValue /></SelectTrigger>
        <SelectContent>
          {presets.map((p) => (
            <SelectItem key={p.id} value={p.id} data-testid={`option-preset-${p.id}`}>{p.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

type VitalityResponse = {
  current: VitalityScoreRow | null;
  history: VitalityScoreRow[];
  benchmarks: { vertical: string | null; percentile: number | null; subscorePercentiles: Record<string, number | null> } | null;
  weightsUsed: Record<string, number>;
};

export function scoreColor(score: number | null | undefined): string {
  if (score == null) return "bg-muted text-muted-foreground";
  if (score >= 75) return "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30";
  if (score >= 50) return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
  return "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30";
}

function categoryLabel(cat: VitalityCategory, ru: boolean): string {
  const en: Record<VitalityCategory, string> = {
    tech_activity: "Tech activity",
    team_health: "Team health",
    market_presence: "Market presence",
    financial_health: "Financial health",
    legal_hygiene: "Legal hygiene",
  };
  const ruMap: Record<VitalityCategory, string> = {
    tech_activity: "Технологическая активность",
    team_health: "Здоровье команды",
    market_presence: "Присутствие на рынке",
    financial_health: "Финансовое здоровье",
    legal_hygiene: "Юридическая гигиена",
  };
  return ru ? ruMap[cat] : en[cat];
}

export function VitalitySparkline({ history, height = 36 }: { history: VitalityScoreRow[]; height?: number }) {
  if (!history || history.length < 2) {
    return <div className="text-xs text-muted-foreground" data-testid="text-vitality-sparkline-empty">—</div>;
  }
  const data = history.map((h) => ({ score: h.score, date: h.computedAt }));
  return (
    <div style={{ width: 90, height }} data-testid="vitality-sparkline">
      <ResponsiveContainer>
        <LineChart data={data}>
          <YAxis hide domain={[0, 100]} />
          <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          <RTooltip
            cursor={false}
            contentStyle={{ fontSize: 12, padding: 4 }}
            formatter={(v: any) => [`${v}/100`, ""]}
            labelFormatter={() => ""}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function VitalityBreakdownContent({ data }: { data: VitalityResponse }) {
  const { language } = useLanguage();
  const ru = language === "ru";
  const subscores = (data.current?.subscores ?? {}) as Record<string, number>;
  const subPercentiles = data.benchmarks?.subscorePercentiles ?? {};
  return (
    <div className="space-y-3 w-72" data-testid="vitality-breakdown">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">{ru ? "Витальность" : "Vitality"}</div>
        <Badge variant="outline" className={scoreColor(data.current?.score)}>
          {data.current?.score ?? "—"}/100
        </Badge>
      </div>
      {data.benchmarks?.percentile != null && data.benchmarks.vertical && (
        <div className="text-xs text-muted-foreground" data-testid="text-vitality-benchmark">
          {ru ? "Перцентиль в категории" : "Percentile in vertical"} <span className="font-medium">{data.benchmarks.vertical}</span>: <span className="font-medium">{data.benchmarks.percentile}</span>
        </div>
      )}
      <div className="space-y-2">
        {VITALITY_CATEGORIES.map((cat) => {
          const v = subscores[cat] ?? 0;
          const p = subPercentiles[cat];
          return (
            <div key={cat} className="space-y-1" data-testid={`vitality-row-${cat}`}>
              <div className="flex items-center justify-between text-xs">
                <span>{categoryLabel(cat, ru)}</span>
                <span className="text-muted-foreground">
                  {v}{p != null ? <span className="ml-1">· p{p}</span> : null}
                </span>
              </div>
              <Progress value={v} className="h-1.5" />
            </div>
          );
        })}
      </div>
      {data.history.length >= 2 && (
        <div className="pt-2 border-t">
          <div className="text-xs text-muted-foreground mb-1">{ru ? "История (12 мес.)" : "History (12 months)"}</div>
          <VitalitySparkline history={data.history} height={48} />
        </div>
      )}
      <PresetSwitcher startupId={data.current?.startupId ?? ""} />
      <div className="text-[10px] text-muted-foreground pt-1 border-t">
        {ru
          ? "Показатель агрегирует сигналы и затухает со временем. 50% веса теряется за 90 дней."
          : "Score aggregates platform signals with time decay. 50% weight lost after 90 days."}
      </div>
    </div>
  );
}

export function VitalityScore({
  startupId,
  size = "default",
  presetId,
  showSparkline = false,
}: {
  startupId: string;
  size?: "sm" | "default" | "lg";
  presetId?: string | null;
  showSparkline?: boolean;
}) {
  const { language } = useLanguage();
  const ru = language === "ru";
  const [globalPresetId] = useSelectedPresetId();
  const effectivePresetId = presetId ?? globalPresetId ?? null;
  const { data, isLoading } = useQuery<VitalityResponse>({
    queryKey: effectivePresetId
      ? ["/api/startups", startupId, `vitality?presetId=${encodeURIComponent(effectivePresetId)}`]
      : ["/api/startups", startupId, "vitality"],
    staleTime: 60_000,
  });

  if (isLoading) {
    return <Skeleton className={size === "lg" ? "h-9 w-24" : "h-6 w-16"} data-testid={`vitality-skeleton-${startupId}`} />;
  }

  const score = data?.current?.score ?? null;

  const trigger = (
    <button
      type="button"
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium hover-elevate ${scoreColor(score)} ${size === "lg" ? "h-9 px-3 text-sm" : ""}`}
      data-testid={`vitality-score-${startupId}`}
      onClick={(e) => e.stopPropagation()}
    >
      <Activity className={size === "lg" ? "h-4 w-4" : "h-3 w-3"} />
      <span>{score ?? "—"}</span>
      {size !== "sm" && <span className="text-[10px] opacity-70">{ru ? "вит." : "vit."}</span>}
      {showSparkline && data && <span className="ml-1 hidden sm:inline-block"><VitalitySparkline history={data.history} height={20} /></span>}
    </button>
  );

  if (!data) return trigger;

  return (
    <Popover>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        {trigger}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto" onClick={(e) => e.stopPropagation()}>
        <VitalityBreakdownContent data={data} />
      </PopoverContent>
    </Popover>
  );
}
