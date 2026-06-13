import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { VitalityScore } from "@/components/vitality-score";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useRoute, useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TeamRosterSection } from "@/components/team-roster-section";
import { FounderPulseBadge } from "@/components/founder-pulse-badge";
import { UnifiedTimeline } from "@/components/unified-timeline";
import { VerifiedMrrBadge } from "@/components/verified-mrr-badge";
import { FinancialStoryCard } from "@/components/financial-story-card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Users,
  BarChart3,
  Plus,
  Trash2,
  Globe,
  FileText,
  MapPin,
  Calendar,
  Loader2,
  Rocket,
  Building2,
  GraduationCap,
  Code,
  Star,
  MessageCircle,
  ShieldCheck,
  CheckCircle,
  Clock,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Pencil,
  Banknote,
  Plug,
  HelpCircle,
} from "lucide-react";
import type {
  Startup,
  StartupMemberWithUser,
  StartupMetric,
  BriefApplication,
  Evaluation,
  StartupAffiliation,
  University,
  Club,
} from "@shared/schema";
import { STARTUP_MEMBER_ROLES } from "@shared/schema";
import { Link } from "wouter";
import { AIInvestmentMemoDialog } from "@/components/ai-investment-memo-dialog";
import { StartupMetricsChart, computeMoM } from "@/components/startup-metrics-chart";
import { StartupOnboardingTour } from "@/components/startup-onboarding-tour";
import { StartupEditDialog } from "@/components/startup-edit-dialog";
import { FounderHeroBar } from "@/components/founder-hero-bar";
import { FounderKpiRow } from "@/components/founder-kpi-row";
import { StartupAiAssistant } from "@/components/startup-ai-assistant";
import { StartupDocumentsSection } from "@/components/startup-documents-section";

type StartupReadiness = {
  id: string;
  startupId: string;
  hasLiveB2BPilots: boolean;
  hasBankFintechExperience: boolean;
  isRegulated: boolean;
  isSecurityReviewed: boolean;
  problemStatement: string | null;
  targetUnits: string | null;
  integrationModel: string | null;
  dataRequirements: string | null;
  existingReferences: string | null;
  completenessScore: number;
  visibilityScope: string;
  visibleToCompanyIds: string[] | null;
};

type EvaluationSummary = {
  count: number;
  avgTeamScore: number | null;
  avgProductScore: number | null;
  avgMarketScore: number | null;
  avgTractionScore: number | null;
  avgStrategicFitScore: number | null;
  avgRiskScore: number | null;
  avgTotalScore: number | null;
};

function StartupAffiliationsCard({ startupId, canEdit }: { startupId: string; canEdit: boolean }) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [selectedUniversityId, setSelectedUniversityId] = useState("");
  const [selectedClubId, setSelectedClubId] = useState("");

  const { data: affiliations = [] } = useQuery<StartupAffiliation[]>({
    queryKey: ["/api/startups", startupId, "affiliations"],
    enabled: !!startupId,
  });

  const { data: universities = [] } = useQuery<University[]>({
    queryKey: ["/api/universities"],
  });

  const { data: clubs = [] } = useQuery<Club[]>({
    queryKey: ["/api/clubs"],
  });

  const addAffiliationMutation = useMutation({
    mutationFn: async (data: { startupId: string; universityId?: string; clubId?: string }) => {
      const res = await apiRequest("/api/startup-affiliations", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/startups", startupId, "affiliations"] });
      setSelectedUniversityId("");
      setSelectedClubId("");
      toast({ title: t("success") });
    },
    onError: () => {
      toast({ title: t("error"), variant: "destructive" });
    },
  });

  const removeAffiliationMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/api/startup-affiliations/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/startups", startupId, "affiliations"] });
    },
  });

  const affiliatedUniversityIds = affiliations.filter(a => a.universityId).map(a => a.universityId);
  const affiliatedClubIds = affiliations.filter(a => a.clubId).map(a => a.clubId);

  const getUniversityName = (id: string | null) => universities.find(u => u.id === id)?.name || id;
  const getClubName = (id: string | null) => clubs.find(c => c.id === id)?.name || id;
  const getUniversitySlug = (id: string | null) => universities.find(u => u.id === id)?.slug;
  const getClubSlug = (id: string | null) => clubs.find(c => c.id === id)?.slug;

  return (
    <Card data-testid="card-affiliations-section">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          {t("universityAffiliations") || "University & Club Affiliations"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {affiliations.length > 0 && (
          <div className="space-y-2">
            {affiliations.map((aff) => (
              <div
                key={aff.id}
                className="flex items-center justify-between gap-2 rounded-md border p-2"
                data-testid={`row-affiliation-${aff.id}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {aff.universityId && (
                    <Link href={`/universities/${getUniversitySlug(aff.universityId) || aff.universityId}`}>
                      <Badge variant="secondary" className="cursor-pointer" data-testid={`badge-affiliation-uni-${aff.id}`}>
                        <GraduationCap className="h-3 w-3 mr-1" />
                        {getUniversityName(aff.universityId)}
                      </Badge>
                    </Link>
                  )}
                  {aff.clubId && (
                    <Link href={`/clubs/${getClubSlug(aff.clubId) || aff.clubId}`}>
                      <Badge variant="secondary" className="cursor-pointer" data-testid={`badge-affiliation-club-${aff.id}`}>
                        <Building2 className="h-3 w-3 mr-1" />
                        {getClubName(aff.clubId)}
                      </Badge>
                    </Link>
                  )}
                  {aff.isPrimary && (
                    <Badge variant="outline" data-testid={`badge-primary-${aff.id}`}>
                      <Star className="h-3 w-3 mr-1" />
                      {t("primary") || "Primary"}
                    </Badge>
                  )}
                </div>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAffiliationMutation.mutate(aff.id)}
                    disabled={removeAffiliationMutation.isPending}
                    data-testid={`button-remove-affiliation-${aff.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {canEdit && (
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={selectedUniversityId} onValueChange={setSelectedUniversityId}>
                <SelectTrigger className="w-[200px]" data-testid="select-affiliation-university">
                  <SelectValue placeholder={t("selectUniversity") || "Select University"} />
                </SelectTrigger>
                <SelectContent>
                  {universities.filter(u => !affiliatedUniversityIds.includes(u.id)).map((uni) => (
                    <SelectItem key={uni.id} value={uni.id}>{uni.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                disabled={!selectedUniversityId || addAffiliationMutation.isPending}
                onClick={() => addAffiliationMutation.mutate({ startupId, universityId: selectedUniversityId })}
                data-testid="button-add-university-affiliation"
              >
                <Plus className="h-4 w-4 mr-1" />
                {t("addUniversity") || "Add University"}
              </Button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={selectedClubId} onValueChange={setSelectedClubId}>
                <SelectTrigger className="w-[200px]" data-testid="select-affiliation-club">
                  <SelectValue placeholder={t("selectClub") || "Select Club"} />
                </SelectTrigger>
                <SelectContent>
                  {clubs.filter(c => !affiliatedClubIds.includes(c.id)).map((club) => (
                    <SelectItem key={club.id} value={club.id}>{club.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                disabled={!selectedClubId || addAffiliationMutation.isPending}
                onClick={() => addAffiliationMutation.mutate({ startupId, clubId: selectedClubId })}
                data-testid="button-add-club-affiliation"
              >
                <Plus className="h-4 w-4 mr-1" />
                {t("addClub") || "Add Club"}
              </Button>
            </div>
          </div>
        )}

        {affiliations.length === 0 && !canEdit && (
          <p className="text-sm text-muted-foreground" data-testid="text-no-affiliations">
            {t("noAffiliationsYet") || "No affiliations yet"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function StartupDetail() {
  const [, params] = useRoute("/startups/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const startupId = params?.id;

  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [addMetricOpen, setAddMetricOpen] = useState(false);
  const [aiMemoOpen, setAiMemoOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [editingMetricId, setEditingMetricId] = useState<string | null>(null);
  const [newMemberUserId, setNewMemberUserId] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("teamMember");
  const [metricMonth, setMetricMonth] = useState("");
  const [metricUsers, setMetricUsers] = useState("");
  const [metricRevenue, setMetricRevenue] = useState("");
  const [metricPilots, setMetricPilots] = useState("");
  const [metricMrr, setMetricMrr] = useState("");

  const { data: startup, isLoading } = useQuery<Startup>({
    queryKey: ["/api/startups", startupId],
    enabled: !!startupId,
  });

  const { data: members = [] } = useQuery<StartupMemberWithUser[]>({
    queryKey: ["/api/startups", startupId, "members"],
    enabled: !!startupId,
  });

  const { data: metrics = [] } = useQuery<StartupMetric[]>({
    queryKey: ["/api/startups", startupId, "metrics"],
    enabled: !!startupId,
  });

  const { data: evaluationSummary } = useQuery<EvaluationSummary>({
    queryKey: ["/api/evaluations", "startup", startupId, "summary"],
    enabled: !!startupId,
  });

  const { data: briefApplications = [] } = useQuery<BriefApplication[]>({
    queryKey: ["/api/startups", startupId, "brief-applications"],
    enabled: !!startupId,
  });

  const { data: readiness } = useQuery<StartupReadiness | null>({
    queryKey: ["/api/startups", startupId, "readiness"],
    enabled: !!startupId,
  });

  const { data: evaluations = [] } = useQuery<Evaluation[]>({
    queryKey: ["/api/evaluations", "startup", startupId],
    enabled: !!startupId,
  });

  const { data: startupActivityLogs = [] } = useQuery<any[]>({
    queryKey: ["/api/activity-logs", { entityId: startupId }],
    queryFn: () => fetch(`/api/activity-logs?entityId=${startupId}`).then(r => r.json()),
    enabled: !!startupId,
  });

  const [readinessForm, setReadinessForm] = useState<{
    hasLiveB2BPilots: boolean;
    hasBankFintechExperience: boolean;
    isRegulated: boolean;
    isSecurityReviewed: boolean;
    problemStatement: string;
    targetUnits: string;
    integrationModel: string;
    dataRequirements: string;
    existingReferences: string;
    visibilityScope: string;
  } | null>(null);

  const readinessData = readinessForm ?? {
    hasLiveB2BPilots: readiness?.hasLiveB2BPilots ?? false,
    hasBankFintechExperience: readiness?.hasBankFintechExperience ?? false,
    isRegulated: readiness?.isRegulated ?? false,
    isSecurityReviewed: readiness?.isSecurityReviewed ?? false,
    problemStatement: readiness?.problemStatement ?? "",
    targetUnits: readiness?.targetUnits ?? "",
    integrationModel: readiness?.integrationModel ?? "",
    dataRequirements: readiness?.dataRequirements ?? "",
    existingReferences: readiness?.existingReferences ?? "",
    visibilityScope: readiness?.visibilityScope ?? "global",
  };

  const updateReadinessField = (field: string, value: unknown) => {
    setReadinessForm((prev) => ({
      ...readinessData,
      ...prev,
      [field]: value,
    }));
  };

  const saveReadinessMutation = useMutation({
    mutationFn: async (data: typeof readinessData) => {
      return await apiRequest(`/api/startups/${startupId}/readiness`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/startups", startupId, "readiness"] });
      setReadinessForm(null);
      toast({ title: t("success"), description: t("readinessUpdated") });
    },
    onError: () => {
      toast({ title: t("error"), variant: "destructive" });
    },
  });

  const isFounder = members.some(
    (m) =>
      m.userId === user?.id &&
      (m.role === "founder" || m.role === "cofounder")
  );

  const isMember = members.some((m) => m.userId === user?.id);
  const isAdmin = user?.role === "innoLabsAdmin" || user?.isHeadAdmin;
  const canEditReadiness = isMember || isAdmin;
  const canEditStartup = isFounder || isAdmin;

  const addMemberMutation = useMutation({
    mutationFn: async (data: { userId: string; role: string }) => {
      return await apiRequest(`/api/startups/${startupId}/members`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/startups", startupId, "members"] });
      setAddMemberOpen(false);
      setNewMemberUserId("");
      setNewMemberRole("teamMember");
      toast({ title: t("success"), description: t("memberAddedSuccess") });
    },
    onError: () => {
      toast({ title: t("error"), description: t("failedToAddMember"), variant: "destructive" });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      return await apiRequest(`/api/startups/${startupId}/members/${memberId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/startups", startupId, "members"] });
      toast({ title: t("success"), description: t("memberRemovedSuccess") });
    },
    onError: () => {
      toast({ title: t("error"), description: t("failedToRemoveMember"), variant: "destructive" });
    },
  });

  const addMetricMutation = useMutation({
    mutationFn: async (data: {
      month: string;
      users?: number;
      revenue?: number;
      pilots?: number;
      mrr?: number;
    }) => {
      return await apiRequest(`/api/startups/${startupId}/metrics`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/startups", startupId, "metrics"] });
      setAddMetricOpen(false);
      setMetricMonth("");
      setMetricUsers("");
      setMetricRevenue("");
      setMetricPilots("");
      setMetricMrr("");
      toast({ title: t("success"), description: t("metricAddedSuccess") });
    },
    onError: () => {
      toast({ title: t("error"), description: t("failedToAddMetric"), variant: "destructive" });
    },
  });

  const handleAddMember = () => {
    if (!newMemberUserId.trim()) {
      toast({ title: t("error"), description: t("userIdRequired"), variant: "destructive" });
      return;
    }
    addMemberMutation.mutate({ userId: newMemberUserId, role: newMemberRole });
  };

  const updateMetricMutation = useMutation({
    mutationFn: async (data: { id: string; month: string; users?: number; revenue?: number; pilots?: number; mrr?: number }) => {
      return await apiRequest(`/api/startups/${startupId}/metrics/${data.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          month: data.month,
          users: data.users,
          revenue: data.revenue,
          pilots: data.pilots,
          mrr: data.mrr,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/startups", startupId, "metrics"] });
      setAddMetricOpen(false);
      setEditingMetricId(null);
      setMetricMonth(""); setMetricUsers(""); setMetricRevenue(""); setMetricPilots(""); setMetricMrr("");
      toast({ title: t("success") });
    },
    onError: () => {
      toast({ title: t("error"), variant: "destructive" });
    },
  });

  const deleteMetricMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/startups/${startupId}/metrics/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/startups", startupId, "metrics"] });
      toast({ title: t("success") });
    },
    onError: () => {
      toast({ title: t("error"), variant: "destructive" });
    },
  });

  const openEditMetric = (m: StartupMetric) => {
    setEditingMetricId(m.id);
    setMetricMonth(m.month);
    setMetricUsers(m.users != null ? String(m.users) : "");
    setMetricRevenue(m.revenue != null ? String(m.revenue) : "");
    setMetricPilots(m.pilots != null ? String(m.pilots) : "");
    setMetricMrr(m.mrr != null ? String(m.mrr) : "");
    setAddMetricOpen(true);
  };

  const handleAddMetric = () => {
    if (!metricMonth.trim()) {
      toast({ title: t("error"), description: t("monthRequired"), variant: "destructive" });
      return;
    }
    const payload = {
      month: metricMonth,
      users: metricUsers ? parseInt(metricUsers) : undefined,
      revenue: metricRevenue ? parseInt(metricRevenue) : undefined,
      pilots: metricPilots ? parseInt(metricPilots) : undefined,
      mrr: metricMrr ? parseInt(metricMrr) : undefined,
    };
    if (editingMetricId) {
      updateMetricMutation.mutate({ id: editingMetricId, ...payload });
    } else {
      addMetricMutation.mutate(payload);
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

  const getStageLabel = (stage: string | null) => {
    switch (stage) {
      case "idea": return t("stageIdea");
      case "mvp": return t("stageMvp");
      case "seed": return t("stageSeed");
      case "seriesA": return t("stageSeriesA");
      case "seriesB": return t("stageSeriesB");
      case "growth": return t("stageGrowth");
      case "scaleUp": return t("stageScaleUp");
      default: return stage || (language === "ru" ? "Неизвестно" : "Unknown");
    }
  };

  const getVerticalLabel = (vertical: string) => {
    switch (vertical) {
      case "fintech": return t("verticalFintech");
      case "edtech": return t("verticalEdtech");
      case "healthtech": return t("verticalHealthtech");
      case "legaltech": return t("verticalLegaltech");
      case "agritech": return t("verticalAgritech");
      case "proptech": return t("verticalProptech");
      case "other": return t("verticalOther");
      default: return vertical.charAt(0).toUpperCase() + vertical.slice(1);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "founder": return t("founder");
      case "cofounder": return t("cofounder");
      case "teamMember": return t("teamMember");
      case "advisor": return t("advisor");
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "founder": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "cofounder": return "bg-purple-500/10 text-purple-600 border-purple-500/20";
      case "advisor": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      default: return "";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "underReview": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "shortlisted": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "pilot": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "rejected": return "bg-red-500/10 text-red-500 border-red-500/20";
      default: return "";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" data-testid="loading-startup">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!startup) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Rocket className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2" data-testid="text-startup-not-found">{t("startupNotFound")}</h3>
        <Button onClick={() => navigate("/startups")} data-testid="button-back-to-startups">{t("backToStartups")}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate("/startups")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("backToStartups")}
        </Button>
      </div>

      {isFounder && (
        <>
          <FounderHeroBar
            startupName={startup.name}
            canEdit={!!canEditStartup}
            onEdit={() => setEditOpen(true)}
            onShowTour={() => setShowTour(true)}
            onOpenIntegrations={() => navigate(`/startups/${startup.id}/integrations`)}
          />
          <FounderKpiRow startupId={startup.id} />
        </>
      )}

      {!isFounder && (
        <div className="flex items-center justify-end gap-2 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTour(true)}
            data-testid="button-show-tour"
          >
            <HelpCircle className="h-4 w-4 mr-2" />
            {language === "ru" ? "Показать тур" : "Show tour"}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => navigate(`/startups/${startup.id}/integrations`)}
            data-testid="button-startup-integrations"
          >
            <Plug className="h-4 w-4 mr-2" />
            {language === "ru" ? "Интеграции" : "Integrations"}
          </Button>
        </div>
      )}

      <Card data-testid="card-startup-header">
        <CardHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 min-w-0">
              {startup.logo ? (
                <img
                  src={startup.logo}
                  alt={startup.name}
                  className="h-16 w-16 rounded-md object-cover shrink-0"
                  data-testid="img-startup-logo"
                />
              ) : (
                <div className="h-16 w-16 rounded-md bg-muted flex items-center justify-center shrink-0">
                  <Rocket className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold" data-testid="text-startup-name">{startup.name}</h1>
                  <VerifiedMrrBadge startupId={startup.id} size="md" />
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {startup.stage && (
                    <Badge variant="outline" className={getStageColor(startup.stage)} data-testid="badge-startup-stage">
                      {getStageLabel(startup.stage)}
                    </Badge>
                  )}
                  {startup.vertical && (
                    <Badge variant="secondary" data-testid="badge-startup-vertical">
                      <Building2 className="h-3 w-3 mr-1" />
                      {getVerticalLabel(startup.vertical)}
                    </Badge>
                  )}
                  {(startup as any).activityStatus && (
                    <Badge
                      variant={(startup as any).activityStatus === "active" ? "default" : "secondary"}
                      className={(startup as any).activityStatus === "active" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30" : "bg-muted text-muted-foreground"}
                      data-testid="badge-startup-activity"
                    >
                      <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${(startup as any).activityStatus === "active" ? "bg-emerald-500" : "bg-muted-foreground/50"}`} />
                      {(startup as any).activityStatus === "active" ? "Active" : "Inactive (6+ mo)"}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <VitalityScore startupId={startup.id} size="lg" showSparkline />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {startup.description && (
            <p className="text-muted-foreground" data-testid="text-startup-description">
              {startup.description}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {startup.website && (
              <a
                href={startup.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-foreground transition-colors"
                data-testid="link-startup-website"
                onClick={(e) => e.stopPropagation()}
              >
                <Globe className="h-4 w-4" />
                {t("startupWebsite")}
              </a>
            )}
            {startup.pitchDeckUrl && (
              <a
                href={startup.pitchDeckUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-foreground transition-colors"
                data-testid="link-startup-pitchdeck"
                onClick={(e) => e.stopPropagation()}
              >
                <FileText className="h-4 w-4" />
                {t("pitchDeck")}
              </a>
            )}
            {startup.hqCity && (
              <span className="flex items-center gap-1" data-testid="text-startup-city">
                <MapPin className="h-4 w-4" />
                {startup.hqCity}
              </span>
            )}
            {startup.createdAt && (
              <span className="flex items-center gap-1" data-testid="text-startup-founded">
                <Calendar className="h-4 w-4" />
                {t("founded")} {new Date(startup.createdAt).getFullYear()}
              </span>
            )}
            {startup.techStack && (
              <span className="flex items-center gap-1" data-testid="text-startup-techstack">
                <Code className="h-4 w-4" />
                {startup.techStack}
              </span>
            )}
            {startup.universityAffiliation && (
              <span className="flex items-center gap-1" data-testid="text-startup-university">
                <GraduationCap className="h-4 w-4" />
                {startup.universityAffiliation}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card data-testid="card-team-section">
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t("team")}
            </CardTitle>
            {isFounder && (
              <Button
                size="sm"
                onClick={() => setAddMemberOpen(true)}
                data-testid="button-add-member"
              >
                <Plus className="h-4 w-4 mr-1" />
                {t("addMember")}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground" data-testid="text-no-members">{t("noTeamMembersYet")}</p>
            ) : (
              <div className="space-y-3">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-3"
                    data-testid={`row-member-${member.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-9 w-9 shrink-0">
                        {member.user?.profileImageUrl && (
                          <AvatarImage src={member.user.profileImageUrl} alt={member.user.firstName || ""} />
                        )}
                        <AvatarFallback>
                          {(member.user?.firstName?.[0] || "") + (member.user?.lastName?.[0] || "")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" data-testid={`text-member-name-${member.id}`}>
                          {member.user?.firstName} {member.user?.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate" data-testid={`text-member-email-${member.id}`}>
                          {member.user?.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className={getRoleColor(member.role)} data-testid={`badge-member-role-${member.id}`}>
                        {getRoleLabel(member.role)}
                      </Badge>
                      {member.userId !== user?.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/messages?userId=${member.userId}`)}
                          data-testid={`button-message-member-${member.id}`}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      )}
                      {isFounder && member.role !== "founder" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeMemberMutation.mutate(member.id)}
                          disabled={removeMemberMutation.isPending}
                          data-testid={`button-remove-member-${member.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2 flex items-center gap-2">
          <FounderPulseBadge startupId={startupId!} />
        </div>

        <TeamRosterSection startupId={startupId!} canEdit={!!(isFounder || isAdmin)} />

        <Card data-testid="card-metrics-section">
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {t("metrics")}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAiMemoOpen(true)}
                data-testid="button-ai-memo"
              >
                <Sparkles className="h-4 w-4 mr-1" />
                {language === "ru" ? "ИИ заметка" : "AI memo"}
              </Button>
              {isFounder && (
                <Button
                  size="sm"
                  onClick={() => setAddMetricOpen(true)}
                  data-testid="button-add-metric"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t("addMetric")}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {metrics.length === 0 ? (
              <p className="text-sm text-muted-foreground" data-testid="text-no-metrics">{t("noMetricsYet")}</p>
            ) : (
              <div className="space-y-4">
                {metrics.length >= 2 && <StartupMetricsChart metrics={metrics} />}
                {(() => {
                  const mom = computeMoM(metrics);
                  if (!mom) return null;
                  const items: Array<{ key: string; label: string; pct: number | null }> = [
                    { key: "revenue", label: t("metricRevenue"), pct: mom.revenue },
                    { key: "mrr", label: t("metricMrr"), pct: mom.mrr },
                    { key: "users", label: t("metricUsers"), pct: mom.users },
                    { key: "pilots", label: t("metricPilots"), pct: mom.pilots },
                  ].filter(i => i.pct !== null);
                  if (items.length === 0) return null;
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {items.map(i => (
                        <div key={i.key} className="rounded-md border p-2 text-center" data-testid={`mom-${i.key}`}>
                          <div className="text-xs text-muted-foreground">{i.label} MoM</div>
                          <div className={`text-sm font-semibold flex items-center justify-center gap-1 ${(i.pct as number) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {(i.pct as number) >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {(i.pct as number).toFixed(1)}%
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
                {metrics.map((metric) => (
                  <Card key={metric.id} className="hover-elevate" data-testid={`card-metric-${metric.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <Badge variant="secondary" data-testid={`badge-metric-month-${metric.id}`}>
                          {metric.month}
                        </Badge>
                        {isFounder && (
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" onClick={() => openEditMetric(metric)} data-testid={`button-edit-metric-${metric.id}`}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => deleteMetricMutation.mutate(metric.id)} disabled={deleteMetricMutation.isPending} data-testid={`button-delete-metric-${metric.id}`}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {metric.users !== null && metric.users !== undefined && (
                          <div data-testid={`text-metric-users-${metric.id}`}>
                            <span className="text-muted-foreground">{t("metricUsers")}:</span>{" "}
                            <span className="font-medium">{metric.users.toLocaleString()}</span>
                          </div>
                        )}
                        {metric.revenue !== null && metric.revenue !== undefined && (
                          <div data-testid={`text-metric-revenue-${metric.id}`}>
                            <span className="text-muted-foreground">{t("metricRevenue")}:</span>{" "}
                            <span className="font-medium">${metric.revenue.toLocaleString()}</span>
                          </div>
                        )}
                        {metric.pilots !== null && metric.pilots !== undefined && (
                          <div data-testid={`text-metric-pilots-${metric.id}`}>
                            <span className="text-muted-foreground">{t("metricPilots")}:</span>{" "}
                            <span className="font-medium">{metric.pilots}</span>
                          </div>
                        )}
                        {metric.mrr !== null && metric.mrr !== undefined && (
                          <div data-testid={`text-metric-mrr-${metric.id}`}>
                            <span className="text-muted-foreground">{t("metricMrr")}:</span>{" "}
                            <span className="font-medium">${metric.mrr.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {(isFounder || isAdmin) && (
        <StartupAffiliationsCard startupId={startupId!} canEdit={!!(isFounder || isAdmin)} />
      )}

      {(isFounder || isAdmin) ? (
        <StartupAiAssistant startupId={startupId!} />
      ) : (
        <StartupDocumentsSection startupId={startupId!} canManage={false} publicOnly={true} />
      )}

      <Card data-testid="card-readiness-section">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            {t("readinessTitle")}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t("readinessSubtitle")}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div data-testid="readiness-progress">
            <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
              <span className="text-sm font-medium">{t("completenessScore")}</span>
              <span className="text-sm text-muted-foreground" data-testid="text-completeness-score">
                {readiness?.completenessScore ?? 0}%
              </span>
            </div>
            <Progress value={readiness?.completenessScore ?? 0} />
          </div>

          <div data-testid="readiness-checklist">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              {t("startupChecklist")}
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                { key: "hasLiveB2BPilots", label: t("liveB2BPilots") },
                { key: "hasBankFintechExperience", label: t("bankFintechExperience") },
                { key: "isRegulated", label: t("regulated") },
                { key: "isSecurityReviewed", label: t("securityReviewed") },
              ] as const).map((item) => (
                <div key={item.key} className="flex items-center gap-2" data-testid={`checkbox-${item.key}`}>
                  <Checkbox
                    checked={readinessData[item.key]}
                    onCheckedChange={(checked) => canEditReadiness && updateReadinessField(item.key, !!checked)}
                    disabled={!canEditReadiness}
                    id={`readiness-${item.key}`}
                  />
                  <label htmlFor={`readiness-${item.key}`} className="text-sm cursor-pointer select-none">
                    {item.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div data-testid="readiness-details">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {t("checklistProgress")}
            </h4>
            <div className="grid gap-4">
              {([
                { key: "problemStatement", label: t("problemStatement") },
                { key: "targetUnits", label: t("targetUnits") },
                { key: "integrationModel", label: t("integrationModel") },
                { key: "dataRequirements", label: t("dataRequirements") },
                { key: "existingReferences", label: t("existingReferences") },
              ] as const).map((item) => (
                <div key={item.key} data-testid={`field-${item.key}`}>
                  <label className="text-sm font-medium mb-1 block">{item.label}</label>
                  {canEditReadiness ? (
                    <Textarea
                      value={readinessData[item.key] || ""}
                      onChange={(e) => updateReadinessField(item.key, e.target.value)}
                      className="resize-none"
                      rows={2}
                      data-testid={`input-${item.key}`}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground" data-testid={`text-${item.key}`}>
                      {readinessData[item.key] || "-"}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div data-testid="readiness-visibility">
            <label className="text-sm font-medium mb-1 block">{t("visibilityScope")}</label>
            {canEditReadiness ? (
              <Select
                value={readinessData.visibilityScope}
                onValueChange={(val) => updateReadinessField("visibilityScope", val)}
              >
                <SelectTrigger data-testid="select-visibility-scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">{t("visibilityGlobal")}</SelectItem>
                  <SelectItem value="companySpecific">{t("visibilityCompanySpecific")}</SelectItem>
                  <SelectItem value="hidden">{t("visibilityHidden")}</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground" data-testid="text-visibility-scope">
                {readinessData.visibilityScope === "global" ? t("visibilityGlobal") :
                 readinessData.visibilityScope === "companySpecific" ? t("visibilityCompanySpecific") :
                 t("visibilityHidden")}
              </p>
            )}
          </div>

          {canEditReadiness && readinessForm && (
            <Button
              onClick={() => saveReadinessMutation.mutate(readinessData)}
              disabled={saveReadinessMutation.isPending}
              data-testid="button-save-readiness"
            >
              {saveReadinessMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("saving")}
                </>
              ) : (
                t("save")
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {evaluationSummary && evaluationSummary.count > 0 && (
        <Card data-testid="card-evaluation-summary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              {t("evaluationSummary")} ({evaluationSummary.count} {t("reviews")})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {evaluationSummary.avgTeamScore !== null && (
                <div className="text-center" data-testid="text-eval-team">
                  <p className="text-2xl font-bold">{Number(evaluationSummary.avgTeamScore).toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">{t("team")}</p>
                </div>
              )}
              {evaluationSummary.avgProductScore !== null && (
                <div className="text-center" data-testid="text-eval-product">
                  <p className="text-2xl font-bold">{Number(evaluationSummary.avgProductScore).toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">{t("product")}</p>
                </div>
              )}
              {evaluationSummary.avgMarketScore !== null && (
                <div className="text-center" data-testid="text-eval-market">
                  <p className="text-2xl font-bold">{Number(evaluationSummary.avgMarketScore).toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">{t("market")}</p>
                </div>
              )}
              {evaluationSummary.avgTractionScore !== null && (
                <div className="text-center" data-testid="text-eval-traction">
                  <p className="text-2xl font-bold">{Number(evaluationSummary.avgTractionScore).toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">{t("traction")}</p>
                </div>
              )}
              {evaluationSummary.avgStrategicFitScore !== null && (
                <div className="text-center" data-testid="text-eval-strategic-fit">
                  <p className="text-2xl font-bold">{Number(evaluationSummary.avgStrategicFitScore).toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">{t("strategicFit")}</p>
                </div>
              )}
              {evaluationSummary.avgRiskScore !== null && (
                <div className="text-center" data-testid="text-eval-risk">
                  <p className="text-2xl font-bold">{Number(evaluationSummary.avgRiskScore).toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">{t("risk")}</p>
                </div>
              )}
              {evaluationSummary.avgTotalScore !== null && (
                <div className="text-center" data-testid="text-eval-total">
                  <p className="text-2xl font-bold text-primary">{Number(evaluationSummary.avgTotalScore).toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">{t("total")}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {briefApplications.length > 0 && (
        <Card data-testid="card-brief-applications">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t("briefApplications")} ({briefApplications.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {briefApplications.map((app) => (
                <Card key={app.id} className="hover-elevate" data-testid={`card-brief-app-${app.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                      <Badge variant="outline" className={getStatusColor(app.status)} data-testid={`badge-app-status-${app.id}`}>
                        {app.status}
                      </Badge>
                      {app.createdAt && (
                        <span className="text-xs text-muted-foreground" data-testid={`text-app-date-${app.id}`}>
                          {new Date(app.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {app.fitDescription && (
                      <p className="text-sm text-muted-foreground mb-1" data-testid={`text-app-fit-${app.id}`}>
                        {app.fitDescription}
                      </p>
                    )}
                    {app.useCase && (
                      <p className="text-sm text-muted-foreground" data-testid={`text-app-usecase-${app.id}`}>
                        {app.useCase}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card data-testid="card-startup-activity">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t("activityHistory")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
            const activityItems: Array<{
              type: 'evaluation' | 'briefApplication' | 'activityLog';
              date: Date;
              title: string;
              description?: string;
            }> = [];

            evaluations.forEach((eval_) => {
              if (eval_.createdAt) {
                const score = eval_.totalScore ?? (eval_.teamScore ?? 0);
                activityItems.push({
                  type: 'evaluation',
                  date: new Date(eval_.createdAt),
                  title: `${t("evaluationScored")} ${score.toFixed(1)}`,
                });
              }
            });

            briefApplications.forEach((app) => {
              if (app.createdAt) {
                activityItems.push({
                  type: 'briefApplication',
                  date: new Date(app.createdAt),
                  title: `${t("appliedToBrief")}`,
                  description: `Status: ${app.status}`,
                });
              }
            });

            startupActivityLogs.forEach((log: any) => {
              if (log.createdAt) {
                activityItems.push({
                  type: 'activityLog',
                  date: new Date(log.createdAt),
                  title: log.description || log.type || 'Activity',
                });
              }
            });

            const sortedItems = activityItems.sort((a, b) => b.date.getTime() - a.date.getTime());

            if (sortedItems.length === 0) {
              return (
                <p className="text-sm text-muted-foreground" data-testid="text-no-activity">
                  {t("noActivityHistory")}
                </p>
              );
            }

            return (
              <div className="space-y-4">
                {sortedItems.map((item, idx) => (
                  <div key={`${item.type}-${idx}`} className="flex gap-4" data-testid={`activity-item-${idx}`}>
                    <div className="flex flex-col items-center">
                      <div className="h-3 w-3 rounded-full bg-primary shrink-0 mt-1.5" data-testid={`activity-dot-${idx}`} />
                      {idx < sortedItems.length - 1 && (
                        <div className="h-8 w-0.5 bg-border mt-2" data-testid={`activity-line-${idx}`} />
                      )}
                    </div>
                    <div className="pb-4 pt-0.5 min-w-0 flex-1">
                      <p className="text-sm font-medium" data-testid={`activity-title-${idx}`}>
                        {item.title}
                      </p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-0.5" data-testid={`activity-desc-${idx}`}>
                          {item.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1" data-testid={`activity-date-${idx}`}>
                        {item.date.toLocaleDateString(language === "ru" ? "ru-RU" : "en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </CardContent>
      </Card>

      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{t("addTeamMember")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t("userId")}</label>
              <Input
                value={newMemberUserId}
                onChange={(e) => setNewMemberUserId(e.target.value)}
                placeholder={t("enterUserId")}
                data-testid="input-member-userid"
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("memberRole")}</label>
              <Select value={newMemberRole} onValueChange={setNewMemberRole}>
                <SelectTrigger data-testid="select-member-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STARTUP_MEMBER_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>{getRoleLabel(role)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleAddMember}
              disabled={addMemberMutation.isPending}
              data-testid="button-submit-add-member"
            >
              {addMemberMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("adding")}
                </>
              ) : (
                t("addMember")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addMetricOpen} onOpenChange={(o) => { setAddMetricOpen(o); if (!o) { setEditingMetricId(null); setMetricMonth(""); setMetricUsers(""); setMetricRevenue(""); setMetricPilots(""); setMetricMrr(""); } }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{editingMetricId ? (language === "ru" ? "Изменить метрики" : "Edit metrics") : t("addMetricSnapshot")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t("month")}</label>
              <Input
                value={metricMonth}
                onChange={(e) => setMetricMonth(e.target.value)}
                placeholder="2026-01"
                data-testid="input-metric-month"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">{t("metricUsers")}</label>
                <Input
                  type="number"
                  value={metricUsers}
                  onChange={(e) => setMetricUsers(e.target.value)}
                  placeholder="0"
                  data-testid="input-metric-users"
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t("metricRevenue")} ($)</label>
                <Input
                  type="number"
                  value={metricRevenue}
                  onChange={(e) => setMetricRevenue(e.target.value)}
                  placeholder="0"
                  data-testid="input-metric-revenue"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">{t("metricPilots")}</label>
                <Input
                  type="number"
                  value={metricPilots}
                  onChange={(e) => setMetricPilots(e.target.value)}
                  placeholder="0"
                  data-testid="input-metric-pilots"
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t("metricMrr")} ($)</label>
                <Input
                  type="number"
                  value={metricMrr}
                  onChange={(e) => setMetricMrr(e.target.value)}
                  placeholder="0"
                  data-testid="input-metric-mrr"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleAddMetric}
              disabled={addMetricMutation.isPending || updateMetricMutation.isPending}
              data-testid="button-submit-add-metric"
            >
              {(addMetricMutation.isPending || updateMetricMutation.isPending) ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("saving")}
                </>
              ) : (
                editingMetricId ? t("save") : t("addMetric")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AIInvestmentMemoDialog startupId={startupId!} open={aiMemoOpen} onOpenChange={setAiMemoOpen} />

      {startupId && (
        <div className="mt-6 space-y-6">
          <div className="flex items-center justify-between gap-2 flex-wrap rounded-md border p-4">
            <div className="min-w-0">
              <div className="font-semibold flex items-center gap-2">
                <Plug className="h-4 w-4" />
                {language === "ru" ? "Интеграции и сигналы" : "Integrations & signals"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {language === "ru"
                  ? "Все источники в одном месте: банки, эквайринг, подписки, аналитика, GitHub, Slack, почта."
                  : "All your sources in one place: banks, payments, subscriptions, analytics, GitHub, Slack, mail."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/startups/${startupId}/integrations`}>
                <Button size="sm" variant="default" data-testid="button-open-integrations">
                  <Plug className="h-4 w-4 mr-2" />
                  {language === "ru" ? "Открыть интеграции" : "Open integrations"}
                </Button>
              </Link>
              <Button asChild variant="outline" size="sm" data-testid="link-startup-telegram">
                <Link href={`/startups/${startupId}/telegram`}>
                  {language === "ru" ? "Telegram-бот" : "Telegram bot"}
                </Link>
              </Button>
            </div>
          </div>
          <FinancialStoryCard startupId={startupId} />
          <UnifiedTimeline startupId={startupId} />
        </div>
      )}

      {startup && (
        <StartupEditDialog startup={startup} open={editOpen} onOpenChange={setEditOpen} />
      )}
      {startupId && (
        <StartupOnboardingTour
          startupId={startupId}
          forceOpen={showTour}
          onClose={() => setShowTour(false)}
        />
      )}
    </div>
  );
}
