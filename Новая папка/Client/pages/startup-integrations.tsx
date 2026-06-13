import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Loader2,
  Copy,
  ShieldCheck,
  Plug,
  HelpCircle,
} from "lucide-react";
import {
  INTEGRATION_CATALOG,
  CATEGORY_LABELS,
  SetupGuideContent,
  type IntegrationCategory,
  type IntegrationMeta,
  type UnifiedIntegrationKind,
} from "@/components/integration-setup-guide";

interface Group3Card {
  kind: string;
  status: string;
  connected: boolean;
  updatedAt: string | null;
  config: any | null;
  inboxAddress?: string;
}
interface Group3Response {
  canManage: boolean;
  cards: Group3Card[];
}
interface FinancialRow {
  kind: string;
  status: string;
  hasCredentials: boolean;
  updatedAt: string | null;
  provider?: string | null;
  viaOAuth?: boolean;
  oauth?: { key: string; provider: string | null; configured: boolean }[];
}
interface OAuthSupport {
  providers: { key: string; kind: string; label: string; configured: boolean }[];
}

const CATEGORY_ORDER: IntegrationCategory[] = [
  "code",
  "analytics",
  "communication",
  "mail-calendar",
  "banking",
  "payments",
  "subscriptions",
];

export default function StartupIntegrations() {
  const params = useParams<{ id: string }>();
  const startupId = params.id!;
  const [, navigate] = useLocation();
  const { language, t } = useLanguage();
  const ru = language === "ru";
  const { toast } = useToast();
  const [openKind, setOpenKind] = useState<UnifiedIntegrationKind | null>(null);
  const [activeCategory, setActiveCategory] = useState<IntegrationCategory | "all">("all");

  const { data: g3, isLoading: g3Loading } = useQuery<Group3Response>({
    queryKey: ["/api/startups", startupId, "integrations"],
  });
  const { data: oauthSupport } = useQuery<OAuthSupport>({
    queryKey: ["/api/startups/integrations/oauth/support"],
  });
  const { data: finRows = [], isLoading: finLoading } = useQuery<FinancialRow[]>({
    queryKey: ["/api/startups", startupId, "financial-integrations"],
    queryFn: async () => {
      const res = await fetch(`/api/startups/${startupId}/financial-integrations`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Group 3 endpoint reports its own canManage. Financial endpoint has a broader
  // auth contract (any startup member / creator / admin); we default-allow there
  // and let the backend reject if the user truly cannot manage.
  const canManageGroup3 = g3?.canManage ?? false;
  const canManageFinancial = true;
  const canManageFor = (meta: IntegrationMeta) =>
    meta.api === "group3" ? canManageGroup3 : canManageFinancial;

  const oauthKeyForKind = (kind: UnifiedIntegrationKind): string | null => {
    const supported = oauthSupport?.providers ?? [];
    const map: Partial<Record<UnifiedIntegrationKind, string>> = {
      "github-app": "github-app",
      calendar: "google-calendar",
      "mail-forwarder": "google-mail",
      "yandex-metrika": "yandex-metrika",
      slack: "slack",
    };
    const key = map[kind];
    if (!key) return null;
    const p = supported.find((x) => x.key === key);
    return p?.configured ? key : null;
  };

  const startGroup3OAuth = async (oauthKey: string) => {
    try {
      const res = await apiRequest(
        `/api/startups/integrations/oauth/${oauthKey}/start?startupId=${startupId}`,
        { method: "GET" },
      );
      const body = await res.json();
      if (!body?.authorizeUrl) throw new Error("No authorize URL returned");
      const popup = window.open(body.authorizeUrl, "oauth-popup", "width=600,height=720");
      const handler = (ev: MessageEvent) => {
        if (ev.data?.type === "group3-oauth") {
          window.removeEventListener("message", handler);
          popup?.close();
          if (ev.data.ok) {
            toast({ title: ru ? "Подключено" : "Connected" });
            queryClient.invalidateQueries({ queryKey: ["/api/startups", startupId, "integrations"] });
            setOpenKind(null);
          } else {
            toast({ title: ru ? "Ошибка OAuth" : "OAuth error", variant: "destructive" });
          }
        }
      };
      window.addEventListener("message", handler);
      if (!popup) toast({ title: ru ? "Разрешите всплывающие окна" : "Allow popups for this site", variant: "destructive" });
    } catch (e: any) {
      toast({ title: ru ? "Ошибка OAuth" : "OAuth error", description: e?.message, variant: "destructive" });
    }
  };

  const startFinancialOAuth = async (key: string) => {
    try {
      const res = await fetch(
        `/api/startups/financial-integrations/oauth/${encodeURIComponent(key)}/start?startupId=${encodeURIComponent(startupId)}`,
        { credentials: "include" },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.authorizeUrl) {
        toast({ title: ru ? "OAuth недоступен" : "OAuth unavailable", description: body?.message, variant: "destructive" });
        return;
      }
      const popup = window.open(body.authorizeUrl, "fin-oauth", "width=520,height=720");
      const onMsg = (ev: MessageEvent) => {
        if (ev.data?.type === "fin-oauth") {
          window.removeEventListener("message", onMsg);
          queryClient.invalidateQueries({ queryKey: ["/api/startups", startupId, "financial-integrations"] });
          if (ev.data.ok) toast({ title: ru ? "Подключено" : "Connected" });
        }
      };
      window.addEventListener("message", onMsg);
      if (!popup) toast({ title: ru ? "Разрешите всплывающие окна" : "Allow popups for this site", variant: "destructive" });
    } catch (e: any) {
      toast({ title: ru ? "Ошибка OAuth" : "OAuth error", description: e?.message, variant: "destructive" });
    }
  };

  const disconnectGroup3 = useMutation({
    mutationFn: async (kind: string) => {
      await apiRequest(`/api/startups/${startupId}/integrations/${kind}`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast({ title: ru ? "Отключено" : "Disconnected" });
      queryClient.invalidateQueries({ queryKey: ["/api/startups", startupId, "integrations"] });
    },
  });

  const disconnectFinancial = useMutation({
    mutationFn: async (kind: string) => {
      await apiRequest(`/api/startups/${startupId}/financial-integrations/${kind}`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast({ title: ru ? "Отключено" : "Disconnected" });
      queryClient.invalidateQueries({ queryKey: ["/api/startups", startupId, "financial-integrations"] });
    },
  });

  const connectGroup3 = useMutation({
    mutationFn: async ({ kind, body }: { kind: string; body: any }) => {
      const res = await apiRequest(`/api/startups/${startupId}/integrations/${kind}`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: ru ? "Подключено" : "Connected" });
      queryClient.invalidateQueries({ queryKey: ["/api/startups", startupId, "integrations"] });
      setOpenKind(null);
    },
    onError: (e: any) => toast({ title: ru ? "Ошибка" : "Error", description: e?.message, variant: "destructive" }),
  });

  const connectFinancial = useMutation({
    mutationFn: async ({ kind, config }: { kind: string; config: Record<string, string> }) => {
      const res = await apiRequest(`/api/startups/${startupId}/financial-integrations`, {
        method: "POST",
        body: JSON.stringify({ kind, config }),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: ru ? "Подключено" : "Connected" });
      queryClient.invalidateQueries({ queryKey: ["/api/startups", startupId, "financial-integrations"] });
      setOpenKind(null);
    },
    onError: (e: any) => toast({ title: ru ? "Ошибка" : "Error", description: e?.message, variant: "destructive" }),
  });

  const statusForKind = (meta: IntegrationMeta): { connected: boolean; status: string; updatedAt: string | null; config: any; inboxAddress?: string; viaOAuth?: boolean } => {
    if (meta.api === "group3") {
      const card = g3?.cards.find((c) => c.kind === meta.kind);
      return {
        connected: card?.connected ?? false,
        status: card?.status ?? "not_connected",
        updatedAt: card?.updatedAt ?? null,
        config: card?.config ?? null,
        inboxAddress: card?.inboxAddress,
      };
    }
    const row = finRows.find((r) => r.kind === meta.kind);
    return {
      connected: row?.hasCredentials ?? false,
      status: row?.status ?? "not_connected",
      updatedAt: row?.updatedAt ?? null,
      config: null,
      viaOAuth: row?.viaOAuth,
    };
  };

  const filteredCatalog = useMemo(() => {
    const base =
      activeCategory === "all"
        ? INTEGRATION_CATALOG
        : INTEGRATION_CATALOG.filter((m) => m.category === activeCategory);
    // Sort by availability ascending: connected first, then available, then coming soon.
    const rank = (m: IntegrationMeta) => {
      if (m.comingSoon) return 2;
      const s = statusForKind(m);
      return s.connected ? 0 : 1;
    };
    return [...base].sort((a, b) => rank(a) - rank(b));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, g3, finRows]);

  const counts = useMemo(() => {
    const map: Record<string, { total: number; connected: number }> = { all: { total: 0, connected: 0 } };
    for (const meta of INTEGRATION_CATALOG) {
      const s = statusForKind(meta);
      map.all.total += 1;
      if (s.connected) map.all.connected += 1;
      const c = (map[meta.category] ||= { total: 0, connected: 0 });
      c.total += 1;
      if (s.connected) c.connected += 1;
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g3, finRows]);

  if (g3Loading || finLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const openMeta = openKind ? INTEGRATION_CATALOG.find((m) => m.kind === openKind) ?? null : null;

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate(`/startups/${startupId}`)} data-testid="button-back-to-startup">
        <ArrowLeft className="h-4 w-4 mr-2" />
        {ru ? "Назад к стартапу" : "Back to startup"}
      </Button>

      <div className="space-y-1">
        <h1 className="text-2xl font-bold" data-testid="text-integrations-title">
          {ru ? "Интеграции" : "Integrations"}
        </h1>
        <p className="text-muted-foreground" data-testid="text-integrations-subtitle">
          {ru
            ? "Все источники в одном месте — банки, эквайринг, аналитика, код, коммуникации. Каждая интеграция содержит пошаговую инструкцию."
            : "All your sources in one place — banks, payments, analytics, code, comms. Every integration has a step-by-step setup guide."}
        </p>
      </div>

      {!canManageGroup3 && (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground" data-testid="text-cannot-manage">
            {ru
              ? "Только фаундеры могут менять подключения OAuth-интеграций. Финансовые интеграции доступны участникам команды."
              : "Only founders can change OAuth integrations. Financial integrations are open to startup team members."}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <CategoryChip
          label={ru ? "Все" : "All"}
          active={activeCategory === "all"}
          count={counts.all}
          onClick={() => setActiveCategory("all")}
          testId="chip-category-all"
        />
        {CATEGORY_ORDER.map((cat) => (
          <CategoryChip
            key={cat}
            label={ru ? CATEGORY_LABELS[cat].ru : CATEGORY_LABELS[cat].en}
            icon={CATEGORY_LABELS[cat].icon}
            active={activeCategory === cat}
            count={counts[cat]}
            onClick={() => setActiveCategory(cat)}
            testId={`chip-category-${cat}`}
          />
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredCatalog.map((meta) => {
          const status = statusForKind(meta);
          return (
            <Card key={meta.kind} data-testid={`card-integration-${meta.kind}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="shrink-0">{meta.icon}</span>
                    <CardTitle className="text-base truncate" data-testid={`text-integration-name-${meta.kind}`}>
                      {ru ? meta.nameRu : meta.nameEn}
                    </CardTitle>
                  </div>
                  {meta.comingSoon ? (
                    <Badge
                      variant="outline"
                      className="bg-muted text-muted-foreground border-border"
                      data-testid={`badge-coming-soon-${meta.kind}`}
                    >
                      {ru ? "Скоро" : "Soon"}
                    </Badge>
                  ) : (
                    <StatusBadge status={status.status} connected={status.connected} ru={ru} />
                  )}
                </div>
                <CardDescription>{ru ? meta.shortRu : meta.shortEn}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Badge variant="outline" className="text-xs gap-1">
                  {CATEGORY_LABELS[meta.category].icon}
                  {ru ? CATEGORY_LABELS[meta.category].ru : CATEGORY_LABELS[meta.category].en}
                </Badge>
                {(meta.kind === "calendar" || meta.kind === "slack" || meta.kind === "mail-forwarder") && (
                  <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <ShieldCheck className="h-3 w-3" />
                    {ru ? "Только метаданные" : "Metadata only"}
                  </div>
                )}
                {status.updatedAt && (
                  <p className="text-xs text-muted-foreground" data-testid={`text-updated-${meta.kind}`}>
                    {ru ? "Обновлено" : "Updated"}: {new Date(status.updatedAt).toLocaleString(ru ? "ru-RU" : "en-US")}
                  </p>
                )}
              </CardContent>
              <CardFooter className="flex justify-end gap-2 flex-wrap">
                <Button
                  variant={status.connected ? "outline" : "default"}
                  onClick={() => setOpenKind(meta.kind)}
                  disabled={!canManageFor(meta) || meta.comingSoon}
                  data-testid={`button-open-${meta.kind}`}
                >
                  <Plug className="h-4 w-4 mr-2" />
                  {meta.comingSoon
                    ? (ru ? "Скоро" : "Coming soon")
                    : status.connected
                      ? (ru ? "Управлять" : "Manage")
                      : (ru ? "Подключить" : "Connect")}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <Sheet open={!!openMeta} onOpenChange={(v) => { if (!v) setOpenKind(null); }}>
        <SheetContent className="sm:max-w-xl w-full overflow-y-auto" data-testid={`sheet-integration-${openMeta?.kind ?? ""}`}>
          {openMeta && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2">
                  {openMeta.icon}
                  <SheetTitle>{ru ? openMeta.nameRu : openMeta.nameEn}</SheetTitle>
                </div>
                <SheetDescription>{ru ? openMeta.shortRu : openMeta.shortEn}</SheetDescription>
              </SheetHeader>

              <Tabs defaultValue="connect" className="mt-4">
                <TabsList className="w-full">
                  <TabsTrigger value="connect" className="flex-1" data-testid="tab-connect">
                    <Plug className="h-4 w-4 mr-2" />
                    {ru ? "Подключить" : "Connect"}
                  </TabsTrigger>
                  <TabsTrigger value="guide" className="flex-1" data-testid="tab-guide">
                    <HelpCircle className="h-4 w-4 mr-2" />
                    {ru ? "Инструкция" : "Setup guide"}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="connect" className="space-y-4 pt-4">
                  <ConnectPanel
                    meta={openMeta}
                    canManage={canManageFor(openMeta)}
                    startupId={startupId}
                    g3={g3}
                    finRows={finRows}
                    oauthKey={oauthKeyForKind(openMeta.kind)}
                    finOauthKeys={
                      finRows.find((r) => r.kind === openMeta.kind)?.oauth?.filter((o) => o.configured) ?? []
                    }
                    onStartGroup3OAuth={startGroup3OAuth}
                    onStartFinancialOAuth={startFinancialOAuth}
                    onSubmitGroup3={(body) => connectGroup3.mutate({ kind: openMeta.kind, body })}
                    onSubmitFinancial={(config) => connectFinancial.mutate({ kind: openMeta.kind, config })}
                    onDisconnect={() => {
                      if (openMeta.api === "group3") disconnectGroup3.mutate(openMeta.kind);
                      else disconnectFinancial.mutate(openMeta.kind);
                    }}
                    isPending={connectGroup3.isPending || connectFinancial.isPending}
                  />
                </TabsContent>

                <TabsContent value="guide" className="pt-4">
                  <SetupGuideContent meta={openMeta} language={language} />
                </TabsContent>
              </Tabs>

              <SheetFooter className="mt-4">
                <Button variant="outline" onClick={() => setOpenKind(null)} data-testid="button-close-sheet">
                  {ru ? "Закрыть" : "Close"}
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function CategoryChip({
  label,
  icon,
  active,
  count,
  onClick,
  testId,
}: {
  label: string;
  icon?: ReactNode;
  active: boolean;
  count?: { total: number; connected: number };
  onClick: () => void;
  testId: string;
}) {
  return (
    <Button
      variant={active ? "default" : "outline"}
      size="sm"
      onClick={onClick}
      data-testid={testId}
      className="gap-2"
    >
      {icon}
      <span>{label}</span>
      {count && (
        <Badge variant="secondary" className="ml-1 text-[10px]">
          {count.connected}/{count.total}
        </Badge>
      )}
    </Button>
  );
}

function StatusBadge({ status, connected, ru }: { status: string; connected: boolean; ru: boolean }) {
  if (connected) {
    return (
      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20" data-testid={`badge-status-${status}`}>
        {ru ? "Подключено" : "Connected"}
      </Badge>
    );
  }
  if (status === "error") {
    return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">{ru ? "Ошибка" : "Error"}</Badge>;
  }
  if (status === "expired") {
    return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">{ru ? "Истёк" : "Expired"}</Badge>;
  }
  return <Badge variant="secondary">{ru ? "Не подключено" : "Not connected"}</Badge>;
}

interface ConnectPanelProps {
  meta: IntegrationMeta;
  canManage: boolean;
  startupId: string;
  g3?: Group3Response;
  finRows: FinancialRow[];
  oauthKey: string | null;
  finOauthKeys: { key: string; provider: string | null; configured: boolean }[];
  onStartGroup3OAuth: (key: string) => void;
  onStartFinancialOAuth: (key: string) => void;
  onSubmitGroup3: (body: any) => void;
  onSubmitFinancial: (config: Record<string, string>) => void;
  onDisconnect: () => void;
  isPending: boolean;
}

function ConnectPanel({
  meta,
  canManage,
  startupId,
  g3,
  finRows,
  oauthKey,
  finOauthKeys,
  onStartGroup3OAuth,
  onStartFinancialOAuth,
  onSubmitGroup3,
  onSubmitFinancial,
  onDisconnect,
  isPending,
}: ConnectPanelProps) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const ru = language === "ru";
  const [form, setForm] = useState<Record<string, string>>({});

  const card = meta.api === "group3" ? g3?.cards.find((c) => c.kind === meta.kind) : null;
  const connected = card?.connected ?? finRows.find((r) => r.kind === meta.kind)?.hasCredentials ?? false;

  const update = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (meta.api === "financial") {
      onSubmitFinancial(form);
    } else {
      let body: any = { ...form };
      if (meta.kind === "mail-forwarder" && typeof body.whitelist === "string") {
        body.whitelist = body.whitelist.split(",").map((s: string) => s.trim()).filter(Boolean);
      }
      if (meta.kind === "inbound-inbox") body = {};
      onSubmitGroup3(body);
    }
  };

  if (!canManage) {
    return (
      <p className="text-sm text-muted-foreground">
        {ru ? "Только фаундеры могут менять интеграции." : "Only founders can manage integrations."}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* OAuth shortcut */}
      {oauthKey && (
        <div className="rounded-md border p-3 space-y-2 bg-muted/30">
          <div className="text-sm font-medium">{ru ? "Самый быстрый путь" : "Fastest path"}</div>
          <p className="text-xs text-muted-foreground">
            {ru
              ? "Подключение в один клик через OAuth — мы сами получим токены."
              : "One-click OAuth — we'll fetch the tokens for you."}
          </p>
          <Button onClick={() => onStartGroup3OAuth(oauthKey)} data-testid={`button-oauth-${meta.kind}`}>
            {connected
              ? (ru ? "Переподключить через OAuth" : "Reconnect with OAuth")
              : (ru ? "Подключить через OAuth" : "Connect with OAuth")}
          </Button>
        </div>
      )}

      {finOauthKeys.length > 0 && (
        <div className="rounded-md border p-3 space-y-2 bg-muted/30">
          <div className="text-sm font-medium">{ru ? "OAuth провайдеры" : "OAuth providers"}</div>
          <div className="flex flex-wrap gap-2">
            {finOauthKeys.map((o) => (
              <Button
                key={o.key}
                variant="default"
                size="sm"
                onClick={() => onStartFinancialOAuth(o.key)}
                data-testid={`button-fin-oauth-${o.key.replace(/[:]/g, "-")}`}
              >
                {ru ? "Через OAuth" : "OAuth"}{o.provider ? ` · ${o.provider}` : ""}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Bank-statement-OCR special-case: file upload */}
      {meta.kind === "bank-statement-ocr" ? (
        <BankStatementUploadInline startupId={startupId} />
      ) : meta.kind === "inbound-inbox" ? (
        <div className="space-y-3">
          {card?.inboxAddress ? (
            <div className="space-y-1">
              <Label className="text-xs">{ru ? "Ваш адрес" : "Your address"}</Label>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-2 py-1 rounded-md flex-1 truncate" data-testid="text-inbox-address">
                  {card.inboxAddress}
                </code>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(card.inboxAddress!);
                    toast({ title: ru ? "Скопировано" : "Copied" });
                  }}
                  data-testid="button-copy-inbox"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {ru
                  ? "Перешлите сюда чеки Stripe / ЮKassa / RevenueCat — мы достанем сумму и провайдера."
                  : "Forward Stripe / ЮKassa / RevenueCat receipts here — we'll extract amount and provider."}
              </p>
            </div>
          ) : (
            <Button onClick={() => onSubmitGroup3({})} disabled={isPending} data-testid="button-provision-inbox">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (ru ? "Получить адрес" : "Get my address")}
            </Button>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="text-sm font-medium">{ru ? "Ручной ввод токена" : "Paste your token"}</div>
          <ManualFields meta={meta} form={form} update={update} />
          <Button type="submit" disabled={isPending} className="w-full" data-testid={`button-submit-${meta.kind}`}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (connected ? (ru ? "Обновить" : "Update") : (ru ? "Сохранить" : "Save"))}
          </Button>
        </form>
      )}

      {connected && (
        <div className="pt-2 border-t">
          <Button variant="outline" onClick={onDisconnect} data-testid={`button-disconnect-${meta.kind}`}>
            {ru ? "Отключить" : "Disconnect"}
          </Button>
        </div>
      )}
    </div>
  );
}

function ManualFields({
  meta,
  form,
  update,
}: {
  meta: IntegrationMeta;
  form: Record<string, string>;
  update: (k: string, v: string) => void;
}) {
  const { language } = useLanguage();
  const ru = language === "ru";

  // Group 3 — per-kind fields
  if (meta.api === "group3") {
    switch (meta.kind) {
      case "github-app":
        return (
          <>
            <Field label={ru ? "Installation ID" : "Installation ID"} k="installationId" form={form} update={update} testId="input-installation-id" />
            <Field label={ru ? "Installation token (или PAT)" : "Installation token (or PAT)"} k="installationToken" form={form} update={update} testId="input-installation-token" type="password" />
          </>
        );
      case "yandex-metrika":
        return (
          <>
            <Field label={ru ? "OAuth токен" : "OAuth token"} k="token" form={form} update={update} testId="input-metrika-token" type="password" />
            <Field label="Counter ID" k="counterId" form={form} update={update} testId="input-metrika-counter" />
          </>
        );
      case "product-analytics":
        return (
          <>
            <SelectField label={ru ? "Провайдер" : "Provider"} k="provider" form={form} update={update} testId="select-pa-provider" options={[
              { value: "plausible", label: "Plausible" },
              { value: "mixpanel", label: "Mixpanel" },
              { value: "amplitude", label: "Amplitude" },
              { value: "ga4", label: "GA4" },
            ]} />
            <Field label="API key / username" k="apiKey" form={form} update={update} testId="input-pa-key" type="password" />
            <Field label={ru ? "Project ID / domain" : "Project ID / domain"} k="projectId" form={form} update={update} testId="input-pa-project" />
            {form.provider === "ga4" && (
              <div className="space-y-1">
                <Label className="text-xs">{ru ? "Service account JSON" : "Service account JSON"}</Label>
                <Textarea
                  value={form.serviceAccountJson ?? ""}
                  onChange={(e) => update("serviceAccountJson", e.target.value)}
                  rows={4}
                  data-testid="input-pa-sa-json"
                />
              </div>
            )}
            {form.provider === "mixpanel" && (
              <Field label={ru ? "API secret" : "API secret"} k="apiSecret" form={form} update={update} testId="input-pa-secret" type="password" />
            )}
            {form.provider === "amplitude" && (
              <Field label={ru ? "Secret key" : "Secret key"} k="apiSecret" form={form} update={update} testId="input-pa-secret" type="password" />
            )}
          </>
        );
      case "calendar":
        return (
          <>
            <SelectField label={ru ? "Провайдер" : "Provider"} k="provider" form={form} update={update} testId="select-cal-provider" options={[
              { value: "google", label: "Google Calendar" },
              { value: "yandex", label: "Yandex Calendar" },
            ]} />
            <Field label="Access token" k="accessToken" form={form} update={update} testId="input-cal-access" type="password" />
            <Field label="Refresh token" k="refreshToken" form={form} update={update} testId="input-cal-refresh" type="password" />
          </>
        );
      case "mail-forwarder":
        return (
          <>
            <SelectField label={ru ? "Провайдер" : "Provider"} k="provider" form={form} update={update} testId="select-mail-provider" options={[
              { value: "gmail", label: "Gmail" },
              { value: "yandex", label: "Yandex Mail" },
            ]} />
            <Field label="Access token" k="accessToken" form={form} update={update} testId="input-mail-access" type="password" />
            <div className="space-y-1">
              <Label className="text-xs">{ru ? "Белый список доменов (через запятую)" : "Whitelist domains (comma-separated)"}</Label>
              <Input
                value={form.whitelist ?? "stripe.com, yookassa.ru, revenuecat.com, appsflyer.com"}
                onChange={(e) => update("whitelist", e.target.value)}
                data-testid="input-mail-whitelist"
              />
            </div>
          </>
        );
      case "slack":
        return (
          <>
            <Field label="Bot User OAuth Token (xoxb-…)" k="botToken" form={form} update={update} testId="input-slack-bot" type="password" />
            <Field label="Team ID" k="teamId" form={form} update={update} testId="input-slack-team" />
          </>
        );
      default:
        return null;
    }
  }

  // Financial — per-kind fields
  switch (meta.kind) {
    case "tinkoff-business":
      return (
        <>
          <Field label="API token (Bearer)" k="token" form={form} update={update} testId="input-fin-token" type="password" />
          <Field label={ru ? "Номер счёта (20 цифр)" : "Account number (20 digits)"} k="accountNumber" form={form} update={update} testId="input-fin-account" />
        </>
      );
    case "ru-bank":
      return (
        <>
          <SelectField label={ru ? "Банк" : "Bank"} k="provider" form={form} update={update} testId="select-fin-bank" options={[
            { value: "tochka", label: "Точка" },
            { value: "modulbank", label: "Модульбанк" },
            { value: "alfabank", label: "Альфа-Бизнес" },
          ]} />
          <Field label="API token" k="token" form={form} update={update} testId="input-fin-bank-token" type="password" />
        </>
      );
    case "yookassa":
      return (
        <>
          <Field label="shopId" k="shopId" form={form} update={update} testId="input-fin-shopid" />
          <Field label="secretKey" k="secretKey" form={form} update={update} testId="input-fin-secretkey" type="password" />
        </>
      );
    case "ru-acquiring":
      return (
        <>
          <SelectField label={ru ? "Провайдер" : "Provider"} k="provider" form={form} update={update} testId="select-fin-acq" options={[
            { value: "cloudpayments", label: "CloudPayments" },
            { value: "robokassa", label: "Robokassa" },
            { value: "tinkoff-acquiring", label: "Tinkoff Acquiring" },
          ]} />
          <Field label="publicId / terminalKey" k="publicId" form={form} update={update} testId="input-fin-acq-id" />
          <Field label="apiSecret / password" k="apiSecret" form={form} update={update} testId="input-fin-acq-secret" type="password" />
        </>
      );
    case "intl-subscriptions":
      return (
        <>
          <SelectField label={ru ? "Провайдер" : "Provider"} k="provider" form={form} update={update} testId="select-fin-intl" options={[
            { value: "stripe", label: "Stripe" },
            { value: "lemonsqueezy", label: "Lemon Squeezy" },
            { value: "paddle", label: "Paddle" },
          ]} />
          <Field label="API key" k="apiKey" form={form} update={update} testId="input-fin-intl-key" type="password" />
          <Field label={ru ? "Валюта" : "Currency"} k="currency" form={form} update={update} testId="input-fin-intl-currency" placeholder="USD" />
        </>
      );
    default:
      return null;
  }
}

function BankStatementUploadInline({ startupId }: { startupId: string }) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const ru = language === "ru";
  const [uploading, setUploading] = useState(false);
  const [lastResult, setLastResult] = useState<{ template?: string; transactions?: number } | null>(null);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("statement", file);
      const res = await fetch(`/api/startups/${startupId}/financials/upload-statement`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || `HTTP ${res.status}`);
      setLastResult({ template: body.template, transactions: body.transactionsCount });
      toast({ title: ru ? "Выписка обработана" : "Statement parsed" });
      queryClient.invalidateQueries({ queryKey: ["/api/startups", startupId, "financial-integrations"] });
    } catch (e: any) {
      toast({
        title: ru ? "Не удалось обработать выписку" : "Could not parse statement",
        description: e?.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">{ru ? "Загрузить PDF-выписку" : "Upload PDF statement"}</div>
      <Input
        type="file"
        accept="application/pdf,image/*"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
        }}
        disabled={uploading}
        data-testid="input-bank-statement-upload"
      />
      {uploading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          {ru ? "Распознаём…" : "Parsing…"}
        </div>
      )}
      {lastResult && (
        <p className="text-xs text-muted-foreground" data-testid="text-statement-result">
          {ru ? "Шаблон" : "Template"}: <code>{lastResult.template ?? "auto"}</code>
          {typeof lastResult.transactions === "number" && (
            <> · {lastResult.transactions} {ru ? "транзакций" : "transactions"}</>
          )}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        {ru
          ? "Поддерживаются Сбербанк, Тинькофф, Альфа-Банк. Файл удаляется сразу после распознавания."
          : "Sberbank, Tinkoff, Alfa-Bank templates supported. The file is deleted right after parsing."}
      </p>
    </div>
  );
}

function Field({
  label, k, form, update, testId, type, placeholder,
}: { label: string; k: string; form: Record<string, string>; update: (k: string, v: string) => void; testId: string; type?: string; placeholder?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        value={form[k] ?? ""}
        onChange={(e) => update(k, e.target.value)}
        type={type ?? "text"}
        placeholder={placeholder}
        data-testid={testId}
      />
    </div>
  );
}

function SelectField({
  label, k, form, update, testId, options,
}: { label: string; k: string; form: Record<string, string>; update: (k: string, v: string) => void; testId: string; options: { value: string; label: string }[] }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Select value={form[k] ?? ""} onValueChange={(v) => update(k, v)}>
        <SelectTrigger data-testid={testId}><SelectValue placeholder="—" /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
