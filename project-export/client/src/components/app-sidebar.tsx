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
  Briefcase,
  Building2,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import businessClubLogo from "@assets/photo_5393419750937327414_c_1761607336354.jpg";

interface OrgBranding {
  name: string;
  logoUrl: string | null;
  type: string;
  id: string;
}

export function AppSidebar({ role = "member", userName }: { role?: "member" | "admin" | "head-admin"; userName?: string }) {
  const [location] = useLocation();
  const { t, language } = useLanguage();
  const { user } = useAuth();

  const branding: OrgBranding | null = (user as any)?.mainOrgBranding || null;

  const displayName = branding?.name || (language === 'ru' ? 'Предпринимательский Клуб' : 'Business Club');
  const displayLogo = branding?.logoUrl || businessClubLogo;
  const displaySubtitle = branding
    ? (branding.type === 'club' ? (language === 'ru' ? 'Клуб' : 'Club') :
       branding.type === 'university' ? (language === 'ru' ? 'Университет' : 'University') :
       language === 'ru' ? 'Корпорация' : 'Corporation')
    : (language === 'ru' ? 'Финансовый Университет при Правительстве РФ' : 'Financial University');
  const displayFallback = branding ? branding.name.substring(0, 2).toUpperCase() : 'БК';

  const items = [
    { title: t("dashboard"), url: "/", icon: Home },
    { title: t("events"), url: "/events", icon: Calendar },
    { title: t("challenges"), url: "/challenges", icon: Swords },
    { title: t("myTickets"), url: "/tickets", icon: Ticket },
    { title: t("myCertificates"), url: "/certificates", icon: Award },
    { title: t("videoLibrary"), url: "/videos", icon: Video },
    { title: t("livestreams"), url: "/livestreams", icon: Radio },
    { title: t("courses"), url: "/courses", icon: GraduationCap },
    { title: t("messages"), url: "/messages", icon: Mail },
    { title: t("careers"), url: "/careers", icon: Briefcase },
  ];

  const adminItems = role === "head-admin" ? [
    { title: t("scanAttendance"), url: "/scan-attendance", icon: QrCode },
    { title: t("reports"), url: "/admin/reports", icon: FileSpreadsheet },
  ] : [];

  const headAdminItems = role === "head-admin" ? [
    { title: "Admin Panel", url: "/admin", icon: Shield },
    { title: "Registrations", url: "/registrations", icon: Users },
  ] : [];

  return (
    <Sidebar>
      <SidebarContent>
        <div className="px-6 py-4 flex items-center gap-3" data-testid="sidebar-branding">
          <Avatar className="w-12 h-12 flex-shrink-0">
            <AvatarImage src={displayLogo} alt={displayName} />
            <AvatarFallback>{displayFallback}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold leading-tight line-clamp-2" data-testid="text-sidebar-org-name">{displayName}</h2>
            <p className="text-xs text-muted-foreground leading-tight mt-1" data-testid="text-sidebar-org-subtitle">{displaySubtitle}</p>
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            {role === "head-admin" ? "Head Admin" : "Member"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <a href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <a href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {headAdminItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <a href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={location === "/profile"} data-testid="link-profile">
              <a href="/profile">
                <UserCircle className="h-4 w-4" />
                <span>{t("profile")}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
