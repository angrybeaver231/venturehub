import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Rocket, Building2, Globe, MapPin, Users, Trash2, Edit2, Loader2, Upload } from "lucide-react";
import { VitalityScore } from "@/components/vitality-score";
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
import { FounderPulseBadge } from "@/components/founder-pulse-badge";
import { useLocation } from "wouter";
import { createStartupSchema, STARTUP_STAGES, type Startup, type CreateStartupInput } from "@shared/schema";
import { VerifiedMrrBadge } from "@/components/verified-mrr-badge";

const VERTICALS = ["fintech", "edtech", "healthtech", "legaltech", "agritech", "proptech", "other"] as const;

export default function Startups() {
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const { t, language } = useLanguage();
  const [, navigate] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStartup, setEditingStartup] = useState<Startup | null>(null);
  const [verticalFilter, setVerticalFilter] = useState<string>("all");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [logoUploading, setLogoUploading] = useState(false);

  const form = useForm<CreateStartupInput>({
    resolver: zodResolver(createStartupSchema),
    defaultValues: {
      name: "",
      description: "",
      website: "",
      vertical: "",
      stage: "idea",
      techStack: "",
      hqCity: "",
      logo: "",
      pitchDeckUrl: "",
      universityAffiliation: "",
      programAffiliation: "",
      domain: "",
      githubRepoUrl: "",
      telegramChannel: "",
      hhEmployerId: "",
      inn: "",
      appStoreIds: { appStore: "", googlePlay: "", ruStore: "" },
    },
  });

  usePageSEO({
    title: "Startups | Стартапы",
    description: "Discover and manage startups. Connect with founders and teams. Узнайте о стартапах и свяжитесь с основателями.",
    keywords: "startups, founders, teams, venture, стартапы, основатели",
  });

  const queryParams = new URLSearchParams();
  if (verticalFilter !== "all") queryParams.set("vertical", verticalFilter);
  if (stageFilter !== "all") queryParams.set("stage", stageFilter);
  const queryString = queryParams.toString();

  const { data: startups = [], isLoading } = useQuery<Startup[]>({
    queryKey: ["/api/startups", queryString],
    queryFn: async () => {
      const url = queryString ? `/api/startups?${queryString}` : "/api/startups";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch startups");
      return res.json();
    },
  });

  const { data: myStartups = [], isLoading: isLoadingMyStartups } = useQuery<Startup[]>({
    queryKey: ["/api/my-startups"],
    enabled: isAuthenticated && activeTab === "my",
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateStartupInput) => {
      const res = await apiRequest("/api/startups", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/startups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-startups"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: t("success"), description: t("startupCreated") });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: t("unauthorized"), description: t("loginRequired"), variant: "destructive" });
        return;
      }
      toast({ title: t("error"), description: "Failed to create startup", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateStartupInput> }) => {
      return await apiRequest(`/api/startups/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/startups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-startups"] });
      setIsDialogOpen(false);
      setEditingStartup(null);
      form.reset();
      toast({ title: t("success"), description: t("startupUpdated") });
    },
    onError: () => {
      toast({ title: t("error"), description: "Failed to update startup", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/startups/${id}`, { method: "DELETE" });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/startups"], refetchType: "all" });
      await queryClient.invalidateQueries({ queryKey: ["/api/my-startups"], refetchType: "all" });
      toast({ title: t("success"), description: t("startupDeleted") });
    },
    onError: () => {
      toast({ title: t("error"), description: "Failed to delete startup", variant: "destructive" });
    },
  });

  const handleLogoUpload = async (file: File, startupId: string) => {
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);
      const res = await fetch(`/api/startups/${startupId}/logo`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      form.setValue("logo", data.url);
      queryClient.invalidateQueries({ queryKey: ["/api/startups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-startups"] });
      toast({ title: t("logoUploaded"), description: t("logoUploadedDescription") });
    } catch {
      toast({ title: t("error"), description: "Failed to upload logo", variant: "destructive" });
    } finally {
      setLogoUploading(false);
    }
  };

  const handleEdit = (startup: Startup) => {
    setEditingStartup(startup);
    form.reset({
      name: startup.name,
      description: startup.description || "",
      website: startup.website || "",
      vertical: startup.vertical || "",
      stage: (startup.stage as CreateStartupInput["stage"]) || "idea",
      techStack: startup.techStack || "",
      hqCity: startup.hqCity || "",
      logo: startup.logo || "",
      pitchDeckUrl: startup.pitchDeckUrl || "",
      universityAffiliation: startup.universityAffiliation || "",
      programAffiliation: startup.programAffiliation || "",
      domain: startup.domain || "",
      githubRepoUrl: startup.githubRepoUrl || "",
      telegramChannel: startup.telegramChannel || "",
      hhEmployerId: startup.hhEmployerId || "",
      inn: startup.inn || "",
      appStoreIds: startup.appStoreIds || { appStore: "", googlePlay: "", ruStore: "" },
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: CreateStartupInput) => {
    if (editingStartup) {
      updateMutation.mutate({ id: editingStartup.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getStageColor = (stage: string | null) => {
    switch (stage) {
      case "idea": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "mvp": return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "seed": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "seriesA": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "seriesB": return "bg-red-500/10 text-red-500 border-red-500/20";
      case "growth": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "scaleUp": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      default: return "";
    }
  };

  const getVerticalLabel = (vertical: string | null) => {
    const labels: Record<string, string> = {
      fintech: t("verticalFintech"), edtech: t("verticalEdtech"), healthtech: t("verticalHealthtech"),
      legaltech: t("verticalLegaltech"), agritech: t("verticalAgritech"), proptech: t("verticalProptech"),
      other: t("verticalOther"),
    };
    return labels[vertical || ""] || t("verticalOther");
  };

  const getStageLabel = (stage: string | null) => {
    const labels: Record<string, string> = {
      idea: t("stageIdea"), mvp: t("stageMvp"), seed: t("stageSeed"),
      seriesA: t("stageSeriesA"), seriesB: t("stageSeriesB"),
      growth: t("stageGrowth"), scaleUp: t("stageScaleUp"),
    };
    return labels[stage || ""] || t("stageUnknown");
  };

  const renderStartupCard = (startup: Startup, showActions = false) => {
    const initials = startup.name
      .split(/\s+/)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    return (
      <Card
        key={startup.id}
        className="hover-elevate cursor-pointer transition-all overflow-hidden"
        onClick={() => navigate(`/startups/${startup.id}`)}
        data-testid={`card-startup-${startup.id}`}
      >
        {/* Header — TeamHub-style "Employee Details" pattern: avatar chip on the
            left, name + sub-line + status pill on the right. */}
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            {startup.logo ? (
              <img
                src={startup.logo}
                alt={startup.name}
                className="h-14 w-14 rounded-md object-cover bg-muted shrink-0"
                data-testid={`img-startup-logo-${startup.id}`}
              />
            ) : (
              <div className="h-14 w-14 rounded-md bg-accent text-accent-foreground flex items-center justify-center shrink-0">
                <span className="text-base font-semibold" data-testid={`text-startup-initials-${startup.id}`}>
                  {initials || <Rocket className="h-6 w-6" />}
                </span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground" data-testid={`text-startup-tag-${startup.id}`}>
                {startup.vertical ? getVerticalLabel(startup.vertical) : (language === "ru" ? "Стартап" : "Startup")}
              </div>
              <CardTitle className="text-base line-clamp-1 mt-0.5" data-testid={`text-startup-name-${startup.id}`}>
                {startup.name}
              </CardTitle>
              <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                {(startup as any).activityStatus && (
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border ${
                      (startup as any).activityStatus === "active"
                        ? "bg-accent text-accent-foreground border-accent-border"
                        : "bg-muted text-muted-foreground border-muted-border"
                    }`}
                    data-testid={`badge-activity-${startup.id}`}
                  >
                    <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${(startup as any).activityStatus === "active" ? "bg-primary" : "bg-muted-foreground/50"}`} />
                    {(startup as any).activityStatus === "active"
                      ? (language === "ru" ? "Активен" : "Active")
                      : (language === "ru" ? "Неактивен" : "Inactive")}
                  </span>
                )}
                <VerifiedMrrBadge startupId={startup.id} />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {/* Info-row block — TeamHub "Employment Type / Work Model / Join Date" pattern */}
          <div className="rounded-md border bg-muted/30 divide-y divide-border text-sm overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-3 py-2">
              <span className="text-muted-foreground text-xs">{language === "ru" ? "Стадия" : "Stage"}</span>
              {startup.stage ? (
                <Badge variant="outline" className={getStageColor(startup.stage)} data-testid={`badge-stage-${startup.id}`}>
                  {getStageLabel(startup.stage)}
                </Badge>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 px-3 py-2">
              <span className="text-muted-foreground text-xs">{language === "ru" ? "Город" : "HQ"}</span>
              <span className="font-medium truncate max-w-[60%]" data-testid={`text-startup-city-${startup.id}`}>
                {startup.hqCity || "—"}
              </span>
            </div>
            {startup.teamSize ? (
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="text-muted-foreground text-xs">{language === "ru" ? "Команда" : "Team"}</span>
                <span
                  className="font-medium tabular-nums"
                  data-testid={`badge-team-${startup.id}`}
                >
                  {startup.teamSize}
                </span>
              </div>
            ) : null}
          </div>
          {/* Footer chips — vitality + pulse + website */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <VitalityScore startupId={startup.id} size="sm" />
            <FounderPulseBadge startupId={startup.id} />
            {startup.website && (
              <Badge variant="secondary" data-testid={`badge-website-${startup.id}`}>
                <Globe className="h-3 w-3 mr-1" />
                {t("startupWebsite")}
              </Badge>
            )}
          </div>
        </CardContent>
        {showActions && (
          <CardFooter className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(startup);
              }}
              data-testid={`button-edit-startup-${startup.id}`}
            >
              <Edit2 className="h-4 w-4 mr-1" />
              {t("edit")}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                deleteMutation.mutate(startup.id);
              }}
              disabled={deleteMutation.isPending}
              data-testid={`button-delete-startup-${startup.id}`}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {t("delete")}
            </Button>
          </CardFooter>
        )}
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Rocket className="h-8 w-8" />
            {t("startupsTitle")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("startupsSubtitle")}</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Select value={verticalFilter} onValueChange={setVerticalFilter}>
            <SelectTrigger className="w-[140px]" data-testid="select-vertical-filter">
              <SelectValue placeholder={t("startupVertical")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allVerticals")}</SelectItem>
              {VERTICALS.map((v) => (
                <SelectItem key={v} value={v}>{getVerticalLabel(v)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-[140px]" data-testid="select-stage-filter">
              <SelectValue placeholder={t("startupStage")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allStages")}</SelectItem>
              {STARTUP_STAGES.map((s) => (
                <SelectItem key={s} value={s}>{getStageLabel(s)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isAuthenticated && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setEditingStartup(null);
                form.reset();
              }
            }}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-startup">
                  <Plus className="h-4 w-4 mr-2" />
                  {t("newStartup")}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingStartup ? t("editStartup") : t("createStartup")}
                  </DialogTitle>
                  <DialogDescription>
                    {editingStartup ? t("editStartupDescription") : t("createStartupDescription")}
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("startupName")}</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={t("startupNamePlaceholder")} data-testid="input-startup-name" />
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
                          <FormLabel>{t("startupDescription")}</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder={t("startupDescriptionPlaceholder")} data-testid="input-startup-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="vertical"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("startupVertical")}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger data-testid="select-startup-vertical">
                                  <SelectValue placeholder={t("selectVertical")} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {VERTICALS.map((v) => (
                                  <SelectItem key={v} value={v}>{getVerticalLabel(v)}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="stage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("startupStage")}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || "idea"}>
                              <FormControl>
                                <SelectTrigger data-testid="select-startup-stage">
                                  <SelectValue placeholder={t("selectStage")} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {STARTUP_STAGES.map((s) => (
                                  <SelectItem key={s} value={s}>{getStageLabel(s)}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="website"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("startupWebsite")}</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder={t("startupWebsitePlaceholder")} data-testid="input-startup-website" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="hqCity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("startupCity")}</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder={t("startupCityPlaceholder")} data-testid="input-startup-city" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="logo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("startupLogo")}</FormLabel>
                          <FormControl>
                            <div className="space-y-2">
                              <Input {...field} placeholder={t("startupLogoPlaceholder")} data-testid="input-startup-logo" />
                              {editingStartup && (
                                <div className="flex items-center gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={logoUploading}
                                    onClick={() => {
                                      const input = document.createElement("input");
                                      input.type = "file";
                                      input.accept = "image/png,image/jpeg,image/jpg,image/gif,image/webp";
                                      input.onchange = (e) => {
                                        const file = (e.target as HTMLInputElement).files?.[0];
                                        if (file) handleLogoUpload(file, editingStartup.id);
                                      };
                                      input.click();
                                    }}
                                    data-testid="button-upload-logo"
                                  >
                                    {logoUploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                                    {t("uploadImage")}
                                  </Button>
                                  {field.value && (
                                    <img src={field.value} alt="Logo preview" className="h-8 w-8 rounded-md object-cover" />
                                  )}
                                </div>
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="pitchDeckUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("startupPitchDeck")}</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={t("startupPitchDeckPlaceholder")} data-testid="input-startup-pitchdeck" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="techStack"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("startupTechStack")}</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder={t("startupTechStackPlaceholder")} data-testid="input-startup-techstack" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="universityAffiliation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("startupUniversity")}</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder={t("startupUniversityPlaceholder")} data-testid="input-startup-university" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <details className="border rounded-md p-3" data-testid="details-public-signal-config">
                      <summary className="cursor-pointer text-sm font-medium">
                        {language === "ru" ? "Публичные сигналы (опционально)" : "Public-signal config (optional)"}
                      </summary>
                      <div className="mt-3 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <FormField
                            control={form.control}
                            name="domain"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{language === "ru" ? "Домен" : "Domain"}</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="example.com" data-testid="input-startup-domain" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="inn"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>ИНН</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="7701234567" data-testid="input-startup-inn" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name="githubRepoUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>GitHub repo URL</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="https://github.com/owner/repo" data-testid="input-startup-github" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <FormField
                            control={form.control}
                            name="telegramChannel"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{language === "ru" ? "Telegram канал" : "Telegram channel"}</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="@channel" data-testid="input-startup-telegram" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="hhEmployerId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>HH.ru employer ID</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="123456" data-testid="input-startup-hh" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <FormField
                            control={form.control}
                            name="appStoreIds.appStore"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>App Store ID</FormLabel>
                                <FormControl>
                                  <Input {...field} value={field.value ?? ""} placeholder="123456789" data-testid="input-startup-appstore" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="appStoreIds.googlePlay"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Google Play ID</FormLabel>
                                <FormControl>
                                  <Input {...field} value={field.value ?? ""} placeholder="com.example.app" data-testid="input-startup-googleplay" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="appStoreIds.ruStore"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>RuStore ID</FormLabel>
                                <FormControl>
                                  <Input {...field} value={field.value ?? ""} placeholder="com.example.app" data-testid="input-startup-rustore" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </details>
                    <DialogFooter>
                      <Button
                        type="submit"
                        disabled={createMutation.isPending || updateMutation.isPending}
                        data-testid="button-submit-startup"
                      >
                        {(createMutation.isPending || updateMutation.isPending) ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            {t("saving")}
                          </>
                        ) : (
                          editingStartup ? t("save") : t("create")
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-startups">
          <TabsTrigger value="all" data-testid="tab-all-startups">{t("allStartups")}</TabsTrigger>
          {isAuthenticated && (
            <TabsTrigger value="my" data-testid="tab-my-startups">{t("myStartups")}</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {startups.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Rocket className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2" data-testid="text-no-startups">{t("noStartupsFound")}</h3>
                <p className="text-muted-foreground text-center">
                  {isAuthenticated ? t("beFirstStartup") : t("checkBackStartups")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {startups.map((startup) => renderStartupCard(startup))}
            </div>
          )}
        </TabsContent>

        {isAuthenticated && (
          <TabsContent value="my" className="mt-6">
            {isLoadingMyStartups ? (
              <div className="flex items-center justify-center min-h-[200px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : myStartups.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Rocket className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2" data-testid="text-no-my-startups">{t("noStartupsYet")}</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    {t("createFirstStartup")}
                  </p>
                  <Button
                    onClick={() => setIsDialogOpen(true)}
                    data-testid="button-create-first-startup"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t("createStartup")}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {myStartups.map((startup) => renderStartupCard(startup, true))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
