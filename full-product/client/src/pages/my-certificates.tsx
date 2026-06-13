import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageSEO } from "@/hooks/usePageSEO";
import { SimpleCertificate } from "@/components/simple-certificate";
import { Award, CalendarCheck, Calendar, MapPin, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatEventDate } from "@/lib/dateUtils";
import type { User, Event } from "@shared/schema";

type Registration = {
  id: string;
  userId: string | null;
  eventId: string;
  guestName: string | null;
  guestEmail: string | null;
  attendanceMarked: boolean;
  attendanceTime: string | null;
  createdAt: string | null;
  event?: Event | null;
};

export default function MyCertificates() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [selectedCertificateId, setSelectedCertificateId] = useState<string | null>(null);

  usePageSEO({
    title: 'My Certificates | Мои сертификаты',
    description: 'View your event participation certificates. Download and share your achievements. Просмотр сертификатов участия в мероприятиях.',
    keywords: 'certificates, achievements, event participation, сертификаты, достижения'
  });

  const { data: registrations, isLoading } = useQuery<Registration[]>({
    queryKey: ["/api/events/registrations"],
    enabled: !!user,
  });

  // Filter to only show registrations where attendance was marked
  const attendedRegistrations = (registrations || [])
    .filter((reg) => reg.attendanceMarked && reg.event);

  const selectedRegistration = selectedCertificateId 
    ? attendedRegistrations.find(reg => reg.id === selectedCertificateId)
    : null;

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <Award className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-semibold mb-2">{t("login")}</h2>
          <p className="text-muted-foreground">{t("loginRequired")}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-pulse">
            <Award className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-semibold mb-2">{t("loading")}</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2" data-testid="title-certificates">
          {t("myCertificates")}
        </h1>
        <p className="text-muted-foreground">
          {t("certificatesSubtitle")}
        </p>
      </div>

      {/* Certificates List */}
      {attendedRegistrations.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <CalendarCheck className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-semibold mb-2" data-testid="text-no-certificates">
                {t("noCertificates")}
              </h2>
              <p className="text-muted-foreground">
                {t("noCertificatesDescription")}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div>
          <h2 className="text-2xl font-semibold mb-4">
            {t("allCertificates")} ({attendedRegistrations.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {attendedRegistrations.map((registration) => {
              const event = registration.event!;
              return (
                <Card 
                  key={registration.id} 
                  className="hover-elevate cursor-pointer active-elevate-2"
                  onClick={() => setSelectedCertificateId(registration.id)}
                  data-testid={`certificate-card-${registration.id}`}
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
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{event.location}</span>
                          </div>
                        </div>
                      </div>
                      <Award className="h-5 w-5 text-primary shrink-0" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t("viewCertificate")}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Certificate Dialog */}
      <Dialog open={!!selectedCertificateId} onOpenChange={() => setSelectedCertificateId(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("certificateOfParticipation")}</DialogTitle>
          </DialogHeader>
          {selectedRegistration && user && (
            <SimpleCertificate
              event={selectedRegistration.event!}
              user={user}
              attendedAt={selectedRegistration.attendanceTime || selectedRegistration.createdAt || new Date().toISOString()}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
