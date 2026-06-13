import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Star, BarChart3, Plus, Trash2, Loader2, ArrowUpDown, Filter } from "lucide-react";

type Startup = {
  id: string;
  name: string;
  vertical?: string | null;
  stage?: string | null;
};

type Company = {
  id: string;
  name: string;
};

type Evaluation = {
  id: string;
  entityType: string;
  entityId: string;
  companyId?: string;
  evaluatorId: string;
  teamScore: number;
  productScore: number;
  marketScore: number;
  tractionScore: number;
  strategicFitScore: number;
  riskScore: number;
  notes?: string;
  recommendation: string;
  evaluatorName?: string;
  companyName?: string;
  createdAt?: string;
};

type EvaluationSummary = {
  count: number;
  avgTeamScore: number;
  avgProductScore: number;
  avgMarketScore: number;
  avgTractionScore: number;
  avgStrategicFitScore: number;
  avgRiskScore: number;
  avgTotal: number;
};

const RECOMMENDATIONS = [
  { value: "strongPass", labelKey: "recommendStrongPass" },
  { value: "pass", labelKey: "recommendPass" },
  { value: "consider", labelKey: "recommendConsider" },
  { value: "strongConsider", labelKey: "recommendStrongConsider" },
] as const;

const ENTITY_TYPES = [
  { value: "startup", labelKey: "entityTypeStartup" },
  { value: "program", labelKey: "entityTypeProgram" },
  { value: "brief", labelKey: "entityTypeBrief" },
] as const;

const getRecommendationColor = (rec: string) => {
  switch (rec) {
    case "strongPass": return "bg-red-500/10 text-red-500 border-red-500/20";
    case "pass": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
    case "consider": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    case "strongConsider": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    default: return "";
  }
};

const SCORE_FIELDS = [
  { key: "teamScore", labelKey: "scoreTeam" },
  { key: "productScore", labelKey: "scoreProduct" },
  { key: "marketScore", labelKey: "scoreMarket" },
  { key: "tractionScore", labelKey: "scoreTraction" },
  { key: "strategicFitScore", labelKey: "scoreStrategicFit" },
  { key: "riskScore", labelKey: "scoreRisk" },
] as const;

const AVG_SCORE_FIELDS = [
  { key: "avgTeamScore", labelKey: "scoreTeam" },
  { key: "avgProductScore", labelKey: "scoreProduct" },
  { key: "avgMarketScore", labelKey: "scoreMarket" },
  { key: "avgTractionScore", labelKey: "scoreTraction" },
  { key: "avgStrategicFitScore", labelKey: "scoreStrategicFit" },
  { key: "avgRiskScore", labelKey: "scoreRisk" },
] as const;

export default function Evaluations() {
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const { t } = useLanguage();

  const [selectedStartupId, setSelectedStartupId] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [sortBy, setSortBy] = useState<string>("name");
  const [filterVertical, setFilterVertical] = useState<string>("all");

  const [entityType, setEntityType] = useState("startup");
  const [companyId, setCompanyId] = useState("");
  const [teamScore, setTeamScore] = useState(5);
  const [productScore, setProductScore] = useState(5);
  const [marketScore, setMarketScore] = useState(5);
  const [tractionScore, setTractionScore] = useState(5);
  const [strategicFitScore, setStrategicFitScore] = useState(5);
  const [riskScore, setRiskScore] = useState(5);
  const [notes, setNotes] = useState("");
  const [recommendation, setRecommendation] = useState("consider");

  const { data: startups = [], isLoading: isLoadingStartups } = useQuery<Startup[]>({
    queryKey: ["/api/startups"],
  });

  const { data: myCompanies = [] } = useQuery<Company[]>({
    queryKey: ["/api/my-companies"],
    enabled: isAuthenticated,
  });

  const { data: evaluations = [], isLoading: isLoadingEvaluations } = useQuery<Evaluation[]>({
    queryKey: ["/api/evaluations/startup", selectedStartupId],
    enabled: !!selectedStartupId,
  });

  const { data: summary, isLoading: isLoadingSummary } = useQuery<EvaluationSummary>({
    queryKey: ["/api/evaluations/startup", selectedStartupId, "summary"],
    enabled: !!selectedStartupId,
  });

  const getRecommendationLabel = (rec: string) => {
    const found = RECOMMENDATIONS.find(r => r.value === rec);
    return found ? t(found.labelKey) : rec;
  };

  const createEvaluationMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("/api/evaluations", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/evaluations/startup", selectedStartupId] });
      queryClient.invalidateQueries({ queryKey: ["/api/evaluations/startup", selectedStartupId, "summary"] });
      resetForm();
      setShowForm(false);
      toast({ title: t("success"), description: t("evaluationSubmitted") });
    },
    onError: () => {
      toast({ title: t("error"), description: "Failed to submit evaluation", variant: "destructive" });
    },
  });

  const deleteEvaluationMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/evaluations/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/evaluations/startup", selectedStartupId] });
      queryClient.invalidateQueries({ queryKey: ["/api/evaluations/startup", selectedStartupId, "summary"] });
      toast({ title: t("success"), description: t("evaluationDeleted") });
    },
    onError: () => {
      toast({ title: t("error"), description: "Failed to delete evaluation", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setEntityType("startup");
    setCompanyId("");
    setTeamScore(5);
    setProductScore(5);
    setMarketScore(5);
    setTractionScore(5);
    setStrategicFitScore(5);
    setRiskScore(5);
    setNotes("");
    setRecommendation("consider");
  };

  const handleSubmit = () => {
    if (!selectedStartupId) {
      toast({ title: t("error"), description: t("pleaseSelectStartup"), variant: "destructive" });
      return;
    }
    createEvaluationMutation.mutate({
      entityType,
      entityId: selectedStartupId,
      companyId: companyId || undefined,
      teamScore,
      productScore,
      marketScore,
      tractionScore,
      strategicFitScore,
      riskScore,
      notes: notes || undefined,
      recommendation,
    });
  };

  const selectedStartup = startups.find(s => s.id === selectedStartupId);
  const totalScore = teamScore + productScore + marketScore + tractionScore + strategicFitScore + riskScore;

  const uniqueVerticals = [...new Set(startups.map(s => s.vertical).filter(Boolean))] as string[];

  const filteredAndSortedStartups = [...startups]
    .filter(s => filterVertical === "all" || s.vertical === filterVertical)
    .sort((a, b) => {
      if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
      if (sortBy === "vertical") return (a.vertical || "").localeCompare(b.vertical || "");
      if (sortBy === "stage") return (a.stage || "").localeCompare(b.stage || "");
      return 0;
    });

  const selectedStillValid = !selectedStartupId || filteredAndSortedStartups.some(s => s.id === selectedStartupId);
  
  useEffect(() => {
    if (selectedStartupId && !filteredAndSortedStartups.some(s => s.id === selectedStartupId)) {
      setSelectedStartupId("");
    }
  }, [filterVertical, filteredAndSortedStartups.length]);

  const isExpertUser = user && (
    (user as any).role === 'expert' || (user as any).role === 'innoLabsAdmin' || (user as any).isHeadAdmin
  );

  if (isLoadingStartups) {
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
            <Star className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2" data-testid="text-login-required">{t("pleaseLogIn")}</h3>
            <p className="text-muted-foreground text-center">{t("loginToAccessEvaluations")}</p>
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
            <Star className="h-8 w-8" />
            {t("evaluationsScoring")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("evaluateStartupsSubtitle")}{!isExpertUser && ` (${t("expertRoleRequired")})`}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={filterVertical} onValueChange={setFilterVertical}>
            <SelectTrigger className="w-[160px]" data-testid="select-filter-vertical">
              <Filter className="h-4 w-4 mr-1" />
              <SelectValue placeholder={t("sortVertical")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allVerticals")}</SelectItem>
              {uniqueVerticals.map((v) => (
                <SelectItem key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[150px]" data-testid="select-sort-by">
              <ArrowUpDown className="h-4 w-4 mr-1" />
              <SelectValue placeholder={t("sortBy")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">{t("sortName")}</SelectItem>
              <SelectItem value="vertical">{t("sortVertical")}</SelectItem>
              <SelectItem value="stage">{t("sortStage")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedStartupId} onValueChange={setSelectedStartupId}>
            <SelectTrigger className="w-[220px]" data-testid="select-startup">
              <SelectValue placeholder={t("selectStartup")} />
            </SelectTrigger>
            <SelectContent>
              {filteredAndSortedStartups.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}{s.vertical ? ` (${s.vertical})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedStartupId && isExpertUser && (
            <Button
              onClick={() => { resetForm(); setShowForm(!showForm); }}
              data-testid="button-toggle-form"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t("newEvaluation")}
            </Button>
          )}
        </div>
      </div>

      {selectedStartupId && selectedStartup && (
        <>
          {isLoadingSummary ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : summary && summary.count > 0 ? (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                {t("scoreSummaryFor")} {selectedStartup.name}
              </h2>
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
                <Card className="hover-elevate" data-testid="card-summary-total">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t("evaluationsTitle")}</CardTitle>
                    <Star className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-eval-count">{summary.count}</div>
                    <p className="text-xs text-muted-foreground">{t("totalEvaluations")}</p>
                  </CardContent>
                </Card>
                <Card className="hover-elevate" data-testid="card-summary-avg">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t("avgTotal")}</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-avg-total">
                      {summary.avgTotal != null ? summary.avgTotal.toFixed(1) : "—"}
                    </div>
                    <p className="text-xs text-muted-foreground">{t("outOf60")}</p>
                  </CardContent>
                </Card>
                {AVG_SCORE_FIELDS.map((item) => (
                  <Card key={item.key} className="hover-elevate" data-testid={`card-summary-${item.key}`}>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{t(item.labelKey)}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold" data-testid={`text-${item.key}`}>
                        {(summary as Record<string, number>)[item.key] != null
                          ? (summary as Record<string, number>)[item.key].toFixed(1)
                          : "—"}
                      </div>
                      <p className="text-xs text-muted-foreground">{t("avgOutOf10")}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <Card className="hover-elevate" data-testid="card-no-summary">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <BarChart3 className="h-10 w-10 text-muted-foreground mb-3" />
                <h3 className="text-lg font-semibold mb-1" data-testid="text-no-evaluations-summary">{t("noEvaluations")}</h3>
                <p className="text-muted-foreground text-center text-sm">{t("submitEvaluationToSeeSummary")}</p>
              </CardContent>
            </Card>
          )}

          {showForm && (
            <Card className="hover-elevate" data-testid="card-evaluation-form">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  {t("newEvaluationFor")} {selectedStartup.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="entityType">{t("entityType")}</Label>
                    <Select value={entityType} onValueChange={setEntityType}>
                      <SelectTrigger data-testid="select-entity-type">
                        <SelectValue placeholder={t("selectType")} />
                      </SelectTrigger>
                      <SelectContent>
                        {ENTITY_TYPES.map((et) => (
                          <SelectItem key={et.value} value={et.value}>{t(et.labelKey)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyId">{t("companyOptional")}</Label>
                    <Select value={companyId} onValueChange={setCompanyId}>
                      <SelectTrigger data-testid="select-company">
                        <SelectValue placeholder={t("selectCompany")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t("noCompany")}</SelectItem>
                        {myCompanies.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">{t("scoringLabel")}</h3>
                  <div className="grid gap-6 md:grid-cols-2">
                    {SCORE_FIELDS.map((field) => {
                      const scoreValues: Record<string, number> = {
                        teamScore, productScore, marketScore,
                        tractionScore, strategicFitScore, riskScore,
                      };
                      const setters: Record<string, (v: number) => void> = {
                        teamScore: setTeamScore, productScore: setProductScore,
                        marketScore: setMarketScore, tractionScore: setTractionScore,
                        strategicFitScore: setStrategicFitScore, riskScore: setRiskScore,
                      };
                      const value = scoreValues[field.key];
                      const setter = setters[field.key];
                      return (
                        <div key={field.key} className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <Label>{t(field.labelKey)}</Label>
                            <Badge variant="secondary" data-testid={`badge-score-${field.key}`}>
                              {value}/10
                            </Badge>
                          </div>
                          <Slider
                            value={[value]}
                            onValueChange={(v) => setter(v[0])}
                            min={0}
                            max={10}
                            step={1}
                            data-testid={`slider-${field.key}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-2">
                    <span className="text-sm font-medium text-muted-foreground">{t("totalScore")}</span>
                    <Badge variant="outline" data-testid="badge-total-score">
                      {totalScore}/60
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recommendation">{t("recommendation")}</Label>
                  <Select value={recommendation} onValueChange={setRecommendation}>
                    <SelectTrigger data-testid="select-recommendation">
                      <SelectValue placeholder={t("selectRecommendation")} />
                    </SelectTrigger>
                    <SelectContent>
                      {RECOMMENDATIONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{t(r.labelKey)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">{t("evaluationNotes")}</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t("evaluationNotesPlaceholder")}
                    data-testid="textarea-notes"
                  />
                </div>

                <div className="flex items-center justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowForm(false)}
                    data-testid="button-cancel-evaluation"
                  >
                    {t("cancel")}
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={createEvaluationMutation.isPending}
                    data-testid="button-submit-evaluation"
                  >
                    {createEvaluationMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t("submitting")}
                      </>
                    ) : (
                      <>
                        <Star className="h-4 w-4 mr-2" />
                        {t("submitEvaluation")}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            <h2 className="text-xl font-semibold">{t("evaluationsTitle")}</h2>
            {isLoadingEvaluations ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : evaluations.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Star className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2" data-testid="text-no-evaluations">{t("noEvaluations")}</h3>
                  <p className="text-muted-foreground text-center">{t("noEvaluationsSubmitted")}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {evaluations.map((evaluation) => {
                  const evalTotal = evaluation.teamScore + evaluation.productScore + evaluation.marketScore +
                    evaluation.tractionScore + evaluation.strategicFitScore + evaluation.riskScore;
                  return (
                    <Card key={evaluation.id} className="hover-elevate" data-testid={`card-evaluation-${evaluation.id}`}>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                              {evaluation.evaluatorName && (
                                <span data-testid={`text-evaluator-${evaluation.id}`}>{evaluation.evaluatorName}</span>
                              )}
                              <Badge
                                variant="outline"
                                className={getRecommendationColor(evaluation.recommendation)}
                                data-testid={`badge-recommendation-${evaluation.id}`}
                              >
                                {getRecommendationLabel(evaluation.recommendation)}
                              </Badge>
                            </CardTitle>
                            <div className="flex items-center gap-2 flex-wrap">
                              {evaluation.companyName && (
                                <span className="text-sm text-muted-foreground" data-testid={`text-company-${evaluation.id}`}>
                                  {evaluation.companyName}
                                </span>
                              )}
                              {evaluation.createdAt && (
                                <span className="text-xs text-muted-foreground" data-testid={`text-date-${evaluation.id}`}>
                                  {new Date(evaluation.createdAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" data-testid={`badge-total-${evaluation.id}`}>
                              {evalTotal}/60
                            </Badge>
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => deleteEvaluationMutation.mutate(evaluation.id)}
                              disabled={deleteEvaluationMutation.isPending}
                              data-testid={`button-delete-evaluation-${evaluation.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                          {SCORE_FIELDS.map((field) => (
                            <div key={field.key} className="text-center space-y-1">
                              <p className="text-xs text-muted-foreground">{t(field.labelKey)}</p>
                              <p className="text-lg font-semibold" data-testid={`text-score-${field.key}-${evaluation.id}`}>
                                {(evaluation as Record<string, unknown>)[field.key] as number}
                              </p>
                            </div>
                          ))}
                        </div>
                        {evaluation.notes && (
                          <div className="pt-2 border-t">
                            <p className="text-sm text-muted-foreground" data-testid={`text-notes-${evaluation.id}`}>
                              {evaluation.notes}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {!selectedStartupId && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Star className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2" data-testid="text-select-startup">{t("selectStartupPrompt")}</h3>
            <p className="text-muted-foreground text-center">{t("selectStartupDescription")}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
