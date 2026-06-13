import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { BarChart3, FileText, Users, GitBranch, Building2, Globe, Briefcase, Loader2, ExternalLink } from "lucide-react";

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

type PublicCompanyProfile = {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  website?: string;
  vertical?: string;
  coverImage?: string;
  socialLinks?: Record<string, string>;
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
};

type Program = {
  id: string;
  name: string;
  status: string;
  companyId?: string;
  startDate?: string;
  endDate?: string;
};

const PIPELINE_STATUSES = ["discovered", "inEvaluation", "inPilot", "inScaleUp", "archived"] as const;

const getPipelineColor = (status: string) => {
  switch (status) {
    case "discovered": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    case "inEvaluation": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    case "inPilot": return "bg-purple-500/10 text-purple-500 border-purple-500/20";
    case "inScaleUp": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    case "archived": return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    default: return "";
  }
};

const getPipelineTranslationKey = (status: string) => {
  switch (status) {
    case "discovered": return "pipelineStatusDiscovered";
    case "inEvaluation": return "pipelineStatusInEvaluation";
    case "inPilot": return "pipelineStatusInPilot";
    case "inScaleUp": return "pipelineStatusInScaleUp";
    case "archived": return "pipelineStatusArchived";
    default: return status;
  }
};

export default function Reporting() {
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");

  const { data: myCompanies = [], isLoading: isLoadingCompanies } = useQuery<Company[]>({
    queryKey: ["/api/my-companies"],
    enabled: isAuthenticated,
  });

  const selectedCompany = myCompanies.find(c => c.id === selectedCompanyId);

  if (myCompanies.length > 0 && !selectedCompanyId && myCompanies[0]) {
    setSelectedCompanyId(myCompanies[0].id);
  }

  const { data: report, isLoading: isLoadingReport } = useQuery<CompanyReport>({
    queryKey: ["/api/companies", selectedCompanyId, "report"],
    enabled: !!selectedCompanyId,
  });

  const { data: publicProfile, isLoading: isLoadingProfile } = useQuery<PublicCompanyProfile>({
    queryKey: ["/api/companies", selectedCompanyId, "public"],
    enabled: !!selectedCompanyId,
  });

  const { data: pipeline = [], isLoading: isLoadingPipeline } = useQuery<PipelineEntry[]>({
    queryKey: ["/api/companies", selectedCompanyId, "pipeline"],
    enabled: !!selectedCompanyId,
  });

  const { data: programs = [], isLoading: isLoadingPrograms } = useQuery<Program[]>({
    queryKey: ["/api/programs", { companyId: selectedCompanyId }],
    queryFn: async () => {
      const res = await fetch(`/api/programs?companyId=${selectedCompanyId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch programs");
      return res.json();
    },
    enabled: !!selectedCompanyId,
  });

  const pipelineBreakdown = PIPELINE_STATUSES.map(status => ({
    status,
    translationKey: getPipelineTranslationKey(status),
    color: getPipelineColor(status),
    count: pipeline.filter(p => p.status === status).length,
  }));

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
            <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2" data-testid="text-login-required">{t("pleaseLogIn")}</h3>
            <p className="text-muted-foreground text-center">{t("loginToAccessReporting")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (myCompanies.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            {t("reportingTitle")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("reportingSubtitle")}</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2" data-testid="text-no-companies">{t("noCompanies")}</h3>
            <p className="text-muted-foreground text-center">{t("noCompaniesDescription")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            {t("reportingTitle")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("reportingSubtitle")}</p>
        </div>
        <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
          <SelectTrigger className="w-[220px]" data-testid="select-company">
            <SelectValue placeholder={t("selectCompany")} />
          </SelectTrigger>
          <SelectContent>
            {myCompanies.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoadingReport ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="hover-elevate" data-testid="card-kpi-briefs">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("briefsPublished")}</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-brief-count">
                  {report?.briefCount ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">{t("totalScoutingBriefs")}</p>
              </CardContent>
            </Card>
            <Card className="hover-elevate" data-testid="card-kpi-applications">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("applications")}</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-application-count">
                  {report?.applicationCount ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">{t("applicationsReceived")}</p>
              </CardContent>
            </Card>
            <Card className="hover-elevate" data-testid="card-kpi-programs">
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
            <Card className="hover-elevate" data-testid="card-kpi-score">
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

          <Card className="hover-elevate" data-testid="card-pipeline-breakdown">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                {t("pipelineBreakdown")}
              </CardTitle>
              <CardDescription>{t("startupsByPipelineStage")}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingPipeline ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : pipeline.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-no-pipeline">
                  {t("noPipelineStartups")}
                </p>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  {pipelineBreakdown.map((item) => (
                    <div key={item.status} className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={item.color}
                        data-testid={`badge-pipeline-${item.status}`}
                      >
                        {t(item.translationKey as any)}
                      </Badge>
                      <span className="text-sm font-semibold" data-testid={`text-pipeline-count-${item.status}`}>
                        {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {isLoadingProfile ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : publicProfile && (
            <Card className="hover-elevate" data-testid="card-employer-branding">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  {t("employerBranding")}
                </CardTitle>
                <CardDescription>{t("publicCompanyProfilePreview")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-4 flex-wrap">
                  {publicProfile.logo && (
                    <img
                      src={publicProfile.logo}
                      alt={publicProfile.name}
                      className="h-16 w-16 rounded-md object-cover shrink-0"
                      data-testid="img-company-logo"
                    />
                  )}
                  <div className="space-y-1 min-w-0">
                    <h3 className="text-lg font-semibold" data-testid="text-company-name">{publicProfile.name}</h3>
                    {publicProfile.vertical && (
                      <Badge variant="secondary" data-testid="badge-company-vertical">{publicProfile.vertical}</Badge>
                    )}
                    {publicProfile.description && (
                      <p className="text-sm text-muted-foreground mt-2" data-testid="text-company-description">
                        {publicProfile.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {publicProfile.website && (
                    <Button variant="outline" size="sm" asChild data-testid="link-company-website">
                      <a href={publicProfile.website} target="_blank" rel="noopener noreferrer">
                        <Globe className="h-4 w-4 mr-2" />
                        {t("website")}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </Button>
                  )}
                  <Button variant="outline" size="sm" asChild data-testid="link-public-profile">
                    <a href={`/companies/${selectedCompanyId}/public`} target="_blank" rel="noopener noreferrer">
                      <Building2 className="h-4 w-4 mr-2" />
                      {t("publicProfile")}
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="hover-elevate" data-testid="card-talent-layer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                {t("talentLayer")}
              </CardTitle>
              <CardDescription>{t("talentLayerSubtitle")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <p className="text-sm text-muted-foreground" data-testid="text-talent-description">
                  {t("talentLayerDescription")}
                </p>
                <Button variant="outline" asChild data-testid="link-career-portal">
                  <a href="/careers">
                    <Briefcase className="h-4 w-4 mr-2" />
                    {t("careerPortal")}
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {isLoadingPrograms ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : programs.length > 0 && (
            <Card className="hover-elevate" data-testid="card-programs-list">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5" />
                  {t("programs")} ({programs.length})
                </CardTitle>
                <CardDescription>{t("activeCompanyPrograms")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {programs.map((program) => (
                    <div
                      key={program.id}
                      className="flex items-center justify-between gap-4 flex-wrap"
                      data-testid={`row-program-${program.id}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium" data-testid={`text-program-name-${program.id}`}>
                          {program.name}
                        </span>
                        <Badge
                          variant="outline"
                          className={program.status === "active" ? "bg-green-500/10 text-green-500 border-green-500/20" : ""}
                          data-testid={`badge-program-status-${program.id}`}
                        >
                          {program.status}
                        </Badge>
                      </div>
                      {program.startDate && (
                        <span className="text-xs text-muted-foreground" data-testid={`text-program-date-${program.id}`}>
                          {new Date(program.startDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
