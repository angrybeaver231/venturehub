import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Bookmark,
  Plus,
  Trash2,
  Star,
  Bell,
  CalendarDays,
  Zap,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Watchlist, Startup } from "@shared/schema";

type Cadence = "daily" | "weekly" | "on_event";
type WatchlistWithCount = Watchlist & { startupCount: number };
type WatchlistStartupItem = {
  id: string;
  startupId: string;
  addedAt: string | null;
  startup: Startup;
};

const CADENCE_ICON: Record<Cadence, JSX.Element> = {
  daily: <CalendarDays className="h-3 w-3" />,
  weekly: <Bell className="h-3 w-3" />,
  on_event: <Zap className="h-3 w-3" />,
};

interface Props {
  /**
   * Optional context label shown in the panel header — e.g. an investor's name.
   * When provided, the panel renders a workspace-scoped header with a Bookmark icon
   * instead of being completely chrome-less.
   */
  contextLabel?: string;
  /**
   * If true, the inner cards (left column) and detail (right column) render in a
   * compact two-column layout that fits inside an existing card body. Default true.
   */
  embedded?: boolean;
}

export function WatchlistsPanel({ contextLabel, embedded = true }: Props) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const ru = language === "ru";
  const userId = (user as any)?.id;

  const cadenceLabel = (c: Cadence): string => {
    if (ru) {
      return c === "daily"
        ? "Ежедневно (10:00 МСК)"
        : c === "weekly"
          ? "Еженедельно (пн 09:00 МСК)"
          : "Мгновенно при критических событиях";
    }
    return c === "daily"
      ? "Daily (10:00 MSK)"
      : c === "weekly"
        ? "Weekly (Mon 09:00 MSK)"
        : "Instantly on critical signals";
  };

  const { data: watchlists = [], isLoading } = useQuery<WatchlistWithCount[]>({
    queryKey: ["/api/watchlists"],
    enabled: !!userId,
  });

  const { data: startups = [] } = useQuery<Startup[]>({
    queryKey: ["/api/startups"],
    enabled: !!userId,
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeId = selectedId ?? watchlists[0]?.id ?? null;
  const activeWatchlist = watchlists.find((w) => w.id === activeId);

  const { data: items = [] } = useQuery<WatchlistStartupItem[]>({
    queryKey: ["/api/watchlists", activeId, "startups"],
    enabled: !!activeId,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [createCadence, setCreateCadence] = useState<Cadence>("weekly");
  const [pickerStartup, setPickerStartup] = useState<string>("");

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/api/watchlists", {
        method: "POST",
        body: JSON.stringify({ name, userId, cadence: createCadence }),
      });
      return res.json();
    },
    onSuccess: (created: Watchlist) => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlists"] });
      setCreateOpen(false);
      setName("");
      setCreateCadence("weekly");
      setSelectedId(created.id);
      toast({ title: ru ? "Список создан" : "Watchlist created" });
    },
  });

  const deleteListMutation = useMutation({
    mutationFn: async (id: string) =>
      apiRequest(`/api/watchlists/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlists"] });
      setSelectedId(null);
    },
  });

  const updateCadenceMutation = useMutation({
    mutationFn: async (cadence: Cadence) => {
      if (!activeId) return;
      await apiRequest(`/api/watchlists/${activeId}`, {
        method: "PATCH",
        body: JSON.stringify({ cadence }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlists"] });
      toast({ title: ru ? "Расписание обновлено" : "Cadence updated" });
    },
  });

  const addStartupMutation = useMutation({
    mutationFn: async () => {
      if (!activeId || !pickerStartup) return;
      await apiRequest(`/api/watchlists/${activeId}/startups`, {
        method: "POST",
        body: JSON.stringify({ startupId: pickerStartup }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/watchlists", activeId, "startups"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/watchlists"] });
      setPickerStartup("");
    },
  });

  const removeStartupMutation = useMutation({
    mutationFn: async (startupId: string) => {
      await apiRequest(`/api/watchlists/${activeId}/startups/${startupId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/watchlists", activeId, "startups"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/watchlists"] });
    },
  });

  const header = (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Bookmark className={embedded ? "h-5 w-5 text-primary" : "h-8 w-8"} />
          <h2
            className={embedded ? "text-lg font-semibold" : "text-3xl font-bold"}
            data-testid="text-watchlists-title"
          >
            {ru ? "Списки наблюдения" : "Watchlists"}
          </h2>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {contextLabel
            ? ru
              ? `Рабочее пространство: ${contextLabel}. Списки видны только вам.`
              : `Workspace: ${contextLabel}. Lists are visible only to you.`
            : ru
              ? "Выберите расписание дайджеста: ежедневно, еженедельно или мгновенно при критических событиях."
              : "Pick the digest cadence per list: daily, weekly, or instantly on critical events."}
        </p>
      </div>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogTrigger asChild>
          <Button size="sm" data-testid="button-create-watchlist">
            <Plus className="h-4 w-4 mr-2" />
            {ru ? "Новый список" : "New list"}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{ru ? "Новый список" : "New watchlist"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder={ru ? "Например, FinTech Russia" : "e.g. FinTech Russia"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="input-watchlist-name"
            />
            <div>
              <label className="text-sm font-medium mb-1 block">
                {ru ? "Расписание дайджеста" : "Digest cadence"}
              </label>
              <Select
                value={createCadence}
                onValueChange={(v) => setCreateCadence(v as Cadence)}
              >
                <SelectTrigger data-testid="select-create-cadence">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{cadenceLabel("daily")}</SelectItem>
                  <SelectItem value="weekly">{cadenceLabel("weekly")}</SelectItem>
                  <SelectItem value="on_event">{cadenceLabel("on_event")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              {ru ? "Отмена" : "Cancel"}
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!name || createMutation.isPending}
              data-testid="button-save-watchlist"
            >
              {ru ? "Сохранить" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  const body = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="md:col-span-1 space-y-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">
            {ru ? "Загрузка…" : "Loading…"}
          </p>
        ) : watchlists.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              {ru ? "Создайте первый список наблюдения." : "Create your first watchlist."}
            </CardContent>
          </Card>
        ) : (
          watchlists.map((wl) => {
            const cad = ((wl as any).cadence ?? "weekly") as Cadence;
            return (
              <Card
                key={wl.id}
                onClick={() => setSelectedId(wl.id)}
                className={`cursor-pointer hover-elevate ${activeId === wl.id ? "border-primary" : ""}`}
                data-testid={`card-watchlist-${wl.id}`}
              >
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 py-3">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-sm" data-testid={`text-wl-name-${wl.id}`}>
                      {wl.name}
                    </CardTitle>
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      <Badge variant="secondary" className="text-[10px]">
                        {wl.startupCount} {ru ? "стартапов" : "startups"}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-[10px] inline-flex items-center gap-1"
                        data-testid={`badge-wl-cadence-${wl.id}`}
                      >
                        {CADENCE_ICON[cad]}
                        {cad === "daily"
                          ? ru
                            ? "ежедн."
                            : "daily"
                          : cad === "weekly"
                            ? ru
                              ? "еженед."
                              : "weekly"
                            : ru
                              ? "мгновенно"
                              : "on event"}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (
                        confirm(ru ? "Удалить список?" : "Delete this watchlist?")
                      )
                        deleteListMutation.mutate(wl.id);
                    }}
                    data-testid={`button-delete-wl-${wl.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardHeader>
              </Card>
            );
          })
        )}
      </div>

      <div className="md:col-span-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle className="text-base">
                {activeId
                  ? activeWatchlist?.name ?? (ru ? "Стартапы" : "Startups")
                  : ru
                    ? "Выберите список"
                    : "Pick a watchlist"}
              </CardTitle>
              {activeId && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Select
                    value={((activeWatchlist as any)?.cadence ?? "weekly") as Cadence}
                    onValueChange={(v) => updateCadenceMutation.mutate(v as Cadence)}
                  >
                    <SelectTrigger
                      className="w-[230px]"
                      data-testid="select-active-cadence"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">{cadenceLabel("daily")}</SelectItem>
                      <SelectItem value="weekly">{cadenceLabel("weekly")}</SelectItem>
                      <SelectItem value="on_event">{cadenceLabel("on_event")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={pickerStartup} onValueChange={setPickerStartup}>
                    <SelectTrigger
                      className="w-[220px]"
                      data-testid="select-add-startup"
                    >
                      <SelectValue
                        placeholder={ru ? "Добавить стартап" : "Add startup"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {startups
                        .filter((s) => !items.some((it) => it.startupId === s.id))
                        .map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => addStartupMutation.mutate()}
                    disabled={!pickerStartup || addStartupMutation.isPending}
                    data-testid="button-add-startup-to-wl"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!activeId ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                {ru ? "Список не выбран" : "No list selected"}
              </div>
            ) : items.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                <Star className="h-10 w-10 mx-auto mb-3 opacity-40" />
                {ru
                  ? "Пока пусто. Добавьте стартап выше."
                  : "Empty. Add a startup using the picker above."}
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((it) => (
                  <li
                    key={it.id}
                    className="flex items-center justify-between py-3"
                    data-testid={`row-wl-startup-${it.startupId}`}
                  >
                    <div className="min-w-0">
                      <div
                        className="text-sm font-medium"
                        data-testid={`text-wl-startup-name-${it.startupId}`}
                      >
                        {it.startup.name}
                      </div>
                      {(it.startup as any).vertical && (
                        <Badge variant="secondary" className="text-[10px] mt-1">
                          {(it.startup as any).vertical}
                        </Badge>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeStartupMutation.mutate(it.startupId)}
                      data-testid={`button-remove-wl-startup-${it.startupId}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="space-y-4" data-testid="panel-watchlists">
      {header}
      {body}
    </div>
  );
}
