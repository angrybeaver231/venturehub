import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { Download } from "lucide-react";
import { formatEventDate } from "@/lib/dateUtils";
import html2canvas from "html2canvas";
import businessClubLogo from "@assets/photo_5393419750937327414_c_1761607336354.jpg";
import type { Event, User } from "@shared/schema";

interface SimpleCertificateProps {
  event: Event;
  user: User;
  attendedAt: string;
}

export function SimpleCertificate({ event, user, attendedAt }: SimpleCertificateProps) {
  const { t, language } = useLanguage();

  const handleDownload = async () => {
    const certElement = document.getElementById(`cert-${event.id}`);
    if (!certElement) return;

    try {
      const canvas = await html2canvas(certElement, {
        backgroundColor: null,
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
      });

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `certificate-${event.name || 'event'}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      });
    } catch (error) {
      console.error('Failed to download certificate:', error);
    }
  };

  const russianName = `${user.lastName || ''} ${user.firstName || ''} ${user.patronymic || ''}`.trim().toUpperCase();

  return (
    <div className="space-y-4">
      <div className="flex gap-2 print:hidden">
        <Button
          onClick={handleDownload}
          variant="outline"
          className="w-full"
          data-testid={`button-download-certificate-${event.id}`}
        >
          <Download className="h-4 w-4 mr-2" />
          {t("downloadCertificate")}
        </Button>
      </div>

      <div
        id={`cert-${event.id}`}
        className="relative w-full max-w-2xl mx-auto aspect-[9/14] rounded-2xl overflow-hidden shadow-2xl"
        data-testid={`certificate-${event.id}`}
        style={{
          background: 'linear-gradient(135deg, #1a1a1a 0%, #0a3d3d 40%, #1a1a1a 70%, #4a2c1a 100%)',
        }}
      >
        <div 
          className="absolute top-0 left-0 right-0 h-32 opacity-60"
          style={{
            background: 'linear-gradient(180deg, rgba(255,165,0,0.8) 0%, rgba(255,165,0,0) 100%)',
          }}
        />

        <div className="relative z-10 h-full flex flex-col items-center justify-between p-8 text-white">
          <div className="w-full text-center space-y-2">
            <div className="flex items-center justify-center mb-4">
              <img 
                src={businessClubLogo} 
                alt="Business Club Logo" 
                className="h-16 w-16 rounded-full object-cover border-2 border-white/30"
              />
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-wide px-4">
              ПРЕДПРИНИМАТЕЛЬСКИЙ КЛУБ
            </h1>
            <p className="text-sm text-white/70 px-4">
              Финансовый Университет при Правительстве РФ
            </p>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center space-y-6 w-full">
            <div className="text-center space-y-4">
              <p className="text-xl text-white/80">
                {t("certificateOfParticipation")}
              </p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-wide leading-tight">
                {russianName}
              </h2>
              <div className="space-y-2 mt-6">
                <p className="text-lg text-white/90">
                  {event.name}
                </p>
                <p className="text-sm text-white/70">
                  {formatEventDate(event.date, language)} • {event.location}
                </p>
              </div>
            </div>
          </div>

          <div 
            className="w-full -mx-8 -mb-8 py-6 text-center"
            style={{
              background: 'linear-gradient(135deg, #1a4d8f 0%, #2563eb 100%)',
            }}
          >
            <p className="text-sm text-white/80">
              {t("attendanceVerified")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
