import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Calendar, Clock, Ticket, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EventTicket } from "@/components/event-ticket";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageSEO } from "@/hooks/usePageSEO";
import { formatEventDate } from "@/lib/dateUtils";
import type { Event } from "@shared/schema";

export default function MyTickets() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  
  usePageSEO({
    title: 'My Tickets | Мои билеты',
    description: 'View and manage your event tickets for Business Club events. Download QR codes and tickets for event attendance. Просматривайте билеты на мероприятия Предпринимательского Клуба.',
    keywords: 'event tickets, my tickets, qr codes, мои билеты, билеты на мероприятия'
  });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: registrations = [] } = useQuery<any[]>({
    queryKey: ["/api/events/registrations"],
    enabled: !!user,
  });

  // Filter registrations to only include events from "Upcoming Events" section
  // Show tickets only for events with status "upcoming" or "full"
  const upcomingRegistrations = registrations.filter((registration: any) => {
    const event = events.find(e => e.id === registration.eventId);
    return event && (event.status === "upcoming" || event.status === "full");
  });

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <Ticket className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-semibold mb-2">{t("login")}</h2>
          <p className="text-muted-foreground">{t("loginToViewTickets")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">{t("myTickets")}</h1>
        <p className="text-muted-foreground">{t("myTicketsSubtitle")}</p>
      </div>

      {upcomingRegistrations.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Ticket className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-semibold mb-2">{t("noTickets")}</h2>
              <p className="text-muted-foreground">{t("noTicketsDescription")}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Ticket Cards Grid */}
          <div>
            <h2 className="text-2xl font-semibold mb-4">
              {t("allTickets")} ({upcomingRegistrations.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingRegistrations.map((registration: any) => {
                const event = events.find(e => e.id === registration.eventId);
                return event ? (
                  <Card 
                    key={registration.id} 
                    className="hover-elevate cursor-pointer active-elevate-2"
                    onClick={() => setSelectedTicketId(registration.id)}
                    data-testid={`ticket-card-${registration.id}`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg truncate">{event.name}</CardTitle>
                          <div className="text-sm text-muted-foreground space-y-1 mt-2">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3 shrink-0" />
                              <span className="truncate">{formatEventDate(event.date, language)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3 shrink-0" />
                              <span className="truncate">{event.time}</span>
                            </div>
                          </div>
                        </div>
                        <Ticket className="h-5 w-5 text-primary shrink-0" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t("viewTicket")}</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                ) : null;
              })}
            </div>
          </div>
        </>
      )}

      {/* Event Ticket Dialog */}
      <Dialog open={!!selectedTicketId} onOpenChange={() => setSelectedTicketId(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("eventTicket")}</DialogTitle>
          </DialogHeader>
          {selectedTicketId && <EventTicket registrationId={selectedTicketId} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
