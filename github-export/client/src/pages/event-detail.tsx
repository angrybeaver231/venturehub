import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { ArrowLeft, MapPin, Clock, CalendarDays, Check, UserPlus } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Input,
  Label,
  PageLoader,
} from "@/components/ui";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDate, prettyLabel } from "@/lib/utils";
import type { Event, Registration } from "@shared/schema";

type EventDetail = Event & { registrations: Registration[] };

export default function EventDetailPage() {
  const [, params] = useRoute("/events/:id");
  const id = params?.id;
  const { data, isLoading } = useQuery<EventDetail>({
    queryKey: ["/api/events", id],
    enabled: !!id,
  });

  if (isLoading) return <PageLoader />;
  if (!data) return <p className="text-muted-foreground">Event not found.</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/events">
        <a className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground" data-testid="link-back">
          <ArrowLeft className="h-4 w-4" /> Back to events
        </a>
      </Link>

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold">{data.name}</h1>
        <Badge variant="outline">{prettyLabel(data.eventType)}</Badge>
        {data.isFeatured && <Badge variant="default">Featured</Badge>}
      </div>

      <div className="mb-5 flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1"><CalendarDays className="h-4 w-4" /> {formatDate(data.date)} · {data.time}</span>
        <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {data.location}</span>
        <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {data.duration}</span>
      </div>

      {data.description && <p className="mb-6 leading-relaxed">{data.description}</p>}

      <div className="grid gap-6 md:grid-cols-2">
        <RegisterCard eventId={data.id} open={data.registrationOpen} />
        <AttendeesCard registrations={data.registrations} eventId={data.id} />
      </div>
    </div>
  );
}

function RegisterCard({ eventId, open }: { eventId: string; open: boolean }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest(`/api/events/${eventId}/register`, {
        method: "POST",
        body: { guestName: name, guestEmail: email },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      setName("");
      setEmail("");
      setDone(true);
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" /> Register</CardTitle>
      </CardHeader>
      <CardContent>
        {!open ? (
          <p className="text-sm text-muted-foreground">Registration is closed for this event.</p>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label>Full name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required data-testid="input-guest-name" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required data-testid="input-guest-email" />
            </div>
            {mutation.isError && (
              <p className="text-sm text-destructive">{(mutation.error as Error).message}</p>
            )}
            {done && !mutation.isError && (
              <p className="text-sm text-primary">You are registered.</p>
            )}
            <Button type="submit" disabled={mutation.isPending} data-testid="button-register">
              {mutation.isPending ? "Submitting…" : "Register"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function AttendeesCard({
  registrations,
  eventId,
}: {
  registrations: Registration[];
  eventId: string;
}) {
  const mutation = useMutation({
    mutationFn: (regId: string) =>
      apiRequest(`/api/registrations/${regId}/attendance`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] }),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Attendees ({registrations.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {registrations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No registrations yet.</p>
        ) : (
          <ul className="space-y-2">
            {registrations.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2" data-testid={`row-attendee-${r.id}`}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.guestName}</p>
                  <p className="truncate text-xs text-muted-foreground">{r.guestEmail}</p>
                </div>
                {r.attendanceMarked ? (
                  <Badge variant="default" className="gap-1"><Check className="h-3 w-3" /> Present</Badge>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => mutation.mutate(r.id)} data-testid={`button-checkin-${r.id}`}>
                    Check in
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
