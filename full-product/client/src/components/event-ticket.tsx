import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatEventDate } from "@/lib/dateUtils";
import { Download, Building2 } from "lucide-react";
import { format } from "date-fns";
import html2canvas from "html2canvas";
import businessClubLogo from "@assets/photo_5393419750937327414_c_1761607336354.jpg";

interface TicketData {
  qrCode: string;
  registration: {
    id: string;
    eventId: string;
    userId: string;
    attendanceMarked: boolean;
    attendanceTime: string | null;
  };
  event: {
    name: string;
    date: string;
    time: string;
    location: string;
    duration: string;
  };
  user: {
    firstName: string;
    lastName: string;
    patronymic: string | null;
  };
}

interface EventTicketProps {
  registrationId: string;
}

export function EventTicket({ registrationId }: EventTicketProps) {
  const { t, language } = useLanguage();

  const { data: ticketData, isLoading, error } = useQuery<TicketData>({
    queryKey: ["/api/registrations", registrationId, "ticket"],
    queryFn: async () => {
      const response = await fetch(`/api/registrations/${registrationId}/ticket`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch ticket data");
      }
      return response.json();
    },
  });

  const handleDownload = async () => {
    const ticketElement = document.getElementById(`ticket-${registrationId}`);
    if (!ticketElement) return;

    try {
      // Use html2canvas to capture the ticket with all styling
      const canvas = await html2canvas(ticketElement, {
        backgroundColor: null,
        scale: 2, // Higher resolution
        logging: false,
        useCORS: true,
        allowTaint: true,
      });

      // Convert canvas to blob and download
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ticket-${ticketData?.event.name || 'event'}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      });
    } catch (error) {
      console.error('Failed to download ticket:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">{t("loading")}</div>
      </div>
    );
  }

  if (error || !ticketData) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-destructive text-sm">{t("somethingWentWrong")}</div>
      </div>
    );
  }

  const fullName = [
    ticketData.user.lastName,
    ticketData.user.firstName,
    ticketData.user.patronymic
  ].filter(Boolean).join(' ');

  // Create full name with patronymic in Russian
  const russianName = `${ticketData.user.lastName || ''} ${ticketData.user.firstName || ''} ${ticketData.user.patronymic || ''}`.trim().toUpperCase();

  return (
    <div className="space-y-4">
      <div className="flex gap-2 print:hidden">
        <Button
          onClick={handleDownload}
          variant="outline"
          className="w-full"
          data-testid={`button-download-ticket-${registrationId}`}
        >
          <Download className="h-4 w-4 mr-2" />
          {t("downloadTicket")}
        </Button>
      </div>

      <div
        id={`ticket-${registrationId}`}
        className="relative w-full max-w-2xl mx-auto aspect-[9/14] rounded-2xl overflow-hidden shadow-2xl"
        data-testid={`ticket-${registrationId}`}
        style={{
          background: 'linear-gradient(135deg, #1a1a1a 0%, #0a3d3d 40%, #1a1a1a 70%, #4a2c1a 100%)',
        }}
      >
        {/* Orange/Red accent gradient at top */}
        <div 
          className="absolute top-0 left-0 right-0 h-32 opacity-60"
          style={{
            background: 'linear-gradient(180deg, rgba(255,87,34,0.8) 0%, rgba(255,87,34,0) 100%)',
          }}
        />

        {/* Content Container */}
        <div className="relative z-10 h-full flex flex-col items-center justify-between p-8 text-white">
          {/* Top Section - Branding */}
          <div className="w-full text-center space-y-2">
            <div className="flex items-center justify-center mb-4">
              <img 
                src={businessClubLogo} 
                alt="Business Club Logo" 
                className="h-16 w-16 rounded-full object-cover border-2 border-white/30"
              />
            </div>
            <h1 className="text-2xl font-bold tracking-wider">
              ПРЕДПРИНИМАТЕЛЬСКИЙ КЛУБ
            </h1>
            <p className="text-sm text-white/70">
              Финансовый Университет при Правительстве РФ
            </p>
          </div>

          {/* Middle Section - Name and QR */}
          <div className="flex-1 flex flex-col items-center justify-center space-y-6 w-full">
            {/* User Name */}
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold tracking-wide leading-tight">
                {russianName}
              </h2>
            </div>

            {/* QR Code */}
            <div className="bg-white p-4 rounded-lg">
              <img
                src={ticketData.qrCode}
                alt="Ticket QR Code"
                className="w-48 h-48"
                data-testid={`img-ticket-qr-${registrationId}`}
              />
            </div>
          </div>

          {/* Bottom Section - Participant Label */}
          <div 
            className="w-full -mx-8 -mb-8 py-6 text-center"
            style={{
              background: 'linear-gradient(135deg, #1a4d8f 0%, #2563eb 100%)',
            }}
          >
            <h3 className="text-2xl md:text-3xl font-bold tracking-wider">
              УЧАСТНИК
            </h3>
            <p className="text-lg md:text-xl font-medium tracking-widest mt-1">
              PARTICIPANT
            </p>
          </div>
        </div>
      </div>

      {/* Event Details Card (Visible below ticket) */}
      <div className="bg-card border rounded-lg p-6 space-y-4 print:hidden">
        <h3 className="text-xl font-bold">{ticketData.event.name}</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">{t("date")}</p>
            <p className="font-semibold">{formatEventDate(ticketData.event.date, language)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("time")}</p>
            <p className="font-semibold">{ticketData.event.time}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("location")}</p>
            <p className="font-semibold">{ticketData.event.location}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("duration")}</p>
            <p className="font-semibold">{ticketData.event.duration}</p>
          </div>
        </div>
        {ticketData.registration.attendanceMarked && ticketData.registration.attendanceTime && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="text-sm font-medium text-green-900 dark:text-green-100">
              ✓ {t("attendanceMarked")}
            </div>
            <div className="text-xs text-green-700 dark:text-green-300 mt-1">
              {format(new Date(ticketData.registration.attendanceTime), "dd.MM.yyyy HH:mm")}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
