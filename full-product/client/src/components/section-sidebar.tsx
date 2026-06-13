import ventorixLogo from "@assets/transparent-logo_1771188316005.png";
import {
  Calendar,
  Video,
  Radio,
  GraduationCap,
  Home,
  LogOut,
  UserCircle,
  Shield,
  Users,
  QrCode,
  Ticket,
  Award,
  FileSpreadsheet,
  Swords,
  Mail,
  BookOpen,
  Sun,
  Moon,
  Briefcase,
  Rocket,
  Building2,
  Target,
  Star,
  BarChart3,
  School,
  ClipboardList,
  Sparkles,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useLocation, Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigation } from "@/contexts/NavigationContext";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import businessClubLogo from "@assets/photo_5393419750937327414_c_1761607336354.jpg";

interface SidebarItem {
  title: string;
  url: string;
  icon: typeof Home;
}

interface SectionConfig {
  label: string;
  items: SidebarItem[];
}

export function SectionSidebar({
  role = "member",
  userName,
  userRole,
}: {
  role?: "member" | "admin" | "head-admin";
  userName?: string;
  userRole?: string;
}) {
  const [location] = useLocation();
  const { t, language } = useLanguage();
  const { activeSection } = useNavigation();
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  const branding =
    (user as any)?.mainOrgBranding as
      | { name: string; logoUrl: string | null; type: string; id: string }
      | null
      | undefined;
  const displayName =
    branding?.name ||
    (language === "ru" ? "Предпринимательский Клуб" : "Business Club");
  const displayLogo = branding?.logoUrl || businessClubLogo;
  const displaySubtitle = branding
    ? branding.type === "club"
      ? language === "ru"
        ? "Клуб"
        : "Club"
      : branding.type === "university"
      ? language === "ru"
        ? "Университет"
        : "University"
      : language === "ru"
      ? "Корпорация"
      : "Corporation"
    : language === "ru"
    ? "Финансовый Университет при Правительстве РФ"
    : "Financial University";
  const displayFallback = branding
    ? branding.name.substring(0, 2).toUpperCase()
    : "БК";

  const isHeadAdmin = role === "head-admin";
  const isTeacher = userRole === "teacher" || userRole === "lmsAdmin";
  const isPlatformAdmin =
    isHeadAdmin || ["lmsAdmin", "eventAdmin", "innoLabsAdmin"].includes(userRole || "");
  const isLmsAdmin = userRole === "lmsAdmin" || isHeadAdmin;
  const isEventAdminRole = userRole === "eventAdmin" || isHeadAdmin;
  const isInnoLabsAdminRole = userRole === "innoLabsAdmin" || isHeadAdmin;
  const canGrade = isHeadAdmin || isTeacher;

  const getSectionConfig = (): SectionConfig | null => {
    switch (activeSection) {
      case "dashboard":
        return {
          label: t("dashboard"),
          items: [
            { title: t("dashboard"), url: "/", icon: Home },
            { title: t("startups"), url: "/startups", icon: Rocket },
            { title: t("programs"), url: "/programs", icon: Target },
            { title: t("corporate"), url: "/corporations", icon: Building2 },
            { title: t("evaluationsNav"), url: "/evaluations", icon: Star },
            { title: t("universitiesNav"), url: "/universities", icon: School },
            { title: t("myReviews"), url: "/my-reviews", icon: ClipboardList },
            ...(isInnoLabsAdminRole
              ? [{ title: t("reportingNav"), url: "/reporting", icon: BarChart3 }]
              : []),
          ],
        };
      case "events":
        return {
          label: t("events"),
          items: [
            { title: t("events"), url: "/events", icon: Calendar },
            { title: t("challenges"), url: "/challenges", icon: Swords },
            { title: t("myTickets"), url: "/tickets", icon: Ticket },
            { title: t("myCertificates"), url: "/certificates", icon: Award },
            ...(isEventAdminRole
              ? [{ title: t("scanAttendance"), url: "/scan-attendance", icon: QrCode }]
              : []),
            ...(isEventAdminRole
              ? [
                  { title: t("reports"), url: "/admin/reports", icon: FileSpreadsheet },
                  { title: t("registrations"), url: "/registrations", icon: Users },
                ]
              : []),
          ],
        };
      case "courses":
        return {
          label: t("courses"),
          items: [
            { title: t("courses"), url: "/courses", icon: GraduationCap },
            { title: t("myCourses"), url: "/courses?enrolled=true", icon: BookOpen },
            ...(canGrade
              ? [{ title: t("grading"), url: "/admin/grading", icon: FileSpreadsheet }]
              : []),
          ],
        };
      case "videos":
        return {
          label: t("videoLibrary"),
          items: [
            { title: t("videoLibrary"), url: "/videos", icon: Video },
            { title: t("livestreams"), url: "/livestreams", icon: Radio },
          ],
        };
      case "messages":
        return {
          label: t("messages"),
          items: [{ title: t("messages"), url: "/messages", icon: Mail }],
        };
      case "profile":
        return {
          label: t("profile"),
          items: [
            { title: t("profile"), url: "/profile", icon: UserCircle },
            ...(isPlatformAdmin
              ? [{ title: t("adminPanel"), url: "/admin", icon: Shield }]
              : []),
            ...(isHeadAdmin || isEventAdminRole
              ? [{ title: t("careers"), url: "/admin/careers", icon: Briefcase }]
              : []),
          ],
        };
      default:
        return null;
    }
  };

  const config = getSectionConfig();

  if (!config) return null;

  const userInitial =
    (userName?.[0] || (user as any)?.email?.[0] || "U").toUpperCase();

  const isItemActive = (url: string) =>
    location === url || (url !== "/" && location.startsWith(url.split("?")[0]));

  return (
    <Sidebar className="border-r" data-testid="section-sidebar">
      <SidebarContent className="px-0">
        {/* Branding header */}
        <div
          className="px-4 py-5 flex items-center gap-3 border-b border-border/60"
          data-testid="sidebar-branding"
        >
          <Avatar className="h-11 w-11 rounded-xl flex-shrink-0">
            <AvatarImage src={displayLogo} alt={displayName} className="object-cover" />
            <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-semibold">
              {displayFallback}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2
              className="text-sm font-bold leading-tight line-clamp-2"
              data-testid="text-sidebar-org-name"
            >
              {displayName}
            </h2>
            <p
              className="text-[11px] text-muted-foreground leading-tight mt-0.5 line-clamp-1"
              data-testid="text-sidebar-org-subtitle"
            >
              {displaySubtitle}
            </p>
          </div>
        </div>

        {/* Section label */}
        <div className="px-4 pt-4 pb-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {config.label}
          </div>
        </div>

        {/* Items */}
        <div className="px-2">
          <SidebarMenu className="gap-1">
            {config.items.map((item) => {
              const active = isItemActive(item.url);
              const Icon = item.icon;
              return (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={active}
                    className={cn(
                      "h-10 gap-3 rounded-md transition-colors",
                      active &&
                        "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300 data-[active=true]:bg-emerald-100 dark:data-[active=true]:bg-emerald-500/15"
                    )}
                    data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <a href={item.url}>
                      <span
                        className={cn(
                          "h-7 w-7 rounded-md flex items-center justify-center shrink-0",
                          active
                            ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                            : "bg-muted/60 text-muted-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="text-sm font-medium truncate">{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </div>

        {/* Promo card (Figma "Get Pro" style) */}
        <div className="px-3 mt-auto pt-6">
          <div
            className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2"
            data-testid="card-sidebar-promo"
          >
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <div className="text-sm font-semibold">
                {language === "ru" ? "Дополните профиль" : "Complete your profile"}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              {language === "ru"
                ? "Откройте все возможности — заполните недостающие поля."
                : "Unlock everything — fill in the missing fields."}
            </p>
            <Button asChild size="sm" className="w-full h-8 text-xs">
              <Link href="/profile" data-testid="link-promo-profile">
                {language === "ru" ? "Открыть профиль" : "Go to profile"}
              </Link>
            </Button>
          </div>
        </div>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/60 gap-2">
        {/* User row */}
        <div
          className="flex items-center gap-2 px-2 py-1.5 rounded-md"
          data-testid="link-user-profile"
        >
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={(user as any)?.profileImageUrl || undefined} alt={userName} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {userInitial}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium truncate">{userName || t("user")}</div>
            <div className="text-[10px] text-muted-foreground truncate">
              {isHeadAdmin
                ? language === "ru"
                  ? "Администратор"
                  : "Admin"
                : language === "ru"
                ? "Участник"
                : "Member"}
            </div>
          </div>
        </div>

        <SidebarMenu className="gap-0.5">
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-9 gap-2"
              data-testid="button-theme-toggle"
            >
              {theme === "dark" ? (
                <>
                  <Sun className="h-4 w-4" />
                  <span className="text-sm">{t("lightMode")}</span>
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4" />
                  <span className="text-sm">{t("darkMode")}</span>
                </>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="h-9 gap-2 text-muted-foreground"
              data-testid="link-logout-sidebar"
            >
              <a href="/api/logout">
                <LogOut className="h-4 w-4" />
                <span className="text-sm">{t("logout")}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <div className="px-2 pt-2 mt-1 border-t border-border/60 flex flex-col items-center gap-1">
          <img
            src={ventorixLogo}
            alt="Ventorix"
            className="h-5 w-auto opacity-90"
            data-testid="img-ventorix-logo"
          />
          <p
            className="text-[9px] text-muted-foreground text-center tracking-[0.12em] uppercase"
            data-testid="text-powered-by-ventorix"
          >
            Powered by <span className="font-semibold">Ventorix</span>
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
