import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GraduationCap, Globe, MapPin, Users, Building, ArrowLeft, Loader2, Rocket, Calendar, Shield, ShieldCheck, UserPlus, Check, X, Settings, Crown, Star } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageSEO } from "@/hooks/usePageSEO";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatEventDate } from "@/lib/dateUtils";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import type { University, Club, Startup, Event, UserUniversityMembership, MembershipPermissions } from "@shared/schema";

type UniversityMemberWithUser = UserUniversityMembership & {
  user?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    profileImageUrl: string | null;
  } | null;
};

export default function UniversityDetail() {
  const [, params] = useRoute("/universities/:slug");
  const [, navigate] = useLocation();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const slug = params?.slug;
  const [editingMember, setEditingMember] = useState<UniversityMemberWithUser | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editPerms, setEditPerms] = useState<MembershipPermissions>({});

  const { data: university, isLoading } = useQuery<University>({
    queryKey: ["/api/universities/by-slug", slug],
    enabled: !!slug,
  });

  const { data: clubs = [] } = useQuery<Club[]>({
    queryKey: ["/api/clubs", { universityId: university?.id }],
    queryFn: async () => {
      const res = await apiRequest(`/api/clubs?universityId=${university!.id}`);
      return res.json();
    },
    enabled: !!university?.id,
  });

  const { data: startups = [] } = useQuery<Startup[]>({
    queryKey: ["/api/universities", university?.id, "startups"],
    queryFn: async () => {
      const res = await apiRequest(`/api/universities/${university!.id}/startups`);
      return res.json();
    },
    enabled: !!university?.id,
  });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/universities", university?.id, "events"],
    queryFn: async () => {
      const res = await apiRequest(`/api/universities/${university!.id}/events`);
      return res.json();
    },
    enabled: !!university?.id,
  });

  const { data: members = [] } = useQuery<UniversityMemberWithUser[]>({
    queryKey: ["/api/universities", university?.id, "members"],
    enabled: !!university?.id,
  });

  const { data: myMembership } = useQuery<UserUniversityMembership | null>({
    queryKey: ["/api/universities", university?.id, "my-membership"],
    queryFn: async () => {
      const res = await apiRequest(`/api/universities/${university!.id}/my-membership`);
      return res.json();
    },
    enabled: !!university?.id && !!user,
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(`/api/universities/${university!.id}/apply`, { method: "POST", body: JSON.stringify({}) });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t("applicationSent") || "Application sent", description: t("applicationPending") || "Your application is pending approval" });
      queryClient.invalidateQueries({ queryKey: ["/api/universities", university?.id, "my-membership"] });
    },
    onError: (err: any) => {
      toast({ title: t("error") || "Error", description: err.message || "Failed to apply", variant: "destructive" });
    },
  });

  const updateMembershipMutation = useMutation({
    mutationFn: async (data: { id: string; status?: string; role?: string; permissions?: MembershipPermissions; universityId: string }) => {
      const res = await apiRequest(`/api/university-memberships/${data.id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t("updated") || "Updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/universities", university?.id, "members"] });
      setEditingMember(null);
    },
    onError: (err: any) => {
      toast({ title: t("error") || "Error", description: err.message || "Failed to update", variant: "destructive" });
    },
  });

  const { language } = useLanguage();

  const setMainOrgMutation = useMutation({
    mutationFn: async (data: { mainOrgType: string | null; mainOrgId: string | null }) => {
      const res = await apiRequest('/api/user/main-organization', { method: "PATCH", body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } });
      return res.json();
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/auth/user'] });
      toast({ title: language === 'ru' ? 'Основная организация обновлена' : 'Main organization updated' });
    },
    onError: (err: any) => {
      toast({ title: t("error") || "Error", description: err.message, variant: "destructive" });
    },
  });

  const isMainOrg = user?.mainOrgType === 'university' && user?.mainOrgId === university?.id;

  usePageSEO({
    title: university?.name || t("universityDetail") || "University Detail",
    description: university?.shortDescription || `${university?.name || ""} - ${t("universitiesTitle") || "Universities"}`,
    keywords: `${university?.name || ""}, university, ${university?.city || ""}, entrepreneurship`,
  });

  const getTypeColor = (type: string | null) => {
    switch (type) {
      case "university": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "hub": return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "acceleratorPartner": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      default: return "";
    }
  };

  const getTypeLabel = (type: string | null) => {
    switch (type) {
      case "university": return t("typeUniversity");
      case "hub": return t("typeHub");
      case "acceleratorPartner": return t("typeAcceleratorPartner");
      default: return type || "";
    }
  };

  const getFocusColor = (focus: string | null) => {
    switch (focus) {
      case "entrepreneurship": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "ai": return "bg-violet-500/10 text-violet-500 border-violet-500/20";
      case "fintech": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "product": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "consulting": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "marketing": return "bg-pink-500/10 text-pink-500 border-pink-500/20";
      case "other": return "bg-gray-500/10 text-gray-500 border-gray-500/20";
      default: return "";
    }
  };

  const myPerms = (myMembership?.permissions as MembershipPermissions) || {};
  const isMyHeadAdmin = myMembership?.role === "headAdmin";
  const isMyAdmin = myMembership?.role === "admin";
  const canManageMembers = isMyHeadAdmin || (isMyAdmin && myPerms.canManageMembers);
  const isApproved = myMembership?.status === "approved";

  const pendingMembers = members.filter(m => m.status === "pending");
  const approvedMembers = members.filter(m => m.status === "approved");

  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case "headAdmin": return <Badge variant="default" data-testid="badge-head-admin"><Crown className="h-3 w-3 mr-1" />{t("headAdmin") || "Head Admin"}</Badge>;
      case "admin": return <Badge variant="secondary" data-testid="badge-admin"><ShieldCheck className="h-3 w-3 mr-1" />{t("admin") || "Admin"}</Badge>;
      case "staff": return <Badge variant="secondary" data-testid="badge-staff"><Shield className="h-3 w-3 mr-1" />{t("staff") || "Staff"}</Badge>;
      case "mentor": return <Badge variant="secondary" data-testid="badge-mentor"><Shield className="h-3 w-3 mr-1" />{t("mentor") || "Mentor"}</Badge>;
      case "alumni": return <Badge variant="outline" data-testid="badge-alumni">{t("alumni") || "Alumni"}</Badge>;
      default: return <Badge variant="outline" data-testid="badge-student">{t("student") || "Student"}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" data-testid="loading-university">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!university) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <GraduationCap className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2" data-testid="text-university-not-found">
          {t("notFound") || "Not Found"}
        </h3>
        <Button onClick={() => navigate("/universities")} data-testid="button-back-to-universities">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("back") || "Back"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      <Button variant="ghost" onClick={() => navigate("/universities")} className="mb-4" data-testid="button-back">
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t("back") || "Back"}
      </Button>

      <Card data-testid="card-university-header">
        <CardHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 min-w-0">
              {university.logoUrl ? (
                <img
                  src={university.logoUrl}
                  alt={university.name}
                  className="h-16 w-16 rounded-md object-cover shrink-0"
                  data-testid="img-university-logo"
                />
              ) : (
                <div className="h-16 w-16 rounded-md bg-muted flex items-center justify-center shrink-0">
                  <GraduationCap className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-2xl font-bold" data-testid="text-university-name">{university.name}</h1>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {university.type && (
                    <Badge variant="outline" className={getTypeColor(university.type)} data-testid="badge-university-type">
                      {getTypeLabel(university.type)}
                    </Badge>
                  )}
                  {university.city && (
                    <Badge variant="secondary" data-testid="badge-university-city">
                      <MapPin className="h-3 w-3 mr-1" />
                      {university.city}{university.region ? `, ${university.region}` : ""}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {user && !myMembership && (
                <Button
                  onClick={() => applyMutation.mutate()}
                  disabled={applyMutation.isPending}
                  data-testid="button-apply-university"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  {applyMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    t("applyToJoin") || "Apply to Join"
                  )}
                </Button>
              )}
              {myMembership?.status === "pending" && (
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20" data-testid="badge-pending">
                  {t("applicationPending") || "Application Pending"}
                </Badge>
              )}
              {isApproved && getRoleBadge(myMembership?.role || null)}
              {isApproved && (
                <Button
                  variant={isMainOrg ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    if (isMainOrg) {
                      setMainOrgMutation.mutate({ mainOrgType: null, mainOrgId: null });
                    } else {
                      setMainOrgMutation.mutate({ mainOrgType: 'university', mainOrgId: university.id });
                    }
                  }}
                  disabled={setMainOrgMutation.isPending}
                  data-testid="button-set-main-org"
                >
                  <Star className={`h-4 w-4 mr-1 ${isMainOrg ? 'fill-current' : ''}`} />
                  {isMainOrg
                    ? (language === 'ru' ? 'Основная организация' : 'Main Organisation')
                    : (language === 'ru' ? 'Сделать основной' : 'Set as Main')}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {university.shortDescription && (
            <p className="text-muted-foreground" data-testid="text-university-description">
              {university.shortDescription}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {university.website && (
              <a
                href={university.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-foreground transition-colors"
                data-testid="link-university-website"
              >
                <Globe className="h-4 w-4" />
                {t("website") || "Website"}
              </a>
            )}
            <span className="flex items-center gap-1" data-testid="text-member-count">
              <Users className="h-4 w-4" />
              {approvedMembers.length} {t("members") || "Members"}
            </span>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="clubs" className="w-full" data-testid="tabs-university-content">
        <TabsList className={`grid w-full ${canManageMembers ? 'grid-cols-5' : 'grid-cols-4'}`} data-testid="tabs-list-university">
          <TabsTrigger value="clubs" data-testid="tab-trigger-clubs">
            {t("clubs") || "Clubs"} ({clubs.length})
          </TabsTrigger>
          <TabsTrigger value="startups" data-testid="tab-trigger-startups">
            {t("startups") || "Startups"} ({startups.length})
          </TabsTrigger>
          <TabsTrigger value="events" data-testid="tab-trigger-events">
            {t("events") || "Events"} ({events.length})
          </TabsTrigger>
          <TabsTrigger value="members" data-testid="tab-trigger-members">
            {t("members") || "Members"} ({approvedMembers.length})
          </TabsTrigger>
          {canManageMembers && (
            <TabsTrigger value="manage" data-testid="tab-trigger-manage">
              <Settings className="h-4 w-4 mr-1" />
              {t("manage") || "Manage"}
              {pendingMembers.length > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs px-1">{pendingMembers.length}</Badge>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="clubs" className="space-y-4">
          {clubs.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="text-no-clubs">
              {t("noClubs") || "No clubs yet"}
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {clubs.map((club) => (
                <Link key={club.id} href={`/clubs/${club.slug}`}>
                  <Card
                    className="hover-elevate transition-all cursor-pointer"
                    data-testid={`card-club-${club.id}`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                            <Building className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <CardTitle className="text-lg line-clamp-1" data-testid={`text-club-name-${club.id}`}>
                            {club.name}
                          </CardTitle>
                        </div>
                        {club.focus && (
                          <Badge variant="outline" className={`shrink-0 ${getFocusColor(club.focus)}`} data-testid={`badge-focus-${club.id}`}>
                            {club.focus}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {club.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3" data-testid={`text-club-desc-${club.id}`}>
                          {club.description}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2">
                        {club.isOfficial && (
                          <Badge variant="secondary" data-testid={`badge-official-${club.id}`}>
                            {t("official") || "Official"}
                          </Badge>
                        )}
                        {club.isPartnerClub && (
                          <Badge variant="secondary" data-testid={`badge-partner-${club.id}`}>
                            {t("partner") || "Partner"}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="startups" className="space-y-4">
          {startups.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="text-no-startups">
              {t("noStartups") || "No startups yet"}
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {startups.map((startup) => (
                <Link key={startup.id} href={`/startups/${startup.id}`}>
                  <Card
                    className="hover-elevate transition-all cursor-pointer"
                    data-testid={`card-startup-${startup.id}`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                            <Rocket className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <CardTitle className="text-lg line-clamp-1" data-testid={`text-startup-name-${startup.id}`}>
                            {startup.name}
                          </CardTitle>
                        </div>
                        {startup.stage && (
                          <Badge variant="outline" className={`shrink-0 ${getFocusColor(startup.vertical || "other")}`} data-testid={`badge-stage-${startup.id}`}>
                            {startup.stage}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {startup.vertical && (
                        <p className="text-sm text-muted-foreground mb-3" data-testid={`text-startup-vertical-${startup.id}`}>
                          {startup.vertical}
                        </p>
                      )}
                      {startup.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-startup-desc-${startup.id}`}>
                          {startup.description}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="text-no-events">
              {t("noEvents") || "No events yet"}
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {events.map((event) => (
                <Link key={event.id} href={`/events/${event.id}`}>
                  <Card
                    className="hover-elevate transition-all cursor-pointer"
                    data-testid={`card-event-${event.id}`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                            <Calendar className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <CardTitle className="text-lg line-clamp-1" data-testid={`text-event-name-${event.id}`}>
                            {event.name}
                          </CardTitle>
                        </div>
                        {event.status && (
                          <Badge variant="outline" className={`shrink-0 ${event.status === "upcoming" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : "bg-gray-500/10 text-gray-500 border-gray-500/20"}`} data-testid={`badge-status-${event.id}`}>
                            {event.status}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {event.date && (
                        <p className="text-sm text-muted-foreground mb-3 flex items-center gap-2" data-testid={`text-event-date-${event.id}`}>
                          <Calendar className="h-4 w-4" />
                          {formatEventDate(event.date, t("language") === "ru" ? "ru" : "en")}
                        </p>
                      )}
                      {event.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-event-desc-${event.id}`}>
                          {event.description}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          {approvedMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="text-no-members">
              {t("noMembers") || "No members yet"}
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {approvedMembers.map((member) => (
                <Card key={member.id} data-testid={`card-member-${member.id}`}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={member.user?.profileImageUrl || undefined} />
                        <AvatarFallback>
                          {(member.user?.firstName?.[0] || "") + (member.user?.lastName?.[0] || "")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <CardTitle className="text-base line-clamp-1" data-testid={`text-member-name-${member.id}`}>
                          {member.user?.firstName} {member.user?.lastName}
                        </CardTitle>
                        <div className="mt-1" data-testid={`text-member-role-${member.id}`}>
                          {getRoleBadge(member.role)}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {member.user?.email && (
                      <p className="text-sm text-muted-foreground truncate" data-testid={`text-member-email-${member.id}`}>
                        {member.user.email}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {canManageMembers && (
          <TabsContent value="manage" className="space-y-6">
            {pendingMembers.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold" data-testid="text-pending-title">
                  {t("pendingApplications") || "Pending Applications"} ({pendingMembers.length})
                </h3>
                <div className="grid gap-3">
                  {pendingMembers.map((member) => (
                    <Card key={member.id} data-testid={`card-pending-${member.id}`}>
                      <CardContent className="flex items-center justify-between gap-4 p-4 flex-wrap">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-10 w-10 shrink-0">
                            <AvatarImage src={member.user?.profileImageUrl || undefined} />
                            <AvatarFallback>
                              {(member.user?.firstName?.[0] || "") + (member.user?.lastName?.[0] || "")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium" data-testid={`text-pending-name-${member.id}`}>
                              {member.user?.firstName} {member.user?.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground truncate" data-testid={`text-pending-email-${member.id}`}>
                              {member.user?.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button
                            size="sm"
                            onClick={() => updateMembershipMutation.mutate({ id: member.id, status: "approved", universityId: university.id })}
                            disabled={updateMembershipMutation.isPending}
                            data-testid={`button-approve-${member.id}`}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            {t("approve") || "Approve"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateMembershipMutation.mutate({ id: member.id, status: "rejected", universityId: university.id })}
                            disabled={updateMembershipMutation.isPending}
                            data-testid={`button-reject-${member.id}`}
                          >
                            <X className="h-4 w-4 mr-1" />
                            {t("reject") || "Reject"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-lg font-semibold" data-testid="text-manage-members-title">
                {t("manageMembers") || "Manage Members"} ({approvedMembers.length})
              </h3>
              <div className="grid gap-3">
                {approvedMembers.map((member) => (
                  <Card key={member.id} data-testid={`card-manage-member-${member.id}`}>
                    <CardContent className="flex items-center justify-between gap-4 p-4 flex-wrap">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarImage src={member.user?.profileImageUrl || undefined} />
                          <AvatarFallback>
                            {(member.user?.firstName?.[0] || "") + (member.user?.lastName?.[0] || "")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium" data-testid={`text-manage-name-${member.id}`}>
                            {member.user?.firstName} {member.user?.lastName}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {getRoleBadge(member.role)}
                            {(member.permissions as MembershipPermissions)?.canCreateEvents && (
                              <Badge variant="outline" className="text-xs">{t("canCreateEvents") || "Events"}</Badge>
                            )}
                            {(member.permissions as MembershipPermissions)?.canCreateVacancies && (
                              <Badge variant="outline" className="text-xs">{t("canCreateVacancies") || "Vacancies"}</Badge>
                            )}
                            {(member.permissions as MembershipPermissions)?.canManageMembers && (
                              <Badge variant="outline" className="text-xs">{t("canManageMembers") || "Members"}</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      {member.role !== "headAdmin" && (
                        <Dialog open={editingMember?.id === member.id} onOpenChange={(open) => {
                          if (open) {
                            setEditingMember(member);
                            setEditRole(member.role || "student");
                            setEditPerms((member.permissions as MembershipPermissions) || {});
                          } else {
                            setEditingMember(null);
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button size="icon" variant="ghost" data-testid={`button-edit-member-${member.id}`}>
                              <Settings className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle data-testid="text-edit-member-title">
                                {t("editMember") || "Edit Member"}: {member.user?.firstName} {member.user?.lastName}
                              </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 mt-4">
                              <div className="space-y-2">
                                <Label>{t("role") || "Role"}</Label>
                                <Select value={editRole} onValueChange={setEditRole}>
                                  <SelectTrigger data-testid="select-role">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="student">{t("student") || "Student"}</SelectItem>
                                    <SelectItem value="alumni">{t("alumni") || "Alumni"}</SelectItem>
                                    <SelectItem value="staff">{t("staff") || "Staff"}</SelectItem>
                                    <SelectItem value="mentor">{t("mentor") || "Mentor"}</SelectItem>
                                    <SelectItem value="admin">{t("admin") || "Admin"}</SelectItem>
                                    {isMyHeadAdmin && (
                                      <SelectItem value="headAdmin">{t("headAdmin") || "Head Admin"}</SelectItem>
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>

                              {(editRole === "admin" || editRole === "staff") && (
                                <div className="space-y-3">
                                  <Label>{t("permissions") || "Permissions"}</Label>
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      id="perm-events"
                                      checked={editPerms.canCreateEvents || false}
                                      onCheckedChange={(checked) => setEditPerms({ ...editPerms, canCreateEvents: !!checked })}
                                      data-testid="checkbox-perm-events"
                                    />
                                    <Label htmlFor="perm-events" className="text-sm font-normal">
                                      {t("canCreateEvents") || "Can Create Events"}
                                    </Label>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      id="perm-vacancies"
                                      checked={editPerms.canCreateVacancies || false}
                                      onCheckedChange={(checked) => setEditPerms({ ...editPerms, canCreateVacancies: !!checked })}
                                      data-testid="checkbox-perm-vacancies"
                                    />
                                    <Label htmlFor="perm-vacancies" className="text-sm font-normal">
                                      {t("canCreateVacancies") || "Can Create Vacancies"}
                                    </Label>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      id="perm-members"
                                      checked={editPerms.canManageMembers || false}
                                      onCheckedChange={(checked) => setEditPerms({ ...editPerms, canManageMembers: !!checked })}
                                      data-testid="checkbox-perm-members"
                                    />
                                    <Label htmlFor="perm-members" className="text-sm font-normal">
                                      {t("canManageMembers") || "Can Manage Members"}
                                    </Label>
                                  </div>
                                </div>
                              )}

                              <div className="flex items-center gap-2 justify-end flex-wrap">
                                <Button variant="outline" onClick={() => setEditingMember(null)} data-testid="button-cancel-edit">
                                  {t("cancel") || "Cancel"}
                                </Button>
                                <Button
                                  onClick={() => updateMembershipMutation.mutate({
                                    id: member.id,
                                    role: editRole,
                                    permissions: editRole === "admin" || editRole === "staff" ? editPerms : {},
                                    universityId: university.id,
                                  })}
                                  disabled={updateMembershipMutation.isPending}
                                  data-testid="button-save-member"
                                >
                                  {updateMembershipMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                  ) : null}
                                  {t("save") || "Save"}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}