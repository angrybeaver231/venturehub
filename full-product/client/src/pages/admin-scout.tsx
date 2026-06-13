import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Play, Trash2, Plus, RefreshCw, Sparkles, Globe, Send, Github,
  Activity, Database, Users, ShieldOff, Flame, CheckCircle2, AlertCircle, Network,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { DonutStat } from "@/components/donut-stat";

type Overview = {
  raw_total?: number;
  raw_pending?: number;
  signals_total?: number;
  clusters_active?: number;
  clusters_lead?: number;
  clusters_promoted?: number;
  clusters_stale?: number;
  persons_total?: number;
  dnt_total?: number;
};

type Cluster = {
  id: string;
  canonicalName: string | null;
  domain: string | null;
  githubOrg: string | null;
  vertical: string | null;
  stage: string | null;
  signalCount: number;
  sourceDiversity: number;
  readinessScore: number;
  clusterHeat: number;
  clusterStatus: string;
  promotedStartupId: string | null;
  lastSignalAt: string;
  firstSignalAt: string;
};

type WhitelistEntry = {
  id: string;
  collector: string;
  sourceIdentifier: string;
  status: string;
  notes: string | null;
  createdAt: string;
};

const JOBS: { key: string; labelEn: string; labelRu: string; icon: any }[] = [
  { key: "classify", labelEn: "Classify", labelRu: "Классификация", icon: Activity },
  { key: "cluster", labelEn: "Cluster", labelRu: "Кластеризация", icon: Network },
  { key: "profile", labelEn: "Build profile", labelRu: "Профиль", icon: Users },
  { key: "score", labelEn: "Score", labelRu: "Скоринг", icon: Flame },
  { key: "stale", labelEn: "Stale-out", labelRu: "Устаревание", icon: AlertCircle },
  { key: "promotion", labelEn: "Promote", labelRu: "Промоушн", icon: CheckCircle2 },
  { key: "retention", labelEn: "Retention sweep", labelRu: "Очистка", icon: ShieldOff },
];

const STATUS_LABEL: Record<string, { en: string; ru: string }> = {
  active: { en: "Active", ru: "Активен" },
  promoted_lead: { en: "Lead", ru: "Лид" },
  promoted_startup: { en: "Promoted", ru: "Промоутирован" },
  stale: { en: "Stale", ru: "Устарел" },
};

export default function AdminScout() {
  const { language } = useLanguage();
  const ru = language === "ru";
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("active");

  const { data: overview, refetch: refetchOverview } = useQuery<Overview>({
    queryKey: ["/api/admin/scout/overview"],
  });

  const { data: clusters, isLoading: clustersLoading } = useQuery<Cluster[]>({
    queryKey: ["/api/admin/scout/clusters", statusFilter],
    queryFn: async () => {
      const r = await fetch(`/api/admin/scout/clusters?status=${statusFilter}&limit=100`, { credentials: "include" });
      if (!r.ok) throw new Error("failed");
      return r.json();
    },
  });

  const { data: whitelist } = useQuery<WhitelistEntry[]>({
    queryKey: ["/api/admin/scout/whitelist"],
  });

  const runJob = useMutation({
    mutationFn: async (job: string) => {
      const r = await apiRequest(`/api/admin/scout/run/${job}`, { method: "POST" });
      return r.json();
    },
    onSuccess: (data: any, job) => {
      toast({ title: ru ? "Готово" : "Done", description: `${job}: ${JSON.stringify(data?.result || {}).slice(0, 120)}` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/scout/overview"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/scout/clusters"] });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Error", description: err.message });
    },
  });

  const [wlCollector, setWlCollector] = useState("");
  const [wlSource, setWlSource] = useState("");
  const [wlNotes, setWlNotes] = useState("");
  const addWhitelist = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("/api/admin/scout/whitelist", {
        method: "POST",
        body: JSON.stringify({
          collector: wlCollector,
          sourceIdentifier: wlSource,
          notes: wlNotes,
        }),
      });
      return r.json();
    },
    onSuccess: () => {
      setWlCollector(""); setWlSource(""); setWlNotes("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/scout/whitelist"] });
      toast({ title: ru ? "Источник добавлен" : "Source added" });
    },
  });

  // ----- "Find startups now" dialog state + mutation -----
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [discVerticals, setDiscVerticals] = useState("fintech, edtech, saas");
  const [discRegion, setDiscRegion] = useState(ru ? "Россия / СНГ" : "Russia / CIS");
  const [discKeywords, setDiscKeywords] = useState("");
  const [discCount, setDiscCount] = useState(10);
  const [discOpenAi, setDiscOpenAi] = useState(true);
  const [discTelegram, setDiscTelegram] = useState(true);
  const [discGithub, setDiscGithub] = useState(true);

  const discover = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("/api/admin/scout/discover", {
        method: "POST",
        body: JSON.stringify({
          verticals: discVerticals.split(",").map((s) => s.trim()).filter(Boolean),
          region: discRegion || undefined,
          keywords: discKeywords || undefined,
          count: discCount,
          useOpenAi: discOpenAi,
          useTelegram: discTelegram,
          useGithub: discGithub,
        }),
      });
      return r.json();
    },
    onSuccess: (data: any) => {
      setDiscoverOpen(false);
      const sources = data?.sources || {};
      const obs = Object.values(sources).reduce((sum: number, s: any) => sum + Number(s?.observations || 0), 0);
      const sigs = data?.classify?.signals ?? 0;
      const created = data?.cluster?.created ?? 0;
      const folded = data?.cluster?.clustered ?? 0;
      toast({
        title: ru ? "Поиск завершён" : "Discovery complete",
        description: ru
          ? `Наблюдений: ${obs} · сигналов: ${sigs} · новых кластеров: ${created} · добавлено в существующие: ${folded}`
          : `Observations: ${obs} · signals: ${sigs} · new clusters: ${created} · folded: ${folded}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/scout/overview"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/scout/clusters"] });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: ru ? "Ошибка" : "Error", description: err.message });
    },
  });

  const removeWhitelist = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/api/admin/scout/whitelist/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/scout/whitelist"] });
    },
  });

  // Derive percents for the donut tiles. Each ring shows that pipeline stage
  // as a share of the total raw observations — this is just a visual cue.
  const total = Math.max(1, Number(overview?.raw_total) || 0);
  const pct = (n?: number) => Math.min(100, Math.round(((Number(n) || 0) / total) * 100));

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      {/* ----- Page header ----- */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">
            {ru ? "Pre-Revenue Discovery" : "Pre-Revenue Discovery"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {ru
              ? "Мониторинг сигналов, кластеризация прото-стартапов и продвижение в основной каталог."
              : "Signal monitoring, proto-startup clustering and promotion into the main catalog."}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Dialog open={discoverOpen} onOpenChange={setDiscoverOpen}>
            <DialogTrigger asChild>
              <Button size="default" data-testid="button-open-discover">
                <Sparkles className="w-4 h-4" />
                {ru ? "Найти стартапы сейчас" : "Find startups now"}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{ru ? "Активный поиск стартапов" : "Active startup discovery"}</DialogTitle>
                <DialogDescription>
                  {ru
                    ? "Движок параллельно запросит выбранные источники, классифицирует найденное и соберёт прото-стартапы."
                    : "The engine queries the selected sources in parallel, classifies what it finds, and builds proto-startups."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="disc-verticals">{ru ? "Вертикали (через запятую)" : "Verticals (comma-separated)"}</Label>
                  <Input id="disc-verticals" value={discVerticals} onChange={(e) => setDiscVerticals(e.target.value)} data-testid="input-disc-verticals" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="disc-region">{ru ? "Регион" : "Region"}</Label>
                    <Input id="disc-region" value={discRegion} onChange={(e) => setDiscRegion(e.target.value)} data-testid="input-disc-region" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="disc-count">{ru ? "Сколько искать" : "How many"}</Label>
                    <Input id="disc-count" type="number" min={3} max={25} value={discCount}
                      onChange={(e) => setDiscCount(Math.max(3, Math.min(25, Number(e.target.value) || 10)))}
                      data-testid="input-disc-count" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="disc-keywords">{ru ? "Дополнительные ключевые слова (опц.)" : "Additional keywords (optional)"}</Label>
                  <Input id="disc-keywords" placeholder={ru ? "напр. B2B, AI, MVP" : "e.g. B2B, AI, MVP"}
                    value={discKeywords} onChange={(e) => setDiscKeywords(e.target.value)} data-testid="input-disc-keywords" />
                </div>
                <div className="space-y-2.5 rounded-md border bg-muted/30 p-3">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {ru ? "Источники" : "Sources"}
                  </div>
                  <SourceToggle
                    icon={<Globe className="w-4 h-4" />}
                    label={ru ? "OpenAI · поиск по открытому вебу" : "OpenAI · open-web search"}
                    sub={ru ? "Новости, vc.ru, ProductHunt, Indie Hackers" : "News, ProductHunt, Indie Hackers, etc."}
                    checked={discOpenAi} onCheckedChange={setDiscOpenAi} testId="switch-disc-openai"
                  />
                  <SourceToggle
                    icon={<Send className="w-4 h-4" />}
                    label={ru ? "Публичные Telegram-каналы" : "Public Telegram channels"}
                    sub={ru ? "Только из белого списка" : "Whitelisted channels only"}
                    checked={discTelegram} onCheckedChange={setDiscTelegram} testId="switch-disc-telegram"
                  />
                  <SourceToggle
                    icon={<Github className="w-4 h-4" />}
                    label={ru ? "GitHub trending" : "GitHub trending"}
                    sub={ru ? "Свежие репозитории по выбранным вертикалям" : "Fresh repos under the selected verticals"}
                    checked={discGithub} onCheckedChange={setDiscGithub} testId="switch-disc-github"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {ru
                    ? "LinkedIn / Twitter / WhoisXML появятся после подключения соответствующих ключей (Sprint 3+ по спецификации)."
                    : "LinkedIn / Twitter / WhoisXML will be added once their API keys are connected (Sprint 3+ in the spec)."}
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDiscoverOpen(false)} data-testid="button-disc-cancel">
                  {ru ? "Отмена" : "Cancel"}
                </Button>
                <Button onClick={() => discover.mutate()} disabled={discover.isPending || (!discOpenAi && !discTelegram && !discGithub)} data-testid="button-disc-run">
                  {discover.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {ru ? "Запустить" : "Run"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="default" onClick={() => refetchOverview()} data-testid="button-refresh-overview">
            <RefreshCw className="w-4 h-4" /> {ru ? "Обновить" : "Refresh"}
          </Button>
        </div>
      </div>

      {/* ----- Donut stat row (Figma "All Leaves / Annual / Casual / Sick" pattern) ----- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <DonutStat
          label={ru ? "Сырые наблюдения" : "Raw observations"}
          value={overview?.raw_total ?? 0}
          sub={`${overview?.raw_pending ?? 0} ${ru ? "ждут" : "pending"}`}
          percent={100}
          highlight
          testId="stat-raw"
        />
        <DonutStat
          label={ru ? "Активные кластеры" : "Active clusters"}
          value={overview?.clusters_active ?? 0}
          sub={ru ? "в работе" : "in pipeline"}
          percent={pct(overview?.clusters_active)}
          testId="stat-active"
        />
        <DonutStat
          label={ru ? "Лиды" : "Leads"}
          value={overview?.clusters_lead ?? 0}
          sub={ru ? "готовы к ревью" : "ready for review"}
          percent={pct(overview?.clusters_lead)}
          testId="stat-lead"
        />
        <DonutStat
          label={ru ? "Промоутировано" : "Promoted"}
          value={overview?.clusters_promoted ?? 0}
          sub={ru ? "в каталог" : "to catalog"}
          percent={pct(overview?.clusters_promoted)}
          testId="stat-promoted"
        />
      </div>

      {/* ----- Secondary stats (compact tile row) ----- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniStat icon={<Activity className="w-4 h-4" />} label={ru ? "Сигналы" : "Signals"} value={overview?.signals_total} testId="stat-signals" />
        <MiniStat icon={<Database className="w-4 h-4" />} label={ru ? "Устаревшие" : "Stale"} value={overview?.clusters_stale} testId="stat-stale" />
        <MiniStat icon={<Users className="w-4 h-4" />} label={ru ? "Личности" : "Persons"} value={overview?.persons_total} testId="stat-persons" />
        <MiniStat icon={<ShieldOff className="w-4 h-4" />} label={ru ? "Опт-аут" : "Do-not-track"} value={overview?.dnt_total} testId="stat-dnt" />
      </div>

      {/* ----- Tabs ----- */}
      <Tabs defaultValue="clusters" className="w-full">
        <TabsList>
          <TabsTrigger value="clusters" data-testid="tab-clusters">{ru ? "Кластеры" : "Clusters"}</TabsTrigger>
          <TabsTrigger value="jobs" data-testid="tab-jobs">{ru ? "Запуск задач" : "Run jobs"}</TabsTrigger>
          <TabsTrigger value="whitelist" data-testid="tab-whitelist">{ru ? "Белый список" : "Whitelist"}</TabsTrigger>
        </TabsList>

        {/* ===== Clusters ===== */}
        <TabsContent value="clusters" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-3">
              <CardTitle className="text-base">{ru ? "Прото-стартапы" : "Proto-startups"}</CardTitle>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]" data-testid="select-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{ru ? "Активные" : "Active"}</SelectItem>
                  <SelectItem value="promoted_lead">{ru ? "Лиды" : "Leads"}</SelectItem>
                  <SelectItem value="promoted_startup">{ru ? "Промоутированы" : "Promoted"}</SelectItem>
                  <SelectItem value="stale">{ru ? "Устаревшие" : "Stale"}</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="pt-0">
              {clustersLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              ) : !clusters?.length ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  {ru ? "Ничего не найдено" : "No clusters yet"}
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {clusters.map((c) => (
                    <ClusterCard key={c.id} cluster={c} ru={ru} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== Manual triggers ===== */}
        <TabsContent value="jobs" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{ru ? "Ручной запуск задач" : "Manual job triggers"}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {JOBS.map((j) => {
                const Icon = j.icon;
                const pending = runJob.isPending && runJob.variables === j.key;
                return (
                  <button
                    key={j.key}
                    onClick={() => runJob.mutate(j.key)}
                    disabled={runJob.isPending}
                    className="rounded-md border bg-card p-4 flex items-center gap-3 text-left hover-elevate active-elevate-2 disabled:opacity-50"
                    data-testid={`button-run-${j.key}`}
                  >
                    <div className="h-10 w-10 rounded-md bg-accent text-accent-foreground flex items-center justify-center shrink-0">
                      {pending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Icon className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{ru ? j.labelRu : j.labelEn}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Play className="w-3 h-3" /> {ru ? "Запустить сейчас" : "Run now"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== Whitelist ===== */}
        <TabsContent value="whitelist" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{ru ? "Добавить источник" : "Add source"}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-4">
              <Input placeholder={ru ? "Коллектор (e.g. tg-watcher)" : "Collector (e.g. tg-watcher)"} value={wlCollector} onChange={(e) => setWlCollector(e.target.value)} data-testid="input-collector" />
              <Input placeholder={ru ? "Идентификатор (chat/handle)" : "Identifier (chat/handle)"} value={wlSource} onChange={(e) => setWlSource(e.target.value)} data-testid="input-source" />
              <Textarea placeholder={ru ? "Заметки" : "Notes"} value={wlNotes} onChange={(e) => setWlNotes(e.target.value)} rows={1} className="resize-none" data-testid="input-notes" />
              <Button onClick={() => addWhitelist.mutate()} disabled={!wlCollector || !wlSource || addWhitelist.isPending} data-testid="button-add-whitelist">
                <Plus className="w-4 h-4" /> {ru ? "Добавить" : "Add"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{ru ? "Активные источники" : "Active sources"}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 divide-y divide-border">
              {whitelist?.length ? whitelist.map((w) => (
                <div key={w.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 flex-wrap" data-testid={`card-wl-${w.id}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-md bg-accent text-accent-foreground flex items-center justify-center shrink-0">
                      <Database className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm truncate">{w.sourceIdentifier}</span>
                        <PillBadge tone="muted">{w.collector}</PillBadge>
                        <PillBadge tone={w.status === "private-blocked" ? "danger" : "primary"}>{w.status}</PillBadge>
                      </div>
                      {w.notes && <div className="text-xs text-muted-foreground mt-1">{w.notes}</div>}
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => removeWhitelist.mutate(w.id)} data-testid={`button-remove-wl-${w.id}`}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )) : (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  {ru ? "Список пуст" : "Empty"}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SourceToggle({
  icon, label, sub, checked, onCheckedChange, testId,
}: {
  icon: React.ReactNode; label: string; sub?: string;
  checked: boolean; onCheckedChange: (v: boolean) => void; testId: string;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-md p-2 hover-elevate cursor-pointer">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-8 w-8 rounded-md bg-accent text-accent-foreground flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{label}</div>
          {sub && <div className="text-[11px] text-muted-foreground truncate">{sub}</div>}
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} data-testid={testId} />
    </label>
  );
}

function MiniStat({ icon, label, value, testId }: { icon: React.ReactNode; label: string; value?: number; testId: string }) {
  return (
    <div className="rounded-md border bg-card p-4 flex items-center gap-3" data-testid={testId}>
      <div className="h-10 w-10 rounded-md bg-accent text-accent-foreground flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-xl font-semibold tabular-nums">{value ?? 0}</div>
      </div>
    </div>
  );
}

function PillBadge({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "primary" | "muted" | "danger";
}) {
  const cls =
    tone === "primary"
      ? "bg-accent text-accent-foreground border-accent-border"
      : tone === "danger"
      ? "bg-destructive/10 text-destructive border-destructive/30"
      : "bg-muted text-muted-foreground border-muted-border";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${cls}`}>
      {children}
    </span>
  );
}

function ClusterCard({ cluster: c, ru }: { cluster: Cluster; ru: boolean }) {
  const status = STATUS_LABEL[c.clusterStatus] ?? { en: c.clusterStatus, ru: c.clusterStatus };
  const initials = (c.canonicalName || c.domain || c.githubOrg || "??")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="rounded-md border bg-card p-4 hover-elevate" data-testid={`card-cluster-${c.id}`}>
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-md bg-accent text-accent-foreground flex items-center justify-center shrink-0 font-semibold">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium truncate" data-testid={`text-cluster-name-${c.id}`}>
              {c.canonicalName || c.domain || c.githubOrg || c.id.slice(0, 8)}
            </span>
            <PillBadge tone="primary">{ru ? status.ru : status.en}</PillBadge>
          </div>
          <div className="text-xs text-muted-foreground mt-1 flex gap-x-3 gap-y-1 flex-wrap">
            {c.vertical && <span>{c.vertical}</span>}
            {c.stage && <span>{c.stage}</span>}
            {c.domain && <span>{c.domain}</span>}
            {c.githubOrg && <span>github/{c.githubOrg}</span>}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2 text-center">
        <Stat tiny label={ru ? "Сигналы" : "Signals"} value={c.signalCount} />
        <Stat tiny label={ru ? "Источники" : "Sources"} value={c.sourceDiversity} />
        <Stat tiny label={ru ? "Готовность" : "Readiness"} value={c.readinessScore} highlight />
        <Stat tiny label={ru ? "Активность" : "Heat"} value={c.clusterHeat} />
      </div>
      <div className="text-[11px] text-muted-foreground mt-3">
        {ru ? "Последний сигнал" : "Last signal"}: {new Date(c.lastSignalAt).toLocaleDateString()}
      </div>
    </div>
  );
}

function Stat({
  label, value, highlight, tiny,
}: { label: string; value: number; highlight?: boolean; tiny?: boolean }) {
  return (
    <div
      className={`rounded-md border ${highlight ? "bg-accent border-accent-border" : "bg-muted/40"} ${tiny ? "py-2" : "py-3"}`}
    >
      <div className={`font-semibold tabular-nums ${tiny ? "text-base" : "text-lg"}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
