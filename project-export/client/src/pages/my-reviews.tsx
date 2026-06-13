import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ClipboardList, CheckCircle, Clock, Play, Loader2, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageSEO } from "@/hooks/usePageSEO";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import type { ReviewerAssignmentWithDetails, ManualReviewFlag } from "@shared/schema";
import { AlertTriangle } from "lucide-react";

type EvalForm = {
  teamScore: string;
  productScore: string;
  marketScore: string;
  tractionScore: string;
  strategicFitScore: string;
  riskScore: string;
  comments: string;
};

const EMPTY_FORM: EvalForm = { teamScore: "", productScore: "", marketScore: "", tractionScore: "", strategicFitScore: "", riskScore: "", comments: "" };

export default function MyReviews() {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const { t, language } = useLanguage();
  const ru = language === "ru";
  const [activeTab, setActiveTab] = useState<string>("all");
  const [evalForms, setEvalForms] = useState<Record<string, EvalForm>>({});
  const [openForm, setOpenForm] = useState<string | null>(null);

  usePageSEO({
    title: t("myReviews"),
    description: t("myReviewsSubtitle"),
    keywords: "reviews, assignments, reviewer",
  });

  const { data: assignments = [], isLoading } = useQuery<ReviewerAssignmentWithDetails[]>({
    queryKey: ["/api/my-reviews"],
    enabled: isAuthenticated,
  });

  const { data: flags = [] } = useQuery<ManualReviewFlag[]>({
    queryKey: ["/api/manual-review-flags"],
    enabled: isAuthenticated,
  });

  const resolveFlagMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest(`/api/manual-review-flags/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "resolved" }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/manual-review-flags"] });
      toast({ title: ru ? "Отмечено как решённое" : "Marked resolved" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest(`/api/reviewer-assignments/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-reviews"] });
      toast({ title: t("success") });
    },
    onError: () => {
      toast({ title: t("error"), description: "Failed to update status", variant: "destructive" });
    },
  });

  const submitEvalMutation = useMutation({
    mutationFn: async ({ assignment, form }: { assignment: ReviewerAssignmentWithDetails; form: EvalForm }) => {
      const evalRes = await apiRequest("/api/evaluations", {
        method: "POST",
        body: JSON.stringify({
          entityType: assignment.entityType,
          entityId: assignment.entityId,
          teamScore: form.teamScore ? Number(form.teamScore) : undefined,
          productScore: form.productScore ? Number(form.productScore) : undefined,
          marketScore: form.marketScore ? Number(form.marketScore) : undefined,
          tractionScore: form.tractionScore ? Number(form.tractionScore) : undefined,
          strategicFitScore: form.strategicFitScore ? Number(form.strategicFitScore) : undefined,
          riskScore: form.riskScore ? Number(form.riskScore) : undefined,
          comments: form.comments || undefined,
        }),
      });
      await evalRes.json();
      const stRes = await apiRequest(`/api/reviewer-assignments/${assignment.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "done" }),
      });
      return stRes.json();
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-reviews"] });
      setOpenForm(null);
      setEvalForms((prev) => ({ ...prev, [vars.assignment.id]: EMPTY_FORM }));
      toast({ title: t("success"), description: ru ? "Оценка сохранена" : "Evaluation saved" });
    },
    onError: (e: any) => {
      toast({ title: t("error"), description: e.message, variant: "destructive" });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "assigned": return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      case "inReview": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "done": return "bg-green-500/10 text-green-600 border-green-500/20";
      default: return "";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "assigned": return t("statusAssigned");
      case "inReview": return t("statusInReview");
      case "done": return t("statusDone");
      default: return status;
    }
  };

  const getEntityTypeLabel = (entityType: string) => {
    switch (entityType) {
      case "briefApplication": return ru ? "Заявка на бриф" : "Brief Application";
      case "startup": return ru ? "Стартап" : "Startup";
      case "programParticipant": return ru ? "Участник программы" : "Program Participant";
      default: return entityType;
    }
  };

  const filteredAssignments = assignments.filter((a) => {
    if (activeTab === "all") return true;
    return a.status === activeTab;
  });

  const completedCount = assignments.filter((a) => a.status === "done").length;

  const setForm = (id: string, patch: Partial<EvalForm>) =>
    setEvalForms((prev) => ({ ...prev, [id]: { ...(prev[id] || EMPTY_FORM), ...patch } }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const SCORE_FIELDS: Array<{ key: keyof EvalForm; label: string }> = [
    { key: "teamScore", label: ru ? "Команда" : "Team" },
    { key: "productScore", label: ru ? "Продукт" : "Product" },
    { key: "marketScore", label: ru ? "Рынок" : "Market" },
    { key: "tractionScore", label: ru ? "Тракшн" : "Traction" },
    { key: "strategicFitScore", label: ru ? "Стратегич. fit" : "Strategic fit" },
    { key: "riskScore", label: ru ? "Риск (10 = низкий)" : "Risk (10 = low)" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="text-my-reviews-title">
            <ClipboardList className="h-8 w-8" />
            {t("myReviews")}
          </h1>
          <p className="text-muted-foreground mt-1" data-testid="text-my-reviews-subtitle">
            {t("myReviewsSubtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" data-testid="badge-review-progress">
            <CheckCircle className="h-3 w-3 mr-1" />
            {t("reviewProgress")}: {completedCount}/{assignments.length} {t("reviewsCompleted")}
          </Badge>
        </div>
      </div>

      {flags.length > 0 && (
        <Card className="border-amber-500/50" data-testid="card-manual-flags">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              {ru ? "Флаги ручной проверки" : "Manual review flags"}
              <Badge variant="secondary" className="text-[10px]">{flags.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {flags.map((f) => (
                <li key={f.id} className="py-3 flex items-start justify-between gap-3" data-testid={`row-flag-${f.id}`}>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium" data-testid={`text-flag-reason-${f.id}`}>{f.reason}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      <Badge variant="outline" className="text-[10px] mr-1">{f.entityType}</Badge>
                      <span className="font-mono">{f.entityId.slice(0, 8)}</span>
                      {f.severity && <Badge variant="secondary" className="text-[10px] ml-1">{f.severity}</Badge>}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => resolveFlagMutation.mutate(f.id)}
                    disabled={resolveFlagMutation.isPending}
                    data-testid={`button-resolve-flag-${f.id}`}
                  >
                    {ru ? "Решено" : "Resolve"}
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-review-filter">
          <TabsTrigger value="all" data-testid="tab-all">All ({assignments.length})</TabsTrigger>
          <TabsTrigger value="assigned" data-testid="tab-assigned">{t("statusAssigned")} ({assignments.filter((a) => a.status === "assigned").length})</TabsTrigger>
          <TabsTrigger value="inReview" data-testid="tab-in-review">{t("statusInReview")} ({assignments.filter((a) => a.status === "inReview").length})</TabsTrigger>
          <TabsTrigger value="done" data-testid="tab-done">{t("statusDone")} ({assignments.filter((a) => a.status === "done").length})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredAssignments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-lg" data-testid="text-no-reviews">
                  {t("noReviewsAssigned")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredAssignments.map((assignment) => {
                const form = evalForms[assignment.id] || EMPTY_FORM;
                const formOpen = openForm === assignment.id;
                return (
                  <Card key={assignment.id} data-testid={`card-assignment-${assignment.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-lg" data-testid={`text-entity-name-${assignment.id}`}>
                            {assignment.entityName || "Untitled"}
                          </CardTitle>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <Badge variant="secondary">{getEntityTypeLabel(assignment.entityType)}</Badge>
                            {assignment.dueDate && (
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {new Date(assignment.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className={`shrink-0 ${getStatusColor(assignment.status)}`} data-testid={`badge-status-${assignment.id}`}>
                          {getStatusLabel(assignment.status)}
                        </Badge>
                      </div>
                    </CardHeader>
                    {formOpen && assignment.status === "inReview" && (
                      <CardContent className="space-y-3 border-t pt-4" data-testid={`form-eval-${assignment.id}`}>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {SCORE_FIELDS.map((f) => (
                            <div key={f.key}>
                              <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
                              <Input
                                type="number"
                                min={0}
                                max={10}
                                value={form[f.key] as string}
                                onChange={(e) => setForm(assignment.id, { [f.key]: e.target.value } as Partial<EvalForm>)}
                                placeholder="0-10"
                                data-testid={`input-${f.key}-${assignment.id}`}
                              />
                            </div>
                          ))}
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">{ru ? "Комментарий" : "Comments"}</label>
                          <Textarea
                            value={form.comments}
                            onChange={(e) => setForm(assignment.id, { comments: e.target.value })}
                            rows={3}
                            placeholder={ru ? "Сильные стороны, риски, рекомендации..." : "Strengths, risks, recommendation..."}
                            data-testid={`input-comments-${assignment.id}`}
                          />
                        </div>
                      </CardContent>
                    )}
                    <CardFooter className="flex items-center justify-end gap-2">
                      {assignment.status === "assigned" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatusMutation.mutate({ id: assignment.id, status: "inReview" })}
                          disabled={updateStatusMutation.isPending}
                          data-testid={`button-start-review-${assignment.id}`}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          {t("markAsInReview")}
                        </Button>
                      )}
                      {assignment.status === "inReview" && !formOpen && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => setOpenForm(assignment.id)} data-testid={`button-open-eval-${assignment.id}`}>
                            <Star className="h-4 w-4 mr-1" />
                            {ru ? "Заполнить оценку" : "Fill evaluation"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => updateStatusMutation.mutate({ id: assignment.id, status: "done" })}
                            disabled={updateStatusMutation.isPending}
                            data-testid={`button-mark-done-only-${assignment.id}`}
                          >
                            {ru ? "Без оценки" : "Skip eval"}
                          </Button>
                        </>
                      )}
                      {assignment.status === "inReview" && formOpen && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => setOpenForm(null)} data-testid={`button-close-eval-${assignment.id}`}>
                            {t("cancel")}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => submitEvalMutation.mutate({ assignment, form })}
                            disabled={submitEvalMutation.isPending}
                            data-testid={`button-submit-eval-${assignment.id}`}
                          >
                            {submitEvalMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                            {ru ? "Сохранить и завершить" : "Save & complete"}
                          </Button>
                        </>
                      )}
                      {assignment.status === "done" && (
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {t("statusDone")}
                        </Badge>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
