import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { ArrowLeft, MapPin, Users, Globe, Code } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  PageLoader,
} from "@/components/ui";
import { prettyLabel } from "@/lib/utils";
import type { Startup } from "@shared/schema";

export default function StartupDetail() {
  const [, params] = useRoute("/startups/:id");
  const id = params?.id;
  const { data, isLoading } = useQuery<Startup>({
    queryKey: ["/api/startups", id],
    enabled: !!id,
  });

  if (isLoading) return <PageLoader />;
  if (!data) return <p className="text-muted-foreground">Startup not found.</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/startups">
        <a className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground" data-testid="link-back">
          <ArrowLeft className="h-4 w-4" /> Back to startups
        </a>
      </Link>

      <div className="mb-5 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-md bg-accent text-lg font-semibold text-accent-foreground">
          {data.logo}
        </div>
        <div>
          <h1 className="text-2xl font-semibold">{data.name}</h1>
          <p className="text-sm text-muted-foreground">{data.vertical}</p>
        </div>
        <Badge variant="outline" className="ml-auto">{prettyLabel(data.stage)}</Badge>
      </div>

      <p className="mb-6 leading-relaxed">{data.description}</p>

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <Fact icon={MapPin} label="HQ" value={data.hqCity} />
        <Fact icon={Users} label="Team size" value={String(data.teamSize)} />
        <Fact icon={Code} label="Tech stack" value={data.techStack} />
        <Fact icon={Globe} label="Website" value={data.website} link />
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle>Team</CardTitle></CardHeader>
        <CardContent>
          {data.members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No team members listed.</p>
          ) : (
            <ul className="space-y-2">
              {data.members.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2" data-testid={`row-member-${m.id}`}>
                  <span className="text-sm font-medium">{m.name}</span>
                  <span className="text-sm text-muted-foreground">{m.title} · {prettyLabel(m.role)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
  link,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  link?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border p-3">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        {link && value ? (
          <a href={value} target="_blank" rel="noreferrer" className="truncate text-sm text-primary">{value}</a>
        ) : (
          <p className="truncate text-sm">{value || "—"}</p>
        )}
      </div>
    </div>
  );
}
