import { useState } from "react";
import { Calendar, Clock, MapPin, Users, Trash2, Archive, Star, Building2, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { formatEventDate } from "@/lib/dateUtils";
import { getEventTypeMeta } from "@/lib/eventTypes";
import brandingPattern from "@assets/generated_images/Business_club_branding_pattern_53894416.png";

export interface Event {
  id: string;
  name: string;
  date: string;
  time: string;
  location: string;
  duration: string;
  description?: string | null;
  customImage?: string | null;
  photos?: string[] | null;
  status: "upcoming" | "full" | "past";
  registered?: boolean;
  attendees?: number;
  isDraft?: boolean;
  registrationOpen?: boolean;
  isHighlighted?: boolean;
  isFeaturedByClub?: boolean;
  clubId?: string | null;
  clubName?: string | null;
  clubTier?: string | null;
  universityId?: string | null;
  universityName?: string | null;
  registrationRestrictedTo?: string[] | null;
  eventType?: string | null;
}

interface EventRegistration {
  id: string;
  eventId: string;
  userId: string;
  userEmail: string;
  userFirstName: string | null;
  userLastName: string | null;
  userPatronymic: string | null;
  guestName: string | null;
  guestEmail: string | null;
}

export function EventCard({ 
  event, 
  onRegister, 
  onDelete, 
  onMoveToPast, 
  isAdmin = false 
}: { 
  event: Event; 
  onRegister?: (id: string) => void; 
  onDelete?: (id: string) => void;
  onMoveToPast?: (id: string) => void;
  isAdmin?: boolean;
}) {
  const [isAttendeesOpen, setIsAttendeesOpen] = useState(false);
  const { t, language } = useLanguage();

  const typeMeta = getEventTypeMeta(event.eventType);

  const orgTypeLabels: Record<string, { ru: string; en: string }> = {
    financial_university: { ru: "Финансовый университет", en: "Financial University" },
    other_university: { ru: "Другой вуз", en: "Other University" },
    school: { ru: "Школа", en: "School" },
    workplace: { ru: "Место работы", en: "Workplace" },
  };

  const hasRestrictions = event.registrationRestrictedTo && event.registrationRestrictedTo.length > 0;
  const restrictionLabel = hasRestrictions
    ? event.registrationRestrictedTo!
        .map((r) => orgTypeLabels[r]?.[language === "ru" ? "ru" : "en"] || r)
        .join(", ")
    : "";
  const [, setLocation] = useLocation();

  const statusColors = {
    upcoming: "bg-accent text-accent-foreground",
    full: "bg-destructive text-destructive-foreground",
    past: "bg-muted text-muted-foreground",
  };

  const { data: registrations = [], isLoading: isLoadingRegistrations } = useQuery<EventRegistration[]>({
    queryKey: ["/api/events", event.id, "registrations"],
    queryFn: async () => {
      const response = await fetch(`/api/events/${event.id}/registrations`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: isAdmin,
    staleTime: 30_000,
  });

  const registeredCount = isAdmin
    ? registrations.length
    : event.attendees ?? 0;

  const getAttendeeDisplayName = (reg: EventRegistration) => {
    if (reg.guestName) return reg.guestName;
    if (reg.userFirstName && reg.userLastName) {
      const patronymic = reg.userPatronymic ? ` ${reg.userPatronymic}` : '';
      return `${reg.userFirstName} ${reg.userLastName}${patronymic}`;
    }
    return reg.userEmail;
  };

  const getInitials = (reg: EventRegistration) => {
    if (reg.guestName) {
      const parts = reg.guestName.split(" ");
      return parts.map(p => p[0]).join("").toUpperCase().slice(0, 2);
    }
    if (reg.userFirstName && reg.userLastName) {
      return `${reg.userFirstName[0]}${reg.userLastName[0]}`.toUpperCase();
    }
    return reg.userEmail[0].toUpperCase();
  };

  return (
    <Card className={cn("overflow-visible hover-elevate", event.isHighlighted && "border-2 border-primary/40")} data-testid={`card-event-${event.id}`}>
      <div 
        className="h-40 bg-cover bg-center relative cursor-pointer overflow-hidden rounded-t-md"
        style={{ backgroundImage: `url(${event.customImage || brandingPattern})` }}
        onClick={() => setLocation(`/events/${event.id}`)}
        data-testid={`image-event-${event.id}`}
      >
        <div className="absolute top-4 left-4 flex gap-2 flex-wrap">
          {typeMeta && (
            <Badge className={cn("text-xs border-transparent", typeMeta.chip)} data-testid={`badge-event-type-${event.id}`}>
              <typeMeta.icon className="h-3 w-3 mr-1" />
              {language === "ru" ? typeMeta.ru : typeMeta.en}
            </Badge>
          )}
          {event.clubName && (
            <Badge variant="secondary" className="text-xs" data-testid={`badge-club-${event.id}`}>
              <Building2 className="h-3 w-3 mr-1" />
              {event.clubName}
            </Badge>
          )}
          {event.isHighlighted && (
            <Badge variant="default" className="text-xs" data-testid={`badge-highlighted-${event.id}`}>
              <Star className="h-3 w-3 mr-1" />
              {language === 'ru' ? 'Рекомендуем' : 'Featured'}
            </Badge>
          )}
        </div>
        <div className="absolute top-4 right-4 flex gap-2">
          {event.isDraft && isAdmin && (
            <Badge variant="outline" className="bg-yellow-500/20 text-yellow-200 border-yellow-500">
              {t("draft")}
            </Badge>
          )}
          <Badge className={event.status === "upcoming" && event.registrationOpen === false
            ? "bg-muted text-muted-foreground"
            : statusColors[event.status]}>
            {event.status === "upcoming" 
              ? (event.registrationOpen === false 
                ? (language === "ru" ? "Регистрация закрыта" : "Registration Closed")
                : t("registrationOpen"))
              : event.status === "full" ? t("full") : t("pastEvent")}
          </Badge>
        </div>
      </div>
      
      <CardHeader 
        className="cursor-pointer"
        onClick={() => setLocation(`/events/${event.id}`)}
      >
        <h3 className="text-xl font-semibold" data-testid={`text-event-name-${event.id}`}>
          {event.name}
        </h3>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span data-testid={`text-event-date-${event.id}`}>{formatEventDate(event.date, language)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span data-testid={`text-event-time-${event.id}`}>{event.time} • {event.duration}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span data-testid={`text-event-location-${event.id}`}>{event.location}</span>
        </div>
        {hasRestrictions && (
          <div className="flex items-start gap-2 text-sm" data-testid={`badge-restriction-${event.id}`}>
            <ShieldAlert className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
            <span className="text-orange-600 dark:text-orange-400">
              {language === "ru" ? `Только для: ${restrictionLabel}` : `Only for: ${restrictionLabel}`}
            </span>
          </div>
        )}
        {isAdmin && (
          <Dialog open={isAttendeesOpen} onOpenChange={setIsAttendeesOpen}>
            <DialogTrigger asChild>
              <button
                className="w-full text-left rounded-md border border-primary/20 bg-primary/5 p-3 hover-elevate active-elevate-2 flex items-center gap-3"
                data-testid={`button-view-attendees-${event.id}`}
              >
                <div className="h-9 w-9 rounded-md bg-background/60 text-primary flex items-center justify-center shrink-0">
                  <Users className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-primary/80">
                    {t("registered")}
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className="text-2xl font-bold tabular-nums text-foreground leading-none"
                      data-testid={`text-attendees-count-${event.id}`}
                    >
                      {isLoadingRegistrations && isAdmin && registrations.length === 0
                        ? "…"
                        : registeredCount}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {language === "ru" ? "чел." : (registeredCount === 1 ? "person" : "people")}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] text-primary/80 font-medium underline shrink-0">
                  {t("viewAttendees")}
                </span>
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("eventAttendees")}</DialogTitle>
                <DialogDescription>
                  {t("peopleRegisteredFor")} {event.name}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {isLoadingRegistrations && (
                  <p className="text-sm text-muted-foreground">{t("loadingAttendees")}</p>
                )}
                {!isLoadingRegistrations && registrations.length === 0 && (
                  <p className="text-sm text-muted-foreground">{t("noAttendees")}</p>
                )}
                {!isLoadingRegistrations && registrations.map((reg) => (
                  <div 
                    key={reg.id} 
                    className="flex items-center gap-3 p-2 rounded-md hover-elevate"
                    data-testid={`attendee-${reg.id}`}
                  >
                    <Avatar>
                      <AvatarFallback>{getInitials(reg)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium" data-testid={`attendee-name-${reg.id}`}>
                        {getAttendeeDisplayName(reg)}
                      </p>
                      <p className="text-sm text-muted-foreground" data-testid={`attendee-email-${reg.id}`}>
                        {reg.guestEmail || reg.userEmail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-2">
        {event.status === "upcoming" && !event.registered && !isAdmin && (
          <Button 
            className="w-full" 
            onClick={() => onRegister?.(event.id)}
            data-testid={`button-register-${event.id}`}
          >
            {t("registerForEvent")}
          </Button>
        )}
        {event.registered && !isAdmin && (
          <Button variant="secondary" className="w-full" disabled>
            {t("registered")}
          </Button>
        )}
        {!isAdmin && (
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => setLocation(`/events/${event.id}`)}
            data-testid={`button-view-${event.id}`}
          >
            {t("viewDetails")}
          </Button>
        )}
        
        {/* Admin controls */}
        {isAdmin && (
          <div className="flex gap-2 w-full">
            {event.status === "upcoming" && onMoveToPast && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onMoveToPast(event.id)}
                className="flex-1"
                data-testid={`button-move-to-past-${event.id}`}
              >
                <Archive className="h-4 w-4 mr-1" />
                Move to Past
              </Button>
            )}
            {onDelete && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => onDelete(event.id)}
                className={event.status === "upcoming" ? "" : "w-full"}
                data-testid={`button-delete-event-${event.id}`}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            )}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
