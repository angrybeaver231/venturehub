import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap, Building, Users, Globe, MapPin, Plus, Trash2, Edit2, Loader2, ImagePlus, Clock, Check, X as XIcon, ExternalLink } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  createUniversitySchema,
  createClubSchema,
  UNIVERSITY_TYPES,
  CLUB_FOCUSES,
  type University,
  type Club,
  type CreateUniversityInput,
  type CreateClubInput,
} from "@shared/schema";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export default function Universities() {
  const { toast } = useToast();
  const { user, isHeadAdmin } = useAuth();
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState("universities");
  const [isUniDialogOpen, setIsUniDialogOpen] = useState(false);
  const [isClubDialogOpen, setIsClubDialogOpen] = useState(false);
  const [editingUniversity, setEditingUniversity] = useState<University | null>(null);
  const [editingClub, setEditingClub] = useState<Club | null>(null);

  const canManage = isHeadAdmin;
  const canCreate = !!user;

  const uniLogoInputRef = useRef<HTMLInputElement>(null);
  const clubLogoInputRef = useRef<HTMLInputElement>(null);
  const [uniLogoPreview, setUniLogoPreview] = useState<string | null>(null);
  const [clubLogoPreview, setClubLogoPreview] = useState<string | null>(null);

  const uploadLogoMutation = useMutation({
    mutationFn: async ({ entityType, entityId, file }: { entityType: string; entityId: string; file: File }) => {
      const formData = new FormData();
      formData.append('logo', file);
      const res = await fetch(`/api/${entityType}/${entityId}/logo`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Upload failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/universities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clubs"] });
      toast({ title: t("success"), description: "Logo uploaded successfully" });
    },
    onError: () => {
      toast({ title: t("error"), description: "Failed to upload logo", variant: "destructive" });
    },
  });

  const uniForm = useForm<CreateUniversityInput>({
    resolver: zodResolver(createUniversitySchema),
    defaultValues: {
      name: "",
      slug: "",
      city: "",
      region: "",
      type: "university",
      website: "",
      shortDescription: "",
    },
  });

  const clubForm = useForm<CreateClubInput>({
    resolver: zodResolver(createClubSchema),
    defaultValues: {
      name: "",
      slug: "",
      universityId: "",
      focus: "",
      description: "",
      isOfficial: false,
      isPartnerClub: false,
    },
  });

  usePageSEO({
    title: t("universitiesTitle"),
    description: t("universitiesSubtitle"),
    keywords: "universities, clubs, hubs, entrepreneurship",
  });

  const { data: universities = [], isLoading: isLoadingUnis } = useQuery<University[]>({
    queryKey: ["/api/universities"],
  });

  const { data: clubs = [], isLoading: isLoadingClubs } = useQuery<Club[]>({
    queryKey: ["/api/clubs"],
  });

  const { data: pendingUniversities = [] } = useQuery<University[]>({
    queryKey: ["/api/universities/pending"],
    enabled: canManage,
  });

  const { data: pendingClubs = [] } = useQuery<Club[]>({
    queryKey: ["/api/clubs/pending"],
    enabled: canManage,
  });

  const approveUniMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/universities/${id}/review`, {
        method: "PATCH",
        body: JSON.stringify({ status: "active" }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/universities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/universities/pending"] });
      toast({ title: t("success"), description: language === 'ru' ? 'Университет одобрен' : 'University approved' });
    },
    onError: () => {
      toast({ title: t("error"), variant: "destructive" });
    },
  });

  const rejectUniMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/universities/${id}/review`, {
        method: "PATCH",
        body: JSON.stringify({ status: "rejected" }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/universities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/universities/pending"] });
      toast({ title: t("success"), description: language === 'ru' ? 'Университет отклонён' : 'University rejected' });
    },
    onError: () => {
      toast({ title: t("error"), variant: "destructive" });
    },
  });

  const approveClubMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/clubs/${id}/review`, {
        method: "PATCH",
        body: JSON.stringify({ status: "active" }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clubs/pending"] });
      toast({ title: t("success"), description: language === 'ru' ? 'Клуб одобрен' : 'Club approved' });
    },
    onError: () => {
      toast({ title: t("error"), variant: "destructive" });
    },
  });

  const rejectClubMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/clubs/${id}/review`, {
        method: "PATCH",
        body: JSON.stringify({ status: "rejected" }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clubs/pending"] });
      toast({ title: t("success"), description: language === 'ru' ? 'Клуб отклонён' : 'Club rejected' });
    },
    onError: () => {
      toast({ title: t("error"), variant: "destructive" });
    },
  });

  const pendingCount = pendingUniversities.length + pendingClubs.length;

  const createUniMutation = useMutation({
    mutationFn: async (data: CreateUniversityInput) => {
      const res = await apiRequest("/api/universities", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/universities"] });
      setIsUniDialogOpen(false);
      uniForm.reset();
      if (result?.status === 'pending_review') {
        toast({ title: t("success"), description: language === 'ru' ? 'Заявка отправлена на рассмотрение' : 'Application submitted for review' });
      } else {
        toast({ title: t("success"), description: t("universityCreated") });
      }
    },
    onError: () => {
      toast({ title: t("error"), description: "Failed to create university", variant: "destructive" });
    },
  });

  const updateUniMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateUniversityInput> }) => {
      return await apiRequest(`/api/universities/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/universities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/universities/pending"] });
      setIsUniDialogOpen(false);
      setEditingUniversity(null);
      uniForm.reset();
      toast({ title: t("success"), description: t("universityUpdated") });
    },
    onError: () => {
      toast({ title: t("error"), description: "Failed to update university", variant: "destructive" });
    },
  });

  const deleteUniMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/universities/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/universities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/universities/pending"] });
      toast({ title: t("success"), description: t("universityDeleted") });
    },
    onError: () => {
      toast({ title: t("error"), description: "Failed to delete university", variant: "destructive" });
    },
  });

  const createClubMutation = useMutation({
    mutationFn: async (data: CreateClubInput) => {
      const res = await apiRequest("/api/clubs", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs"] });
      setIsClubDialogOpen(false);
      clubForm.reset();
      if (result?.status === 'pending_review') {
        toast({ title: t("success"), description: language === 'ru' ? 'Заявка отправлена на рассмотрение' : 'Application submitted for review' });
      } else {
        toast({ title: t("success"), description: t("clubCreated") });
      }
    },
    onError: () => {
      toast({ title: t("error"), description: "Failed to create club", variant: "destructive" });
    },
  });

  const updateClubMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateClubInput> }) => {
      return await apiRequest(`/api/clubs/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clubs/pending"] });
      setIsClubDialogOpen(false);
      setEditingClub(null);
      clubForm.reset();
      toast({ title: t("success"), description: t("clubUpdated") });
    },
    onError: () => {
      toast({ title: t("error"), description: "Failed to update club", variant: "destructive" });
    },
  });

  const deleteClubMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/clubs/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clubs/pending"] });
      toast({ title: t("success"), description: t("clubDeleted") });
    },
    onError: () => {
      toast({ title: t("error"), description: "Failed to delete club", variant: "destructive" });
    },
  });

  const handleEditUniversity = (university: University) => {
    setEditingUniversity(university);
    uniForm.reset({
      name: university.name,
      slug: university.slug,
      city: university.city || "",
      region: university.region || "",
      type: (university.type as CreateUniversityInput["type"]) || "university",
      website: university.website || "",
      shortDescription: university.shortDescription || "",
    });
    setUniLogoPreview(university.logoUrl || null);
    setIsUniDialogOpen(true);
  };

  const handleEditClub = (club: Club) => {
    setEditingClub(club);
    clubForm.reset({
      name: club.name,
      slug: club.slug,
      universityId: club.universityId || "",
      focus: club.focus || "",
      description: club.description || "",
      isOfficial: club.isOfficial,
      isPartnerClub: club.isPartnerClub,
    });
    setClubLogoPreview(club.logoUrl || null);
    setIsClubDialogOpen(true);
  };

  const onSubmitUniversity = async (data: CreateUniversityInput) => {
    const logoFile = uniLogoInputRef.current?.files?.[0];
    if (editingUniversity) {
      updateUniMutation.mutate({ id: editingUniversity.id, data }, {
        onSuccess: (result: any) => {
          if (logoFile) {
            uploadLogoMutation.mutate({ entityType: 'universities', entityId: editingUniversity.id, file: logoFile });
          }
          setUniLogoPreview(null);
        }
      });
    } else {
      createUniMutation.mutate(data, {
        onSuccess: (result: any) => {
          if (logoFile && result?.id) {
            uploadLogoMutation.mutate({ entityType: 'universities', entityId: result.id, file: logoFile });
          }
          setUniLogoPreview(null);
        }
      });
    }
  };

  const onSubmitClub = async (data: CreateClubInput) => {
    const logoFile = clubLogoInputRef.current?.files?.[0];
    if (editingClub) {
      updateClubMutation.mutate({ id: editingClub.id, data }, {
        onSuccess: (result: any) => {
          if (logoFile) {
            uploadLogoMutation.mutate({ entityType: 'clubs', entityId: editingClub.id, file: logoFile });
          }
          setClubLogoPreview(null);
        }
      });
    } else {
      createClubMutation.mutate(data, {
        onSuccess: (result: any) => {
          if (logoFile && result?.id) {
            uploadLogoMutation.mutate({ entityType: 'clubs', entityId: result.id, file: logoFile });
          }
          setClubLogoPreview(null);
        }
      });
    }
  };

  const getUniversityName = (universityId: string | null) => {
    if (!universityId) return null;
    const uni = universities.find((u) => u.id === universityId);
    return uni?.name || null;
  };

  const getTypeColor = (type: string | null) => {
    switch (type) {
      case "university": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "hub": return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "acceleratorPartner": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      default: return "";
    }
  };

  const getTypeLabel = (type: string | null) => {
    switch (type) {
      case "university": return "University";
      case "hub": return "Hub";
      case "acceleratorPartner": return "Accelerator Partner";
      default: return type || "";
    }
  };

  const getFocusColor = (focus: string | null) => {
    switch (focus) {
      case "entrepreneurship": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "ai": return "bg-violet-500/10 text-violet-500 border-violet-500/20";
      case "fintech": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "product": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "consulting": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "marketing": return "bg-pink-500/10 text-pink-500 border-pink-500/20";
      case "other": return "bg-gray-500/10 text-gray-500 border-gray-500/20";
      default: return "";
    }
  };

  const renderUniversityCard = (university: University, showPendingActions = false) => (
    <Card
      key={university.id}
      className="hover-elevate transition-all"
      data-testid={`card-university-${university.id}`}
    >
      <Link href={`/universities/${university.slug}`} data-testid={`link-university-${university.id}`}>
        <CardHeader className="cursor-pointer">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="h-10 w-10 rounded-md shrink-0">
                {university.logoUrl ? (
                  <AvatarImage src={university.logoUrl} alt={university.name} />
                ) : null}
                <AvatarFallback className="rounded-md">
                  <GraduationCap className="h-5 w-5 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              <CardTitle className="text-lg line-clamp-1" data-testid={`text-university-name-${university.id}`}>
                {university.name}
              </CardTitle>
            </div>
            {university.type && (
              <Badge variant="outline" className={`shrink-0 ${getTypeColor(university.type)}`} data-testid={`badge-type-${university.id}`}>
                {getTypeLabel(university.type)}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="cursor-pointer">
          {university.shortDescription && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3" data-testid={`text-university-desc-${university.id}`}>
              {university.shortDescription}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {university.city && (
              <Badge variant="secondary" data-testid={`badge-city-${university.id}`}>
                <MapPin className="h-3 w-3 mr-1" />
                {university.city}
              </Badge>
            )}
            <Badge variant="secondary" data-testid={`badge-members-${university.id}`}>
              <Users className="h-3 w-3 mr-1" />
              {t("viewDetails")}
            </Badge>
            {(university as any).status === 'pending_review' && (
              <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400">
                {language === 'ru' ? 'На рассмотрении' : 'Pending'}
              </Badge>
            )}
            {(university as any).status === 'rejected' && (
              <Badge variant="destructive">
                {language === 'ru' ? 'Отклонено' : 'Rejected'}
              </Badge>
            )}
          </div>
        </CardContent>
      </Link>
      {showPendingActions && (
        <CardFooter className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => approveUniMutation.mutate(university.id)}
            disabled={approveUniMutation.isPending}
            data-testid={`button-approve-university-${university.id}`}
          >
            <Check className="h-4 w-4 mr-1" />
            {t("approve")}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => rejectUniMutation.mutate(university.id)}
            disabled={rejectUniMutation.isPending}
            data-testid={`button-reject-university-${university.id}`}
          >
            <XIcon className="h-4 w-4 mr-1" />
            {t("reject")}
          </Button>
        </CardFooter>
      )}
      {!showPendingActions && canManage && (
        <CardFooter className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => { e.preventDefault(); handleEditUniversity(university); }}
            data-testid={`button-edit-university-${university.id}`}
          >
            <Edit2 className="h-4 w-4 mr-1" />
            {t("edit")}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={(e) => { e.preventDefault(); deleteUniMutation.mutate(university.id); }}
            disabled={deleteUniMutation.isPending}
            data-testid={`button-delete-university-${university.id}`}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            {t("delete")}
          </Button>
        </CardFooter>
      )}
    </Card>
  );

  const renderClubCard = (club: Club, showPendingActions = false) => {
    const universityName = getUniversityName(club.universityId);
    return (
      <Card
        key={club.id}
        className="hover-elevate transition-all"
        data-testid={`card-club-${club.id}`}
      >
        <Link href={`/clubs/${club.slug}`} data-testid={`link-club-${club.id}`}>
          <CardHeader className="cursor-pointer">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-10 w-10 rounded-md shrink-0">
                  {club.logoUrl ? (
                    <AvatarImage src={club.logoUrl} alt={club.name} />
                  ) : null}
                  <AvatarFallback className="rounded-md">
                    <Building className="h-5 w-5 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <CardTitle className="text-lg line-clamp-1" data-testid={`text-club-name-${club.id}`}>
                    {club.name}
                  </CardTitle>
                  {universityName && (
                    <p className="text-sm text-muted-foreground line-clamp-1" data-testid={`text-club-university-${club.id}`}>
                      {universityName}
                    </p>
                  )}
                </div>
              </div>
              {club.focus && (
                <Badge variant="outline" className={`shrink-0 ${getFocusColor(club.focus)}`} data-testid={`badge-focus-${club.id}`}>
                  {club.focus}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="cursor-pointer">
            {club.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3" data-testid={`text-club-desc-${club.id}`}>
                {club.description}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              {club.isOfficial && (
                <Badge variant="secondary" data-testid={`badge-official-${club.id}`}>
                  {t("officialClub")}
                </Badge>
              )}
              {club.isPartnerClub && (
                <Badge variant="secondary" data-testid={`badge-partner-${club.id}`}>
                  {t("partnerClub")}
                </Badge>
              )}
              {(club as any).status === 'pending_review' && (
                <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400">
                  {language === 'ru' ? 'На рассмотрении' : 'Pending'}
                </Badge>
              )}
              {(club as any).status === 'rejected' && (
                <Badge variant="destructive">
                  {language === 'ru' ? 'Отклонено' : 'Rejected'}
                </Badge>
              )}
            </div>
          </CardContent>
        </Link>
        {showPendingActions && (
          <CardFooter className="flex items-center justify-end gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { handleEditClub(club); }}
              data-testid={`button-edit-pending-club-${club.id}`}
            >
              <Edit2 className="h-4 w-4 mr-1" />
              {t("edit")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => approveClubMutation.mutate(club.id)}
              disabled={approveClubMutation.isPending}
              data-testid={`button-approve-club-${club.id}`}
            >
              <Check className="h-4 w-4 mr-1" />
              {t("approve")}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => rejectClubMutation.mutate(club.id)}
              disabled={rejectClubMutation.isPending}
              data-testid={`button-reject-club-${club.id}`}
            >
              <XIcon className="h-4 w-4 mr-1" />
              {t("reject")}
            </Button>
          </CardFooter>
        )}
        {!showPendingActions && canManage && (
          <CardFooter className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => { e.preventDefault(); handleEditClub(club); }}
              data-testid={`button-edit-club-${club.id}`}
            >
              <Edit2 className="h-4 w-4 mr-1" />
              {t("edit")}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={(e) => { e.preventDefault(); deleteClubMutation.mutate(club.id); }}
              disabled={deleteClubMutation.isPending}
              data-testid={`button-delete-club-${club.id}`}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {t("delete")}
            </Button>
          </CardFooter>
        )}
      </Card>
    );
  };

  if (isLoadingUnis || isLoadingClubs) {
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
            {t("universitiesTitle")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("universitiesSubtitle")}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="tabs-universities-clubs">
        <TabsList data-testid="tablist-universities-clubs" className="flex-wrap h-auto gap-1">
          <TabsTrigger value="universities" data-testid="tab-universities">
            <GraduationCap className="h-4 w-4 mr-1" />
            {t("universitiesTitle")}
          </TabsTrigger>
          <TabsTrigger value="clubs" data-testid="tab-clubs">
            <Building className="h-4 w-4 mr-1" />
            {t("clubsTitle")}
          </TabsTrigger>
          {canManage && (
            <TabsTrigger value="pending" data-testid="tab-pending">
              <Clock className="h-4 w-4 mr-1" />
              {t("pendingReview")}
              {pendingCount > 0 && (
                <Badge variant="destructive" className="ml-1.5 no-default-hover-elevate no-default-active-elevate">{pendingCount}</Badge>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="universities" className="space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-xl font-semibold">{t("universitiesTitle")}</h2>
            {(canCreate || canManage) && (
              <Dialog open={isUniDialogOpen} onOpenChange={(open) => {
                setIsUniDialogOpen(open);
                if (!open) {
                  setEditingUniversity(null);
                  uniForm.reset();
                  setUniLogoPreview(null);
                }
              }}>
                <DialogTrigger asChild>
                  <Button data-testid="button-create-university">
                    <Plus className="h-4 w-4 mr-2" />
                    {t("createUniversity")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingUniversity ? t("editUniversity") : t("createUniversity")}
                    </DialogTitle>
                    <DialogDescription>
                      {editingUniversity
                        ? t("editUniversity")
                        : !isHeadAdmin
                          ? (language === 'ru' ? 'Заявка будет отправлена на рассмотрение администратору.' : 'Your submission will be sent for admin review.')
                          : t("createUniversity")}
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...uniForm}>
                    <form onSubmit={uniForm.handleSubmit(onSubmitUniversity)} className="space-y-4">
                      <FormField
                        control={uniForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("title")}</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="University name" data-testid="input-university-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={uniForm.control}
                        name="slug"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("slug")}</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="university-slug" data-testid="input-university-slug" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={uniForm.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("location")}</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="City" data-testid="input-university-city" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={uniForm.control}
                          name="region"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Region</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Region" data-testid="input-university-region" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={uniForm.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("universityType")}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || "university"}>
                              <FormControl>
                                <SelectTrigger data-testid="select-university-type">
                                  <SelectValue placeholder={t("universityType")} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {UNIVERSITY_TYPES.map((type) => (
                                  <SelectItem key={type} value={type}>{getTypeLabel(type)}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={uniForm.control}
                        name="website"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Website</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="https://example.edu" data-testid="input-university-website" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={uniForm.control}
                        name="shortDescription"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("description") || "Description"}</FormLabel>
                            <FormControl>
                              <Textarea {...field} placeholder="Short description" data-testid="input-university-description" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Logo</label>
                        <div className="flex items-center gap-4">
                          <Avatar className="h-16 w-16 rounded-md">
                            {uniLogoPreview ? (
                              <AvatarImage src={uniLogoPreview} alt="University logo" />
                            ) : null}
                            <AvatarFallback className="rounded-md">
                              <GraduationCap className="h-6 w-6 text-muted-foreground" />
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <input
                              ref={uniLogoInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setUniLogoPreview(URL.createObjectURL(file));
                                }
                              }}
                              data-testid="input-university-logo"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => uniLogoInputRef.current?.click()}
                              data-testid="button-upload-university-logo"
                            >
                              <ImagePlus className="h-4 w-4 mr-2" />
                              {editingUniversity ? "Change Logo" : "Upload Logo"}
                            </Button>
                            <p className="text-xs text-muted-foreground mt-1">Saved after create/edit</p>
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          type="submit"
                          disabled={createUniMutation.isPending || updateUniMutation.isPending}
                          data-testid="button-submit-university"
                        >
                          {(createUniMutation.isPending || updateUniMutation.isPending) && (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          )}
                          {t("save")}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {universities.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground" data-testid="text-no-universities">
              <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t("noUniversitiesYet")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {universities.map((uni) => renderUniversityCard(uni))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="clubs" className="space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-xl font-semibold">{t("clubsTitle")}</h2>
            {(canCreate || canManage) && (
              <Button data-testid="button-create-club" onClick={() => { setEditingClub(null); clubForm.reset(); setClubLogoPreview(null); setIsClubDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                {t("createClub")}
              </Button>
            )}
          </div>

          {clubs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground" data-testid="text-no-clubs">
              <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t("noClubsYet")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clubs.map((c) => renderClubCard(c))}
            </div>
          )}
        </TabsContent>

        {(canCreate || canManage) && (
          <Dialog open={isClubDialogOpen} onOpenChange={(open) => {
            setIsClubDialogOpen(open);
            if (!open) {
              setEditingClub(null);
              clubForm.reset();
              setClubLogoPreview(null);
            }
          }}>
            <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingClub ? t("editClub") : t("createClub")}
                    </DialogTitle>
                    <DialogDescription>
                      {editingClub
                        ? t("editClub")
                        : !isHeadAdmin
                          ? (language === 'ru' ? 'Заявка будет отправлена на рассмотрение администратору.' : 'Your submission will be sent for admin review.')
                          : t("createClub")}
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...clubForm}>
                    <form onSubmit={clubForm.handleSubmit(onSubmitClub)} className="space-y-4">
                      <FormField
                        control={clubForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("title")}</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Club name" data-testid="input-club-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={clubForm.control}
                        name="slug"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("slug")}</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="club-slug" data-testid="input-club-slug" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={clubForm.control}
                        name="universityId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{language === 'ru' ? 'Университет / Хаб (необязательно)' : 'University / Hub (optional)'}</FormLabel>
                            <Select onValueChange={(val) => field.onChange(val === "__none__" ? "" : val)} value={field.value || "__none__"}>
                              <FormControl>
                                <SelectTrigger data-testid="select-club-university">
                                  <SelectValue placeholder={language === 'ru' ? 'Независимый клуб' : 'Independent club'} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="__none__">{language === 'ru' ? 'Нет (независимый клуб)' : 'None (independent club)'}</SelectItem>
                                {universities.map((uni) => (
                                  <SelectItem key={uni.id} value={uni.id}>{uni.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={clubForm.control}
                        name="focus"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("clubFocus")}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger data-testid="select-club-focus">
                                  <SelectValue placeholder={t("clubFocus")} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {CLUB_FOCUSES.map((focus) => (
                                  <SelectItem key={focus} value={focus}>{focus}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={clubForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("description") || "Description"}</FormLabel>
                            <FormControl>
                              <Textarea {...field} placeholder="Club description" data-testid="input-club-description" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Logo</label>
                        <div className="flex items-center gap-4">
                          <Avatar className="h-16 w-16 rounded-md">
                            {clubLogoPreview ? (
                              <AvatarImage src={clubLogoPreview} alt="Club logo" />
                            ) : null}
                            <AvatarFallback className="rounded-md">
                              <Building className="h-6 w-6 text-muted-foreground" />
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <input
                              ref={clubLogoInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setClubLogoPreview(URL.createObjectURL(file));
                                }
                              }}
                              data-testid="input-club-logo"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => clubLogoInputRef.current?.click()}
                              data-testid="button-upload-club-logo"
                            >
                              <ImagePlus className="h-4 w-4 mr-2" />
                              {editingClub ? "Change Logo" : "Upload Logo"}
                            </Button>
                            <p className="text-xs text-muted-foreground mt-1">Saved after create/edit</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <FormField
                          control={clubForm.control}
                          name="isOfficial"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="checkbox-club-official"
                                />
                              </FormControl>
                              <FormLabel className="cursor-pointer">{t("officialClub")}</FormLabel>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={clubForm.control}
                          name="isPartnerClub"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="checkbox-club-partner"
                                />
                              </FormControl>
                              <FormLabel className="cursor-pointer">{t("partnerClub")}</FormLabel>
                            </FormItem>
                          )}
                        />
                      </div>
                      <DialogFooter>
                        <Button
                          type="submit"
                          disabled={createClubMutation.isPending || updateClubMutation.isPending}
                          data-testid="button-submit-club"
                        >
                          {(createClubMutation.isPending || updateClubMutation.isPending) && (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          )}
                          {t("save")}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
            </DialogContent>
          </Dialog>
        )}

        {canManage && (
          <TabsContent value="pending" className="space-y-6">
            {pendingUniversities.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  {t("universitiesTitle")}
                  <Badge variant="secondary" className="no-default-hover-elevate">{pendingUniversities.length}</Badge>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingUniversities.map((uni) => renderUniversityCard(uni, true))}
                </div>
              </div>
            )}
            {pendingClubs.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  {t("clubsTitle")}
                  <Badge variant="secondary" className="no-default-hover-elevate">{pendingClubs.length}</Badge>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingClubs.map((club) => renderClubCard(club, true))}
                </div>
              </div>
            )}
            {pendingUniversities.length === 0 && pendingClubs.length === 0 && (
              <div className="text-center py-12 text-muted-foreground" data-testid="text-no-pending">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t("noPendingSubmissions")}</p>
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
