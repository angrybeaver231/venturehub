import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, MapPin, Clock } from "lucide-react";
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
import { formatDate, prettyLabel } from "@/lib/utils";
import { eventTypes, type Event } from "@shared/schema";

export default function Events() {
  const { data, isLoading } = useQuery<Event[]>({ queryKey: ["/api/events"] });
  const [showForm, setShowForm] = useState(false);

  if (isLoading) return <PageLoader />;

  const upcoming = (data ?? []).filter((e) => e.status === "upcoming");
  const past = (data ?? []).filter((e) => e.status === "past");

  return (
    <div>
      <PageHeader
        title="Events"
        description="Create and manage events, then track who is coming."
        action={
          <Button onClick={() => setShowForm((v) => !v)} data-testid="button-new-event">
            <Plus className="h-4 w-4" /> New event
          </Button>
        }
      />

      {showForm && <EventForm onDone={() => setShowForm(false)} />}

      <Section title="Upcoming" events={upcoming} />
      {past.length > 0 && <Section title="Past" events={past} />}
    </div>
  );
}

function Section({ title, events }: { title: string; events: Event[] }) {
  if (events.length === 0) return null;
  return (
    <div className="mt-6">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {events.map((e) => (
          <Link key={e.id} href={`/events/${e.id}`}>
            <a>
              <Card className="h-full hover:border-primary/50 transition" data-testid={`card-event-${e.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle>{e.name}</CardTitle>
                    <Badge variant="outline">{prettyLabel(e.eventType)}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1 text-sm text-muted-foreground">
                  <p>{formatDate(e.date)} · {e.time}</p>
                  <p className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {e.location}
                  </p>
                  <p className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {e.duration}
                  </p>
                </CardContent>
              </Card>
            </a>
          </Link>
        ))}
      </div>
    </div>
  );
}

function EventForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({
    name: "",
    date: "",
    time: "18:00",
    location: "",
    duration: "2h",
    eventType: "workshop",
    description: "",
  });

  const mutation = useMutation({
    mutationFn: (body: typeof form) => apiRequest("/api/events", { method: "POST", body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      onDone();
    },
  });

  const set = (k: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => setForm({ ...form, [k]: e.target.value });

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>New event</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate(form);
          }}
        >
          <Field label="Name">
            <Input value={form.name} onChange={set("name")} required data-testid="input-name" />
          </Field>
          <Field label="Type">
            <Select value={form.eventType} onChange={set("eventType")} data-testid="select-type">
              {eventTypes.map((t) => (
                <option key={t} value={t}>{prettyLabel(t)}</option>
              ))}
            </Select>
          </Field>
          <Field label="Date">
            <Input type="date" value={form.date} onChange={set("date")} required data-testid="input-date" />
          </Field>
          <Field label="Time">
            <Input value={form.time} onChange={set("time")} required data-testid="input-time" />
          </Field>
          <Field label="Location">
            <Input value={form.location} onChange={set("location")} required data-testid="input-location" />
          </Field>
          <Field label="Duration">
            <Input value={form.duration} onChange={set("duration")} data-testid="input-duration" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description">
              <Textarea value={form.description} onChange={set("description")} data-testid="input-description" />
            </Field>
          </div>
          {mutation.isError && (
            <p className="text-sm text-destructive sm:col-span-2">{(mutation.error as Error).message}</p>
          )}
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={mutation.isPending} data-testid="button-save-event">
              {mutation.isPending ? "Saving…" : "Create event"}
            </Button>
            <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
