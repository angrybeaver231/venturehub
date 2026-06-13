import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Building2, Globe, Search, FileText, GraduationCap, Loader2, ArrowLeft, Rocket, ChevronRight, Calendar, Users, Target, MapPin, ExternalLink, Plus } from "lucide-react";
import { useLocation } from "wouter";
import type { Startup } from "@shared/schema";

type Company = {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  website?: string;
  industry?: string;
  focusAreas?: string;
  contactEmail?: string;
  status?: string;
};

type Program = {
  id: string;
  companyId?: string;
  name: string;
  description?: string;
  theme?: string;
  cohort?: string;
  targetGroup?: string;
  capacity?: number;
  logoUrl?: string;
  status: string;
  startDate?: string;
  endDate?: string;
};

type Brief = {
  id: string;
  companyId: string;
  title: string;
  description?: string;
  vertical?: string;
  targetStage?: string;
  technologies?: string;
  geography?: string;
  timeline?: string;
  budgetFormat?: string;
  status: string;
  createdAt?: string;
};

const briefApplySchema = z.object({
  startupId: z.string().min(1, "Please select a startup"),
  fitDescription: z.string().optional(),
  useCase: z.string().optional(),
  metricsHighlight: z.string().optional(),
});
type BriefApplyInput = z.infer<typeof briefApplySchema>;

const getStatusColor = (status: string) => {
  switch (status) {
    case "draft": return "bg-muted text-muted-foreground";
    case "open": case "active": case "applications": return "bg-green-500/10 text-green-600 dark:text-green-400";
    case "closed": case "completed": return "bg-red-500/10 text-red-600 dark:text-red-400";
    case "selection": return "bg-purple-500/10 text-purple-600 dark:text-purple-400";
    case "demoDay": return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";
    default: return "";
  }
};

export default function Corporations() {
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const [, navigate] = useLocation();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [applyBriefId, setApplyBriefId] = useState<string | null>(null);
  const [createCompanyOpen, setCreateCompanyOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyDescription, setNewCompanyDescription] = useState("");
  const [newCompanyWebsite, setNewCompanyWebsite] = useState("");
  const [newCompanyVertical, setNewCompanyVertical] = useState("");

  const form = useForm<BriefApplyInput>({
    resolver: zodResolver(briefApplySchema),
    defaultValues: {
      startupId: "",
      fitDescription: "",
      useCase: "",
      metricsHighlight: "",
    },
  });

  const { data: allCompanies = [], isLoading: isLoadingAll } = useQuery<Company[]>({
    queryKey: ["/api/companies/public"],
  });

  const { data: myCompanies = [] } = useQuery<Company[]>({
    queryKey: ["/api/my-companies"],
    enabled: isAuthenticated,
  });

  const { data: myStartups = [] } = useQuery<Startup[]>({
    queryKey: ["/api/my-startups"],
    enabled: isAuthenticated,
  });

  const { data: companyPrograms = [], isLoading: isLoadingPrograms } = useQuery<Program[]>({
    queryKey: [`/api/programs?companyId=${selectedCompanyId}`],
    enabled: !!selectedCompanyId && isAuthenticated,
  });

  const { data: companyBriefs = [], isLoading: isLoadingBriefs } = useQuery<Brief[]>({
    queryKey: [`/api/briefs?companyId=${selectedCompanyId}`],
    enabled: !!selectedCompanyId && isAuthenticated,
  });

  const applyMutation = useMutation({
    mutationFn: async (data: BriefApplyInput & { briefId: string }) => {
      const res = await apiRequest(`/api/briefs/${data.briefId}/apply`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/briefs?companyId=${selectedCompanyId}`] });
      setApplyBriefId(null);
      form.reset();
      toast({ title: t("success"), description: t("applicationSubmitted") });
    },
    onError: (error: Error) => {
      const msg = error.message?.includes("unique") || error.message?.includes("duplicate")
        ? t("alreadyApplied")
        : t("applicationFailed");
      toast({ title: t("error"), description: msg, variant: "destructive" });
    },
  });

  const onSubmitApply = (data: BriefApplyInput) => {
    if (!applyBriefId) return;
    applyMutation.mutate({
      briefId: applyBriefId,
      ...data,
    });
  };

  const createCompanyMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; website?: string; vertical?: string }) => {
      return await apiRequest("/api/companies", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies/public"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-companies"] });
      setCreateCompanyOpen(false);
      setNewCompanyName("");
      setNewCompanyDescription("");
      setNewCompanyWebsite("");
      setNewCompanyVertical("");
      toast({ title: t("success"), description: "Corporation registered! Awaiting approval." });
    },
    onError: () => {
      toast({ title: t("error"), description: "Failed to register corporation", variant: "destructive" });
    },
  });

  const handleCreateCompany = () => {
    if (!newCompanyName.trim()) {
      toast({ title: t("error"), description: t("nameRequired"), variant: "destructive" });
      return;
    }
    createCompanyMutation.mutate({
      name: newCompanyName,
      description: newCompanyDescription || undefined,
      website: newCompanyWebsite || undefined,
      vertical: newCompanyVertical || undefined,
    });
  };

  const myCompanyIds = new Set(myCompanies.map(c => c.id));
  const selectedCompany = allCompanies.find(c => c.id === selectedCompanyId);
  const applyBrief = companyBriefs.find(b => b.id === applyBriefId);
  const watchedStartupId = form.watch("startupId");
  const selectedStartup = myStartups.find(s => s.id === watchedStartupId);

  const filteredCompanies = allCompanies.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.industry || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const myFilteredCompanies = filteredCompanies.filter(c => myCompanyIds.has(c.id));
  const otherFilteredCompanies = filteredCompanies.filter(c => !myCompanyIds.has(c.id));

  const visibleBriefs = companyBriefs.filter(b => b.status !== "draft");

  if (isLoadingAll) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (selectedCompanyId && selectedCompany) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="icon" onClick={() => setSelectedCompanyId(null)} data-testid="button-back-to-list">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3 min-w-0 flex-1 flex-wrap">
            <Avatar className="h-12 w-12 rounded-md shrink-0">
              {selectedCompany.logo ? (
                <AvatarImage src={selectedCompany.logo} alt={selectedCompany.name} />
              ) : null}
              <AvatarFallback className="rounded-md">
                <Building2 className="h-6 w-6 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold flex items-center gap-2 flex-wrap" data-testid="text-company-detail-name">
                {selectedCompany.name}
                {myCompanyIds.has(selectedCompany.id) && (
                  <Badge variant="default" data-testid="badge-my-company">{t("myCompany")}</Badge>
                )}
              </h1>
              {selectedCompany.industry && (
                <p className="text-sm text-muted-foreground">{selectedCompany.industry}</p>
              )}
            </div>
          </div>
          {selectedCompany.website && (
            <Button variant="outline" size="sm" onClick={() => window.open(selectedCompany.website!, "_blank")} data-testid="button-company-website">
              <ExternalLink className="h-4 w-4 mr-1" />
              {t("website")}
            </Button>
          )}
        </div>

        {selectedCompany.description && (
          <Card data-testid="card-company-description">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap" data-testid="text-company-description">{selectedCompany.description}</p>
            </CardContent>
          </Card>
        )}

        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4 flex-wrap">
            <GraduationCap className="h-5 w-5" />
            {t("programs")}
          </h2>
          {!isAuthenticated ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">{t("loginToViewPrograms")}</p>
              </CardContent>
            </Card>
          ) : isLoadingPrograms ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : companyPrograms.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <GraduationCap className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">{t("noProgramsYet")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {companyPrograms.map(program => (
                <Card key={program.id} className="hover-elevate" data-testid={`card-program-${program.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <CardTitle className="text-base" data-testid={`text-program-name-${program.id}`}>{program.name}</CardTitle>
                      <Badge variant="outline" className={getStatusColor(program.status)}>{program.status}</Badge>
                    </div>
                    {program.theme && <CardDescription>{program.theme}</CardDescription>}
                  </CardHeader>
                  <CardContent>
                    {program.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{program.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      {program.targetGroup && (
                        <Badge variant="secondary">
                          <Target className="h-3 w-3 mr-1" />
                          {program.targetGroup}
                        </Badge>
                      )}
                      {program.capacity && (
                        <Badge variant="secondary">
                          <Users className="h-3 w-3 mr-1" />
                          {program.capacity}
                        </Badge>
                      )}
                      {program.startDate && (
                        <Badge variant="secondary">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(program.startDate).toLocaleDateString()}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4 flex-wrap">
            <FileText className="h-5 w-5" />
            {t("businessTasks")}
          </h2>
          {!isAuthenticated ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">{t("loginToViewTasks")}</p>
              </CardContent>
            </Card>
          ) : isLoadingBriefs ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : visibleBriefs.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">{t("noTasksYet")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {visibleBriefs.map(brief => (
                <Card
                  key={brief.id}
                  className="hover-elevate cursor-pointer"
                  onClick={() => setApplyBriefId(brief.id)}
                  data-testid={`card-brief-${brief.id}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <CardTitle className="text-base flex items-center gap-2 flex-wrap" data-testid={`text-brief-title-${brief.id}`}>
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        {brief.title}
                      </CardTitle>
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <Badge variant="outline" className={getStatusColor(brief.status)}>{brief.status}</Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {brief.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{brief.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      {brief.vertical && (
                        <Badge variant="secondary">{brief.vertical}</Badge>
                      )}
                      {brief.targetStage && (
                        <Badge variant="secondary">{brief.targetStage}</Badge>
                      )}
                      {brief.technologies && (
                        <Badge variant="secondary">{brief.technologies}</Badge>
                      )}
                      {brief.geography && (
                        <Badge variant="secondary">
                          <MapPin className="h-3 w-3 mr-1" />
                          {brief.geography}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <Dialog open={!!applyBriefId} onOpenChange={(open) => { if (!open) { setApplyBriefId(null); form.reset(); } }}>
          <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("applyToTask")}</DialogTitle>
              {applyBrief && (
                <DialogDescription>{applyBrief.title}</DialogDescription>
              )}
            </DialogHeader>

            {myStartups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <Rocket className="h-12 w-12 text-muted-foreground" />
                <div className="text-center space-y-2">
                  <h3 className="font-semibold text-lg" data-testid="text-no-startups-prompt">{t("noStartupsYet")}</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    {t("createStartupFirst")}
                  </p>
                </div>
                <Button onClick={() => navigate("/startups")} data-testid="button-go-create-startup">
                  <Plus className="h-4 w-4 mr-2" />
                  {t("createStartup")}
                </Button>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitApply)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="startupId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("selectStartup")}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-startup-for-apply">
                              <SelectValue placeholder={t("chooseStartup")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {myStartups.map(s => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedStartup && (
                    <Card className="bg-muted/50">
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          {selectedStartup.logo ? (
                            <img src={selectedStartup.logo} alt={selectedStartup.name} className="h-8 w-8 rounded-md object-cover" />
                          ) : (
                            <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center">
                              <Rocket className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-sm" data-testid="text-selected-startup-name">{selectedStartup.name}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              {selectedStartup.vertical && <Badge variant="secondary" className="text-xs">{selectedStartup.vertical}</Badge>}
                              {selectedStartup.stage && <Badge variant="secondary" className="text-xs">{selectedStartup.stage}</Badge>}
                            </div>
                          </div>
                        </div>
                        {selectedStartup.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{selectedStartup.description}</p>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  <FormField
                    control={form.control}
                    name="fitDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("fitDescription")}</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder={t("fitDescriptionPlaceholder")}
                            data-testid="input-fit-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="useCase"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("useCase")}</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder={t("useCasePlaceholder")}
                            data-testid="input-use-case"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="metricsHighlight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("metricsHighlight")}</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder={t("metricsPlaceholder")}
                            data-testid="input-metrics-highlight"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => { setApplyBriefId(null); form.reset(); }} data-testid="button-cancel-apply">
                      {t("cancel")}
                    </Button>
                    <Button
                      type="submit"
                      disabled={applyMutation.isPending}
                      data-testid="button-submit-apply"
                    >
                      {applyMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                      {t("submitApplication")}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2 flex-wrap" data-testid="text-corporations-title">
            <Building2 className="h-8 w-8" />
            {t("corporationsTitle")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("corporationsSubtitle")}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("searchCorporations")}
              className="pl-9"
              data-testid="input-search-corporations"
            />
          </div>
          {isAuthenticated && (
            <Button onClick={() => setCreateCompanyOpen(true)} data-testid="button-register-corporation">
              <Plus className="h-4 w-4 mr-2" />
              {t("createCompany")}
            </Button>
          )}
        </div>
      </div>

      <Dialog open={createCompanyOpen} onOpenChange={(open) => setCreateCompanyOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("createCompany")}</DialogTitle>
            <DialogDescription>
              {"Register a new corporation. It will be reviewed before activation."}
            </DialogDescription>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateCompanyOpen(false)}>{t("cancel")}</Button>
            <Button onClick={handleCreateCompany} disabled={createCompanyMutation.isPending} data-testid="button-submit-company">
              {createCompanyMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              {t("createCompany")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isAuthenticated && myFilteredCompanies.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 flex-wrap" data-testid="text-my-corporations-header">
            <Building2 className="h-5 w-5" />
            {t("myCorporations")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myFilteredCompanies.map(company => (
              <Card
                key={company.id}
                className="hover-elevate cursor-pointer border-primary/30"
                onClick={() => setSelectedCompanyId(company.id)}
                data-testid={`card-my-corporation-${company.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Avatar className="h-10 w-10 rounded-md shrink-0">
                      {company.logo ? <AvatarImage src={company.logo} alt={company.name} /> : null}
                      <AvatarFallback className="rounded-md">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium text-sm line-clamp-1 flex items-center gap-2 flex-wrap" data-testid={`text-my-corp-name-${company.id}`}>
                        {company.name}
                        <Badge variant="default" className="text-xs shrink-0">{t("member")}</Badge>
                      </h4>
                      {company.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{company.description}</p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    {company.industry && <Badge variant="secondary" className="text-xs">{company.industry}</Badge>}
                    {company.website && (
                      <Badge variant="secondary" className="text-xs">
                        <Globe className="h-3 w-3 mr-1" />
                        {t("website")}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 flex-wrap" data-testid="text-all-corporations-header">
          <Building2 className="h-5 w-5" />
          {t("allCorporations")}
        </h2>
        {filteredCompanies.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                {searchQuery
                  ? t("noCorporationsFound")
                  : t("noCorporationsRegistered")
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(isAuthenticated ? otherFilteredCompanies : filteredCompanies).map(company => (
              <Card
                key={company.id}
                className="hover-elevate cursor-pointer"
                onClick={() => setSelectedCompanyId(company.id)}
                data-testid={`card-corporation-${company.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Avatar className="h-10 w-10 rounded-md shrink-0">
                      {company.logo ? <AvatarImage src={company.logo} alt={company.name} /> : null}
                      <AvatarFallback className="rounded-md">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium text-sm line-clamp-1" data-testid={`text-corp-name-${company.id}`}>{company.name}</h4>
                      {company.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{company.description}</p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    {company.industry && <Badge variant="secondary" className="text-xs">{company.industry}</Badge>}
                    {company.website && (
                      <Badge variant="secondary" className="text-xs">
                        <Globe className="h-3 w-3 mr-1" />
                        {t("website")}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
