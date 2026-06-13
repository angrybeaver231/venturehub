import { Play, Calendar, MessageSquare, Trash2 } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import brandingPattern from "@assets/generated_images/Business_club_branding_pattern_53894416.png";

export interface Video {
  id: string;
  title: string;
  date: string;
  thumbnail?: string;
  views?: number;
  comments?: number;
}

export function VideoCard({ 
  video, 
  onClick, 
  onDelete, 
  isAdmin = false 
}: { 
  video: Video; 
  onClick?: (id: string) => void; 
  onDelete?: (id: string) => void;
  isAdmin?: boolean;
}) {
  return (
    <Card className="overflow-hidden hover-elevate" data-testid={`card-video-${video.id}`}>
      <div 
        className="relative aspect-video bg-cover bg-center group cursor-pointer"
        style={{ backgroundImage: `url(${video.thumbnail || brandingPattern})` }}
        onClick={() => onClick?.(video.id)}
      >
        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors flex items-center justify-center">
          <div className="rounded-full bg-primary/90 p-4 group-hover:scale-110 transition-transform">
            <Play className="h-8 w-8 text-primary-foreground fill-current" />
          </div>
        </div>
      </div>

      <CardContent className="pt-4">
        <h3 className="font-semibold text-lg line-clamp-2 mb-2" data-testid={`text-video-title-${video.id}`}>
          {video.title}
        </h3>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{video.date}</span>
          </div>
          {video.comments !== undefined && (
            <div className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              <span>{video.comments} comments</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-2">
        {!isAdmin && (
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => onClick?.(video.id)}
            data-testid={`button-watch-${video.id}`}
          >
            Watch Video
          </Button>
        )}
        
        {isAdmin && onDelete && (
          <Button 
            variant="destructive" 
            size="sm"
            onClick={() => onDelete(video.id)}
            className="w-full"
            data-testid={`button-delete-video-${video.id}`}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
