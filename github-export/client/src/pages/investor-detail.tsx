import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { ArrowLeft, MapPin, Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  PageLoader,
} from "@/components/ui";
import { prettyLabel, formatMoney } from "@/lib/utils";
import type { Investor, ThesisMatch } from "@shared/schema";

export default function InvestorDetail() {
  const [, params] = useRoute("/investors/:id");
  const id = params?.id;

  const investor = useQuery<Investor>({
    queryKey: ["/api/investors", id],
    enabled: !!id,
  });
  const matches = useQuery<ThesisMatch[]>({
    queryKey: ["/api/investors", id, "matches"],
    enabled: !!id,
  });

  if (investor.isLoading) return <PageLoader />;
  if (!investor.data) return <p className="text-muted-foreground">Investor not found.</p>;
  const inv = investor.data;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/investors">
        <a className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground" data-testid="link-back">
          <ArrowLeft className="h-4 w-4" /> Back to investors
        </a>
      </Link>

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold">{inv.name}</h1>
        <Badge variant="outline">{prettyLabel(inv.kind)}</Badge>
      </div>
      <p className="mb-5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {inv.hqCity}</span>
        <span>Cheque {formatMoney(inv.checkSizeMin)}–{formatMoney(inv.checkSizeMax)}</span>
      </p>

      <Card className="mb-6">
        <CardHeader className="pb-2"><CardTitle className="text-base">Investment thesis</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{inv.thesis}</p>
          <div className="mt-3 flex flex-wrap gap-1">
            {inv.stageFocus.map((s) => <Badge key={s} variant="secondary">{prettyLabel(s)}</Badge>)}
            {inv.verticals.map((v) => <Badge key={v} variant="outline">{v}</Badge>)}
          </div>
        </CardContent>
      </Card>

      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Matched startups</h2>
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
                  <p className="text-xs text-muted-foreground">{m.rationale}</p>
                </div>
                <ScorePill score={m.score} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ScorePill({ score }: { score: number }) {
  const variant = score >= 70 ? "default" : score >= 40 ? "secondary" : "outline";
  return (
    <Badge variant={variant} data-testid="badge-score">
      {score}% fit
    </Badge>
  );
}
