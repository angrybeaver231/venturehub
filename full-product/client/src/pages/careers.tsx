import { useState, useMemo, useRef, useEffect } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import DOMPurify from "dompurify";
import {
  Briefcase,
  MapPin,
  Clock,
  ArrowLeft,
  ArrowRight,
  Building2,
  Search,
  CheckCircle,
  Globe,
  FileUp,
  File,
  X,
  Lock,
  Handshake,
  Sparkles,
  Rocket,
  Plus,
  Heart,
  BadgeCheck,
  Navigation,
  ChevronRight,
} from "lucide-react";
import businessClubLogo from "@assets/photo_5393419750937327414_c_1761607336354.jpg";
import { PublicSidebar, PublicMobileTopBar, buildPublicNavItems } from "@/components/public-sidebar";

interface JobOpening {
  id: string;
  title: string;
  department: string;
  location: string;
  employmentType: string;
  description: string;
  requirements: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  status: string;
  isPartner: boolean;
  isHighlighted: boolean;
  isFounderProject: boolean;
  companyName: string | null;
  companyLogoUrl: string | null;
  founderName: string | null;
  founderProjectName: string | null;
  founderLogoUrl: string | null;
  submittedBy: string | null;
  createdAt: string;
  experienceLevel: string | null;
  viewCount: number;
  paymentFrequency: string | null;
  accentColor: string | null;
  metroStations: string | null;
  isVerified: boolean;
  publishedAt: string | null;
  field: string | null;
  specialization: string | null;
  companyDescription: string | null;
  companyType: string | null;
  schedule: string | null;
  workHours: string | null;
  isRemote: boolean;
  isSpecialBranding?: boolean;
  specialBrandingColor?: string | null;
  specialBrandingLogoUrl?: string | null;
  specialBrandingBannerUrl?: string | null;
}

type ViewMode = "list" | "detail" | "company";

export default function Careers() {
  const { t, language, setLanguage } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedJob, setSelectedJob] = useState<JobOpening | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [applicationSuccess, setApplicationSuccess] = useState(false);
  const [fieldFilter, setFieldFilter] = useState("all");
  const [specializationFilter, setSpecializationFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [showMySubmissions, setShowMySubmissions] = useState(false);
  const [submitForm, setSubmitForm] = useState({
    title: "",
    department: "",
    location: "",
    employmentType: "full-time",
    description: "",
    requirements: "",
    salaryMin: "",
    salaryMax: "",
    salaryCurrency: "RUB",
    isFounderProject: true,
    founderName: "",
    founderProjectName: "",
  });

  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    applicantName: "",
    email: "",
    phone: "",
    coverLetter: "",
    password: "",
  });
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [candidateCreated, setCandidateCreated] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: openings = [], isLoading } = useQuery<JobOpening[]>({
    queryKey: ["/api/careers/openings"],
  });

  const applyMutation = useMutation({
    mutationFn: async (body: {
      jobId: string;
      applicantName: string;
      email: string;
      phone?: string;
      resumeUrl?: string;
      coverLetter?: string;
      password?: string;
    }) => {
      const res = await apiRequest("/api/careers/apply", {
        method: "POST",
        body: JSON.stringify(body),
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/careers/openings"] });
      setApplicationSuccess(true);
      setCandidateCreated(!!data?.candidateCreated);
      setFormData({ applicantName: "", email: "", phone: "", coverLetter: "", password: "" });
      setResumeFile(null);
    },
  });

  const { data: mySubmissions = [], isLoading: mySubmissionsLoading } = useQuery<JobOpening[]>({
    queryKey: ["/api/careers/openings/mine"],
    enabled: isAuthenticated,
  });

  const submitPositionMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("/api/careers/openings/submit", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/careers/openings/mine"] });
      setSubmitDialogOpen(false);
      setSubmitForm({
        title: "", department: "", location: "", employmentType: "full-time",
        description: "", requirements: "", salaryMin: "", salaryMax: "",
        salaryCurrency: "RUB", isFounderProject: true, founderName: "",
        founderProjectName: "",
      });
      toast({ title: t("positionSubmitted"), description: t("positionSubmittedDesc") });
    },
  });

  const handleSubmitPosition = () => {
    const data: Record<string, unknown> = {
      title: submitForm.title,
      department: submitForm.department,
      location: submitForm.location,
      employmentType: submitForm.employmentType,
      description: submitForm.description,
      requirements: submitForm.requirements || null,
      salaryMin: submitForm.salaryMin ? parseInt(submitForm.salaryMin) : null,
      salaryMax: submitForm.salaryMax ? parseInt(submitForm.salaryMax) : null,
      salaryCurrency: submitForm.salaryCurrency,
      isFounderProject: submitForm.isFounderProject,
      founderName: submitForm.founderName || null,
      founderProjectName: submitForm.founderProjectName || null,
    };
    submitPositionMutation.mutate(data);
  };

  const FIELD_OPTIONS = [
    { value: "fintech", label: t("fieldFintech") },
    { value: "edtech", label: t("fieldEdtech") },
    { value: "healthtech", label: t("fieldHealthtech") },
    { value: "ecommerce", label: t("fieldEcommerce") },
    { value: "ai", label: t("fieldAI") },
    { value: "saas", label: t("fieldSaaS") },
    { value: "gamedev", label: t("fieldGamedev") },
    { value: "media", label: t("fieldMedia") },
    { value: "logistics", label: t("fieldLogistics") },
    { value: "hr", label: t("fieldHR") },
    { value: "legaltech", label: t("fieldLegaltech") },
    { value: "insurtech", label: t("fieldInsurtech") },
    { value: "other", label: t("fieldOther") },
  ];

  const getFieldLabel = (value: string | null) => {
    if (!value) return null;
    const opt = FIELD_OPTIONS.find((o) => o.value === value);
    return opt ? opt.label : value;
  };

  const specializations = useMemo(() => {
    const set = new Set(openings.map((o) => o.specialization).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [openings]);

  const companies = useMemo(() => {
    const set = new Set<string>();
    openings.forEach((o) => {
      const name = o.companyName || o.founderProjectName || o.department;
      if (name) set.add(name);
    });
    return Array.from(set).sort();
  }, [openings]);

  const filtered = useMemo(() => {
    const result = openings.filter((job) => {
      if (fieldFilter !== "all" && job.field !== fieldFilter) return false;
      if (specializationFilter !== "all" && job.specialization !== specializationFilter) return false;
      if (companyFilter !== "all") {
        const jobCompany = job.companyName || job.founderProjectName || job.department;
        if (jobCompany !== companyFilter) return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          job.title.toLowerCase().includes(q) ||
          job.department.toLowerCase().includes(q) ||
          job.location.toLowerCase().includes(q) ||
          (job.companyName || "").toLowerCase().includes(q) ||
          (job.founderName || "").toLowerCase().includes(q) ||
          (job.founderProjectName || "").toLowerCase().includes(q) ||
          (job.specialization || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
    return result.sort((a, b) => {
      if (a.isHighlighted && !b.isHighlighted) return -1;
      if (!a.isHighlighted && b.isHighlighted) return 1;
      return 0;
    });
  }, [openings, fieldFilter, specializationFilter, companyFilter, searchQuery]);

  const companyJobs = useMemo(() => {
    if (!selectedCompany) return [];
    return openings.filter((o) => {
      const name = o.companyName || o.founderProjectName || o.department;
      return name === selectedCompany;
    });
  }, [openings, selectedCompany]);

  const companyInfo = useMemo(() => {
    if (!selectedCompany) return null;
    const job = openings.find((o) => {
      const name = o.companyName || o.founderProjectName || o.department;
      return name === selectedCompany;
    });
    if (!job) return null;
    return {
      name: selectedCompany,
      logoUrl: job.companyLogoUrl || job.founderLogoUrl,
      isVerified: job.isVerified,
      description: job.companyDescription,
      type: job.companyType,
      isPartner: job.isPartner,
      isFounderProject: job.isFounderProject,
    };
  }, [openings, selectedCompany]);

  const employmentTypeLabel = (type: string) => {
    switch (type) {
      case "full-time": return language === "ru" ? "Полная занятость" : "Full-time";
      case "part-time": return language === "ru" ? "Частичная занятость" : "Part-time";
      case "internship": return language === "ru" ? "Стажировка" : "Internship";
      default: return type;
    }
  };

  useEffect(() => {
    if (selectedJob && viewMode === "detail") {
      apiRequest(`/api/careers/openings/${selectedJob.id}/view`, { method: "POST" }).catch(() => {});
    }
  }, [selectedJob?.id, viewMode]);

  const toggleFavorite = (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  };

  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case "RUB": return "\u20BD";
      case "USD": return "$";
      case "EUR": return "\u20AC";
      default: return currency;
    }
  };

  const formatSalary = (job: JobOpening) => {
    if (!job.salaryMin && !job.salaryMax) return null;
    const currency = job.salaryCurrency || "RUB";
    const symbol = getCurrencySymbol(currency);
    const fmt = (n: number) =>
      new Intl.NumberFormat(language === "ru" ? "ru-RU" : "en-US").format(n);
    const freqLabel = job.paymentFrequency === "twice_monthly"
      ? (language === "ru" ? ", на руки" : ", net")
      : "";
    const suffix = ` ${symbol} ${language === "ru" ? "в месяц" : "per month"}${freqLabel}`;
    if (job.salaryMin && job.salaryMax) return `${fmt(job.salaryMin)} \u2013 ${fmt(job.salaryMax)}${suffix}`;
    if (job.salaryMin) return `${language === "ru" ? "от" : "from"} ${fmt(job.salaryMin)}${suffix}`;
    return `${language === "ru" ? "от" : "from"} ${fmt(job.salaryMax!)}${suffix}`;
  };

  const getExperienceLabel = (level: string | null) => {
    switch (level) {
      case "none": return t("noExperience");
      case "1-3": return t("experience1to3");
      case "3-6": return t("experience3to6");
      case "6+": return t("experience6plus");
      default: return null;
    }
  };

  const getPaymentFrequencyLabel = (freq: string | null) => {
    switch (freq) {
      case "twice_monthly": return t("paymentTwiceMonth");
      case "monthly": return t("paymentMonthly");
      case "weekly": return t("paymentWeekly");
      default: return null;
    }
  };

  const getScheduleLabel = (schedule: string | null) => {
    switch (schedule) {
      case "5/2": return t("schedule52");
      case "2/2": return t("schedule22");
      case "flex": return t("flexSchedule");
      default: return schedule;
    }
  };

  const getPublishedDateText = (job: JobOpening) => {
    const dateStr = job.publishedAt || job.createdAt;
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return t("publishedToday");
    if (diffDays === 1) return t("publishedYesterday");
    return `${t("publishedOn")} ${diffDays} ${t("publishedDaysAgo")}`;
  };

  const getAccentColorClass = (color: string | null) => {
    switch (color) {
      case "orange": return "bg-orange-500";
      case "blue": return "bg-blue-500";
      case "green": return "bg-green-500";
      case "purple": return "bg-purple-500";
      default: return null;
    }
  };

  const openJobDetail = (job: JobOpening) => {
    setSelectedJob(job);
    setViewMode("detail");
    window.scrollTo(0, 0);
  };

  const openCompanyProfile = (companyName: string) => {
    setSelectedCompany(companyName);
    setViewMode("company");
    window.scrollTo(0, 0);
  };

  const backToList = () => {
    setViewMode("list");
    setSelectedJob(null);
    setSelectedCompany(null);
  };

  const handleApply = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!selectedJob) return;

    let resumeUrl: string | undefined;
    if (resumeFile) {
      setResumeUploading(true);
      try {
        const fd = new FormData();
        fd.append("resume", resumeFile);
        const uploadRes = await fetch("/api/careers/upload-resume", { method: "POST", body: fd });
        if (!uploadRes.ok) throw new Error("Upload failed");
        const uploadData = await uploadRes.json();
        resumeUrl = uploadData.url;
      } catch {
        setResumeUploading(false);
        setUploadError(t("uploadingResume"));
        return;
      }
      setResumeUploading(false);
    }

    applyMutation.mutate({
      jobId: selectedJob.id,
      applicantName: formData.applicantName,
      email: formData.email,
      phone: formData.phone || undefined,
      resumeUrl,
      coverLetter: formData.coverLetter || undefined,
      password: formData.password || undefined,
    });
  };

  const handleCloseDialog = () => {
    setApplyDialogOpen(false);
    setApplicationSuccess(false);
    setUploadError("");
  };

  const getCompanyName = (job: JobOpening) => {
    return job.companyName || job.founderProjectName || job.department;
  };

  const renderHeader = () => (
    <header className={`fixed top-0 right-0 z-40 bg-[#09090b]/80 backdrop-blur-xl border-b border-white/[0.12] ${isAuthenticated ? "left-0" : "left-0 lg:left-[110px] top-[56px] lg:top-0"}`}>
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 md:h-20 gap-2">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 group shrink-0" data-testid="link-logo-home">
            <Avatar className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0 ring-2 ring-white/10 transition-all duration-300">
              <AvatarImage src={businessClubLogo} alt="Business Club Logo" />
              <AvatarFallback className="bg-cyan-500/20 text-cyan-300 text-xs font-bold">ПК</AvatarFallback>
            </Avatar>
            <div className="min-w-0 hidden sm:block">
              <span className="text-sm font-semibold tracking-tight text-white/90">
                {language === "ru" ? "Предпринимательский Клуб" : "Entrepreneurship Club"}
              </span>
              <p className="text-[10px] text-white/40 tracking-wide uppercase">
                {t("careerPortal")}
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLanguage(language === "en" ? "ru" : "en")}
              data-testid="button-language-toggle"
              className="text-white/60"
            >
              <Globe className="h-4 w-4" />
            </Button>
            {isAuthenticated ? (
              <Button variant="outline" size="sm" className="rounded-full text-xs sm:text-sm font-semibold text-white border border-white/15" asChild>
                <Link href="/dashboard" data-testid="link-back-dashboard">{language === "ru" ? "На платформу" : "Back to Platform"}</Link>
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" className="rounded-full text-xs sm:text-sm font-semibold text-white border border-white/15 hidden sm:inline-flex" asChild>
                  <Link href="/" data-testid="link-back-home">{language === "ru" ? "На главную" : "Home"}</Link>
                </Button>
                <Button variant="outline" size="sm" className="rounded-full text-xs sm:text-sm font-semibold text-white border border-white/15" asChild>
                  <Link href="/candidate/login" data-testid="link-candidate-login">{language === "ru" ? "Кандидатам" : "Candidates"}</Link>
                </Button>
                <Button size="sm" className="rounded-full text-xs sm:text-sm font-semibold bg-cyan-500 text-black border-0" asChild>
                  <Link href="/login" data-testid="link-header-login">{t("login")}</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );

  const renderJobDetailView = () => {
    if (!selectedJob) return null;
    const salary = formatSalary(selectedJob);
    const companyName = getCompanyName(selectedJob);

    return (
      <div className="max-w-3xl mx-auto space-y-6 pt-28 pb-20 px-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="text-white/50"
            onClick={backToList}
            data-testid="button-back-to-list"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          <button
            onClick={(e) => toggleFavorite(selectedJob.id, e)}
            className="p-2"
            data-testid="button-favorite-detail"
          >
            <Heart className={`w-6 h-6 ${favorites.has(selectedJob.id) ? "fill-red-500 text-red-500" : "text-white/30"}`} />
          </button>
        </div>

        <div className="space-y-5">
          <h1 className="text-2xl md:text-3xl font-bold text-white" data-testid="text-job-detail-title">
            {selectedJob.title}
          </h1>

          {salary && (
            <p className="text-xl font-bold text-white" data-testid="text-detail-salary">
              {salary}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 text-sm text-white/60">
            <span>{employmentTypeLabel(selectedJob.employmentType)}</span>
            {getExperienceLabel(selectedJob.experienceLevel) && (
              <>
                <span className="text-white/20">·</span>
                <span>{getExperienceLabel(selectedJob.experienceLevel)}</span>
              </>
            )}
            {selectedJob.schedule && (
              <>
                <span className="text-white/20">·</span>
                <span>{getScheduleLabel(selectedJob.schedule)}</span>
              </>
            )}
            {selectedJob.workHours && (
              <>
                <span className="text-white/20">·</span>
                <span>{language === "ru" ? `Рабочие часы ${selectedJob.workHours}` : `${selectedJob.workHours} work hours`}</span>
              </>
            )}
            {getPaymentFrequencyLabel(selectedJob.paymentFrequency) && (
              <>
                <span className="text-white/20">·</span>
                <span>{getPaymentFrequencyLabel(selectedJob.paymentFrequency)}</span>
              </>
            )}
          </div>

          {selectedJob.isRemote && (
            <Badge variant="outline" className="border-green-500/30 text-green-400">
              {t("remote")}
            </Badge>
          )}

          <Card className="bg-white/[0.03] border-white/[0.08] p-5 space-y-2">
            <p className="text-sm text-white/40">{t("whereToWork")}</p>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-white/60 flex-shrink-0" />
              <span className="text-white font-medium">{selectedJob.location}</span>
            </div>
            {selectedJob.metroStations && (
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {selectedJob.metroStations.split(",").map((station, idx) => (
                  <span key={idx} className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      idx % 3 === 0 ? "bg-red-500" : idx % 3 === 1 ? "bg-green-500" : "bg-blue-500"
                    }`} />
                    <span className="text-white/70 text-sm">{station.trim()}</span>
                  </span>
                ))}
              </div>
            )}
            <button className="flex items-center gap-1.5 text-sm text-cyan-400 mt-2" data-testid="button-request-address">
              <Navigation className="w-3.5 h-3.5" />
              {t("requestAddress")}
            </button>
          </Card>

          {getPublishedDateText(selectedJob) && (
            <p className="text-sm text-white/40" data-testid="text-detail-published">
              {getPublishedDateText(selectedJob)}
            </p>
          )}

          <div
            className="p-5 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-3 cursor-pointer hover-elevate"
            onClick={() => openCompanyProfile(companyName)}
            data-testid="card-company-info"
          >
            <div className="flex items-center gap-3">
              {(selectedJob.companyLogoUrl || selectedJob.founderLogoUrl) ? (
                <Avatar className="w-10 h-10 flex-shrink-0">
                  <AvatarImage src={selectedJob.companyLogoUrl || selectedJob.founderLogoUrl || ""} alt={companyName} />
                  <AvatarFallback className="bg-cyan-500/20 text-cyan-300 text-xs font-bold">
                    {companyName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-white/40" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold flex items-center gap-1.5" data-testid="text-detail-company-name">
                  {companyName}
                  {selectedJob.isVerified && <BadgeCheck className="w-4 h-4 text-blue-500" />}
                </p>
                {selectedJob.companyType && (
                  <p className="text-sm text-white/40">{selectedJob.companyType}</p>
                )}
              </div>
              <ChevronRight className="w-5 h-5 text-white/30 flex-shrink-0" />
            </div>
          </div>

          <div className="h-px bg-white/[0.08]" />

          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white">{t("description")}</h3>
            <div
              className="text-white/50 leading-relaxed prose prose-invert prose-sm max-w-none [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_li]:mb-1 [&_p]:mb-2 [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_h1]:text-white/70 [&_h2]:text-white/70 [&_h3]:text-white/70 [&_strong]:text-white/60 [&_a]:text-cyan-400 [&_a]:underline"
              data-testid="text-job-description"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedJob.description, {
                ALLOWED_TAGS: ['h1', 'h2', 'h3', 'p', 'br', 'ul', 'ol', 'li', 'strong', 'em', 'a', 'b', 'i', 'u', 'span', 'div', 'blockquote'],
                ALLOWED_ATTR: ['href', 'target', 'rel'],
              }) }}
            />
          </div>

          {selectedJob.requirements && (
            <>
              <div className="h-px bg-white/[0.08]" />
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">{t("requirements")}</h3>
                <div
                  className="text-white/50 leading-relaxed prose prose-invert prose-sm max-w-none [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_li]:mb-1 [&_p]:mb-2 [&_strong]:text-white/60 [&_a]:text-cyan-400 [&_a]:underline"
                  data-testid="text-job-requirements"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedJob.requirements, {
                    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'p', 'br', 'ul', 'ol', 'li', 'strong', 'em', 'a', 'b', 'i', 'u', 'span', 'div', 'blockquote'],
                    ALLOWED_ATTR: ['href', 'target', 'rel'],
                  }) }}
                />
              </div>
            </>
          )}

          <Button
            size="lg"
            className="w-full rounded-full text-base font-semibold bg-blue-500 text-white border-0 gap-2 mt-4"
            onClick={() => {
              setApplyDialogOpen(true);
              setApplicationSuccess(false);
            }}
            data-testid="button-apply-now"
          >
            {t("respond")}
          </Button>
        </div>
      </div>
    );
  };

  const renderCompanyProfile = () => {
    if (!companyInfo) return null;

    return (
      <div className="max-w-3xl mx-auto space-y-6 pt-28 pb-20 px-6">
        <Button
          variant="ghost"
          size="icon"
          className="text-white/50"
          onClick={backToList}
          data-testid="button-back-from-company"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="flex flex-col items-center text-center space-y-4 py-4">
          {companyInfo.logoUrl ? (
            <Avatar className="w-20 h-20">
              <AvatarImage src={companyInfo.logoUrl} alt={companyInfo.name} />
              <AvatarFallback className="bg-white/10 text-white text-2xl font-bold">
                {companyInfo.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
              <Building2 className="w-10 h-10 text-white/30" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center justify-center gap-2" data-testid="text-company-name">
              {companyInfo.name}
              {companyInfo.isVerified && <BadgeCheck className="w-5 h-5 text-blue-500" />}
            </h1>
            {companyInfo.type && (
              <p className="text-white/40 text-sm mt-1">{companyInfo.type}</p>
            )}
          </div>
        </div>

        <div
          className="flex items-center justify-between p-4 rounded-xl bg-blue-500 text-white cursor-pointer hover-elevate"
          onClick={() => {
            document.getElementById("company-vacancies")?.scrollIntoView({ behavior: "smooth" });
          }}
          data-testid="button-active-vacancies"
        >
          <span className="font-semibold">{t("activeVacancies")}</span>
          <span className="text-xl font-bold">{companyJobs.length}</span>
        </div>

        <div
          className="flex items-center justify-between p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] cursor-pointer hover-elevate"
          onClick={() => {
            if (companyJobs.length > 0) {
              setSelectedJob(companyJobs[0]);
              setApplyDialogOpen(true);
              setApplicationSuccess(false);
            }
          }}
          data-testid="button-want-to-work"
        >
          <span className="font-medium text-white">{t("wantToWorkHere")}</span>
          <ArrowRight className="w-5 h-5 text-white/50" />
        </div>

        {companyInfo.description && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-white/60">{t("aboutCompany")}</h2>
            <div
              className="text-white/50 leading-relaxed prose prose-invert prose-sm max-w-none [&_p]:mb-2 [&_a]:text-cyan-400 [&_a]:underline"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(companyInfo.description, {
                ALLOWED_TAGS: ['h1', 'h2', 'h3', 'p', 'br', 'ul', 'ol', 'li', 'strong', 'em', 'a', 'b', 'i', 'u', 'span', 'div', 'blockquote'],
                ALLOWED_ATTR: ['href', 'target', 'rel'],
              }) }}
              data-testid="text-company-description"
            />
          </div>
        )}

        <div className="h-px bg-white/[0.08]" />

        <div id="company-vacancies" className="space-y-5">
          <h2 className="text-lg font-semibold text-white">{t("companyVacancies")}</h2>
          {companyJobs.length === 0 ? (
            <p className="text-white/40 text-center py-8">{t("noOpenPositions")}</p>
          ) : (
            <div className="grid gap-4 grid-cols-1">
              {companyJobs.map((job) => renderJobCard(job))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderJobCard = (job: JobOpening) => {
    const accentClass = getAccentColorClass(job.accentColor);
    const salary = formatSalary(job);
    const companyName = getCompanyName(job);
    const isSpecialBranded = job.isSpecialBranding && job.specialBrandingColor;

    if (isSpecialBranded) {
      const brandColor = job.specialBrandingColor || '#e4032e';
      const brandLogo = job.specialBrandingLogoUrl;
      const brandBanner = job.specialBrandingBannerUrl;

      return (
        <div key={job.id} className="relative rounded-md overflow-visible" data-testid={`card-job-${job.id}`}>
          <div
            className="rounded-t-md px-5 py-3 flex items-center gap-3"
            style={{ backgroundColor: brandColor }}
          >
            {brandLogo && (
              <img src={brandLogo} alt={companyName} className="h-8 w-auto object-contain rounded-sm" />
            )}
            <span className="text-white font-bold text-sm tracking-wide">{companyName}</span>
          </div>
          {brandBanner && (
            <div className="w-full h-24 overflow-hidden">
              <img src={brandBanner} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="p-5 space-y-3 border border-t-0 rounded-b-md" style={{ borderColor: `${brandColor}40` }}>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2.5 flex-1 min-w-0">
                <h3
                  className="text-lg font-bold text-white cursor-pointer"
                  onClick={() => openJobDetail(job)}
                  data-testid={`text-job-title-${job.id}`}
                >
                  {job.title}
                </h3>
                {salary && (
                  <p className="text-lg font-bold text-white" data-testid={`text-salary-${job.id}`}>{salary}</p>
                )}
                <div className="flex items-center gap-2 text-sm text-white/60">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{job.location}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {getExperienceLabel(job.experienceLevel) && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1 text-sm text-white/60">
                      <Briefcase className="w-3.5 h-3.5" />
                      {getExperienceLabel(job.experienceLevel)}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1 text-sm text-white/60">
                    {employmentTypeLabel(job.employmentType)}
                  </span>
                  <Badge variant="outline" className="border-amber-500/40 text-amber-400 gap-1 text-[10px] px-2 py-0 no-default-hover-elevate no-default-active-elevate">
                    <Sparkles className="w-2.5 h-2.5" />
                    {language === 'ru' ? 'Спец. размещение' : 'Premium listing'}
                  </Badge>
                </div>
                {getPublishedDateText(job) && (
                  <p className="text-sm text-white/40">{getPublishedDateText(job)}</p>
                )}
              </div>
              <button onClick={(e) => toggleFavorite(job.id, e)} className="flex-shrink-0 p-2 rounded-full transition-colors" data-testid={`button-favorite-${job.id}`}>
                <Heart className={`w-5 h-5 ${favorites.has(job.id) ? "fill-red-500 text-red-500" : "text-white/30"}`} />
              </button>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <Button
                size="sm"
                className="rounded-full text-white border-0 font-medium px-6"
                style={{ backgroundColor: brandColor }}
                onClick={(e) => { e.stopPropagation(); setSelectedJob(job); setApplyDialogOpen(true); setApplicationSuccess(false); }}
                data-testid={`button-respond-${job.id}`}
              >
                {t("respond")}
              </Button>
              <Button size="sm" variant="outline" className="rounded-full border-white/15 text-white/60 font-medium" onClick={(e) => { e.stopPropagation(); openJobDetail(job); }} data-testid={`button-details-${job.id}`}>
                {t("positionDetails")}
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div key={job.id} className="flex relative" data-testid={`card-job-${job.id}`}>
        {accentClass && (
          <div className={`w-1 flex-shrink-0 rounded-l-md ${accentClass}`} />
        )}
        <div
          className={`flex-1 rounded-md p-5 space-y-3 relative ${
            accentClass ? "rounded-l-none" : ""
          } ${
            job.isHighlighted
              ? "border border-amber-500/40 bg-amber-500/[0.04]"
              : job.isFounderProject
              ? "border border-blue-500/40 bg-blue-500/[0.04]"
              : "border border-white/[0.08] bg-white/[0.02]"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2.5 flex-1 min-w-0">
              <h3
                className="text-lg font-bold text-white cursor-pointer"
                onClick={() => openJobDetail(job)}
                data-testid={`text-job-title-${job.id}`}
              >
                {job.title}
              </h3>

              {salary && (
                <p className="text-lg font-bold text-white" data-testid={`text-salary-${job.id}`}>
                  {salary}
                </p>
              )}

              <div
                className="flex items-center gap-2 text-sm text-white/60 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  openCompanyProfile(companyName);
                }}
                data-testid={`text-company-${job.id}`}
              >
                <span className="flex items-center gap-1.5">
                  {companyName}
                  {job.isVerified && <BadgeCheck className="w-4 h-4 text-blue-500" />}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm text-white/40">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{job.location}</span>
              </div>

              {job.metroStations && (
                <div className="flex flex-wrap items-center gap-2">
                  {job.metroStations.split(",").map((station, idx) => (
                    <span key={idx} className="flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${
                        idx % 3 === 0 ? "bg-red-500" : idx % 3 === 1 ? "bg-green-500" : "bg-blue-500"
                      }`} />
                      <span className="text-white/50 text-xs">{station.trim()}</span>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {getExperienceLabel(job.experienceLevel) && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1 text-sm text-white/60" data-testid={`badge-experience-${job.id}`}>
                    <Briefcase className="w-3.5 h-3.5" />
                    {getExperienceLabel(job.experienceLevel)}
                  </span>
                )}
                {getPaymentFrequencyLabel(job.paymentFrequency) && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1 text-sm text-white/60" data-testid={`badge-payment-${job.id}`}>
                    {getPaymentFrequencyLabel(job.paymentFrequency)}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1 text-sm text-white/60">
                  {employmentTypeLabel(job.employmentType)}
                </span>
                {job.isHighlighted && (
                  <Badge variant="outline" className="border-amber-500/40 text-amber-400 gap-1 text-[10px] px-2 py-0 no-default-hover-elevate no-default-active-elevate">
                    <Sparkles className="w-2.5 h-2.5" />
                    {t("highlightedBadge")}
                  </Badge>
                )}
                {job.isPartner && (
                  <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 gap-1 text-[10px] px-2 py-0 no-default-hover-elevate no-default-active-elevate">
                    <Handshake className="w-2.5 h-2.5" />
                    {t("partnerBadge")}
                  </Badge>
                )}
                {job.isFounderProject && (
                  <Badge variant="outline" className="border-blue-500/30 text-blue-400 gap-1 text-[10px] px-2 py-0 no-default-hover-elevate no-default-active-elevate">
                    <Rocket className="w-2.5 h-2.5" />
                    {t("founderBadge")}
                  </Badge>
                )}
              </div>

              {getPublishedDateText(job) && (
                <p className="text-sm text-white/40" data-testid={`text-published-${job.id}`}>
                  {getPublishedDateText(job)}
                </p>
              )}
            </div>

            <button
              onClick={(e) => toggleFavorite(job.id, e)}
              className="flex-shrink-0 p-2 rounded-full transition-colors"
              data-testid={`button-favorite-${job.id}`}
            >
              <Heart className={`w-5 h-5 ${favorites.has(job.id) ? "fill-red-500 text-red-500" : "text-white/30"}`} />
            </button>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Button
              size="sm"
              className="rounded-full bg-blue-500 text-white border-0 font-medium px-6"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedJob(job);
                setApplyDialogOpen(true);
                setApplicationSuccess(false);
              }}
              data-testid={`button-respond-${job.id}`}
            >
              {t("respond")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full border-white/15 text-white/60 font-medium"
              onClick={(e) => {
                e.stopPropagation();
                openJobDetail(job);
              }}
              data-testid={`button-details-${job.id}`}
            >
              {t("positionDetails")}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderListView = () => (
    <div className="max-w-5xl mx-auto space-y-10 pt-28 pb-20 px-6">
      <section className="text-center space-y-4">
        <span className="text-xs font-semibold tracking-widest uppercase text-cyan-400 block">
          {t("careers")}
        </span>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white" data-testid="text-career-hero-title">
          {t("careerHeroTitle")}
        </h1>
        <p className="text-lg text-white/40 max-w-2xl mx-auto leading-relaxed" data-testid="text-career-hero-subtitle">
          {t("careerHeroSubtitle")}
        </p>
      </section>

      <div className="h-px bg-white/[0.08]" />

      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <Input
            placeholder={t("search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/30 rounded-md"
            data-testid="input-search-jobs"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={fieldFilter} onValueChange={setFieldFilter}>
            <SelectTrigger className="w-full sm:w-48 bg-white/[0.03] border-white/[0.08] text-white rounded-md" data-testid="select-field-filter">
              <SelectValue placeholder={t("allFields")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allFields")}</SelectItem>
              {FIELD_OPTIONS.map((f) => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={specializationFilter} onValueChange={setSpecializationFilter}>
            <SelectTrigger className="w-full sm:w-48 bg-white/[0.03] border-white/[0.08] text-white rounded-md" data-testid="select-specialization-filter">
              <SelectValue placeholder={t("allSpecializations")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allSpecializations")}</SelectItem>
              {specializations.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="w-full sm:w-48 bg-white/[0.03] border-white/[0.08] text-white rounded-md" data-testid="select-company-filter">
              <SelectValue placeholder={t("allCompanies")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allCompanies")}</SelectItem>
              {companies.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isAuthenticated && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => setSubmitDialogOpen(true)}
            className="bg-cyan-600"
            data-testid="button-submit-position"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("submitPosition")}
          </Button>
          {mySubmissions.length > 0 && (
            <Button
              variant={showMySubmissions ? "default" : "outline"}
              onClick={() => setShowMySubmissions(!showMySubmissions)}
              data-testid="button-my-submissions"
            >
              {t("mySubmissions")} ({mySubmissions.length})
            </Button>
          )}
        </div>
      )}

      {showMySubmissions && isAuthenticated ? (
        <div className="space-y-4 mb-8">
          <h3 className="text-xl font-bold text-white mb-4">{t("mySubmissions")}</h3>
          {mySubmissionsLoading ? (
            <div className="text-center text-gray-400 py-8">{t("loading")}</div>
          ) : mySubmissions.length === 0 ? (
            <div className="text-center text-gray-400 py-8">{t("noSubmissions")}</div>
          ) : (
            <div className="space-y-3">
              {mySubmissions.map((sub) => (
                <div key={sub.id} className="bg-[#111113] border border-gray-800 rounded-md p-4 flex flex-wrap items-center justify-between gap-4" data-testid={`submission-card-${sub.id}`}>
                  <div>
                    <h4 className="font-semibold text-white">{sub.title}</h4>
                    <p className="text-sm text-gray-400">{sub.department} · {sub.location}</p>
                  </div>
                  <div>
                    {sub.status === "pending_review" && (
                      <Badge variant="outline" className="border-amber-500 text-amber-400">
                        <Clock className="h-3 w-3 mr-1" />
                        {t("pendingReview")}
                      </Badge>
                    )}
                    {sub.status === "open" && (
                      <Badge variant="default" className="bg-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {t("approved")}
                      </Badge>
                    )}
                    {sub.status === "rejected" && (
                      <Badge variant="destructive">
                        <X className="h-3 w-3 mr-1" />
                        {t("rejected")}
                      </Badge>
                    )}
                    {sub.status === "draft" && (
                      <Badge variant="secondary">
                        {t("statusDraft")}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      <div className="h-px bg-white/[0.08]" />

      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white" data-testid="text-open-positions-title">
            {t("openPositions")}
          </h2>
          <p className="text-sm text-white/40">
            {filtered.length} {language === "ru" ? "вакансий" : "vacancies"}
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-5 grid-cols-1">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-md border border-white/[0.06] bg-white/[0.02] p-6 animate-pulse space-y-4">
                <div className="h-5 w-2/3 bg-white/10 rounded" />
                <div className="h-4 w-1/2 bg-white/5 rounded" />
                <div className="h-4 w-1/3 bg-white/5 rounded" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-md border border-white/[0.06] bg-white/[0.02] p-16 text-center space-y-4">
            <Briefcase className="w-12 h-12 text-white/20 mx-auto" />
            <h3 className="text-xl font-semibold text-white" data-testid="text-no-positions">
              {t("noOpenPositions")}
            </h3>
            <p className="text-white/40" data-testid="text-no-positions-desc">
              {t("noOpenPositionsDesc")}
            </p>
          </div>
        ) : (
          <div className="grid gap-5 grid-cols-1">
            {filtered.map((job) => renderJobCard(job))}
          </div>
        )}
      </div>
    </div>
  );

  const publicNavItems = buildPublicNavItems(language, () => {});

  return (
    <div className="min-h-screen bg-[#09090b] text-white overflow-x-hidden">
      {!isAuthenticated && (
        <>
          <PublicSidebar
            items={publicNavItems}
            language={language}
            activeId="careers"
            onLanguageToggle={() => setLanguage(language === "en" ? "ru" : "en")}
          />
          <PublicMobileTopBar
            language={language}
            onLanguageToggle={() => setLanguage(language === "en" ? "ru" : "en")}
          />
        </>
      )}

      <div className={!isAuthenticated ? "lg:pl-[110px] pt-[56px] lg:pt-0" : ""}>
        {renderHeader()}

        {viewMode === "detail" && renderJobDetailView()}
        {viewMode === "company" && renderCompanyProfile()}
        {viewMode === "list" && renderListView()}

      <div className="mx-auto max-w-7xl px-6 lg:px-8"><div className="h-px bg-white/[0.12]" /></div>

      <footer className="py-12">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarImage src={businessClubLogo} alt="Business Club Logo" />
                <AvatarFallback className="bg-cyan-500/20 text-cyan-300 text-xs">ПК</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold text-white/80">{t("businessClub")}</p>
                <p className="text-xs text-white/30">{t("financialUniversity")}</p>
              </div>
            </div>
            <p className="text-xs text-white/30">
              © {new Date().getFullYear()} {t("landingFooterRights")}
            </p>
          </div>
        </div>
      </footer>
      </div>

      <Dialog open={applyDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {applicationSuccess ? t("applicationSubmitted") : t("applyForPosition")}
            </DialogTitle>
          </DialogHeader>
          {applicationSuccess ? (
            <div className="space-y-4 py-4">
              <div className="text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">{t("applicationSubmittedDesc")}</p>
                {candidateCreated && (
                  <div className="mt-4 p-3 rounded-md bg-muted">
                    <p className="text-sm font-medium">{t("candidateAccountCreated")}</p>
                    <Button variant="outline" size="sm" className="mt-2" asChild>
                      <Link href="/candidate/login">{t("candidateLogin")}</Link>
                    </Button>
                  </div>
                )}
              </div>
              <Button className="w-full" onClick={handleCloseDialog} data-testid="button-close-success">
                {t("close")}
              </Button>
            </div>
          ) : (
            <>
              {selectedJob && (
                <p className="text-sm text-muted-foreground mb-2">{selectedJob.title}</p>
              )}
              <form onSubmit={handleApply} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("yourName")}</label>
                  <Input
                    required
                    value={formData.applicantName}
                    onChange={(e) => setFormData((p) => ({ ...p, applicantName: e.target.value }))}
                    data-testid="input-applicant-name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("yourEmail")}</label>
                  <Input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                    data-testid="input-applicant-email"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("yourPhone")}</label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                    data-testid="input-applicant-phone"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <FileUp className="w-4 h-4" />
                    {t("uploadResume")}
                  </label>
                  <input
                    ref={fileInputRef}
                    id="resume-file-input"
                    type="file"
                    accept=".pdf,application/pdf"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
                          setUploadError(t("pdfOnly"));
                          return;
                        }
                        setResumeFile(file);
                        setUploadError("");
                      }
                    }}
                    data-testid="input-resume-file"
                  />
                  {resumeFile ? (
                    <div className="flex items-center gap-3 rounded-md border p-3 bg-muted/50">
                      <File className="w-5 h-5 text-red-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" data-testid="text-resume-filename">{resumeFile.name}</p>
                        <p className="text-xs text-muted-foreground">{(resumeFile.size / 1024).toFixed(0)} KB</p>
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => { setResumeFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                        data-testid="button-remove-resume"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <label
                      htmlFor="resume-file-input"
                      className="inline-flex items-center justify-center gap-2 w-full rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover-elevate cursor-pointer"
                      data-testid="button-upload-resume"
                    >
                      <FileUp className="w-4 h-4" />
                      {t("choosePdf")}
                    </label>
                  )}
                  {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
                  <p className="text-xs text-muted-foreground">{t("pdfOnly")}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("coverLetterText")}</label>
                  <Textarea
                    placeholder={t("coverLetterPlaceholder")}
                    value={formData.coverLetter}
                    onChange={(e) => setFormData((p) => ({ ...p, coverLetter: e.target.value }))}
                    className="min-h-[80px]"
                    data-testid="textarea-cover-letter"
                  />
                </div>

                <div className="h-px bg-border" />

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-muted-foreground" />
                    <label className="text-sm font-medium">{t("createAccountOptional")}</label>
                  </div>
                  <p className="text-xs text-muted-foreground">{t("createAccountDesc")}</p>
                  <Input
                    type="password"
                    placeholder={t("choosePassword")}
                    value={formData.password}
                    onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                    data-testid="input-applicant-password"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full rounded-full bg-cyan-500 text-black font-semibold"
                  disabled={applyMutation.isPending || resumeUploading}
                  data-testid="button-submit-application"
                >
                  {resumeUploading ? t("uploadingResume") : applyMutation.isPending ? t("loading") : t("submitApplication")}
                </Button>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent className="max-w-2xl bg-[#09090b] border-gray-800 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">{t("submitPosition")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-gray-400">{t("submitPositionInfo")}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">{t("positionTitle")}</label>
                <Input
                  value={submitForm.title}
                  onChange={(e) => setSubmitForm(p => ({ ...p, title: e.target.value }))}
                  className="bg-[#111113] border-gray-700 text-white"
                  placeholder={t("positionTitle")}
                  data-testid="input-submit-title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">{t("department")}</label>
                <Input
                  value={submitForm.department}
                  onChange={(e) => setSubmitForm(p => ({ ...p, department: e.target.value }))}
                  className="bg-[#111113] border-gray-700 text-white"
                  placeholder={t("department")}
                  data-testid="input-submit-department"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">{t("location")}</label>
                <Input
                  value={submitForm.location}
                  onChange={(e) => setSubmitForm(p => ({ ...p, location: e.target.value }))}
                  className="bg-[#111113] border-gray-700 text-white"
                  placeholder={t("location")}
                  data-testid="input-submit-location"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">{t("employmentType")}</label>
                <Select
                  value={submitForm.employmentType}
                  onValueChange={(v) => setSubmitForm(p => ({ ...p, employmentType: v }))}
                >
                  <SelectTrigger className="bg-[#111113] border-gray-700 text-white" data-testid="select-submit-employment-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-time">{t("fullTime")}</SelectItem>
                    <SelectItem value="part-time">{t("partTime")}</SelectItem>
                    <SelectItem value="internship">{t("internship")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">{t("description")}</label>
              <Textarea
                value={submitForm.description}
                onChange={(e) => setSubmitForm(p => ({ ...p, description: e.target.value }))}
                className="bg-[#111113] border-gray-700 text-white min-h-[100px]"
                placeholder={t("description")}
                data-testid="input-submit-description"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">{t("requirements")}</label>
              <Textarea
                value={submitForm.requirements}
                onChange={(e) => setSubmitForm(p => ({ ...p, requirements: e.target.value }))}
                className="bg-[#111113] border-gray-700 text-white min-h-[80px]"
                placeholder={t("requirements")}
                data-testid="input-submit-requirements"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">{t("salaryMin")}</label>
                <Input
                  type="number"
                  value={submitForm.salaryMin}
                  onChange={(e) => setSubmitForm(p => ({ ...p, salaryMin: e.target.value }))}
                  className="bg-[#111113] border-gray-700 text-white"
                  data-testid="input-submit-salary-min"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">{t("salaryMax")}</label>
                <Input
                  type="number"
                  value={submitForm.salaryMax}
                  onChange={(e) => setSubmitForm(p => ({ ...p, salaryMax: e.target.value }))}
                  className="bg-[#111113] border-gray-700 text-white"
                  data-testid="input-submit-salary-max"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">{t("currency")}</label>
                <Select
                  value={submitForm.salaryCurrency}
                  onValueChange={(v) => setSubmitForm(p => ({ ...p, salaryCurrency: v }))}
                >
                  <SelectTrigger className="bg-[#111113] border-gray-700 text-white" data-testid="select-submit-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RUB">RUB</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="border-t border-gray-800 pt-4 mt-4">
              <h4 className="text-white font-medium mb-3">{t("founderProjectDetails")}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">{t("founderProjectName")}</label>
                  <Input
                    value={submitForm.founderProjectName}
                    onChange={(e) => setSubmitForm(p => ({ ...p, founderProjectName: e.target.value }))}
                    className="bg-[#111113] border-gray-700 text-white"
                    placeholder={t("founderProjectName")}
                    data-testid="input-submit-project-name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">{t("founderName")}</label>
                  <Input
                    value={submitForm.founderName}
                    onChange={(e) => setSubmitForm(p => ({ ...p, founderName: e.target.value }))}
                    className="bg-[#111113] border-gray-700 text-white"
                    placeholder={t("founderName")}
                    data-testid="input-submit-founder-name"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-gray-800">
              <Button variant="outline" onClick={() => setSubmitDialogOpen(false)} data-testid="button-cancel-submit">
                {t("cancel")}
              </Button>
              <Button
                onClick={handleSubmitPosition}
                disabled={!submitForm.title || !submitForm.department || !submitForm.location || !submitForm.description || submitPositionMutation.isPending}
                className="bg-cyan-600"
                data-testid="button-confirm-submit"
              >
                {submitPositionMutation.isPending ? t("submitting") : t("submitForReview")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
