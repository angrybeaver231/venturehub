import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Trash2, Undo2, ListChecks, ExternalLink } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Milestone } from "@shared/schema";

type Row = Milestone & { startup: { id: string; name: string } | null };
type Status = "pending_review" | "approved" | "rejected";

export default function AdminMilestonesReviewPage() {
  const { language } = useLanguage();
  const ru = language === "ru";
  const { toast } = useToast();
  const [status, setStatus] = useState<Status>("pending_review");

  const { data: rows = [], isLoading } = useQuery<Row[]>({
    queryKey: ["/api/admin/milestones/review", status],
    queryFn: async () => {
      const res = await fetch(`/api/admin/milestones/review?status=${status}`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  const setReview = useMutation({
    mutationFn: async (vars: { id: string; next: Status }) => {
      const res = await apiRequest(`/api/admin/milestones/${vars.id}/review`, {
        method: "POST",
        body: JSON.stringify({ status: vars.next }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/milestones/review"] });
      toast({ title: ru ? "Обновлено" : "Updated" });
    },
    onError: (e: any) => toast({ title: ru ? "Ошибка" : "Error", description: e.message, variant: "destructive" }),
  });

  const removeMs = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/api/admin/milestones/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/milestones/review"] });
      toast({ title: ru ? "Удалено" : "Deleted" });
    },
    onError: (e: any) => toast({ title: ru ? "Ошибка" : "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6 p-4" data-testid="page-admin-milestones-review">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="text-milestones-review-title">
          <ListChecks className="h-7 w-7" />
          {ru ? "Очередь проверки вех" : "Milestone review queue"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {ru
            ? "ИИ извлекает вехи из сигнальных событий. Высокая уверенность утверждается автоматически; всё остальное ждёт ручной проверки здесь."
            : "AI extracts milestones from signal events. High-confidence ones auto-approve; everything else waits for human review here."}
        </p>
      </div>

      <Tabs value={status} onValueChange={(v) => setStatus(v as Status)}>
        <TabsList>
          <TabsTrigger value="pending_review" data-testid="tab-pending">{ru ? "Ожидают" : "Pending"}</TabsTrigger>
          <TabsTrigger value="approved" data-testid="tab-approved">{ru ? "Одобрены" : "Approved"}</TabsTrigger>
          <TabsTrigger value="rejected" data-testid="tab-rejected">{ru ? "Отклонены" : "Rejected"}</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            {ru ? "Нет вех в этом статусе." : "No milestones in this status."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((m) => (
            <Card key={m.id} data-testid={`card-milestone-${m.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{m.kind}</Badge>
                      <span data-testid={`text-milestone-title-${m.id}`}>{m.title}</span>
                      {typeof m.confidence === "number" && (
                        <Badge variant="secondary" className="text-[10px]" data-testid={`badge-confidence-${m.id}`}>
                          {m.confidence}% {ru ? "уверенности" : "confidence"}
                        </Badge>
                      )}
                    </CardTitle>
                    <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-2">
                      {m.startup && (
                        <Link href={`/startups/${m.startup.id}`}>
                          <a className="inline-flex items-center gap-1 hover-elevate rounded-sm px-1" data-testid={`link-startup-${m.id}`}>
                            {m.startup.name} <ExternalLink className="h-3 w-3" />
                          </a>
                        </Link>
                      )}
                      {m.occurredAt && (
                        <span data-testid={`text-occurred-${m.id}`}>
                          {ru ? "Произошло" : "Occurred"}: {new Date(m.occurredAt as any).toISOString().slice(0, 10)}
                        </span>
                      )}
                      {m.llmModel && <span>· {m.llmModel}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {status !== "approved" && (
                      <Button
                        size="sm"
                        onClick={() => setReview.mutate({ id: m.id, next: "approved" })}
                        disabled={setReview.isPending}
                        data-testid={`button-approve-${m.id}`}
                      >
                        <Check className="h-3.5 w-3.5 mr-1.5" />
                        {ru ? "Одобрить" : "Approve"}
                      </Button>
                    )}
                    {status !== "rejected" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setReview.mutate({ id: m.id, next: "rejected" })}
                        disabled={setReview.isPending}
                        data-testid={`button-reject-${m.id}`}
                      >
                        {ru ? "Отклонить" : "Reject"}
                      </Button>
                    )}
                    {status !== "pending_review" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setReview.mutate({ id: m.id, next: "pending_review" })}
                        disabled={setReview.isPending}
                        data-testid={`button-reopen-${m.id}`}
                      >
                        <Undo2 className="h-3.5 w-3.5 mr-1.5" />
                        {ru ? "Вернуть" : "Reopen"}
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(ru ? "Удалить веху безвозвратно?" : "Permanently delete this milestone?")) {
                          removeMs.mutate(m.id);
                        }
                      }}
                      disabled={removeMs.isPending}
                      data-testid={`button-delete-${m.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {m.description && (
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground" data-testid={`text-description-${m.id}`}>{m.description}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
