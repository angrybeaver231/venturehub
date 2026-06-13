import {
  Home,
  Calendar,
  GraduationCap,
  Video,
  Radio,
  Mail,
  Users,
  Briefcase,
  Rocket,
  Target,
  Building2,
  Star,
  School,
  ClipboardList,
  Shield,
  Activity,
  FileSpreadsheet,
  QrCode,
  Ticket,
  Award,
  Swords,
  BookOpen,
  Sparkles,
  Newspaper,
  BarChart3,
  ChevronRight,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarGroup,
  SidebarGroupContent,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import ventorixLogo from "@assets/transparent-logo_1771188316005.png";
import clubLogo from "@assets/photo_5393419750937327414_c_1761607336354.jpg";

interface SubItem {
  title: string;
  url: string;
  testId: string;
}

interface NavEntry {
  title: string;
  icon: typeof Home;
  testId: string;
  url?: string;
  items?: SubItem[];
}

export function TeamHubSidebar({
  userRole,
  isHeadAdmin,
}: {
  userName?: string;
  userRole?: string;
  isHeadAdmin?: boolean;
}) {
  const [location] = useLocation();
  const { t, language } = useLanguage();
  const { state, isMobile } = useSidebar();
  const isIconMode = state === "collapsed" && !isMobile;
  useAuth();

  const isTeacher = userRole === "teacher" || userRole === "lmsAdmin";
  const isEventAdminRole = userRole === "eventAdmin" || isHeadAdmin;
  const isInnoLabsAdminRole = userRole === "innoLabsAdmin" || isHeadAdmin;
  const isPlatformAdmin =
    isHeadAdmin ||
    ["lmsAdmin", "eventAdmin", "innoLabsAdmin"].includes(userRole || "");
  const canGrade = isHeadAdmin || isTeacher;

  const ru = language === "ru";

  // Build the ≤10 top-level entries.
  const entries: NavEntry[] = [
    {
      title: t("dashboard"),
      icon: Home,
      url: "/dashboard",
      testId: "dashboard",
    },
    {
      title: t("events"),
      icon: Calendar,
      testId: "events",
      items: [
        {
          title: ru ? "Все события" : "All events",
          url: "/events",
          testId: "events-all",
        },
        {
          title: t("myTickets"),
          url: "/tickets",
          testId: "events-tickets",
        },
        ...(isEventAdminRole
          ? [
              {
                title: t("scanAttendance"),
                url: "/scan-attendance",
                testId: "events-scan",
              },
            ]
          : []),
      ],
    },
    {
      title: ru ? "Обучение" : "Learning",
      icon: GraduationCap,
      testId: "learning",
      items: [
        { title: t("courses"), url: "/courses", testId: "learning-courses" },
        { title: t("videoLibrary"), url: "/videos", testId: "learning-videos" },
        {
          title: t("livestreams"),
          url: "/livestreams",
          testId: "learning-livestreams",
        },
        {
          title: t("challenges"),
          url: "/challenges",
          testId: "learning-challenges",
        },
        {
          title: t("myCertificates"),
          url: "/certificates",
          testId: "learning-certificates",
        },
        ...(canGrade
          ? [
              {
                title: t("grading"),
                url: "/admin/grading",
                testId: "learning-grading",
              },
            ]
          : []),
      ],
    },
    {
      title: ru ? "Венчур" : "Venture OS",
      icon: Rocket,
      testId: "innovation",
      items: [
        { title: t("startups"), url: "/startups", testId: "inno-startups" },
        // Capital section: investors workspace + the things they live in —
        // their watchlists and the alerts that fire on those watched startups.
        { title: ru ? "Капитал" : "Capital", url: "/investors", testId: "inno-capital" },
        {
          title: ru ? "Списки наблюдения" : "Watchlists",
          url: "/watchlists",
          testId: "inno-watchlists",
        },
        {
          title: ru ? "Алерты по портфелю" : "Portfolio alerts",
          url: "/alerts/rules",
          testId: "inno-alert-rules",
        },
        { title: ru ? "Подбор по тезису" : "Thesis matching", url: "/thesis-match", testId: "inno-thesis-match" },
        { title: t("programs"), url: "/programs", testId: "inno-programs" },
        {
          title: t("universitiesNav"),
          url: "/universities",
          testId: "inno-universities",
        },
        // Evaluations + My-reviews live on the corporate side now;
        // only platform/innovation admins still need them in the nav.
        ...(isInnoLabsAdminRole
          ? [
              {
                title: t("evaluationsNav"),
                url: "/evaluations",
                testId: "inno-evaluations",
              },
              {
                title: t("myReviews"),
                url: "/my-reviews",
                testId: "inno-my-reviews",
              },
            ]
          : []),
      ],
    },
    {
      title: t("careers"),
      icon: Briefcase,
      testId: "careers",
      ...(isHeadAdmin || isEventAdminRole
        ? {
            items: [
              {
                title: ru ? "Все вакансии" : "Browse jobs",
                url: "/careers",
                testId: "careers-browse",
              },
              {
                title: ru ? "Управление" : "Recruitment",
                url: "/admin/careers",
                testId: "careers-admin",
              },
            ],
          }
        : { url: "/careers" }),
    },
    {
      title: ru ? "Участники" : "Members",
      icon: Users,
      url: "/members",
      testId: "members",
    },
    {
      title: ru ? "Новости" : "News",
      icon: Newspaper,
      testId: "news",
      ...(isEventAdminRole
        ? {
            items: [
              {
                title: ru ? "Все новости" : "Browse news",
                url: "/news",
                testId: "news-browse",
              },
              {
                title: ru ? "Управление" : "Manage",
                url: "/admin/news",
                testId: "news-admin",
              },
            ],
          }
        : { url: "/news" }),
    },
    {
      title: t("messages"),
      icon: Mail,
      url: "/messages",
      testId: "messages",
    },
  ];

  // Admin-only entries (still inside the 10 cap)
  const adminSubs: SubItem[] = [];
  if (isEventAdminRole) {
    adminSubs.push({
      title: ru ? "Данные" : "Data",
      url: "/registrations",
      testId: "admin-data",
    });
    adminSubs.push({
      title: t("reports"),
      url: "/admin/reports",
      testId: "admin-reports",
    });
    adminSubs.push({
      title: ru ? "Объединить организации" : "Merge Organizations",
      url: "/admin/organizations",
      testId: "admin-organizations",
    });
    adminSubs.push({
      title: ru ? "Лендинги" : "Landing pages",
      url: "/admin/landing",
      testId: "admin-landing",
    });
  }
  if (isInnoLabsAdminRole) {
    adminSubs.push({
      title: t("reportingNav"),
      url: "/reporting",
      testId: "admin-reporting",
    });
  }
  if (adminSubs.length > 0) {
    entries.push({
      title: ru ? "Отчёты" : "Reports",
      icon: BarChart3,
      testId: "reports",
      items: adminSubs,
    });
  }
  if (isPlatformAdmin) {
    entries.push({
      title: t("adminPanel"),
      icon: Shield,
      url: "/admin",
      testId: "admin",
    });
    entries.push({
      title: ru ? "Сигналы" : "Signals",
      icon: Activity,
      url: "/admin/signals",
      testId: "admin-signals",
    });
    entries.push({
      title: ru ? "Discovery" : "Discovery",
      icon: Activity,
      url: "/admin/scout",
      testId: "admin-scout",
    });
  }

  // Safety: never exceed 10 visible buttons
  const topEntries = entries.slice(0, 10);

  const isUrlActive = (url: string) => {
    const cleanUrl = url.split("?")[0];
    if (cleanUrl === "/dashboard") {
      return location === "/" || location === "/dashboard";
    }
    return location === cleanUrl || location.startsWith(cleanUrl + "/");
  };

  const isEntryActive = (entry: NavEntry) => {
    if (entry.url && isUrlActive(entry.url)) return true;
    if (entry.items?.some((s) => isUrlActive(s.url))) return true;
    return false;
  };

  return (
    <Sidebar collapsible="icon" data-testid="teamhub-sidebar">
      <SidebarContent className="px-0 gap-0">
        {/* Brand header — Business Club */}
        <div
          className="px-4 py-5 flex items-center gap-2.5 border-b border-sidebar-border"
          data-testid="sidebar-brand"
        >
          <div className="h-9 w-9 rounded-md bg-background border border-border flex items-center justify-center shrink-0 overflow-hidden">
            <img
              src={clubLogo}
              alt={ru ? "Бизнес-клуб" : "Business Club"}
              className="h-9 w-9 object-cover"
            />
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <div className="text-sm font-bold tracking-tight leading-tight">
              {ru ? "Бизнес-клуб" : "Business Club"}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
              {ru ? "Финансовый университет" : "Financial University"}
            </div>
          </div>
        </div>

        {/* Nav */}
        <div className="py-3 flex-1">
          <SidebarGroup className="py-0">
            <SidebarGroupContent className="px-2">
              <SidebarMenu className="gap-1">
                {topEntries.map((entry) => {
                  const Icon = entry.icon;
                  const active = isEntryActive(entry);

                  // Plain link entry
                  if (!entry.items || entry.items.length === 0) {
                    return (
                      <SidebarMenuItem key={entry.testId}>
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          tooltip={entry.title}
                          className={cn(
                            "h-10 gap-3 rounded-md font-medium",
                            active &&
                              "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground data-[active=true]:bg-primary data-[active=true]:text-primary-foreground",
                          )}
                          data-testid={`link-nav-${entry.testId}`}
                        >
                          <Link href={entry.url!}>
                            <Icon
                              className={cn(
                                "h-4 w-4 shrink-0",
                                active
                                  ? "text-primary-foreground"
                                  : "text-muted-foreground",
                              )}
                            />
                            <span className="text-sm truncate">
                              {entry.title}
                            </span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  }

                  // Collapsible entry with sub-items.
                  // In icon-collapsed mode, render as a direct link to the
                  // first sub-route so the group remains navigable.
                  const defaultUrl = entry.items[0].url;

                  if (isIconMode) {
                    return (
                      <SidebarMenuItem key={entry.testId}>
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          tooltip={entry.title}
                          className={cn(
                            "h-10 gap-3 rounded-md font-medium",
                            active &&
                              "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground data-[active=true]:bg-primary data-[active=true]:text-primary-foreground",
                          )}
                          data-testid={`link-nav-${entry.testId}`}
                        >
                          <Link href={defaultUrl}>
                            <Icon
                              className={cn(
                                "h-4 w-4 shrink-0",
                                active
                                  ? "text-primary-foreground"
                                  : "text-muted-foreground",
                              )}
                            />
                            <span className="text-sm truncate">
                              {entry.title}
                            </span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  }

                  return (
                    <Collapsible
                      key={entry.testId}
                      defaultOpen={active}
                      className="group/collapsible"
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            tooltip={entry.title}
                            className={cn(
                              "h-10 gap-3 rounded-md font-medium",
                              active && "text-primary",
                            )}
                            data-testid={`button-nav-${entry.testId}`}
                          >
                            <Icon
                              className={cn(
                                "h-4 w-4 shrink-0",
                                active ? "text-primary" : "text-muted-foreground",
                              )}
                            />
                            <span className="text-sm truncate flex-1 text-left">
                              {entry.title}
                            </span>
                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub className="mt-1 mr-0 pr-0">
                            {entry.items.map((sub) => {
                              const subActive = isUrlActive(sub.url);
                              return (
                                <SidebarMenuSubItem key={sub.url}>
                                  <SidebarMenuSubButton
                                    asChild
                                    isActive={subActive}
                                    className={cn(
                                      "h-8 text-sm",
                                      subActive &&
                                        "bg-primary/10 text-primary font-medium",
                                    )}
                                    data-testid={`link-subnav-${sub.testId}`}
                                  >
                                    <Link href={sub.url}>
                                      <span className="truncate">
                                        {sub.title}
                                      </span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              );
                            })}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>

        {/* Promo card */}
        <div className="px-3 py-3 group-data-[collapsible=icon]:hidden">
          <div
            className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2"
            data-testid="card-sidebar-promo"
          >
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <div className="text-sm font-semibold leading-tight">
                {ru ? "Дополните профиль" : "Complete your profile"}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              {ru
                ? "Откройте все возможности — заполните недостающие поля."
                : "Unlock everything — fill in the missing fields."}
            </p>
            <Button
              asChild
              size="sm"
              className="w-full h-8 text-xs"
              data-testid="button-promo-profile"
            >
              <Link href="/profile">
                {ru ? "Открыть профиль" : "Go to profile"}
              </Link>
            </Button>
          </div>
        </div>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border px-3 py-3 group-data-[collapsible=icon]:hidden">
        <div className="flex items-center justify-center gap-2" data-testid="sidebar-footer-ventorix">
          <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center overflow-hidden shrink-0">
            <img src={ventorixLogo} alt="Ventorix" className="h-5 w-5 object-contain" />
          </div>
          <p className="text-[9px] text-muted-foreground tracking-[0.12em] uppercase">
            Powered by <span className="font-semibold">Ventorix</span>
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
