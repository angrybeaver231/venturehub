import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import type { Startup } from "@shared/schema";

const STAGES = ["idea", "mvp", "seed", "seriesA", "seriesB", "growth", "scaleUp"] as const;

const STAGE_LABELS: Record<string, { en: string; ru: string }> = {
  idea: { en: "Idea", ru: "Идея" },
  mvp: { en: "MVP", ru: "MVP" },
  seed: { en: "Seed", ru: "Seed" },
  seriesA: { en: "Series A", ru: "Series A" },
  seriesB: { en: "Series B", ru: "Series B" },
  growth: { en: "Growth", ru: "Growth" },
  scaleUp: { en: "Scale-up", ru: "Scale-up" },
};

interface Props {
  startup: Startup;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StartupEditDialog({ startup, open, onOpenChange }: Props) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const ru = language === "ru";
  const [logoUploading, setLogoUploading] = useState(false);

  const [form, setForm] = useState({
    name: startup.name ?? "",
    description: startup.description ?? "",
    website: startup.website ?? "",
    vertical: startup.vertical ?? "",
    stage: startup.stage ?? "idea",
    techStack: startup.techStack ?? "",
    hqCity: startup.hqCity ?? "",
    teamSize: startup.teamSize?.toString() ?? "",
    pitchDeckUrl: startup.pitchDeckUrl ?? "",
    domain: startup.domain ?? "",
    githubRepoUrl: startup.githubRepoUrl ?? "",
    telegramChannel: startup.telegramChannel ?? "",
    hhEmployerId: startup.hhEmployerId ?? "",
    inn: startup.inn ?? "",
    universityAffiliation: startup.universityAffiliation ?? "",
    programAffiliation: startup.programAffiliation ?? "",
    appStore: (startup.appStoreIds as any)?.appStore ?? "",
    googlePlay: (startup.appStoreIds as any)?.googlePlay ?? "",
    ruStore: (startup.appStoreIds as any)?.ruStore ?? "",
  });

  useEffect(() => {
    if (open) {
      setForm({
        name: startup.name ?? "",
        description: startup.description ?? "",
        website: startup.website ?? "",
        vertical: startup.vertical ?? "",
        stage: startup.stage ?? "idea",
        techStack: startup.techStack ?? "",
        hqCity: startup.hqCity ?? "",
        teamSize: startup.teamSize?.toString() ?? "",
        pitchDeckUrl: startup.pitchDeckUrl ?? "",
        domain: startup.domain ?? "",
        githubRepoUrl: startup.githubRepoUrl ?? "",
        telegramChannel: startup.telegramChannel ?? "",
        hhEmployerId: startup.hhEmployerId ?? "",
        inn: startup.inn ?? "",
        universityAffiliation: startup.universityAffiliation ?? "",
        programAffiliation: startup.programAffiliation ?? "",
        appStore: (startup.appStoreIds as any)?.appStore ?? "",
        googlePlay: (startup.appStoreIds as any)?.googlePlay ?? "",
        ruStore: (startup.appStoreIds as any)?.ruStore ?? "",
      });
    }
  }, [open, startup]);

  const update = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      const body: any = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        website: form.website.trim() || null,
        vertical: form.vertical.trim() || null,
        stage: form.stage,
        techStack: form.techStack.trim() || null,
        hqCity: form.hqCity.trim() || null,
        teamSize: form.teamSize ? Number(form.teamSize) : null,
        pitchDeckUrl: form.pitchDeckUrl.trim() || null,
        domain: form.domain.trim() || null,
        githubRepoUrl: form.githubRepoUrl.trim() || null,
        telegramChannel: form.telegramChannel.trim() || null,
        hhEmployerId: form.hhEmployerId.trim() || null,
        inn: form.inn.trim() || null,
        universityAffiliation: form.universityAffiliation.trim() || null,
        programAffiliation: form.programAffiliation.trim() || null,
        appStoreIds: {
          appStore: form.appStore.trim() || undefined,
          googlePlay: form.googlePlay.trim() || undefined,
          ruStore: form.ruStore.trim() || undefined,
        },
      };
      const res = await apiRequest(`/api/startups/${startup.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: ru ? "Сохранено" : "Saved" });
      queryClient.invalidateQueries({ queryKey: ["/api/startups", startup.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/startups"] });
      onOpenChange(false);
    },
    onError: (e: any) =>
      toast({
        title: ru ? "Не удалось сохранить" : "Could not save",
        description: e?.message,
        variant: "destructive",
      }),
  });

  const uploadLogo = async (file: File) => {
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append("logo", file);
      const res = await fetch(`/api/startups/${startup.id}/logo`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || `HTTP ${res.status}`);
      }
      toast({ title: ru ? "Логотип обновлён" : "Logo updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/startups", startup.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/startups"] });
    } catch (e: any) {
      toast({
        title: ru ? "Ошибка загрузки" : "Upload error",
        description: e?.message,
        variant: "destructive",
      });
    } finally {
      setLogoUploading(false);
    }
  };

  const Field = ({ label, k, type = "text", placeholder }: { label: string; k: keyof typeof form; type?: string; placeholder?: string }) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type={type}
        value={form[k]}
        onChange={(e) => update(k, e.target.value)}
        placeholder={placeholder}
        data-testid={`input-edit-${k}`}
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-startup-edit">
        <DialogHeader>
          <DialogTitle>{ru ? "Редактировать стартап" : "Edit startup"}</DialogTitle>
          <DialogDescription>
            {ru
              ? "Любое поле можно менять. Вертикаль и стадия видны инвесторам."
              : "Edit any field. Vertical and stage are visible to investors."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <section className="space-y-3">
            <h4 className="text-sm font-semibold">{ru ? "Основное" : "Basics"}</h4>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label={ru ? "Название" : "Name"} k="name" />
              <Field label={ru ? "Вертикаль" : "Vertical"} k="vertical" placeholder="fintech, ai, edtech…" />
              <div className="space-y-1">
                <Label className="text-xs">{ru ? "Стадия" : "Stage"}</Label>
                <Select value={form.stage} onValueChange={(v) => update("stage", v)}>
                  <SelectTrigger data-testid="select-edit-stage"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAGES.map((s) => (
                      <SelectItem key={s} value={s}>{ru ? STAGE_LABELS[s].ru : STAGE_LABELS[s].en}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Field label={ru ? "Город" : "HQ city"} k="hqCity" />
              <Field label={ru ? "Сайт" : "Website"} k="website" placeholder="https://" />
              <Field label={ru ? "Размер команды" : "Team size"} k="teamSize" type="number" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{ru ? "Описание" : "Description"}</Label>
              <Textarea
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                rows={3}
                data-testid="input-edit-description"
              />
            </div>
            <Field label={ru ? "Tech-стек (через запятую)" : "Tech stack (comma-separated)"} k="techStack" />
            <Field label={ru ? "Ссылка на pitch deck" : "Pitch deck URL"} k="pitchDeckUrl" placeholder="https://" />
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-semibold">{ru ? "Логотип" : "Logo"}</h4>
            <div className="flex items-center gap-3">
              {startup.logo ? (
                <img src={startup.logo} alt="" className="h-12 w-12 rounded-md object-cover border" />
              ) : (
                <div className="h-12 w-12 rounded-md border bg-muted" />
              )}
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadLogo(f);
                  }}
                  disabled={logoUploading}
                  className="max-w-xs"
                  data-testid="input-edit-logo"
                />
                {logoUploading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-semibold">{ru ? "Публичные источники сигналов" : "Public signal sources"}</h4>
            <p className="text-xs text-muted-foreground">
              {ru
                ? "Заполните, что есть — по этим полям мы автоматически ищем упоминания и активность."
                : "Fill in what you have — we use these to auto-discover mentions and activity."}
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label={ru ? "Домен" : "Domain"} k="domain" placeholder="acme.com" />
              <Field label="GitHub repo URL" k="githubRepoUrl" placeholder="https://github.com/org/repo" />
              <Field label={ru ? "Telegram-канал" : "Telegram channel"} k="telegramChannel" placeholder="@channel" />
              <Field label="HH employer ID" k="hhEmployerId" />
              <Field label="ИНН / INN" k="inn" />
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label="App Store ID" k="appStore" />
              <Field label="Google Play ID" k="googlePlay" />
              <Field label="RuStore ID" k="ruStore" />
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-semibold">{ru ? "Принадлежность" : "Affiliation"}</h4>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label={ru ? "Университет" : "University"} k="universityAffiliation" />
              <Field label={ru ? "Программа / акселератор" : "Program / accelerator"} k="programAffiliation" />
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-edit-cancel">
            {ru ? "Отмена" : "Cancel"}
          </Button>
          <Button
            onClick={() => save.mutate()}
            disabled={save.isPending || !form.name.trim()}
            data-testid="button-edit-save"
          >
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (ru ? "Сохранить" : "Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
