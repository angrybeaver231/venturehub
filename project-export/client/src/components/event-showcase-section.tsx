import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronRight, Rocket, Check, Share2, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { isShowcaseEventType } from "@/lib/eventTypes";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { StartupShowcaseDialog } from "@/components/startup-showcase-dialog";
import { ShowcaseStartupManager } from "@/components/showcase-startup-manager";
import type { EventShowcaseStartup } from "@shared/schema";

// Deterministic gradient per startup name (vibrant, varied palette like the
// reference tile grid).
const TILE_GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-emerald-400 to-green-600",
  "from-orange-400 to-red-500",
  "from-blue-500 to-indigo-600",
  "from-fuchsia-500 to-purple-600",
  "from-teal-500 to-cyan-600",
  "from-amber-400 to-orange-500",
  "from-rose-500 to-pink-600",
];
function gradientFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return TILE_GRADIENTS[hash % TILE_GRADIENTS.length];
}

export function EventShowcaseSection({
  eventId,
  eventType,
  isAdmin = false,
  showcaseSlug = null,
}: {
  eventId: string;
  eventType?: string | null;
  isAdmin?: boolean;
  showcaseSlug?: string | null;
}) {
  const [activeStartup, setActiveStartup] = useState<EventShowcaseStartup | null>(null);
  const [copied, setCopied] = useState(false);
  const [slugInput, setSlugInput] = useState(showcaseSlug ?? "");
  const [currentSlug, setCurrentSlug] = useState<string | null>(showcaseSlug);
  const { language } = useLanguage();
  const ru = language === "ru";
  const { toast } = useToast();

  const showcase = isShowcaseEventType(eventType);

  const publicPath = currentSlug || eventId;
  const publicUrl = `${window.location.origin}/showcase/${publicPath}`;

  const copyPublicLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: ru ? "Ссылка скопирована" : "Link copied",
        description: ru
          ? "Любой может открыть её без регистрации."
          : "Anyone can open it without signing in.",
      });
    } catch {
      toast({
        title: ru ? "Не удалось скопировать" : "Copy failed",
        description: publicUrl,
        variant: "destructive",
      });
    }
  };

  const slugMutation = useMutation({
    mutationFn: async (slug: string) => {
      const res = await apiRequest(
        `/api/events/${eventId}/showcase-slug`,
        { method: "PATCH", body: JSON.stringify({ slug }) },
      );
      return (await res.json()) as { showcaseSlug: string | null };
    },
    onSuccess: (data) => {
      setCurrentSlug(data.showcaseSlug);
      setSlugInput(data.showcaseSlug ?? "");
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({
        title: ru ? "Ссылка обновлена" : "Link updated",
        description: data.showcaseSlug
          ? `${window.location.origin}/showcase/${data.showcaseSlug}`
          : ru
            ? "Используется ссылка по умолчанию."
            : "Now using the default link.",
      });
    },
    onError: (err: any) => {
      // apiRequest throws "<status>: <body>"; pull out the server message.
      let description = ru ? "Попробуйте другую ссылку." : "Try another link.";
      const raw = String(err?.message ?? "");
      const jsonStart = raw.indexOf("{");
      if (jsonStart >= 0) {
        try {
          const parsed = JSON.parse(raw.slice(jsonStart));
          if (parsed?.message) description = parsed.message;
        } catch {
          /* keep default */
        }
      }
      toast({
        title: ru ? "Не удалось сохранить" : "Could not save",
        description,
        variant: "destructive",
      });
    },
  });

  const { data: lineup = [] } = useQuery<EventShowcaseStartup[]>({
    queryKey: ["/api/events", eventId, "startups"],
    queryFn: async () => {
      const response = await fetch(`/api/events/${eventId}/startups`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: showcase,
    staleTime: 30_000,
  });

  if (!showcase || (lineup.length === 0 && !isAdmin)) return null;

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-2xl font-semibold" data-testid={`heading-lineup-${eventId}`}>
            {language === "ru" ? "Проекты-участники" : "Participating projects"}
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            {lineup.length > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    data-testid={`button-share-showcase-${eventId}`}
                  >
                    <Share2 className="h-4 w-4 mr-1" />
                    {ru ? "Публичная ссылка" : "Public link"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      {ru ? "Публичная ссылка" : "Public link"}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        readOnly
                        value={publicUrl}
                        className="text-xs"
                        onFocus={(e) => e.currentTarget.select()}
                        data-testid={`input-public-url-${eventId}`}
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={copyPublicLink}
                        aria-label={ru ? "Скопировать" : "Copy"}
                        data-testid={`button-copy-showcase-${eventId}`}
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="space-y-1.5 border-t pt-3">
                      <Label
                        htmlFor={`slug-input-${eventId}`}
                        className="text-xs text-muted-foreground"
                      >
                        {ru ? "Своя короткая ссылка" : "Custom short link"}
                      </Label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground shrink-0">
                          /showcase/
                        </span>
                        <Input
                          id={`slug-input-${eventId}`}
                          value={slugInput}
                          onChange={(e) => setSlugInput(e.target.value)}
                          placeholder={ru ? "например, demo-day" : "e.g. demo-day"}
                          className="text-xs"
                          data-testid={`input-showcase-slug-${eventId}`}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="text-[11px] text-muted-foreground">
                          {ru
                            ? "Буквы, цифры и дефис."
                            : "Letters, numbers and hyphens."}
                        </p>
                        <Button
                          size="sm"
                          onClick={() => slugMutation.mutate(slugInput.trim())}
                          disabled={
                            slugMutation.isPending ||
                            slugInput.trim() === (currentSlug ?? "")
                          }
                          data-testid={`button-save-slug-${eventId}`}
                        >
                          {ru ? "Сохранить" : "Save"}
                        </Button>
                      </div>
                      {currentSlug && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full"
                          onClick={() => slugMutation.mutate("")}
                          disabled={slugMutation.isPending}
                          data-testid={`button-clear-slug-${eventId}`}
                        >
                          {ru ? "Сбросить на ссылку по умолчанию" : "Reset to default link"}
                        </Button>
                      )}
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            )}
            {isAdmin && <ShowcaseStartupManager eventId={eventId} startups={lineup} />}
          </div>
        </div>
        {lineup.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" data-testid={`section-lineup-${eventId}`}>
            {lineup.map((s) => (
              <button
                key={s.id}
                className="text-left rounded-md border bg-card flex flex-col overflow-hidden hover-elevate active-elevate-2"
                onClick={() => setActiveStartup(s)}
                data-testid={`button-startup-${eventId}-${s.id}`}
              >
                {s.coverImageUrl && (
                  <img
                    src={s.coverImageUrl}
                    alt=""
                    className="w-full h-24 object-cover"
                    data-testid={`img-startup-cover-${s.id}`}
                  />
                )}
                <div className="p-3 flex flex-col gap-3 flex-1">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "h-10 w-10 rounded-md bg-gradient-to-br flex items-center justify-center shrink-0 overflow-hidden",
                      gradientFor(s.name)
                    )}
                  >
                    {s.logoUrl ? (
                      <img src={s.logoUrl} alt={s.name} className="h-full w-full object-cover" />
                    ) : (
                      <Rocket className="h-5 w-5 text-white" />
                    )}
                  </div>
                  <div className="text-base font-bold text-foreground truncate min-w-0 flex-1">
                    {s.name}
                  </div>
                </div>
                {s.shortDescription && (
                  <p
                    className="text-sm text-foreground/80 line-clamp-2"
                    data-testid={`text-startup-short-${s.id}`}
                  >
                    {s.shortDescription}
                  </p>
                )}
                <div className="flex items-center justify-between gap-2 mt-auto">
                  {s.sector ? (
                    <Badge variant="outline" className="max-w-full">
                      <span className="truncate">{s.sector}</span>
                    </Badge>
                  ) : (
                    <span />
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {language === "ru" ? "Пока нет добавленных проектов." : "No projects added yet."}
          </p>
        )}
      </CardContent>
      <StartupShowcaseDialog
        startup={activeStartup}
        open={!!activeStartup}
        onOpenChange={(open) => !open && setActiveStartup(null)}
      />
    </Card>
  );
}
