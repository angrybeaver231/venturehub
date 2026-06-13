import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Building2, FileText, GitBranch, StickyNote, BarChart3, Plus, Trash2, Loader2, Check, X, Activity, ClipboardCheck, CreditCard, UserCheck, AlertTriangle, Users, GraduationCap, ImagePlus, Globe, Clock, Star, Sparkles, TrendingUp, Upload } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ACTIVITY_ACTIONS } from "@shared/schema";

type Company = {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  website?: string;
  vertical?: string;
  role?: string;
};

type CompanyReport = {
  briefCount: number;
  applicationCount: number;
  programCount: number;
  avgEvaluationScore: number;
};

type Brief = {
  id: string;
  companyId: string;
  title: string;
  description?: string;
  requirements?: string;
  verticals?: string;
  budget?: string;
  deadline?: string;
  status: string;
  createdAt?: string;
};

type BriefApplication = {
  id: string;
  briefId: string;
  startupId: string;
  status: string;
  startupName?: string;
  startupVertical?: string;
  startupStage?: string;
  createdAt?: string;
  startup?: {
    id: string;
    name: string;
    logo: string | null;
    vertical: string | null;
    stage: string | null;
    universityAffiliation?: string | null;
  };
};

type PipelineEntry = {
  id: string;
  startupId: string;
  companyId: string;
  status: string;
  startupName?: string;
  startupVertical?: string;
  startupStage?: string;
  createdAt?: string;
  startup?: {
    id: string;
    name: string;
    logo: string | null;
    vertical: string | null;
    stage: string | null;
    universityAffiliation?: string | null;
  };
};

type CompanyNote = {
  id: string;
  companyId: string;
  startupId?: string;
  content: string;
  category: string;
  startupName?: string;
  authorName?: string;
  createdAt?: string;
};

const BRIEF_STATUSES = ["draft", "active", "closed"] as const;
const APPLICATION_STATUSES = ["pending", "shortlisted", "rejected", "interviewing", "selected"] as const;
const PIPELINE_STATUSES = ["discovered", "inEvaluation", "inPilot", "inScaleUp", "archived"] as const;
const NOTE_CATEGORIES = ["general", "evaluation", "meeting", "followUp"] as const;

const getStatusColor = (status: string) => {
  switch (status) {
    case "draft": return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    case "active": return "bg-green-500/10 text-green-500 border-green-500/20";
    case "closed": return "bg-red-500/10 text-red-500 border-red-500/20";
    case "pending": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    case "shortlisted": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    case "rejected": return "bg-red-500/10 text-red-500 border-red-500/20";
    case "interviewing": return "bg-purple-500/10 text-purple-500 border-purple-500/20";
    case "selected": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    case "discovered": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    case "inEvaluation": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    case "inPilot": return "bg-purple-500/10 text-purple-500 border-purple-500/20";
    case "inScaleUp": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    case "archived": return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    default: return "";
  }
};

function ReviewProgressBadge({ entityType, entityId }: { entityType: string; entityId: string }) {
  const { data } = useQuery<{ total: number; completed: number }>({
    queryKey: ['/api/review-progress', entityType, entityId],
    queryFn: () => fetch(`/api/review-progress/${entityType}/${entityId}`).then(r => r.json()),
    enabled: !!entityId,
  });
  if (!data || data.total === 0) return null;
  return (
    <Badge variant="secondary" data-testid={`badge-review-progress-${entityId}`}>
      {data.completed}/{data.total}
    </Badge>
  );
}

export default function Corporate() {
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const { t, language } = useLanguage();

  const getPipelineLabel = (status: string) => {
    switch (status) {
      case "discovered": return t("pipelineStatusDiscovered");
      case "inEvaluation": return t("pipelineStatusInEvaluation");
      case "inPilot": return t("pipelineStatusInPilot");
      case "inScaleUp": return t("pipelineStatusInScaleUp");
      case "archived": return t("pipelineStatusArchived");
      default: return status;
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case "general": return t("noteTypeGeneral");
      case "evaluation": return t("noteTypeEvaluation");
      case "meeting": return t("noteTypeMeeting");
      case "followUp": return t("noteTypeFollowUp");
      default: return cat;
    }
  };

  const getBriefStatusLabel = (status: string) => {
    switch (status) {
      case "draft": return t("briefStatusDraft");
      case "active": return t("briefStatusOpen");
      case "closed": return t("briefStatusClosed");
      default: return status;
    }
  };
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("dashboard");

  const [briefDialogOpen, setBriefDialogOpen] = useState(false);
  const [editingBrief, setEditingBrief] = useState<Brief | null>(null);
  const [briefTitle, setBriefTitle] = useState("");
  const [briefDescription, setBriefDescription] = useState("");
  const [aiBriefOneLiner, setAiBriefOneLiner] = useState("");
  const [aiBriefLoading, setAiBriefLoading] = useState(false);
  const [briefRequirements, setBriefRequirements] = useState("");
  const [briefVerticals, setBriefVerticals] = useState("");
  const [briefBudget, setBriefBudget] = useState("");
  const [briefDeadline, setBriefDeadline] = useState("");
  const [briefStatus, setBriefStatus] = useState("draft");

  const [expandedBriefId, setExpandedBriefId] = useState<string | null>(null);

  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteStartupId, setNoteStartupId] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteCategory, setNoteCategory] = useState("general");
  const [notesStartupFilter, setNotesStartupFilter] = useState("");

  const [pipelineFilter, setPipelineFilter] = useState("all");
  const [pipelineUniversityFilter, setPipelineUniversityFilter] = useState("all");

  const [assignReviewerDialogOpen, setAssignReviewerDialogOpen] = useState(false);
  const [assignReviewerAppId, setAssignReviewerAppId] = useState("");
  const [assignReviewerUserId, setAssignReviewerUserId] = useState("");
  const [assignReviewerDueDate, setAssignReviewerDueDate] = useState("");

  const [activityActionFilter, setActivityActionFilter] = useState("all");
  const [activityFromDate, setActivityFromDate] = useState("");

  const [createCompanyOpen, setCreateCompanyOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyDescription, setNewCompanyDescription] = useState("");
  const [newCompanyWebsite, setNewCompanyWebsite] = useState("");
  const [newCompanyVertical, setNewCompanyVertical] = useState("");

  const companyLogoInputRef = useRef<HTMLInputElement>(null);
  const editLogoInputRef = useRef<HTMLInputElement>(null);
  const [companyLogoPreview, setCompanyLogoPreview] = useState<string | null>(null);

  const uploadCompanyLogoMutation = useMutation({
    mutationFn: async ({ companyId, file }: { companyId: string; file: File }) => {
      const formData = new FormData();
      formData.append('logo', file);
      const res = await fetch(`/api/companies/${companyId}/logo`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Upload failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-companies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies/public"] });
      toast({ title: t("success"), description: "Logo uploaded" });
    },
    onError: () => {
      toast({ title: t("error"), description: "Failed to upload logo", variant: "destructive" });
    },
  });

  const setMainOrgMutation = useMutation({
    mutationFn: async (data: { mainOrgType: string | null; mainOrgId: string | null }) => {
      const res = await apiRequest('/api/user/main-organization', { method: "PATCH", body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } });
      return res.json();
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/auth/user'] });
      toast({ title: language === 'ru' ? 'Основная организация обновлена' : 'Main organization updated' });
    },
    onError: (err: any) => {
      toast({ title: t("error"), description: err.message, variant: "destructive" });
    },
  });

  const isMainOrg = user?.mainOrgType === 'company' && user?.mainOrgId === selectedCompanyId;

  const { data: myCompanies = [], isLoading: isLoadingCompanies } = useQuery<Company[]>({
    queryKey: ["/api/my-companies"],
    enabled: isAuthenticated,
  });

  const { data: allCompanies = [], isLoading: isLoadingAllCompanies } = useQuery<Company[]>({
    queryKey: ["/api/companies/public"],
  });

  const selectedCompany = myCompanies.find(c => c.id === selectedCompanyId);

  if (myCompanies.length > 0 && !selectedCompanyId && myCompanies[0]) {
    setSelectedCompanyId(myCompanies[0].id);
  }

  const { data: report, isLoading: isLoadingReport } = useQuery<CompanyReport>({
    queryKey: ["/api/companies", selectedCompanyId, "report"],
    enabled: !!selectedCompanyId && activeTab === "dashboard",
  });

  const { data: briefs = [], isLoading: isLoadingBriefs } = useQuery<Brief[]>({
    queryKey: ["/api/briefs", { companyId: selectedCompanyId }],
    queryFn: async () => {
      const res = await fetch(`/api/briefs?companyId=${selectedCompanyId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch briefs");
      return res.json();
    },
    enabled: !!selectedCompanyId && activeTab === "briefs",
  });

  const { data: applications = [] } = useQuery<BriefApplication[]>({
    queryKey: ["/api/briefs", expandedBriefId, "applications"],
    enabled: !!expandedBriefId,
  });

  const { data: pipeline = [], isLoading: isLoadingPipeline } = useQuery<PipelineEntry[]>({
    queryKey: ["/api/companies", selectedCompanyId, "pipeline", { status: pipelineFilter }],
    queryFn: async () => {
      const url = pipelineFilter !== "all"
        ? `/api/companies/${selectedCompanyId}/pipeline?status=${pipelineFilter}`
        : `/api/companies/${selectedCompanyId}/pipeline`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch pipeline");
      return res.json();
    },
    enabled: !!selectedCompanyId && activeTab === "pipeline",
  });

  const { data: dashboardPipeline = [] } = useQuery<PipelineEntry[]>({
    queryKey: ["/api/companies", selectedCompanyId, "pipeline", { status: "all" }],
    queryFn: async () => {
      const res = await fetch(`/api/companies/${selectedCompanyId}/pipeline`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch pipeline");
      return res.json();
    },
    enabled: !!selectedCompanyId && activeTab === "dashboard",
  });

  const { data: universities = [] } = useQuery<any[]>({
    queryKey: ["/api/universities"],
    queryFn: async () => {
      const res = await fetch("/api/universities", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch universities");
      return res.json();
    },
    enabled: activeTab === "pipeline" || activeTab === "dashboard",
  });

  const { data: notes = [], isLoading: isLoadingNotes } = useQuery<CompanyNote[]>({
    queryKey: ["/api/companies", selectedCompanyId, "notes", { startupId: notesStartupFilter }],
    queryFn: async () => {
      const url = notesStartupFilter
        ? `/api/companies/${selectedCompanyId}/notes?startupId=${notesStartupFilter}`
        : `/api/companies/${selectedCompanyId}/notes`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch notes");
      return res.json();
    },
    enabled: !!selectedCompanyId && activeTab === "notes",
  });

  const { data: activityLogs = [] } = useQuery<any[]>({
    queryKey: ['/api/activity-logs', { companyId: selectedCompanyId }],
    queryFn: () => fetch(`/api/activity-logs?companyId=${selectedCompanyId}`).then(r => r.json()),
    enabled: !!selectedCompanyId && activeTab === "activity",
  });

  const { data: companyPlanData } = useQuery<any>({
    queryKey: ['/api/companies', selectedCompanyId, 'plan'],
    queryFn: () => fetch(`/api/companies/${selectedCompanyId}/plan`).then(r => r.json()),
    enabled: !!selectedCompanyId && activeTab === "plan",
  });

  const { data: reviewerAssignments = [] } = useQuery<any[]>({
    queryKey: ['/api/reviewer-assignments', { companyId: selectedCompanyId }],
    queryFn: () => fetch(`/api/reviewer-assignments?companyId=${selectedCompanyId}`).then(r => r.json()),
    enabled: !!selectedCompanyId && activeTab === "reviewers",
  });

  const createCompanyMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("/api/companies", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-companies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      setCreateCompanyOpen(false);
      setNewCompanyName("");
      setNewCompanyDescription("");
      setNewCompanyWebsite("");
      setNewCompanyVertical("");
      if (result?.status === 'pending_review') {
        toast({ title: t("success"), description: language === 'ru' ? 'Заявка на создание корпорации отправлена на рассмотрение' : 'Corporation creation request submitted for review' });
      } else {
        toast({ title: t("success"), description: t("companyCreated") });
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create company", variant: "destructive" });
    },
  });

  const handleCreateCompany = () => {
    if (!newCompanyName.trim()) {
      toast({ title: t("error"), description: t("companyNameRequired"), variant: "destructive" });
      return;
    }
    const logoFile = companyLogoInputRef.current?.files?.[0];
    createCompanyMutation.mutate({
      name: newCompanyName,
      description: newCompanyDescription || undefined,
      website: newCompanyWebsite || undefined,
      vertical: newCompanyVertical || undefined,
    }, {
      onSuccess: (result: any) => {
        if (logoFile && result?.id) {
          uploadCompanyLogoMutation.mutate({ companyId: result.id, file: logoFile });
        }
        setCompanyLogoPreview(null);
      }
    });
  };

  const createBriefMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("/api/briefs", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/briefs"] });
      closeBriefDialog();
      toast({ title: t("success"), description: t("briefCreated") });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create brief", variant: "destructive" });
    },
  });

  const updateBriefMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      return await apiRequest(`/api/briefs/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/briefs"] });
      closeBriefDialog();
      toast({ title: t("success"), description: t("briefUpdated") });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update brief", variant: "destructive" });
    },
  });

  const deleteBriefMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/briefs/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/briefs"] });
      toast({ title: t("success"), description: t("briefDeleted") });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete brief", variant: "destructive" });
    },
  });

  const updateApplicationStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await apiRequest(`/api/brief-applications/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/briefs"] });
      toast({ title: t("success"), description: t("applicationStatusUpdated") });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update application", variant: "destructive" });
    },
  });

  const updatePipelineStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await apiRequest(`/api/pipeline/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", selectedCompanyId, "pipeline"] });
      toast({ title: t("success"), description: t("pipelineStatusUpdated") });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update pipeline", variant: "destructive" });
    },
  });

  const createNoteMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("/api/company-notes", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", selectedCompanyId, "notes"] });
      closeNoteDialog();
      toast({ title: t("success"), description: t("noteAdded") });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create note", variant: "destructive" });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/company-notes/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", selectedCompanyId, "notes"] });
      toast({ title: t("success"), description: t("noteDeleted") });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete note", variant: "destructive" });
    },
  });

  const createReviewerAssignmentMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("/api/reviewer-assignments", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reviewer-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/review-progress'] });
      setAssignReviewerDialogOpen(false);
      setAssignReviewerAppId("");
      setAssignReviewerUserId("");
      setAssignReviewerDueDate("");
      toast({ title: t("success"), description: t("reviewerAssigned") });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to assign reviewer", variant: "destructive" });
    },
  });

  const openBriefDialog = (brief?: Brief) => {
    if (brief) {
      setEditingBrief(brief);
      setBriefTitle(brief.title);
      setBriefDescription(brief.description || "");
      setBriefRequirements(brief.requirements || "");
      setBriefVerticals(brief.verticals || "");
      setBriefBudget(brief.budget || "");
      setBriefDeadline(brief.deadline || "");
      setBriefStatus(brief.status);
    } else {
      setEditingBrief(null);
      setBriefTitle("");
      setBriefDescription("");
      setBriefRequirements("");
      setBriefVerticals("");
      setBriefBudget("");
      setBriefDeadline("");
      setBriefStatus("draft");
    }
    setBriefDialogOpen(true);
  };

  const closeBriefDialog = () => {
    setBriefDialogOpen(false);
    setEditingBrief(null);
    setBriefTitle("");
    setBriefDescription("");
    setBriefRequirements("");
    setBriefVerticals("");
    setBriefBudget("");
    setBriefDeadline("");
    setBriefStatus("draft");
  };

  const handleBriefSubmit = () => {
    const data = {
      companyId: selectedCompanyId,
      title: briefTitle,
      description: briefDescription,
      requirements: briefRequirements,
      verticals: briefVerticals,
      budget: briefBudget,
      deadline: briefDeadline,
      status: briefStatus,
    };
    if (editingBrief) {
      updateBriefMutation.mutate({ id: editingBrief.id, data });
    } else {
      createBriefMutation.mutate(data);
    }
  };

  const closeNoteDialog = () => {
    setNoteDialogOpen(false);
    setNoteStartupId("");
    setNoteContent("");
    setNoteCategory("general");
  };

  const handleNoteSubmit = () => {
    createNoteMutation.mutate({
      companyId: selectedCompanyId,
      startupId: noteStartupId || undefined,
      content: noteContent,
      category: noteCategory,
    });
  };

  if (isLoadingCompanies) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2" data-testid="text-login-required">{t("pleaseLogIn")}</h3>
            <p className="text-muted-foreground text-center">{t("loginRequiredCorporate")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendingMyCompanies = myCompanies.filter((c: any) => c.status === 'pending_review');
  const activeMyCompanies = myCompanies.filter((c: any) => c.status === 'active' || !c.status);

  if (activeMyCompanies.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Building2 className="h-8 w-8" />
              {t("corporateWorkspace")}
            </h1>
            <p className="text-muted-foreground mt-1">{t("managePipeline")}</p>
          </div>
          <Button onClick={() => setCreateCompanyOpen(true)} data-testid="button-register-corporation">
            <Plus className="h-4 w-4 mr-2" />
            {t("createCompany")}
          </Button>
        </div>
        {pendingMyCompanies.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                {language === 'ru' ? 'Ваши заявки на рассмотрении' : 'Your pending applications'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingMyCompanies.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-md border border-border">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 rounded-md shrink-0">
                        {c.logo ? <AvatarImage src={c.logo} alt={c.name} /> : null}
                        <AvatarFallback className="rounded-md"><Building2 className="h-4 w-4 text-muted-foreground" /></AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{c.name}</p>
                        {c.description && <p className="text-xs text-muted-foreground line-clamp-1">{c.description}</p>}
                      </div>
                    </div>
                    <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400 text-xs">
                      {language === 'ru' ? 'На рассмотрении' : 'Pending'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2" data-testid="text-no-companies">{t("noCompanies")}</h3>
            <p className="text-muted-foreground text-center mb-4">{t("noCompaniesDescription")}</p>
            <Button onClick={() => setCreateCompanyOpen(true)} data-testid="button-create-company-empty">
              <Plus className="h-4 w-4 mr-2" />
              {t("createCompany")}
            </Button>
          </CardContent>
        </Card>
        <Dialog open={createCompanyOpen} onOpenChange={(open) => { setCreateCompanyOpen(open); if (!open) setCompanyLogoPreview(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("createCompany")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("nameRequired")}</label>
                <Input value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} placeholder={t("companyNamePlaceholder")} data-testid="input-company-name" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("companyDescription")}</label>
                <Textarea value={newCompanyDescription} onChange={(e) => setNewCompanyDescription(e.target.value)} placeholder={t("companyDescriptionPlaceholder")} data-testid="input-company-description" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("companyWebsite")}</label>
                <Input value={newCompanyWebsite} onChange={(e) => setNewCompanyWebsite(e.target.value)} placeholder="https://example.com" data-testid="input-company-website" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("companyIndustry")}</label>
                <Input value={newCompanyVertical} onChange={(e) => setNewCompanyVertical(e.target.value)} placeholder={t("companyIndustryPlaceholder")} data-testid="input-company-vertical" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Logo</label>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 rounded-md">
                    {companyLogoPreview ? (
                      <AvatarImage src={companyLogoPreview} alt="Company logo" />
                    ) : null}
                    <AvatarFallback className="rounded-md">
                      <Building2 className="h-6 w-6 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <input
                      ref={companyLogoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setCompanyLogoPreview(URL.createObjectURL(file));
                        }
                      }}
                      data-testid="input-company-logo"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => companyLogoInputRef.current?.click()}
                      data-testid="button-upload-company-logo"
                    >
                      <ImagePlus className="h-4 w-4 mr-2" />
                      Upload Logo
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateCompanyOpen(false)} data-testid="button-cancel-company">{t("cancel")}</Button>
              <Button onClick={handleCreateCompany} disabled={createCompanyMutation.isPending} data-testid="button-submit-company">
                {createCompanyMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                {t("create")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {allCompanies.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {t("allCorporations") || "All Corporations"}
              </CardTitle>
              <CardDescription>{t("browseCorporations") || "Browse all registered corporations"}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allCompanies.map((company) => (
                  <Card key={company.id} className="hover-elevate" data-testid={`card-corporation-${company.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 rounded-md shrink-0">
                          {company.logo ? (
                            <AvatarImage src={company.logo} alt={company.name} />
                          ) : null}
                          <AvatarFallback className="rounded-md">
                            <Building2 className="h-5 w-5 text-muted-foreground" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-sm line-clamp-1" data-testid={`text-corporation-name-${company.id}`}>{company.name}</h4>
                          {company.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{company.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        {(company as any).status === 'pending_review' && (
                          <Badge variant="outline" className="text-xs border-amber-500 text-amber-600 dark:text-amber-400">
                            {language === 'ru' ? 'На рассмотрении' : 'Pending review'}
                          </Badge>
                        )}
                        {(company as any).status === 'rejected' && (
                          <Badge variant="destructive" className="text-xs">
                            {language === 'ru' ? 'Отклонено' : 'Rejected'}
                          </Badge>
                        )}
                        {company.vertical && (
                          <Badge variant="secondary" className="text-xs">{company.vertical}</Badge>
                        )}
                        {company.website && (
                          <Badge variant="secondary" className="text-xs cursor-pointer" onClick={() => window.open(company.website!, "_blank")}>
                            <Globe className="h-3 w-3 mr-1" />
                            Website
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            {t("corporateWorkspace")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("managePipeline")}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
            <SelectTrigger className="w-[220px]" data-testid="select-company">
              <SelectValue placeholder={t("selectCompany")} />
            </SelectTrigger>
            <SelectContent>
              {myCompanies.filter((c: any) => c.status === 'active').map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedCompanyId && (
            <Button
              variant={isMainOrg ? "default" : "outline"}
              size="sm"
              onClick={() => {
                if (isMainOrg) {
                  setMainOrgMutation.mutate({ mainOrgType: null, mainOrgId: null });
                } else {
                  setMainOrgMutation.mutate({ mainOrgType: 'company', mainOrgId: selectedCompanyId });
                }
              }}
              disabled={setMainOrgMutation.isPending}
              data-testid="button-set-main-org"
            >
              <Star className={`h-4 w-4 mr-1 ${isMainOrg ? 'fill-current' : ''}`} />
              {isMainOrg
                ? (language === 'ru' ? 'Основная' : 'Main')
                : (language === 'ru' ? 'Сделать основной' : 'Set as Main')}
            </Button>
          )}
          <Button variant="outline" onClick={() => setCreateCompanyOpen(true)} data-testid="button-register-corporation-workspace">
            <Plus className="h-4 w-4 mr-2" />
            {t("createCompany")}
          </Button>
        </div>
      </div>

      <Dialog open={createCompanyOpen} onOpenChange={(open) => { setCreateCompanyOpen(open); if (!open) setCompanyLogoPreview(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("createCompany")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("nameRequired")}</label>
              <Input value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} placeholder={t("companyNamePlaceholder")} data-testid="input-company-name-workspace" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("companyDescription")}</label>
              <Textarea value={newCompanyDescription} onChange={(e) => setNewCompanyDescription(e.target.value)} placeholder={t("companyDescriptionPlaceholder")} data-testid="input-company-description-workspace" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("companyWebsite")}</label>
              <Input value={newCompanyWebsite} onChange={(e) => setNewCompanyWebsite(e.target.value)} placeholder="https://example.com" data-testid="input-company-website-workspace" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("companyIndustry")}</label>
              <Input value={newCompanyVertical} onChange={(e) => setNewCompanyVertical(e.target.value)} placeholder={t("companyIndustryPlaceholder")} data-testid="input-company-vertical-workspace" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateCompanyOpen(false)}>{t("cancel")}</Button>
            <Button onClick={handleCreateCompany} disabled={createCompanyMutation.isPending} data-testid="button-submit-company-workspace">
              {createCompanyMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              {t("createCompany")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-corporate">
          <TabsTrigger value="dashboard" data-testid="tab-dashboard">
            <BarChart3 className="h-4 w-4 mr-1" />
            {t("corporateDashboard")}
          </TabsTrigger>
          <TabsTrigger value="briefs" data-testid="tab-briefs">
            <FileText className="h-4 w-4 mr-1" />
            {t("scoutingBriefs")}
          </TabsTrigger>
          <TabsTrigger value="pipeline" data-testid="tab-pipeline">
            <GitBranch className="h-4 w-4 mr-1" />
            {t("pipelineCrm")}
          </TabsTrigger>
          <TabsTrigger value="notes" data-testid="tab-notes">
            <StickyNote className="h-4 w-4 mr-1" />
            {t("companyNotes")}
          </TabsTrigger>
          <TabsTrigger value="reviewers" data-testid="tab-reviewers">
            <UserCheck className="w-4 h-4 mr-2" />
            {t('reviewerAssignments')}
          </TabsTrigger>
          <TabsTrigger value="activity" data-testid="tab-activity">
            <Activity className="w-4 h-4 mr-2" />
            {t('activityLog')}
          </TabsTrigger>
          <TabsTrigger value="plan" data-testid="tab-plan">
            <CreditCard className="w-4 h-4 mr-2" />
            {t('companyPlan')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          {isLoadingReport ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="hover-elevate" data-testid="card-stat-briefs">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t("activeBriefs")}</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-brief-count">
                      {report?.briefCount ?? 0}
                    </div>
                    <p className="text-xs text-muted-foreground">{t("scoutingBriefsPosted")}</p>
                  </CardContent>
                </Card>
                <Card className="hover-elevate" data-testid="card-stat-applications">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t("applications")}</CardTitle>
                    <Check className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-application-count">
                      {report?.applicationCount ?? 0}
                    </div>
                    <p className="text-xs text-muted-foreground">{t("startupApplicationsReceived")}</p>
                  </CardContent>
                </Card>
                <Card className="hover-elevate" data-testid="card-stat-programs">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t("programs")}</CardTitle>
                    <GitBranch className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-program-count">
                      {report?.programCount ?? 0}
                    </div>
                    <p className="text-xs text-muted-foreground">{t("activePrograms")}</p>
                  </CardContent>
                </Card>
                <Card className="hover-elevate" data-testid="card-stat-score">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t("avgScore")}</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-avg-score">
                      {report?.avgEvaluationScore != null ? report.avgEvaluationScore.toFixed(1) : "—"}
                    </div>
                    <p className="text-xs text-muted-foreground">{t("averageEvaluationScore")}</p>
                  </CardContent>
                </Card>
              </div>
              {selectedCompany && (
                <Card className="hover-elevate" data-testid="card-company-info">
                  <CardHeader>
                    <div className="flex items-start gap-4 flex-wrap">
                      <div className="relative group">
                        <Avatar className="h-16 w-16 rounded-md">
                          {selectedCompany.logo ? (
                            <AvatarImage src={selectedCompany.logo} alt={selectedCompany.name} />
                          ) : null}
                          <AvatarFallback className="rounded-md">
                            <Building2 className="h-6 w-6 text-muted-foreground" />
                          </AvatarFallback>
                        </Avatar>
                        {(user?.isHeadAdmin || selectedCompany.role === 'companyAdmin' || selectedCompany.role === 'headAdmin') && (
                          <>
                            <input
                              type="file"
                              accept="image/*"
                              ref={editLogoInputRef}
                              className="hidden"
                              data-testid="input-edit-company-logo"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file && selectedCompany.id) {
                                  uploadCompanyLogoMutation.mutate({ companyId: selectedCompany.id, file });
                                  e.target.value = '';
                                }
                              }}
                            />
                            <Button
                              size="icon"
                              variant="outline"
                              className="absolute -bottom-2 -right-2 h-7 w-7 rounded-full"
                              onClick={() => editLogoInputRef.current?.click()}
                              disabled={uploadCompanyLogoMutation.isPending}
                              data-testid="button-edit-company-logo"
                              title={t("uploadLogo") || "Upload logo"}
                            >
                              {uploadCompanyLogoMutation.isPending ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Upload className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle>{t("companyOverview")}</CardTitle>
                        <CardDescription>{selectedCompany.name}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap items-center gap-3">
                      {selectedCompany.vertical && (
                        <Badge variant="secondary" data-testid="badge-company-vertical">{selectedCompany.vertical}</Badge>
                      )}
                      {selectedCompany.website && (
                        <span className="text-sm text-muted-foreground" data-testid="text-company-website">{selectedCompany.website}</span>
                      )}
                      {selectedCompany.role && (
                        <Badge variant="outline" data-testid="badge-company-role">{selectedCompany.role}</Badge>
                      )}
                    </div>
                    {selectedCompany.description && (
                      <p className="text-sm text-muted-foreground mt-3" data-testid="text-company-description">{selectedCompany.description}</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {dashboardPipeline.length > 0 && (
                <Card data-testid="card-university-breakdown">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5" />
                      {t("universityBreakdown") || "University Breakdown"}
                    </CardTitle>
                    <CardDescription>{t("universityBreakdownDesc") || "Pipeline startups by university affiliation"}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {(() => {
                        const uniCounts: Record<string, number> = {};
                        let noUni = 0;
                        dashboardPipeline.forEach((entry) => {
                          const uniName = entry.startup?.universityAffiliation || entry.startupName;
                          const affiliation = entry.startup?.universityAffiliation;
                          if (affiliation) {
                            uniCounts[affiliation] = (uniCounts[affiliation] || 0) + 1;
                          } else {
                            noUni++;
                          }
                        });
                        const sorted = Object.entries(uniCounts).sort((a, b) => b[1] - a[1]);
                        const total = dashboardPipeline.length;
                        return (
                          <>
                            {sorted.map(([name, count]) => (
                              <div key={name} className="flex items-center justify-between gap-2" data-testid={`row-uni-breakdown-${name}`}>
                                <div className="flex items-center gap-2 min-w-0">
                                  <GraduationCap className="h-4 w-4 text-muted-foreground shrink-0" />
                                  <span className="text-sm truncate">{name}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <Badge variant="secondary">{count}</Badge>
                                  <span className="text-xs text-muted-foreground w-10 text-right">
                                    {Math.round((count / total) * 100)}%
                                  </span>
                                </div>
                              </div>
                            ))}
                            {noUni > 0 && (
                              <div className="flex items-center justify-between gap-2" data-testid="row-uni-breakdown-unaffiliated">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                                  <span className="text-sm text-muted-foreground">{t("unaffiliated") || "Unaffiliated"}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <Badge variant="secondary">{noUni}</Badge>
                                  <span className="text-xs text-muted-foreground w-10 text-right">
                                    {Math.round((noUni / total) * 100)}%
                                  </span>
                                </div>
                              </div>
                            )}
                            {sorted.length === 0 && noUni === total && (
                              <p className="text-sm text-muted-foreground">{t("noUniversityData") || "No university affiliation data available"}</p>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="briefs" className="mt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">{t("scoutingBriefs")}</h2>
              <Button onClick={() => openBriefDialog()} data-testid="button-create-brief">
                <Plus className="h-4 w-4 mr-2" />
                {t("newBrief")}
              </Button>
            </div>

            {isLoadingBriefs ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : briefs.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2" data-testid="text-no-briefs">{t("noBriefs")}</h3>
                  <p className="text-muted-foreground text-center">{t("createFirstBrief")}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {briefs.map((brief) => (
                  <Card key={brief.id} className="hover-elevate" data-testid={`card-brief-${brief.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <CardTitle className="text-lg" data-testid={`text-brief-title-${brief.id}`}>{brief.title}</CardTitle>
                          {brief.description && (
                            <CardDescription className="mt-1 line-clamp-2">{brief.description}</CardDescription>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className={getStatusColor(brief.status)} data-testid={`badge-brief-status-${brief.id}`}>
                            {brief.status}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        {brief.verticals && (
                          <Badge variant="secondary" data-testid={`badge-brief-verticals-${brief.id}`}>{brief.verticals}</Badge>
                        )}
                        {brief.budget && (
                          <Badge variant="secondary" data-testid={`badge-brief-budget-${brief.id}`}>{brief.budget}</Badge>
                        )}
                        {brief.deadline && (
                          <Badge variant="secondary" data-testid={`badge-brief-deadline-${brief.id}`}>{brief.deadline}</Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setExpandedBriefId(expandedBriefId === brief.id ? null : brief.id)}
                          data-testid={`button-toggle-applications-${brief.id}`}
                        >
                          {expandedBriefId === brief.id ? t("hideApplications") : t("viewApplications")}
                        </Button>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openBriefDialog(brief)}
                            data-testid={`button-edit-brief-${brief.id}`}
                          >
                            {t("edit")}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteBriefMutation.mutate(brief.id)}
                            disabled={deleteBriefMutation.isPending}
                            data-testid={`button-delete-brief-${brief.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {expandedBriefId === brief.id && (
                        <div className="mt-4 space-y-2 border-t pt-4">
                          <h4 className="text-sm font-semibold mb-2">{t("applications")}</h4>
                          {applications.length === 0 ? (
                            <p className="text-sm text-muted-foreground" data-testid="text-no-applications">{t("noBriefApplications")}</p>
                          ) : (
                            applications.map((app) => (
                              <div
                                key={app.id}
                                className="flex items-center justify-between gap-2 rounded-md border p-3"
                                data-testid={`row-application-${app.id}`}
                              >
                                <div className="min-w-0">
                                  <p className="font-medium text-sm" data-testid={`text-app-startup-${app.id}`}>
                                    {app.startupName || app.startupId}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-1 mt-1">
                                    {app.startupVertical && <Badge variant="secondary">{app.startupVertical}</Badge>}
                                    {app.startupStage && <Badge variant="secondary">{app.startupStage}</Badge>}
                                    {(app.startup?.universityAffiliation) && (
                                      <Badge variant="outline">
                                        <GraduationCap className="h-3 w-3 mr-1" />
                                        {app.startup.universityAffiliation}
                                      </Badge>
                                    )}
                                    <ReviewProgressBadge entityType="briefApplication" entityId={app.id} />
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <Badge variant="outline" className={getStatusColor(app.status)} data-testid={`badge-app-status-${app.id}`}>
                                    {app.status}
                                  </Badge>
                                  <Select
                                    value={app.status}
                                    onValueChange={(val) => updateApplicationStatusMutation.mutate({ id: app.id, status: val })}
                                  >
                                    <SelectTrigger className="w-[130px]" data-testid={`select-app-status-${app.id}`}>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {APPLICATION_STATUSES.map((s) => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setAssignReviewerAppId(app.id);
                                      setAssignReviewerDialogOpen(true);
                                    }}
                                    data-testid={`button-assign-reviewer-${app.id}`}
                                  >
                                    <Users className="h-4 w-4 mr-1" />
                                    {t("assignReviewerToApplication")}
                                  </Button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="pipeline" className="mt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">{t("startupPipeline")}</h2>
              <div className="flex items-center gap-2">
                <Select value={pipelineFilter} onValueChange={setPipelineFilter}>
                  <SelectTrigger className="w-[180px]" data-testid="select-pipeline-filter">
                    <SelectValue placeholder={t("filterByStatus")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("allStatuses")}</SelectItem>
                    {PIPELINE_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{getPipelineLabel(s)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={pipelineUniversityFilter} onValueChange={setPipelineUniversityFilter}>
                  <SelectTrigger className="w-[180px]" data-testid="select-pipeline-university-filter">
                    <SelectValue placeholder={t("filterByUniversity")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("allUniversities")}</SelectItem>
                    {universities.map((university: any) => (
                      <SelectItem key={university.id} value={university.id}>{university.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isLoadingPipeline ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : pipeline.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <GitBranch className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2" data-testid="text-no-pipeline">{t("noPipelineEntries")}</h3>
                  <p className="text-muted-foreground text-center">{t("noPipelineDescription")}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {PIPELINE_STATUSES.map((status) => {
                  let entries = pipeline;
                  if (pipelineFilter !== "all") {
                    entries = entries.filter(p => p.status === pipelineFilter);
                  } else {
                    entries = entries.filter(p => p.status === status);
                  }
                  if (pipelineUniversityFilter !== "all") {
                    entries = entries.filter((p: any) => p.startupUniversityId === pipelineUniversityFilter);
                  }
                  if (pipelineFilter !== "all" && pipelineFilter !== status) return null;
                  if (entries.length === 0 && pipelineFilter === "all") return null;
                  return (
                    <div key={status}>
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="outline" className={getStatusColor(status)}>
                          {getPipelineLabel(status)}
                        </Badge>
                        <span className="text-sm text-muted-foreground">({entries.length})</span>
                      </div>
                      <div className="grid gap-3">
                        {entries.map((entry) => (
                          <Card key={entry.id} className="hover-elevate" data-testid={`card-pipeline-${entry.id}`}>
                            <CardContent className="py-4">
                              <div className="flex items-center justify-between gap-4">
                                <div className="min-w-0">
                                  <p className="font-medium" data-testid={`text-pipeline-startup-${entry.id}`}>
                                    {entry.startupName || entry.startupId}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-1 mt-1">
                                    {entry.startupVertical && <Badge variant="secondary">{entry.startupVertical}</Badge>}
                                    {entry.startupStage && <Badge variant="secondary">{entry.startupStage}</Badge>}
                                    {(entry.startup?.universityAffiliation) && (
                                      <Badge variant="outline">
                                        <GraduationCap className="h-3 w-3 mr-1" />
                                        {entry.startup.universityAffiliation}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <Select
                                  value={entry.status}
                                  onValueChange={(val) => updatePipelineStatusMutation.mutate({ id: entry.id, status: val })}
                                >
                                  <SelectTrigger className="w-[160px]" data-testid={`select-pipeline-status-${entry.id}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {PIPELINE_STATUSES.map((s) => (
                                      <SelectItem key={s} value={s}>{getPipelineLabel(s)}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="notes" className="mt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">{t("internalNotes")}</h2>
              <div className="flex items-center gap-2">
                <Input
                  placeholder={t("filterByStartupId")}
                  value={notesStartupFilter}
                  onChange={(e) => setNotesStartupFilter(e.target.value)}
                  className="w-[200px]"
                  data-testid="input-notes-filter"
                />
                <Button onClick={() => setNoteDialogOpen(true)} data-testid="button-create-note">
                  <Plus className="h-4 w-4 mr-2" />
                  {t("addNote")}
                </Button>
              </div>
            </div>

            {isLoadingNotes ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : notes.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <StickyNote className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2" data-testid="text-no-notes">{t("noNotes")}</h3>
                  <p className="text-muted-foreground text-center">{t("noNotesDescription")}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {notes.map((note) => (
                  <Card key={note.id} className="hover-elevate" data-testid={`card-note-${note.id}`}>
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <Badge variant="outline" className={getStatusColor(note.category)} data-testid={`badge-note-category-${note.id}`}>
                              {getCategoryLabel(note.category)}
                            </Badge>
                            {note.startupName && (
                              <span className="text-sm text-muted-foreground" data-testid={`text-note-startup-${note.id}`}>
                                {note.startupName}
                              </span>
                            )}
                            {note.authorName && (
                              <span className="text-xs text-muted-foreground">{t("byAuthor")} {note.authorName}</span>
                            )}
                          </div>
                          <p className="text-sm" data-testid={`text-note-content-${note.id}`}>{note.content}</p>
                          {note.createdAt && (
                            <p className="text-xs text-muted-foreground mt-1">{new Date(note.createdAt).toLocaleDateString()}</p>
                          )}
                        </div>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => deleteNoteMutation.mutate(note.id)}
                          disabled={deleteNoteMutation.isPending}
                          data-testid={`button-delete-note-${note.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="reviewers" className="mt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <h3 className="text-lg font-semibold">{t('reviewerAssignments')}</h3>
              </div>
            </div>
            {reviewerAssignments.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <ClipboardCheck className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">{t('noReviewsAssigned')}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reviewerAssignments.map((assignment: any) => (
                  <Card key={assignment.id} data-testid={`card-reviewer-${assignment.id}`}>
                    <CardHeader>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <CardTitle className="text-base">{assignment.entityName || assignment.entityType}</CardTitle>
                        <Badge variant={assignment.status === 'done' ? 'default' : assignment.status === 'inReview' ? 'secondary' : 'outline'}>
                          {assignment.status === 'done' ? t('statusDone') : assignment.status === 'inReview' ? t('statusInReview') : t('statusAssigned')}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <p>{t('assignReviewer')}: {assignment.reviewerFirstName} {assignment.reviewerLastName}</p>
                        <p>{assignment.reviewerEmail}</p>
                        {assignment.dueDate && <p>{t('dueDate')}: {new Date(assignment.dueDate).toLocaleDateString()}</p>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t('activityLog')}</h3>
            <p className="text-sm text-muted-foreground">{t('activityLogSubtitle')}</p>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">{t("filterByAction")}</label>
                <Select value={activityActionFilter} onValueChange={setActivityActionFilter}>
                  <SelectTrigger className="w-[180px]" data-testid="select-activity-action-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("allActions")}</SelectItem>
                    {ACTIVITY_ACTIONS.map((action) => (
                      <SelectItem key={action} value={action}>{t(action as any) || action}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">{t("fromDate")}</label>
                <Input
                  type="date"
                  value={activityFromDate}
                  onChange={(e) => setActivityFromDate(e.target.value)}
                  className="w-[180px]"
                  data-testid="input-activity-from-date"
                />
              </div>
            </div>
            {(() => {
              const filtered = activityLogs.filter((log: any) => {
                if (activityActionFilter !== "all" && log.actionType !== activityActionFilter) return false;
                if (activityFromDate && new Date(log.createdAt) < new Date(activityFromDate)) return false;
                return true;
              });
              if (filtered.length === 0) {
                return (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Activity className="w-12 h-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">{t('noActivityYet')}</p>
                    </CardContent>
                  </Card>
                );
              }
              return (
                <div className="space-y-2">
                  {filtered.map((log: any) => (
                    <Card key={log.id} data-testid={`card-activity-${log.id}`}>
                      <CardContent className="py-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{log.actorFirstName} {log.actorLastName}</span>
                            <span className="text-muted-foreground">{t(log.actionType as any) || log.actionType}</span>
                            {log.entityName && <Badge variant="outline">{log.entityName}</Badge>}
                          </div>
                          <span className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              );
            })()}
          </div>
        </TabsContent>

        <TabsContent value="plan" className="mt-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold">{t('companyPlan')}</h3>
              <p className="text-sm text-muted-foreground">{t('companyPlanSubtitle')}</p>
            </div>

            {(() => {
              const level = companyPlanData?.corporationLevel || 1;
              const levelNames: Record<number, string> = {
                1: language === 'ru' ? 'Уровень 1 — Базовый' : 'Level 1 — Basic',
                2: language === 'ru' ? 'Уровень 2 — Продвинутый' : 'Level 2 — Advanced',
                3: language === 'ru' ? 'Уровень 3 — Премиум' : 'Level 3 — Premium',
              };
              const levelColors: Record<number, string> = { 1: 'bg-blue-500/10 text-blue-500', 2: 'bg-amber-500/10 text-amber-500', 3: 'bg-emerald-500/10 text-emerald-500' };

              const levelLimits: Record<number, Array<{label: string, value: string}>> = {
                1: [
                  { label: language === 'ru' ? 'Выделение мероприятий' : 'Event highlighting', value: language === 'ru' ? '1 в месяц (на неделю)' : '1 per month (for a week)' },
                  { label: language === 'ru' ? 'Рекомендуемые мероприятия' : 'Recommended events', value: language === 'ru' ? 'Недоступно' : 'Not available' },
                  { label: language === 'ru' ? 'Спец. брендирование' : 'Special branding', value: language === 'ru' ? 'Недоступно' : 'Not available' },
                  { label: language === 'ru' ? 'Вакансии' : 'Vacancies', value: language === 'ru' ? 'Без ограничений (без выделения)' : 'Unlimited (no highlighting)' },
                  { label: language === 'ru' ? 'Программы' : 'Programs', value: language === 'ru' ? '1 (до 100 участников)' : '1 (up to 100 participants)' },
                  { label: language === 'ru' ? 'Бизнес-задачи' : 'Business tasks', value: language === 'ru' ? '1 (до 30 заявок)' : '1 (up to 30 applications)' },
                ],
                2: [
                  { label: language === 'ru' ? 'Выделение мероприятий' : 'Event highlighting', value: language === 'ru' ? 'Все мероприятия выделены' : 'All events highlighted' },
                  { label: language === 'ru' ? 'Рекомендуемые мероприятия' : 'Recommended events', value: language === 'ru' ? 'До 4 в месяц (на неделю)' : 'Up to 4 per month (for a week)' },
                  { label: language === 'ru' ? 'Спец. брендирование' : 'Special branding', value: language === 'ru' ? '1 мероприятие + 1 вакансия' : '1 event + 1 vacancy' },
                  { label: language === 'ru' ? 'Вакансии' : 'Vacancies', value: language === 'ru' ? 'Без ограничений + выделение' : 'Unlimited + highlighting' },
                  { label: language === 'ru' ? 'Программы' : 'Programs', value: language === 'ru' ? '2 (до 500 участников)' : '2 (up to 500 participants)' },
                  { label: language === 'ru' ? 'Бизнес-задачи' : 'Business tasks', value: language === 'ru' ? '5 (до 150 заявок)' : '5 (up to 150 applications)' },
                ],
                3: [
                  { label: language === 'ru' ? 'Выделение мероприятий' : 'Event highlighting', value: language === 'ru' ? 'Без ограничений + брендирование' : 'Unlimited + branding' },
                  { label: language === 'ru' ? 'Рекомендуемые мероприятия' : 'Recommended events', value: language === 'ru' ? 'До 8 в месяц (на неделю)' : 'Up to 8 per month (for a week)' },
                  { label: language === 'ru' ? 'Спец. брендирование' : 'Special branding', value: language === 'ru' ? 'Без ограничений' : 'Unlimited' },
                  { label: language === 'ru' ? 'Вакансии' : 'Vacancies', value: language === 'ru' ? 'Без ограничений + выделение + брендирование' : 'Unlimited + highlighting + branding' },
                  { label: language === 'ru' ? 'Программы' : 'Programs', value: language === 'ru' ? '5 (без ограничений участников)' : '5 (unlimited participants)' },
                  { label: language === 'ru' ? 'Бизнес-задачи' : 'Business tasks', value: language === 'ru' ? 'Без ограничений' : 'Unlimited' },
                ],
              };

              return (
                <>
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <CardTitle className="text-base">{language === 'ru' ? 'Текущий уровень' : 'Current level'}</CardTitle>
                        <Badge className={levelColors[level]}>{levelNames[level]}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {levelLimits[level]?.map((item, i) => (
                          <div key={i} className="flex items-center justify-between gap-2 flex-wrap py-1 border-b border-border/50 last:border-0" data-testid={`level-limit-${i}`}>
                            <span className="text-sm text-muted-foreground">{item.label}</span>
                            <span className="text-sm font-medium">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1, 2, 3].map((lvl) => (
                      <Card key={lvl} className={`${lvl === level ? 'ring-2 ring-primary' : ''}`}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <CardTitle className="text-sm">{levelNames[lvl]}</CardTitle>
                            {lvl === level && <Badge variant="outline" className="text-xs">{language === 'ru' ? 'Текущий' : 'Current'}</Badge>}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-1">
                            {levelLimits[lvl]?.map((item, i) => (
                              <div key={i} className="text-xs text-muted-foreground">
                                {item.label}: <span className="font-medium text-foreground">{item.value}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {companyPlanData?.usage && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">{t('usageDashboard')}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {[
                            { label: language === 'ru' ? 'Выделенные мероприятия (месяц)' : 'Highlighted events (month)', used: companyPlanData.usage.highlightedEventsThisMonth || 0, max: level === 1 ? 1 : -1 },
                            { label: language === 'ru' ? 'Рекомендуемые мероприятия' : 'Recommended events', used: companyPlanData.usage.recommendedEventsThisMonth || 0, max: level === 1 ? 0 : level === 2 ? 4 : 8 },
                            { label: language === 'ru' ? 'Активные программы' : 'Active programs', used: companyPlanData.usage.activePrograms || 0, max: level === 1 ? 1 : level === 2 ? 2 : -1 },
                            { label: language === 'ru' ? 'Бизнес-задачи' : 'Business tasks', used: companyPlanData.usage.activeBusinessTasks || 0, max: level === 1 ? 1 : level === 2 ? 5 : -1 },
                            { label: language === 'ru' ? 'Ожидающие заявки' : 'Pending applications', used: companyPlanData.usage.pendingApplications || 0, max: level === 1 ? 30 : level === 2 ? 150 : -1 },
                          ].map((metric) => {
                            const isUnlimited = metric.max === -1;
                            const percentage = isUnlimited ? 0 : metric.max > 0 ? (metric.used / metric.max) * 100 : 0;
                            const isWarning = !isUnlimited && percentage >= 80;
                            const isExceeded = !isUnlimited && percentage >= 100;
                            return (
                              <div key={metric.label} className="space-y-2" data-testid={`usage-metric-${metric.label}`}>
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <span className="text-sm font-medium">{metric.label}</span>
                                  <span className="text-sm text-muted-foreground">
                                    {metric.used} {isUnlimited ? '' : `${t('ofLimit')} ${metric.max}`}
                                    {isUnlimited && (language === 'ru' ? '(без лимита)' : '(unlimited)')}
                                  </span>
                                </div>
                                {!isUnlimited && metric.max > 0 && (
                                  <div className="w-full bg-muted rounded-full h-2">
                                    <div
                                      className={`h-2 rounded-full transition-all ${isExceeded ? 'bg-destructive' : isWarning ? 'bg-yellow-500' : 'bg-primary'}`}
                                      style={{ width: `${Math.min(100, percentage)}%` }}
                                    />
                                  </div>
                                )}
                                {isWarning && !isExceeded && (
                                  <div className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
                                    <AlertTriangle className="w-3 h-3" />
                                    {t('usageLimitWarning')}
                                  </div>
                                )}
                                {isExceeded && (
                                  <div className="flex items-center gap-1 text-xs text-destructive">
                                    <AlertTriangle className="w-3 h-3" />
                                    {t('usageLimitExceeded')}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              );
            })()}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={briefDialogOpen} onOpenChange={(open) => { if (!open) closeBriefDialog(); else setBriefDialogOpen(true); }}>
        <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBrief ? t("editBrief") : t("createBrief")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!editingBrief && (
              <div className="rounded-md border border-primary/20 bg-primary/5 p-3 space-y-2" data-testid="ai-brief-draft-section">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="h-4 w-4 text-primary" />
                  {language === "ru" ? "Помощь ИИ: набросок брифа" : "AI assist: draft brief"}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={aiBriefOneLiner}
                    onChange={(e) => setAiBriefOneLiner(e.target.value)}
                    placeholder={language === "ru"
                      ? "Опишите задачу одной строкой..."
                      : "Describe what you need in one line..."}
                    data-testid="input-ai-brief-oneliner"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={aiBriefOneLiner.trim().length < 6 || aiBriefLoading}
                    onClick={async () => {
                      try {
                        setAiBriefLoading(true);
                        const company = myCompanies.find((c: Company) => c.id === selectedCompanyId);
                        const res = await apiRequest("/api/ai/draft-brief", {
                          method: "POST",
                          body: JSON.stringify({
                            oneLiner: aiBriefOneLiner,
                            language,
                            companyName: company?.name,
                          }),
                        });
                        const draft = await res.json();
                        if (draft.title) setBriefTitle(draft.title);
                        if (draft.description) setBriefDescription(draft.description);
                        if (draft.requirements) setBriefRequirements(draft.requirements);
                        if (draft.verticals) setBriefVerticals(draft.verticals);
                        if (draft.budget) setBriefBudget(draft.budget);
                        toast({ title: t("success"), description: language === "ru" ? "Бриф создан ИИ" : "Brief drafted by AI" });
                      } catch (e: any) {
                        toast({ title: t("error"), description: e.message, variant: "destructive" });
                      } finally {
                        setAiBriefLoading(false);
                      }
                    }}
                    data-testid="button-ai-draft-brief"
                  >
                    {aiBriefLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium">{t("briefTitle")}</label>
              <Input
                value={briefTitle}
                onChange={(e) => setBriefTitle(e.target.value)}
                placeholder={t("briefTitlePlaceholder")}
                data-testid="input-brief-title"
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("briefDescription")}</label>
              <Textarea
                value={briefDescription}
                onChange={(e) => setBriefDescription(e.target.value)}
                placeholder={t("briefDescriptionPlaceholder")}
                data-testid="input-brief-description"
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("briefRequirements")}</label>
              <Textarea
                value={briefRequirements}
                onChange={(e) => setBriefRequirements(e.target.value)}
                placeholder={t("briefRequirementsPlaceholder")}
                data-testid="input-brief-requirements"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">{t("briefVerticals")}</label>
                <Input
                  value={briefVerticals}
                  onChange={(e) => setBriefVerticals(e.target.value)}
                  placeholder={t("companyIndustryPlaceholder")}
                  data-testid="input-brief-verticals"
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t("briefBudget")}</label>
                <Input
                  value={briefBudget}
                  onChange={(e) => setBriefBudget(e.target.value)}
                  placeholder={t("briefBudgetPlaceholder")}
                  data-testid="input-brief-budget"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">{t("briefDeadline")}</label>
                <Input
                  type="date"
                  value={briefDeadline}
                  onChange={(e) => setBriefDeadline(e.target.value)}
                  data-testid="input-brief-deadline"
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t("briefStatus")}</label>
                <Select value={briefStatus} onValueChange={setBriefStatus}>
                  <SelectTrigger data-testid="select-brief-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BRIEF_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{getBriefStatusLabel(s)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeBriefDialog} data-testid="button-cancel-brief">{t("cancel")}</Button>
            <Button
              onClick={handleBriefSubmit}
              disabled={!briefTitle || createBriefMutation.isPending || updateBriefMutation.isPending}
              data-testid="button-submit-brief"
            >
              {(createBriefMutation.isPending || updateBriefMutation.isPending) ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("saving")}
                </>
              ) : (
                editingBrief ? t("update") : t("create")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={noteDialogOpen} onOpenChange={(open) => { if (!open) closeNoteDialog(); else setNoteDialogOpen(true); }}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{t("addNote")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t("startupIdOptional")}</label>
              <Input
                value={noteStartupId}
                onChange={(e) => setNoteStartupId(e.target.value)}
                placeholder={t("pipelineStartupIdPlaceholder")}
                data-testid="input-note-startup"
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("noteCategory")}</label>
              <Select value={noteCategory} onValueChange={setNoteCategory}>
                <SelectTrigger data-testid="select-note-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{getCategoryLabel(c)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">{t("noteContentLabel")}</label>
              <Textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder={t("notePlaceholder")}
                data-testid="input-note-content"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeNoteDialog} data-testid="button-cancel-note">{t("cancel")}</Button>
            <Button
              onClick={handleNoteSubmit}
              disabled={!noteContent || createNoteMutation.isPending}
              data-testid="button-submit-note"
            >
              {createNoteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("saving")}
                </>
              ) : (
                t("addNote")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={assignReviewerDialogOpen} onOpenChange={(open) => { if (!open) { setAssignReviewerDialogOpen(false); setAssignReviewerAppId(""); setAssignReviewerUserId(""); setAssignReviewerDueDate(""); } }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{t("assignReviewerToApplication")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t("reviewerUserId")}</label>
              <Input
                value={assignReviewerUserId}
                onChange={(e) => setAssignReviewerUserId(e.target.value)}
                placeholder={t("reviewerUserId")}
                data-testid="input-reviewer-user-id"
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("dueDate")}</label>
              <Input
                type="date"
                value={assignReviewerDueDate}
                onChange={(e) => setAssignReviewerDueDate(e.target.value)}
                data-testid="input-reviewer-due-date"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAssignReviewerDialogOpen(false); setAssignReviewerAppId(""); setAssignReviewerUserId(""); setAssignReviewerDueDate(""); }} data-testid="button-cancel-assign-reviewer">{t("cancel")}</Button>
            <Button
              onClick={() => createReviewerAssignmentMutation.mutate({ entityType: "briefApplication", entityId: assignReviewerAppId, reviewerId: assignReviewerUserId, companyId: selectedCompanyId, dueDate: assignReviewerDueDate || undefined })}
              disabled={!assignReviewerUserId || createReviewerAssignmentMutation.isPending}
              data-testid="button-submit-assign-reviewer"
            >
              {createReviewerAssignmentMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {t("assignReviewerToApplication")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {allCompanies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {t("allCorporations") || "All Corporations"}
            </CardTitle>
            <CardDescription>{t("browseCorporations") || "Browse all registered corporations"}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allCompanies.map((company) => (
                <Card key={company.id} className="hover-elevate" data-testid={`card-corporation-${company.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 rounded-md shrink-0">
                        {company.logo ? (
                          <AvatarImage src={company.logo} alt={company.name} />
                        ) : null}
                        <AvatarFallback className="rounded-md">
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-sm line-clamp-1" data-testid={`text-corporation-name-${company.id}`}>{company.name}</h4>
                        {company.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{company.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      {company.vertical && (
                        <Badge variant="secondary" className="text-xs">{company.vertical}</Badge>
                      )}
                      {company.website && (
                        <Badge variant="secondary" className="text-xs cursor-pointer" onClick={() => window.open(company.website!, "_blank")}>
                          <Globe className="h-3 w-3 mr-1" />
                          Website
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
