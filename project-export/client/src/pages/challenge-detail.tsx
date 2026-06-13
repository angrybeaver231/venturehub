import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Swords, Trophy, ArrowLeft, Send, Target, Medal, Clock, CheckCircle, XCircle, Timer, Star, Upload, Trash2, FileText, Image, Eye, EyeOff, Download, Paperclip, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageSEO } from "@/hooks/usePageSEO";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import type { Challenge, ChallengeAttemptWithMessages, LeaderboardEntry, ChallengeAttempt, SeasonalPoints, ChallengeAttachment } from "@shared/schema";

export default function ChallengeDetail() {
  const [, params] = useRoute("/challenges/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [position, setPosition] = useState("");
  const [message, setMessage] = useState("");
  const [activeAttempt, setActiveAttempt] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [lastMessageTime, setLastMessageTime] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const challengeId = params?.id;

  usePageSEO({
    title: 'Challenge | Испытание',
    description: 'AI Debate Challenge - test your argumentation skills',
    keywords: 'AI debate, argumentation, challenge'
  });

  const { data: challenge, isLoading: challengeLoading } = useQuery<Challenge>({
    queryKey: ["/api/challenges", challengeId],
    enabled: !!challengeId,
  });

  const { data: userAttempts = [] } = useQuery<ChallengeAttempt[]>({
    queryKey: ["/api/challenges/user/attempts"],
    enabled: !!user,
  });

  const { data: attemptDetails } = useQuery<ChallengeAttemptWithMessages>({
    queryKey: ["/api/challenges/attempts", activeAttempt],
    enabled: !!activeAttempt,
    refetchInterval: activeAttempt ? 1000 : false,
  });

  const [leaderboardSortBy, setLeaderboardSortBy] = useState<'score' | 'customOutcome'>('score');

  const { data: leaderboard = [] } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/challenges", challengeId, "leaderboard", leaderboardSortBy],
    queryFn: async () => {
      const res = await fetch(`/api/challenges/${challengeId}/leaderboard?sortBy=${leaderboardSortBy}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch leaderboard');
      return res.json();
    },
    enabled: !!challengeId,
  });

  // Query for attachments
  const { data: attachments = [] } = useQuery<ChallengeAttachment[]>({
    queryKey: ["/api/challenges", challengeId, "attachments"],
    enabled: !!challengeId,
  });

  // File input refs
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const [attachmentVisibility, setAttachmentVisibility] = useState<"ai_only" | "both">("ai_only");
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  // Check if user is admin
  const { isLmsAdmin: isAdmin } = useAuth();

  // Thumbnail upload mutation
  const thumbnailUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploadingThumbnail(true);
      const formData = new FormData();
      formData.append("thumbnail", file);
      const response = await fetch(`/api/challenges/${challengeId}/thumbnail`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to upload thumbnail");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/challenges", challengeId] });
      toast({ title: t("success"), description: t("thumbnailUploaded") });
      setUploadingThumbnail(false);
    },
    onError: (error: Error) => {
      toast({ title: t("error"), description: error.message, variant: "destructive" });
      setUploadingThumbnail(false);
    },
  });

  // Thumbnail delete mutation
  const thumbnailDeleteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/challenges/${challengeId}/thumbnail`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/challenges", challengeId] });
      toast({ title: t("success"), description: t("thumbnailDeleted") });
    },
    onError: () => {
      toast({ title: t("error"), description: t("failedToDeleteThumbnail"), variant: "destructive" });
    },
  });

  // AI thumbnail generation mutation
  const [generatingThumbnail, setGeneratingThumbnail] = useState(false);
  const aiThumbnailMutation = useMutation({
    mutationFn: async () => {
      setGeneratingThumbnail(true);
      const response = await fetch(`/api/challenges/${challengeId}/thumbnail/generate`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to generate thumbnail");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/challenges", challengeId] });
      toast({ title: t("success"), description: t("aiThumbnailGenerated") });
      setGeneratingThumbnail(false);
    },
    onError: (error: Error) => {
      toast({ title: t("error"), description: error.message, variant: "destructive" });
      setGeneratingThumbnail(false);
    },
  });

  // Attachment upload mutation
  const attachmentUploadMutation = useMutation({
    mutationFn: async ({ file, visibility }: { file: File; visibility: string }) => {
      setUploadingAttachment(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("visibility", visibility);
      const response = await fetch(`/api/challenges/${challengeId}/attachments`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to upload attachment");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/challenges", challengeId, "attachments"] });
      toast({ title: t("success"), description: t("attachmentUploaded") });
      setUploadingAttachment(false);
    },
    onError: (error: Error) => {
      toast({ title: t("error"), description: error.message, variant: "destructive" });
      setUploadingAttachment(false);
    },
  });

  // Attachment visibility update mutation
  const attachmentVisibilityMutation = useMutation({
    mutationFn: async ({ attachmentId, visibility }: { attachmentId: string; visibility: string }) => {
      return await apiRequest(`/api/challenges/attachments/${attachmentId}`, {
        method: "PATCH",
        body: JSON.stringify({ visibility }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/challenges", challengeId, "attachments"] });
      toast({ title: t("success"), description: t("visibilityUpdated") });
    },
    onError: () => {
      toast({ title: t("error"), description: t("failedToUpdateVisibility"), variant: "destructive" });
    },
  });

  // Attachment delete mutation
  const attachmentDeleteMutation = useMutation({
    mutationFn: async (attachmentId: string) => {
      return await apiRequest(`/api/challenges/attachments/${attachmentId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/challenges", challengeId, "attachments"] });
      toast({ title: t("success"), description: t("attachmentDeleted") });
    },
    onError: () => {
      toast({ title: t("error"), description: t("failedToDeleteAttachment"), variant: "destructive" });
    },
  });

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      thumbnailUploadMutation.mutate(file);
    }
  };

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      attachmentUploadMutation.mutate({ file, visibility: attachmentVisibility });
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return <Image className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const currentAttempts = userAttempts.filter(a => a.challengeId === challengeId);
  const hasActiveAttempt = currentAttempts.some(a => a.status === "active");
  const completedAttempts = currentAttempts.filter(a => a.status === "completed");
  const bestScore = completedAttempts.length > 0 
    ? Math.max(...completedAttempts.map(a => a.score || 0))
    : null;

  useEffect(() => {
    const active = currentAttempts.find(a => a.status === "active");
    if (active) {
      setActiveAttempt(active.id);
    }
  }, [currentAttempts]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [attemptDetails?.messages]);

  // Timer effect for response time limit
  useEffect(() => {
    if (!challenge?.responseTimeLimit || !attemptDetails?.status || attemptDetails.status !== "active") {
      setTimeRemaining(null);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Get the last AI message time to calculate remaining time
    const messages = attemptDetails.messages || [];
    const lastAiMessage = messages.filter(m => m.role === "assistant").pop();
    
    if (lastAiMessage && lastAiMessage.createdAt) {
      const messageTime = new Date(lastAiMessage.createdAt).getTime();
      if (messageTime !== lastMessageTime) {
        setLastMessageTime(messageTime);
        setTimeRemaining(challenge.responseTimeLimit);
      }
    } else if (messages.length === 0) {
      // Debate just started, set timer
      setTimeRemaining(challenge.responseTimeLimit);
    }
  }, [challenge?.responseTimeLimit, attemptDetails?.status, attemptDetails?.messages, lastMessageTime]);

  // Countdown timer - only starts once when timeRemaining is set
  useEffect(() => {
    // Clear any existing timer first
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Only start timer if we have time remaining and debate is active
    if (timeRemaining === null || timeRemaining <= 0 || attemptDetails?.status !== "active") {
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [lastMessageTime, attemptDetails?.status]); // Only re-run when message time changes or status changes

  // Query for user's seasonal points for this challenge
  const { data: userSeasonalPoints } = useQuery<SeasonalPoints[]>({
    queryKey: ["/api/challenges", challengeId, "user-seasonal-points"],
    enabled: !!challengeId && !!user,
  });

  const startMutation = useMutation({
    mutationFn: async (pos: string) => {
      const response = await apiRequest(`/api/challenges/${challengeId}/start`, {
        method: "POST",
        body: JSON.stringify({ position: pos }),
      });
      return response as unknown as ChallengeAttempt;
    },
    onSuccess: (data) => {
      setActiveAttempt(data.id);
      queryClient.invalidateQueries({ queryKey: ["/api/challenges/user/attempts"] });
      toast({
        title: t("success"),
        description: t("debateStarted"),
      });
    },
    onError: () => {
      toast({
        title: t("error"),
        description: t("failedToStartDebate"),
        variant: "destructive",
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest(`/api/challenges/attempts/${activeAttempt}/message`, {
        method: "POST",
        body: JSON.stringify({ message: content }),
      });
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/challenges/attempts", activeAttempt] });
    },
    onError: () => {
      toast({
        title: t("error"),
        description: t("failedToSendMessage"),
        variant: "destructive",
      });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (action: "complete" | "abandon") => {
      return await apiRequest(`/api/challenges/attempts/${activeAttempt}/complete`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
    },
    onSuccess: () => {
      setActiveAttempt(null);
      queryClient.invalidateQueries({ queryKey: ["/api/challenges/user/attempts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/challenges", challengeId, "leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/challenges", challengeId, "user-seasonal-points"] });
      toast({
        title: t("success"),
        description: t("debateCompleted"),
      });
    },
    onError: () => {
      toast({
        title: t("error"),
        description: t("failedToCompleteDebate"),
        variant: "destructive",
      });
    },
  });

  const handleStartDebate = () => {
    if (!position.trim()) {
      toast({
        title: t("error"),
        description: t("positionRequired"),
        variant: "destructive",
      });
      return;
    }
    startMutation.mutate(position);
  };

  const handleSendMessage = () => {
    if (!message.trim()) return;
    sendMessageMutation.mutate(message);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "medium": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "hard": return "bg-red-500/10 text-red-500 border-red-500/20";
      default: return "";
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (timeRemaining === null) return "";
    if (timeRemaining <= 10) return "text-red-500";
    if (timeRemaining <= 30) return "text-yellow-500";
    return "text-blue-500";
  };

  // Get FIS points for the latest attempt on this challenge
  const latestSeasonalPoints = userSeasonalPoints?.find(
    sp => sp.challengeId === challengeId
  );

  if (challengeLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg text-muted-foreground">{t("loading")}</div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Target className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">{t("challengeNotFound")}</h3>
        <Button onClick={() => navigate("/challenges")}>{t("backToChallenges")}</Button>
      </div>
    );
  }

  const isDebateComplete = attemptDetails?.status === "completed";
  const canSendMessage = activeAttempt && attemptDetails?.status === "active" && !sendMessageMutation.isPending;

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate("/challenges")} className="mb-4" data-testid="button-back">
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t("backToChallenges")}
      </Button>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl">{challenge.title}</CardTitle>
                  <CardDescription className="mt-2">{challenge.description}</CardDescription>
                </div>
                <Badge variant="outline" className={getDifficultyColor(challenge.difficulty)}>
                  {t(`difficulty${challenge.difficulty.charAt(0).toUpperCase() + challenge.difficulty.slice(1)}` as any)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg bg-muted/50 mb-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  {t("debateTopic")}
                </h4>
                <p className="text-muted-foreground">{challenge.topic}</p>
              </div>
              <div className="flex items-center gap-6 text-sm text-muted-foreground flex-wrap">
                <div className="flex items-center gap-2">
                  <Swords className="h-4 w-4" />
                  <span>{challenge.maxRounds} {t("rounds")}</span>
                </div>
                {challenge.responseTimeLimit && (
                  <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4" />
                    <span>{t("responseTimeLimit")}: {formatTime(challenge.responseTimeLimit)}</span>
                  </div>
                )}
                {bestScore !== null && (
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    <span className="text-yellow-500 font-medium">{t("yourBest")}: {bestScore}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue={hasActiveAttempt ? "debate" : "start"} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="start" disabled={hasActiveAttempt} data-testid="tab-start">
                {t("startDebate")}
              </TabsTrigger>
              <TabsTrigger value="debate" data-testid="tab-debate">
                {t("debate")}
              </TabsTrigger>
              <TabsTrigger value="leaderboard" data-testid="tab-leaderboard">
                {t("leaderboard")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="start" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t("stateYourPosition")}</CardTitle>
                  <CardDescription>{t("positionDescription")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {challenge.infoForUsers && (
                    <div className="p-4 rounded-lg border bg-blue-500/5 border-blue-500/20" data-testid="info-for-users">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">Информация о задании</p>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{challenge.infoForUsers}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  <Textarea
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder={t("positionPlaceholder")}
                    rows={4}
                    data-testid="input-position"
                  />
                  <Button
                    onClick={handleStartDebate}
                    disabled={startMutation.isPending || !position.trim()}
                    data-testid="button-start-debate"
                  >
                    <Swords className="h-4 w-4 mr-2" />
                    {startMutation.isPending ? t("starting") : t("startDebate")}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="debate" className="mt-4">
              {/* End-of-debate summary screen */}
              {isDebateComplete && attemptDetails && attemptDetails.score !== null ? (
                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <Trophy className="h-6 w-6 text-yellow-500" />
                      <CardTitle>{t("debateSummary")}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Overall score */}
                    <div className="flex flex-col items-center gap-2 py-4 rounded-lg bg-muted/50" data-testid="summary-overall-score">
                      <span className="text-sm font-medium text-muted-foreground">{t("overallScore")}</span>
                      <span className="text-5xl font-bold">{attemptDetails.score}<span className="text-2xl text-muted-foreground">/100</span></span>
                      {latestSeasonalPoints && latestSeasonalPoints.points > 0 && (
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary mt-1" data-testid="fis-points-display">
                          <Star className="h-4 w-4" />
                          <span className="font-medium">
                            #{latestSeasonalPoints.position} · {latestSeasonalPoints.points} {t("fisPoints")}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Per-round breakdown */}
                    {(() => {
                      const feedbackData = parseFeedback(attemptDetails.feedback);
                      const roundScores = feedbackData.rounds && feedbackData.rounds.length > 0 ? feedbackData.rounds : null;
                      return (
                        <div data-testid="summary-round-breakdown">
                          <h4 className="font-medium mb-3 text-sm">{t("roundBreakdown")}</h4>
                          {roundScores ? (
                            // Per-round breakdown table
                            <div className="space-y-3">
                              {roundScores.map((rs) => (
                                <div key={rs.round} className="p-3 rounded-lg bg-muted/40 space-y-2" data-testid={`round-breakdown-${rs.round}`}>
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold">{t("round")} {rs.round}</span>
                                    <span className="text-xs text-muted-foreground">{rs.logic + rs.evidence + rs.persuasiveness + rs.counter}/100</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                                    {[
                                      { label: t("logicScore"), value: rs.logic, color: "bg-blue-500" },
                                      { label: t("evidenceScore"), value: rs.evidence, color: "bg-green-500" },
                                      { label: t("persuasivenessScore"), value: rs.persuasiveness, color: "bg-purple-500" },
                                      { label: t("counterArgumentScore"), value: rs.counter, color: "bg-orange-500" },
                                    ].map(({ label, value, color }) => (
                                      <div key={label} className="space-y-0.5">
                                        <div className="flex items-center justify-between text-xs">
                                          <span className="text-muted-foreground truncate">{label}</span>
                                          <span className="font-medium text-foreground ml-1">{value}/25</span>
                                        </div>
                                        <div className="h-1 bg-muted rounded-full overflow-hidden">
                                          <div className={`h-full rounded-full ${color}`} style={{ width: `${(value / 25) * 100}%` }} />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            // Fallback: aggregate criterion bars when no per-round data
                            <div className="space-y-2">
                              {[
                                { label: t("logicScore"), value: feedbackData.logic, max: 25, color: "bg-blue-500" },
                                { label: t("evidenceScore"), value: feedbackData.evidence, max: 25, color: "bg-green-500" },
                                { label: t("persuasivenessScore"), value: feedbackData.persuasiveness, max: 25, color: "bg-purple-500" },
                                { label: t("counterArgumentScore"), value: feedbackData.counter, max: 25, color: "bg-orange-500" },
                              ].map(({ label, value, max, color }) => (
                                <div key={label} className="space-y-1" data-testid={`breakdown-${label.toLowerCase()}`}>
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">{label}</span>
                                    <span className="font-semibold text-foreground">{value !== undefined ? `${value}/${max}` : "—"}</span>
                                  </div>
                                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${color}`} style={{ width: value !== undefined ? `${(value / max) * 100}%` : "0%" }} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Custom Outcome (scenario-specific result) */}
                    {attemptDetails.customOutcome && (
                      <div className="p-4 rounded-lg border bg-primary/5 border-primary/20" data-testid="summary-custom-outcome">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          <span className="text-sm font-semibold text-primary">Результат сценария</span>
                        </div>
                        <p className="text-base font-medium">{attemptDetails.customOutcome}</p>
                      </div>
                    )}

                    {/* AI Verdict */}
                    {attemptDetails.feedback && (
                      <div className="p-4 rounded-lg border bg-muted/30" data-testid="summary-ai-verdict">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="h-4 w-4 text-primary" />
                          <span className="text-sm font-semibold">{t("aiVerdict")}</span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{parseFeedback(attemptDetails.feedback).text || attemptDetails.feedback}</p>
                      </div>
                    )}

                    {latestSeasonalPoints && latestSeasonalPoints.points > 0 && (
                      <p className="text-sm text-primary text-center" data-testid="fis-points-message">
                        {t("earnedFisPoints")}: {t("yourPosition")} #{latestSeasonalPoints.position}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => navigate("/challenges")}
                        data-testid="button-back-to-challenges"
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        {t("backToChallenges")}
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={() => {
                          setActiveAttempt(null);
                          setMessage("");
                        }}
                        data-testid="button-play-again"
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        {t("playAgain")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="flex flex-col" style={{ minHeight: "520px" }}>
                  <CardHeader className="pb-3 flex-shrink-0">
                    {attemptDetails ? (
                      <>
                        {/* Round progress */}
                        <div className="space-y-2" data-testid="round-progress">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-base">
                                {t("round")} {attemptDetails.currentRound} {t("roundOf")} {challenge.maxRounds}
                              </CardTitle>
                              {attemptDetails.status === "active" && <Clock className="h-4 w-4 text-muted-foreground" />}
                              {attemptDetails.status === "completed" && <CheckCircle className="h-4 w-4 text-green-500" />}
                              {attemptDetails.status === "abandoned" && <XCircle className="h-4 w-4 text-red-500" />}
                            </div>
                            <div className="flex items-center gap-2">
                              {attemptDetails.status === "active" && timeRemaining !== null && challenge.responseTimeLimit && (
                                <div
                                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-mono font-semibold text-sm ${getTimerBgColor()} ${getTimerColor()} ${getTimerPulse()}`}
                                  data-testid="timer-display"
                                >
                                  <Timer className="h-3.5 w-3.5" />
                                  {formatTime(timeRemaining)}
                                </div>
                              )}
                              {attemptDetails.status === "active" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => completeMutation.mutate("complete")}
                                  disabled={completeMutation.isPending}
                                  data-testid="button-end-debate"
                                >
                                  {t("endDebate")}
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Step-based round indicator */}
                          <div className="flex items-center gap-1" data-testid="round-steps">
                            {Array.from({ length: challenge.maxRounds }).map((_, i) => {
                              const stepRound = i + 1;
                              const isCompleted = stepRound < attemptDetails.currentRound;
                              const isCurrent = stepRound === attemptDetails.currentRound;
                              return (
                                <div key={stepRound} className="flex items-center flex-1">
                                  <div
                                    className={`h-2 flex-1 rounded-full transition-colors ${
                                      isCompleted
                                        ? "bg-primary"
                                        : isCurrent
                                        ? "bg-primary/50"
                                        : "bg-muted"
                                    }`}
                                    data-testid={`round-step-${stepRound}`}
                                  />
                                  {i < challenge.maxRounds - 1 && <div className="w-1" />}
                                </div>
                              );
                            })}
                          </div>

                          {/* Timer progress bar */}
                          {attemptDetails.status === "active" && timeRemaining !== null && challenge.responseTimeLimit && (
                            <Progress
                              value={(timeRemaining / challenge.responseTimeLimit) * 100}
                              className={`h-1 ${timeRemaining / challenge.responseTimeLimit <= 0.25 ? "[&>div]:bg-red-500" : timeRemaining / challenge.responseTimeLimit <= 0.5 ? "[&>div]:bg-amber-500" : ""}`}
                              data-testid="timer-progress"
                            />
                          )}
                        </div>

                        {/* Writing tip for current round */}
                        {attemptDetails.status === "active" && (
                          <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-primary/5 border border-primary/20 mt-2" data-testid="writing-tip">
                            <Lightbulb className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-muted-foreground">
                              <span className="font-semibold text-primary">{t("roundTip")}: </span>
                              {getWritingTip(attemptDetails.currentRound)}
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <CardTitle className="text-base">{t("noActiveDebate")}</CardTitle>
                    )}
                  </CardHeader>

                  <CardContent className="flex-1 flex flex-col overflow-hidden">
                    {attemptDetails ? (
                      <>
                        <ScrollArea className="flex-1 pr-2">
                          <div className="space-y-3 pb-2">
                            {attemptDetails.messages.map((msg, idx) => {
                              if (msg.role === "critique") {
                                const critique = parseCritique(msg.content);
                                return (
                                  <div key={msg.id || idx} className="flex flex-col items-start" data-testid={`critique-${msg.id || idx}`}>
                                    <div className="max-w-[90%] w-full rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2.5">
                                      <div className="flex items-center gap-1.5 mb-2">
                                        <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                                        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">{t("aiCritique")} · {t("round")} {msg.round}</span>
                                      </div>
                                      {critique.strong && (
                                        <div className="flex items-start gap-1.5 mb-1">
                                          <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                                          <p className="text-xs text-muted-foreground"><span className="text-green-600 dark:text-green-400 font-medium">{t("critiqueStrong")}: </span>{critique.strong}</p>
                                        </div>
                                      )}
                                      {critique.weak && (
                                        <div className="flex items-start gap-1.5">
                                          <AlertCircle className="h-3 w-3 text-amber-500 mt-0.5 flex-shrink-0" />
                                          <p className="text-xs text-muted-foreground"><span className="text-amber-600 dark:text-amber-400 font-medium">{t("critiqueWeak")}: </span>{critique.weak}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <div
                                  key={msg.id || idx}
                                  className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                                >
                                  {/* Speaker label */}
                                  <div className={`flex items-center gap-1.5 mb-1 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                                    <Avatar className="h-5 w-5">
                                      <AvatarFallback className={`text-xs ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted-foreground/20"}`}>
                                        {msg.role === "user" ? (user?.firstName?.[0] || "U") : "AI"}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs text-muted-foreground font-medium">
                                      {msg.role === "user" ? t("you") : t("aiOpponent")}
                                    </span>
                                  </div>

                                  {/* Message bubble */}
                                  <div
                                    className={`max-w-[82%] rounded-lg px-4 py-3 ${
                                      msg.role === "user"
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted text-foreground"
                                    }`}
                                    data-testid={`message-${msg.id || idx}`}
                                  >
                                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                  </div>
                                </div>
                              );
                            })}
                            <div ref={messagesEndRef} />
                          </div>
                        </ScrollArea>

                        {/* Sticky input area */}
                        {canSendMessage && (
                          <div className="mt-3 flex gap-2 pt-3 border-t flex-shrink-0" data-testid="message-input-area">
                            <Textarea
                              value={message}
                              onChange={(e) => setMessage(e.target.value)}
                              placeholder={t("typeYourArgument")}
                              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                              disabled={sendMessageMutation.isPending}
                              rows={2}
                              className="resize-none text-sm flex-1"
                              data-testid="input-message"
                            />
                            <Button
                              onClick={handleSendMessage}
                              disabled={sendMessageMutation.isPending || !message.trim()}
                              size="icon"
                              className="self-end"
                              data-testid="button-send"
                            >
                              {sendMessageMutation.isPending ? (
                                <Clock className="h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        )}

                        {/* Abandoned state */}
                        {attemptDetails.status === "abandoned" && (
                          <div className="mt-3 p-3 rounded-lg bg-muted/50 text-center text-sm text-muted-foreground">
                            {t("debateEnded")}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="text-center text-muted-foreground">
                          <Swords className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>{t("startDebateToBegin")}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>


            <TabsContent value="leaderboard" className="mt-4">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Trophy className="h-5 w-5" />
                        {t("leaderboard")}
                      </CardTitle>
                      <CardDescription className="mt-1">{t("leaderboardDescription")}</CardDescription>
                    </div>
                    {leaderboard.some(e => e.customOutcome) && (
                      <div className="flex items-center gap-1 rounded-md border p-1" data-testid="leaderboard-sort-toggle">
                        <Button
                          size="sm"
                          variant={leaderboardSortBy === 'score' ? 'default' : 'ghost'}
                          onClick={() => setLeaderboardSortBy('score')}
                          data-testid="button-sort-by-score"
                        >
                          <Trophy className="h-3.5 w-3.5 mr-1" />
                          {t("score")}
                        </Button>
                        <Button
                          size="sm"
                          variant={leaderboardSortBy === 'customOutcome' ? 'default' : 'ghost'}
                          onClick={() => setLeaderboardSortBy('customOutcome')}
                          data-testid="button-sort-by-outcome"
                        >
                          <Sparkles className="h-3.5 w-3.5 mr-1" />
                          Итог
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {leaderboard.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Medal className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>{t("noLeaderboardEntries")}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {leaderboard.map((entry) => (
                        <div
                          key={entry.rank}
                          className={`flex items-center gap-4 p-3 rounded-lg ${
                            entry.rank <= 3 ? "bg-muted/50" : ""
                          }`}
                          data-testid={`leaderboard-entry-${entry.rank}`}
                        >
                          <div className="w-8 text-center font-bold flex items-center justify-center">
                            {entry.rank === 1 && <Trophy className="h-6 w-6 text-yellow-500" />}
                            {entry.rank === 2 && <Medal className="h-6 w-6 text-gray-400" />}
                            {entry.rank === 3 && <Medal className="h-6 w-6 text-amber-700" />}
                            {entry.rank > 3 && <span className="text-muted-foreground">#{entry.rank}</span>}
                          </div>
                          <Avatar>
                            <AvatarFallback>
                              {entry.userFirstName?.[0] || entry.userName?.[0] || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium">
                              {entry.userFirstName && entry.userLastName
                                ? `${entry.userFirstName} ${entry.userLastName}`
                                : entry.userName || t("anonymous")}
                            </p>
                            {entry.customOutcome && (
                              <p className="text-xs text-primary mt-0.5" data-testid={`leaderboard-outcome-${entry.rank}`}>{entry.customOutcome}</p>
                            )}
                          </div>
                          <div className="font-bold text-lg">{entry.score}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="lg:w-80 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("yourAttempts")}</CardTitle>
            </CardHeader>
            <CardContent>
              {completedAttempts.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noAttemptsYet")}</p>
              ) : (
                <div className="space-y-3">
                  {completedAttempts.slice(0, 5).map((attempt, idx) => (
                    <div key={attempt.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <span className="text-sm">#{idx + 1}</span>
                      <Badge variant={attempt.score && attempt.score >= 70 ? "default" : "secondary"}>
                        {attempt.score || 0}/100
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Thumbnail Section - Admin Only */}
          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  {t("thumbnail")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {challenge.thumbnailStorageKey ? (
                  <div className="space-y-2">
                    <div className="relative aspect-video rounded-md overflow-hidden bg-muted">
                      <img
                        src={`/objects/${challenge.thumbnailStorageKey}`}
                        alt={challenge.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => thumbnailDeleteMutation.mutate()}
                      disabled={thumbnailDeleteMutation.isPending}
                      data-testid="button-delete-thumbnail"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t("deleteAttachment")}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="file"
                      ref={thumbnailInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleThumbnailChange}
                    />
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => thumbnailInputRef.current?.click()}
                      disabled={uploadingThumbnail || generatingThumbnail}
                      data-testid="button-upload-thumbnail"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {uploadingThumbnail ? t("uploading") : t("uploadThumbnail")}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => aiThumbnailMutation.mutate()}
                      disabled={generatingThumbnail || uploadingThumbnail}
                      data-testid="button-generate-ai-thumbnail"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      {generatingThumbnail ? t("generatingThumbnail") : t("generateAiThumbnail")}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Attachments Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                {t("attachments")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Admin Upload */}
              {isAdmin && (
                <div className="space-y-2 pb-3 border-b">
                  <div className="flex items-center gap-2">
                    <Select 
                      value={attachmentVisibility} 
                      onValueChange={(v) => setAttachmentVisibility(v as "ai_only" | "both")}
                    >
                      <SelectTrigger className="flex-1" data-testid="select-attachment-visibility">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ai_only">
                          <div className="flex items-center gap-2">
                            <EyeOff className="h-4 w-4" />
                            {t("aiOnly")}
                          </div>
                        </SelectItem>
                        <SelectItem value="both">
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            {t("aiAndChallenger")}
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <input
                    type="file"
                    ref={attachmentInputRef}
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx"
                    onChange={handleAttachmentChange}
                  />
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => attachmentInputRef.current?.click()}
                    disabled={uploadingAttachment}
                    data-testid="button-upload-attachment"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadingAttachment ? t("uploading") : t("uploadAttachment")}
                  </Button>
                </div>
              )}

              {/* Attachments List */}
              {(() => {
                const visibleAttachments = isAdmin 
                  ? attachments 
                  : attachments.filter(a => a.visibility === 'both');
                
                if (visibleAttachments.length === 0) {
                  return <p className="text-sm text-muted-foreground">{t("noAttachments")}</p>;
                }
                
                return (
                  <div className="space-y-2">
                    {visibleAttachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-start gap-2 p-2 rounded-lg bg-muted/50"
                        data-testid={`attachment-${attachment.id}`}
                      >
                        <div className="mt-1">
                          {getFileIcon(attachment.mimeType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{attachment.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(attachment.fileSize)}
                          </p>
                          {isAdmin && (
                            <div className="flex items-center gap-1 mt-1">
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${attachment.visibility === 'both' ? 'border-green-500/50 text-green-600' : 'border-yellow-500/50 text-yellow-600'}`}
                              >
                                {attachment.visibility === 'both' ? (
                                  <><Eye className="h-3 w-3 mr-1" />{t("aiAndChallenger")}</>
                                ) : (
                                  <><EyeOff className="h-3 w-3 mr-1" />{t("aiOnly")}</>
                                )}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-1"
                                onClick={() => attachmentVisibilityMutation.mutate({
                                  attachmentId: attachment.id,
                                  visibility: attachment.visibility === 'both' ? 'ai_only' : 'both'
                                })}
                                data-testid={`toggle-visibility-${attachment.id}`}
                              >
                                {attachment.visibility === 'both' ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              </Button>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => window.open(`/api/challenges/attachments/${attachment.id}/download`, '_blank')}
                            data-testid={`download-${attachment.id}`}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => attachmentDeleteMutation.mutate(attachment.id)}
                              data-testid={`delete-${attachment.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
