import { Link, useLocation } from "wouter";
import {
  CalendarDays,
  LayoutDashboard,
  Rocket,
  Landmark,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { section: "Events" },
  { href: "/events", label: "Events", icon: CalendarDays },
  { section: "Venture Hub" },
  { href: "/startups", label: "Startups", icon: Rocket },
  { href: "/investors", label: "Investors", icon: Landmark },
  { href: "/thesis-match", label: "Thesis Match", icon: Sparkles },
] as const;

function isActive(current: string, href: string) {
  if (href === "/") return current === "/";
  return current === href || current.startsWith(href + "/");
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex min-h-screen w-full">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex h-14 items-center gap-2 px-5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sidebar-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="font-semibold">Venture &amp; Events Hub</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV.map((item, i) =>
            "section" in item ? (
              <p
                key={item.section}
                className="px-3 pb-1 pt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                {item.section}
              </p>
            ) : (
              <Link key={item.href} href={item.href}>
                <a
                  data-testid={`link-nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition",
                    isActive(location, item.href)
                      ? "bg-sidebar-accent text-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </a>
              </Link>
            ),
          )}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-2 border-b border-border px-4">
          <div className="flex flex-wrap items-center gap-2 overflow-x-auto md:hidden">
            {NAV.filter((n) => "href" in n).map((item) =>
              "href" in item ? (
                <Link key={item.href} href={item.href}>
                  <a
                    className={cn(
                      "rounded-md px-2 py-1 text-sm",
                      isActive(location, item.href)
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {item.label}
                  </a>
                </Link>
              ) : null,
            )}
          </div>
          <span className="hidden text-sm text-muted-foreground md:block">
            Running on built-in sample data
          </span>
          <ThemeToggle />
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="text-page-title">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
