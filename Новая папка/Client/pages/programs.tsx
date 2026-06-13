import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
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
import { GraduationCap, Plus, Trash2, Loader2, Users, Calendar, Building2, Eye, ImagePlus } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

type Company = {
  id: string;
  name: string;
};

type Program = {
  id: string;
  name: string;
  description?: string;
  type: string;
  companyId?: string;
  companyName?: string;
  status: string;
  startDate?: string;
  endDate?: string;
  maxParticipants?: number;
  verticals?: string;
  logoUrl?: string;
  createdAt?: string;
};

type Participant = {
  id: string;
  programId: string;
  startupId?: string;
  userId?: string;
  role?: string;
  startupName?: string;
  userName?: string;
  joinedAt?: string;
};

const PROGRAM_TYPES = ["accelerator", "incubator", "hackathon", "workshop", "mentorship"] as const;
const PROGRAM_STATUSES = ["draft", "upcoming", "active", "completed", "cancelled"] as const;

const getTypeColor = (type: string) => {
  switch (type) {
    case "accelerator": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    case "incubator": return "bg-purple-500/10 text-purple-500 border-purple-500/20";
    case "hackathon": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
    case "workshop": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    case "mentorship": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    default: return "";
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "draft": return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    case "upcoming": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    case "active": return "bg-green-500/10 text-green-500 border-green-500/20";
    case "completed": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    case "cancelled": return "bg-red-500/10 text-red-500 border-red-500/20";
    default: return "";
  }
};

export default function Programs() {
  const { toast } = useToast();
  const { isAuthenticated, isInnoLabsAdmin: isAdmin } = useAuth();
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [detailProgram, setDetailProgram] = useState<Program | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formType, setFormType] = useState("accelerator");
  const [formCompanyId, setFormCompanyId] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formMaxParticipants, setFormMaxParticipants] = useState("");
  const [formVerticals, setFormVerticals] = useState("");
  const [formStatus, setFormStatus] = useState("draft");

  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const uploadLogoMutation = useMutation({
    mutationFn: async ({ programId, file }: { programId: string; file: File }) => {
      const formData = new FormData();
      formData.append('logo', file);
      const res = await fetch(`/api/programs/${programId}/logo`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Upload failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      toast({ title: t("success"), description: "Logo uploaded" });
    },
    onError: () => {
      toast({ title: t("error"), description: "Failed to upload logo", variant: "destructive" });
    },
  });

  const [addParticipantOpen, setAddParticipantOpen] = useState(false);
  const [participantStartupId, setParticipantStartupId] = useState("");
  const [participantUserId, setParticipantUserId] = useState("");
  const [participantRole, setParticipantRole] = useState("participant");

  const getTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      accelerator: t("programTypeAccelerator"),
      incubator: t("programTypeIncubator"),
      hackathon: t("programTypeHackathon"),
      workshop: t("programTypeWorkshop"),
      mentorship: t("programTypeMentorship"),
    };
    return typeMap[type] || (type ? type.charAt(0).toUpperCase() + type.slice(1) : "");
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      draft: t("programStatusDraft"),
      upcoming: t("programStatusUpcoming"),
      active: t("programStatusActive"),
      completed: t("programStatusCompleted"),
      cancelled: t("programStatusCancelled"),
    };
    return statusMap[status] || (status ? status.charAt(0).toUpperCase() + status.slice(1) : "");
  };

  const { data: myCompanies = [] } = useQuery<Company[]>({
    queryKey: ["/api/my-companies"],
    enabled: isAuthenticated,
  });

  const { data: allPrograms = [], isLoading } = useQuery<Program[]>({
    queryKey: ["/api/programs"],
  });

  const firstCompanyId = myCompanies.length > 0 ? myCompanies[0].id : "";

  const { data: companyPrograms = [], isLoading: isLoadingCompany } = useQuery<Program[]>({
    queryKey: ["/api/programs", { companyId: firstCompanyId }],
    queryFn: async () => {
      const res = await fetch(`/api/programs?companyId=${firstCompanyId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch programs");
      return res.json();
    },
    enabled: !!firstCompanyId && activeTab === "company",
  });

  const { data: participants = [], isLoading: isLoadingParticipants } = useQuery<Participant[]>({
    queryKey: ["/api/programs", detailProgram?.id, "participants"],
    enabled: !!detailProgram?.id && detailDialogOpen,
  });

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("/api/programs", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      closeDialog();
      toast({ title: t("success"), description: t("programCreated") });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create program", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      return await apiRequest(`/api/programs/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      closeDialog();
      toast({ title: t("success"), description: t("programUpdated") });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update program", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/programs/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      toast({ title: t("success"), description: t("programDeleted") });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete program", variant: "destructive" });
    },
  });

  const addParticipantMutation = useMutation({
    mutationFn: async ({ programId, data }: { programId: string; data: Record<string, unknown> }) => {
      const res = await apiRequest(`/api/programs/${programId}/participants`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      if (detailProgram) {
        queryClient.invalidateQueries({ queryKey: ["/api/programs", detailProgram.id, "participants"] });
      }
      setAddParticipantOpen(false);
      setParticipantStartupId("");
      setParticipantUserId("");
      setParticipantRole("participant");
      toast({ title: t("success"), description: t("participantAdded") });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add participant", variant: "destructive" });
    },
  });

  const removeParticipantMutation = useMutation({
    mutationFn: async ({ programId, participantId }: { programId: string; participantId: string }) => {
      return await apiRequest(`/api/programs/${programId}/participants/${participantId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      if (detailProgram) {
        queryClient.invalidateQueries({ queryKey: ["/api/programs", detailProgram.id, "participants"] });
      }
      toast({ title: t("success"), description: t("participantRemoved") });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove participant", variant: "destructive" });
    },
  });

  const openDialog = (program?: Program) => {
    if (program) {
      setEditingProgram(program);
      setFormName(program.name);
      setFormDescription(program.description || "");
      setFormType(program.type);
      setFormCompanyId(program.companyId || "");
      setFormStartDate(program.startDate || "");
      setFormEndDate(program.endDate || "");
      setFormMaxParticipants(program.maxParticipants?.toString() || "");
      setFormVerticals(program.verticals || "");
      setFormStatus(program.status);
      setLogoPreview(program.logoUrl || null);
    } else {
      setEditingProgram(null);
      setFormName("");
      setFormDescription("");
      setFormType("accelerator");
      setFormCompanyId("");
      setFormStartDate("");
      setFormEndDate("");
      setFormMaxParticipants("");
      setFormVerticals("");
      setFormStatus("draft");
      setLogoPreview(null);
    }
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingProgram(null);
    setFormName("");
    setFormDescription("");
    setFormType("accelerator");
    setFormCompanyId("");
    setFormStartDate("");
    setFormEndDate("");
    setFormMaxParticipants("");
    setFormVerticals("");
    setFormStatus("draft");
    setLogoPreview(null);
  };

  const handleSubmit = () => {
    const data: Record<string, unknown> = {
      name: formName,
      description: formDescription,
      type: formType,
      startDate: formStartDate || undefined,
      endDate: formEndDate || undefined,
      maxParticipants: formMaxParticipants ? parseInt(formMaxParticipants) : undefined,
      verticals: formVerticals || undefined,
      status: formStatus,
    };
    if (formCompanyId) data.companyId = formCompanyId;
    const logoFile = logoInputRef.current?.files?.[0];

    if (editingProgram) {
      updateMutation.mutate({ id: editingProgram.id, data }, {
        onSuccess: () => {
          if (logoFile) {
            uploadLogoMutation.mutate({ programId: editingProgram.id, file: logoFile });
          }
        }
      });
    } else {
      createMutation.mutate(data, {
        onSuccess: (result: any) => {
          if (logoFile && result?.id) {
            uploadLogoMutation.mutate({ programId: result.id, file: logoFile });
          }
        }
      });
    }
  };

  const openDetail = (program: Program) => {
    setDetailProgram(program);
    setDetailDialogOpen(true);
  };

  const handleAddParticipant = () => {
    if (!detailProgram) return;
    const data: Record<string, unknown> = { role: participantRole };
    if (participantStartupId) data.startupId = participantStartupId;
    if (participantUserId) data.userId = participantUserId;
    addParticipantMutation.mutate({ programId: detailProgram.id, data });
  };

  const renderProgramCard = (program: Program) => (
    <Card
      key={program.id}
      className="hover-elevate cursor-pointer transition-all"
      onClick={() => openDetail(program)}
      data-testid={`card-program-${program.id}`}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 rounded-md shrink-0">
              {program.logoUrl ? (
                <AvatarImage src={program.logoUrl} alt={program.name} />
              ) : null}
              <AvatarFallback className="rounded-md">
                <GraduationCap className="h-5 w-5 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
            <CardTitle className="text-lg line-clamp-1" data-testid={`text-program-name-${program.id}`}>
              {program.name}
            </CardTitle>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Badge variant="outline" className={getTypeColor(program.type)} data-testid={`badge-program-type-${program.id}`}>
              {getTypeLabel(program.type)}
            </Badge>
          </div>
        </div>
        {program.description && (
          <CardDescription className="line-clamp-2" data-testid={`text-program-desc-${program.id}`}>
            {program.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={getStatusColor(program.status)} data-testid={`badge-program-status-${program.id}`}>
            {getStatusLabel(program.status)}
          </Badge>
          {program.companyName && (
            <Badge variant="secondary" data-testid={`badge-program-company-${program.id}`}>
              <Building2 className="h-3 w-3 mr-1" />
              {program.companyName}
            </Badge>
          )}
          {program.startDate && (
            <Badge variant="secondary" data-testid={`badge-program-dates-${program.id}`}>
              <Calendar className="h-3 w-3 mr-1" />
              {new Date(program.startDate).toLocaleDateString(language === "ru" ? "ru-RU" : "en-US", { day: "numeric", month: "short", year: "numeric" })}{program.endDate ? ` - ${new Date(program.endDate).toLocaleDateString(language === "ru" ? "ru-RU" : "en-US", { day: "numeric", month: "short", year: "numeric" })}` : ""}
            </Badge>
          )}
          {program.maxParticipants && (
            <Badge variant="secondary" data-testid={`badge-program-capacity-${program.id}`}>
              <Users className="h-3 w-3 mr-1" />
              {program.maxParticipants} {t("maxLabel")}
            </Badge>
          )}
          {program.verticals && (
            <Badge variant="secondary" data-testid={`badge-program-verticals-${program.id}`}>
              {program.verticals}
            </Badge>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            openDetail(program);
          }}
          data-testid={`button-view-program-${program.id}`}
        >
          <Eye className="h-4 w-4 mr-1" />
          {t("programDetails")}
        </Button>
        {(isAdmin || myCompanies.some(c => c.id === program.companyId)) && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                openDialog(program);
              }}
              data-testid={`button-edit-program-${program.id}`}
            >
              {t("edit")}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                deleteMutation.mutate(program.id);
              }}
              disabled={deleteMutation.isPending}
              data-testid={`button-delete-program-${program.id}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );

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
            <GraduationCap className="h-8 w-8" />
            {t("programsTitle")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("programsSubtitle")}</p>
        </div>

        {(isAdmin || myCompanies.length > 0) && (
          <Button onClick={() => openDialog()} data-testid="button-create-program">
            <Plus className="h-4 w-4 mr-2" />
            {t("newProgram")}
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-programs">
          <TabsTrigger value="all" data-testid="tab-all-programs">{t("allPrograms")}</TabsTrigger>
          {myCompanies.length > 0 && (
            <TabsTrigger value="company" data-testid="tab-company-programs">{t("myCompanyPrograms")}</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {allPrograms.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <GraduationCap className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2" data-testid="text-no-programs">{t("noPrograms")}</h3>
                <p className="text-muted-foreground text-center">{t("noProgramsDescription")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {allPrograms.map(renderProgramCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="company" className="mt-6">
          {isLoadingCompany ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : companyPrograms.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <GraduationCap className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2" data-testid="text-no-company-programs">{t("noCompanyPrograms")}</h3>
                <p className="text-muted-foreground text-center">{t("noCompanyProgramsDescription")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {companyPrograms.map(renderProgramCard)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProgram ? t("editProgram") : t("createProgram")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t("programName")}</label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t("programNamePlaceholder")}
                data-testid="input-program-name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("programDescription")}</label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder={t("programDescriptionPlaceholder")}
                data-testid="input-program-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">{t("programType")}</label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger data-testid="select-program-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROGRAM_TYPES.map((pt) => (
                      <SelectItem key={pt} value={pt}>{getTypeLabel(pt)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">{t("programStatus")}</label>
                <Select value={formStatus} onValueChange={setFormStatus}>
                  <SelectTrigger data-testid="select-program-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROGRAM_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{getStatusLabel(s)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {myCompanies.length > 0 && (
              <div>
                <label className="text-sm font-medium">{t("companyOptional")}</label>
                <Select value={formCompanyId} onValueChange={setFormCompanyId}>
                  <SelectTrigger data-testid="select-program-company">
                    <SelectValue placeholder={t("noCompany")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("noCompany")}</SelectItem>
                    {myCompanies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">{t("programStartDate")}</label>
                <Input
                  type="date"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  data-testid="input-program-start-date"
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t("programEndDate")}</label>
                <Input
                  type="date"
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                  data-testid="input-program-end-date"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">{t("programMaxParticipants")}</label>
                <Input
                  type="number"
                  value={formMaxParticipants}
                  onChange={(e) => setFormMaxParticipants(e.target.value)}
                  placeholder={t("maxParticipantsPlaceholder")}
                  data-testid="input-program-max-participants"
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t("programVerticals")}</label>
                <Input
                  value={formVerticals}
                  onChange={(e) => setFormVerticals(e.target.value)}
                  placeholder={t("verticalsPlaceholder")}
                  data-testid="input-program-verticals"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Logo</label>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 rounded-md">
                  {logoPreview ? (
                    <AvatarImage src={logoPreview} alt="Program logo" />
                  ) : null}
                  <AvatarFallback className="rounded-md">
                    <GraduationCap className="h-6 w-6 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setLogoPreview(URL.createObjectURL(file));
                      }
                    }}
                    data-testid="input-program-logo"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => logoInputRef.current?.click()}
                    data-testid="button-upload-program-logo"
                  >
                    <ImagePlus className="h-4 w-4 mr-2" />
                    {editingProgram ? "Change Logo" : "Upload Logo"}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">Saved after create/edit</p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} data-testid="button-cancel-program">{t("cancel")}</Button>
            <Button
              onClick={handleSubmit}
              disabled={!formName || createMutation.isPending || updateMutation.isPending}
              data-testid="button-submit-program"
            >
              {(createMutation.isPending || updateMutation.isPending) ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("saving")}
                </>
              ) : (
                editingProgram ? t("update") : t("create")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-detail-program-name">{detailProgram?.name}</DialogTitle>
          </DialogHeader>
          {detailProgram && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={getTypeColor(detailProgram.type)}>
                  {getTypeLabel(detailProgram.type)}
                </Badge>
                <Badge variant="outline" className={getStatusColor(detailProgram.status)}>
                  {getStatusLabel(detailProgram.status)}
                </Badge>
                {detailProgram.companyName && (
                  <Badge variant="secondary">
                    <Building2 className="h-3 w-3 mr-1" />
                    {detailProgram.companyName}
                  </Badge>
                )}
              </div>

              {detailProgram.description && (
                <p className="text-sm text-muted-foreground" data-testid="text-detail-description">
                  {detailProgram.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {detailProgram.startDate && (
                  <span data-testid="text-detail-dates">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    {new Date(detailProgram.startDate).toLocaleDateString(language === "ru" ? "ru-RU" : "en-US", { day: "numeric", month: "short", year: "numeric" })}{detailProgram.endDate ? ` - ${new Date(detailProgram.endDate).toLocaleDateString(language === "ru" ? "ru-RU" : "en-US", { day: "numeric", month: "short", year: "numeric" })}` : ""}
                  </span>
                )}
                {detailProgram.maxParticipants && (
                  <span data-testid="text-detail-capacity">
                    <Users className="h-4 w-4 inline mr-1" />
                    {detailProgram.maxParticipants} {t("programMaxParticipants").toLowerCase()}
                  </span>
                )}
                {detailProgram.verticals && (
                  <span data-testid="text-detail-verticals">{t("programVerticals")}: {detailProgram.verticals}</span>
                )}
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h3 className="font-semibold">{t("participants")}</h3>
                  <Button
                    size="sm"
                    onClick={() => setAddParticipantOpen(true)}
                    data-testid="button-add-participant"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {t("addParticipant")}
                  </Button>
                </div>

                {isLoadingParticipants ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : participants.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-no-participants">
                    {t("noParticipants")}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {participants.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-2 rounded-md border p-3"
                        data-testid={`row-participant-${p.id}`}
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-sm" data-testid={`text-participant-name-${p.id}`}>
                            {p.startupName || p.userName || p.startupId || p.userId || t("stageUnknown")}
                          </p>
                          {p.role && (
                            <Badge variant="secondary" data-testid={`badge-participant-role-${p.id}`}>{p.role}</Badge>
                          )}
                        </div>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => removeParticipantMutation.mutate({
                            programId: detailProgram.id,
                            participantId: p.id,
                          })}
                          disabled={removeParticipantMutation.isPending}
                          data-testid={`button-remove-participant-${p.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {addParticipantOpen && (
                  <div className="mt-4 border-t pt-4 space-y-3">
                    <h4 className="text-sm font-semibold">{t("addParticipant")}</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium">{t("participantStartupId")}</label>
                        <Input
                          value={participantStartupId}
                          onChange={(e) => setParticipantStartupId(e.target.value)}
                          placeholder={t("participantStartupId")}
                          data-testid="input-participant-startup"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">{t("participantUserId")}</label>
                        <Input
                          value={participantUserId}
                          onChange={(e) => setParticipantUserId(e.target.value)}
                          placeholder={t("participantUserId")}
                          data-testid="input-participant-user"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">{t("participantRole")}</label>
                      <Input
                        value={participantRole}
                        onChange={(e) => setParticipantRole(e.target.value)}
                        placeholder={t("rolePlaceholder")}
                        data-testid="input-participant-role"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAddParticipantOpen(false);
                          setParticipantStartupId("");
                          setParticipantUserId("");
                          setParticipantRole("participant");
                        }}
                        data-testid="button-cancel-participant"
                      >
                        {t("cancel")}
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleAddParticipant}
                        disabled={(!participantStartupId && !participantUserId) || addParticipantMutation.isPending}
                        data-testid="button-submit-participant"
                      >
                        {addParticipantMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            {t("adding")}
                          </>
                        ) : (
                          t("addParticipant")
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
