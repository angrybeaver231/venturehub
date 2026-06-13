import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import QRCodeLib from "qrcode";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Download,
  QrCode as QrCodeIcon,
  CheckCircle2,
  XCircle,
  Maximize2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";

interface QRCodeData {
  qrCode: string;
  token?: string;
  attendanceMarked: boolean;
  attendanceTime: string | null;
}

interface QRCodeDisplayProps {
  registrationId: string | number;
  eventName?: string;
  showDownload?: boolean;
}

/**
 * Render a QR code as inline SVG so it stays crisp on every phone
 * regardless of pixel density. Falls back to the server PNG if the
 * token is unavailable.
 */
function QrSvg({
  value,
  size,
  className,
  testId,
}: {
  value: string;
  size: number;
  className?: string;
  testId?: string;
}) {
  const [svg, setSvg] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    QRCodeLib.toString(value, {
      type: "svg",
      errorCorrectionLevel: "H",
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then((s) => {
        if (!cancelled) setSvg(s);
      })
      .catch(() => {
        if (!cancelled) setSvg("");
      });
    return () => {
      cancelled = true;
    };
  }, [value]);

  return (
    <div
      className={className}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg }}
      data-testid={testId}
      aria-label="QR code"
    />
  );
}

export function QRCodeDisplay({
  registrationId,
  eventName,
  showDownload = true,
}: QRCodeDisplayProps) {
  const { t, language } = useLanguage();
  const ru = language === "ru";
  const [showQR, setShowQR] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const downloadRef = useRef<HTMLAnchorElement | null>(null);

  const { data: qrData, isLoading, error } = useQuery<QRCodeData>({
    queryKey: ["/api/registrations", registrationId, "qr-code"],
    enabled: showQR,
    staleTime: 1000 * 60 * 30, // 30 min: token is valid 4h, no need to refetch on every focus
    refetchOnWindowFocus: false,
  });

  // Boost device screen brightness while showing QR (where supported)
  useEffect(() => {
    if (!showQR) return;
    const wakeLockApi = (navigator as any).wakeLock;
    let lock: any = null;
    if (wakeLockApi?.request) {
      wakeLockApi
        .request("screen")
        .then((l: any) => {
          lock = l;
        })
        .catch(() => {});
    }
    return () => {
      if (lock?.release) lock.release().catch(() => {});
    };
  }, [showQR]);

  const handleDownload = async () => {
    if (!qrData?.token && !qrData?.qrCode) return;
    try {
      let url: string;
      if (qrData.token) {
        // Generate a high-resolution PNG from the token for printing
        url = await QRCodeLib.toDataURL(qrData.token, {
          errorCorrectionLevel: "H",
          margin: 2,
          width: 1024,
          color: { dark: "#000000", light: "#ffffff" },
        });
      } else {
        url = qrData.qrCode;
      }
      const a = downloadRef.current || document.createElement("a");
      a.href = url;
      a.download = `qr-${eventName || "event"}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error("QR download failed", e);
    }
  };

  if (!showQR) {
    return (
      <Button
        onClick={() => setShowQR(true)}
        variant="outline"
        className="w-full"
        data-testid={`button-show-qr-${registrationId}`}
      >
        <QrCodeIcon className="h-4 w-4 mr-2" />
        {t("showQRCode")}
      </Button>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCodeIcon className="h-5 w-5" />
            {t("qrCodeTitle")}
          </CardTitle>
          {eventName && <CardDescription>{eventName}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && (
            <div className="flex items-center justify-center h-64 bg-muted rounded-md animate-pulse">
              <div className="text-muted-foreground text-sm">
                {t("loading")}
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-64 bg-destructive/10 rounded-md">
              <div className="text-destructive text-sm">
                {t("somethingWentWrong")}
              </div>
            </div>
          )}

          {qrData && (
            <>
              <button
                type="button"
                onClick={() => setFullscreen(true)}
                className="relative bg-white p-4 rounded-md w-full flex items-center justify-center hover-elevate active-elevate-2 group"
                data-testid={`button-qr-fullscreen-${registrationId}`}
                aria-label={ru ? "Открыть QR во весь экран" : "Open QR fullscreen"}
              >
                {qrData.token ? (
                  <QrSvg
                    value={qrData.token}
                    size={288}
                    testId={`img-qr-code-${registrationId}`}
                  />
                ) : (
                  // Fallback if server didn't return token
                  <img
                    src={qrData.qrCode}
                    alt={t("qrCodeTitle")}
                    width={288}
                    height={288}
                    style={{ imageRendering: "pixelated" }}
                    data-testid={`img-qr-code-${registrationId}`}
                  />
                )}
                <span className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-md p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Maximize2 className="h-4 w-4 text-foreground" />
                </span>
              </button>

              <p className="text-xs text-muted-foreground text-center">
                {ru
                  ? "Нажмите на QR-код, чтобы развернуть для сканирования"
                  : "Tap the QR code to enlarge it for scanning"}
              </p>

              {qrData.attendanceMarked && qrData.attendanceTime && (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-md border border-green-200 dark:border-green-800">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <div className="flex-1">
                    <div className="font-medium text-green-900 dark:text-green-100">
                      {t("attendanceMarked")}
                    </div>
                    <div className="text-sm text-green-700 dark:text-green-300">
                      {t("attendanceTime")}:{" "}
                      {format(new Date(qrData.attendanceTime), "PPp")}
                    </div>
                  </div>
                </div>
              )}

              {!qrData.attendanceMarked && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                  <div className="text-sm text-muted-foreground">
                    {t("attendanceNotMarked")}
                  </div>
                </div>
              )}

              {showDownload && (
                <Button
                  onClick={handleDownload}
                  variant="outline"
                  className="w-full"
                  data-testid={`button-download-qr-${registrationId}`}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {t("downloadQRCode")}
                </Button>
              )}
              <a ref={downloadRef} className="hidden" />
            </>
          )}
        </CardContent>
      </Card>

      {/* Fullscreen / high-brightness QR for scanning at the door */}
      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md p-6 bg-white">
          <DialogTitle className="sr-only">{t("qrCodeTitle")}</DialogTitle>
          <div className="flex flex-col items-center gap-4">
            {qrData?.token ? (
              <QrSvg
                value={qrData.token}
                size={Math.min(
                  typeof window !== "undefined"
                    ? Math.floor(Math.min(window.innerWidth, window.innerHeight) * 0.8)
                    : 360,
                  480,
                )}
                testId={`img-qr-fullscreen-${registrationId}`}
              />
            ) : (
              qrData?.qrCode && (
                <img
                  src={qrData.qrCode}
                  alt={t("qrCodeTitle")}
                  className="w-full h-auto"
                  style={{ imageRendering: "pixelated", maxWidth: 480 }}
                />
              )
            )}
            {eventName && (
              <p className="text-sm text-gray-700 text-center font-medium">
                {eventName}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
