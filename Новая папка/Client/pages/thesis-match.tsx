import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Target } from "lucide-react";
import { VitalityScore } from "@/components/vitality-score";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiRequest } from "@/lib/queryClient";
import type { Startup } from "@shared/schema";
import { VerifiedMrrBadge } from "@/components/verified-mrr-badge";
import { FinancialMiniStats } from "@/components/financial-story-card";

type Match = {
  startupId: string;
  score: number;
  fit: string;
  startup: Startup | null;
};

export default function ThesisMatchPage() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const ru = language === "ru";
  const [thesis, setThesis] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);

  const matchMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/api/ai/thesis-match", {
        method: "POST",
        body: JSON.stringify({ thesis, language, topK: 10 }),
      });
      return res.json();
    },
    onSuccess: (data: { matches: Match[] }) => setMatches(data.matches),
    onError: (e: any) => toast({ title: t("error"), description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="text-thesis-match-title">
          <Target className="h-7 w-7" />
          {ru ? "Подбор стартапов под инвестиционный тезис" : "AI thesis matching"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {ru
            ? "Опишите ваш инвестиционный тезис — ИИ найдёт самые подходящие стартапы из платформы и оценит их fit."
            : "Describe your investment thesis. AI will rank the best-fitting startups on the platform with rationale."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{ru ? "Ваш тезис" : "Your thesis"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={thesis}
            onChange={(e) => setThesis(e.target.value)}
            rows={6}
            placeholder={
              ru
                ? "Например: Pre-seed и seed B2B SaaS, фокус на финтехе и регулируемых отраслях, выручка $0-500k ARR, чек $50-250k, география — Россия и СНГ..."
                : "e.g. Pre-seed / seed B2B SaaS, fintech & regulated industries, $0-500k ARR, $50-250k checks, Russia & CIS focus..."
            }
            data-testid="input-thesis"
          />
          <div className="flex justify-end">
            <Button
              onClick={() => matchMutation.mutate()}
              disabled={thesis.trim().length < 10 || matchMutation.isPending}
              data-testid="button-thesis-match"
            >
              {matchMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
              {ru ? "Найти стартапы" : "Find startups"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {matches.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">{ru ? "Топ-совпадения" : "Top matches"}</h2>
          {matches.map((m, i) => (
            <Card key={m.startupId} data-testid={`card-match-${m.startupId}`}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-muted-foreground">#{i + 1}</span>
                      <span className="font-semibold text-lg">{m.startup?.name || m.startupId}</span>
                      <VerifiedMrrBadge startupId={m.startupId} />
                      {m.startup?.vertical && <Badge variant="secondary">{m.startup.vertical}</Badge>}
                      {m.startup?.stage && <Badge variant="outline">{m.startup.stage}</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2" data-testid={`text-match-fit-${m.startupId}`}>{m.fit}</p>
                    <div className="mt-2">
                      <FinancialMiniStats startupId={m.startupId} />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {m.startup && <VitalityScore startupId={m.startup.id} size="sm" />}
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary" data-testid={`text-match-score-${m.startupId}`}>{m.score}</div>
                      <div className="text-xs text-muted-foreground">/100</div>
                    </div>
                    {m.startup && (
                      <Link href={`/startups/${m.startup.id}`}>
                        <Button size="sm" variant="outline" data-testid={`button-open-${m.startupId}`}>{ru ? "Открыть" : "Open"}</Button>
                      </Link>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
