import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Globe,
  Send,
  FileText,
  Presentation,
  ExternalLink,
  Link as LinkIcon,
  User,
  PlayCircle,
  Rocket,
  ChevronLeft,
  ChevronRight,
  X,
  Download,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import type { EventShowcaseStartup } from "@shared/schema";

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

function normalizeUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

function telegramHref(handle: string): string {
  const v = handle.trim();
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith("@")) return `https://t.me/${v.slice(1)}`;
  if (v.startsWith("t.me/")) return `https://${v}`;
  return `https://t.me/${v}`;
}

function telegramLabel(handle: string): string {
  const v = handle.trim();
  const m = v.match(/(?:t\.me\/|@)?([A-Za-z0-9_]+)\/?$/);
  return m ? `@${m[1]}` : v;
}

function slugUnderscore(name: string): string {
  return (
    name
      .trim()
      .replace(/[\/\\?%*:|"<>]+/g, "")
      .replace(/\s+/g, "_") || "file"
  );
}

function extOf(url: string): string {
  const path = url.split("?")[0].split("#")[0];
  const dot = path.lastIndexOf(".");
  return dot >= 0 ? path.slice(dot + 1).toLowerCase() : "";
}

function projectFileName(name: string, url: string, fallbackExt: string): string {
  const ext = extOf(url) || fallbackExt;
  const base = slugUnderscore(name);
  return ext ? `${base}.${ext}` : base;
}

export type ShowcaseLockedSections = {
  longDescription?: boolean;
  materials?: boolean;
  video?: boolean;
  contact?: boolean;
};

export function StartupShowcaseDialog({
  startup,
  open,
  onOpenChange,
  lockedSections,
}: {
  startup: EventShowcaseStartup | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // When provided (public/unauthenticated view), the listed private sections
  // render a "verify to access" placeholder instead of the real content.
  lockedSections?: ShowcaseLockedSections;
}) {
  const { language } = useLanguage();
  const ru = language === "ru";

  const LockedNotice = ({ label }: { label: string }) => (
    <div>
      <h4 className="text-sm font-semibold mb-2">{label}</h4>
      <div className="rounded-md border border-dashed bg-muted/40 p-4 flex items-start gap-3">
        <div className="h-9 w-9 rounded-md bg-muted text-muted-foreground flex items-center justify-center shrink-0">
          <Lock className="h-4 w-4" />
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {ru
            ? "Эта информация доступна авторизованным инвесторам и корпорациям, для авторизации зарегистрируйтесь на сервисе и пройдите верификацию"
            : "This information is available to verified investors and corporations. Register on the platform and complete verification to access it."}
        </p>
      </div>
    </div>
  );
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    setLightboxIndex(null);
  }, [open, startup?.id]);

  const mediaCount =
    (startup?.materialImages?.length ?? 0) + (startup?.videoUrl ? 1 : 0);
  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIndex(null);
      else if (e.key === "ArrowRight")
        setLightboxIndex((i) => (i === null ? i : (i + 1) % mediaCount));
      else if (e.key === "ArrowLeft")
        setLightboxIndex((i) =>
          i === null ? i : (i - 1 + mediaCount) % mediaCount,
        );
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex, mediaCount]);

  if (!startup) return null;

  const cofounders = startup.cofounders ?? [];

  const InfoRow = ({
    icon: Icon,
    label,
    children,
  }: {
    icon: typeof Globe;
    label: string;
    children: React.ReactNode;
  }) => (
    <div className="flex items-start gap-3">
      <div className="h-9 w-9 rounded-md bg-muted text-muted-foreground flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-medium break-words">{children}</div>
      </div>
    </div>
  );

  const materialImages = startup.materialImages ?? [];

  // Unified media viewer list: all attached images first, then the demo video.
  const mediaItems: { type: "image" | "video"; src: string }[] = [
    ...materialImages.map((src) => ({ type: "image" as const, src })),
    ...(startup.videoUrl
      ? [{ type: "video" as const, src: startup.videoUrl }]
      : []),
  ];
  const videoMediaIndex = startup.videoUrl ? mediaItems.length - 1 : -1;

  const materials: {
    key: string;
    icon: typeof FileText;
    label: string;
    href: string;
    download?: string;
  }[] = [];
  if (startup.presentationPdfUrl)
    materials.push({
      key: "pdf",
      icon: FileText,
      label: projectFileName(startup.name, startup.presentationPdfUrl, "pdf"),
      href: startup.presentationPdfUrl,
      download: projectFileName(startup.name, startup.presentationPdfUrl, "pdf"),
    });
  if (startup.presentationPptxUrl)
    materials.push({
      key: "pptx",
      icon: Presentation,
      label: projectFileName(startup.name, startup.presentationPptxUrl, "pptx"),
      href: startup.presentationPptxUrl,
      download: projectFileName(startup.name, startup.presentationPptxUrl, "pptx"),
    });
  if (startup.presentationUrl)
    materials.push({
      key: "link",
      icon: LinkIcon,
      label: ru ? "Ссылка на презентацию" : "Presentation link",
      href: normalizeUrl(startup.presentationUrl),
    });

  const presentationHref =
    startup.presentationPdfUrl ||
    startup.presentationPptxUrl ||
    (startup.presentationUrl ? normalizeUrl(startup.presentationUrl) : "");
  const presentationName = startup.presentationPdfUrl
    ? projectFileName(startup.name, startup.presentationPdfUrl, "pdf")
    : startup.presentationPptxUrl
    ? projectFileName(startup.name, startup.presentationPptxUrl, "pptx")
    : ru
    ? "Открыть презентацию"
    : "Open presentation";
  const presentationDownload = startup.presentationPdfUrl
    ? projectFileName(startup.name, startup.presentationPdfUrl, "pdf")
    : startup.presentationPptxUrl
    ? projectFileName(startup.name, startup.presentationPptxUrl, "pptx")
    : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "h-14 w-14 rounded-md bg-gradient-to-br flex items-center justify-center shrink-0 overflow-hidden",
                gradientFor(startup.name),
              )}
            >
              {startup.logoUrl ? (
                <img
                  src={startup.logoUrl}
                  alt={startup.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Rocket className="h-6 w-6 text-white" />
              )}
            </div>
            <div className="min-w-0">
              <DialogTitle
                className="text-3xl font-bold tracking-tight"
                data-testid={`text-showcase-name-${startup.id}`}
              >
                {startup.name}
              </DialogTitle>
              {startup.sector && (
                <div className="mt-2">
                  <Badge data-testid={`badge-showcase-sector-${startup.id}`}>
                    {startup.sector}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        {startup.coverImageUrl && (
          <div className="rounded-md overflow-hidden border">
            <img
              src={startup.coverImageUrl}
              alt={startup.name}
              className="w-full max-h-[360px] object-cover"
              data-testid={`img-showcase-cover-${startup.id}`}
            />
          </div>
        )}

        <div className="grid gap-8 md:grid-cols-[1fr_300px] mt-2">
          {/* Left column: descriptions + meta + materials */}
          <div className="space-y-6 min-w-0 order-2 md:order-1">
            {startup.shortDescription && (
              <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-primary mb-1.5">
                  {ru ? "Краткое описание" : "Short description"}
                </h4>
                <p className="text-lg font-medium leading-relaxed text-foreground whitespace-pre-line">
                  {startup.shortDescription}
                </p>
              </div>
            )}
            {startup.longDescription && (
              <div>
                <h4 className="text-sm font-semibold mb-1.5">
                  {ru ? "Полное описание" : "Full description"}
                </h4>
                <p className="text-base leading-relaxed text-foreground/90 whitespace-pre-line">
                  {startup.longDescription}
                </p>
              </div>
            )}
            {lockedSections?.longDescription && (
              <LockedNotice label={ru ? "Полное описание" : "Full description"} />
            )}
            {!startup.shortDescription &&
              !startup.longDescription &&
              !lockedSections?.longDescription && (
                <p className="text-sm text-muted-foreground">
                  {ru ? "Описание пока не добавлено." : "No description yet."}
                </p>
              )}

            <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
              {startup.sector && (
                <div>
                  <span className="text-muted-foreground">
                    {ru ? "Сфера проекта: " : "Sector: "}
                  </span>
                  <span className="font-medium">{startup.sector}</span>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">
                  {ru ? "Сооснователи: " : "Co-founders: "}
                </span>
                <span className="font-medium" data-testid={`text-showcase-cofounder-count-${startup.id}`}>
                  {cofounders.length}
                </span>
              </div>
            </div>

            {cofounders.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {cofounders.map((c, i) => {
                  const inner = (
                    <div className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 hover-elevate">
                      <Avatar className="h-8 w-8 shrink-0">
                        {c.avatarUrl && <AvatarImage src={c.avatarUrl} alt={c.name} />}
                        <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                          {initials(c.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{c.name}</span>
                      {c.telegram && <Send className="h-3.5 w-3.5 text-primary" />}
                    </div>
                  );
                  return c.telegram ? (
                    <a
                      key={i}
                      href={telegramHref(c.telegram)}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid={`link-showcase-cofounder-tg-${startup.id}-${i}`}
                    >
                      {inner}
                    </a>
                  ) : (
                    <div key={i} data-testid={`text-showcase-cofounder-${startup.id}-${i}`}>
                      {inner}
                    </div>
                  );
                })}
              </div>
            )}

            {materialImages.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">
                  {ru ? "Прикреплённые материалы" : "Attached materials"}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {materialImages.map((url, i) => (
                    <button
                      key={url + i}
                      type="button"
                      onClick={() => setLightboxIndex(i)}
                      className="block w-full rounded-md overflow-hidden border hover-elevate active-elevate-2"
                      data-testid={`button-showcase-material-image-${startup.id}-${i}`}
                    >
                      <img
                        src={url}
                        alt=""
                        className="w-full h-28 object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {materials.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">
                  {ru ? "Файлы презентации" : "Presentation files"}
                </h4>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {materials.map((m) => (
                    <a
                      key={m.key}
                      href={m.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={m.download}
                      className="w-44 shrink-0 rounded-md border overflow-hidden flex flex-col hover-elevate active-elevate-2"
                      data-testid={`link-showcase-material-${m.key}-${startup.id}`}
                    >
                      <div className="h-40 bg-muted relative">
                        {m.key === "pdf" ? (
                          <iframe
                            src={`${m.href}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                            title={m.label}
                            className="absolute inset-0 w-full h-full pointer-events-none"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                            <m.icon className="h-10 w-10" />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 p-2.5">
                        <m.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-xs font-medium break-words line-clamp-2">
                          {m.label}
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {(lockedSections?.materials || lockedSections?.video) && (
              <LockedNotice
                label={ru ? "Презентация и видео" : "Presentation & video"}
              />
            )}
          </div>

          {/* Right column: contact / detail card */}
          <div className="order-1 md:order-2">
            <div className="rounded-md border p-4 space-y-4">
              {startup.founderName && (
                <div className="flex items-center gap-3">
                  <Avatar className="h-11 w-11 shrink-0">
                    {startup.founderAvatarUrl && (
                      <AvatarImage src={startup.founderAvatarUrl} alt={startup.founderName} />
                    )}
                    <AvatarFallback className="bg-muted text-muted-foreground">
                      {initials(startup.founderName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-muted-foreground">
                      {ru ? "Основатель" : "Founder"}
                    </div>
                    <div
                      className="text-sm font-medium break-words"
                      data-testid={`text-showcase-founder-${startup.id}`}
                    >
                      {startup.founderName}
                    </div>
                  </div>
                </div>
              )}
              {startup.founderTelegram && (
                <>
                  <Separator />
                  <InfoRow icon={Send} label="Telegram">
                    <a
                      href={telegramHref(startup.founderTelegram)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                      data-testid={`link-showcase-founder-tg-${startup.id}`}
                    >
                      {telegramLabel(startup.founderTelegram)}
                    </a>
                  </InfoRow>
                </>
              )}
              {startup.websiteUrl && (
                <>
                  <Separator />
                  <InfoRow icon={Globe} label={ru ? "Сайт проекта" : "Website"}>
                    <a
                      href={normalizeUrl(startup.websiteUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                      data-testid={`link-showcase-website-${startup.id}`}
                    >
                      {startup.websiteUrl.replace(/^https?:\/\//i, "")}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </InfoRow>
                </>
              )}
              {presentationHref && (
                <>
                  <Separator />
                  <InfoRow icon={FileText} label={ru ? "Презентация" : "Presentation"}>
                    <a
                      href={presentationHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={presentationDownload}
                      className="text-primary hover:underline break-words"
                      data-testid={`link-showcase-presentation-${startup.id}`}
                    >
                      {presentationName}
                    </a>
                  </InfoRow>
                </>
              )}
              {startup.videoUrl && (
                <>
                  <Separator />
                  <InfoRow icon={PlayCircle} label={ru ? "Видео-презентация" : "Video presentation"}>
                    <button
                      type="button"
                      onClick={() => setLightboxIndex(videoMediaIndex)}
                      className="text-primary hover:underline"
                      data-testid={`button-showcase-video-${startup.id}`}
                    >
                      {ru ? "Смотреть видео" : "Watch video"}
                    </button>
                  </InfoRow>
                </>
              )}
              {lockedSections?.contact && (
                <>
                  {startup.founderName && <Separator />}
                  <LockedNotice label={ru ? "Контакты" : "Contacts"} />
                </>
              )}
              {!startup.founderName &&
                !startup.founderTelegram &&
                !startup.websiteUrl &&
                !presentationHref &&
                !startup.videoUrl &&
                !lockedSections?.contact && (
                  <p className="text-sm text-muted-foreground">
                    {ru ? "Контактов пока нет." : "No contacts yet."}
                  </p>
                )}
            </div>
          </div>
        </div>

      </DialogContent>

      {/* Full-screen media viewer. Portaled to <body> so it escapes the
          DialogContent's CSS transform (a transformed ancestor would otherwise
          become the containing block for `fixed`, trapping the overlay inside
          the dialog box). */}
      {lightboxIndex !== null &&
        mediaItems[lightboxIndex] &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
            onClick={() => setLightboxIndex(null)}
            data-testid={`lightbox-showcase-${startup.id}`}
          >
            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              className="absolute top-4 right-4 h-10 w-10 rounded-md bg-white/10 text-white flex items-center justify-center hover-elevate active-elevate-2"
              data-testid="button-lightbox-close"
              aria-label={ru ? "Закрыть" : "Close"}
            >
              <X className="h-5 w-5" />
            </button>

            {mediaItems[lightboxIndex].type === "video" ? (
              <video
                key={mediaItems[lightboxIndex].src}
                src={mediaItems[lightboxIndex].src}
                controls
                autoPlay
                playsInline
                onClick={(e) => e.stopPropagation()}
                className="max-h-[88vh] max-w-[92vw] rounded-md bg-black"
                data-testid={`video-showcase-${startup.id}`}
              />
            ) : (
              <img
                src={mediaItems[lightboxIndex].src}
                alt=""
                onClick={(e) => e.stopPropagation()}
                className="max-h-[88vh] max-w-[92vw] object-contain rounded-md"
              />
            )}

            {mediaItems.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIndex((i) =>
                      i === null
                        ? i
                        : (i - 1 + mediaItems.length) % mediaItems.length,
                    );
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 h-11 w-11 rounded-md bg-white/10 text-white flex items-center justify-center hover-elevate active-elevate-2"
                  data-testid="button-lightbox-prev"
                  aria-label={ru ? "Назад" : "Previous"}
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIndex((i) =>
                      i === null ? i : (i + 1) % mediaItems.length,
                    );
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 h-11 w-11 rounded-md bg-white/10 text-white flex items-center justify-center hover-elevate active-elevate-2"
                  data-testid="button-lightbox-next"
                  aria-label={ru ? "Вперёд" : "Next"}
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            <div
              className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              <a
                href={mediaItems[lightboxIndex].src}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-2 text-sm text-white hover-elevate active-elevate-2"
                data-testid="button-lightbox-download"
              >
                <Download className="h-4 w-4" />
                {ru ? "Скачать" : "Download"}
              </a>
              {mediaItems.length > 1 && (
                <span className="rounded-md bg-white/10 px-3 py-2 text-sm text-white">
                  {lightboxIndex + 1} / {mediaItems.length}
                </span>
              )}
            </div>
          </div>,
          document.body,
        )}
    </Dialog>
  );
}
