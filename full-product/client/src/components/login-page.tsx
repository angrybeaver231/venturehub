import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSwitcher } from "./language-switcher";
import campusImage from "@assets/Finuniver_mainbuilding_1761607281859.jpg";
import businessClubLogo from "@assets/photo_5393419750937327414_c_1761607336354.jpg";
import { ThemeToggle } from "./theme-toggle";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { OnboardingWizard } from "./onboarding-wizard";
import { useLocation } from "wouter";

export function LoginPage({ onLogin }: { onLogin?: (role: string) => void }) {
  const [routeLocation] = useLocation();
  const [mode, setMode] = useState<"admin" | "member" | "register" | "forgot-password">(
    routeLocation === "/register" ? "register" : "member",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [patronymic, setPatronymic] = useState("");
  const [noPatronymic, setNoPatronymic] = useState(false);
  const [organizationType, setOrganizationType] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [faculty, setFaculty] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);
  const [userAgreementGiven, setUserAgreementGiven] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Forgot password state
  const [resetMode, setResetMode] = useState<"enter-email" | "verify-code" | "set-password">("enter-email");
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || t("loginFailed"));
      }

      // Login successful
      toast({
        title: t("loginSuccess"),
        description: `${t("loggedInAs")} ${t(data.role)}`,
      });

      // Redirect to dashboard
      window.location.href = '/';
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("loginFailed"),
        description: error.message || t("invalidCredentials"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!consentGiven || !userAgreementGiven) {
      toast({
        variant: "destructive",
        title: t("error"),
        description: t("consentRequired"),
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          password, 
          firstName, 
          lastName,
          patronymic: noPatronymic ? undefined : patronymic,
          organizationType,
          organizationName,
          faculty: organizationType === "financial-university" ? faculty : undefined
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || t("registrationFailed"));
      }

      // Registration successful
      toast({
        title: t("registrationSuccess"),
        description: t("accountCreated"),
      });

      // Redirect to dashboard
      window.location.href = '/';
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("registrationFailed"),
        description: error.message || t("registrationFailed"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setFirstName("");
    setLastName("");
    setPatronymic("");
    setNoPatronymic(false);
    setOrganizationType("");
    setOrganizationName("");
    setConsentGiven(false);
    setUserAgreementGiven(false);
  };

  const switchToRegister = () => {
    resetForm();
    setMode("register");
  };

  const switchToAdmin = () => {
    resetForm();
    setMode("admin");
  };

  const switchToMember = () => {
    resetForm();
    setMode("member");
  };

  const switchToForgotPassword = () => {
    setResetEmail("");
    setResetCode("");
    setNewPassword("");
    setConfirmNewPassword("");
    setResetMode("enter-email");
    setMode("forgot-password");
  };

  const handleSendResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || t("error"));
      }

      toast({
        title: t("success"),
        description: t("resetCodeSent"),
      });

      setResetMode("verify-code");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("error"),
        description: error.message || t("somethingWentWrong"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/verify-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, code: resetCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || t("invalidCode"));
      }

      toast({
        title: t("success"),
        description: t("codeVerified"),
      });

      setResetMode("set-password");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("error"),
        description: error.message || t("invalidCode"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmNewPassword) {
      toast({
        variant: "destructive",
        title: t("error"),
        description: t("passwordsDoNotMatch"),
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: resetEmail, 
          code: resetCode, 
          newPassword 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || t("error"));
      }

      toast({
        title: t("success"),
        description: t("passwordResetSuccess"),
      });

      // Reset form and go back to login
      setResetEmail("");
      setResetCode("");
      setNewPassword("");
      setConfirmNewPassword("");
      setResetMode("enter-email");
      setMode("member");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("error"),
        description: error.message || t("somethingWentWrong"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (mode === "register") {
    return (
      <div className="min-h-screen w-full flex flex-col bg-background">
        <motion.div
          className="absolute top-4 right-4 flex items-center gap-2 z-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <LanguageSwitcher />
          <ThemeToggle />
        </motion.div>
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md"
          >
            <OnboardingWizard onSwitchToLogin={switchToMember} />
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${campusImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 to-black/50" />
        <div className="relative z-10 flex flex-col justify-center items-center px-12 text-white text-center">
          <img 
            src={businessClubLogo} 
            alt="Business Club Logo" 
            className="w-32 h-32 mb-6 object-contain"
          />
          <h1 className="text-4xl font-bold mb-4 leading-tight">
            Предпринимательский Клуб
          </h1>
          <p className="text-xl mb-2 opacity-90">
            Финансовый Университет при Правительстве РФ
          </p>
          <p className="text-lg opacity-75 mt-4">
            {t("loginTagline")}
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 relative">
        <motion.div 
          className="absolute top-4 right-4 flex items-center gap-2"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <LanguageSwitcher />
          <ThemeToggle />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className="mb-4"
              data-testid="button-back-to-home"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("backToHome") || "Back to Home"}
            </Button>
          </Link>
          
          <Card className="p-8">
          <div className="mb-8 lg:hidden text-center">
            <img 
              src={businessClubLogo} 
              alt="Business Club Logo" 
              className="w-24 h-24 mx-auto mb-4 object-contain"
            />
            <h1 className="text-2xl font-bold mb-2">Предпринимательский Клуб</h1>
            <p className="text-sm text-muted-foreground">Финансовый Университет при Правительстве РФ</p>
          </div>

          {mode === "admin" ? (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">{t("adminLogin")}</h2>
                <p className="text-sm text-muted-foreground">
                  {t("adminLoginDescription")}
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-email">{t("email")}</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder={t("emailPlaceholderAdmin")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    data-testid="input-admin-email"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="admin-password">{t("password")}</Label>
                    <button
                      type="button"
                      onClick={switchToForgotPassword}
                      className="text-xs text-primary hover:underline"
                      data-testid="button-forgot-password-admin"
                    >
                      {t("forgotPassword")}
                    </button>
                  </div>
                  <Input
                    id="admin-password"
                    type="password"
                    placeholder={t("password")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    data-testid="input-admin-password"
                    required
                    disabled={isLoading}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  data-testid="button-admin-login"
                  disabled={isLoading}
                >
                  {isLoading ? t("loading") : t("signIn")}
                </Button>
              </form>

              <div className="text-center text-sm text-muted-foreground mt-4 space-y-2">
                <div>
                  {t("dontHaveAccount")}{" "}
                  <button 
                    onClick={switchToRegister}
                    className="text-primary hover:underline font-medium"
                    data-testid="button-switch-to-register"
                  >
                    {t("registerNow")}
                  </button>
                </div>
                <div>
                  {t("alreadyMember")}{" "}
                  <button 
                    onClick={switchToMember}
                    className="text-primary hover:underline font-medium"
                    data-testid="button-switch-to-member"
                  >
                    {t("memberLogin")}
                  </button>
                </div>
              </div>
            </>
          ) : mode === "member" ? (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">{t("memberLogin")}</h2>
                <p className="text-sm text-muted-foreground">
                  {t("memberLoginDescription")}
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="member-email">{t("email")}</Label>
                  <Input
                    id="member-email"
                    type="email"
                    placeholder={t("emailPlaceholder")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    data-testid="input-member-email"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="member-password">{t("password")}</Label>
                    <button
                      type="button"
                      onClick={switchToForgotPassword}
                      className="text-xs text-primary hover:underline"
                      data-testid="button-forgot-password-member"
                    >
                      {t("forgotPassword")}
                    </button>
                  </div>
                  <Input
                    id="member-password"
                    type="password"
                    placeholder={t("password")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    data-testid="input-member-password"
                    required
                    disabled={isLoading}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  data-testid="button-member-login"
                  disabled={isLoading}
                >
                  {isLoading ? t("loading") : t("signIn")}
                </Button>
              </form>

              <div className="text-center text-sm text-muted-foreground mt-4 space-y-2">
                <div>
                  {t("dontHaveAccount")}{" "}
                  <button 
                    onClick={switchToRegister}
                    className="text-primary hover:underline font-medium"
                    data-testid="button-switch-to-register"
                  >
                    {t("registerNow")}
                  </button>
                </div>
                <div>
                  {t("areYouAdmin")}{" "}
                  <button 
                    onClick={switchToAdmin}
                    className="text-primary hover:underline font-medium"
                    data-testid="button-switch-to-admin"
                  >
                    {t("adminLogin")}
                  </button>
                </div>
              </div>
            </>
          ) : mode === "register" ? (
            <OnboardingWizard onSwitchToLogin={switchToMember} />
          ) : (
            <>
              {resetMode === "enter-email" && (
                <>
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold mb-2">{t("resetPassword")}</h2>
                    <p className="text-sm text-muted-foreground">
                      {t("enterEmailToReset")}
                    </p>
                  </div>

                  <form onSubmit={handleSendResetCode} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">{t("email")}</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder={t("emailPlaceholder")}
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        data-testid="input-reset-email"
                        required
                        disabled={isLoading}
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full" 
                      data-testid="button-send-reset-code"
                      disabled={isLoading}
                    >
                      {isLoading ? t("loading") : t("sendResetCode")}
                    </Button>
                  </form>

                  <div className="text-center text-sm text-muted-foreground mt-4">
                    <button 
                      onClick={switchToMember}
                      className="text-primary hover:underline font-medium"
                      data-testid="button-back-to-login-from-reset"
                    >
                      {t("backToLogin")}
                    </button>
                  </div>
                </>
              )}

              {resetMode === "verify-code" && (
                <>
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold mb-2">{t("enterResetCode")}</h2>
                    <p className="text-sm text-muted-foreground">
                      {t("enterCodeSent")}
                    </p>
                  </div>

                  <form onSubmit={handleVerifyCode} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reset-code">{t("enterResetCode")}</Label>
                      <Input
                        id="reset-code"
                        type="text"
                        placeholder={t("codePlaceholder")}
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value)}
                        data-testid="input-reset-code"
                        maxLength={6}
                        required
                        disabled={isLoading}
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full" 
                      data-testid="button-verify-code"
                      disabled={isLoading}
                    >
                      {isLoading ? t("loading") : t("verifyCode")}
                    </Button>
                  </form>

                  <div className="text-center text-sm text-muted-foreground mt-4">
                    <button 
                      onClick={switchToMember}
                      className="text-primary hover:underline font-medium"
                      data-testid="button-back-to-login-from-verify"
                    >
                      {t("backToLogin")}
                    </button>
                  </div>
                </>
              )}

              {resetMode === "set-password" && (
                <>
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold mb-2">{t("setNewPassword")}</h2>
                    <p className="text-sm text-muted-foreground">
                      {t("enterNewPassword")}
                    </p>
                  </div>

                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-password">{t("newPassword")}</Label>
                      <Input
                        id="new-password"
                        type="password"
                        placeholder={t("newPassword")}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        data-testid="input-new-password"
                        required
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-new-password">{t("confirmPassword")}</Label>
                      <Input
                        id="confirm-new-password"
                        type="password"
                        placeholder={t("confirmPassword")}
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        data-testid="input-confirm-new-password"
                        required
                        disabled={isLoading}
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full" 
                      data-testid="button-reset-password"
                      disabled={isLoading}
                    >
                      {isLoading ? t("loading") : t("resetPassword")}
                    </Button>
                  </form>

                  <div className="text-center text-sm text-muted-foreground mt-4">
                    <button 
                      onClick={switchToMember}
                      className="text-primary hover:underline font-medium"
                      data-testid="button-back-to-login-from-new-password"
                    >
                      {t("backToLogin")}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
