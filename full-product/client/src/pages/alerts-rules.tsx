import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Bell,
  Plus,
  Trash2,
  BellOff,
  BookOpen,
  Sparkles,
  CheckCircle2,
  Mail,
  Smartphone,
  MessageCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { AlertRule } from "@shared/schema";
import { AiWishInput } from "@/components/ai-wish-input";
import { humanizeDsl, isValidDsl } from "@/lib/alert-dsl-format";

type Cond = { field: string; op: string; value: any };
type Expr = { all?: Array<Cond | Expr>; any?: Array<Cond | Expr> };

const CHANNELS = [
  { key: "inApp", labelEn: "In-app", labelRu: "В приложении", icon: Bell },
  { key: "email", labelEn: "Email", labelRu: "Email", icon: Mail },
  { key: "telegram", labelEn: "Telegram", labelRu: "Telegram", icon: MessageCircle },
  { key: "push", labelEn: "Mobile push", labelRu: "Push", icon: Smartphone },
] as const;

export default function AlertRulesPage() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const ru = language === "ru";

  const userId = (user as any)?.id;

  const ADMIN_ROLES = ["companyAdmin", "headAdminProgram", "innovationLead", "headAdmin"];
  const { data: myCompanies = [] } = useQuery<any[]>({
    queryKey: ["/api/companies"],
    enabled: !!userId,
  });
  const adminCompanies = (myCompanies ?? []).filter((cu: any) =>
    ADMIN_ROLES.includes(cu.role),
  );

  const [scope, setScope] = useState<"user" | "company">("user");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");

  const listKey =
    scope === "company" && selectedCompanyId
      ? ["/api/alert-rules", { companyId: selectedCompanyId }]
      : ["/api/alert-rules"];

  const { data: rules = [], isLoading } = useQuery<AlertRule[]>({
    queryKey: listKey,
    queryFn: async () => {
      const url =
        scope === "company" && selectedCompanyId
          ? `/api/alert-rules?companyId=${encodeURIComponent(selectedCompanyId)}`
          : "/api/alert-rules";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: !!userId && (scope === "user" || !!selectedCompanyId),
  });

  // Create-rule modal state
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [generatedDsl, setGeneratedDsl] = useState<Expr | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [channels, setChannels] = useState<Record<string, boolean>>({
    inApp: true,
    email: false,
    telegram: false,
    push: false,
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advancedDsl, setAdvancedDsl] = useState("");
  const [advancedError, setAdvancedError] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<string>("");
  const [mutedRuleIds, setMutedRuleIds] = useState<Record<string, string>>({});

  type AlertTemplate = { id: string; name: string; description: string; conditionDsl: any };
  const { data: templates = [] } = useQuery<AlertTemplate[]>({
    queryKey: ["/api/alert-rules/templates"],
    enabled: !!userId,
  });

  const reset = () => {
    setName("");
    setDescription("");
    setGeneratedDsl(null);
    setExplanation(null);
    setChannels({ inApp: true, email: false, telegram: false, push: false });
    setShowAdvanced(false);
    setAdvancedDsl("");
    setAdvancedError(null);
    setTemplateId("");
  };

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    const tpl = templates.find((t) => t.id === id);
    if (!tpl) return;
    if (!name) setName(tpl.name);
    if (!description) setDescription(tpl.description);
    setGeneratedDsl(tpl.conditionDsl as Expr);
    setExplanation(tpl.description);
    setAdvancedDsl(JSON.stringify(tpl.conditionDsl, null, 2));
    setAdvancedError(null);
  };

  const muteMutation = useMutation({
    mutationFn: async ({ id, until }: { id: string; until: string }) => {
      const res = await apiRequest(`/api/alert-rules/${id}/mute`, {
        method: "POST",
        body: JSON.stringify({ until }),
      });
      return res.json() as Promise<{ ruleId: string; mutedUntil: string }>;
    },
    onSuccess: (out) => {
      setMutedRuleIds((prev) => ({ ...prev, [out.ruleId]: out.mutedUntil }));
      toast({ title: ru ? "Правило отключено на 24 часа" : "Rule muted for 24h" });
    },
    onError: (e: any) =>
      toast({
        title: ru ? "Ошибка" : "Error",
        description: e.message,
        variant: "destructive",
      }),
  });

  const unmuteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/api/alert-rules/${id}/mute`, { method: "DELETE" });
      return id;
    },
    onSuccess: (id: string) => {
      setMutedRuleIds((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      toast({ title: ru ? "Звук включён" : "Rule unmuted" });
    },
    onError: (e: any) =>
      toast({
        title: ru ? "Ошибка" : "Error",
        description: e.message,
        variant: "destructive",
      }),
  });

  const nlMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const res = await apiRequest("/api/alert-rules/from-nl", {
        method: "POST",
        body: JSON.stringify({ prompt, language: ru ? "ru" : "en" }),
      });
      return res.json() as Promise<{ dsl: Expr; explanation: string }>;
    },
    onSuccess: (out) => {
      setGeneratedDsl(out.dsl);
      setAdvancedDsl(JSON.stringify(out.dsl, null, 2));
      setAdvancedError(null);
      setExplanation(out.explanation || null);
      if (!description && out.explanation) setDescription(out.explanation);
      if (!name && out.explanation) {
        setName(out.explanation.replace(/[.!?]$/, "").slice(0, 60));
      }
      toast({ title: ru ? "Готово — проверьте превью" : "Done — review the preview" });
    },
    onError: (e: any) => {
      toast({
        title: ru ? "Не удалось" : "Failed",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      let parsed: Expr | null = generatedDsl;
      if (showAdvanced && advancedDsl.trim()) {
        try {
          parsed = JSON.parse(advancedDsl);
        } catch (e: any) {
          throw new Error(`Invalid JSON: ${e.message}`);
        }
      }
      if (!parsed || !isValidDsl(parsed)) {
        throw new Error(
          ru
            ? "Сначала сгенерируйте правило по вашему запросу выше."
            : "Generate a rule from your wish above first.",
        );
      }
      const selected = Object.entries(channels)
        .filter(([, v]) => v)
        .map(([k]) => k);
      const ownerType = scope === "company" ? "company" : "user";
      const ownerId = scope === "company" ? selectedCompanyId : userId;
      if (scope === "company" && !selectedCompanyId)
        throw new Error(ru ? "Выберите компанию" : "Select a company");
      const res = await apiRequest("/api/alert-rules", {
        method: "POST",
        body: JSON.stringify({
          ownerType,
          ownerId,
          name: name || (explanation ?? (ru ? "Правило" : "Rule")).slice(0, 80),
          description,
          isActive: true,
          conditionDsl: parsed,
          deliveryChannels: selected.length > 0 ? selected : ["inApp"],
        }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alert-rules"] });
      setOpen(false);
      reset();
      toast({ title: ru ? "Правило создано" : "Rule created" });
    },
    onError: (e: any) => {
      toast({
        title: ru ? "Ошибка" : "Error",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await apiRequest(`/api/alert-rules/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      });
      return res.json();
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["/api/alert-rules"],
        exact: false,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/api/alert-rules/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/alert-rules"],
        exact: false,
      });
      toast({ title: ru ? "Удалено" : "Deleted" });
    },
  });

  const channelLabel = (key: string) => {
    const c = CHANNELS.find((x) => x.key === key);
    if (!c) return key;
    return ru ? c.labelRu : c.labelEn;
  };

  const examples = ru
    ? [
        "Уведоми меня, когда финтех-стартап поднимает раунд больше $1M",
        "Алерт, если у любого стартапа из watchlist падает MRR",
        "Срочно сообщи, если ушёл фаундер из стартапа на seed",
      ]
    : [
        "Alert me when a fintech startup raises a round > $1M",
        "Notify if any watchlisted startup's MRR drops",
        "Critical alert when a founder leaves a seed-stage startup",
      ];

  return (
    <div className="space-y-6" data-testid="page-alert-rules">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-3xl font-bold flex items-center gap-2"
            data-testid="text-alerts-title"
          >
            <Bell className="h-8 w-8 text-primary" />
            {ru ? "Алерты по портфелю" : "Portfolio alerts"}
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">
            {ru
              ? "Опишите словами, какие события важны — ИИ построит правило за вас. Алерты приходят в приложение, на email, в Telegram или push."
              : "Describe in plain words what matters to you — the AI builds the rule for you. Alerts land in-app, by email, Telegram or mobile push."}
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) reset();
          }}
        >
          <DialogTrigger asChild>
            <Button data-testid="button-create-rule">
              <Sparkles className="h-4 w-4 mr-2" />
              {ru ? "Новый алерт" : "New alert"}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                {ru ? "Новый алерт" : "Create an alert"}
              </DialogTitle>
              <DialogDescription>
                {ru
                  ? "Напишите, о чём вас предупредить — ИИ соберёт правило и покажет понятное превью."
                  : "Tell us what to alert you about — the AI assembles the rule and shows you a friendly preview."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              <AiWishInput
                title={ru ? "Что вас интересует?" : "What should we watch for?"}
                hint={
                  ru
                    ? "Напишите как для коллеги. Можно по-русски или по-английски."
                    : "Write it as you'd say it to a colleague. Plain English works."
                }
                examples={examples}
                isPending={nlMutation.isPending}
                onSubmit={(p) => nlMutation.mutate(p)}
                testId="alert-wish"
              >
                {generatedDsl && (
                  <div
                    className="rounded-md border bg-background p-3 space-y-2"
                    data-testid="alert-preview"
                  >
                    <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      {ru ? "Предпросмотр правила" : "Rule preview"}
                    </div>
                    <p
                      className="text-sm font-medium leading-snug"
                      data-testid="text-alert-preview"
                    >
                      {ru ? "Сработает, когда " : "Fires when "}
                      <span className="text-primary">
                        {humanizeDsl(generatedDsl, ru ? "ru" : "en")}
                      </span>
                    </p>
                    {explanation && (
                      <p className="text-xs text-muted-foreground italic">
                        {explanation}
                      </p>
                    )}
                  </div>
                )}
              </AiWishInput>

              {templates.length > 0 && (
                <div
                  className="rounded-md border p-3 space-y-2"
                  data-testid="section-template-picker"
                >
                  <Label className="flex items-center gap-2 text-xs">
                    <BookOpen className="h-3.5 w-3.5" />
                    {ru ? "Или возьмите готовый шаблон" : "Or start from a template"}
                  </Label>
                  <Select value={templateId} onValueChange={applyTemplate}>
                    <SelectTrigger data-testid="select-template" className="bg-background">
                      <SelectValue placeholder={ru ? "Выберите шаблон…" : "Pick a template…"} />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((t) => (
                        <SelectItem
                          key={t.id}
                          value={t.id}
                          data-testid={`option-template-${t.id}`}
                        >
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <Label className="text-xs">
                    {ru ? "Название алерта" : "Alert name"}
                  </Label>
                  <Input
                    data-testid="input-rule-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={
                      ru
                        ? "Например: Финтех раунды > $1M"
                        : "e.g. Fintech rounds > $1M"
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">
                    {ru ? "Заметка (необязательно)" : "Note (optional)"}
                  </Label>
                  <Input
                    data-testid="input-rule-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs mb-2 block">
                  {ru ? "Куда отправлять?" : "Where should we deliver?"}
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {CHANNELS.map((c) => {
                    const Icon = c.icon;
                    return (
                      <label
                        key={c.key}
                        className="flex items-center gap-2 text-sm rounded-md border bg-background px-3 py-2"
                        data-testid={`channel-${c.key}`}
                      >
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1">
                          {ru ? c.labelRu : c.labelEn}
                        </span>
                        <Switch
                          checked={!!channels[c.key]}
                          onCheckedChange={(v) =>
                            setChannels((p) => ({ ...p, [c.key]: v }))
                          }
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                  data-testid="button-toggle-advanced"
                >
                  {showAdvanced ? (
                    <EyeOff className="h-3 w-3" />
                  ) : (
                    <Eye className="h-3 w-3" />
                  )}
                  {showAdvanced
                    ? ru
                      ? "Скрыть JSON для разработчиков"
                      : "Hide developer JSON"
                    : ru
                      ? "Показать JSON (для разработчиков)"
                      : "Show JSON (for developers)"}
                </button>
                {showAdvanced && (
                  <div className="mt-2">
                    <Textarea
                      data-testid="input-rule-dsl"
                      value={advancedDsl}
                      onChange={(e) => {
                        const v = e.target.value;
                        setAdvancedDsl(v);
                        if (!v.trim()) {
                          setAdvancedError(null);
                          return;
                        }
                        try {
                          const j = JSON.parse(v);
                          if (isValidDsl(j)) {
                            setGeneratedDsl(j);
                            setAdvancedError(null);
                          } else {
                            setAdvancedError(
                              ru
                                ? "Похоже на правильный JSON, но без условий — добавьте {all:[…]} или {any:[…]}"
                                : "Looks like valid JSON but no conditions — add {all:[…]} or {any:[…]}",
                            );
                          }
                        } catch (err: any) {
                          setAdvancedError(
                            ru
                              ? `Невалидный JSON: ${err.message}`
                              : `Invalid JSON: ${err.message}`,
                          );
                        }
                      }}
                      className="font-mono text-xs min-h-[160px]"
                      placeholder='{ "all": [{ "field": "event.type", "op": "eq", "value": "round_raised" }] }'
                    />
                    {advancedError && (
                      <p className="text-xs text-destructive mt-1">{advancedError}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setOpen(false)}
                data-testid="button-cancel-rule"
              >
                {ru ? "Отмена" : "Cancel"}
              </Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={
                  createMutation.isPending ||
                  (!generatedDsl && !showAdvanced) ||
                  (!name && !explanation)
                }
                data-testid="button-save-rule"
              >
                {ru ? "Сохранить алерт" : "Save alert"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {adminCompanies.length > 0 && (
        <div
          className="flex flex-col sm:flex-row sm:items-center gap-3"
          data-testid="alert-rules-scope"
        >
          <Tabs value={scope} onValueChange={(v) => setScope(v as "user" | "company")}>
            <TabsList>
              <TabsTrigger value="user" data-testid="tab-scope-user">
                {ru ? "Мои алерты" : "My alerts"}
              </TabsTrigger>
              <TabsTrigger value="company" data-testid="tab-scope-company">
                {ru ? "Алерты компании" : "Company alerts"}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {scope === "company" && (
            <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
              <SelectTrigger className="w-[260px]" data-testid="select-company-scope">
                <SelectValue
                  placeholder={ru ? "Выберите компанию" : "Select a company"}
                />
              </SelectTrigger>
              <SelectContent>
                {adminCompanies.map((cu: any) => (
                  <SelectItem key={cu.companyId} value={cu.companyId}>
                    {cu.company?.name ?? cu.companyId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {scope === "company" && !selectedCompanyId ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
            <Bell className="h-10 w-10 mb-3 opacity-40" />
            <div className="text-sm">
              {ru
                ? "Выберите компанию для просмотра её правил."
                : "Select a company to view its rules."}
            </div>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="text-center text-muted-foreground py-12">
          {ru ? "Загрузка…" : "Loading…"}
        </div>
      ) : rules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-muted-foreground text-center">
            <Sparkles className="h-10 w-10 mb-3 text-primary/60" />
            <div className="text-sm font-medium">
              {ru ? "Пока ни одного алерта" : "No alerts yet"}
            </div>
            <div className="text-xs mt-1 max-w-md">
              {ru
                ? 'Нажмите «Новый алерт» и опишите словами, что вас интересует — ИИ соберёт правило за секунду.'
                : "Click \"New alert\" and describe what you care about — the AI will build the rule for you."}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rules.map((r) => (
            <Card key={r.id} data-testid={`card-rule-${r.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <CardTitle
                      className="text-base"
                      data-testid={`text-rule-name-${r.id}`}
                    >
                      {r.name}
                    </CardTitle>
                    <p
                      className="text-sm text-muted-foreground mt-1.5 leading-snug"
                      data-testid={`text-rule-summary-${r.id}`}
                    >
                      <span className="text-foreground">
                        {ru ? "Сработает, когда " : "Fires when "}
                      </span>
                      {humanizeDsl(r.conditionDsl, ru ? "ru" : "en")}
                    </p>
                    {r.description && r.description !== r.name && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        {r.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {(r.deliveryChannels ?? []).map((c) => (
                        <Badge
                          key={c}
                          variant="secondary"
                          className="text-[10px]"
                        >
                          {channelLabel(c)}
                        </Badge>
                      ))}
                      {!r.isActive && (
                        <Badge variant="outline" className="text-[10px]">
                          {ru ? "Выключен" : "Inactive"}
                        </Badge>
                      )}
                      {mutedRuleIds[r.id] && (
                        <Badge variant="outline" className="text-[10px]">
                          {ru ? "Без звука" : "Muted"}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Switch
                      checked={r.isActive}
                      onCheckedChange={(v) =>
                        toggleMutation.mutate({ id: r.id, isActive: v })
                      }
                      data-testid={`switch-rule-active-${r.id}`}
                    />
                    {mutedRuleIds[r.id] ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => unmuteMutation.mutate(r.id)}
                        disabled={unmuteMutation.isPending}
                        data-testid={`button-unmute-rule-${r.id}`}
                      >
                        <Bell className="h-3.5 w-3.5 mr-1" />
                        {ru ? "Включить" : "Unmute"}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const until = new Date(
                            Date.now() + 24 * 60 * 60 * 1000,
                          ).toISOString();
                          muteMutation.mutate({ id: r.id, until });
                        }}
                        disabled={muteMutation.isPending}
                        data-testid={`button-mute-rule-${r.id}`}
                      >
                        <BellOff className="h-3.5 w-3.5 mr-1" />
                        {ru ? "Заглушить 24ч" : "Mute 24h"}
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (
                          confirm(
                            ru ? "Удалить правило?" : "Delete this rule?",
                          )
                        )
                          deleteMutation.mutate(r.id);
                      }}
                      data-testid={`button-delete-rule-${r.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
