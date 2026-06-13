import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export interface Livestream {
  id: string;
  title: string;
  rutubeUrl: string;
  isLive: boolean;
  scheduledDate?: string;
  scheduledTime?: string;
}

// Extract embed URL from various video platforms
function getEmbedUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    
    // RuTube support
    if (urlObj.hostname.includes('rutube.ru')) {
      // If it's already an embed URL, use it as-is
      if (url.includes('/play/embed/')) {
        return url;
      }
      // Extract video ID from various RuTube URL formats
      // https://rutube.ru/video/VIDEO_ID/
      // RuTube IDs can contain letters, numbers, hyphens, and underscores
      const videoMatch = url.match(/\/video\/([a-zA-Z0-9_-]+)/i);
      if (videoMatch && videoMatch[1]) {
        return `https://rutube.ru/play/embed/${videoMatch[1]}`;
      }
    }
    
    // VKVideo support
    if (urlObj.hostname.includes('vk.com') || urlObj.hostname.includes('vkvideo.ru')) {
      // If it's already an embed URL, try to use it
      if (url.includes('video_ext.php')) {
        return url;
      }
      
      // Extract video ID from various VK URL formats
      // https://vk.com/video-OWNER_ID_VIDEO_ID or video?z=video-OWNER_ID_VIDEO_ID
      const videoMatch = url.match(/video(-?\d+_\d+)/);
      if (videoMatch && videoMatch[1]) {
        const [oid, id] = videoMatch[1].split('_');
        // VK embed format - note: full URLs may include hash parameter
        // For public videos, hash is often not required
        return `https://vk.com/video_ext.php?oid=${oid}&id=${id}`;
      }
    }
    
    return null;
  } catch (e) {
    console.error('Error parsing video URL:', e);
    return null;
  }
}

export function LivestreamPlayer({ livestream }: { livestream: Livestream }) {
  const { t } = useLanguage();
  const embedUrl = getEmbedUrl(livestream.rutubeUrl);
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle data-testid="text-livestream-title">{livestream.title}</CardTitle>
            {livestream.isLive && (
              <Badge className="bg-destructive text-destructive-foreground">
                <span className="inline-block w-2 h-2 bg-current rounded-full mr-2 animate-pulse" />
                {t("liveNow")}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {embedUrl ? (
            <div className="aspect-video bg-muted rounded-md overflow-hidden">
              <iframe
                src={embedUrl}
                className="w-full h-full"
                frameBorder="0"
                allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                allowFullScreen
                data-testid="iframe-livestream-player"
              />
            </div>
          ) : (
            <div className="aspect-video bg-muted rounded-md flex items-center justify-center">
              <div className="text-center text-muted-foreground p-4">
                <p className="text-lg mb-2">{t("unsupportedVideoPlatform")}</p>
                <p className="text-sm">{t("useRutubeOrVk")}</p>
                <p className="text-xs mt-2 break-all">{livestream.rutubeUrl}</p>
              </div>
            </div>
          )}

          {!livestream.isLive && livestream.scheduledDate && (
            <div className="bg-muted/50 rounded-md p-4 space-y-2 mt-4">
              <p className="font-medium">{t("upcomingLivestreamLabel")}</p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{livestream.scheduledDate}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{livestream.scheduledTime}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
