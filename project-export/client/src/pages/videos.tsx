import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { UploadResult } from "@uppy/core";
import { VideoCard } from "@/components/video-card";
import { Button } from "@/components/ui/button";
import { Upload, FileVideo, Image as ImageIcon, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageSEO } from "@/hooks/usePageSEO";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { Video } from "@shared/schema";

export default function Videos() {
  const { isPlatformAdmin: isAdmin } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  
  usePageSEO({
    title: 'Video Library | Видео Библиотека',
    description: 'Business education video library for Financial University Business Club members. Access expert lectures, tutorials, and educational content. Видео библиотека Предпринимательского Клуба.',
    keywords: 'business videos, educational content, tutorials, financial university, видео обучение, бизнес образование'
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
  });
  const [videoFile, setVideoFile] = useState<string | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<string | null>(null);

  const { data: videos = [], isLoading } = useQuery<Video[]>({
    queryKey: ["/api/videos"],
  });

  const createVideoMutation = useMutation({
    mutationFn: async (data: { title: string; url: string; thumbnailUrl?: string }) => {
      return await apiRequest("/api/videos", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      setIsDialogOpen(false);
      setFormData({ title: "" });
      setVideoFile(null);
      setThumbnailFile(null);
      toast({
        title: t("success"),
        description: t("videoUploaded"),
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: t("unauthorized"),
          description: t("loginRequired"),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: t("error"),
        description: t("failedToUploadVideo"),
        variant: "destructive",
      });
    },
  });

  const deleteVideoMutation = useMutation({
    mutationFn: async (videoId: string) => {
      return await apiRequest(`/api/videos/${videoId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      toast({
        title: t("success"),
        description: "Video deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("error"),
        description: "Failed to delete video",
        variant: "destructive",
      });
    },
  });

  const handleGetUploadURL = async () => {
    try {
      const response = await apiRequest("/api/objects/upload", {
        method: "POST",
      }) as unknown as { uploadURL: string };
      return {
        method: "PUT" as const,
        url: response.uploadURL,
      };
    } catch (error) {
      toast({
        title: t("error"),
        description: "Failed to get upload URL",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleVideoUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadedFile = result.successful[0];
      const videoUrl = uploadedFile.uploadURL;
      
      try {
        const response = await apiRequest("/api/videos/files", {
          method: "PUT",
          body: JSON.stringify({ videoUrl: videoUrl }),
        }) as unknown as { videoPath: string; thumbnailPath?: string };
        setVideoFile(response.videoPath);
        toast({
          title: t("success"),
          description: "Video file uploaded successfully",
        });
      } catch (error) {
        toast({
          title: t("error"),
          description: "Failed to process video file",
          variant: "destructive",
        });
      }
    }
  };

  const handleThumbnailUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadedFile = result.successful[0];
      const thumbnailUrl = uploadedFile.uploadURL;
      
      try {
        const response = await apiRequest("/api/videos/files", {
          method: "PUT",
          body: JSON.stringify({ thumbnailUrl: thumbnailUrl }),
        }) as unknown as { videoPath?: string; thumbnailPath: string };
        setThumbnailFile(response.thumbnailPath);
        toast({
          title: t("success"),
          description: "Thumbnail uploaded successfully",
        });
      } catch (error) {
        toast({
          title: t("error"),
          description: "Failed to process thumbnail",
          variant: "destructive",
        });
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoFile) {
      toast({
        title: t("error"),
        description: "Please upload a video file",
        variant: "destructive",
      });
      return;
    }
    
    createVideoMutation.mutate({
      title: formData.title,
      url: videoFile,
      thumbnailUrl: thumbnailFile || undefined,
    });
  };

  const handleDeleteVideo = (videoId: string) => {
    if (window.confirm("Are you sure you want to delete this video?")) {
      deleteVideoMutation.mutate(videoId);
    }
  };

  if (isLoading) {
    return <div>{t("loadingVideos")}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold mb-2">{t("videoLibrary")}</h1>
          <p className="text-muted-foreground">
            {isAdmin ? t("videosSubtitleAdmin") : t("videosSubtitleMember")}
          </p>
        </div>
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-upload-video">
                <Upload className="h-4 w-4 mr-2" />
                {t("uploadVideo")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("uploadVideo")}</DialogTitle>
                <DialogDescription>
                  {t("addNewVideoDescription")}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">{t("videoTitle")}</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    data-testid="input-video-title"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Video File (MP4)</Label>
                  <div className="flex items-center gap-2">
                    <ObjectUploader
                      maxNumberOfFiles={1}
                      maxFileSize={838860800}
                      allowedFileTypes={['.mp4', 'video/mp4']}
                      onGetUploadParameters={handleGetUploadURL}
                      onComplete={handleVideoUploadComplete}
                      buttonVariant={videoFile ? "secondary" : "default"}
                      buttonClassName="flex-1"
                    >
                      <FileVideo className="h-4 w-4 mr-2" />
                      {videoFile ? "Video Uploaded" : "Upload Video (MP4)"}
                    </ObjectUploader>
                    {videoFile && <Check className="h-5 w-5 text-green-500" data-testid="icon-video-uploaded" />}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Upload MP4 video file (max 800MB)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Thumbnail (PNG)</Label>
                  <div className="flex items-center gap-2">
                    <ObjectUploader
                      maxNumberOfFiles={1}
                      maxFileSize={10485760}
                      allowedFileTypes={['.png', 'image/png']}
                      onGetUploadParameters={handleGetUploadURL}
                      onComplete={handleThumbnailUploadComplete}
                      buttonVariant={thumbnailFile ? "secondary" : "outline"}
                      buttonClassName="flex-1"
                    >
                      <ImageIcon className="h-4 w-4 mr-2" />
                      {thumbnailFile ? "Thumbnail Uploaded" : "Upload Thumbnail (PNG)"}
                    </ObjectUploader>
                    {thumbnailFile && <Check className="h-5 w-5 text-green-500" data-testid="icon-thumbnail-uploaded" />}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Optional PNG thumbnail (max 10MB)
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={!videoFile || createVideoMutation.isPending} data-testid="button-submit-video">
                  {createVideoMutation.isPending ? "Creating..." : t("upload")}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((video) => (
          <VideoCard
            key={video.id}
            video={{
              id: video.id,
              title: video.title,
              date: new Date(video.createdAt!).toLocaleDateString(),
              thumbnail: video.thumbnailUrl || undefined,
            }}
            onClick={(id) => console.log("Playing video:", id)}
            onDelete={isAdmin ? handleDeleteVideo : undefined}
            isAdmin={isAdmin}
          />
        ))}
      </div>
    </div>
  );
}
