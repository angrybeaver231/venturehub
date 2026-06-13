import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/LanguageContext";
import { Sparkles, Plug, Activity, ListChecks, Pencil, Rocket } from "lucide-react";

const STORAGE_KEY = (id: string) => `ventorix-startup-tour-${id}`;

interface Step {
  icon: JSX.Element;
  titleEn: string;
  titleRu: string;
  bodyEn: string;
  bodyRu: string;
}

const STEPS: Step[] = [
  {
    icon: <Rocket className="h-6 w-6 text-primary" />,
    titleEn: "Welcome to your startup workspace",
    titleRu: "Добро пожаловать в рабочее пространство стартапа",
    bodyEn: "This is your founder cockpit. Everything investors will see — your team, traction, and live signals — lives here.",
    bodyRu: "Это кабинет фаундера. Здесь живёт всё, что увидят инвесторы — команда, метрики, живые сигналы.",
  },
  {
    icon: <Plug className="h-6 w-6 text-primary" />,
    titleEn: "Connect your tools — once",
    titleRu: "Подключите инструменты — один раз",
    bodyEn: "Click 'Integrations' to plug in GitHub, your bank, payment gateway, analytics. We pull data automatically — no weekly updates required.",
    bodyRu: "Нажмите «Интеграции», чтобы подключить GitHub, банк, эквайринг и аналитику. Мы тянем данные автоматически — никаких еженедельных отчётов.",
  },
  {
    icon: <Activity className="h-6 w-6 text-primary" />,
    titleEn: "Your Vitality Score updates daily",
    titleRu: "Vitality Score обновляется ежедневно",
    bodyEn: "A 0–100 health score combining tech activity, team health, market presence, financial health, and legal hygiene. Refreshes every night.",
    bodyRu: "Шкала 0–100, объединяющая код, команду, медиа-присутствие, финансы и юр-гигиену. Пересчёт каждую ночь.",
  },
  {
    icon: <ListChecks className="h-6 w-6 text-primary" />,
    titleEn: "All events in one timeline",
    titleRu: "Все события в одной ленте",
    bodyEn: "Commits, fundings, hires, mentions in media — every signal lands in the unified timeline. Filter by category, source, or severity.",
    bodyRu: "Коммиты, раунды, найм, упоминания в медиа — каждый сигнал попадает в единую ленту. Фильтры по категории, источнику и важности.",
  },
  {
    icon: <Pencil className="h-6 w-6 text-primary" />,
    titleEn: "Edit anything, anytime",
    titleRu: "Редактируйте что угодно и когда угодно",
    bodyEn: "Use the 'Edit' button on the header to update name, vertical, stage, website, team size — anything about your startup.",
    bodyRu: "Кнопка «Редактировать» в шапке позволяет менять название, вертикаль, стадию, сайт, размер команды — любую информацию.",
  },
];

interface Props {
  startupId: string;
  /** Force-open via parent (e.g. menu "Show tour again") */
  forceOpen?: boolean;
  onClose?: () => void;
}

export function StartupOnboardingTour({ startupId, forceOpen, onClose }: Props) {
  const { language } = useLanguage();
  const [, navigate] = useLocation();
  const ru = language === "ru";
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (forceOpen) {
      setStep(0);
      setOpen(true);
      return;
    }
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem(STORAGE_KEY(startupId));
    if (!seen) setOpen(true);
  }, [startupId, forceOpen]);

  const finish = (action?: "integrations" | "edit") => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY(startupId), new Date().toISOString());
    }
    setOpen(false);
    setStep(0);
    onClose?.();
    if (action === "integrations") navigate(`/startups/${startupId}/integrations`);
  };

  const cur = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const progress = Math.round(((step + 1) / STEPS.length) * 100);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) finish(); }}>
      <DialogContent className="sm:max-w-lg" data-testid="dialog-startup-onboarding">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground" data-testid="text-onboarding-step">
              {ru ? "Шаг" : "Step"} {step + 1} / {STEPS.length}
            </span>
          </div>
          <Progress value={progress} className="h-1" />
          <div className="flex items-center gap-3 pt-2">
            {cur.icon}
            <DialogTitle data-testid="text-onboarding-title">
              {ru ? cur.titleRu : cur.titleEn}
            </DialogTitle>
          </div>
        </DialogHeader>
        <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-onboarding-body">
          {ru ? cur.bodyRu : cur.bodyEn}
        </p>
        <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => finish()}
            data-testid="button-onboarding-skip"
          >
            {ru ? "Пропустить" : "Skip"}
          </Button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep((s) => s - 1)}
                data-testid="button-onboarding-back"
              >
                {ru ? "Назад" : "Back"}
              </Button>
            )}
            {!isLast && (
              <Button
                size="sm"
                onClick={() => setStep((s) => s + 1)}
                data-testid="button-onboarding-next"
              >
                {ru ? "Далее" : "Next"}
              </Button>
            )}
            {isLast && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => finish()}
                  data-testid="button-onboarding-done"
                >
                  {ru ? "Готово" : "Done"}
                </Button>
                <Button
                  size="sm"
                  onClick={() => finish("integrations")}
                  data-testid="button-onboarding-go-integrations"
                >
                  {ru ? "К интеграциям" : "Go to integrations"}
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
