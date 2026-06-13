import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Globe, ArrowLeft, Eye, EyeOff } from "lucide-react";
import businessClubLogo from "@assets/photo_5393419750937327414_c_1761607336354.jpg";

export default function CandidateAuth() {
  const { t, language, setLanguage } = useLanguage();
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: "",
  });

  const loginMutation = useMutation({
    mutationFn: async (body: { email: string; password: string }) => {
      const res = await apiRequest("/api/candidates/login", {
        method: "POST",
        body: JSON.stringify(body),
      });
      return res.json();
    },
    onSuccess: () => {
      setLocation("/candidate");
    },
    onError: (err: any) => {
      setError(err.message || "Login failed");
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (body: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      phone?: string;
    }) => {
      const res = await apiRequest("/api/candidates/register", {
        method: "POST",
        body: JSON.stringify(body),
      });
      return res.json();
    },
    onSuccess: () => {
      setLocation("/candidate");
    },
    onError: (err: any) => {
      setError(err.message || "Registration failed");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (mode === "login") {
      loginMutation.mutate({ email: formData.email, password: formData.password });
    } else {
      registerMutation.mutate({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || undefined,
      });
    }
  };

  const isPending = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col">
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#09090b]/80 backdrop-blur-xl border-b border-white/[0.12]">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            <Link href="/careers" className="flex items-center gap-3" data-testid="link-back-careers">
              <ArrowLeft className="h-4 w-4 text-white/50" />
              <Avatar className="w-8 h-8 flex-shrink-0 ring-2 ring-white/10">
                <AvatarImage src={businessClubLogo} alt="Business Club Logo" />
                <AvatarFallback className="bg-cyan-500/20 text-cyan-300 text-xs font-bold">BC</AvatarFallback>
              </Avatar>
              <span className="text-sm font-semibold text-white/90 hidden sm:inline">
                {t("candidatePortal")}
              </span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLanguage(language === "en" ? "ru" : "en")}
              data-testid="button-language-toggle"
              className="text-white/60"
            >
              <Globe className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center pt-24 pb-12 px-6">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-semibold tracking-widest uppercase text-cyan-400">
              {t("candidatePortal")}
            </span>
            <h1 className="text-3xl font-bold text-white" data-testid="text-auth-title">
              {mode === "login" ? t("candidateLoginTitle") : t("candidateRegisterTitle")}
            </h1>
            <p className="text-sm text-white/40" data-testid="text-auth-subtitle">
              {mode === "login" ? t("candidateLoginSubtitle") : t("candidateRegisterSubtitle")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-4">
              {mode === "register" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-white/60">{t("candidateFirstName")}</label>
                    <Input
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData((p) => ({ ...p, firstName: e.target.value }))}
                      className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/30 rounded-xl"
                      data-testid="input-first-name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-white/60">{t("candidateLastName")}</label>
                    <Input
                      required
                      value={formData.lastName}
                      onChange={(e) => setFormData((p) => ({ ...p, lastName: e.target.value }))}
                      className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/30 rounded-xl"
                      data-testid="input-last-name"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/60">{t("candidateEmail")}</label>
                <Input
                  required
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                  className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/30 rounded-xl"
                  data-testid="input-email"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/60">{t("candidatePassword")}</label>
                <div className="relative">
                  <Input
                    required
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                    className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/30 rounded-xl pr-10"
                    data-testid="input-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 text-white/40 h-7 w-7"
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>

              {mode === "register" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-white/60">{t("candidatePhone")}</label>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                    className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/30 rounded-xl"
                    data-testid="input-phone"
                  />
                </div>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-400 text-center" data-testid="text-auth-error">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full rounded-full bg-cyan-500 text-black font-semibold text-sm"
              disabled={isPending}
              data-testid="button-submit-auth"
            >
              {isPending
                ? "..."
                : mode === "login"
                ? t("candidateSignIn")
                : t("candidateSignUp")}
            </Button>
          </form>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
              }}
              className="text-sm text-cyan-400 font-medium"
              data-testid="button-toggle-mode"
            >
              {mode === "login" ? (
                <span>
                  <span className="text-white/40">{t("candidateNoAccount")} </span>
                  {t("candidateRegister")}
                </span>
              ) : (
                <span>
                  <span className="text-white/40">{t("candidateHaveAccount")} </span>
                  {t("candidateSignIn")}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
