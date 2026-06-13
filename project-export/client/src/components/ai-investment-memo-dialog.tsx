import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, AlertTriangle, CheckCircle2, TrendingUp, Users, Target, ListChecks } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiRequest } from "@/lib/queryClient";

interface Memo {
  oneLiner: string;
  thesis: string;
  strengths: string[];
  redFlags: string[];
  market: string;
  traction: string;
  team: string;
  suggestedNextSteps: string[];
  recommendation: string;
  confidence: number;
}

const RECO_COLORS: Record<string, string> = {
  strongInterest: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  interested: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  watchlist: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
  pass: "bg-red-500/15 text-red-600 border-red-500/30",
};

export function AIInvestmentMemoDialog({ startupId, open, onOpenChange }: { startupId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const ru = language === "ru";
  const [memo, setMemo] = useState<Memo | null>(null);

  const RECO_LABELS_EN: Record<string, string> = {
    strongInterest: "Strong interest",
    interested: "Interested",
    watchlist: "Watchlist",
    pass: "Pass",
  };
  const RECO_LABELS_RU: Record<string, string> = {
    strongInterest: "Сильный интерес",
    interested: "Интересно",
    watchlist: "Наблюдать",
    pass: "Пропуск",
  };
  const RECO_LABELS = ru ? RECO_LABELS_RU : RECO_LABELS_EN;

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(`/api/ai/startup-memo/${startupId}`, {
        method: "POST",
        body: JSON.stringify({ language }),
      });
      return res.json();
    },
    onSuccess: (data: Memo) => setMemo(data),
    onError: (e: any) => toast({ title: t("error"), description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {ru ? "ИИ инвестиционная заметка" : "AI investment memo"}
          </DialogTitle>
        </DialogHeader>

        {!memo && !generateMutation.isPending && (
          <div className="text-center py-8 space-y-4">
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {ru
                ? "ИИ проанализирует профиль стартапа, метрики, готовность и оценки рецензентов, чтобы сгенерировать структурированную инвестиционную заметку."
                : "AI will analyze startup profile, metrics, readiness and reviewer evaluations to produce a structured investment memo."}
            </p>
            <Button onClick={() => generateMutation.mutate()} data-testid="button-generate-memo">
              <Sparkles className="h-4 w-4 mr-1" />
              {ru ? "Сгенерировать заметку" : "Generate memo"}
            </Button>
          </div>
        )}

        {generateMutation.isPending && (
          <div className="flex flex-col items-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{ru ? "ИИ пишет заметку..." : "AI is drafting the memo..."}</p>
          </div>
        )}

        {memo && (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <Badge variant="outline" className={RECO_COLORS[memo.recommendation] || ""} data-testid="badge-recommendation">
                {RECO_LABELS[memo.recommendation] || memo.recommendation}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {ru ? "Уверенность" : "Confidence"}: {(memo.confidence * 100).toFixed(0)}%
              </span>
              <Button size="sm" variant="outline" onClick={() => generateMutation.mutate()} data-testid="button-regenerate-memo">
                <Sparkles className="h-3 w-3 mr-1" />
                {ru ? "Перегенерировать" : "Regenerate"}
              </Button>
            </div>

            <div className="rounded-md border p-3 bg-muted/30">
              <p className="font-medium" data-testid="text-memo-oneliner">{memo.oneLiner}</p>
            </div>

            <Section icon={Target} title={ru ? "Тезис" : "Thesis"}>
              <p className="text-sm" data-testid="text-memo-thesis">{memo.thesis}</p>
            </Section>

            <div className="grid sm:grid-cols-2 gap-4">
              <Section icon={CheckCircle2} title={ru ? "Сильные стороны" : "Strengths"}>
                <ul className="space-y-1 text-sm">
                  {memo.strengths.map((s, i) => <li key={i} className="flex gap-2"><span className="text-emerald-600">+</span>{s}</li>)}
                </ul>
              </Section>
              <Section icon={AlertTriangle} title={ru ? "Красные флаги" : "Red flags"}>
                <ul className="space-y-1 text-sm">
                  {memo.redFlags.map((s, i) => <li key={i} className="flex gap-2"><span className="text-red-600">!</span>{s}</li>)}
                </ul>
              </Section>
            </div>

            <Section icon={TrendingUp} title={ru ? "Рынок" : "Market"}><p className="text-sm">{memo.market}</p></Section>
            <Section icon={TrendingUp} title={ru ? "Тракшн" : "Traction"}><p className="text-sm">{memo.traction}</p></Section>
            <Section icon={Users} title={ru ? "Команда" : "Team"}><p className="text-sm">{memo.team}</p></Section>

            <Section icon={ListChecks} title={ru ? "Следующие шаги" : "Next steps"}>
              <ol className="space-y-1 text-sm list-decimal list-inside">
                {memo.suggestedNextSteps.map((s, i) => <li key={i}>{s}</li>)}
              </ol>
            </Section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {title}
      </h4>
      {children}
    </div>
  );
}
