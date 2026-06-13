import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, MapPin } from "lucide-react";
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
import { prettyLabel, formatMoney } from "@/lib/utils";
import { investorKinds, type Investor } from "@shared/schema";

export default function Investors() {
  const { data, isLoading } = useQuery<Investor[]>({ queryKey: ["/api/investors"] });
  const [showForm, setShowForm] = useState(false);

  if (isLoading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Investors"
        description="Funds and angels active in the venture hub."
        action={
          <Button onClick={() => setShowForm((v) => !v)} data-testid="button-new-investor">
            <Plus className="h-4 w-4" /> Add investor
          </Button>
        }
      />

      {showForm && <InvestorForm onDone={() => setShowForm(false)} />}

      <div className="grid gap-4 md:grid-cols-2">
        {(data ?? []).map((inv) => (
          <Link key={inv.id} href={`/investors/${inv.id}`}>
            <a>
              <Card className="h-full hover:border-primary/50 transition" data-testid={`card-investor-${inv.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{inv.name}</CardTitle>
                    <Badge variant="outline">{prettyLabel(inv.kind)}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="line-clamp-2 text-sm text-muted-foreground">{inv.thesis}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {inv.hqCity}</span>
                    <Badge variant="secondary">
                      {formatMoney(inv.checkSizeMin)}–{formatMoney(inv.checkSizeMax)}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {inv.verticals.slice(0, 3).map((v) => (
                      <Badge key={v} variant="secondary">{v}</Badge>
                    ))}
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

function InvestorForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({
    name: "",
    kind: "vc_fund",
    thesis: "",
    description: "",
    hqCity: "",
    checkSizeMin: "0",
    checkSizeMax: "0",
    verticals: "",
  });

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/investors", {
        method: "POST",
        body: {
          ...form,
          verticals: form.verticals.split(",").map((v) => v.trim()).filter(Boolean),
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investors"] });
      onDone();
    },
  });

  const set = (k: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => setForm({ ...form, [k]: e.target.value });

  return (
    <Card className="mb-6">
      <CardHeader><CardTitle>Add investor</CardTitle></CardHeader>
      <CardContent>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}>
          <Field label="Name"><Input value={form.name} onChange={set("name")} required data-testid="input-investor-name" /></Field>
          <Field label="Kind">
            <Select value={form.kind} onChange={set("kind")} data-testid="select-kind">
              {investorKinds.map((k) => <option key={k} value={k}>{prettyLabel(k)}</option>)}
            </Select>
          </Field>
          <Field label="HQ city"><Input value={form.hqCity} onChange={set("hqCity")} data-testid="input-investor-hq" /></Field>
          <Field label="Verticals (comma separated)"><Input value={form.verticals} onChange={set("verticals")} data-testid="input-verticals" /></Field>
          <Field label="Min check (USD)"><Input type="number" min={0} value={form.checkSizeMin} onChange={set("checkSizeMin")} data-testid="input-check-min" /></Field>
          <Field label="Max check (USD)"><Input type="number" min={0} value={form.checkSizeMax} onChange={set("checkSizeMax")} data-testid="input-check-max" /></Field>
          <div className="sm:col-span-2">
            <Field label="Thesis"><Textarea value={form.thesis} onChange={set("thesis")} data-testid="input-thesis" /></Field>
          </div>
          {mutation.isError && <p className="text-sm text-destructive sm:col-span-2">{(mutation.error as Error).message}</p>}
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={mutation.isPending} data-testid="button-save-investor">
              {mutation.isPending ? "Saving…" : "Add investor"}
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
