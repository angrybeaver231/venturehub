import { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, MapPin, Clock, Rocket, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { StartupShowcaseDialog } from "@/components/startup-showcase-dialog";
import type { PublicShowcaseResponse, PublicShowcaseStartup, EventShowcaseStartup } from "@shared/schema";

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
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default function PublicShowcase() {
  const { id } = useParams<{ id: string }>();
  const { language } = useLanguage();
  const ru = language === "ru";
  const [activeStartup, setActiveStartup] = useState<PublicShowcaseStartup | null>(null);

  const { data, isLoading, isError } = useQuery<PublicShowcaseResponse>({
    queryKey: ["/api/public/events", id, "showcase"],
    queryFn: async () => {
      const response = await fetch(`/api/public/events/${id}/showcase`);
      if (!response.ok) throw new Error("not found");
      return response.json();
    },
    enabled: !!id,
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-2 bg-background px-4 text-center">
        <h1 className="text-2xl font-semibold" data-testid="text-showcase-not-found">
          {ru ? "Витрина не найдена" : "Showcase not found"}
        </h1>
        <p className="text-muted-foreground">
          {ru
            ? "Эта ссылка недействительна или мероприятие больше не доступно."
            : "This link is invalid or the event is no longer available."}
        </p>
      </div>
    );
  }

  const { event, startups } = data;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative">
        {event.customImage ? (
          <img
            src={event.customImage}
            alt=""
            className="w-full h-56 md:h-72 object-cover"
            data-testid="img-event-cover"
          />
        ) : (
          <div className="w-full h-40 md:h-52 bg-gradient-to-br from-amber-400 to-orange-600" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
        <div className="absolute inset-x-0 bottom-0 p-6 md:p-10">
          <div className="max-w-5xl mx-auto">
            <h1
              className="text-3xl md:text-4xl font-bold text-white drop-shadow-sm"
              data-testid="text-event-name"
            >
              {event.name}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/90">
              {event.date && (
                <span className="inline-flex items-center gap-1.5" data-testid="text-event-date">
                  <Calendar className="h-4 w-4" />
                  {event.date}
                </span>
              )}
              {event.time && (
                <span className="inline-flex items-center gap-1.5" data-testid="text-event-time">
                  <Clock className="h-4 w-4" />
                  {event.time}
                </span>
              )}
              {event.location && (
                <span className="inline-flex items-center gap-1.5" data-testid="text-event-location">
                  <MapPin className="h-4 w-4" />
                  {event.location}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 md:py-10 space-y-8">
        {event.description && (
          <p className="text-base leading-relaxed text-foreground/90 whitespace-pre-line">
            {event.description}
          </p>
        )}

        <div>
          <h2 className="text-2xl font-semibold mb-4" data-testid="heading-public-lineup">
            {ru ? "Проекты-участники" : "Participating projects"}
          </h2>

          {startups.length === 0 ? (
            <p className="text-muted-foreground">
              {ru ? "Проекты пока не добавлены." : "No projects yet."}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" data-testid="section-public-lineup">
              {startups.map((s) => (
                <button
                  key={s.id}
                  className="text-left rounded-md border bg-card flex flex-col overflow-hidden hover-elevate active-elevate-2"
                  onClick={() => setActiveStartup(s)}
                  data-testid={`button-public-startup-${s.id}`}
                >
                  {s.coverImageUrl && (
                    <img
                      src={s.coverImageUrl}
                      alt=""
                      className="w-full h-28 object-cover"
                      data-testid={`img-public-startup-cover-${s.id}`}
                    />
                  )}
                  <div className="p-4 flex flex-col gap-3 flex-1">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "h-10 w-10 rounded-md bg-gradient-to-br flex items-center justify-center shrink-0 overflow-hidden",
                          gradientFor(s.name),
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
                        data-testid={`text-public-startup-short-${s.id}`}
                      >
                        {s.shortDescription}
                      </p>
                    )}
                    {(s.founderName || s.cofounders.length > 0) && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {s.founderName && (
                          <Avatar className="h-7 w-7">
                            {s.founderAvatarUrl && (
                              <AvatarImage src={s.founderAvatarUrl} alt={s.founderName} />
                            )}
                            <AvatarFallback className="bg-muted text-muted-foreground text-[10px]">
                              {initials(s.founderName)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        {s.cofounders.map((c, i) => (
                          <Avatar key={i} className="h-7 w-7">
                            {c.avatarUrl && <AvatarImage src={c.avatarUrl} alt={c.name} />}
                            <AvatarFallback className="bg-muted text-muted-foreground text-[10px]">
                              {initials(c.name)}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
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
          )}
        </div>
      </div>

      <StartupShowcaseDialog
        startup={activeStartup as unknown as EventShowcaseStartup | null}
        open={!!activeStartup}
        onOpenChange={(open) => !open && setActiveStartup(null)}
        lockedSections={activeStartup?.locked}
      />
    </div>
  );
}
