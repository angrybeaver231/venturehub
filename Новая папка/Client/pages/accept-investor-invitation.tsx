import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type InvitationDetails = {
  id: string;
  email: string;
  role: string;
  status: "pending" | "accepted" | "cancelled" | "expired";
  expiresAt: string;
  investor: { id: string; name: string; kind: string; logo: string | null };
};

export default function AcceptInvestorInvitationPage() {
  const [, params] = useRoute("/invitations/investor/:token");
  const [, setLocation] = useLocation();
  const token = params?.token;
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { language } = useLanguage();
  const ru = language === "ru";
  const { toast } = useToast();
  const [accepting, setAccepting] = useState(false);
  const [done, setDone] = useState(false);

  const { data: inv, isLoading, error } = useQuery<InvitationDetails>({
    queryKey: ["/api/invitations/investor", token],
    queryFn: async () => {
      const res = await fetch(`/api/invitations/investor/${token}`, { credentials: "include" });
      if (!res.ok) throw new Error((await res.json()).message || "Failed");
      return res.json();
    },
    enabled: !!token,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated && token) {
      const back = encodeURIComponent(`/invitations/investor/${token}`);
      window.location.href = `/api/login?returnTo=${back}`;
    }
  }, [authLoading, isAuthenticated, token]);

  const accept = async () => {
    if (!token) return;
    setAccepting(true);
    try {
      const res = await apiRequest(`/api/invitations/investor/${token}/accept`, { method: "POST" });
      const data = await res.json();
      setDone(true);
      toast({ title: ru ? "Приглашение принято" : "Invitation accepted" });
      setTimeout(() => setLocation(`/investors/${data.investorId}`), 1000);
    } catch (e: any) {
      toast({ title: ru ? "Ошибка" : "Error", description: e.message, variant: "destructive" });
    } finally {
      setAccepting(false);
    }
  };

  if (isLoading || authLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }
  if (error || !inv) {
    return (
      <div className="max-w-md mx-auto py-20">
        <Card><CardHeader>
          <div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle>{ru ? "Приглашение не найдено" : "Invitation not found"}</CardTitle>
          </div>
          <CardDescription>{ru ? "Ссылка недействительна или была отозвана." : "This link is invalid or was revoked."}</CardDescription>
        </CardHeader></Card>
      </div>
    );
  }

  const isExpired = new Date(inv.expiresAt) < new Date();
  const blocked = inv.status !== "pending" || isExpired;

  return (
    <div className="max-w-md mx-auto py-20">
      <Card>
        <CardHeader className="items-center text-center">
          <Avatar className="h-20 w-20 ring-4 ring-primary/10">
            {inv.investor.logo ? <AvatarImage src={inv.investor.logo} /> : null}
            <AvatarFallback className="text-lg">{inv.investor.name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <CardTitle data-testid="text-invite-investor-name">
            {ru ? "Приглашение в " : "Invitation to "}{inv.investor.name}
          </CardTitle>
          <CardDescription>
            {ru ? "Вы были приглашены как" : "You've been invited as"} <Badge variant="secondary" className="ml-1">{inv.role}</Badge>
          </CardDescription>
          <p className="text-xs text-muted-foreground">{inv.email}</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {done ? (
            <div className="flex items-center justify-center gap-2 text-sm text-emerald-600">
              <CheckCircle2 className="h-4 w-4" /> {ru ? "Готово! Перенаправляем…" : "Done! Redirecting…"}
            </div>
          ) : blocked ? (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4" /> {ru ? "Это приглашение больше недействительно." : "This invitation is no longer valid."}
            </div>
          ) : (
            <Button onClick={accept} disabled={accepting} data-testid="button-accept-invitation">
              {accepting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {ru ? "Принять приглашение" : "Accept invitation"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
