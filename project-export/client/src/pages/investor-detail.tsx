import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, ArrowLeft, Sparkles, Globe, MapPin, DollarSign, Users, Trash2, Mail, UserPlus, Clock, X } from "lucide-react";
import { VitalityScore } from "@/components/vitality-score";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Investor, InvestorInvitation, Startup } from "@shared/schema";
import { INVESTOR_MEMBER_ROLES } from "@shared/schema";
import { VerifiedMrrBadge } from "@/components/verified-mrr-badge";
import { FinancialMiniStats } from "@/components/financial-story-card";
import { WatchlistsPanel } from "@/components/watchlists-panel";

type InvestorDetail = Investor & {
  creatorImage: string | null;
  members: Array<{ id: string; userId: string; role: string; firstName: string | null; lastName: string | null; email: string | null }>;
};

type ThesisMatch = {
  startupId: string;
  score: number;
  fit: string;
  startup: Startup | null;
};

export default function InvestorDetailPage() {
  const [, params] = useRoute("/investors/:id");
  const id = params?.id;
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const ru = language === "ru";
  const [matches, setMatches] = useState<ThesisMatch[]>([]);
  const [editThesis, setEditThesis] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("analyst");

  const { data: inv, isLoading } = useQuery<InvestorDetail>({
    queryKey: ["/api/investors", id],
    enabled: !!id,
  });

  const myMembership = inv?.members.find(m => m.userId === user?.id);
  const canManage =
    !!user?.isHeadAdmin ||
    user?.role === "innoLabsAdmin" ||
    myMembership?.role === "headAdmin" ||
    myMembership?.role === "managingPartner";

  const { data: invitations = [] } = useQuery<InvestorInvitation[]>({
    queryKey: ["/api/investors", id, "invitations"],
    queryFn: async () => {
      const res = await fetch(`/api/investors/${id}/invitations`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id && !!canManage,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<Investor>) => {
      const res = await apiRequest(`/api/investors/${id}`, { method: "PATCH", body: JSON.stringify(updates) });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investors", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/investors"] });
      setEditThesis(null);
      toast({ title: t("success") });
    },
  });

  const matchMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/api/ai/thesis-match", {
        method: "POST",
        body: JSON.stringify({ thesis: inv?.thesis || "", language, topK: 8 }),
      });
      return res.json();
    },
    onSuccess: (data: { matches: ThesisMatch[] }) => {
      setMatches(data.matches);
    },
    onError: (e: any) => {
      toast({ title: t("error"), description: e.message, variant: "destructive" });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (payload: { email: string; role: string }) => {
      const res = await apiRequest(`/api/investors/${id}/invitations`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investors", id, "invitations"] });
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("analyst");
      toast({ title: ru ? "Приглашение отправлено" : "Invitation sent" });
    },
    onError: (e: any) => {
      toast({ title: t("error"), description: e.message, variant: "destructive" });
    },
  });

  const cancelInviteMutation = useMutation({
    mutationFn: async (invId: string) => {
      const res = await apiRequest(`/api/investors/${id}/invitations/${invId}`, { method: "DELETE" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investors", id, "invitations"] });
      toast({ title: ru ? "Приглашение отменено" : "Invitation cancelled" });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const res = await apiRequest(`/api/investors/${id}/members/${memberId}`, { method: "DELETE" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investors", id] });
      toast({ title: ru ? "Участник удалён" : "Member removed" });
    },
    onError: (e: any) => {
      toast({ title: t("error"), description: e.message, variant: "destructive" });
    },
  });

  if (isLoading || !inv) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  const avatarSrc = inv.logo || inv.creatorImage || undefined;
  const pendingInvites = invitations.filter(i => i.status === "pending");

  return (
    <div className="space-y-6">
      <Link href="/investors">
        <Button variant="ghost" size="sm" data-testid="button-back-investors">
          <ArrowLeft className="h-4 w-4 mr-1" /> {ru ? "Все инвесторы" : "All investors"}
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-4 flex-wrap">
            <Avatar className="h-16 w-16">
              {avatarSrc ? <AvatarImage src={avatarSrc} /> : null}
              <AvatarFallback>{inv.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-2xl" data-testid="text-investor-detail-name">{inv.name}</CardTitle>
              <div className="flex flex-wrap gap-2 mt-2 text-sm text-muted-foreground">
                <Badge variant="secondary">{inv.kind}</Badge>
                {inv.hqCity && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{inv.hqCity}</span>}
                {(inv.checkSizeMin || inv.checkSizeMax) && (
                  <span className="inline-flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    {inv.checkSizeMin ? `$${(inv.checkSizeMin / 1000).toFixed(0)}k` : "?"}
                    {" – "}
                    {inv.checkSizeMax ? `$${(inv.checkSizeMax / 1000).toFixed(0)}k` : "?"}
                  </span>
                )}
                {inv.website && (
                  <a href={inv.website.startsWith("http") ? inv.website : `https://${inv.website}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">
                    <Globe className="h-3 w-3" />{inv.website}
                  </a>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
              <h3 className="font-semibold">{ru ? "Инвестиционный тезис" : "Investment thesis"}</h3>
              {editThesis === null ? (
                <Button size="sm" variant="outline" onClick={() => setEditThesis(inv.thesis || "")} data-testid="button-edit-thesis">
                  {t("edit")}
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditThesis(null)}>{t("cancel")}</Button>
                  <Button size="sm" onClick={() => updateMutation.mutate({ thesis: editThesis })} disabled={updateMutation.isPending} data-testid="button-save-thesis">
                    {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                    {t("save")}
                  </Button>
                </div>
              )}
            </div>
            {editThesis === null ? (
              <p className="text-sm text-muted-foreground whitespace-pre-line" data-testid="text-investor-thesis-detail">
                {inv.thesis || (ru ? "Тезис не указан." : "No thesis specified yet.")}
              </p>
            ) : (
              <Textarea value={editThesis} onChange={(e) => setEditThesis(e.target.value)} rows={5} data-testid="input-edit-thesis" />
            )}
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
              <h3 className="font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                {ru ? "Подбор стартапов под тезис" : "AI startup matching"}
              </h3>
              <Button
                size="sm"
                onClick={() => matchMutation.mutate()}
                disabled={!inv.thesis || matchMutation.isPending}
                data-testid="button-run-match"
              >
                {matchMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                {ru ? "Найти подходящие стартапы" : "Find matching startups"}
              </Button>
            </div>
            {!inv.thesis && (
              <p className="text-sm text-muted-foreground">
                {ru ? "Сначала добавьте инвестиционный тезис." : "Add an investment thesis first."}
              </p>
            )}
            {matches.length > 0 && (
              <div className="space-y-2 mt-3">
                {matches.map((m) => (
                  <Card key={m.startupId} data-testid={`row-match-${m.startupId}`}>
                    <CardContent className="py-3 flex items-center justify-between gap-4 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{m.startup?.name || m.startupId}</span>
                          <VerifiedMrrBadge startupId={m.startupId} />
                          {m.startup?.vertical && <Badge variant="secondary">{m.startup.vertical}</Badge>}
                          {m.startup?.stage && <Badge variant="outline">{m.startup.stage}</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{m.fit}</p>
                        <div className="mt-2">
                          <FinancialMiniStats startupId={m.startupId} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {m.startup && <VitalityScore startupId={m.startup.id} size="sm" />}
                        <Badge variant="outline" className="text-base font-bold">
                          {m.score}/100
                        </Badge>
                        {m.startup && (
                          <Link href={`/startups/${m.startup.id}`}>
                            <Button size="sm" variant="outline">{ru ? "Открыть" : "Open"}</Button>
                          </Link>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="border-t pt-4">
            <WatchlistsPanel contextLabel={inv.name} embedded />
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
              <h3 className="font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" />{ru ? "Команда" : "Team"} ({inv.members.length})
              </h3>
              {canManage && (
                <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" data-testid="button-invite-colleague">
                      <UserPlus className="h-4 w-4 mr-1" />
                      {ru ? "Пригласить коллегу" : "Invite colleague"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{ru ? "Пригласить по email" : "Invite by email"}</DialogTitle>
                      <DialogDescription>
                        {ru
                          ? "Мы отправим письмо со ссылкой для присоединения."
                          : "We'll send an email with a link to join."}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium">{ru ? "Email" : "Email"}</label>
                        <Input
                          type="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="colleague@example.com"
                          data-testid="input-invite-email"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">{ru ? "Роль" : "Role"}</label>
                        <Select value={inviteRole} onValueChange={setInviteRole}>
                          <SelectTrigger data-testid="select-invite-role">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {INVESTOR_MEMBER_ROLES.map(r => (
                              <SelectItem key={r} value={r} data-testid={`option-role-${r}`}>{r}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setInviteOpen(false)}>{t("cancel")}</Button>
                      <Button
                        onClick={() => inviteMutation.mutate({ email: inviteEmail.trim(), role: inviteRole })}
                        disabled={!inviteEmail.trim() || inviteMutation.isPending}
                        data-testid="button-send-invite"
                      >
                        {inviteMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                        <Mail className="h-4 w-4 mr-1" />
                        {ru ? "Отправить" : "Send"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            <div className="space-y-2">
              {inv.members.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-2 rounded-md border p-2" data-testid={`row-member-${m.id}`}>
                  <div className="text-sm">
                    <span className="font-medium">{[m.firstName, m.lastName].filter(Boolean).join(" ") || m.email || m.userId}</span>
                    <span className="text-muted-foreground"> · {m.role}</span>
                  </div>
                  {canManage && m.userId !== user?.id && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeMemberMutation.mutate(m.id)}
                      disabled={removeMemberMutation.isPending}
                      data-testid={`button-remove-member-${m.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {canManage && pendingInvites.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {ru ? "Ожидают принятия" : "Pending invitations"} ({pendingInvites.length})
                </h4>
                <div className="space-y-2">
                  {pendingInvites.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-2 rounded-md border border-dashed p-2 text-sm" data-testid={`row-invitation-${p.id}`}>
                      <div className="min-w-0">
                        <span className="font-medium truncate">{p.email}</span>
                        <span className="text-muted-foreground"> · {p.role}</span>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => cancelInviteMutation.mutate(p.id)}
                        disabled={cancelInviteMutation.isPending}
                        data-testid={`button-cancel-invitation-${p.id}`}
                        title={ru ? "Отменить" : "Cancel"}
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
