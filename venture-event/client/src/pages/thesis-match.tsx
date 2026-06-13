import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  Badge,
  Select,
  Label,
  PageLoader,
} from "@/components/ui";
import { PageHeader } from "@/components/layout";
import { prettyLabel } from "@/lib/utils";
import type { Investor, ThesisMatch } from "@shared/schema";

export default function ThesisMatchPage() {
  const investors = useQuery<Investor[]>({ queryKey: ["/api/investors"] });
  const [selectedId, setSelectedId] = useState<string>("");

  const activeId = selectedId || investors.data?.[0]?.id || "";
  const matches = useQuery<ThesisMatch[]>({
    queryKey: ["/api/investors", activeId, "matches"],
    enabled: !!activeId,
  });

  const active = investors.data?.find((i) => i.id === activeId);

  if (investors.isLoading) return <PageLoader />;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Thesis Match"
        description="Pick an investor to see which startups best fit their thesis. Scores are computed offline from vertical, stage, geography, and keyword overlap."
      />

      <div className="mb-6 max-w-sm space-y-1.5">
        <Label>Investor</Label>
        <Select
          value={activeId}
          onChange={(e) => setSelectedId(e.target.value)}
          data-testid="select-investor"
        >
          {(investors.data ?? []).map((i) => (
            <option key={i.id} value={i.id}>{i.name}</option>
          ))}
        </Select>
      </div>

      {active && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <p className="text-sm leading-relaxed text-muted-foreground">{active.thesis}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {active.stageFocus.map((s) => <Badge key={s} variant="secondary">{prettyLabel(s)}</Badge>)}
              {active.verticals.map((v) => <Badge key={v} variant="outline">{v}</Badge>)}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Ranked matches</h2>
      </div>

      {matches.isLoading ? (
        <PageLoader />
      ) : (
        <div className="space-y-3">
          {(matches.data ?? []).map((m) => (
            <Card key={m.startup.id} data-testid={`row-match-${m.startup.id}`}>
              <CardContent className="flex flex-wrap items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-sm font-semibold text-accent-foreground">
                  {m.startup.logo}
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`/startups/${m.startup.id}`}>
                    <a className="font-medium hover:text-primary">{m.startup.name}</a>
                  </Link>
                  <p className="text-xs text-muted-foreground">{m.startup.vertical} · {prettyLabel(m.startup.stage)}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{m.rationale}</p>
                </div>
                <Badge
                  variant={m.score >= 70 ? "default" : m.score >= 40 ? "secondary" : "outline"}
                  data-testid="badge-score"
                >
                  {m.score}% fit
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
