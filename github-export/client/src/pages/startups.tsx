import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, MapPin, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Input,
  Textarea,
  Select,
  Label,
  PageLoader,
} from "@/components/ui";
import { PageHeader } from "@/components/layout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { prettyLabel } from "@/lib/utils";
import { startupStages, type Startup } from "@shared/schema";

export default function Startups() {
  const { data, isLoading } = useQuery<Startup[]>({ queryKey: ["/api/startups"] });
  const [showForm, setShowForm] = useState(false);

  if (isLoading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Startups"
        description="The venture hub directory of early-stage companies."
        action={
          <Button onClick={() => setShowForm((v) => !v)} data-testid="button-new-startup">
            <Plus className="h-4 w-4" /> Add startup
          </Button>
        }
      />

      {showForm && <StartupForm onDone={() => setShowForm(false)} />}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(data ?? []).map((s) => (
          <Link key={s.id} href={`/startups/${s.id}`}>
            <a>
              <Card className="h-full hover:border-primary/50 transition" data-testid={`card-startup-${s.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent text-sm font-semibold text-accent-foreground">
                      {s.logo}
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="truncate text-base">{s.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{s.vertical}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="line-clamp-2 text-sm text-muted-foreground">{s.description}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">{prettyLabel(s.stage)}</Badge>
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {s.hqCity}</span>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {s.teamSize}</span>
                  </div>
                </CardContent>
              </Card>
            </a>
          </Link>
        ))}
      </div>
    </div>
  );
}

function StartupForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({
    name: "",
    vertical: "",
    stage: "idea",
    description: "",
    website: "",
    techStack: "",
    hqCity: "",
    teamSize: "1",
  });

  const mutation = useMutation({
    mutationFn: (body: typeof form) => apiRequest("/api/startups", { method: "POST", body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/startups"] });
      onDone();
    },
  });

  const set = (k: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => setForm({ ...form, [k]: e.target.value });

  return (
    <Card className="mb-6">
      <CardHeader><CardTitle>Add startup</CardTitle></CardHeader>
      <CardContent>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }}>
          <Field label="Name"><Input value={form.name} onChange={set("name")} required data-testid="input-startup-name" /></Field>
          <Field label="Vertical"><Input value={form.vertical} onChange={set("vertical")} required data-testid="input-vertical" /></Field>
          <Field label="Stage">
            <Select value={form.stage} onChange={set("stage")} data-testid="select-stage">
              {startupStages.map((s) => <option key={s} value={s}>{prettyLabel(s)}</option>)}
            </Select>
          </Field>
          <Field label="HQ city"><Input value={form.hqCity} onChange={set("hqCity")} data-testid="input-hq" /></Field>
          <Field label="Team size"><Input type="number" min={1} value={form.teamSize} onChange={set("teamSize")} data-testid="input-teamsize" /></Field>
          <Field label="Website"><Input value={form.website} onChange={set("website")} data-testid="input-website" /></Field>
          <div className="sm:col-span-2">
            <Field label="Tech stack"><Input value={form.techStack} onChange={set("techStack")} data-testid="input-techstack" /></Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Description"><Textarea value={form.description} onChange={set("description")} data-testid="input-startup-description" /></Field>
          </div>
          {mutation.isError && <p className="text-sm text-destructive sm:col-span-2">{(mutation.error as Error).message}</p>}
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={mutation.isPending} data-testid="button-save-startup">
              {mutation.isPending ? "Saving…" : "Add startup"}
            </Button>
            <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
