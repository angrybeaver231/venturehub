import { useState } from "react";
import { Eye, EyeOff, Search, ShieldOff, UserCog } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";

type SearchUser = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string | null;
  isHeadAdmin: boolean | null;
  profileImageUrl: string | null;
};

const ROLE_TEMPLATES: Array<{
  key: string;
  en: string;
  ru: string;
  hint: { en: string; ru: string };
}> = [
  {
    key: "member",
    en: "Regular member",
    ru: "Обычный участник",
    hint: { en: "Default user view", ru: "Вид обычного пользователя" },
  },
  {
    key: "teacher",
    en: "Teacher",
    ru: "Преподаватель",
    hint: { en: "LMS instructor view", ru: "Вид преподавателя LMS" },
  },
  {
    key: "expert",
    en: "Expert / reviewer",
    ru: "Эксперт / ревьюер",
    hint: { en: "Reviewer view", ru: "Вид ревьюера" },
  },
  {
    key: "lmsAdmin",
    en: "LMS admin",
    ru: "Админ LMS",
    hint: { en: "Courses sub-admin", ru: "Сабадмин курсов" },
  },
  {
    key: "eventAdmin",
    en: "Events admin",
    ru: "Админ мероприятий",
    hint: { en: "Events sub-admin", ru: "Сабадмин ивентов" },
  },
  {
    key: "innoLabsAdmin",
    en: "InnoLabs admin",
    ru: "Админ InnoLabs",
    hint: { en: "Innovation sub-admin", ru: "Сабадмин InnoLabs" },
  },
];

export function ImpersonationSwitcher({
  trigger,
}: {
  trigger?: React.ReactNode;
}) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const { data: users = [], isFetching } = useQuery<SearchUser[]>({
    queryKey: ["/api/admin/impersonate/users", q],
    queryFn: getQueryFn<SearchUser[]>({ on401: "throw" }),
    enabled: open,
    staleTime: 30_000,
  });

  const start = useMutation({
    mutationFn: async (body: { userId?: string; roleTemplate?: string }) => {
      const res = await apiRequest("/api/admin/impersonate", {
        method: "POST",
        body: JSON.stringify(body),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: language === "ru" ? "Режим просмотра включён" : "Now viewing as another user",
        description:
          language === "ru"
            ? "Все страницы покажутся так, как их видит выбранный пользователь."
            : "Pages will render as the chosen user sees them.",
      });
      setOpen(false);
      // Hard reload so every cached query and the route guard picks up the
      // new effective role from /api/auth/user.
      qc.clear();
      setTimeout(() => window.location.reload(), 200);
    },
    onError: (err: any) => {
      toast({
        title: language === "ru" ? "Ошибка" : "Error",
        description: err?.message || "Failed",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" data-testid="button-open-view-as">
            <Eye className="h-4 w-4 mr-2" />
            {language === "ru" ? "Смотреть как..." : "View as..."}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            {language === "ru" ? "Смотреть платформу как..." : "View the platform as..."}
          </DialogTitle>
          <DialogDescription>
            {language === "ru"
              ? "Временно переключите вид на другого пользователя или роль. Вы остаётесь head-админом — действия пишутся от вашего лица."
              : "Temporarily switch the view to another user or role. You remain the real head admin — actions are still recorded under your account."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <div className="text-xs font-medium uppercase text-muted-foreground mb-2">
              {language === "ru" ? "По роли" : "By role"}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {ROLE_TEMPLATES.map((r) => (
                <Button
                  key={r.key}
                  variant="outline"
                  className="h-auto py-2 px-3 flex flex-col items-start gap-0.5"
                  onClick={() => start.mutate({ roleTemplate: r.key })}
                  disabled={start.isPending}
                  data-testid={`button-view-as-role-${r.key}`}
                >
                  <span className="text-sm font-medium">
                    {language === "ru" ? r.ru : r.en}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {language === "ru" ? r.hint.ru : r.hint.en}
                  </span>
                </Button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium uppercase text-muted-foreground mb-2">
              {language === "ru" ? "По конкретному пользователю" : "By specific user"}
            </div>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={
                  language === "ru"
                    ? "Поиск по имени, email или роли"
                    : "Search by name, email or role"
                }
                className="pl-8"
                data-testid="input-view-as-search"
              />
            </div>
            <ScrollArea className="h-64 mt-2 border rounded-md">
              <div className="p-1">
                {isFetching && (
                  <div className="text-xs text-muted-foreground p-3">
                    {language === "ru" ? "Загрузка..." : "Loading..."}
                  </div>
                )}
                {!isFetching && users.length === 0 && (
                  <div className="text-xs text-muted-foreground p-3">
                    {language === "ru" ? "Никого не найдено" : "No users found"}
                  </div>
                )}
                {users.map((u) => {
                  const name =
                    [u.firstName, u.lastName].filter(Boolean).join(" ") ||
                    u.email ||
                    u.id;
                  const initial = (name?.[0] || "U").toUpperCase();
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => start.mutate({ userId: u.id })}
                      disabled={start.isPending}
                      className="w-full flex items-center gap-3 p-2 rounded-md text-left hover-elevate"
                      data-testid={`button-view-as-user-${u.id}`}
                    >
                      <Avatar className="h-8 w-8">
                        {u.profileImageUrl && (
                          <AvatarImage src={u.profileImageUrl} alt={name} />
                        )}
                        <AvatarFallback>{initial}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {u.email}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 justify-end">
                        {u.isHeadAdmin && (
                          <Badge variant="secondary" className="text-[10px]">
                            head
                          </Badge>
                        )}
                        {u.role && (
                          <Badge variant="outline" className="text-[10px]">
                            {u.role}
                          </Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ImpersonationBanner() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { isImpersonating, impersonation, user } = useAuth();

  const stop = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/api/admin/stop-impersonating", {
        method: "POST",
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: language === "ru" ? "Возврат к head-админу" : "Back to head admin",
      });
      qc.clear();
      setTimeout(() => window.location.reload(), 200);
    },
    onError: (err: any) => {
      toast({
        title: language === "ru" ? "Ошибка" : "Error",
        description: err?.message || "Failed",
        variant: "destructive",
      });
    },
  });

  if (!isImpersonating) return null;

  const realName =
    [impersonation?.realUser.firstName, impersonation?.realUser.lastName]
      .filter(Boolean)
      .join(" ") ||
    impersonation?.realUser.email ||
    "head admin";
  const effName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email ||
    user?.role ||
    "user";

  return (
    <div
      className="sticky top-0 z-40 w-full bg-amber-500/95 text-amber-50 px-3 sm:px-6 py-1.5 flex items-center justify-between gap-3 text-sm border-b border-amber-600"
      data-testid="banner-impersonating"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Eye className="h-4 w-4 flex-shrink-0" />
        <span className="truncate">
          {language === "ru" ? (
            <>
              Вы смотрите как <strong>{effName}</strong>
              {user?.role ? <> ({user.role})</> : null}. Реальный аккаунт:{" "}
              {realName}.
            </>
          ) : (
            <>
              Viewing as <strong>{effName}</strong>
              {user?.role ? <> ({user.role})</> : null}. Real account: {realName}.
            </>
          )}
        </span>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="bg-white/10 border-white/30 text-white hover:bg-white/20"
        onClick={() => stop.mutate()}
        disabled={stop.isPending}
        data-testid="button-stop-impersonating"
      >
        <ShieldOff className="h-4 w-4 mr-1" />
        {language === "ru" ? "Вернуться" : "Stop viewing"}
      </Button>
    </div>
  );
}
