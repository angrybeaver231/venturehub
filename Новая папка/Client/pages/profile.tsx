import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageSEO } from "@/hooks/usePageSEO";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Building2,
  Save,
  RotateCcw,
  MapPin,
  Briefcase,
  Heart,
  AtSign,
  GraduationCap,
  Trash2,
  ExternalLink,
  Star,
  Mail,
  Sparkles,
  Camera,
  Loader2,
} from "lucide-react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { UpdateProfileInput } from "@shared/schema";
import {
  computeProfileCompleteness,
  ProgressRing,
  StatRingCard,
  CompletenessChecklist,
} from "@/components/profile-completeness";

function UniversityCommunityCard({ userId }: { userId: string }) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: universityMemberships = [] } = useQuery<any[]>({
    queryKey: ['/api/users', userId, 'university-memberships'],
    queryFn: () => fetch(`/api/users/${userId}/university-memberships`).then(r => r.json()),
    enabled: !!userId,
  });

  const { data: clubMemberships = [] } = useQuery<any[]>({
    queryKey: ['/api/users', userId, 'club-memberships'],
    queryFn: () => fetch(`/api/users/${userId}/club-memberships`).then(r => r.json()),
    enabled: !!userId,
  });

  const deleteUniversityMembershipMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/api/university-memberships/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId, 'university-memberships'] });
      toast({ title: t("success") });
    },
  });

  const deleteClubMembershipMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/api/club-memberships/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId, 'club-memberships'] });
      toast({ title: t("success") });
    },
  });

  const setMainOrgMutation = useMutation({
    mutationFn: async (data: { mainOrgType: string | null; mainOrgId: string | null }) => {
      const res = await apiRequest('/api/user/main-organization', { method: "PATCH", body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } });
      return res.json();
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/auth/user'] });
      toast({ title: language === 'ru' ? 'Основная организация обновлена' : 'Main organization updated' });
    },
  });

  const isMainOrg = (type: string, id: string) => {
    return user?.mainOrgType === type && user?.mainOrgId === id;
  };

  const handleSetMain = (type: string, id: string) => {
    if (isMainOrg(type, id)) {
      setMainOrgMutation.mutate({ mainOrgType: null, mainOrgId: null });
    } else {
      setMainOrgMutation.mutate({ mainOrgType: type, mainOrgId: id });
    }
  };

  const hasAnyMembership = universityMemberships.length > 0 || clubMemberships.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 min-w-0">
          <GraduationCap className="h-5 w-5 shrink-0" />
          <span className="truncate">{t("universityAndCommunity")}</span>
        </CardTitle>
        <CardDescription>
          {language === 'ru' ? 'Нажмите звезду, чтобы установить организацию как основную — её логотип и название появятся в боковой панели.' : 'Click the star to set an organization as your main — its logo and name will appear in the sidebar.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {universityMemberships.length > 0 && (
          <div className="space-y-3">
            <Label>{t("universitiesTitle")}</Label>
            <div className="space-y-2">
              {universityMemberships.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between gap-2 rounded-md border p-2 min-w-0" data-testid={`row-university-membership-${m.id}`}>
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <span className="text-sm font-medium truncate">{m.universityName || m.universityId}</span>
                    <Badge variant="secondary" className="shrink-0">{m.role}</Badge>
                    {isMainOrg('university', m.universityId) && (
                      <Badge variant="default" className="shrink-0">{language === 'ru' ? 'Основная' : 'Main'}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleSetMain('university', m.universityId)}
                      disabled={setMainOrgMutation.isPending}
                      aria-label={isMainOrg('university', m.universityId) ? (language === 'ru' ? 'Снять как основную организацию' : 'Unset as main organization') : (language === 'ru' ? 'Установить как основную организацию' : 'Set as main organization')}
                      data-testid={`button-set-main-university-${m.universityId}`}
                    >
                      <Star className={`h-4 w-4 ${isMainOrg('university', m.universityId) ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => deleteUniversityMembershipMutation.mutate(m.id)}
                      disabled={deleteUniversityMembershipMutation.isPending}
                      data-testid={`button-delete-university-membership-${m.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {clubMemberships.length > 0 && (
          <div className="space-y-3">
            <Label>{t("clubsTitle")}</Label>
            <div className="space-y-2">
              {clubMemberships.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between gap-2 rounded-md border p-2 min-w-0" data-testid={`row-club-membership-${m.id}`}>
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <span className="text-sm font-medium truncate">{m.clubName || m.clubId}</span>
                    <Badge variant="secondary" className="shrink-0">{m.role}</Badge>
                    {isMainOrg('club', m.clubId) && (
                      <Badge variant="default" className="shrink-0">{language === 'ru' ? 'Основная' : 'Main'}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleSetMain('club', m.clubId)}
                      disabled={setMainOrgMutation.isPending}
                      aria-label={isMainOrg('club', m.clubId) ? (language === 'ru' ? 'Снять как основную организацию' : 'Unset as main organization') : (language === 'ru' ? 'Установить как основную организацию' : 'Set as main organization')}
                      data-testid={`button-set-main-club-${m.clubId}`}
                    >
                      <Star className={`h-4 w-4 ${isMainOrg('club', m.clubId) ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => deleteClubMembershipMutation.mutate(m.id)}
                      disabled={deleteClubMembershipMutation.isPending}
                      data-testid={`button-delete-club-membership-${m.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {user?.mainOrgType && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setMainOrgMutation.mutate({ mainOrgType: null, mainOrgId: null })}
            disabled={setMainOrgMutation.isPending}
            data-testid="button-clear-main-org"
          >
            {language === 'ru' ? 'Сбросить основную организацию (вернуть стандартный интерфейс)' : 'Reset main organization (restore default branding)'}
          </Button>
        )}

        {!hasAnyMembership && (
          <p className="text-sm text-muted-foreground" data-testid="text-no-memberships">
            {language === 'ru' ? 'Вы ещё не состоите ни в одной организации.' : 'You haven\'t joined any organizations yet.'}
          </p>
        )}

        <Link href="/universities" data-testid="link-browse-universities">
          <Button variant="outline" size="sm" className="w-full">
            <ExternalLink className="h-4 w-4 mr-1" />
            {language === 'ru' ? 'Обзор университетов и клубов' : 'Browse Universities & Clubs'}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function MainOrgBadge() {
  const { user } = useAuth();
  const { language } = useLanguage();

  const { data: branding } = useQuery<{ name: string; logoUrl: string | null; type: string; id: string } | null>({
    queryKey: ['/api/user/main-organization/branding'],
    enabled: !!user?.mainOrgType,
  });

  if (!branding) return null;

  const typeLabel = branding.type === 'club'
    ? (language === 'ru' ? 'Клуб' : 'Club')
    : branding.type === 'university'
    ? (language === 'ru' ? 'Университет' : 'University')
    : (language === 'ru' ? 'Компания' : 'Company');

  return (
    <div className="flex items-center gap-2 mt-1 flex-wrap">
      <Star className="h-4 w-4 fill-yellow-500 text-yellow-500 shrink-0" />
      <span className="text-sm text-muted-foreground">
        {language === 'ru' ? 'Основная организация:' : 'Main organisation:'}
      </span>
      <Badge variant="secondary" className="gap-1">
        {branding.logoUrl && (
          <img src={branding.logoUrl} alt={branding.name} className="h-4 w-4 rounded-sm object-cover" />
        )}
        {branding.name}
      </Badge>
      <Badge variant="outline" className="text-xs">{typeLabel}</Badge>
    </div>
  );
}

function PersonalInfoRow({
  icon: Icon,
  label,
  value,
  empty,
  testId,
}: {
  icon: React.ElementType;
  label: string;
  value?: string | null;
  empty: string;
  testId: string;
}) {
  const filled = !!(value && value.trim().length > 0);
  return (
    <div className="flex items-start gap-3" data-testid={testId}>
      <div className="h-9 w-9 shrink-0 rounded-md bg-primary/10 text-primary flex items-center justify-center">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-sm font-medium truncate ${filled ? "" : "text-muted-foreground italic"}`}>
          {filled ? value : empty}
        </div>
      </div>
    </div>
  );
}

export default function Profile() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();

  usePageSEO({
    title: 'My Profile | Мой профиль',
    description: 'Manage your Business Club profile information. Update personal details and organization affiliation. Управление информацией профиля Предпринимательского Клуба.',
    keywords: 'profile, user profile, account settings, профиль, настройки аккаунта'
  });

  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    patronymic: user?.patronymic || "",
    organizationType: user?.organizationType || "",
    organizationName: user?.organizationName || "",
    faculty: user?.faculty || "",
    groupNumber: user?.groupNumber || "",
    city: user?.city || "",
    company: user?.company || "",
    category: user?.category || "",
    position: user?.position || "",
    interests: user?.interests || "",
    aboutMe: user?.aboutMe || "",
    telegramUsername: user?.telegramUsername || "",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        patronymic: user.patronymic || "",
        organizationType: user.organizationType || "",
        organizationName: user.organizationName || "",
        faculty: user.faculty || "",
        groupNumber: user.groupNumber || "",
        city: user.city || "",
        company: user.company || "",
        category: user.category || "",
        position: user.position || "",
        interests: user.interests || "",
        aboutMe: user.aboutMe || "",
        telegramUsername: user.telegramUsername || "",
      });
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateProfileInput) => {
      return await apiRequest("/api/user/profile", {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: t("success"),
        description: t("profileUpdated"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("error"),
        description: error.message || t("somethingWentWrong"),
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, string | null> = {};
    for (const [key, raw] of Object.entries(formData)) {
      const trimmed = (raw ?? "").trim();
      payload[key] = trimmed.length > 0 ? trimmed : null;
    }
    updateProfileMutation.mutate(payload as unknown as UpdateProfileInput);
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({
        title: t("error"),
        description: language === "ru" ? "Выберите файл изображения" : "Please choose an image file",
        variant: "destructive",
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t("error"),
        description: language === "ru" ? "Файл должен быть меньше 5 МБ" : "Image must be smaller than 5 MB",
        variant: "destructive",
      });
      return;
    }
    setIsUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      const res = await fetch("/api/user/avatar", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: t("success"),
        description: language === "ru" ? "Фото профиля обновлено" : "Profile photo updated",
      });
    } catch (err: any) {
      toast({
        title: t("error"),
        description: err.message || t("somethingWentWrong"),
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleOrganizationTypeChange = (value: string) => {
    setFormData({
      ...formData,
      organizationType: value,
      organizationName: "",
      faculty: (value === "financial_university" || value === "financial-university") ? formData.faculty : "",
      groupNumber: (value === "financial_university" || value === "financial-university") ? formData.groupNumber : "",
    });
  };

  const completeness = useMemo(() => computeProfileCompleteness(user), [user]);

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-semibold mb-2">{t("login")}</h2>
          <p className="text-muted-foreground">{t("loginRequired")}</p>
        </div>
      </div>
    );
  }

  const fullName = [user.lastName, user.firstName, user.patronymic]
    .filter((s) => s && s.trim().length > 0)
    .join(" ") || (language === "ru" ? "Без имени" : "No name yet");

  const initials = ((user.firstName?.[0] || "") + (user.lastName?.[0] || "")).toUpperCase() || "U";

  const roleLabel = user.isHeadAdmin
    ? (language === "ru" ? "Главный админ" : "Head Admin")
    : (user.role || t("profileMember"));

  const sectionPercent = (key: string) => {
    const sec = completeness.sections.find((s) => s.key === key);
    if (!sec || sec.fields.length === 0) return 0;
    const f = sec.fields.filter((x) => x.filled).length;
    return Math.round((f / sec.fields.length) * 100);
  };

  return (
    <div className="container mx-auto px-3 sm:px-6 py-6 max-w-7xl space-y-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1" data-testid="text-profile-title">{t("myProfile")}</h1>
          <p className="text-muted-foreground text-sm">{t("editProfile")}</p>
        </div>
      </div>

      {/* Hero + Personal Info side panel + Stats grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN — identity + personal info (Figma left panel) */}
        <div className="lg:col-span-4 space-y-6">
          <Card data-testid="card-profile-hero">
            <CardContent className="pt-6 flex flex-col items-center text-center gap-3">
              <div className="relative">
                <Avatar className="h-32 w-32 rounded-md">
                  <AvatarImage src={user.profileImageUrl || undefined} alt={fullName} className="object-cover" />
                  <AvatarFallback className="rounded-md text-2xl bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarFileChange}
                  data-testid="input-avatar-file"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="default"
                  className="absolute -bottom-1 -right-1 rounded-full shadow-md"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  aria-label={language === "ru" ? "Загрузить фото профиля" : "Upload profile photo"}
                  data-testid="button-upload-avatar"
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                data-testid="button-change-photo"
              >
                {isUploadingAvatar
                  ? (language === "ru" ? "Загрузка…" : "Uploading…")
                  : (language === "ru" ? "Изменить фото" : "Change photo")}
              </button>
              <div className="space-y-1 min-w-0 w-full">
                <div className="text-lg font-bold truncate" data-testid="text-profile-fullname">{fullName}</div>
                <div className="text-sm text-muted-foreground truncate">
                  {user.position || user.category || roleLabel}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-center">
                {user.tag && (
                  <Badge variant="secondary" className="gap-1">
                    <AtSign className="h-3 w-3" />
                    {user.tag}
                  </Badge>
                )}
                <Badge variant="outline" className="border-primary/40 text-primary">
                  {t("profileActive")}
                </Badge>
              </div>
              {user.mainOrgType && (
                <div className="w-full pt-2 border-t">
                  <MainOrgBadge />
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-personal-info">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 min-w-0 text-base">
                <User className="h-4 w-4 shrink-0" />
                <span className="truncate">{t("personalInformation")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <PersonalInfoRow
                icon={Mail}
                label={language === "ru" ? "Email" : "Email"}
                value={user.email}
                empty="—"
                testId="info-email"
              />
              <PersonalInfoRow
                icon={MapPin}
                label={t("city")}
                value={user.city}
                empty={language === "ru" ? "Не указан" : "Not set"}
                testId="info-city"
              />
              <PersonalInfoRow
                icon={Building2}
                label={t("company")}
                value={user.company}
                empty={language === "ru" ? "Не указана" : "Not set"}
                testId="info-company"
              />
              <PersonalInfoRow
                icon={Briefcase}
                label={t("userPosition")}
                value={user.position}
                empty={language === "ru" ? "Не указана" : "Not set"}
                testId="info-position"
              />
              <PersonalInfoRow
                icon={GraduationCap}
                label={t("organizationType")}
                value={
                  (user.organizationType === "financial_university" || user.organizationType === "financial-university")
                    ? (language === "ru" ? "Финансовый университет" : "Financial University")
                    : user.organizationName || undefined
                }
                empty={language === "ru" ? "Не указана" : "Not set"}
                testId="info-organization"
              />
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN — stats grid + completeness checklist (Figma center panel) */}
        <div className="lg:col-span-8 space-y-6">
          {/* KPI ring stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="grid-completeness-stats">
            <StatRingCard
              label={t("overallProgress")}
              value={`${completeness.percent}%`}
              subtitle={`${completeness.filled}/${completeness.total}`}
              percent={completeness.percent}
              highlight
              testId="ring-overall"
            />
            <StatRingCard
              label={t("identityProgress")}
              value={`${sectionPercent("identity")}%`}
              percent={sectionPercent("identity")}
              testId="ring-identity"
            />
            <StatRingCard
              label={t("workProgress")}
              value={`${sectionPercent("work")}%`}
              percent={sectionPercent("work")}
              testId="ring-work"
            />
            <StatRingCard
              label={t("aboutProgress")}
              value={`${sectionPercent("about")}%`}
              percent={sectionPercent("about")}
              testId="ring-about"
            />
          </div>

          {/* Profile completeness — featured card */}
          <Card className="overflow-hidden" data-testid="card-profile-completeness">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                {t("profileCompleteness")}
              </CardTitle>
              <CardDescription>{t("completeYourProfile")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                <div className="shrink-0 flex flex-col items-center gap-2">
                  <ProgressRing percent={completeness.percent} size={170} stroke={14}>
                    <div className="flex flex-col items-center leading-none">
                      <span className="text-4xl font-bold tabular-nums">{completeness.percent}%</span>
                      <span className="text-xs text-muted-foreground mt-2">
                        {completeness.filled}/{completeness.total} {t("fieldsCompleted")}
                      </span>
                    </div>
                  </ProgressRing>
                </div>
                <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                  <CompletenessChecklist sections={completeness.sections} language={language as "en" | "ru"} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Editable form section */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Information (editable) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 min-w-0">
                <User className="h-5 w-5 shrink-0" />
                <span className="truncate">{t("personalInformation")}</span>
              </CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">{t("firstName")}</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder={t("firstNamePlaceholder")}
                    data-testid="input-profile-firstname"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">{t("lastName")}</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder={t("lastNamePlaceholder")}
                    data-testid="input-profile-lastname"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="patronymic">{t("patronymic")}</Label>
                <Input
                  id="patronymic"
                  value={formData.patronymic}
                  onChange={(e) => setFormData({ ...formData, patronymic: e.target.value })}
                  placeholder={t("patronymicPlaceholder")}
                  data-testid="input-profile-patronymic"
                />
              </div>
            </CardContent>
          </Card>

          {/* Organization */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 min-w-0">
                <Building2 className="h-5 w-5 shrink-0" />
                <span className="truncate">{t("organizationInformation")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="organizationType">{t("organizationType")}</Label>
                <Select value={formData.organizationType} onValueChange={handleOrganizationTypeChange}>
                  <SelectTrigger id="organizationType" data-testid="select-profile-organization">
                    <SelectValue placeholder={t("selectOrganization")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="financial_university">{t("financialUniversityOption")}</SelectItem>
                    <SelectItem value="other_university">{t("otherUniversityOption")}</SelectItem>
                    <SelectItem value="school">{t("schoolOption")}</SelectItem>
                    <SelectItem value="workplace">{t("workplaceOption")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.organizationType && formData.organizationType !== "financial_university" && formData.organizationType !== "financial-university" && (
                <div className="space-y-2">
                  <Label htmlFor="organizationName">
                    {formData.organizationType === "other_university" && t("universityName")}
                    {formData.organizationType === "school" && t("schoolName")}
                    {formData.organizationType === "workplace" && t("workplaceName")}
                  </Label>
                  <Input
                    id="organizationName"
                    value={formData.organizationName}
                    onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                    placeholder={
                      formData.organizationType === "other_university"
                        ? t("universityNamePlaceholder")
                        : formData.organizationType === "school"
                        ? t("schoolNamePlaceholder")
                        : t("workplaceNamePlaceholder")
                    }
                    data-testid="input-profile-organization-name"
                  />
                </div>
              )}

              {(formData.organizationType === "financial_university" || formData.organizationType === "financial-university") && (
                <div className="space-y-2">
                  <Label htmlFor="faculty">{t("faculty")}</Label>
                  <Select value={formData.faculty} onValueChange={(value) => setFormData({ ...formData, faculty: value })}>
                    <SelectTrigger id="faculty" data-testid="select-profile-faculty">
                      <SelectValue placeholder={t("selectFaculty")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="higher_school_management">{t("facultyHigherSchoolManagement")}</SelectItem>
                      <SelectItem value="international_relations">{t("facultyInternationalRelations")}</SelectItem>
                      <SelectItem value="tax_audit_business">{t("facultyTaxAuditBusiness")}</SelectItem>
                      <SelectItem value="law">{t("facultyLaw")}</SelectItem>
                      <SelectItem value="social_sciences">{t("facultySocialSciences")}</SelectItem>
                      <SelectItem value="it">{t("facultyIT")}</SelectItem>
                      <SelectItem value="finance">{t("facultyFinance")}</SelectItem>
                      <SelectItem value="economics_business">{t("facultyEconomicsBusiness")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="space-y-2 pt-2">
                    <Label htmlFor="groupNumber">{t("groupNumber")}</Label>
                    <Input
                      id="groupNumber"
                      value={formData.groupNumber}
                      onChange={(e) => setFormData({ ...formData, groupNumber: e.target.value })}
                      placeholder={t("groupNumberPlaceholder")}
                      maxLength={32}
                      data-testid="input-profile-group-number"
                    />
                    <p className="text-xs text-muted-foreground">{t("groupNumberHelp")}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Work */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                {t("work")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">
                    <MapPin className="h-4 w-4 inline mr-1" />
                    {t("city")}
                  </Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder={t("cityPlaceholder")}
                    data-testid="input-profile-city"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">{t("company")}</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder={t("companyPlaceholder")}
                    data-testid="input-profile-company"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">{t("userCategory")}</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger id="category" data-testid="select-profile-category">
                      <SelectValue placeholder={t("selectCategory")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="investor">{t("categoryInvestor")}</SelectItem>
                      <SelectItem value="founder">{t("categoryFounder")}</SelectItem>
                      <SelectItem value="ceo">{t("categoryCEO")}</SelectItem>
                      <SelectItem value="cto">{t("categoryCTO")}</SelectItem>
                      <SelectItem value="developer">{t("categoryDeveloper")}</SelectItem>
                      <SelectItem value="designer">{t("categoryDesigner")}</SelectItem>
                      <SelectItem value="manager">{t("categoryManager")}</SelectItem>
                      <SelectItem value="student">{t("categoryStudent")}</SelectItem>
                      <SelectItem value="other">{t("categoryOther")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">{t("userPosition")}</Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    placeholder={t("userPositionPlaceholder")}
                    data-testid="input-profile-position"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* About / Interests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                {t("interests")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="interests">{t("lookingFor")}</Label>
                <Textarea
                  id="interests"
                  value={formData.interests}
                  onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
                  placeholder={t("interestsPlaceholder")}
                  rows={3}
                  data-testid="input-profile-interests"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="aboutMe">{t("aboutMe")}</Label>
                <Textarea
                  id="aboutMe"
                  value={formData.aboutMe}
                  onChange={(e) => setFormData({ ...formData, aboutMe: e.target.value })}
                  placeholder={t("aboutMePlaceholder")}
                  rows={3}
                  data-testid="input-profile-aboutme"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telegramUsername">Telegram username</Label>
                <Input
                  id="telegramUsername"
                  value={formData.telegramUsername}
                  onChange={(e) => setFormData({ ...formData, telegramUsername: e.target.value.replace(/^@/, "") })}
                  placeholder="username (без @)"
                  data-testid="input-profile-telegram"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Button
          type="submit"
          className="w-full md:w-auto"
          disabled={updateProfileMutation.isPending}
          data-testid="button-update-profile"
        >
          <Save className="h-4 w-4 mr-2" />
          {updateProfileMutation.isPending ? t("updating") : t("updateProfile")}
        </Button>
      </form>

      <UniversityCommunityCard userId={user.id} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            {t("platformHelp")}
          </CardTitle>
          <CardDescription>{t("platformHelpDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={() => {
              localStorage.removeItem("onboardingTourCompleted");
              window.location.reload();
            }}
            data-testid="button-restart-tour"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {t("restartTour")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
