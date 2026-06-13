import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { CalendarDays, Rocket, Landmark, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, PageLoader, Badge } from "@/components/ui";
import { PageHeader } from "@/components/layout";
import { formatDate } from "@/lib/utils";
import type { Event, Startup, Investor } from "@shared/schema";

export default function Dashboard() {
  const events = useQuery<Event[]>({ queryKey: ["/api/events"] });
  const startups = useQuery<Startup[]>({ queryKey: ["/api/startups"] });
  const investors = useQuery<Investor[]>({ queryKey: ["/api/investors"] });

  if (events.isLoading || startups.isLoading || investors.isLoading) {
    return <PageLoader />;
  }

  const upcoming = (events.data ?? []).filter((e) => e.status === "upcoming");

  const stats = [
    { label: "Upcoming events", value: upcoming.length, href: "/events", icon: CalendarDays },
    { label: "Startups", value: startups.data?.length ?? 0, href: "/startups", icon: Rocket },
    { label: "Investors", value: investors.data?.length ?? 0, href: "/investors", icon: Landmark },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="A snapshot of your events and venture hub."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <a>
              <Card className="hover:border-primary/50 transition" data-testid={`card-stat-${s.label}`}>
                <CardContent className="flex items-center justify-between p-5">
                  <div>
                    <p className="text-sm text-muted-foreground">{s.label}</p>
                    <p className="mt-1 text-3xl font-semibold">{s.value}</p>
                  </div>
                  <s.icon className="h-8 w-8 text-primary" />
                </CardContent>
              </Card>
            </a>
          </Link>
        ))}
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Next up</h2>
          <Link href="/events">
            <a className="flex items-center gap-1 text-sm text-primary">
              All events <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {upcoming.slice(0, 4).map((e) => (
            <Link key={e.id} href={`/events/${e.id}`}>
              <a>
                <Card className="h-full hover:border-primary/50 transition" data-testid={`card-event-${e.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle>{e.name}</CardTitle>
                      {e.isFeatured && <Badge variant="default">Featured</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {formatDate(e.date)} · {e.time} · {e.location}
                  </CardContent>
                </Card>
              </a>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
