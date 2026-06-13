import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Delete as DeleteIcon,
  PartyPopper,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { legalContent } from "@/lib/legal-content";

type StepKey =
  | "email"
  | "verify"
  | "personal"
  | "organization"
  | "password"
  | "consent"
  | "pin"
  | "welcome";

const STEP_ORDER: StepKey[] = [
  "email",
  "verify",
  "personal",
  "organization",
  "password",
  "consent",
  "pin",
];

interface OnboardingWizardProps {
  onSwitchToLogin: () => void;
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 40 : -40,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction > 0 ? -40 : 40,
    opacity: 0,
  }),
};

export function OnboardingWizard({ onSwitchToLogin }: OnboardingWizardProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();

  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const step: StepKey = STEP_ORDER[stepIndex] ?? "welcome";

  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState<string[]>(
    Array(6).fill(""),
  );
  const [resendCountdown, setResendCountdown] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [patronymic, setPatronymic] = useState("");
  const [noPatronymic, setNoPatronymic] = useState(false);
  const [personalErrors, setPersonalErrors] = useState<{
    firstName?: string;
    lastName?: string;
    patronymic?: string;
  }>({});

  const [organizationType, setOrganizationType] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [faculty, setFaculty] = useState("");
  const [groupNumber, setGroupNumber] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeData, setAgreeData] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);
  const [legalSheet, setLegalSheet] = useState<
    null | "terms" | "privacy" | "data" | "marketing"
  >(null);

  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinPhase, setPinPhase] = useState<"set" | "confirm">("set");

  const [submitting, setSubmitting] = useState(false);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const verifyInputsRef = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const id = setTimeout(() => setResendCountdown((v) => v - 1), 1000);
    return () => clearTimeout(id);
  }, [resendCountdown]);

  const goNext = () => {
    setDirection(1);
    setStepIndex((i) => Math.min(i + 1, STEP_ORDER.length));
  };
  const goBack = () => {
    setDirection(-1);
    if (stepIndex === 0) {
      onSwitchToLogin();
      return;
    }
    setStepIndex((i) => Math.max(i - 1, 0));
  };

  // ------- Step 1: Email -------
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const sendVerificationCode = async (showToast = true) => {
    if (!validEmail) return;
    setSendingCode(true);
    setVerificationToken(null);
    try {
      const res = await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || t("somethingWentWrong"));
      }
      setResendCountdown(60);
      if (showToast) {
        toast({ title: t("success"), description: t("verificationCodeSent") });
      }
      return true;
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: t("error"),
        description: err.message || t("somethingWentWrong"),
      });
      return false;
    } finally {
      setSendingCode(false);
    }
  };

  const submitEmail = async () => {
    if (!validEmail) return;
    const ok = await sendVerificationCode(true);
    if (ok) goNext();
  };

  // ------- Step 2: Verify -------
  const handleCodeChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...verificationCode];
    next[index] = digit;
    setVerificationCode(next);
    if (digit && index < 5) {
      verifyInputsRef.current[index + 1]?.focus();
    }
    if (next.every((d) => d !== "") && index === 5) {
      submitVerification(next.join(""));
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const next = Array(6).fill("");
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setVerificationCode(next);
    const focusIdx = Math.min(pasted.length, 5);
    verifyInputsRef.current[focusIdx]?.focus();
    if (pasted.length === 6) submitVerification(pasted);
  };

  const handleCodeKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !verificationCode[index] && index > 0) {
      verifyInputsRef.current[index - 1]?.focus();
    }
  };

  const submitVerification = async (code: string) => {
    setVerifying(true);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || t("invalidCode"));
      }
      if (data?.verification_token) {
        setVerificationToken(data.verification_token);
      } else if (data?.verificationToken) {
        setVerificationToken(data.verificationToken);
      }
      goNext();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: t("error"),
        description: err.message || t("invalidCode"),
      });
      setVerificationCode(Array(6).fill(""));
      verifyInputsRef.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };

  // ------- Step 3: Personal -------
  const validatePersonalField = (field: "firstName" | "lastName" | "patronymic") => {
    const errors = { ...personalErrors };
    if (field === "firstName") {
      errors.firstName = firstName.trim() ? undefined : t("fieldRequired");
    } else if (field === "lastName") {
      errors.lastName = lastName.trim() ? undefined : t("fieldRequired");
    } else if (field === "patronymic") {
      errors.patronymic =
        noPatronymic || patronymic.trim() ? undefined : t("fieldRequired");
    }
    setPersonalErrors(errors);
  };
  const personalValid =
    firstName.trim() && lastName.trim() && (noPatronymic || patronymic.trim());

  // ------- Step 4: Organization -------
  const orgValid =
    organizationType &&
    (organizationType === "financial-university"
      ? !!faculty && !!groupNumber.trim()
      : !!organizationName.trim());

  // ------- Step 5: Password -------
  const passwordChecks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    digit: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
  const passwordScore = Object.values(passwordChecks).filter(Boolean).length;
  const passwordValid = passwordScore === 4;
  const passwordsMatch = password && password === confirmPassword;

  // ------- Step 6: Consent -------
  const consentValid = agreeTerms && agreePrivacy && agreeData;

  // ------- Step 7: PIN -------
  const handlePinDigit = (digit: string) => {
    if (pinPhase === "set") {
      if (pin.length < 6) {
        const next = pin + digit;
        setPin(next);
        if (next.length === 6) setPinPhase("confirm");
      }
    } else {
      if (confirmPin.length < 6) {
        const next = confirmPin + digit;
        setConfirmPin(next);
        if (next.length === 6) {
          if (next === pin) {
            submitPinAndFinish(next);
          } else {
            toast({
              variant: "destructive",
              title: t("error"),
              description: t("pinMismatch"),
            });
            setConfirmPin("");
          }
        }
      }
    }
  };

  const handlePinDelete = () => {
    if (pinPhase === "set") setPin((p) => p.slice(0, -1));
    else setConfirmPin((p) => p.slice(0, -1));
  };

  // ------- Final submit -------
  const registerAccount = async () => {
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        firstName,
        lastName,
        patronymic: noPatronymic ? undefined : patronymic,
        organizationType,
        organizationName,
        faculty: organizationType === "financial-university" ? faculty : undefined,
        groupNumber: organizationType === "financial-university" ? groupNumber.trim() : undefined,
        marketingConsent: agreeMarketing,
        verification_token: verificationToken ?? undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || t("registrationFailed"));
  };

  const finishToWelcome = async () => {
    setDirection(1);
    setStepIndex(STEP_ORDER.length);
    await new Promise((r) => setTimeout(r, 1800));
    window.location.href = "/";
  };

  const submitConsentAndRegister = async () => {
    setSubmitting(true);
    try {
      await registerAccount();
      goNext();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: t("registrationFailed"),
        description: err.message || t("somethingWentWrong"),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const submitPinAndFinish = async (finalPin: string) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/set-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: finalPin }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || t("somethingWentWrong"));
      }
      await finishToWelcome();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: t("error"),
        description: err.message || t("somethingWentWrong"),
      });
      setSubmitting(false);
      setConfirmPin("");
      setPinPhase("set");
      setPin("");
    }
  };

  const skipPin = async () => {
    setSubmitting(true);
    await finishToWelcome();
  };

  // ------- Indicator -------
  const totalSteps = STEP_ORDER.length;
  const currentDisplayIndex = Math.min(stepIndex, totalSteps - 1);

  const stepTitles: Record<StepKey, string> = useMemo(
    () => ({
      email: t("wizardEmailTitle"),
      verify: t("wizardVerifyTitle"),
      personal: t("wizardPersonalTitle"),
      organization: t("wizardOrgTitle"),
      password: t("wizardPasswordTitle"),
      consent: t("wizardConsentTitle"),
      pin: t("wizardPinTitle"),
      welcome: t("wizardWelcomeTitle"),
    }),
    [t],
  );

  return (
    <div className="w-full">
      {step !== "welcome" && (
        <>
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={goBack}
              data-testid="button-wizard-back"
              aria-label={t("back")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div
              className="flex items-center gap-1.5"
              data-testid="wizard-step-indicator"
            >
              {STEP_ORDER.map((_, i) => {
                const isCompleted = i < currentDisplayIndex;
                const isCurrent = i === currentDisplayIndex;
                return (
                  <span
                    key={i}
                    className={cn(
                      "h-2 rounded-full transition-all",
                      isCurrent
                        ? "w-6 bg-primary animate-pulse"
                        : isCompleted
                          ? "w-2 bg-primary"
                          : "w-2 bg-muted",
                    )}
                    data-testid={`step-dot-${i}`}
                  />
                );
              })}
            </div>
            <div className="w-9" />
          </div>

          <div className="mb-4">
            <h2
              className="text-2xl font-bold mb-1"
              data-testid="text-wizard-step-title"
            >
              {stepTitles[step]}
            </h2>
          </div>
        </>
      )}

      <div className="relative min-h-[360px]">
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="w-full"
          >
            {step === "email" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {t("wizardEmailSubtitle")}
                </p>
                <div className="space-y-2">
                  <Label htmlFor="wizard-email">{t("email")}</Label>
                  <Input
                    id="wizard-email"
                    type="email"
                    autoFocus
                    placeholder={t("emailPlaceholder")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    data-testid="input-wizard-email"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && validEmail) submitEmail();
                    }}
                  />
                </div>
                <Button
                  className="w-full"
                  disabled={!validEmail || sendingCode}
                  onClick={submitEmail}
                  data-testid="button-wizard-email-continue"
                >
                  {sendingCode ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    t("continue")
                  )}
                </Button>
                <div className="text-center text-sm text-muted-foreground">
                  {t("alreadyHaveAccount")}{" "}
                  <button
                    onClick={onSwitchToLogin}
                    className="text-primary hover:underline font-medium"
                    data-testid="button-wizard-go-signin"
                  >
                    {t("signIn")}
                  </button>
                </div>
              </div>
            )}

            {step === "verify" && (
              <div className="space-y-5">
                <p className="text-sm text-muted-foreground">
                  {t("wizardVerifySubtitle")}{" "}
                  <span
                    className="font-medium text-foreground"
                    data-testid="text-wizard-verify-email"
                  >
                    {email}
                  </span>
                </p>
                <div className="flex justify-between gap-2">
                  {verificationCode.map((digit, i) => (
                    <Input
                      key={i}
                      ref={(el) => (verifyInputsRef.current[i] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeChange(i, e.target.value)}
                      onPaste={handleCodePaste}
                      onKeyDown={(e) => handleCodeKeyDown(i, e)}
                      autoFocus={i === 0}
                      className="h-14 w-12 text-center text-xl font-semibold"
                      data-testid={`input-verify-digit-${i}`}
                      disabled={verifying}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <button
                    onClick={() => {
                      setVerificationCode(Array(6).fill(""));
                      setDirection(-1);
                      setStepIndex(0);
                    }}
                    className="text-primary hover:underline font-medium"
                    data-testid="button-wizard-change-email"
                  >
                    {t("changeEmail")}
                  </button>
                  {resendCountdown > 0 ? (
                    <span
                      className="text-muted-foreground"
                      data-testid="text-resend-countdown"
                    >
                      {t("resendIn")} {resendCountdown}s
                    </span>
                  ) : (
                    <button
                      onClick={() => sendVerificationCode(true)}
                      disabled={sendingCode}
                      className="text-primary hover:underline font-medium disabled:opacity-50"
                      data-testid="button-wizard-resend-code"
                    >
                      {t("resendCode")}
                    </button>
                  )}
                </div>
                {verifying && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t("verifying")}
                  </div>
                )}
              </div>
            )}

            {step === "personal" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {t("wizardPersonalSubtitle")}
                </p>
                <div className="space-y-2">
                  <Label htmlFor="wizard-firstName">{t("firstName")}</Label>
                  <Input
                    id="wizard-firstName"
                    autoFocus
                    placeholder={t("firstNamePlaceholder")}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    onBlur={() => validatePersonalField("firstName")}
                    data-testid="input-wizard-firstname"
                    aria-invalid={!!personalErrors.firstName}
                  />
                  {personalErrors.firstName && (
                    <p className="text-xs text-destructive" data-testid="error-firstname">
                      {personalErrors.firstName}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wizard-lastName">{t("lastName")}</Label>
                  <Input
                    id="wizard-lastName"
                    placeholder={t("lastNamePlaceholder")}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    onBlur={() => validatePersonalField("lastName")}
                    data-testid="input-wizard-lastname"
                    aria-invalid={!!personalErrors.lastName}
                  />
                  {personalErrors.lastName && (
                    <p className="text-xs text-destructive" data-testid="error-lastname">
                      {personalErrors.lastName}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wizard-patronymic">{t("patronymic")}</Label>
                  <Input
                    id="wizard-patronymic"
                    placeholder={t("patronymicPlaceholder")}
                    value={patronymic}
                    onChange={(e) => setPatronymic(e.target.value)}
                    onBlur={() => validatePersonalField("patronymic")}
                    disabled={noPatronymic}
                    data-testid="input-wizard-patronymic"
                    aria-invalid={!!personalErrors.patronymic}
                  />
                  {personalErrors.patronymic && (
                    <p
                      className="text-xs text-destructive"
                      data-testid="error-patronymic"
                    >
                      {personalErrors.patronymic}
                    </p>
                  )}
                  <div className="flex items-center space-x-2 pt-1">
                    <Checkbox
                      id="wizard-no-patronymic"
                      checked={noPatronymic}
                      onCheckedChange={(c) => {
                        setNoPatronymic(c as boolean);
                        if (c) {
                          setPatronymic("");
                          setPersonalErrors((p) => ({ ...p, patronymic: undefined }));
                        }
                      }}
                      data-testid="checkbox-wizard-no-patronymic"
                    />
                    <Label
                      htmlFor="wizard-no-patronymic"
                      className="text-sm font-normal cursor-pointer"
                    >
                      {t("noPatronymic")}
                    </Label>
                  </div>
                </div>
                <Button
                  className="w-full"
                  disabled={!personalValid}
                  onClick={() => {
                    validatePersonalField("firstName");
                    validatePersonalField("lastName");
                    validatePersonalField("patronymic");
                    if (personalValid) goNext();
                  }}
                  data-testid="button-wizard-personal-continue"
                >
                  {t("continue")}
                </Button>
              </div>
            )}

            {step === "organization" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {t("wizardOrgSubtitle")}
                </p>
                <div className="space-y-2">
                  <Label>{t("organizationType")}</Label>
                  <Select
                    value={organizationType}
                    onValueChange={(v) => {
                      setOrganizationType(v);
                      if (v === "financial-university") {
                        setOrganizationName(t("financialUniversityOption"));
                        setFaculty("");
                      } else {
                        setOrganizationName("");
                        setFaculty("");
                        setGroupNumber("");
                      }
                    }}
                  >
                    <SelectTrigger data-testid="select-wizard-org-type">
                      <SelectValue placeholder={t("selectOrganization")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="financial-university">
                        {t("financialUniversityOption")}
                      </SelectItem>
                      <SelectItem value="other-university">
                        {t("otherUniversityOption")}
                      </SelectItem>
                      <SelectItem value="school">{t("schoolOption")}</SelectItem>
                      <SelectItem value="workplace">
                        {t("workplaceOption")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {organizationType === "financial-university" && (
                  <div className="space-y-2">
                    <Label>{t("faculty")}</Label>
                    <Select value={faculty} onValueChange={setFaculty}>
                      <SelectTrigger data-testid="select-wizard-faculty">
                        <SelectValue placeholder={t("selectFaculty")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="higher-school-management">
                          {t("facultyHigherSchoolManagement")}
                        </SelectItem>
                        <SelectItem value="international-relations">
                          {t("facultyInternationalRelations")}
                        </SelectItem>
                        <SelectItem value="tax-audit-business">
                          {t("facultyTaxAuditBusiness")}
                        </SelectItem>
                        <SelectItem value="law">{t("facultyLaw")}</SelectItem>
                        <SelectItem value="social-sciences">
                          {t("facultySocialSciences")}
                        </SelectItem>
                        <SelectItem value="it">{t("facultyIT")}</SelectItem>
                        <SelectItem value="finance">{t("facultyFinance")}</SelectItem>
                        <SelectItem value="economics-business">
                          {t("facultyEconomicsBusiness")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="space-y-2 pt-2">
                      <Label>{t("groupNumber")}</Label>
                      <Input
                        value={groupNumber}
                        onChange={(e) => setGroupNumber(e.target.value)}
                        placeholder={t("groupNumberPlaceholder")}
                        maxLength={32}
                        data-testid="input-wizard-group-number"
                      />
                      <p className="text-xs text-muted-foreground">{t("groupNumberHelp")}</p>
                    </div>
                  </div>
                )}

                {organizationType && organizationType !== "financial-university" && (
                  <div className="space-y-2">
                    <Label>
                      {organizationType === "other-university"
                        ? t("universityName")
                        : organizationType === "school"
                          ? t("schoolName")
                          : t("workplaceName")}
                    </Label>
                    <Input
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      placeholder={
                        organizationType === "other-university"
                          ? t("universityNamePlaceholder")
                          : organizationType === "school"
                            ? t("schoolNamePlaceholder")
                            : t("workplaceNamePlaceholder")
                      }
                      data-testid="input-wizard-org-name"
                    />
                  </div>
                )}

                <Button
                  className="w-full"
                  disabled={!orgValid}
                  onClick={goNext}
                  data-testid="button-wizard-org-continue"
                >
                  {t("continue")}
                </Button>
              </div>
            )}

            {step === "password" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {t("wizardPasswordSubtitle")}
                </p>
                <div className="space-y-2">
                  <Label htmlFor="wizard-password">{t("password")}</Label>
                  <div className="relative">
                    <Input
                      id="wizard-password"
                      type={showPassword ? "text" : "password"}
                      autoFocus
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t("password")}
                      className="pr-10"
                      data-testid="input-wizard-password"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                      onClick={() => setShowPassword((s) => !s)}
                      data-testid="button-toggle-password-visibility"
                      aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
                    {[1, 2, 3, 4].map((seg) => (
                      <div
                        key={seg}
                        className={cn(
                          "flex-1 transition-colors",
                          seg <= passwordScore
                            ? passwordScore <= 1
                              ? "bg-destructive"
                              : passwordScore <= 2
                                ? "bg-orange-500"
                                : passwordScore <= 3
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                            : "bg-transparent",
                          seg !== 1 && "ml-0.5",
                        )}
                        data-testid={`password-strength-bar-${seg}`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground" data-testid="text-password-strength">
                    {password.length === 0
                      ? t("passwordStrength")
                      : passwordScore <= 1
                        ? t("strengthWeak")
                        : passwordScore <= 2
                          ? t("strengthFair")
                          : passwordScore <= 3
                            ? t("strengthMedium")
                            : t("strengthStrong")}
                  </p>
                </div>

                <ul className="space-y-1.5 text-sm">
                  {[
                    { ok: passwordChecks.length, label: t("pwReqLength") },
                    { ok: passwordChecks.upper, label: t("pwReqUpper") },
                    { ok: passwordChecks.special, label: t("pwReqSpecial") },
                    { ok: passwordChecks.digit, label: t("pwReqDigit") },
                  ].map((req, i) => (
                    <li
                      key={i}
                      className={cn(
                        "flex items-center gap-2",
                        req.ok ? "text-green-600 dark:text-green-500" : "text-muted-foreground",
                      )}
                      data-testid={`pw-requirement-${i}`}
                    >
                      <span
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded-full text-xs",
                          req.ok ? "bg-green-500/15" : "bg-muted",
                        )}
                      >
                        {req.ok && <Check className="w-3 h-3" />}
                      </span>
                      {req.label}
                    </li>
                  ))}
                </ul>

                {passwordValid && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-2"
                  >
                    <Label htmlFor="wizard-confirm">{t("confirmPassword")}</Label>
                    <div className="relative">
                      <Input
                        id="wizard-confirm"
                        type={showConfirm ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder={t("confirmPassword")}
                        className="pr-10"
                        data-testid="input-wizard-confirm-password"
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                        onClick={() => setShowConfirm((s) => !s)}
                        data-testid="button-toggle-confirm-visibility"
                        aria-label={showConfirm ? t("hidePassword") : t("showPassword")}
                      >
                        {showConfirm ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {confirmPassword && !passwordsMatch && (
                      <p className="text-xs text-destructive" data-testid="error-confirm-password">
                        {t("passwordsDoNotMatch")}
                      </p>
                    )}
                  </motion.div>
                )}

                <Button
                  className="w-full"
                  disabled={!passwordValid || !passwordsMatch}
                  onClick={goNext}
                  data-testid="button-wizard-password-continue"
                >
                  {t("continue")}
                </Button>
              </div>
            )}

            {step === "consent" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {t("wizardConsentSubtitle")}
                </p>
                <ConsentRow
                  id="agree-terms"
                  checked={agreeTerms}
                  onChange={setAgreeTerms}
                  prefix={t("consentAgreeTo")}
                  linkText={t("consentTermsLink")}
                  onLinkClick={() => setLegalSheet("terms")}
                  testId="checkbox-agree-terms"
                  required
                />
                <ConsentRow
                  id="agree-privacy"
                  checked={agreePrivacy}
                  onChange={setAgreePrivacy}
                  prefix={t("consentAgreeTo")}
                  linkText={t("consentPrivacyLink")}
                  onLinkClick={() => setLegalSheet("privacy")}
                  testId="checkbox-agree-privacy"
                  required
                />
                <ConsentRow
                  id="agree-data"
                  checked={agreeData}
                  onChange={setAgreeData}
                  prefix={t("consentAgreeTo")}
                  linkText={t("consentDataLink")}
                  onLinkClick={() => setLegalSheet("data")}
                  testId="checkbox-agree-data"
                  required
                />
                <ConsentRow
                  id="agree-marketing"
                  checked={agreeMarketing}
                  onChange={setAgreeMarketing}
                  prefix={t("consentMarketingPrefix")}
                  linkText={t("consentMarketingLink")}
                  onLinkClick={() => setLegalSheet("marketing")}
                  testId="checkbox-agree-marketing"
                  optional
                  optionalLabel={t("optional")}
                />
                <Button
                  className="w-full"
                  disabled={!consentValid || submitting}
                  onClick={submitConsentAndRegister}
                  data-testid="button-wizard-consent-continue"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    t("continue")
                  )}
                </Button>
              </div>
            )}

            {step === "pin" && (
              <div className="space-y-5">
                <p className="text-sm text-muted-foreground">
                  {pinPhase === "set"
                    ? t("wizardPinSubtitle")
                    : t("wizardPinConfirmSubtitle")}
                </p>
                <div
                  className="flex justify-center gap-3"
                  data-testid="pin-dots"
                >
                  {Array.from({ length: 6 }).map((_, i) => {
                    const filled =
                      (pinPhase === "set" ? pin.length : confirmPin.length) > i;
                    return (
                      <div
                        key={i}
                        className={cn(
                          "h-3 w-3 rounded-full transition-all",
                          filled ? "bg-primary scale-110" : "bg-muted",
                        )}
                        data-testid={`pin-dot-${i}`}
                      />
                    );
                  })}
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                    <Button
                      key={n}
                      variant="outline"
                      size="lg"
                      className="h-14 text-xl font-medium"
                      onClick={() => handlePinDigit(String(n))}
                      disabled={submitting}
                      data-testid={`pin-key-${n}`}
                    >
                      {n}
                    </Button>
                  ))}
                  <div />
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-14 text-xl font-medium"
                    onClick={() => handlePinDigit("0")}
                    disabled={submitting}
                    data-testid="pin-key-0"
                  >
                    0
                  </Button>
                  <Button
                    variant="ghost"
                    size="lg"
                    className="h-14"
                    onClick={handlePinDelete}
                    disabled={submitting}
                    data-testid="pin-key-delete"
                    aria-label={t("delete")}
                  >
                    <DeleteIcon className="w-5 h-5" />
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={skipPin}
                  disabled={submitting}
                  data-testid="button-wizard-pin-skip"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    t("skipForNow")
                  )}
                </Button>
              </div>
            )}

            {step === "welcome" && (
              <div className="flex flex-col items-center justify-center text-center space-y-4 py-12">
                <motion.div
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 12 }}
                  className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/15"
                >
                  <PartyPopper className="w-10 h-10 text-primary" />
                </motion.div>
                <motion.h2
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-2xl font-bold"
                  data-testid="text-wizard-welcome"
                >
                  {t("wizardWelcomeTitle")}
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-sm text-muted-foreground"
                >
                  {t("wizardWelcomeSubtitle")}
                </motion.p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <Sheet open={!!legalSheet} onOpenChange={(o) => !o && setLegalSheet(null)}>
        <SheetContent side="bottom" className="h-[80vh]">
          {legalSheet && (() => {
            const doc = legalContent[language === "ru" ? "ru" : "en"][legalSheet];
            const title =
              legalSheet === "terms"
                ? t("consentTermsLink")
                : legalSheet === "privacy"
                  ? t("consentPrivacyLink")
                  : legalSheet === "data"
                    ? t("consentDataLink")
                    : t("consentMarketingLink");
            return (
              <>
                <SheetHeader>
                  <SheetTitle data-testid={`text-legal-title-${legalSheet}`}>
                    {title}
                  </SheetTitle>
                  <SheetDescription data-testid={`text-legal-updated-${legalSheet}`}>
                    {doc.lastUpdated}
                  </SheetDescription>
                </SheetHeader>
                <ScrollArea className="h-full pr-4 mt-4">
                  <div className="space-y-4 text-sm pb-12">
                    <p className="text-muted-foreground" data-testid={`text-legal-intro-${legalSheet}`}>
                      {doc.intro}
                    </p>
                    {doc.sections.map((section, i) => (
                      <div key={i} className="space-y-1">
                        {section.heading && (
                          <h3 className="font-semibold text-foreground">
                            {section.heading}
                          </h3>
                        )}
                        <p className="text-muted-foreground whitespace-pre-line">
                          {section.body}
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}

interface ConsentRowProps {
  id: string;
  checked: boolean;
  onChange: (b: boolean) => void;
  prefix: string;
  linkText: string;
  onLinkClick: () => void;
  testId: string;
  required?: boolean;
  optional?: boolean;
  optionalLabel?: string;
}

function ConsentRow({
  id,
  checked,
  onChange,
  prefix,
  linkText,
  onLinkClick,
  testId,
  optional,
  optionalLabel,
}: ConsentRowProps) {
  return (
    <div className="flex items-start space-x-2">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(c) => onChange(c as boolean)}
        data-testid={testId}
      />
      <Label
        htmlFor={id}
        className="text-sm font-normal cursor-pointer leading-snug"
      >
        {prefix}{" "}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onLinkClick();
          }}
          className="text-primary hover:underline font-medium"
          data-testid={`${testId}-link`}
        >
          {linkText}
        </button>
        {optional && optionalLabel && (
          <span className="text-muted-foreground ml-1">({optionalLabel})</span>
        )}
      </Label>
    </div>
  );
}
