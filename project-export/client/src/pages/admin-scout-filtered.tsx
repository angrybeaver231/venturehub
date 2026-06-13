import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RotateCcw, Plus, Trash2, Shield, Clock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

type Cluster = {
  id: string;
  canonicalName: string | null;
  domain: string | null;
  vertical: string | null;
  stage: string | null;
  clusterStatus: string;
  excludedReason: string | null;
  signalCount: number;
  sourceDiversity: number;
  lastSignalAt: string;
  maturityFlags: any;
};

type BlacklistEntry = {
  id: string;
  matchType: string;
  value: string;
  reason: string | null;
  createdAt: string;
};

type BlacklistResp = { total: number; rows: BlacklistEntry[] };

export default function AdminScoutFiltered() {
  const { language } = useLanguage();
  const ru = language === "ru";
  const { toast } = useToast();
  const [tab, setTab] = useState<"blacklisted" | "too_mature" | "wrong_stage" | "manage">("blacklisted");

  const blacklistedQ = useQuery<Cluster[]>({
    queryKey: ["/api/admin/scout/clusters", "blacklisted"],
    queryFn: async () => {
      const r = await fetch(`/api/admin/scout/clusters?status=blacklisted&limit=200`, { credentials: "include" });
      return r.json();
    },
  });
  const tooMatureQ = useQuery<Cluster[]>({
    queryKey: ["/api/admin/scout/clusters", "too_mature"],
    queryFn: async () => {
      const r = await fetch(`/api/admin/scout/clusters?status=too_mature&limit=200`, { credentials: "include" });
      return r.json();
    },
  });
  const blacklistQ = useQuery<BlacklistResp>({
    queryKey: ["/api/admin/scout/blacklist"],
    queryFn: async () => {
      const r = await fetch(`/api/admin/scout/blacklist?limit=500`, { credentials: "include" });
      return r.json();
    },
  });

  const unblockM = useMutation({
    mutationFn: async (id: string) => apiRequest("POST", `/api/admin/scout/clusters/${id}/unblock`),
    onSuccess: () => {
      toast({ title: ru ? "Разблокирован" : "Unblocked" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/scout/clusters"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/scout/overview"] });
    },
  });

  const deleteBlM = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/admin/scout/blacklist/${id}`),
    onSuccess: () => {
      toast({ title: ru ? "Удалено" : "Removed" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/scout/blacklist"] });
    },
  });

  const runMaturityM = useMutation({
    mutationFn: async () => apiRequest("POST", `/api/admin/scout/run/maturity`),
    onSuccess: (data: any) => {
      toast({
        title: ru ? "Проверка зрелости запущена" : "Maturity check ran",
        description: `scanned=${data?.result?.scanned ?? 0}, blocked=${data?.result?.blocked ?? 0}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/scout/clusters"] });
    },
  });

  const renderClusters = (rows: Cluster[] | undefined, loading: boolean, emptyEn: string, emptyRu: string) => {
    if (loading) return <Loader2 className="w-6 h-6 animate-spin" data-testid="loading-clusters" />;
    if (!rows?.length) return (
      <div className="text-sm text-muted-foreground py-8 text-center" data-testid="text-empty">
        {ru ? emptyRu : emptyEn}
      </div>
    );
    return (
      <div className="space-y-2">
        {rows.map((c) => (
          <Card key={c.id} data-testid={`row-cluster-${c.id}`}>
            <CardContent className="p-4 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium truncate" data-testid={`text-name-${c.id}`}>
                    {c.canonicalName || c.domain || "?"}
                  </span>
                  {c.domain && <Badge variant="outline">{c.domain}</Badge>}
                  {c.vertical && <Badge variant="secondary">{c.vertical}</Badge>}
                  {c.stage && <Badge variant="outline">{c.stage}</Badge>}
                </div>
                {c.excludedReason && (
                  <div className="text-xs text-muted-foreground mt-1" data-testid={`text-reason-${c.id}`}>
                    {ru ? "Причина" : "Reason"}: {c.excludedReason}
                  </div>
                )}
                <div className="text-xs text-muted-foreground mt-1">
                  {ru ? "Сигналов" : "Signals"}: {c.signalCount} · {ru ? "источников" : "sources"}: {c.sourceDiversity}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => unblockM.mutate(c.id)}
                disabled={unblockM.isPending}
                data-testid={`button-unblock-${c.id}`}
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                {ru ? "Разблокировать" : "Unblock"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="container max-w-6xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">
            {ru ? "Отфильтрованные кластеры" : "Filtered clusters"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {ru
              ? "Скрыты из основной ленты /admin/scout. Здесь видны кластеры, отбракованные блэклистом или проверкой зрелости."
              : "Hidden from the main /admin/scout feed. These were filtered out by the brand blacklist or the maturity check."}
          </p>
        </div>
        <Button
          onClick={() => runMaturityM.mutate()}
          disabled={runMaturityM.isPending}
          data-testid="button-run-maturity"
        >
          {runMaturityM.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {ru ? "Запустить проверку зрелости" : "Run maturity check"}
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="blacklisted" data-testid="tab-blacklisted">
            <Shield className="w-3 h-3 mr-1" />
            {ru ? "Блэклист" : "Blacklisted"}
          </TabsTrigger>
          <TabsTrigger value="too_mature" data-testid="tab-too-mature">
            <Clock className="w-3 h-3 mr-1" />
            {ru ? "Слишком зрелые" : "Too mature"}
          </TabsTrigger>
          <TabsTrigger value="manage" data-testid="tab-manage">
            {ru ? "Управление" : "Manage list"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="blacklisted">
          {renderClusters(blacklistedQ.data, blacklistedQ.isLoading,
            "No blacklisted clusters.", "Нет заблокированных кластеров.")}
        </TabsContent>
        <TabsContent value="too_mature">
          {renderClusters(tooMatureQ.data, tooMatureQ.isLoading,
            "No clusters flagged as too mature yet.", "Кластеров со статусом «too_mature» пока нет.")}
        </TabsContent>

        <TabsContent value="manage">
          <ManageBlacklist
            data={blacklistQ.data}
            loading={blacklistQ.isLoading}
            ru={ru}
            onAdded={() => queryClient.invalidateQueries({ queryKey: ["/api/admin/scout/blacklist"] })}
            onDelete={(id) => deleteBlM.mutate(id)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ManageBlacklist({
  data, loading, ru, onAdded, onDelete,
}: {
  data: BlacklistResp | undefined;
  loading: boolean;
  ru: boolean;
  onAdded: () => void;
  onDelete: (id: string) => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [matchType, setMatchType] = useState("domain");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");

  const addM = useMutation({
    mutationFn: async () => apiRequest("POST", `/api/admin/scout/blacklist`, { matchType, value, reason: reason || undefined }),
    onSuccess: () => {
      toast({ title: ru ? "Добавлено в блэклист" : "Added to blacklist" });
      setOpen(false); setValue(""); setReason("");
      onAdded();
    },
    onError: (err: any) => {
      toast({ title: ru ? "Ошибка" : "Error", description: err?.message, variant: "destructive" });
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">
          {ru ? "Записи блэклиста" : "Blacklist entries"} ({data?.total ?? 0})
        </CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-add-blacklist">
              <Plus className="w-3 h-3 mr-1" />{ru ? "Добавить" : "Add"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{ru ? "Добавить в блэклист" : "Add to blacklist"}</DialogTitle>
              <DialogDescription>
                {ru
                  ? "Кластеры, чей домен или название совпадут, будут помечены 'blacklisted'."
                  : "Clusters whose domain or name matches will be flagged 'blacklisted'."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>{ru ? "Тип" : "Type"}</Label>
                <Select value={matchType} onValueChange={setMatchType}>
                  <SelectTrigger data-testid="select-match-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="domain">domain</SelectItem>
                    <SelectItem value="company_name">company_name</SelectItem>
                    <SelectItem value="inn">inn</SelectItem>
                    <SelectItem value="tg_channel">tg_channel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{ru ? "Значение" : "Value"}</Label>
                <Input value={value} onChange={(e) => setValue(e.target.value)} data-testid="input-blacklist-value" />
              </div>
              <div className="space-y-1">
                <Label>{ru ? "Причина" : "Reason"}</Label>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} data-testid="input-blacklist-reason" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>{ru ? "Отмена" : "Cancel"}</Button>
              <Button
                onClick={() => addM.mutate()}
                disabled={!value.trim() || addM.isPending}
                data-testid="button-submit-blacklist"
              >
                {addM.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                {ru ? "Добавить" : "Add"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : !data?.rows?.length ? (
          <div className="text-sm text-muted-foreground py-8 text-center">
            {ru ? "Список пуст." : "List is empty."}
          </div>
        ) : (
          <div className="space-y-1">
            {data.rows.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between gap-2 p-2 rounded-md hover-elevate"
                data-testid={`row-blacklist-${e.id}`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Badge variant="secondary">{e.matchType}</Badge>
                  <span className="font-mono text-sm truncate">{e.value}</span>
                  {e.reason && <span className="text-xs text-muted-foreground truncate">— {e.reason}</span>}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onDelete(e.id)}
                  data-testid={`button-delete-${e.id}`}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
