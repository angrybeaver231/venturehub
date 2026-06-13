import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Pencil, Plug, HelpCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  startupName: string;
  canEdit: boolean;
  onEdit: () => void;
  onShowTour: () => void;
  onOpenIntegrations: () => void;
}

function greeting(language: string, name: string) {
  const ru = language === "ru";
  const hour = new Date().getHours();
  let timeOfDay: string;
  if (hour < 5) timeOfDay = ru ? "Доброй ночи" : "Good night";
  else if (hour < 12) timeOfDay = ru ? "Доброе утро" : "Good morning";
  else if (hour < 18) timeOfDay = ru ? "Добрый день" : "Good afternoon";
  else timeOfDay = ru ? "Добрый вечер" : "Good evening";
  return ru ? `${timeOfDay}, ${name}!` : `${timeOfDay}, ${name}!`;
}

function subtitleFor(language: string, startup: string) {
  const ru = language === "ru";
  return ru
    ? `Вот что происходит в ${startup} сегодня`
    : `Here's what's happening at ${startup} today`;
}

export function FounderHeroBar({
  startupName,
  canEdit,
  onEdit,
  onShowTour,
  onOpenIntegrations,
}: Props) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const ru = language === "ru";

  const firstName =
    (user as any)?.firstName ||
    (user as any)?.name?.split(" ")?.[0] ||
    (user as any)?.email?.split("@")?.[0] ||
    (ru ? "Фаундер" : "Founder");

  const initials =
    firstName
      .split(/\s+/)
      .map((p: string) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "F";

  return (
    <Card className="overflow-hidden" data-testid="card-founder-hero">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 min-w-0">
          <Avatar className="h-12 w-12 shrink-0">
            <AvatarImage src={(user as any)?.profileImageUrl ?? undefined} />
            <AvatarFallback className="bg-primary/15 text-primary text-sm font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground" data-testid="text-hero-eyebrow">
              {ru ? "Привет," : "Hello,"} {firstName}
            </p>
            <h1
              className="text-2xl font-semibold leading-tight sm:text-3xl"
              data-testid="text-hero-greeting"
            >
              {greeting(language, firstName)}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground" data-testid="text-hero-subtitle">
              {subtitleFor(language, startupName)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={onShowTour}
            data-testid="button-hero-tour"
          >
            <HelpCircle className="h-4 w-4 mr-2" />
            {ru ? "Тур" : "Tour"}
          </Button>
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              data-testid="button-hero-edit"
            >
              <Pencil className="h-4 w-4 mr-2" />
              {ru ? "Редактировать" : "Edit"}
            </Button>
          )}
          <Button
            variant="default"
            size="sm"
            onClick={onOpenIntegrations}
            data-testid="button-hero-integrations"
          >
            <Plug className="h-4 w-4 mr-2" />
            {ru ? "Интеграции" : "Integrations"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
