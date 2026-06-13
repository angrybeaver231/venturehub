import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Users, Send, MapPin, Check, X, Sparkles, Share2, Loader2, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/contexts/LanguageContext";

const GOAL_LABELS: Record<string, { ru: string; en: string }> = {
  cofounder: { ru: "Со-основатель", en: "Co-founder" },
  hiring: { ru: "Найм", en: "Hiring" },
  job: { ru: "Ищу работу", en: "Looking for a job" },
  mentor: { ru: "Ментор", en: "Mentor" },
  investor: { ru: "Инвестор", en: "Investor" },
  casual: { ru: "Просто пообщаться", en: "Casual chat" },
};

type Match = {
  id: string;
  score: number;
  reason: string | null;
  myStatus: string;
  theirStatus: string;
  connected: boolean;
  chatId: string | null;
  otherUser: {
    id: string; firstName: string | null; lastName: string | null;
    profileImageUrl: string | null; bio: string | null;
    organization: string | null; profession: string | null;
    city?: string | null; category?: string | null;
    interests?: string | null; skills?: string | null;
    previousStartups?: string | null;
    isFounder?: boolean; isSpeaker?: boolean;
    tag?: string | null; telegramUsername?: string | null;
    requestText?: string | null; requestGoal?: string | null;
  };
};

export default function EventNetworking() {
  const [, params] = useRoute("/events/:id/networking");
  const [, setLocation] = useLocation();
  const eventId = params?.id || "";
  const [activeProfile, setActiveProfile] = useState<Match | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();
  const t = (ru: string, en: string) => (language === "ru" ? ru : en);

  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  const myReqQ = useQuery<any>({ queryKey: ["/api/events", eventId, "networking/request"], enabled: !!eventId && !!user });
  const matchesQ = useQuery<Match[]>({ queryKey: ["/api/events", eventId, "networking/matches"], enabled: !!eventId && !!user, refetchInterval: 20000 });
  const statsQ = useQuery<{ activeUsers: number }>({ queryKey: ["/api/events", eventId, "networking/stats"], enabled: !!eventId, refetchInterval: 30000 });

  const requestForm = useRequestForm(eventId, myReqQ.data);

  const acceptM = useMutation({
    mutationFn: async (vars: { id: string; action: "accept" | "pass" }) => {
      const r = await apiRequest(`/api/networking/matches/${vars.id}/${vars.action}`, { method: "POST" });
      return r.json();
    },
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "networking/matches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/networking/my-chats"] });
      if (vars.action === "accept" && data.chatId && data.statusA === "accepted" && data.statusB === "accepted") {
        toast({ title: t("Совпадение!", "It's a match!"), description: t("Чат открыт", "Chat opened") });
        setActiveChatId(data.chatId);
      }
    },
  });

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <p>{t("Войдите, чтобы пользоваться нетворкингом", "Sign in to use networking")}</p>
      </div>
    );
  }

  const hasRequest = !!myReqQ.data;

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-5xl">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation(`/events/${eventId}`)} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">{t("Нетворкинг", "Networking")}</h1>
        {statsQ.data && (
          <Badge variant="secondary" className="ml-auto" data-testid="badge-active-users">
            <Users className="h-3 w-3 mr-1" />
            {t(`${statsQ.data.activeUsers} ищут собеседников`, `${statsQ.data.activeUsers} looking for connections`)}
          </Badge>
        )}
      </div>

      <Tabs defaultValue={hasRequest ? "matches" : "request"} className="space-y-4">
        <TabsList>
          <TabsTrigger value="request" data-testid="tab-request">{t("Мой запрос", "My request")}</TabsTrigger>
          <TabsTrigger value="matches" data-testid="tab-matches">{t("Подборки", "Matches")}</TabsTrigger>
          <TabsTrigger value="map" data-testid="tab-map">{t("Карта веню", "Venue map")}</TabsTrigger>
        </TabsList>

        <TabsContent value="request">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("Кого вы ищете?", "Who are you looking for?")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>{t("Цель", "Goal")}</Label>
                <Select value={requestForm.goal} onValueChange={(v) => requestForm.setGoal(v)}>
                  <SelectTrigger data-testid="select-goal"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(GOAL_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{language === "ru" ? v.ru : v.en}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("Опишите свободно", "Describe freely")}</Label>
                <Textarea
                  rows={4}
                  value={requestForm.text}
                  onChange={(e) => requestForm.setText(e.target.value)}
                  placeholder={t("Напр.: ищу backend-инженера на Go для финтех-стартапа на стадии MVP. Готов обсудить co-founder equity.", "e.g. Looking for a Go backend engineer for an MVP-stage fintech startup. Open to co-founder equity.")}
                  data-testid="textarea-request"
                />
                <p className="text-xs text-muted-foreground mt-1">{requestForm.text.length}/1000</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => requestForm.save()} disabled={requestForm.saveM.isPending || requestForm.text.length < 10} data-testid="button-save-request">
                  {requestForm.saveM.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {hasRequest ? t("Обновить", "Update") : t("Включить нетворкинг", "Turn on networking")}
                </Button>
                {hasRequest && (
                  <Button variant="outline" onClick={() => requestForm.disable()} data-testid="button-disable-request">
                    {t("Выключить", "Turn off")}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matches">
          {!hasRequest ? (
            <Card><CardContent className="p-6 text-center text-muted-foreground">
              {t("Сначала заполните запрос на вкладке «Мой запрос»", "First fill in your request on the My request tab")}
            </CardContent></Card>
          ) : matchesQ.isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : !matchesQ.data?.length ? (
            <Card><CardContent className="p-6 text-center text-muted-foreground">
              {t("Пока нет совпадений. Загляните позже — мэтчи появятся, когда другие участники включат нетворкинг.", "No matches yet. Check back later — matches appear as others turn on networking.")}
            </CardContent></Card>
          ) : (
            <div className="grid gap-3">
              {matchesQ.data.map((m) => (
                <Card key={m.id} data-testid={`card-match-${m.id}`} className="hover-elevate cursor-pointer" onClick={() => setActiveProfile(m)}>
                  <CardContent className="p-4 flex gap-4 items-start">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={m.otherUser.profileImageUrl || undefined} />
                      <AvatarFallback>{(m.otherUser.firstName?.[0] || "?") + (m.otherUser.lastName?.[0] || "")}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold" data-testid={`text-match-name-${m.id}`}>{m.otherUser.firstName} {m.otherUser.lastName}</span>
                        <Badge variant="secondary" className="text-xs">{Math.round(m.score * 100)}% {t("совпадение", "match")}</Badge>
                        {m.connected && <Badge variant="default" className="text-xs">{t("Чат открыт", "Connected")}</Badge>}
                        {m.theirStatus === "accepted" && !m.connected && <Badge className="text-xs bg-amber-500">{t("Они ждут вашего ответа", "Awaiting your response")}</Badge>}
                      </div>
                      {(m.otherUser.profession || m.otherUser.organization) && (
                        <p className="text-sm text-muted-foreground">{[m.otherUser.profession, m.otherUser.organization].filter(Boolean).join(" · ")}</p>
                      )}
                      {m.otherUser.requestText && (
                        <p className="text-sm mt-2 line-clamp-2"><span className="text-muted-foreground">{t("Ищет: ", "Looking for: ")}</span>{m.otherUser.requestText}</p>
                      )}
                      {m.reason && (
                        <p className="text-sm mt-2 flex items-start gap-1.5"><Sparkles className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />{m.reason}</p>
                      )}
                      <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                        {m.connected && m.chatId ? (
                          <Button size="sm" onClick={() => setActiveChatId(m.chatId!)} data-testid={`button-chat-${m.id}`}>
                            <Send className="h-3.5 w-3.5 mr-1.5" />{t("Открыть чат", "Open chat")}
                          </Button>
                        ) : m.myStatus === "accepted" ? (
                          <Badge variant="outline">{t("Вы приняли — ждём их", "Accepted — awaiting them")}</Badge>
                        ) : (
                          <>
                            <Button size="sm" onClick={() => acceptM.mutate({ id: m.id, action: "accept" })} disabled={acceptM.isPending} data-testid={`button-accept-${m.id}`}>
                              <Check className="h-3.5 w-3.5 mr-1.5" />{t("Предложить встречу", "Connect")}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => acceptM.mutate({ id: m.id, action: "pass" })} disabled={acceptM.isPending} data-testid={`button-pass-${m.id}`}>
                              <X className="h-3.5 w-3.5 mr-1.5" />{t("Пропустить", "Pass")}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="map">
          <VenueMapView eventId={eventId} />
        </TabsContent>
      </Tabs>

      {activeChatId && (
        <ChatDialog chatId={activeChatId} eventId={eventId} onClose={() => setActiveChatId(null)} />
      )}
      {activeProfile && (
        <ParticipantDialog
          match={activeProfile}
          onClose={() => setActiveProfile(null)}
          onOpenChat={(cid) => { setActiveProfile(null); setActiveChatId(cid); }}
          onAccept={() => { acceptM.mutate({ id: activeProfile.id, action: "accept" }); setActiveProfile(null); }}
          onPass={() => { acceptM.mutate({ id: activeProfile.id, action: "pass" }); setActiveProfile(null); }}
        />
      )}
    </div>
  );
}

function ParticipantDialog({ match, onClose, onOpenChat, onAccept, onPass }: {
  match: Match; onClose: () => void; onOpenChat: (chatId: string) => void;
  onAccept: () => void; onPass: () => void;
}) {
  const { language } = useLanguage();
  const t = (ru: string, en: string) => language === "ru" ? ru : en;
  const u = match.otherUser;
  const fullName = [u.firstName, u.lastName].filter(Boolean).join(" ");
  const initials = (u.firstName?.[0] || "?") + (u.lastName?.[0] || "");
  const goalLabel = u.requestGoal ? GOAL_LABELS[u.requestGoal]?.[language as "ru" | "en"] : null;

  const Section = ({ title, value }: { title: string; value?: string | null }) =>
    value ? (
      <div className="space-y-1">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</div>
        <div className="text-sm whitespace-pre-wrap">{value}</div>
      </div>
    ) : null;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="dialog-participant">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Avatar className="h-14 w-14">
              <AvatarImage src={u.profileImageUrl || undefined} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <DialogTitle data-testid="text-participant-name">{fullName}</DialogTitle>
              <div className="text-sm text-muted-foreground">
                {[u.profession, u.organization].filter(Boolean).join(" · ")}
                {u.city && <> · {u.city}</>}
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <Badge variant="secondary" className="text-xs">{Math.round(match.score * 100)}% {t("совпадение", "match")}</Badge>
                {u.category && <Badge variant="outline" className="text-xs">{u.category}</Badge>}
                {u.isFounder && <Badge variant="outline" className="text-xs">{t("Фаундер", "Founder")}</Badge>}
                {u.isSpeaker && <Badge variant="outline" className="text-xs">{t("Спикер", "Speaker")}</Badge>}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {match.reason && (
            <div className="p-3 rounded-md bg-muted/50">
              <div className="flex items-start gap-2 text-sm">
                <Sparkles className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-0.5">{t("Почему совпали", "Why you match")}</div>
                  <div>{match.reason}</div>
                </div>
              </div>
            </div>
          )}

          {u.requestText && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t("Кого ищет на этом ивенте", "Looking for at this event")}
                {goalLabel && <> · <span className="text-foreground">{goalLabel}</span></>}
              </div>
              <div className="text-sm whitespace-pre-wrap p-3 rounded-md border">{u.requestText}</div>
            </div>
          )}

          <Section title={t("О себе", "About")} value={u.bio} />
          <Section title={t("Интересы", "Interests")} value={u.interests} />
          <Section title={t("Компетенции / навыки", "Skills")} value={u.skills} />
          <Section title={t("Прошлые стартапы", "Previous startups")} value={u.previousStartups} />
        </div>

        <div className="flex gap-2 pt-4 border-t mt-4 flex-wrap">
          {match.connected && match.chatId ? (
            <Button onClick={() => onOpenChat(match.chatId!)} data-testid="button-participant-chat">
              <Send className="h-4 w-4 mr-1.5" />{t("Открыть чат", "Open chat")}
            </Button>
          ) : match.myStatus === "accepted" ? (
            <Badge variant="outline">{t("Вы приняли — ждём их", "Accepted — awaiting them")}</Badge>
          ) : (
            <>
              <Button onClick={onAccept} data-testid="button-participant-accept">
                <Check className="h-4 w-4 mr-1.5" />{t("Предложить встречу", "Connect")}
              </Button>
              <Button variant="ghost" onClick={onPass} data-testid="button-participant-pass">
                <X className="h-4 w-4 mr-1.5" />{t("Пропустить", "Pass")}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function useRequestForm(eventId: string, existing: any) {
  const { toast } = useToast();
  const { language } = useLanguage();
  const [text, setText] = useState("");
  const [goal, setGoal] = useState("casual");
  useEffect(() => {
    if (existing) { setText(existing.requestText || ""); setGoal(existing.goal || "casual"); }
  }, [existing]);

  const saveM = useMutation({
    mutationFn: async () => {
      const r = await apiRequest(`/api/events/${eventId}/networking/request`, {
        method: "POST",
        body: JSON.stringify({ requestText: text, goal }),
      });
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "networking/request"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "networking/matches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "networking/stats"] });
      toast({ title: language === "ru" ? "Запрос сохранён" : "Request saved", description: language === "ru" ? "Ищем подходящих людей…" : "Looking for matches…" });
    },
  });

  const disableM = useMutation({
    mutationFn: async () => {
      await apiRequest(`/api/events/${eventId}/networking/request`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "networking/request"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "networking/stats"] });
    },
  });

  return { text, setText, goal, setGoal, saveM, save: () => saveM.mutate(), disable: () => disableM.mutate() };
}

function ChatDialog({ chatId, eventId, onClose }: { chatId: string; eventId: string; onClose: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();
  const t = (ru: string, en: string) => (language === "ru" ? ru : en);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const chatQ = useQuery<any>({ queryKey: ["/api/networking/chats", chatId, "messages"], refetchInterval: 8000 });
  const pinsQ = useQuery<{ pins: any[]; map: any }>({ queryKey: ["/api/events", eventId, "venue-map"] });
  const invitesQ = useQuery<any[]>({ queryKey: ["/api/networking/chats", chatId, "meet-invites"], refetchInterval: 15000 });

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chatQ.data?.messages?.length]);

  const sendM = useMutation({
    mutationFn: async (vars: { content: string; kind?: "text" | "tg_share" }) => {
      const r = await apiRequest(`/api/networking/chats/${chatId}/messages`, {
        method: "POST",
        body: JSON.stringify(vars),
      });
      return r.json();
    },
    onSuccess: () => {
      setText("");
      queryClient.invalidateQueries({ queryKey: ["/api/networking/chats", chatId, "messages"] });
    },
    onError: (e: any) => toast({ title: t("Не отправлено", "Failed to send"), description: e.message, variant: "destructive" }),
  });

  const inviteM = useMutation({
    mutationFn: async (vars: { pinId: string; scheduledAt: string; note?: string }) => {
      const r = await apiRequest(`/api/networking/chats/${chatId}/meet-invites`, { method: "POST", body: JSON.stringify(vars) });
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/networking/chats", chatId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/networking/chats", chatId, "meet-invites"] });
      toast({ title: t("Приглашение отправлено", "Invite sent") });
    },
  });

  const inviteRespM = useMutation({
    mutationFn: async (vars: { id: string; action: "accept" | "decline" | "cancel" }) => {
      const r = await apiRequest(`/api/networking/meet-invites/${vars.id}/${vars.action}`, { method: "POST" });
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/networking/chats", chatId, "meet-invites"] });
    },
  });

  const data = chatQ.data;
  const invites = invitesQ.data || [];
  const inviteById = new Map(invites.map((i: any) => [i.id, i]));
  const pinById = new Map((pinsQ.data?.pins || []).map((p: any) => [p.id, p]));

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg p-0 gap-0 h-[80vh] flex flex-col">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={data?.otherUser?.profileImageUrl || undefined} />
              <AvatarFallback>{(data?.otherUser?.firstName?.[0] || "?")}</AvatarFallback>
            </Avatar>
            <span data-testid="text-chat-other-name">{data?.otherUser?.firstName} {data?.otherUser?.lastName}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-2" ref={scrollRef} data-testid="container-messages">
          {data?.messages?.map((msg: any) => {
            const mine = msg.senderId === user?.id;
            const isInvite = msg.kind === "meet_invite_ref";
            const inviteData = isInvite ? inviteById.get(msg.payload?.inviteId) : null;
            const pin = inviteData ? pinById.get(inviteData.pinId) : null;
            return (
              <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"}`} data-testid={`msg-${msg.id}`}>
                <div className={`max-w-[80%] rounded-md px-3 py-2 text-sm ${
                  msg.kind === "icebreaker" ? "bg-accent w-full text-center italic" :
                  mine ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}>
                  {msg.kind === "icebreaker" && <div className="text-xs uppercase opacity-70 mb-1">{t("Тема для старта", "Icebreaker")}</div>}
                  {msg.kind === "tg_share" ? (
                    <a href={`https://t.me/${msg.content.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer" className="underline flex items-center gap-1.5">
                      <Share2 className="h-3.5 w-3.5" />Telegram: {msg.content}
                    </a>
                  ) : isInvite && inviteData && pin ? (
                    <div className="text-left">
                      <div className="flex items-center gap-1.5 font-medium"><MapPin className="h-3.5 w-3.5" />{t("Встреча", "Meet")}: {pin.name}</div>
                      <div className="text-xs opacity-80">{new Date(inviteData.scheduledAt).toLocaleString(language === "ru" ? "ru-RU" : "en-US", { dateStyle: "short", timeStyle: "short" })}</div>
                      {inviteData.note && <div className="text-xs mt-1">{inviteData.note}</div>}
                      <div className="text-xs mt-1 opacity-80">{t("Статус", "Status")}: {inviteData.status}</div>
                      {!mine && inviteData.status === "pending" && (
                        <div className="flex gap-1 mt-2">
                          <Button size="sm" variant="secondary" className="h-7" onClick={() => inviteRespM.mutate({ id: inviteData.id, action: "accept" })}>{t("Принять", "Accept")}</Button>
                          <Button size="sm" variant="ghost" className="h-7" onClick={() => inviteRespM.mutate({ id: inviteData.id, action: "decline" })}>{t("Отклонить", "Decline")}</Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t p-3 space-y-2">
          <div className="flex gap-2 flex-wrap">
            <MeetInviteButton pins={pinsQ.data?.pins || []} onSend={(v) => inviteM.mutate(v)} disabled={inviteM.isPending} />
            <Button
              size="sm"
              variant="outline"
              onClick={() => sendM.mutate({ content: "", kind: "tg_share" })}
              disabled={sendM.isPending || !data?.myTelegramUsername}
              title={!data?.myTelegramUsername ? t("Добавьте Telegram username в профиле", "Add Telegram username in your profile") : undefined}
              data-testid="button-share-tg"
            >
              <Share2 className="h-3.5 w-3.5 mr-1.5" />{t("Поделиться TG", "Share Telegram")}
            </Button>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) sendM.mutate({ content: text }); }} className="flex gap-2">
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={t("Сообщение…", "Message…")} data-testid="input-message" />
            <Button type="submit" size="icon" disabled={sendM.isPending || !text.trim()} data-testid="button-send"><Send className="h-4 w-4" /></Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MeetInviteButton({ pins, onSend, disabled }: { pins: any[]; onSend: (v: { pinId: string; scheduledAt: string; note?: string }) => void; disabled: boolean }) {
  const { language } = useLanguage();
  const t = (ru: string, en: string) => (language === "ru" ? ru : en);
  const [open, setOpen] = useState(false);
  const [pinId, setPinId] = useState("");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");

  if (pins.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" data-testid="button-meet-invite-open">
          <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />{t("Встретиться у…", "Meet at…")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{t("Предложить встречу", "Suggest a meet")}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>{t("Точка", "Spot")}</Label>
            <Select value={pinId} onValueChange={setPinId}>
              <SelectTrigger data-testid="select-pin"><SelectValue placeholder={t("Выберите точку", "Pick a spot")} /></SelectTrigger>
              <SelectContent>
                {pins.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} · {p.kind}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("Когда", "When")}</Label>
            <Input type="datetime-local" value={time} onChange={(e) => setTime(e.target.value)} data-testid="input-meet-time" />
          </div>
          <div>
            <Label>{t("Записка (опц.)", "Note (opt.)")}</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} data-testid="input-meet-note" />
          </div>
          <Button
            disabled={disabled || !pinId || !time}
            onClick={() => { onSend({ pinId, scheduledAt: new Date(time).toISOString(), note: note || undefined }); setOpen(false); setNote(""); setTime(""); }}
            data-testid="button-meet-send"
          >{t("Отправить приглашение", "Send invite")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function VenueMapView({ eventId }: { eventId: string }) {
  const { language } = useLanguage();
  const t = (ru: string, en: string) => (language === "ru" ? ru : en);
  const q = useQuery<{ map: any; pins: any[] }>({ queryKey: ["/api/events", eventId, "venue-map"] });

  if (q.isLoading) return <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!q.data?.map) return (
    <Card><CardContent className="p-6 text-center text-muted-foreground">
      {t("Карта веню пока не загружена организаторами.", "Venue map not uploaded by organizers yet.")}
    </CardContent></Card>
  );

  return (
    <Card>
      <CardContent className="p-3">
        <div className="relative w-full" style={{ aspectRatio: "16 / 10" }}>
          <img src={q.data.map.imageUrl} alt="venue" className="w-full h-full object-contain rounded-md" />
          {q.data.pins.map((p) => (
            <div
              key={p.id}
              className="absolute -translate-x-1/2 -translate-y-full flex flex-col items-center"
              style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
              title={`${p.name}${p.description ? " — " + p.description : ""}`}
              data-testid={`pin-${p.id}`}
            >
              <Badge className="text-xs whitespace-nowrap mb-1">{p.name}</Badge>
              <MapPin className="h-5 w-5 text-primary drop-shadow" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
