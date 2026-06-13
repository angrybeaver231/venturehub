import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Globe,
  Briefcase,
  ArrowLeft,
  ArrowRight,
  Clock,
  Building2,
  MapPin,
  Send,
  LogOut,
  FileText,
  MessageCircle,
} from "lucide-react";
import businessClubLogo from "@assets/photo_5393419750937327414_c_1761607336354.jpg";

interface CandidateUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
}

interface Application {
  id: string;
  jobId: string;
  candidateId: string | null;
  applicantName: string;
  email: string;
  phone: string | null;
  status: string;
  createdAt: string;
  jobTitle?: string;
}

interface Message {
  id: string;
  applicationId: string;
  senderType: string;
  senderId: string | null;
  content: string;
  createdAt: string;
}

export default function CandidatePortal() {
  const { t, language, setLanguage } = useLanguage();
  const [, setLocation] = useLocation();
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: user, isLoading: userLoading } = useQuery<CandidateUser>({
    queryKey: ["/api/candidates/me"],
    retry: false,
  });

  const { data: applications = [], isLoading: appsLoading } = useQuery<Application[]>({
    queryKey: ["/api/candidates/applications"],
    enabled: !!user,
  });

  const selectedApp = applications.find((a) => a.id === selectedAppId);

  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/candidates/applications", selectedAppId, "messages"],
    enabled: !!selectedAppId,
    refetchInterval: 5000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      await apiRequest(`/api/candidates/applications/${selectedAppId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/candidates/applications", selectedAppId, "messages"],
      });
      setMessageText("");
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("/api/candidates/logout", { method: "POST" });
    },
    onSuccess: () => {
      queryClient.clear();
      setLocation("/candidate/login");
    },
  });

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (!userLoading && !user) {
      setLocation("/candidate/login");
    }
  }, [user, userLoading, setLocation]);

  if (userLoading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const statusColor = (status: string) => {
    switch (status) {
      case "new": return "border-blue-500/30 text-blue-300";
      case "reviewing": return "border-yellow-500/30 text-yellow-300";
      case "interview": return "border-purple-500/30 text-purple-300";
      case "offered": return "border-green-500/30 text-green-300";
      case "rejected": return "border-red-500/30 text-red-300";
      case "hired": return "border-emerald-500/30 text-emerald-300";
      default: return "border-white/15 text-white/50";
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "new": return t("candidateStatusNew");
      case "reviewing": return t("candidateStatusReviewing");
      case "interview": return t("candidateStatusInterview");
      case "offered": return t("candidateStatusOffered");
      case "rejected": return t("candidateStatusRejected");
      case "hired": return t("candidateStatusHired");
      default: return status;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(language === "ru" ? "ru-RU" : "en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString(language === "ru" ? "ru-RU" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    sendMessageMutation.mutate(messageText.trim());
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col">
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#09090b]/80 backdrop-blur-xl border-b border-white/[0.12]">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8 flex-shrink-0 ring-2 ring-white/10">
                <AvatarImage src={businessClubLogo} alt="Business Club Logo" />
                <AvatarFallback className="bg-cyan-500/20 text-cyan-300 text-xs font-bold">BC</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <span className="text-sm font-semibold text-white/90 hidden sm:inline">
                  {t("candidatePortal")}
                </span>
                <p className="text-[10px] text-white/40 tracking-wide uppercase hidden sm:block">
                  {user.firstName} {user.lastName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLanguage(language === "en" ? "ru" : "en")}
                data-testid="button-language-toggle"
                className="text-white/60"
              >
                <Globe className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-sm font-semibold text-white border border-white/15"
                asChild
              >
                <Link href="/careers" data-testid="link-browse-positions">
                  {t("browsePositions")}
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => logoutMutation.mutate()}
                className="text-white/60"
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 pt-24 pb-12">
        <div className="mx-auto max-w-5xl px-6 lg:px-8">
          {selectedApp ? (
            <div className="space-y-6">
              <Button
                variant="ghost"
                className="text-white/50 gap-2"
                onClick={() => setSelectedAppId(null)}
                data-testid="button-back-to-applications"
              >
                <ArrowLeft className="h-4 w-4" />
                {t("backToApplications")}
              </Button>

              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 md:p-8 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="space-y-2">
                    <h2 className="text-xl font-bold text-white" data-testid="text-app-detail-title">
                      {selectedApp.jobTitle || selectedApp.jobId}
                    </h2>
                    <div className="flex items-center gap-2 text-sm text-white/40">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{t("applicationDate")}: {formatDate(selectedApp.createdAt)}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className={statusColor(selectedApp.status)} data-testid="badge-app-status">
                    {statusLabel(selectedApp.status)}
                  </Badge>
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] flex flex-col" style={{ height: "450px" }}>
                <div className="p-4 border-b border-white/[0.08] flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-semibold text-white">{t("chatWithRecruiter")}</h3>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3" data-testid="chat-messages-container">
                  {messagesLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-white/30 text-sm">
                      {language === "ru"
                        ? "Начните диалог с рекрутером"
                        : "Start a conversation with the recruiter"}
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.senderType === "candidate";
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                          data-testid={`message-${msg.id}`}
                        >
                          <div
                            className={`max-w-[75%] rounded-2xl px-4 py-2.5 space-y-1 ${
                              isMe
                                ? "bg-cyan-500/20 border border-cyan-500/20"
                                : "bg-white/[0.04] border border-white/[0.06]"
                            }`}
                          >
                            <p className="text-xs font-medium text-white/50">
                              {isMe ? t("youLabel") : t("recruiterLabel")}
                            </p>
                            <p className="text-sm text-white/90 whitespace-pre-wrap">{msg.content}</p>
                            <p className="text-[10px] text-white/30">{formatTime(msg.createdAt)}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <form
                  onSubmit={handleSendMessage}
                  className="p-3 border-t border-white/[0.08] flex gap-2"
                >
                  <Input
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder={t("messagePlaceholder")}
                    className="flex-1 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/30 rounded-xl"
                    data-testid="input-chat-message"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="bg-cyan-500 text-black rounded-xl flex-shrink-0"
                    disabled={!messageText.trim() || sendMessageMutation.isPending}
                    data-testid="button-send-message"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-white" data-testid="text-portal-title">
                  {t("candidateWelcome")}, {user.firstName}
                </h1>
                <p className="text-white/40">{t("myApplicationsDesc")}</p>
              </div>

              <div className="h-px bg-white/[0.12]" />

              {appsLoading ? (
                <div className="grid gap-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 animate-pulse space-y-3"
                    >
                      <div className="h-5 w-2/3 bg-white/10 rounded" />
                      <div className="h-4 w-1/3 bg-white/5 rounded" />
                    </div>
                  ))}
                </div>
              ) : applications.length === 0 ? (
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-16 text-center space-y-4">
                  <Briefcase className="w-12 h-12 text-white/20 mx-auto" />
                  <h3 className="text-xl font-semibold text-white" data-testid="text-no-apps">
                    {t("noApplicationsYet")}
                  </h3>
                  <p className="text-white/40 max-w-md mx-auto" data-testid="text-no-apps-desc">
                    {t("noApplicationsYetDesc")}
                  </p>
                  <Button
                    className="rounded-full bg-cyan-500 text-black font-semibold text-sm gap-2"
                    asChild
                  >
                    <Link href="/careers" data-testid="link-browse-positions-empty">
                      {t("browsePositions")}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {applications.map((app) => (
                    <div
                      key={app.id}
                      className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 cursor-pointer transition-all duration-200 flex flex-col sm:flex-row sm:items-center gap-4"
                      onClick={() => setSelectedAppId(app.id)}
                      data-testid={`card-application-${app.id}`}
                    >
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <h3 className="text-base font-semibold text-white truncate" data-testid={`text-app-title-${app.id}`}>
                          {app.jobTitle || app.jobId}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-white/40">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(app.createdAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {app.applicantName}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <Badge variant="outline" className={`${statusColor(app.status)} text-xs`}>
                          {statusLabel(app.status)}
                        </Badge>
                        <ArrowRight className="w-4 h-4 text-white/20" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
