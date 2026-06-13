import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { Loader2, Sparkles, ExternalLink, ShieldCheck } from "lucide-react";
import { useState } from "react";
import type { Milestone, SignalEvent } from "@shared/schema";

interface DiffPayload {
  since: string;
  days: number;
  newMilestones: Milestone[];
  topEvents: SignalEvent[];
  eventsTotal: number;
  countsBySeverity: Record<string, number>;
  execSummary?: string | null;
}

const SEVERITY_CLASSES: Record<string, string> = {
  info: "bg-muted text-muted-foreground",
  positive: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  critical: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

interface Props {
  startupId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultDays?: number;
}

export function DiffSinceModal({ startupId, open, onOpenChange, defaultDays = 30 }: Props) {
  const { language } = useLanguage();
  const ru = language === "ru";
  const [days, setDays] = useState(defaultDays);

  const { data, isLoading } = useQuery<DiffPayload>({
    queryKey: ["/api/startups", startupId, "diff", days, language],
    queryFn: async () => {
      const res = await fetch(`/api/startups/${startupId}/diff?days=${days}&lang=${language}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch diff");
      return res.json();
    },
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="dialog-diff">
        <DialogHeader>
          <DialogTitle>{ru ? "Что изменилось" : "What changed"}</DialogTitle>
          <DialogDescription>
            {ru
              ? "Сводка по новым вехам и наиболее значимым событиям за выбранный период."
              : "New milestones and the highest-signal events from the selected window."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{ru ? "Период:" : "Window:"}</span>
          <Select value={String(days)} onValueChange={(v) => setDays(parseInt(v, 10))}>
            <SelectTrigger className="w-auto min-w-[140px]" data-testid="select-diff-days">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[7, 14, 30, 60, 90].map((d) => (
                <SelectItem key={d} value={String(d)}>
                  {ru ? `${d} дн.` : `${d} days`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading || !data ? (
          <div className="flex items-center gap-2 text-muted-foreground py-6">
            <Loader2 className="h-4 w-4 animate-spin" />
            {ru ? "Загрузка…" : "Loading…"}
          </div>
        ) : (
          <div className="space-y-6">
            {data.execSummary && (
              <div
                className="rounded-md border border-primary/30 bg-primary/5 p-3"
                data-testid="text-diff-exec-summary"
              >
                <div className="flex items-center gap-2 mb-1 text-xs font-semibold text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  {ru ? "Краткая сводка для инвестора" : "Investor-grade summary"}
                </div>
                <p className="text-sm leading-relaxed">{data.execSummary}</p>
              </div>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" data-testid="badge-diff-events-total">
                {ru ? "Событий: " : "Events: "}{data.eventsTotal}
              </Badge>
              <Badge variant="outline" data-testid="badge-diff-milestones-total">
                {ru ? "Новых вех: " : "New milestones: "}{data.newMilestones.length}
              </Badge>
              {Object.entries(data.countsBySeverity).map(([sev, n]) => (
                <Badge key={sev} className={`text-xs ${SEVERITY_CLASSES[sev] ?? SEVERITY_CLASSES.info}`}>
                  {sev}: {n}
                </Badge>
              ))}
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                {ru ? "Новые вехи" : "New milestones"}
              </h3>
              {data.newMilestones.length === 0 ? (
                <p className="text-sm text-muted-foreground" data-testid="text-diff-no-milestones">
                  {ru ? "Новых вех нет." : "No new milestones."}
                </p>
              ) : (
                <div className="space-y-2">
                  {data.newMilestones.map((m) => (
                    <div key={m.id} className="p-3 border rounded-md" data-testid={`diff-milestone-${m.id}`}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">{m.kind}</Badge>
                        <Badge variant="outline" className="text-xs">{m.confidence}%</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(m.occurredAt).toLocaleDateString(ru ? "ru-RU" : "en-US")}
                        </span>
                      </div>
                      <div className="font-medium text-sm mt-1">{m.title}</div>
                      {m.description && <p className="text-sm text-muted-foreground mt-1">{m.description}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2">
                {ru ? "Главные события" : "Top events"}
              </h3>
              {data.topEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground" data-testid="text-diff-no-events">
                  {ru ? "Событий нет." : "No events."}
                </p>
              ) : (
                <div className="space-y-2">
                  {data.topEvents.map((e) => {
                    const verified = (e.verifiedBy ?? []).filter(Boolean);
                    return (
                      <div key={e.id} className="p-3 border rounded-md" data-testid={`diff-event-${e.id}`}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`text-xs ${SEVERITY_CLASSES[e.severity] ?? SEVERITY_CLASSES.info}`}>
                            {e.severity}
                          </Badge>
                          <Badge variant="outline" className="text-xs">{e.sourceKey}</Badge>
                          <Badge variant="outline" className="text-xs">{e.eventType}</Badge>
                          {verified.length >= 2 && (
                            <Badge className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                              <ShieldCheck className="h-3 w-3 mr-1" />
                              {verified.length}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {new Date(e.occurredAt).toLocaleDateString(ru ? "ru-RU" : "en-US")}
                          </span>
                        </div>
                        {e.title && <div className="font-medium text-sm mt-1">{e.title}</div>}
                        {e.summary && <p className="text-sm text-muted-foreground mt-1">{e.summary}</p>}
                        {e.url && (
                          <a
                            href={e.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {ru ? "Источник" : "Source"}
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
