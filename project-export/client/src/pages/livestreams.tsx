import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { LivestreamPlayer } from "@/components/livestream-player";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Plus, Trash2, Archive } from "lucide-react";
import { insertLivestreamSchema } from "@shared/schema";
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageSEO } from "@/hooks/usePageSEO";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Livestream } from "@shared/schema";

export default function Livestreams() {
  const { isPlatformAdmin: isAdmin } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  
  usePageSEO({
    title: 'Livestreams | Прямые Трансляции',
    description: 'Watch live business streams and webinars from Financial University Business Club. Join interactive sessions with experts and entrepreneurs. Прямые трансляции Предпринимательского Клуба.',
    keywords: 'livestreams, webinars, online events, business streaming, прямые трансляции, вебинары, онлайн мероприятия'
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    rutubeUrl: "",
    isLive: false,
    scheduledDate: "",
    scheduledTime: "",
  });

  const { data: activeStream } = useQuery<Livestream | null>({
    queryKey: ["/api/livestreams/active"],
  });

  const { data: allStreams = [] } = useQuery<Livestream[]>({
    queryKey: ["/api/livestreams"],
  });

  const createLivestreamMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/livestreams", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/livestreams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/livestreams/active"] });
      setIsDialogOpen(false);
      setFormData({
        title: "",
        rutubeUrl: "",
        isLive: false,
        scheduledDate: "",
        scheduledTime: "",
      });
      toast({
        title: t("success"),
        description: t("livestreamCreated"),
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
        description: t("failedToCreateLivestream"),
        variant: "destructive",
      });
    },
  });

  const deleteLivestreamMutation = useMutation({
    mutationFn: async (livestreamId: string) => {
      return await apiRequest(`/api/livestreams/${livestreamId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/livestreams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/livestreams/active"] });
      toast({
        title: t("success"),
        description: "Livestream deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("error"),
        description: "Failed to delete livestream",
        variant: "destructive",
      });
    },
  });

  const moveToPastMutation = useMutation({
    mutationFn: async (livestreamId: string) => {
      return await apiRequest(`/api/livestreams/${livestreamId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "past" }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/livestreams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/livestreams/active"] });
      toast({
        title: t("success"),
        description: "Livestream moved to past",
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("error"),
        description: "Failed to move livestream to past",
        variant: "destructive",
      });
    },
  });

  const stopLiveMutation = useMutation({
    mutationFn: async (livestreamId: string) => {
      return await apiRequest(`/api/livestreams/${livestreamId}`, {
        method: "PATCH",
        body: JSON.stringify({ isLive: false }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/livestreams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/livestreams/active"] });
      toast({
        title: t("success"),
        description: "Livestream stopped",
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("error"),
        description: "Failed to stop livestream",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data with Zod schema before submitting
    try {
      const validatedData = insertLivestreamSchema.parse(formData);
      createLivestreamMutation.mutate(validatedData);
    } catch (error: any) {
      toast({
        title: t("error"),
        description: error.message || t("invalidFormData"),
        variant: "destructive",
      });
    }
  };

  const handleDeleteLivestream = (livestreamId: string) => {
    if (window.confirm("Are you sure you want to delete this livestream?")) {
      deleteLivestreamMutation.mutate(livestreamId);
    }
  };

  const handleMoveToPast = (livestreamId: string) => {
    moveToPastMutation.mutate(livestreamId);
  };

  const handleStopLive = (livestreamId: string) => {
    if (window.confirm("Are you sure you want to stop this live stream?")) {
      stopLiveMutation.mutate(livestreamId);
    }
  };

  const upcomingStreams = allStreams.filter(
    (stream) => (!stream.isLive && stream.id !== activeStream?.id) && (stream.status === "upcoming" || !stream.status)
  );

  const pastStreams = allStreams.filter(
    (stream) => stream.status === "past"
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold mb-2">{t("livestreams")}</h1>
          <p className="text-muted-foreground">{t("livestreamsSubtitle")}</p>
        </div>
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-livestream">
                <Plus className="h-4 w-4 mr-2" />
                {t("createLivestream")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("createLivestream")}</DialogTitle>
                <DialogDescription>
                  {t("addNewLivestreamDescription")}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">{t("livestreamTitle")}</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder={t("livestreamTitlePlaceholder")}
                    required
                    data-testid="input-livestream-title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="url">{t("livestreamUrl")}</Label>
                  <Input
                    id="url"
                    type="url"
                    value={formData.rutubeUrl}
                    onChange={(e) => setFormData({ ...formData, rutubeUrl: e.target.value })}
                    placeholder={t("livestreamUrlPlaceholder")}
                    required
                    data-testid="input-livestream-url"
                  />
                  <p className="text-xs text-muted-foreground">{t("livestreamUrlHelp")}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isLive"
                    checked={formData.isLive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isLive: checked })}
                    data-testid="switch-livestream-live"
                  />
                  <Label htmlFor="isLive">{t("livestreamIsLive")}</Label>
                </div>
                {!formData.isLive && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="scheduledDate">{t("scheduledDate")}</Label>
                      <Input
                        id="scheduledDate"
                        type="date"
                        value={formData.scheduledDate}
                        onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                        data-testid="input-livestream-date"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="scheduledTime">{t("scheduledTime")}</Label>
                      <Input
                        id="scheduledTime"
                        type="time"
                        value={formData.scheduledTime}
                        onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                        data-testid="input-livestream-time"
                      />
                    </div>
                  </div>
                )}
                <Button type="submit" className="w-full" data-testid="button-submit-livestream">
                  {t("create")}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {activeStream && (
        <div className="space-y-4">
          <LivestreamPlayer
            livestream={{
              id: activeStream.id,
              title: activeStream.title,
              rutubeUrl: activeStream.rutubeUrl,
              isLive: activeStream.isLive,
              scheduledDate: activeStream.scheduledDate || undefined,
              scheduledTime: activeStream.scheduledTime || undefined,
            }}
          />
          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Admin Controls</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 flex-wrap">
                  {activeStream.isLive && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleStopLive(activeStream.id)}
                      data-testid="button-stop-live"
                    >
                      <Archive className="h-4 w-4 mr-1" />
                      Stop Live
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleMoveToPast(activeStream.id)}
                    data-testid="button-move-active-to-past"
                  >
                    <Archive className="h-4 w-4 mr-1" />
                    Move to Past
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handleDeleteLivestream(activeStream.id)}
                    data-testid="button-delete-active-livestream"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {upcomingStreams.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">{t("upcomingLivestreams")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingStreams.map((stream) => (
              <Card key={stream.id} data-testid={`card-upcoming-stream-${stream.id}`}>
                <CardHeader>
                  <CardTitle className="text-lg">{stream.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  {stream.scheduledDate && stream.scheduledTime && (
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{stream.scheduledDate}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{stream.scheduledTime}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
                {isAdmin && (
                  <CardFooter className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleMoveToPast(stream.id)}
                      className="flex-1"
                      data-testid={`button-move-to-past-${stream.id}`}
                    >
                      <Archive className="h-4 w-4 mr-1" />
                      Move to Past
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleDeleteLivestream(stream.id)}
                      data-testid={`button-delete-livestream-${stream.id}`}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </CardFooter>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {pastStreams.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Past Livestreams</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pastStreams.map((stream) => (
              <Card key={stream.id} data-testid={`card-past-stream-${stream.id}`}>
                <CardHeader>
                  <CardTitle className="text-lg">{stream.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  {stream.scheduledDate && stream.scheduledTime && (
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{stream.scheduledDate}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{stream.scheduledTime}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
                {isAdmin && (
                  <CardFooter>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleDeleteLivestream(stream.id)}
                      className="w-full"
                      data-testid={`button-delete-livestream-past-${stream.id}`}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </CardFooter>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
