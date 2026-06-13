import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatEventDate } from "@/lib/dateUtils";
import { Download, Printer, Award, Building2 } from "lucide-react";
import { format } from "date-fns";
import html2canvas from "html2canvas";
import businessClubLogo from "@assets/photo_5393419750937327414_c_1761607336354.jpg";

interface CertificateData {
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

interface EventCertificateProps {
  certificateData: CertificateData;
}

export function EventCertificate({ certificateData }: EventCertificateProps) {
  const { t, language } = useLanguage();

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    const certElement = document.getElementById(`certificate-${certificateData.registration.id}`);
    if (!certElement) return;

    try {
      // Use html2canvas to capture the certificate with all styling
      const canvas = await html2canvas(certElement, {
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
        link.download = `certificate-${certificateData.event.name || 'event'}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      });
    } catch (error) {
      console.error('Failed to download certificate:', error);
    }
  };

  // Create full name in both Russian and Latin
  const russianName = `${certificateData.user.lastName || ''} ${certificateData.user.firstName || ''} ${certificateData.user.patronymic || ''}`.trim().toUpperCase();
  const latinName = `${certificateData.user.firstName || ''} ${certificateData.user.lastName || ''}`.trim().toUpperCase();

  return (
    <div className="space-y-4">
      <div className="flex gap-2 print:hidden">
        <Button
          onClick={handlePrint}
          variant="outline"
          className="flex-1"
          data-testid={`button-print-certificate-${certificateData.registration.id}`}
        >
          <Printer className="h-4 w-4 mr-2" />
          {t("printCertificate")}
        </Button>
        <Button
          onClick={handleDownload}
          variant="outline"
          className="flex-1"
          data-testid={`button-download-certificate-${certificateData.registration.id}`}
        >
          <Download className="h-4 w-4 mr-2" />
          {t("downloadCertificate")}
        </Button>
      </div>

      <div
        id={`certificate-${certificateData.registration.id}`}
        className="relative w-full max-w-2xl mx-auto aspect-[9/14] rounded-2xl overflow-hidden shadow-2xl"
        data-testid={`certificate-${certificateData.registration.id}`}
        style={{
          background: 'linear-gradient(135deg, #1a1a1a 0%, #0a3d3d 40%, #1a1a1a 70%, #4a2c1a 100%)',
        }}
      >
        {/* Orange/Red accent gradient at top */}
        <div 
          className="absolute top-0 left-0 right-0 h-32 opacity-60"
          style={{
            background: 'linear-gradient(180deg, rgba(255,165,0,0.8) 0%, rgba(255,165,0,0) 100%)',
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

          {/* Middle Section - Certificate Content */}
          <div className="flex-1 flex flex-col items-center justify-center space-y-6 w-full">
            {/* Certificate Title */}
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <Award className="h-16 w-16 text-yellow-400" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-wide">
                СЕРТИФИКАТ УЧАСТНИКА
              </h2>
              <p className="text-lg md:text-xl font-medium text-white/80 tracking-wider">
                CERTIFICATE OF PARTICIPATION
              </p>
            </div>

            {/* User Name */}
            <div className="text-center space-y-2 mt-6">
              <h3 className="text-3xl md:text-4xl font-bold tracking-wide leading-tight">
                {russianName}
              </h3>
              <p className="text-lg md:text-xl font-medium text-white/80 tracking-wider">
                {latinName}
              </p>
            </div>

            {/* Event Name */}
            <div className="text-center mt-6 px-4">
              <p className="text-sm text-white/60 mb-2">принял(а) участие в мероприятии / participated in the event</p>
              <h4 className="text-xl md:text-2xl font-bold tracking-wide">
                {certificateData.event.name}
              </h4>
              <p className="text-md text-white/70 mt-2">
                {formatEventDate(certificateData.event.date, language)} • {certificateData.event.time}
              </p>
            </div>

            {/* QR Code */}
            <div className="bg-white p-3 rounded-lg mt-4">
              <img
                src={certificateData.qrCode}
                alt="Certificate QR Code"
                className="w-32 h-32"
                data-testid={`img-certificate-qr-${certificateData.registration.id}`}
              />
            </div>

            {/* Certificate ID */}
            <div className="text-center">
              <p className="text-sm text-white/60">ID:</p>
              <p className="text-md font-mono tracking-widest">
                {certificateData.registration.id.slice(0, 12).toUpperCase()}
              </p>
            </div>
          </div>

          {/* Bottom Section - Verification Label */}
          <div 
            className="w-full -mx-8 -mb-8 py-4 text-center"
            style={{
              background: 'linear-gradient(135deg, #1a4d8f 0%, #2563eb 100%)',
            }}
          >
            <p className="text-sm tracking-wide">
              ПОДТВЕРЖДЕНО / VERIFIED
            </p>
            {certificateData.registration.attendanceTime && (
              <p className="text-xs mt-1 opacity-80">
                {format(new Date(certificateData.registration.attendanceTime), "dd.MM.yyyy")}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Event Details Card (Visible below certificate) */}
      <div className="bg-card border rounded-lg p-6 space-y-4 print:hidden">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Award className="h-5 w-5 text-yellow-600" />
          {t("certificateOfParticipation")}
        </h3>
        <div className="space-y-2 text-sm">
          <p><span className="text-muted-foreground">{t("event")}:</span> <span className="font-semibold">{certificateData.event.name}</span></p>
          <p><span className="text-muted-foreground">{t("date")}:</span> <span className="font-semibold">{formatEventDate(certificateData.event.date, language)}</span></p>
          <p><span className="text-muted-foreground">{t("location")}:</span> <span className="font-semibold">{certificateData.event.location}</span></p>
        </div>
        {certificateData.registration.attendanceMarked && certificateData.registration.attendanceTime && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="text-sm font-medium text-green-900 dark:text-green-100">
              ✓ {t("attendanceVerified")}
            </div>
            <div className="text-xs text-green-700 dark:text-green-300 mt-1">
              {format(new Date(certificateData.registration.attendanceTime), "dd.MM.yyyy HH:mm")}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
