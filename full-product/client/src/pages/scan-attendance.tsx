import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  CheckCircle2,
  XCircle,
  Camera,
  Loader2,
  Keyboard,
  RefreshCcw,
  Zap,
  ZapOff,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

type ScanResult = {
  success: boolean;
  message: string;
  userName?: string;
  eventName?: string;
  alreadyMarked?: boolean;
};

const SCANNER_ELEMENT_ID = "attendance-qr-reader";
const DUPLICATE_WINDOW_MS = 4000;
const RESULT_DISPLAY_MS = 2200;

export default function ScanAttendance() {
  const { t, language } = useLanguage();
  const ru = language === "ru";
  const { toast } = useToast();

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastTokenRef = useRef<{ token: string; at: number } | null>(null);
  const processingRef = useRef(false);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>(
    [],
  );
  const [activeCameraId, setActiveCameraId] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualToken, setManualToken] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scanCount, setScanCount] = useState(0);

  const beep = useCallback((ok: boolean) => {
    try {
      const Ctx =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = ok ? 880 : 220;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        ctx.currentTime + (ok ? 0.15 : 0.3),
      );
      osc.start();
      osc.stop(ctx.currentTime + (ok ? 0.16 : 0.32));
      setTimeout(() => ctx.close().catch(() => {}), 500);
    } catch {}
    try {
      navigator.vibrate?.(ok ? 60 : [80, 60, 80]);
    } catch {}
  }, []);

  const submitToken = useCallback(
    async (token: string) => {
      const trimmed = token.trim();
      if (!trimmed || processingRef.current) return;

      const now = Date.now();
      const last = lastTokenRef.current;
      if (last && last.token === trimmed && now - last.at < DUPLICATE_WINDOW_MS) {
        return;
      }
      lastTokenRef.current = { token: trimmed, at: now };

      processingRef.current = true;
      setProcessing(true);

      try {
        const response = await apiRequest("/api/registrations/mark-attendance", {
          method: "POST",
          body: JSON.stringify({ token: trimmed }),
        });
        const data = await response.json();
        const ok = true;
        const r: ScanResult = {
          success: ok,
          message: data.alreadyMarked
            ? t("attendanceAlreadyMarked")
            : t("attendanceMarkedSuccess"),
          userName: data.userName,
          eventName: data.eventName,
          alreadyMarked: data.alreadyMarked,
        };
        setResult(r);
        setScanCount((c) => c + 1);
        beep(true);
      } catch (error: any) {
        const msg = error?.message || t("invalidQRCode");
        setResult({ success: false, message: msg });
        beep(false);
        toast({
          title: t("error"),
          description: msg,
          variant: "destructive",
        });
        // Allow retry of same token after a failure (user might fix angle)
        lastTokenRef.current = null;
      } finally {
        processingRef.current = false;
        setProcessing(false);
        if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
        resultTimerRef.current = setTimeout(() => {
          setResult(null);
        }, RESULT_DISPLAY_MS);
      }
    },
    [beep, t, toast],
  );

  const startCamera = useCallback(
    async (cameraId: string) => {
      if (!scannerRef.current) return;
      setStarting(true);
      setCameraError(null);
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.start(
          cameraId,
          {
            fps: 12,
            qrbox: (vw: number, vh: number) => {
              const min = Math.floor(Math.min(vw, vh) * 0.75);
              return { width: min, height: min };
            },
            aspectRatio: 1.0,
            disableFlip: false,
            videoConstraints: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 1280 },
            } as any,
          },
          (decoded: string) => {
            void submitToken(decoded);
          },
          () => {
            // per-frame "not found" — ignore
          },
        );

        // Detect torch capability
        try {
          const caps: any =
            (scannerRef.current as any).getRunningTrackCapabilities?.() || {};
          setTorchSupported(!!caps.torch);
        } catch {
          setTorchSupported(false);
        }
      } catch (err: any) {
        const msg = err?.message || String(err) || "";
        if (
          err?.name === "NotAllowedError" ||
          /permission|denied|notallowed/i.test(msg)
        ) {
          setCameraError(t("cameraPermissionDenied"));
        } else if (/notfound|notreadable|overconstrained/i.test(msg)) {
          setCameraError(
            ru
              ? "Камера не найдена или занята другим приложением"
              : "Camera not found or in use by another app",
          );
        } else {
          setCameraError(msg || (ru ? "Ошибка камеры" : "Camera error"));
        }
      } finally {
        setStarting(false);
      }
    },
    [submitToken, t, ru],
  );

  // Initialize scanner instance + enumerate cameras once.
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (cancelled) return;
        if (!devices || devices.length === 0) {
          setCameraError(
            ru
              ? "Камера не обнаружена на этом устройстве"
              : "No camera detected on this device",
          );
          setStarting(false);
          return;
        }
        const list = devices.map((d) => ({
          id: d.id,
          label: d.label || (ru ? "Камера" : "Camera"),
        }));
        setCameras(list);

        // Prefer back/environment camera by label heuristic
        const back = list.find((c) =>
          /back|rear|environment|задн/i.test(c.label),
        );
        const chosen = back?.id || list[list.length - 1].id;
        setActiveCameraId(chosen);

        scannerRef.current = new Html5Qrcode(SCANNER_ELEMENT_ID, {
          verbose: false,
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        });
        await startCamera(chosen);
      } catch (err: any) {
        if (cancelled) return;
        const msg = err?.message || String(err) || "";
        if (
          err?.name === "NotAllowedError" ||
          /permission|denied|notallowed/i.test(msg)
        ) {
          setCameraError(t("cameraPermissionDenied"));
        } else {
          setCameraError(msg || (ru ? "Ошибка камеры" : "Camera error"));
        }
        setStarting(false);
      }
    };
    void init();

    return () => {
      cancelled = true;
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s) {
        (async () => {
          try {
            if (s.isScanning) await s.stop();
            s.clear();
          } catch {}
        })();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchCamera = async (id: string) => {
    setActiveCameraId(id);
    setTorchOn(false);
    await startCamera(id);
  };

  const toggleTorch = async () => {
    if (!scannerRef.current || !torchSupported) return;
    try {
      await (scannerRef.current as any).applyVideoConstraints({
        advanced: [{ torch: !torchOn }],
      });
      setTorchOn((v) => !v);
    } catch (err) {
      console.error("Torch toggle failed", err);
    }
  };

  const restart = async () => {
    if (activeCameraId) {
      await startCamera(activeCameraId);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    await submitToken(manualToken.trim());
    setManualToken("");
  };

  return (
    <div className="max-w-2xl mx-auto p-3 sm:p-6 md:p-8 space-y-6">
      <div>
        <h1
          className="text-2xl sm:text-3xl font-bold mb-1"
          data-testid="text-scanner-title"
        >
          {t("scannerTitle")}
        </h1>
        <p
          className="text-muted-foreground text-sm"
          data-testid="text-scanner-description"
        >
          {t("scannerDescription")}
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="flex items-center gap-2 text-base">
              <Camera className="h-5 w-5" />
              {t("scanQRCode")}
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {cameras.length > 1 && (
                <Select
                  value={activeCameraId || undefined}
                  onValueChange={switchCamera}
                >
                  <SelectTrigger
                    className="h-9 w-[180px]"
                    data-testid="select-camera"
                  >
                    <SelectValue
                      placeholder={ru ? "Камера" : "Camera"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {cameras.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label.length > 28
                          ? c.label.slice(0, 28) + "…"
                          : c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {torchSupported && (
                <Button
                  size="icon"
                  variant={torchOn ? "default" : "outline"}
                  onClick={toggleTorch}
                  data-testid="button-torch"
                  title={ru ? "Фонарик" : "Torch"}
                >
                  {torchOn ? (
                    <Zap className="h-4 w-4" />
                  ) : (
                    <ZapOff className="h-4 w-4" />
                  )}
                </Button>
              )}
              <Button
                size="icon"
                variant="outline"
                onClick={restart}
                disabled={starting || !activeCameraId}
                data-testid="button-restart-camera"
                title={ru ? "Перезапустить" : "Restart"}
              >
                <RefreshCcw
                  className={cn("h-4 w-4", starting && "animate-spin")}
                />
              </Button>
              <Button
                size="icon"
                variant={manualMode ? "default" : "outline"}
                onClick={() => setManualMode((v) => !v)}
                data-testid="button-manual-toggle"
                title={ru ? "Ввод вручную" : "Enter manually"}
              >
                <Keyboard className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <CardDescription className="pt-1">
            {cameraError
              ? cameraError
              : starting
              ? ru
                ? "Запуск камеры..."
                : "Starting camera..."
              : ru
              ? "Наведите на QR-код участника"
              : "Point at a participant's QR code"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Always-mounted scanner viewport (no remount between scans) */}
          <div
            className={cn(
              "relative bg-black rounded-md overflow-hidden mx-auto",
              "w-full max-w-md",
            )}
            style={{ aspectRatio: "1 / 1" }}
          >
            <div
              id={SCANNER_ELEMENT_ID}
              className="w-full h-full [&>video]:w-full [&>video]:h-full [&>video]:object-cover"
            />

            {/* Targeting overlay */}
            {!cameraError && !starting && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative w-3/4 h-3/4">
                  <div className="absolute inset-0 border-2 border-white/30 rounded-md" />
                  <span className="absolute -top-px -left-px w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-md" />
                  <span className="absolute -top-px -right-px w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-md" />
                  <span className="absolute -bottom-px -left-px w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-md" />
                  <span className="absolute -bottom-px -right-px w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-md" />
                </div>
              </div>
            )}

            {(starting || processing) && !cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <Loader2 className="h-10 w-10 animate-spin text-white" />
              </div>
            )}

            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="text-center text-white space-y-2 max-w-xs">
                  <XCircle className="h-10 w-10 mx-auto text-destructive" />
                  <div className="text-sm">{cameraError}</div>
                  <div className="text-xs text-white/70">
                    {t("cameraPermissionRequired")}
                  </div>
                </div>
              </div>
            )}

            {/* Result overlay (does NOT remount the scanner) */}
            {result && (
              <div
                className={cn(
                  "absolute inset-x-0 bottom-0 p-3 backdrop-blur-md flex items-start gap-2",
                  result.success
                    ? result.alreadyMarked
                      ? "bg-amber-500/85 text-amber-950"
                      : "bg-emerald-500/85 text-emerald-950"
                    : "bg-destructive/85 text-destructive-foreground",
                )}
                data-testid="overlay-scan-result"
              >
                {result.success ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <div className="font-semibold text-sm">{result.message}</div>
                  {(result.userName || result.eventName) && (
                    <div className="text-xs opacity-90 truncate">
                      {result.userName}
                      {result.userName && result.eventName ? " · " : ""}
                      {result.eventName}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Manual entry fallback */}
          {manualMode && (
            <form onSubmit={handleManualSubmit} className="space-y-2">
              <Label htmlFor="manual-token">
                {ru
                  ? "Вставьте код QR (если камера не работает)"
                  : "Paste QR token (if camera fails)"}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="manual-token"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder={ru ? "eyJhbGciOi..." : "eyJhbGciOi..."}
                  data-testid="input-manual-token"
                />
                <Button
                  type="submit"
                  disabled={!manualToken.trim() || processing}
                  data-testid="button-submit-manual"
                >
                  {ru ? "Отметить" : "Mark"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("attendanceStatus")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {ru ? "Отсканировано в этой сессии" : "Scanned this session"}
            </span>
            <span
              className="font-semibold tabular-nums text-lg"
              data-testid="text-scan-count"
            >
              {scanCount}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            {ru
              ? "Камера остаётся включённой между сканированиями — перезагрузка страницы не требуется."
              : "The camera stays on between scans — no page reload needed."}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
