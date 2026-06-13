import { useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Banknote, Trash2, Upload, Loader2, ShieldCheck } from "lucide-react";
import type { StartupFinancial, VerifiedMrr } from "@shared/schema";
import { FinancialChart } from "./financial-chart";
import { VerifiedMrrBadge, formatMoney } from "./verified-mrr-badge";

type IntegrationRow = {
  kind: string;
  status: string;
  hasCredentials: boolean;
  updatedAt: string | null;
  provider?: string | null;
  viaOAuth?: boolean;
  oauth?: { key: string; provider: string | null; configured: boolean }[];
};

const FINANCIAL_KINDS: { kind: string; en: string; ru: string; fields: { key: string; label: string; type?: string; placeholder?: string; options?: { value: string; label: string }[] }[] }[] = [
  {
    kind: "tinkoff-business",
    en: "Tinkoff Business",
    ru: "Тинькофф Бизнес",
    fields: [
      { key: "token", label: "API token", type: "password", placeholder: "Bearer token" },
      { key: "accountNumber", label: "Account #" },
    ],
  },
  {
    kind: "ru-bank",
    en: "Точка / Модульбанк / Альфа-Бизнес",
    ru: "Точка / Модульбанк / Альфа-Бизнес",
    fields: [
      {
        key: "provider",
        label: "Provider",
        options: [
          { value: "tochka", label: "Точка" },
          { value: "modulbank", label: "Модульбанк" },
          { value: "alfabank", label: "Альфа-Бизнес" },
        ],
      },
      { key: "token", label: "API token", type: "password" },
    ],
  },
  {
    kind: "yookassa",
    en: "ЮKassa (YooKassa)",
    ru: "ЮKassa",
    fields: [
      { key: "shopId", label: "shopId" },
      { key: "secretKey", label: "secretKey", type: "password" },
    ],
  },
  {
    kind: "ru-acquiring",
    en: "RU acquiring",
    ru: "Эквайринг РФ",
    fields: [
      {
        key: "provider",
        label: "Provider",
        options: [
          { value: "cloudpayments", label: "CloudPayments" },
          { value: "robokassa", label: "Robokassa" },
          { value: "tinkoff-acquiring", label: "Tinkoff Acquiring" },
        ],
      },
      { key: "publicId", label: "publicId / terminalKey" },
      { key: "apiSecret", label: "apiSecret / password", type: "password" },
    ],
  },
  {
    kind: "intl-subscriptions",
    en: "Stripe / Lemon Squeezy / Paddle",
    ru: "Stripe / Lemon Squeezy / Paddle",
    fields: [
      {
        key: "provider",
        label: "Provider",
        options: [
          { value: "stripe", label: "Stripe" },
          { value: "lemonsqueezy", label: "Lemon Squeezy" },
          { value: "paddle", label: "Paddle" },
        ],
      },
      { key: "apiKey", label: "API key", type: "password" },
      { key: "currency", label: "Currency", placeholder: "USD" },
    ],
  },
];

export function FinancialIntegrationsSection({ startupId, canEdit }: { startupId: string; canEdit: boolean }) {
  const { language } = useLanguage();
  const ru = language === "ru";
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [openKind, setOpenKind] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);

  const { data: history = [] } = useQuery<StartupFinancial[]>({
    queryKey: ["/api/startups", startupId, "financials"],
    queryFn: async () => {
      const res = await fetch(`/api/startups/${startupId}/financials`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: verified } = useQuery<VerifiedMrr | null>({
    queryKey: ["/api/startups", startupId, "verified-mrr"],
    queryFn: async () => {
      const res = await fetch(`/api/startups/${startupId}/verified-mrr`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const { data: integrations = [] } = useQuery<IntegrationRow[]>({
    queryKey: ["/api/startups", startupId, "financial-integrations"],
    queryFn: async () => {
      const res = await fetch(`/api/startups/${startupId}/financial-integrations`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const saveCredential = useMutation({
    mutationFn: async (payload: { kind: string; config: Record<string, string> }) => {
      const res = await apiRequest(`/api/startups/${startupId}/financial-integrations`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: ru ? "Интеграция сохранена" : "Integration saved" });
      queryClient.invalidateQueries({ queryKey: ["/api/startups", startupId, "financial-integrations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/startups", startupId, "verified-mrr"] });
      setOpenKind(null);
      setFormValues({});
    },
    onError: (err: any) => toast({ title: ru ? "Не удалось сохранить" : "Could not save", description: err?.message, variant: "destructive" }),
  });

  const startOAuth = async (key: string) => {
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
          queryClient.invalidateQueries({ queryKey: ["/api/startups", startupId, "verified-mrr"] });
          if (ev.data.ok) toast({ title: ru ? "Подключено" : "Connected" });
        }
      };
      window.addEventListener("message", onMsg);
      if (!popup) toast({ title: ru ? "Разрешите всплывающие окна" : "Allow popups for this site", variant: "destructive" });
    } catch (err: any) {
      toast({ title: ru ? "Ошибка OAuth" : "OAuth error", description: err?.message, variant: "destructive" });
    }
  };

  const deleteCredential = useMutation({
    mutationFn: async (kind: string) => {
      const res = await apiRequest(`/api/startups/${startupId}/financial-integrations/${kind}`, { method: "DELETE" });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: ru ? "Удалено" : "Removed" });
      queryClient.invalidateQueries({ queryKey: ["/api/startups", startupId, "financial-integrations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/startups", startupId, "verified-mrr"] });
    },
  });

  const onUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("statement", file);
      const res = await fetch(`/api/startups/${startupId}/financials/upload-statement`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      toast({
        title: ru ? "Выписка обработана" : "Statement processed",
        description: ru
          ? `Найдено транзакций: ${data.txCount}, MRR ≈ ${formatMoney(data.mrrMinor, data.currency, language)}`
          : `${data.txCount} transactions found, MRR ≈ ${formatMoney(data.mrrMinor, data.currency, language)}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/startups", startupId, "financials"] });
      queryClient.invalidateQueries({ queryKey: ["/api/startups", startupId, "verified-mrr"] });
      queryClient.invalidateQueries({ queryKey: ["/api/startups", startupId, "financial-integrations"] });
    } catch (err: any) {
      toast({ title: ru ? "Ошибка OCR" : "OCR error", description: err?.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const integrationByKind = new Map(integrations.map((i) => [i.kind, i]));

  return (
    <Card data-testid="card-financial-integrations">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Banknote className="h-5 w-5" />
          {ru ? "Финансовые интеграции" : "Financial integrations"}
          {verified && <VerifiedMrrBadge startupId={startupId} data={verified} />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <FinancialChart data={history} />

        <div className="space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            {ru ? "Подключённые источники" : "Connected sources"}
          </h4>
          <div className="grid sm:grid-cols-2 gap-2">
            {FINANCIAL_KINDS.map((k) => {
              const cur = integrationByKind.get(k.kind);
              const connected = cur?.hasCredentials;
              const oauthEntries = cur?.oauth ?? [];
              const updatedLabel = cur?.updatedAt
                ? new Date(cur.updatedAt).toLocaleString(ru ? "ru-RU" : "en-US", { dateStyle: "medium", timeStyle: "short" })
                : null;
              return (
                <div
                  key={k.kind}
                  className="flex items-center justify-between gap-2 border rounded-md p-3"
                  data-testid={`row-integration-${k.kind}`}
                >
                  <div className="min-w-0">
                    <div className="font-medium text-sm">{ru ? k.ru : k.en}</div>
                    <div className="text-xs text-muted-foreground">
                      {connected
                        ? (ru ? "Подключено" : "Connected") +
                          (cur?.viaOAuth ? (ru ? " · OAuth" : " · OAuth") : "") +
                          (updatedLabel ? ` · ${updatedLabel}` : "")
                        : ru ? "Не подключено" : "Not connected"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {connected && <Badge variant="outline" className="text-xs">{cur?.status ?? "active"}</Badge>}
                    {canEdit && oauthEntries.filter((o) => o.configured).map((o) => (
                      <Button
                        key={o.key}
                        size="sm"
                        variant="default"
                        onClick={() => startOAuth(o.key)}
                        data-testid={`button-oauth-${o.key.replace(/[:]/g, "-")}`}
                      >
                        {ru ? "Через OAuth" : "OAuth"}{o.provider ? ` · ${o.provider}` : ""}
                      </Button>
                    ))}
                    {canEdit && (
                      <>
                        <Dialog open={openKind === k.kind} onOpenChange={(o) => { setOpenKind(o ? k.kind : null); if (!o) setFormValues({}); }}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" data-testid={`button-connect-${k.kind}`}>
                              {connected ? (ru ? "Изменить" : "Edit") : (ru ? "Подключить" : "Connect")}
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>{ru ? k.ru : k.en}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-3">
                              {k.fields.map((f) => (
                                <div key={f.key} className="space-y-1">
                                  <Label className="text-xs">{f.label}</Label>
                                  {f.options ? (
                                    <Select value={formValues[f.key] ?? ""} onValueChange={(v) => setFormValues((p) => ({ ...p, [f.key]: v }))}>
                                      <SelectTrigger data-testid={`select-${k.kind}-${f.key}`}><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        {f.options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <Input
                                      type={f.type ?? "text"}
                                      value={formValues[f.key] ?? ""}
                                      placeholder={f.placeholder}
                                      onChange={(e) => setFormValues((p) => ({ ...p, [f.key]: e.target.value }))}
                                      data-testid={`input-${k.kind}-${f.key}`}
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                            <DialogFooter>
                              <Button
                                onClick={() => saveCredential.mutate({ kind: k.kind, config: formValues })}
                                disabled={saveCredential.isPending}
                                data-testid={`button-save-${k.kind}`}
                              >
                                {saveCredential.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (ru ? "Сохранить" : "Save")}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        {connected && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteCredential.mutate(k.kind)}
                            data-testid={`button-disconnect-${k.kind}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {canEdit && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Upload className="h-4 w-4" />
              {ru ? "Резервный вариант: загрузить выписку" : "Fallback: upload bank statement"}
            </h4>
            <p className="text-xs text-muted-foreground">
              {ru
                ? "PDF / JPG / PNG. Распознаём через OCR и оценим MRR за последние 30 дней."
                : "PDF / JPG / PNG. We OCR it and estimate MRR over the last 30 days."}
            </p>
            <div className="flex items-center gap-2">
              <Input
                ref={fileRef}
                type="file"
                accept=".pdf,image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUpload(f);
                }}
                disabled={uploading}
                data-testid="input-upload-statement"
              />
              {uploading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
