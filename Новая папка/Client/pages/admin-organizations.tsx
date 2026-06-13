import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Building2,
  Search,
  GitMerge,
  Users,
  ArrowRight,
  Shield,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type OrgRow = {
  organizationName: string;
  organizationType: string | null;
  userCount: number;
};

export default function AdminOrganizations() {
  const { toast } = useToast();
  const { language } = useLanguage();
  const ru = language === "ru";

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [targetName, setTargetName] = useState("");
  const [targetType, setTargetType] = useState<string>("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: organizations = [], isLoading, error } = useQuery<OrgRow[]>({
    queryKey: ["/api/admin/organizations"],
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return organizations;
    return organizations.filter(
      (o) =>
        o.organizationName.toLowerCase().includes(q) ||
        (o.organizationType || "").toLowerCase().includes(q),
    );
  }, [organizations, search]);

  const selectedRows = useMemo(
    () => organizations.filter((o) => selected.has(o.organizationName)),
    [organizations, selected],
  );

  const totalAffected = selectedRows.reduce((s, r) => s + r.userCount, 0);

  const orgTypes = useMemo(() => {
    const set = new Set<string>();
    for (const o of organizations) if (o.organizationType) set.add(o.organizationType);
    return Array.from(set).sort();
  }, [organizations]);

  const toggle = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const useAsTarget = (row: OrgRow) => {
    setTargetName(row.organizationName);
    if (row.organizationType) setTargetType(row.organizationType);
    if (!selected.has(row.organizationName)) toggle(row.organizationName);
  };

  const mergeMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/admin/organizations/merge", {
        method: "POST",
        body: JSON.stringify({
          sourceNames: Array.from(selected),
          targetName: targetName.trim(),
          targetType: targetType || null,
        }),
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: ru ? "Объединено" : "Merged",
        description: data?.message
          ? `${data.message} · ${data.updatedUsers ?? 0} ${
              ru ? "пользователей обновлено" : "users updated"
            }`
          : ru
          ? "Организации объединены"
          : "Organizations merged",
      });
      setSelected(new Set());
      setTargetName("");
      setTargetType("");
      setConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/organizations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/registrations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
    },
    onError: (e: any) => {
      toast({
        title: ru ? "Ошибка" : "Error",
        description: e?.message || (ru ? "Не удалось объединить" : "Merge failed"),
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen p-3 sm:p-6 md:p-8">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="h-9 w-64 bg-muted rounded-md animate-pulse" />
          <div className="h-96 bg-muted rounded-md animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    const msg = (error as any)?.message || "";
    const isAuthError = /\b(401|403)\b/.test(msg);
    return (
      <div className="min-h-screen p-3 sm:p-6 md:p-8">
        <div className="max-w-5xl mx-auto">
          <Card className="bg-destructive/10 border-destructive/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Shield className="w-6 h-6" />
                {isAuthError
                  ? ru
                    ? "Доступ запрещён"
                    : "Access Denied"
                  : ru
                  ? "Не удалось загрузить данные"
                  : "Could not load data"}
              </CardTitle>
              <CardDescription>
                {isAuthError
                  ? ru
                    ? "Только Head Admin может объединять организации."
                    : "Only Head Admin can merge organizations."
                  : ru
                  ? "Попробуйте обновить страницу."
                  : "Please try refreshing."}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  const targetExists = organizations.some(
    (o) => o.organizationName === targetName.trim(),
  );
  const canMerge =
    selected.size > 0 &&
    targetName.trim().length > 0 &&
    !mergeMutation.isPending;

  return (
    <div className="min-h-screen p-3 sm:p-6 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <div className="text-xs text-muted-foreground mb-1">
            {ru ? "Админ / Организации" : "Admin / Organizations"}
          </div>
          <h1
            className="text-2xl sm:text-3xl font-bold flex items-center gap-2"
            data-testid="text-page-title"
          >
            <Building2 className="h-7 w-7 text-primary" />
            {ru ? "Объединение организаций" : "Merge Organizations"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
            {ru
              ? "Выберите две или более организаций, представляющих одну и ту же сущность, укажите итоговое название — и все пользователи будут перепривязаны."
              : "Pick two or more organization names that represent the same entity, set the canonical name, and every user will be re-linked to it."}
          </p>
        </div>

        {/* Selection card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="text-base">
                  {ru ? "Все организации" : "All organizations"}
                </CardTitle>
                <CardDescription>
                  {organizations.length}{" "}
                  {ru ? "уникальных названий" : "unique names"} ·{" "}
                  {selected.size} {ru ? "выбрано" : "selected"}
                </CardDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="search"
                  placeholder={
                    ru ? "Поиск организации..." : "Search organization..."
                  }
                  className="pl-8 w-[260px]"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  data-testid="input-search-org"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>{ru ? "Название" : "Name"}</TableHead>
                    <TableHead>{ru ? "Тип" : "Type"}</TableHead>
                    <TableHead className="text-right">
                      {ru ? "Пользователей" : "Users"}
                    </TableHead>
                    <TableHead className="text-right pr-4"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-muted-foreground py-12"
                      >
                        {ru ? "Организации не найдены" : "No organizations found"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((org) => {
                      const isSelected = selected.has(org.organizationName);
                      const isTarget =
                        targetName.trim() === org.organizationName;
                      return (
                        <TableRow
                          key={org.organizationName}
                          className={cn(isTarget && "bg-primary/5")}
                          data-testid={`row-org-${org.organizationName}`}
                        >
                          <TableCell>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggle(org.organizationName)}
                              data-testid={`check-org-${org.organizationName}`}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-medium text-sm truncate max-w-[320px]">
                                {org.organizationName}
                              </span>
                              {isTarget && (
                                <Badge variant="default" className="shrink-0">
                                  {ru ? "Цель" : "Target"}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {org.organizationType ? (
                              <Badge variant="outline" className="font-normal">
                                {org.organizationType}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            <span className="inline-flex items-center gap-1.5 text-sm">
                              <Users className="h-3.5 w-3.5 text-muted-foreground" />
                              {org.userCount}
                            </span>
                          </TableCell>
                          <TableCell className="text-right pr-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => useAsTarget(org)}
                              data-testid={`button-use-target-${org.organizationName}`}
                            >
                              {ru ? "Сделать целью" : "Use as target"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Merge action card */}
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <GitMerge className="h-5 w-5 text-primary" />
              {ru ? "Итоговая организация" : "Canonical organization"}
            </CardTitle>
            <CardDescription>
              {ru
                ? "Все выбранные названия будут заменены на это значение."
                : "Every selected name will be replaced with this value."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="target-name">
                  {ru ? "Название" : "Canonical name"}
                </Label>
                <Input
                  id="target-name"
                  value={targetName}
                  onChange={(e) => setTargetName(e.target.value)}
                  placeholder={
                    ru
                      ? "Например: Финансовый университет при Правительстве РФ"
                      : "e.g. Financial University under the Government of RF"
                  }
                  data-testid="input-target-name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="target-type">
                  {ru ? "Тип (опционально)" : "Type (optional)"}
                </Label>
                <Select
                  value={targetType || "__keep__"}
                  onValueChange={(v) => setTargetType(v === "__keep__" ? "" : v)}
                >
                  <SelectTrigger id="target-type" data-testid="select-target-type">
                    <SelectValue
                      placeholder={ru ? "Не менять" : "Keep existing"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__keep__">
                      {ru ? "Не менять" : "Keep existing"}
                    </SelectItem>
                    {orgTypes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selected.size > 0 && (
              <div className="rounded-md border bg-background p-3 space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {ru ? "Что произойдёт" : "Preview"}
                </div>
                <div className="flex flex-col gap-1.5">
                  {selectedRows.map((r) => (
                    <div
                      key={r.organizationName}
                      className="flex items-center gap-2 text-sm flex-wrap"
                    >
                      <span className="truncate max-w-[260px]">
                        {r.organizationName}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        ({r.userCount})
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="font-medium truncate max-w-[260px]">
                        {targetName.trim() || (ru ? "(не задано)" : "(unset)")}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground pt-1 border-t mt-2">
                  {ru ? "Будет затронуто" : "Will affect"}{" "}
                  <span className="font-semibold tabular-nums">
                    {totalAffected}
                  </span>{" "}
                  {ru ? "пользователей" : "users"}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setSelected(new Set());
                  setTargetName("");
                  setTargetType("");
                }}
                disabled={selected.size === 0 && !targetName}
                data-testid="button-clear"
              >
                {ru ? "Очистить" : "Clear"}
              </Button>
              <Button
                onClick={() => setConfirmOpen(true)}
                disabled={!canMerge}
                className="gap-2"
                data-testid="button-merge"
              >
                <GitMerge className="h-4 w-4" />
                {ru ? "Объединить" : "Merge"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Confirm dialog */}
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                {ru ? "Подтвердите объединение" : "Confirm merge"}
              </DialogTitle>
              <DialogDescription>
                {ru
                  ? `Вы собираетесь переименовать ${selected.size} организацию(й) в «${targetName.trim()}». Это затронет ${totalAffected} пользователей. Действие нельзя отменить автоматически.`
                  : `You are about to rename ${selected.size} organization(s) into "${targetName.trim()}". This will affect ${totalAffected} users. This cannot be auto-undone.`}
              </DialogDescription>
            </DialogHeader>
            {!targetExists && (
              <div className="rounded-md bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-700 dark:text-amber-300">
                {ru
                  ? "Эта целевая организация ещё не существует — она будет создана как новое каноническое название."
                  : "This target organization name does not exist yet — it will be created as the new canonical name."}
              </div>
            )}
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setConfirmOpen(false)}
                data-testid="button-cancel-merge"
              >
                {ru ? "Отмена" : "Cancel"}
              </Button>
              <Button
                onClick={() => mergeMutation.mutate()}
                disabled={mergeMutation.isPending}
                data-testid="button-confirm-merge"
              >
                {mergeMutation.isPending
                  ? ru
                    ? "Объединение..."
                    : "Merging..."
                  : ru
                  ? "Да, объединить"
                  : "Yes, merge"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
