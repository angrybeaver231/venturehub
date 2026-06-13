import { useMemo, useState } from "react";
import {
  Bell,
  Settings,
  ChevronDown,
  LogOut,
  Sun,
  Moon,
  UserCircle,
  Menu,
  CheckCheck,
  Inbox,
  Shield,
  Languages,
  Eye,
  ShieldOff,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { ImpersonationSwitcher } from "@/components/impersonation-switcher";
import { useTheme } from "@/components/theme-provider";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  content: string | null;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string | null;
  severity?: string | null;
  category?: string | null;
}

const SEVERITY_DOT: Record<string, string> = {
  critical: "bg-destructive",
  warning: "bg-amber-500",
  positive: "bg-emerald-500",
  info: "bg-primary",
};

const CATEGORY_TABS: Array<{ key: string; en: string; ru: string }> = [
  { key: "all", en: "All", ru: "Все" },
  { key: "alert", en: "Alerts", ru: "Алерты" },
  { key: "review", en: "Reviews", ru: "Ревью" },
  { key: "system", en: "System", ru: "Системные" },
];

function timeAgo(iso: string | null, lang: "en" | "ru") {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return lang === "ru" ? "только что" : "just now";
  if (m < 60) return lang === "ru" ? `${m} мин` : `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return lang === "ru" ? `${h} ч` : `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return lang === "ru" ? `${d} дн` : `${d}d`;
  return new Date(iso).toLocaleDateString(lang === "ru" ? "ru-RU" : "en-US");
}

export function TeamHubTopbar({
  userName,
  isHeadAdmin,
}: {
  userName?: string;
  isHeadAdmin?: boolean;
}) {
  const { user, isRealHeadAdmin, isImpersonating } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [, setLocation] = useLocation();

  const userRole = (user as any)?.role;
  const isPlatformAdmin =
    isHeadAdmin ||
    ["lmsAdmin", "eventAdmin", "innoLabsAdmin"].includes(userRole || "");

  const {
    data: notifications = [],
    isLoading: notifLoading,
    isError: notifError,
  } = useQuery<NotificationItem[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 60_000,
  });
  const { data: countData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread/count"],
    refetchInterval: 60_000,
  });
  const unreadCount = countData?.count ?? 0;

  const markRead = useMutation({
    mutationFn: async (id: string) =>
      apiRequest(`/api/notifications/${id}/read`, { method: "PATCH" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/notifications/unread/count"],
      });
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () =>
      apiRequest("/api/notifications/read-all", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/notifications/unread/count"],
      });
    },
  });

  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const filtered = useMemo(
    () =>
      categoryFilter === "all"
        ? notifications
        : notifications.filter((n) => (n.category || "system") === categoryFilter),
    [notifications, categoryFilter],
  );
  const recent = useMemo(() => filtered.slice(0, 12), [filtered]);

  const initial = (
    userName?.[0] || (user as any)?.email?.[0] || "U"
  ).toUpperCase();
  const roleLabel = isHeadAdmin
    ? language === "ru"
      ? "Администратор"
      : "Admin"
    : language === "ru"
    ? "Участник"
    : "Member";

  const iconBtn =
    "h-10 w-10 rounded-md bg-primary/10 text-primary border-0 relative";

  const handleNotificationClick = (n: NotificationItem) => {
    if (!n.isRead) markRead.mutate(n.id);
    if (n.linkUrl) setLocation(n.linkUrl);
  };

  return (
    <header
      className="sticky top-0 z-30 h-16 px-3 sm:px-6 flex items-center justify-between gap-3 bg-background border-b border-border"
      data-testid="teamhub-topbar"
    >
      {/* Left: sidebar trigger */}
      <div className="flex items-center gap-2 min-w-0">
        <SidebarTrigger
          className="h-9 w-9 rounded-md"
          data-testid="button-sidebar-toggle"
        >
          <Menu className="h-4 w-4" />
        </SidebarTrigger>
      </div>

      {/* Right: settings, notifications, profile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Settings dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={iconBtn}
              aria-label={language === "ru" ? "Настройки" : "Settings"}
              data-testid="button-topbar-settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs">
              {language === "ru" ? "Настройки" : "Settings"}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild data-testid="link-settings-profile">
              <Link href="/profile">
                <UserCircle className="h-4 w-4 mr-2" />
                {language === "ru" ? "Профиль и аккаунт" : "Profile & account"}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              data-testid="button-settings-theme"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 mr-2" />
              ) : (
                <Moon className="h-4 w-4 mr-2" />
              )}
              {theme === "dark" ? t("lightMode") : t("darkMode")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setLanguage(language === "ru" ? "en" : "ru")}
              data-testid="button-settings-language"
            >
              <Languages className="h-4 w-4 mr-2" />
              {language === "ru" ? "Язык: English" : "Language: Русский"}
            </DropdownMenuItem>
            {isPlatformAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild data-testid="link-settings-admin">
                  <Link href="/admin">
                    <Shield className="h-4 w-4 mr-2" />
                    {t("adminPanel")}
                  </Link>
                </DropdownMenuItem>
              </>
            )}
            {isRealHeadAdmin && (
              <>
                <DropdownMenuSeparator />
                <ImpersonationSwitcher
                  trigger={
                    <DropdownMenuItem
                      onSelect={(e) => e.preventDefault()}
                      data-testid="button-open-view-as-menu"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      {language === "ru" ? "Смотреть как..." : "View as..."}
                    </DropdownMenuItem>
                  }
                />
                {isImpersonating && (
                  <DropdownMenuItem
                    onClick={async () => {
                      await fetch("/api/admin/stop-impersonating", {
                        method: "POST",
                        credentials: "include",
                      });
                      queryClient.clear();
                      window.location.reload();
                    }}
                    data-testid="button-stop-impersonating-menu"
                  >
                    <ShieldOff className="h-4 w-4 mr-2" />
                    {language === "ru" ? "Вернуться к head-админу" : "Stop viewing as"}
                  </DropdownMenuItem>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={iconBtn}
              aria-label={language === "ru" ? "Уведомления" : "Notifications"}
              data-testid="button-topbar-notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold flex items-center justify-center border-2 border-background"
                  data-testid="badge-unread-count"
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[360px] p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">
                  {language === "ru" ? "Уведомления" : "Notifications"}
                </span>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-[10px]">
                    {unreadCount} {language === "ru" ? "новых" : "new"}
                  </Badge>
                )}
              </div>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => markAllRead.mutate()}
                  disabled={markAllRead.isPending}
                  data-testid="button-mark-all-read"
                >
                  <CheckCheck className="h-3.5 w-3.5 mr-1" />
                  {language === "ru" ? "Прочесть все" : "Mark all read"}
                </Button>
              )}
            </div>
            <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border overflow-x-auto">
              {CATEGORY_TABS.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setCategoryFilter(c.key)}
                  className={cn(
                    "text-[11px] px-2 py-1 rounded-md hover-elevate shrink-0",
                    categoryFilter === c.key && "bg-primary/10 text-primary",
                  )}
                  data-testid={`tab-notification-${c.key}`}
                >
                  {language === "ru" ? c.ru : c.en}
                </button>
              ))}
            </div>
            <ScrollArea className="max-h-[420px]">
              {notifLoading ? (
                <div
                  className="py-12 text-center text-sm text-muted-foreground"
                  data-testid="text-notifications-loading"
                >
                  {language === "ru" ? "Загрузка…" : "Loading…"}
                </div>
              ) : notifError ? (
                <div
                  className="py-12 text-center text-sm text-destructive"
                  data-testid="text-notifications-error"
                >
                  {language === "ru"
                    ? "Не удалось загрузить уведомления."
                    : "Couldn't load notifications."}
                </div>
              ) : recent.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center py-12 px-6 text-center text-muted-foreground"
                  data-testid="text-no-notifications"
                >
                  <Inbox className="h-10 w-10 mb-3 opacity-40" />
                  <div className="text-sm font-medium">
                    {language === "ru" ? "Пока ничего нет" : "You're all caught up"}
                  </div>
                  <div className="text-xs mt-1">
                    {language === "ru"
                      ? "Новые уведомления появятся здесь."
                      : "New notifications will show up here."}
                  </div>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {recent.map((n) => (
                    <li key={n.id}>
                      <button
                        onClick={() => handleNotificationClick(n)}
                        className={cn(
                          "w-full text-left px-4 py-3 hover-elevate flex items-start gap-3 transition-colors",
                          !n.isRead && "bg-primary/5",
                        )}
                        data-testid={`notification-item-${n.id}`}
                      >
                        <span
                          className={cn(
                            "mt-1.5 h-2 w-2 rounded-full shrink-0",
                            n.isRead
                              ? "bg-transparent"
                              : SEVERITY_DOT[n.severity || "info"] || "bg-primary",
                          )}
                          data-testid={`notification-severity-${n.severity || "info"}-${n.id}`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium leading-tight truncate">
                            {n.title}
                          </div>
                          {n.content && (
                            <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                              {n.content}
                            </div>
                          )}
                          <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">
                            {timeAgo(n.createdAt, language)}
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
            <div className="border-t border-border px-3 py-2">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="w-full justify-center text-xs"
                data-testid="link-view-all-messages"
              >
                <Link href="/messages">
                  {language === "ru" ? "Открыть сообщения" : "Open messages"}
                </Link>
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2.5 pl-1 pr-2 sm:pr-3 h-12 rounded-full hover-elevate active-elevate-2"
              data-testid="button-topbar-profile"
              aria-label={`${userName || t("user")} — ${language === "ru" ? "меню профиля" : "profile menu"}`}
            >
              <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                <AvatarImage
                  src={(user as any)?.profileImageUrl || undefined}
                  alt={userName}
                />
                <AvatarFallback className="bg-primary/15 text-primary text-sm font-semibold">
                  {initial}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:flex flex-col items-start min-w-0">
                <span
                  className="text-sm font-semibold leading-tight truncate max-w-[160px]"
                  data-testid="text-topbar-username"
                >
                  {userName || t("user")}
                </span>
                <span className="text-[11px] text-muted-foreground leading-tight">
                  {roleLabel}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs">
              {userName || t("user")}
              <div className="text-[10px] font-normal text-muted-foreground truncate">
                {(user as any)?.email}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild data-testid="link-dropdown-profile">
              <Link href="/profile">
                <UserCircle className="h-4 w-4 mr-2" />
                {t("profile")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild data-testid="link-dropdown-logout">
              <a href="/api/logout">
                <LogOut className="h-4 w-4 mr-2" />
                {t("logout")}
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
