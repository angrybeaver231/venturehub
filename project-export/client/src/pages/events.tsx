import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { EventCard } from "@/components/event-card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverContentNoPortal, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, CalendarIcon, Filter, X } from "lucide-react";
import { format } from "date-fns";
import { ru, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageSEO } from "@/hooks/usePageSEO";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Event, Club, University } from "@shared/schema";
import { EVENT_TYPE_OPTIONS, isShowcaseEventType } from "@/lib/eventTypes";

export default function Events() {
  const { toast } = useToast();
  const { user, isEventAdmin } = useAuth();
  const { t } = useLanguage();
  
  usePageSEO({
    title: 'Business Events | Бизнес Мероприятия',
    description: 'Business networking events and workshops at Financial University Business Club. Register for upcoming events, seminars, and conferences. Бизнес мероприятия Предпринимательского Клуба Финансового Университета.',
    keywords: 'business events, networking, workshops, financial university events, бизнес мероприятия, нетворкинг, финансовый университет'
  });
  const { language } = useLanguage();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [formData, setFormData] = useState({
    name: "",
    date: "",
    time: "",
    location: "",
    duration: "",
    description: "",
    customImage: "",
    photos: [] as string[],
    status: "upcoming",
    eventType: "lecture",
  });
  const [customImageFile, setCustomImageFile] = useState<File | null>(null);
  const [photoFiles, setPhotoFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [clubFilter, setClubFilter] = useState<string>("");
  const [universityFilter, setUniversityFilter] = useState<string>("");

  const eventsQueryKey = (() => {
    const params = new URLSearchParams();
    if (clubFilter) params.set('clubId', clubFilter);
    if (universityFilter) params.set('universityId', universityFilter);
    const qs = params.toString();
    return `/api/events${qs ? `?${qs}` : ''}`;
  })();

  const { data: events = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/events", clubFilter, universityFilter],
    queryFn: async () => {
      const res = await apiRequest(eventsQueryKey);
      return res.json();
    },
  });

  const { data: clubs = [] } = useQuery<Club[]>({
    queryKey: ["/api/clubs"],
  });

  const { data: universities = [] } = useQuery<University[]>({
    queryKey: ["/api/universities"],
  });

  const { data: registrations = [] } = useQuery<any[]>({
    queryKey: ["/api/events/registrations"],
    enabled: !!user,
  });

  const registeredEventIds = new Set(registrations.map((r: any) => r.eventId));

  const createEventMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("/api/events", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return (await res.json()) as Event;
    },
    onSuccess: async (_event: Event) => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setIsDialogOpen(false);
      setFormData({
        name: "",
        date: "",
        time: "",
        location: "",
        duration: "",
        description: "",
        customImage: "",
        photos: [],
        status: "upcoming",
        eventType: "lecture",
      });
      setSelectedDate(undefined);
      toast({
        title: t("success"),
        description: t("eventCreated"),
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: t("unauthorized"),
          description: t("loginRequired"),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: t("error"),
        description: t("failedToCreateEvent"),
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (eventId: string) => {
      // No need to send userId - backend gets it from session
      return await apiRequest(`/api/events/${eventId}/register`, {
        method: "POST",
        body: JSON.stringify({}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events/registrations"] });
      toast({
        title: t("success"),
        description: t("registeredSuccess"),
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: t("unauthorized"),
          description: t("loginRequired"),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: t("error"),
        description: t("failedToRegisterEvent"),
        variant: "destructive",
      });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      return await apiRequest(`/api/events/${eventId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: t("success"),
        description: "Event deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("error"),
        description: "Failed to delete event",
        variant: "destructive",
      });
    },
  });

  const moveToPastMutation = useMutation({
    mutationFn: async (eventId: string) => {
      return await apiRequest(`/api/events/${eventId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "past" }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: t("success"),
        description: "Event moved to past",
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("error"),
        description: "Failed to move event to past",
        variant: "destructive",
      });
    },
  });

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);

    try {
      let customImageUrl = formData.customImage;
      let photoUrls = formData.photos;

      // Upload custom image if file is selected
      if (customImageFile) {
        const imageFormData = new FormData();
        imageFormData.append('image', customImageFile);
        
        const imageResponse = await fetch('/api/upload/image', {
          method: 'POST',
          body: imageFormData,
        });
        
        if (imageResponse.ok) {
          const imageData = await imageResponse.json();
          customImageUrl = imageData.url;
        } else {
          throw new Error('Failed to upload custom image');
        }
      }

      // Upload gallery photos if files are selected
      if (photoFiles && photoFiles.length > 0) {
        const photosFormData = new FormData();
        for (let i = 0; i < photoFiles.length; i++) {
          photosFormData.append('images', photoFiles[i]);
        }
        
        const photosResponse = await fetch('/api/upload/images', {
          method: 'POST',
          body: photosFormData,
        });
        
        if (photosResponse.ok) {
          const photosData = await photosResponse.json();
          photoUrls = photosData.urls;
        } else {
          throw new Error('Failed to upload gallery photos');
        }
      }

      // Create event with uploaded image URLs
      createEventMutation.mutate({
        ...formData,
        customImage: customImageUrl,
        photos: photoUrls,
      });

      // Reset file states
      setCustomImageFile(null);
      setPhotoFiles(null);
    } catch (error) {
      toast({
        title: t("error"),
        description: error instanceof Error ? error.message : "Failed to upload images",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRegister = (eventId: string) => {
    registerMutation.mutate(eventId);
  };

  const handleDeleteEvent = (eventId: string) => {
    if (window.confirm("Are you sure you want to delete this event?")) {
      deleteEventMutation.mutate(eventId);
    }
  };

  const handleMoveToPast = (eventId: string) => {
    moveToPastMutation.mutate(eventId);
  };

  if (isLoading) {
    return <div>{t("loadingEvents")}</div>;
  }

  const upcomingEvents = events.filter(event => event.status === "upcoming" || event.status === "full");
  const pastEvents = events.filter(event => event.status === "past");

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold mb-2">{t("eventsList")}</h1>
          <p className="text-muted-foreground">
            {isEventAdmin ? t("eventsSubtitleAdmin") : t("eventsSubtitleMember")}
          </p>
        </div>
        {isEventAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-event">
                <Plus className="h-4 w-4 mr-2" />
                {t("createEvent")}
              </Button>
            </DialogTrigger>
            <DialogContent onPointerDownOutside={(e) => { if (isDatePickerOpen) e.preventDefault(); }}>
              <DialogHeader>
                <DialogTitle>{t("createNewEvent")}</DialogTitle>
                <DialogDescription>
                  {t("addNewEventDescription")}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("eventName")}</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    data-testid="input-event-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eventType">{language === "ru" ? "Тип мероприятия" : "Event type"}</Label>
                  <Select
                    value={formData.eventType}
                    onValueChange={(value) => setFormData({ ...formData, eventType: value })}
                  >
                    <SelectTrigger id="eventType" data-testid="select-event-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPE_OPTIONS.map((opt) => {
                        const Icon = opt.icon;
                        return (
                          <SelectItem key={opt.key} value={opt.key} data-testid={`option-event-type-${opt.key}`}>
                            <span className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {language === "ru" ? opt.ru : opt.en}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                {isShowcaseEventType(formData.eventType) && (
                  <p className="text-xs text-muted-foreground rounded-md border border-dashed p-3" data-testid="hint-showcase-startups">
                    {language === "ru"
                      ? "После создания мероприятия вы сможете добавить проекты-участники прямо на карточке мероприятия."
                      : "After creating the event you can add participating projects directly on the event card."}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">{t("eventDate")}</Label>
                    <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !selectedDate && "text-muted-foreground"
                          )}
                          data-testid="input-event-date"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate ? (
                            format(selectedDate, "PPP", { locale: language === 'ru' ? ru : enUS })
                          ) : (
                            <span>{t("selectDate")}</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContentNoPortal className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={(date) => {
                            setSelectedDate(date);
                            if (date) {
                              const year = date.getFullYear();
                              const month = String(date.getMonth() + 1).padStart(2, '0');
                              const day = String(date.getDate()).padStart(2, '0');
                              setFormData({ ...formData, date: `${year}-${month}-${day}` });
                            }
                            setIsDatePickerOpen(false);
                          }}
                          locale={language === 'ru' ? ru : enUS}
                        />
                      </PopoverContentNoPortal>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">{t("eventTime")}</Label>
                    <Input
                      id="time"
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      placeholder={t("eventTimePlaceholder")}
                      required
                      data-testid="input-event-time"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">{t("eventLocation")}</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    required
                    data-testid="input-event-location"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">{t("eventDuration")}</Label>
                  <Input
                    id="duration"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    placeholder={t("eventDurationPlaceholder")}
                    required
                    data-testid="input-event-duration"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Detailed event description..."
                    rows={4}
                    data-testid="input-event-description"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customImage">Custom Event Image (Optional)</Label>
                  <Input
                    id="customImage"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                    onChange={(e) => setCustomImageFile(e.target.files?.[0] || null)}
                    data-testid="input-event-custom-image"
                  />
                  <p className="text-xs text-muted-foreground">
                    Upload a PNG, JPEG, or GIF image (max 5MB) - this will be displayed on the event card
                  </p>
                  {customImageFile && (
                    <p className="text-xs text-accent">Selected: {customImageFile.name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="photos">Photo Gallery (Optional)</Label>
                  <Input
                    id="photos"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                    multiple
                    onChange={(e) => setPhotoFiles(e.target.files)}
                    data-testid="input-event-photos"
                  />
                  <p className="text-xs text-muted-foreground">
                    Upload up to 10 images (PNG, JPEG, GIF) for the event gallery (max 5MB each)
                  </p>
                  {photoFiles && photoFiles.length > 0 && (
                    <p className="text-xs text-accent">
                      Selected: {photoFiles.length} {photoFiles.length === 1 ? 'image' : 'images'}
                    </p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={isUploading || createEventMutation.isPending} data-testid="button-submit-event">
                  {isUploading ? "Uploading images..." : createEventMutation.isPending ? "Creating event..." : t("createEvent")}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {(clubs.length > 0 || universities.length > 0) && (
        <div className="flex items-center gap-3 flex-wrap" data-testid="events-filters">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {clubs.length > 0 && (
            <Select value={clubFilter} onValueChange={(v) => { setClubFilter(v === "all" ? "" : v); setUniversityFilter(""); }}>
              <SelectTrigger className="w-48" data-testid="select-club-filter">
                <SelectValue placeholder={language === 'ru' ? 'Все клубы' : 'All Clubs'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'ru' ? 'Все клубы' : 'All Clubs'}</SelectItem>
                {clubs.map((club: any) => (
                  <SelectItem key={club.id} value={String(club.id)}>{club.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {universities.length > 0 && (
            <Select value={universityFilter} onValueChange={(v) => { setUniversityFilter(v === "all" ? "" : v); setClubFilter(""); }}>
              <SelectTrigger className="w-48" data-testid="select-university-filter">
                <SelectValue placeholder={language === 'ru' ? 'Все университеты' : 'All Universities'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'ru' ? 'Все университеты' : 'All Universities'}</SelectItem>
                {universities.map((uni: any) => (
                  <SelectItem key={uni.id} value={String(uni.id)}>{uni.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {(clubFilter || universityFilter) && (
            <Button variant="ghost" size="sm" onClick={() => { setClubFilter(""); setUniversityFilter(""); }} data-testid="button-clear-filters">
              <X className="h-4 w-4 mr-1" />
              {language === 'ru' ? 'Сбросить' : 'Clear'}
            </Button>
          )}
        </div>
      )}

      {upcomingEvents.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">{language === 'ru' ? 'Предстоящие мероприятия' : 'Upcoming Events'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingEvents.map((event) => (
              <EventCard
                key={event.id}
                event={{
                  ...event,
                  status: event.status as "upcoming" | "full" | "past",
                  registered: registeredEventIds.has(event.id),
                }}
                onRegister={handleRegister}
                onDelete={isEventAdmin ? handleDeleteEvent : undefined}
                onMoveToPast={isEventAdmin ? handleMoveToPast : undefined}
                isAdmin={isEventAdmin}
              />
            ))}
          </div>
        </div>
      )}

      {pastEvents.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Past Events</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pastEvents.map((event) => (
              <EventCard
                key={event.id}
                event={{
                  ...event,
                  status: event.status as "upcoming" | "full" | "past",
                  registered: registeredEventIds.has(event.id),
                }}
                onDelete={isEventAdmin ? handleDeleteEvent : undefined}
                isAdmin={isEventAdmin}
              />
            ))}
          </div>
        </div>
      )}

      {events.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No events available
        </div>
      )}
    </div>
  );
}
