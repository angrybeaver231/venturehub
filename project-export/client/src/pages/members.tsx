import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Search, ChevronRight, Filter, Send, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface MemberDirectoryItem {
  id: string;
  tag: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  position: string | null;
  company: string | null;
  category: string | null;
  organizationName: string | null;
  city: string | null;
  role: string;
  isHeadAdmin: boolean;
  isFrozen: boolean;
  profileCompletion?: number;
}

const PAGE_SIZE = 12;

function fullName(m: MemberDirectoryItem) {
  return [m.firstName, m.lastName].filter(Boolean).join(" ") || "—";
}

function initials(m: MemberDirectoryItem) {
  const f = (m.firstName?.[0] || "").toUpperCase();
  const l = (m.lastName?.[0] || "").toUpperCase();
  return (f + l) || "U";
}

function memberId(m: MemberDirectoryItem) {
  if (m.tag) return m.tag.startsWith("@") ? m.tag : `@${m.tag}`;
  return `MEM-${m.id.slice(0, 4).toUpperCase()}`;
}

function roleLabel(m: MemberDirectoryItem, language: "en" | "ru") {
  if (m.isHeadAdmin) return language === "ru" ? "Гл. администратор" : "Head Admin";
  switch (m.role) {
    case "lmsAdmin":
      return language === "ru" ? "LMS Админ" : "LMS Admin";
    case "eventAdmin":
      return language === "ru" ? "Event Админ" : "Event Admin";
    case "innoLabsAdmin":
      return language === "ru" ? "Innovation Админ" : "Innovation Admin";
    case "teacher":
      return language === "ru" ? "Преподаватель" : "Teacher";
    case "expert":
      return language === "ru" ? "Эксперт" : "Expert";
    default:
      return language === "ru" ? "Участник" : "Member";
  }
}

export default function Members() {
  const { language } = useLanguage();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);

  const { data: members = [], isLoading } = useQuery<MemberDirectoryItem[]>({
    queryKey: ["/api/members"],
  });

  const categories = useMemo(() => {
    const set = new Set<string>();
    members.forEach((m) => m.category && set.add(m.category));
    return Array.from(set).sort();
  }, [members]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      if (categoryFilter !== "all" && (m.category || "") !== categoryFilter) return false;
      if (roleFilter !== "all") {
        if (roleFilter === "admin" && !m.isHeadAdmin && !["lmsAdmin", "eventAdmin", "innoLabsAdmin"].includes(m.role)) {
          return false;
        }
        if (roleFilter === "teacher" && m.role !== "teacher") return false;
        if (roleFilter === "member" && (m.isHeadAdmin || m.role !== "member")) return false;
      }
      if (!q) return true;
      const haystack = [
        fullName(m),
        m.position,
        m.company,
        m.organizationName,
        m.category,
        m.city,
        memberId(m),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [members, search, categoryFilter, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto" data-testid="page-members">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-members-title">
          {language === "ru" ? "Участники" : "Members"}
        </h1>
        <div className="text-sm text-muted-foreground">
          <Link href="/dashboard" className="hover:underline" data-testid="link-breadcrumb-dashboard">
            {language === "ru" ? "Главная" : "Dashboard"}
          </Link>
          <span className="mx-1">/</span>
          <span>{language === "ru" ? "Участники" : "Members"}</span>
        </div>
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="p-3 flex flex-col md:flex-row md:items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={language === "ru" ? "Поиск участников" : "Search members"}
              className="pl-9"
              data-testid="input-search-members"
            />
          </div>
          <Button variant="outline" size="icon" className="shrink-0" data-testid="button-filter-toggle">
            <Filter className="h-4 w-4" />
          </Button>
          <Select
            value={categoryFilter}
            onValueChange={(v) => {
              setCategoryFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full md:w-[200px]" data-testid="select-category">
              <SelectValue
                placeholder={language === "ru" ? "Все категории" : "All categories"}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {language === "ru" ? "Все категории" : "All categories"}
              </SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={roleFilter}
            onValueChange={(v) => {
              setRoleFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full md:w-[180px]" data-testid="select-role">
              <SelectValue placeholder={language === "ru" ? "Все роли" : "All roles"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {language === "ru" ? "Все роли" : "All roles"}
              </SelectItem>
              <SelectItem value="member">
                {language === "ru" ? "Участники" : "Members"}
              </SelectItem>
              <SelectItem value="teacher">
                {language === "ru" ? "Преподаватели" : "Teachers"}
              </SelectItem>
              <SelectItem value="admin">
                {language === "ru" ? "Администраторы" : "Admins"}
              </SelectItem>
            </SelectContent>
          </Select>
          <div className="text-xs text-muted-foreground md:ml-auto whitespace-nowrap">
            {language === "ru" ? "Найдено" : "Showing"}{" "}
            <span className="font-semibold text-foreground">{filtered.length}</span>{" "}
            {language === "ru" ? "из" : "of"}{" "}
            <span className="font-semibold text-foreground">{members.length}</span>
          </div>
        </CardContent>
      </Card>

      {/* Card grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-5 space-y-3">
                <div className="h-20 w-20 rounded-full bg-muted mx-auto" />
                <div className="h-3 w-16 bg-muted rounded mx-auto" />
                <div className="h-4 w-32 bg-muted rounded mx-auto" />
                <div className="h-12 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground" data-testid="text-empty-members">
            {language === "ru"
              ? "Никого не нашли. Попробуйте другой запрос."
              : "No members match your filters."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paged.map((m) => (
            <Card
              key={m.id}
              className="hover-elevate cursor-pointer transition-shadow"
              data-testid={`card-member-${m.id}`}
              onClick={() => setActiveMemberId(m.id)}
            >
              <CardContent className="p-5 flex flex-col items-center text-center space-y-3">
                <Avatar className="h-20 w-20 ring-4 ring-primary/15">
                  <AvatarImage src={m.profileImageUrl || undefined} alt={fullName(m)} />
                  <AvatarFallback className="bg-primary/15 text-primary text-lg font-semibold">
                    {initials(m)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-0.5 w-full">
                  <div
                    className="text-[10px] uppercase tracking-wider text-muted-foreground"
                    data-testid={`text-member-id-${m.id}`}
                  >
                    {memberId(m)}
                  </div>
                  <div
                    className="text-base font-semibold truncate"
                    data-testid={`text-member-name-${m.id}`}
                  >
                    {fullName(m)}
                  </div>
                </div>

                <div className="w-full space-y-1.5 text-sm">
                  <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-md bg-muted/40">
                    <span className="text-[11px] text-muted-foreground">
                      {language === "ru" ? "Должность" : "Job Title"}
                    </span>
                    <span className="font-medium truncate text-xs" data-testid={`text-member-position-${m.id}`}>
                      {m.position || "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-md bg-muted/40">
                    <span className="text-[11px] text-muted-foreground">
                      {language === "ru" ? "Организация" : "Department"}
                    </span>
                    <span className="font-medium truncate text-xs" data-testid={`text-member-org-${m.id}`}>
                      {m.company || m.organizationName || m.category || "—"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap justify-center pt-1">
                  <Badge variant="secondary" className="text-[10px]" data-testid={`badge-member-role-${m.id}`}>
                    {roleLabel(m, language)}
                  </Badge>
                  {m.city && (
                    <Badge variant="outline" className="text-[10px]">
                      {m.city}
                    </Badge>
                  )}
                  <Badge
                    className={cn(
                      "text-[10px] border-0",
                      m.isFrozen
                        ? "bg-foreground/85 text-background"
                        : "bg-primary text-primary-foreground",
                    )}
                  >
                    {m.isFrozen
                      ? language === "ru"
                        ? "Заморожен"
                        : "Inactive"
                      : language === "ru"
                      ? "Активен"
                      : "Active"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeMemberId && (
        <MemberDetailDialog
          id={activeMemberId}
          language={language}
          onClose={() => setActiveMemberId(null)}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 flex-wrap pt-2">
          <div className="text-xs text-muted-foreground">
            {language === "ru" ? "Страница" : "Page"}{" "}
            <span className="font-semibold text-foreground">{page}</span>{" "}
            {language === "ru" ? "из" : "of"}{" "}
            <span className="font-semibold text-foreground">{totalPages}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              data-testid="button-prev-page"
            >
              {language === "ru" ? "Назад" : "Previous"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              data-testid="button-next-page"
            >
              {language === "ru" ? "Далее" : "Next"}
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface MemberDetail {
  id: string;
  tag: string | null;
  firstName: string | null;
  lastName: string | null;
  patronymic: string | null;
  profileImageUrl: string | null;
  position: string | null;
  company: string | null;
  category: string | null;
  organizationName: string | null;
  faculty: string | null;
  city: string | null;
  role: string;
  isHeadAdmin: boolean;
  isFounder: boolean;
  isSpeaker: boolean;
  isPartner: boolean;
  isResident: boolean;
  aboutMe: string | null;
  interests: string | null;
  skills: string | null;
  previousStartups: string | null;
  pitchDeckLink: string | null;
  telegramUsername: string | null;
}

function MemberDetailDialog({ id, language, onClose }: { id: string; language: "en" | "ru"; onClose: () => void }) {
  const t = (ru: string, en: string) => (language === "ru" ? ru : en);
  const { data: m, isLoading } = useQuery<MemberDetail>({ queryKey: ["/api/members", id] });

  const Section = ({ title, value }: { title: string; value?: string | null }) =>
    value ? (
      <div className="space-y-1">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</div>
        <div className="text-sm whitespace-pre-wrap">{value}</div>
      </div>
    ) : null;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="dialog-member-detail">
        {isLoading || !m ? (
          <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <Avatar className="h-16 w-16 ring-4 ring-primary/15">
                  <AvatarImage src={m.profileImageUrl || undefined} />
                  <AvatarFallback className="bg-primary/15 text-primary text-lg font-semibold">
                    {((m.firstName?.[0] || "") + (m.lastName?.[0] || "")).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <DialogTitle data-testid="text-member-detail-name">
                    {[m.firstName, m.patronymic, m.lastName].filter(Boolean).join(" ")}
                  </DialogTitle>
                  <div className="text-sm text-muted-foreground">
                    {[m.position, m.company || m.organizationName].filter(Boolean).join(" · ")}
                    {m.city && <> · {m.city}</>}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {m.tag && <Badge variant="outline" className="text-xs">@{m.tag.replace(/^@/, "")}</Badge>}
                    {m.category && <Badge variant="outline" className="text-xs">{m.category}</Badge>}
                    {m.isFounder && <Badge variant="outline" className="text-xs">{t("Фаундер", "Founder")}</Badge>}
                    {m.isSpeaker && <Badge variant="outline" className="text-xs">{t("Спикер", "Speaker")}</Badge>}
                    {m.isPartner && <Badge variant="outline" className="text-xs">{t("Партнёр", "Partner")}</Badge>}
                    {m.isResident && <Badge variant="outline" className="text-xs">{t("Резидент", "Resident")}</Badge>}
                  </div>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              <Section title={t("О себе", "About")} value={m.aboutMe} />
              <Section title={t("Кого ищет / интересы", "Looking for / interests")} value={m.interests} />
              <Section title={t("Компетенции / навыки", "Skills")} value={m.skills} />
              <Section title={t("Прошлые стартапы", "Previous startups")} value={m.previousStartups} />
              {m.faculty && <Section title={t("Факультет", "Faculty")} value={m.faculty} />}
              {m.pitchDeckLink && (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("Pitch deck", "Pitch deck")}</div>
                  <a href={m.pitchDeckLink} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline break-all">
                    {m.pitchDeckLink}
                  </a>
                </div>
              )}
            </div>

            {m.telegramUsername && (
              <div className="flex gap-2 pt-4 border-t mt-4 flex-wrap">
                <a
                  href={`https://t.me/${m.telegramUsername.replace(/^@/, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  data-testid="link-member-telegram"
                >
                  <Button size="sm">
                    <Send className="h-4 w-4 mr-1.5" />
                    {t("Написать в Telegram", "Message on Telegram")} @{m.telegramUsername.replace(/^@/, "")}
                  </Button>
                </a>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
