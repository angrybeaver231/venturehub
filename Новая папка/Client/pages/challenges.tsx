import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Plus, Swords, Trophy, Target, Edit2, Trash2, ToggleLeft, ToggleRight, Medal, Users, Award, Building2, Clock, Upload, Loader2, X, Image } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageSEO } from "@/hooks/usePageSEO";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useLocation } from "wouter";
import { createChallengeSchema, type Challenge, type ChallengeAttempt, type CreateChallengeInput, type SeasonalLeaderboardEntry, type TeamChampionshipEntry, type GlobalLatestResult } from "@shared/schema";

type ChallengeWithUserBest = Challenge & { userBestScore?: number | null };

export default function Challenges() {
  const { toast } = useToast();
  const { isLmsAdmin: isAdmin } = useAuth();
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("latestResults");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<CreateChallengeInput>({
    resolver: zodResolver(createChallengeSchema),
    defaultValues: {
      title: "",
      description: "",
      topic: "",
      difficulty: "medium",
      maxRounds: 3,
      isActive: true,
      infoForUsers: "",
      aiInstructions: "",
    },
  });

  usePageSEO({
    title: 'AI Debate Challenges | Дебаты с ИИ',
    description: 'Test your argumentation skills in AI-powered debates. Compete for the top spot on the leaderboard. Проверь свои навыки аргументации в дебатах с искусственным интеллектом.',
    keywords: 'AI debate, argumentation, challenges, leaderboard, дебаты, аргументация, ИИ'
  });

  const { data: challenges = [], isLoading } = useQuery<ChallengeWithUserBest[]>({
    queryKey: ["/api/challenges"],
  });

  const { data: userAttempts = [] } = useQuery<ChallengeAttempt[]>({
    queryKey: ["/api/challenges/user/attempts"],
  });

  // Query for seasonal leaderboard (FIS points)
  const { data: seasonalLeaderboard = [], isLoading: isLoadingSeasonalLeaderboard } = useQuery<SeasonalLeaderboardEntry[]>({
    queryKey: ["/api/leaderboard/seasonal"],
    enabled: activeTab === "seasonal",
  });

  // Query for team championship
  const { data: teamChampionship = [], isLoading: isLoadingTeamChampionship } = useQuery<TeamChampionshipEntry[]>({
    queryKey: ["/api/leaderboard/team-championship"],
    enabled: activeTab === "team",
  });

  // Query for global latest results
  const { data: globalLatestResults = [], isLoading: isLoadingLatestResults } = useQuery<GlobalLatestResult[]>({
    queryKey: ["/api/challenges/global-latest-results"],
    enabled: activeTab === "latestResults",
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateChallengeInput) => {
      const res = await apiRequest("/api/challenges", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: async (newChallenge: Challenge) => {
      // Upload thumbnail if one was selected
      if (thumbnailFile && newChallenge.id) {
        const uploadSuccess = await uploadThumbnail(newChallenge.id, thumbnailFile);
        if (!uploadSuccess) {
          // Keep dialog open and show error - user can retry or close manually
          queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
          toast({
            title: t("error"),
            description: t("challengeCreated") + " - " + t("failedToUploadThumbnail"),
            variant: "destructive",
          });
          // Update editing challenge to point to newly created one for retry
          setEditingChallenge(newChallenge);
          return;
        }
      }
      
      // Success - close dialog and reset state
      queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
      setIsDialogOpen(false);
      form.reset();
      setEditingChallenge(null);
      setThumbnailFile(null);
      setThumbnailPreview(null);
      toast({
        title: t("success"),
        description: t("challengeCreated"),
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: t("unauthorized"),
          description: t("loginRequired"),
          variant: "destructive",
        });
        return;
      }
      toast({
        title: t("error"),
        description: t("failedToCreateChallenge"),
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateChallengeInput> }) => {
      return await apiRequest(`/api/challenges/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: async (_data, variables) => {
      // Upload thumbnail if one was selected
      if (thumbnailFile && variables.id) {
        const uploadSuccess = await uploadThumbnail(variables.id, thumbnailFile);
        if (!uploadSuccess) {
          // Keep dialog open and show error - user can retry or close manually
          queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
          toast({
            title: t("error"),
            description: t("challengeUpdated") + " - " + t("failedToUploadThumbnail"),
            variant: "destructive",
          });
          return;
        }
      }
      
      // Success - close dialog and reset state
      queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
      setIsDialogOpen(false);
      setEditingChallenge(null);
      form.reset();
      setThumbnailFile(null);
      setThumbnailPreview(null);
      toast({
        title: t("success"),
        description: t("challengeUpdated"),
      });
    },
    onError: () => {
      toast({
        title: t("error"),
        description: t("failedToUpdateChallenge"),
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/challenges/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
      toast({
        title: t("success"),
        description: t("challengeDeleted"),
      });
    },
    onError: () => {
      toast({
        title: t("error"),
        description: t("failedToDeleteChallenge"),
        variant: "destructive",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return await apiRequest(`/api/challenges/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
    },
  });

  // Helper function to upload thumbnail with proper error handling
  const uploadThumbnail = async (challengeId: string, file: File): Promise<boolean> => {
    try {
      const formData = new FormData();
      formData.append('thumbnail', file);
      const res = await fetch(`/api/challenges/${challengeId}/thumbnail`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!res.ok) {
        return false;
      }
      // Parse JSON to verify success
      const data = await res.json();
      // Success if we have thumbnailUrl or challenge in response
      return !!(data.thumbnailUrl || data.challenge);
    } catch (e) {
      console.error('Failed to upload thumbnail:', e);
      return false;
    }
  };

  const handleEdit = (challenge: Challenge) => {
    setEditingChallenge(challenge);
    form.reset({
      title: challenge.title,
      description: challenge.description,
      topic: challenge.topic,
      difficulty: challenge.difficulty as "easy" | "medium" | "hard",
      maxRounds: challenge.maxRounds,
      isActive: challenge.isActive,
      infoForUsers: challenge.infoForUsers || "",
      aiInstructions: challenge.aiInstructions || "",
    });
    // Set thumbnail preview if exists
    if (challenge.thumbnailStorageKey) {
      setThumbnailPreview(`/objects/${challenge.thumbnailStorageKey}`);
    } else {
      setThumbnailPreview(null);
    }
    setThumbnailFile(null);
    setIsDialogOpen(true);
  };

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearThumbnail = () => {
    setThumbnailFile(null);
    setThumbnailPreview(null);
    if (thumbnailInputRef.current) {
      thumbnailInputRef.current.value = '';
    }
  };

  const onSubmit = (data: CreateChallengeInput) => {
    if (editingChallenge) {
      updateMutation.mutate({ id: editingChallenge.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "medium": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "hard": return "bg-red-500/10 text-red-500 border-red-500/20";
      default: return "";
    }
  };

  const getBestScore = (challengeId: string): number | null => {
    const attempts = userAttempts.filter(a => a.challengeId === challengeId && a.status === "completed");
    if (attempts.length === 0) return null;
    return Math.max(...attempts.map(a => a.score || 0));
  };

  const filteredChallenges = challenges.filter(c => 
    difficultyFilter === "all" || c.difficulty === difficultyFilter
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg text-muted-foreground">{t("loading")}</div>
      </div>
    );
  }

  // Helper to get position medal/color
  const getPositionBadge = (position: number) => {
    if (position === 1) return <Medal className="h-5 w-5 text-yellow-500" />;
    if (position === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (position === 3) return <Medal className="h-5 w-5 text-amber-600" />;
    return <span className="text-muted-foreground font-medium">{position}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Swords className="h-8 w-8" />
            {t("challenges")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("challengesSubtitle")}</p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
            <SelectTrigger className="w-[140px]" data-testid="select-difficulty-filter">
              <SelectValue placeholder={t("difficulty")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allDifficulties")}</SelectItem>
              <SelectItem value="easy">{t("difficultyEasy")}</SelectItem>
              <SelectItem value="medium">{t("difficultyMedium")}</SelectItem>
              <SelectItem value="hard">{t("difficultyHard")}</SelectItem>
            </SelectContent>
          </Select>

          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setEditingChallenge(null);
                form.reset();
                setThumbnailFile(null);
                setThumbnailPreview(null);
              }
            }}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-challenge">
                  <Plus className="h-4 w-4 mr-2" />
                  {t("createChallenge")}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingChallenge ? t("editChallenge") : t("createChallenge")}
                  </DialogTitle>
                  <DialogDescription>
                    {t("challengeFormDescription")}
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("challengeTitle")}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder={t("challengeTitlePlaceholder")}
                              data-testid="input-challenge-title"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("challengeDescription")}</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder={t("challengeDescriptionPlaceholder")}
                              data-testid="input-challenge-description"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="topic"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("debateTopic")}</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder={t("debateTopicPlaceholder")}
                              data-testid="input-debate-topic"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="difficulty"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("difficulty")}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-difficulty">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="easy">{t("difficultyEasy")}</SelectItem>
                                <SelectItem value="medium">{t("difficultyMedium")}</SelectItem>
                                <SelectItem value="hard">{t("difficultyHard")}</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="maxRounds"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("maxRounds")}</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                max={10}
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 3)}
                                data-testid="input-max-rounds"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {/* Thumbnail Upload */}
                    <div className="space-y-2">
                      <Label>{t("thumbnail")}</Label>
                      <div className="flex items-center gap-4">
                        {thumbnailPreview ? (
                          <div className="relative">
                            <img
                              src={thumbnailPreview}
                              alt="Thumbnail preview"
                              className="h-24 w-24 object-cover rounded-md border"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute -top-2 -right-2 h-6 w-6"
                              onClick={clearThumbnail}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="h-24 w-24 border-2 border-dashed rounded-md flex items-center justify-center bg-muted/50">
                            <Image className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        <div className="space-y-2">
                          <input
                            ref={thumbnailInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleThumbnailSelect}
                            className="hidden"
                            data-testid="input-challenge-thumbnail"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => thumbnailInputRef.current?.click()}
                            data-testid="button-upload-thumbnail"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            {t("uploadThumbnail")}
                          </Button>
                          <p className="text-xs text-muted-foreground">
                            {editingChallenge ? t("thumbnailWillBeUploaded") : t("thumbnailWillBeUploadedOnSave")}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="infoForUsers"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Информация для участников</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              value={field.value ?? ""}
                              placeholder="Опишите контекст задания для участников (будет показано перед началом дебатов)"
                              data-testid="input-info-for-users"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="aiInstructions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Инструкции для AI — только для создателя</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              value={field.value ?? ""}
                              placeholder="Секретный контекст для AI (участники не видят). Например: «Ты — венчурный инвестор. Выдай инвестицию: X млн руб за Y%. Оцени защиту питча.»"
                              rows={4}
                              data-testid="input-ai-instructions"
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">Участники не видят этот текст. Используется как скрытый системный контекст для AI.</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <DialogFooter>
                      <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit-challenge">
                        {createMutation.isPending || updateMutation.isPending ? t("saving") : t("save")}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Challenges Grid - Always Visible */}
      <div className="mb-6">
        {filteredChallenges.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Target className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t("noChallenges")}</h3>
              <p className="text-muted-foreground text-center">
                {isAdmin ? t("createFirstChallenge") : t("checkBackLater")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredChallenges.map((challenge) => {
              const bestScore = getBestScore(challenge.id);
              return (
                <Card
                  key={challenge.id}
                  className={`hover-elevate cursor-pointer transition-all ${!challenge.isActive && isAdmin ? "opacity-60" : ""}`}
                  onClick={() => navigate(`/challenges/${challenge.id}`)}
                  data-testid={`card-challenge-${challenge.id}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-xl line-clamp-2">{challenge.title}</CardTitle>
                      <Badge variant="outline" className={getDifficultyColor(challenge.difficulty)}>
                        {t(`difficulty${challenge.difficulty.charAt(0).toUpperCase() + challenge.difficulty.slice(1)}` as any)}
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-3">{challenge.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Swords className="h-4 w-4" />
                        <span>{challenge.maxRounds} {t("rounds")}</span>
                      </div>
                      {bestScore !== null && (
                        <div className="flex items-center gap-1">
                          <Trophy className="h-4 w-4 text-yellow-500" />
                          <span className="text-yellow-500 font-medium">{bestScore}</span>
                        </div>
                      )}
                    </div>
                    {!challenge.isActive && isAdmin && (
                      <Badge variant="secondary" className="mt-3">{t("inactive")}</Badge>
                    )}
                  </CardContent>
                  {isAdmin && (
                    <CardFooter className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(challenge)}
                        data-testid={`button-edit-${challenge.id}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleActiveMutation.mutate({ id: challenge.id, isActive: !challenge.isActive })}
                        data-testid={`button-toggle-${challenge.id}`}
                      >
                        {challenge.isActive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm(t("confirmDeleteChallenge"))) {
                            deleteMutation.mutate(challenge.id);
                          }
                        }}
                        data-testid={`button-delete-${challenge.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardFooter>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3" data-testid="tabs-challenges">
          <TabsTrigger value="latestResults" className="flex items-center gap-2" data-testid="tab-latest-results">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">{t("latestResults")}</span>
          </TabsTrigger>
          <TabsTrigger value="seasonal" className="flex items-center gap-2" data-testid="tab-seasonal">
            <Trophy className="h-4 w-4" />
            <span className="hidden sm:inline">{t("leaderboards")}</span>
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-2" data-testid="tab-team">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">{t("constructorsChampionship")}</span>
          </TabsTrigger>
        </TabsList>

        {/* Latest Results Tab */}
        <TabsContent value="latestResults" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                {t("latestResults")}
              </CardTitle>
              <CardDescription>{t("latestResultsDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingLatestResults ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground">{t("loading")}</div>
                </div>
              ) : globalLatestResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">{t("noLatestResults")}</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {globalLatestResults.map((result) => (
                    <div key={result.challengeId} className="space-y-2">
                      <div className="flex items-center gap-2 mb-3">
                        <Swords className="h-4 w-4 text-muted-foreground" />
                        <h4 className="font-semibold">{result.challengeTitle}</h4>
                      </div>
                      <div className="space-y-2 pl-6">
                        {result.entries.map((entry, index) => (
                          <div
                            key={`${result.challengeId}-${entry.userId}-${index}`}
                            className={`flex items-center justify-between p-3 rounded-lg ${
                              entry.rank <= 3 ? "bg-yellow-500/10" : "bg-muted/50"
                            }`}
                            data-testid={`latest-result-${result.challengeId}-${entry.rank}`}
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-8 flex justify-center">
                                {getPositionBadge(entry.rank)}
                              </div>
                              <div>
                                <div className="font-medium">
                                  {entry.userFirstName} {entry.userLastName}
                                </div>
                                {entry.completedAt && (
                                  <div className="text-xs text-muted-foreground">
                                    {new Date(entry.completedAt).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-lg">{entry.score}</div>
                              <div className="text-xs text-muted-foreground">{t("points")}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Seasonal Leaderboard Tab (FIS Points) */}
        <TabsContent value="seasonal" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                {t("seasonalLeaderboard")}
              </CardTitle>
              <CardDescription>{t("seasonalLeaderboardDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingSeasonalLeaderboard ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground">{t("loading")}</div>
                </div>
              ) : seasonalLeaderboard.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Award className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">{t("noSeasonalData")}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {seasonalLeaderboard.map((entry, index) => (
                    <div
                      key={entry.rank}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        index < 3 ? "bg-yellow-500/10" : "bg-muted/50"
                      }`}
                      data-testid={`seasonal-entry-${entry.rank}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 flex justify-center">
                          {getPositionBadge(entry.rank)}
                        </div>
                        <div>
                          <div className="font-medium">
                            {entry.userFirstName} {entry.userLastName}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-bold text-lg">{entry.totalPoints}</div>
                          <div className="text-xs text-muted-foreground">
                            {entry.challengeCount} {t("challengesCompleted")}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Championship Tab */}
        <TabsContent value="team" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-500" />
                {t("teamChampionship")}
              </CardTitle>
              <CardDescription>{t("teamChampionshipDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingTeamChampionship ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground">{t("loading")}</div>
                </div>
              ) : teamChampionship.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">{t("noTeamData")}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {teamChampionship.map((team, index) => (
                    <div
                      key={team.rank}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        index < 3 ? "bg-blue-500/10" : "bg-muted/50"
                      }`}
                      data-testid={`team-entry-${team.rank}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 flex justify-center">
                          {getPositionBadge(team.rank)}
                        </div>
                        <div>
                          <div className="font-medium">{team.organizationName}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {team.memberCount} {t("members")}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">{team.totalPoints}</div>
                        <div className="text-xs text-muted-foreground">{t("points")}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
