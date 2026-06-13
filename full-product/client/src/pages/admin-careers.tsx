import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { usePageSEO } from "@/hooks/usePageSEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Briefcase,
  Plus,
  Pencil,
  Trash2,
  Search,
  Send,
  User,
  Mail,
  Phone,
  FileText,
  ArrowLeft,
  MapPin,
  Building2,
  Clock,
  DollarSign,
  MessageSquare,
  Star,
  Handshake,
  Rocket,
  Upload,
  X,
  CheckCircle,
  Mic,
  MicOff,
  Loader2,
  Sparkles,
  ImagePlus,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import type { JobOpening, JobApplication, JobApplicationMessage } from "@shared/schema";
import type { TranslationKey } from "@/lib/translations";

type JobApplicationWithTitle = JobApplication & { jobTitle?: string };

function getApplicationStatusBadge(status: string, t: (key: TranslationKey) => string) {
  const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; className?: string }> = {
    new: { label: t("statusNew"), variant: "default" },
    reviewing: { label: t("statusReviewing"), variant: "secondary" },
    interview: { label: t("statusInterview"), variant: "outline", className: "border-amber-500 text-amber-600 dark:text-amber-400" },
    offered: { label: t("statusOffered"), variant: "outline", className: "border-green-500 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950" },
    rejected: { label: t("statusRejected"), variant: "destructive" },
    hired: { label: t("statusHired"), variant: "outline", className: "border-green-600 text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900" },
  };
  const config = statusMap[status] || { label: status, variant: "default" as const };
  return <Badge variant={config.variant} className={config.className} data-testid={`badge-status-${status}`}>{config.label}</Badge>;
}

function getOpeningStatusBadge(status: string, t: (key: TranslationKey) => string) {
  const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; className?: string }> = {
    draft: { label: t("statusDraft"), variant: "secondary" },
    open: { label: t("statusOpen"), variant: "default" },
    closed: { label: t("statusClosed"), variant: "outline" },
    pending_review: { label: t("pendingReview"), variant: "outline" as const, className: "border-amber-500 text-amber-500" },
    rejected: { label: t("statusRejected"), variant: "destructive" as const },
  };
  const config = statusMap[status] || { label: status, variant: "default" as const };
  return <Badge variant={config.variant} className={config.className} data-testid={`badge-opening-status-${status}`}>{config.label}</Badge>;
}

export default function AdminCareers() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { user, isHeadAdmin, isEventAdmin, isLoading: authLoading } = useAuth();

  usePageSEO({
    title: t("manageOpenings"),
    description: "Admin career management - manage job openings and applications",
  });

  const [activeTab, setActiveTab] = useState("openings");
  const [openingDialogOpen, setOpeningDialogOpen] = useState(false);
  const [editingOpening, setEditingOpening] = useState<JobOpening | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<string | null>(null);
  const [jobFilter, setJobFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [messageInput, setMessageInput] = useState("");

  const [openingForm, setOpeningForm] = useState({
    title: "",
    department: "",
    location: "",
    employmentType: "full-time",
    description: "",
    requirements: "",
    salaryMin: "",
    salaryMax: "",
    salaryCurrency: "RUB",
    status: "draft",
    isPartner: false,
    isHighlighted: false,
    isFounderProject: false,
    companyName: "",
    companyLogoUrl: "",
    founderName: "",
    founderProjectName: "",
    founderLogoUrl: "",
    experienceLevel: "",
    paymentFrequency: "",
    accentColor: "",
    metroStations: "",
    isVerified: false,
    field: "",
    specialization: "",
    companyDescription: "",
    companyType: "",
    schedule: "",
    workHours: "",
    isRemote: false,
    isSpecialBranding: false,
    specialBrandingColor: "",
    specialBrandingLogoUrl: "",
    specialBrandingBannerUrl: "",
  });

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [voiceStep, setVoiceStep] = useState<"uploading" | "transcribing" | "generating" | "saving" | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioFileInputRef = useRef<HTMLInputElement>(null);

  const [founderLogoUploading, setFounderLogoUploading] = useState(false);
  const [companyLogoUploading, setCompanyLogoUploading] = useState(false);
  const founderLogoInputRef = useRef<HTMLInputElement>(null);
  const companyLogoInputRef = useRef<HTMLInputElement>(null);

  const { data: openings = [], isLoading: openingsLoading } = useQuery<JobOpening[]>({
    queryKey: ["/api/careers/openings"],
  });

  const { data: pendingOpenings = [], isLoading: pendingLoading } = useQuery<(JobOpening & { submitterFirstName?: string | null; submitterLastName?: string | null; submitterEmail?: string | null })[]>({
    queryKey: ["/api/careers/openings/pending"],
  });

  const { data: applications = [], isLoading: applicationsLoading } = useQuery<JobApplicationWithTitle[]>({
    queryKey: ["/api/careers/applications"],
  });

  const { data: selectedAppDetail } = useQuery<JobApplicationWithTitle>({
    queryKey: ["/api/careers/applications", selectedApplication],
    enabled: !!selectedApplication,
  });

  const { data: messages = [] } = useQuery<JobApplicationMessage[]>({
    queryKey: ["/api/careers/applications", selectedApplication, "messages"],
    enabled: !!selectedApplication,
    refetchInterval: 5000,
  });

  const createOpeningMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      await apiRequest("/api/careers/openings", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/careers/openings"] });
      setOpeningDialogOpen(false);
      resetOpeningForm();
    },
  });

  const updateOpeningMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      await apiRequest(`/api/careers/openings/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/careers/openings"] });
      setOpeningDialogOpen(false);
      setEditingOpening(null);
      resetOpeningForm();
    },
  });

  const deleteOpeningMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/api/careers/openings/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/careers/openings"] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiRequest(`/api/careers/applications/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/careers/applications"] });
      if (selectedApplication) {
        queryClient.invalidateQueries({ queryKey: ["/api/careers/applications", selectedApplication] });
      }
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ applicationId, content }: { applicationId: string; content: string }) => {
      await apiRequest(`/api/careers/applications/${applicationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
    },
    onSuccess: () => {
      if (selectedApplication) {
        queryClient.invalidateQueries({ queryKey: ["/api/careers/applications", selectedApplication, "messages"] });
      }
      setMessageInput("");
    },
  });

  const reviewOpeningMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiRequest(`/api/careers/openings/${id}/review`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/careers/openings/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/careers/openings"] });
    },
  });

  function resetOpeningForm() {
    setOpeningForm({
      title: "",
      department: "",
      location: "",
      employmentType: "full-time",
      description: "",
      requirements: "",
      salaryMin: "",
      salaryMax: "",
      salaryCurrency: "RUB",
      status: "draft",
      isPartner: false,
      isHighlighted: false,
      isFounderProject: false,
      companyName: "",
      companyLogoUrl: "",
      founderName: "",
      founderProjectName: "",
      founderLogoUrl: "",
      experienceLevel: "",
      paymentFrequency: "",
      accentColor: "",
      metroStations: "",
      isVerified: false,
      field: "",
      specialization: "",
      companyDescription: "",
      companyType: "",
      schedule: "",
      workHours: "",
      isRemote: false,
      isSpecialBranding: false,
      specialBrandingColor: "",
      specialBrandingLogoUrl: "",
      specialBrandingBannerUrl: "",
    });
  }

  function handleEditOpening(opening: JobOpening) {
    setEditingOpening(opening);
    setOpeningForm({
      title: opening.title,
      department: opening.department,
      location: opening.location,
      employmentType: opening.employmentType,
      description: opening.description,
      requirements: opening.requirements || "",
      salaryMin: opening.salaryMin?.toString() || "",
      salaryMax: opening.salaryMax?.toString() || "",
      salaryCurrency: opening.salaryCurrency || "RUB",
      status: opening.status,
      isPartner: opening.isPartner ?? false,
      isHighlighted: opening.isHighlighted ?? false,
      isFounderProject: opening.isFounderProject ?? false,
      companyName: opening.companyName || "",
      companyLogoUrl: opening.companyLogoUrl || "",
      founderName: opening.founderName || "",
      founderProjectName: opening.founderProjectName || "",
      founderLogoUrl: opening.founderLogoUrl || "",
      experienceLevel: (opening as any).experienceLevel || "",
      paymentFrequency: (opening as any).paymentFrequency || "",
      accentColor: (opening as any).accentColor || "",
      metroStations: (opening as any).metroStations || "",
      isVerified: (opening as any).isVerified ?? false,
      field: (opening as any).field || "",
      specialization: (opening as any).specialization || "",
      companyDescription: (opening as any).companyDescription || "",
      companyType: (opening as any).companyType || "",
      schedule: (opening as any).schedule || "",
      workHours: (opening as any).workHours || "",
      isRemote: (opening as any).isRemote ?? false,
      isSpecialBranding: (opening as any).isSpecialBranding ?? false,
      specialBrandingColor: (opening as any).specialBrandingColor || "",
      specialBrandingLogoUrl: (opening as any).specialBrandingLogoUrl || "",
      specialBrandingBannerUrl: (opening as any).specialBrandingBannerUrl || "",
    });
    setOpeningDialogOpen(true);
  }

  function handleSubmitOpening() {
    const data: Record<string, unknown> = {
      title: openingForm.title,
      department: openingForm.department,
      location: openingForm.location,
      employmentType: openingForm.employmentType,
      description: openingForm.description,
      requirements: openingForm.requirements || null,
      salaryMin: openingForm.salaryMin ? parseInt(openingForm.salaryMin) : null,
      salaryMax: openingForm.salaryMax ? parseInt(openingForm.salaryMax) : null,
      salaryCurrency: openingForm.salaryCurrency,
      status: openingForm.status,
      isPartner: openingForm.isPartner,
      isHighlighted: openingForm.isHighlighted,
      isFounderProject: openingForm.isFounderProject,
      companyName: openingForm.companyName || null,
      companyLogoUrl: openingForm.companyLogoUrl || null,
      founderName: openingForm.founderName || null,
      founderProjectName: openingForm.founderProjectName || null,
      founderLogoUrl: openingForm.founderLogoUrl || null,
      experienceLevel: openingForm.experienceLevel || null,
      paymentFrequency: openingForm.paymentFrequency || null,
      accentColor: openingForm.accentColor || null,
      metroStations: openingForm.metroStations || null,
      isVerified: openingForm.isVerified,
      field: openingForm.field || null,
      specialization: openingForm.specialization || null,
      companyDescription: openingForm.companyDescription || null,
      companyType: openingForm.companyType || null,
      schedule: openingForm.schedule || null,
      workHours: openingForm.workHours || null,
      isRemote: openingForm.isRemote,
      isSpecialBranding: openingForm.isSpecialBranding,
      specialBrandingColor: openingForm.specialBrandingColor || null,
      specialBrandingLogoUrl: openingForm.specialBrandingLogoUrl || null,
      specialBrandingBannerUrl: openingForm.specialBrandingBannerUrl || null,
    };

    if (editingOpening) {
      updateOpeningMutation.mutate({ id: editingOpening.id, data });
    } else {
      createOpeningMutation.mutate(data);
    }
  }

  async function handleLogoUpload(file: File, target: "founder" | "company") {
    const setter = target === "founder" ? setFounderLogoUploading : setCompanyLogoUploading;
    setter(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/upload/image", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      if (target === "founder") {
        setOpeningForm((prev) => ({ ...prev, founderLogoUrl: data.url }));
      } else {
        setOpeningForm((prev) => ({ ...prev, companyLogoUrl: data.url }));
      }
    } catch {
      console.error("Logo upload failed");
    } finally {
      setter(false);
    }
  }

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
    mediaRecorderRef.current = mediaRecorder;
    audioChunksRef.current = [];
    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach(track => track.stop());
      const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      await processVoice(blob);
    };
    mediaRecorder.start();
    setIsRecording(true);
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }

  async function processVoice(audioBlob: Blob, fileName?: string) {
    setIsProcessingVoice(true);
    setVoiceStep("uploading");
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, fileName || 'recording.webm');

      const stepTimer1 = setTimeout(() => setVoiceStep("transcribing"), 1500);
      const stepTimer2 = setTimeout(() => setVoiceStep("generating"), 5000);
      const stepTimer3 = setTimeout(() => setVoiceStep("saving"), 12000);

      const res = await fetch('/api/careers/voice-to-vacancy', { method: 'POST', body: formData, credentials: 'include' });
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);

      if (!res.ok) throw new Error('Failed to process voice');
      setVoiceStep("saving");
      const data = await res.json();
      const count = data.count || 0;
      await queryClient.invalidateQueries({ queryKey: ["/api/careers/openings"] });
      if (count === 1 && data.vacancies?.[0]) {
        const v = data.vacancies[0];
        setOpeningForm(prev => ({
          ...prev,
          title: v.title || prev.title,
          department: v.department || prev.department,
          location: v.location || prev.location,
          employmentType: v.employmentType || prev.employmentType,
          description: v.description || prev.description,
          requirements: v.requirements || prev.requirements,
          salaryMin: v.salaryMin?.toString() || prev.salaryMin,
          salaryMax: v.salaryMax?.toString() || prev.salaryMax,
          salaryCurrency: v.salaryCurrency || prev.salaryCurrency,
          experienceLevel: v.experienceLevel || prev.experienceLevel,
          companyName: v.companyName || prev.companyName,
          field: v.field || prev.field,
          schedule: v.schedule || prev.schedule,
          workHours: v.workHours || prev.workHours,
        }));
        setEditingOpening(data.vacancies[0]);
        setOpeningDialogOpen(true);
      }
      const msg = count > 1
        ? (language === "ru" ? `Создано ${count} вакансий-черновиков. Они появятся в списке ниже.` : `Created ${count} draft vacancies. They will appear in the list below.`)
        : count === 1
          ? (language === "ru" ? "Вакансия-черновик создана. Откройте для просмотра." : "Draft vacancy created. Opening for review.")
          : (language === "ru" ? "Не удалось создать вакансии из записи" : "Could not create vacancies from recording");
      toast({ title: t("voiceToVacancy"), description: msg });
    } catch (error) {
      toast({ title: "Error", description: language === "ru" ? "Не удалось обработать голосовое сообщение" : "Failed to process voice message", variant: "destructive" });
    } finally {
      setIsProcessingVoice(false);
      setVoiceStep(null);
    }
  }

  function handleAudioFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ['audio/webm', 'audio/ogg', 'audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/aac', 'audio/flac'];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(webm|ogg|wav|mp3|m4a|aac|flac|mpeg)$/i)) {
      toast({ title: "Error", description: language === "ru" ? "Неподдерживаемый формат аудио. Используйте MP3, WAV, OGG, M4A, FLAC или WebM." : "Unsupported audio format. Use MP3, WAV, OGG, M4A, FLAC, or WebM.", variant: "destructive" });
      return;
    }
    processVoice(file, file.name);
    if (audioFileInputRef.current) audioFileInputRef.current.value = '';
  }

  function handleSendMessage() {
    if (!messageInput.trim() || !selectedApplication) return;
    sendMessageMutation.mutate({ applicationId: selectedApplication, content: messageInput.trim() });
  }

  const filteredApplications = applications.filter((app) => {
    if (jobFilter !== "all" && app.jobId !== jobFilter) return false;
    if (statusFilter !== "all" && app.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        app.applicantName.toLowerCase().includes(q) ||
        app.email.toLowerCase().includes(q) ||
        (app.jobTitle || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (authLoading) {
    return (
      <div className="p-3 sm:p-6 md:p-8 overflow-x-hidden" data-testid="loading-state">
        <p className="text-muted-foreground">{t("loading")}</p>
      </div>
    );
  }

  if (!isEventAdmin) {
    return (
      <div className="p-3 sm:p-6 md:p-8 overflow-x-hidden" data-testid="access-denied">
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{language === 'ru' ? 'Только администраторы мероприятий и главные администраторы могут управлять вакансиями.' : 'Only event administrators and head administrators can manage career openings.'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selectedApplication && selectedAppDetail) {
    return (
      <div className="p-3 sm:p-6 md:p-8 overflow-x-hidden">
        <div className="max-w-4xl mx-auto w-full space-y-6">
          <Button
            variant="ghost"
            onClick={() => setSelectedApplication(null)}
            data-testid="button-back-to-applications"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("applications")}
          </Button>

          <Card data-testid="card-application-detail">
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <CardTitle className="flex items-center gap-2 flex-wrap">
                  <User className="w-5 h-5" />
                  {selectedAppDetail.applicantName}
                </CardTitle>
                {getApplicationStatusBadge(selectedAppDetail.status, t)}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">{t("applicantInfo")}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span data-testid="text-applicant-email">{selectedAppDetail.email}</span>
                  </div>
                  {selectedAppDetail.phone && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span data-testid="text-applicant-phone">{selectedAppDetail.phone}</span>
                    </div>
                  )}
                  {selectedAppDetail.jobTitle && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Briefcase className="w-4 h-4 text-muted-foreground" />
                      <span data-testid="text-applicant-job">{selectedAppDetail.jobTitle}</span>
                    </div>
                  )}
                </div>
              </div>

              {(selectedAppDetail.resumeText || (selectedAppDetail as any).resumeUrl) && (
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Resume
                  </h3>
                  {(selectedAppDetail as any).resumeUrl && (
                    <div className="mb-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => window.open(`/api/careers/resume/${selectedAppDetail.id}`, '_blank')}
                        data-testid="button-download-resume"
                      >
                        <FileText className="w-4 h-4" />
                        {t("viewResumePdf")}
                      </Button>
                    </div>
                  )}
                  {selectedAppDetail.resumeText && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap" data-testid="text-resume">
                      {selectedAppDetail.resumeText}
                    </p>
                  )}
                </div>
              )}

              {selectedAppDetail.coverLetter && (
                <div>
                  <h3 className="font-semibold mb-2">Cover Letter</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap" data-testid="text-cover-letter">
                    {selectedAppDetail.coverLetter}
                  </p>
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-2">{t("changeStatus")}</h3>
                <Select
                  value={selectedAppDetail.status}
                  onValueChange={(value) => updateStatusMutation.mutate({ id: selectedAppDetail.id, status: value })}
                  data-testid="select-change-status"
                >
                  <SelectTrigger className="w-48" data-testid="trigger-change-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new" data-testid="option-status-new">{t("statusNew")}</SelectItem>
                    <SelectItem value="reviewing" data-testid="option-status-reviewing">{t("statusReviewing")}</SelectItem>
                    <SelectItem value="interview" data-testid="option-status-interview">{t("statusInterview")}</SelectItem>
                    <SelectItem value="offered" data-testid="option-status-offered">{t("statusOffered")}</SelectItem>
                    <SelectItem value="rejected" data-testid="option-status-rejected">{t("statusRejected")}</SelectItem>
                    <SelectItem value="hired" data-testid="option-status-hired">{t("statusHired")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-candidate-chat">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                {t("candidateChat")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col h-80">
                <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2">
                  {messages.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-no-messages">
                      No messages yet
                    </p>
                  )}
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.senderType === "admin" ? "justify-end" : "justify-start"}`}
                      data-testid={`message-${msg.id}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-md px-3 py-2 text-sm ${
                          msg.senderType === "admin"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p>{msg.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                <div className="flex gap-2">
                  <Input
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder={t("typeMessage")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    data-testid="input-chat-message"
                  />
                  <Button
                    size="icon"
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim() || sendMessageMutation.isPending}
                    data-testid="button-send-message"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 md:p-8 overflow-x-hidden">
      <div className="max-w-6xl mx-auto w-full">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Briefcase className="w-7 h-7 sm:w-8 sm:h-8 text-primary shrink-0" />
            {t("careerPortal")}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("manageOpenings")}</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="tabs-career-admin">
          <TabsList className="w-full sm:w-auto flex" data-testid="tabs-list">
            <TabsTrigger value="openings" className="flex-1 sm:flex-initial text-xs sm:text-sm" data-testid="tab-openings">
              <Briefcase className="w-4 h-4 mr-1 sm:mr-2 shrink-0" />
              <span className="hidden sm:inline">{t("manageOpenings")}</span>
              <span className="sm:hidden">Openings</span>
            </TabsTrigger>
            <TabsTrigger value="applications" className="flex-1 sm:flex-initial text-xs sm:text-sm" data-testid="tab-applications">
              <FileText className="w-4 h-4 mr-1 sm:mr-2 shrink-0" />
              <span className="truncate">{t("applications")}</span>
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex-1 sm:flex-initial text-xs sm:text-sm" data-testid="tab-pending">
              <span className="truncate">{t("pendingReview")}</span>
              {pendingOpenings.length > 0 && (
                <Badge variant="destructive" className="ml-1 sm:ml-2 no-default-hover-elevate no-default-active-elevate">{pendingOpenings.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="openings" className="mt-6">
            <div className="mb-4 rounded-lg border p-4 flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  {t("voiceToVacancy")}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">{t("voiceRecordingHint")}</p>
              </div>
              <div className="flex items-center gap-2">
                {isRecording && (
                  <span className="flex items-center gap-1.5 text-sm text-destructive">
                    <span className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
                    {t("stopRecording")}
                  </span>
                )}
                {isProcessingVoice ? (
                  <div className="flex flex-col gap-2" data-testid="voice-processing-status">
                    <Button disabled data-testid="button-processing-voice">
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {voiceStep === "uploading"
                        ? (language === "ru" ? "Загрузка аудио..." : "Uploading audio...")
                        : voiceStep === "transcribing"
                        ? (language === "ru" ? "Распознавание речи..." : "Transcribing speech...")
                        : voiceStep === "generating"
                        ? (language === "ru" ? "ИИ создаёт вакансии..." : "AI is generating vacancies...")
                        : voiceStep === "saving"
                        ? (language === "ru" ? "Сохранение черновиков..." : "Saving drafts...")
                        : t("processingVoice")}
                    </Button>
                    <div className="flex items-center gap-1.5 ml-1">
                      {(["uploading", "transcribing", "generating", "saving"] as const).map((step, i) => (
                        <div key={step} className="flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full transition-colors ${
                            voiceStep === step ? "bg-primary animate-pulse" :
                            (["uploading", "transcribing", "generating", "saving"].indexOf(voiceStep || "") > i) ? "bg-primary" : "bg-muted"
                          }`} />
                          {i < 3 && <div className={`w-4 h-0.5 transition-colors ${
                            (["uploading", "transcribing", "generating", "saving"].indexOf(voiceStep || "") > i) ? "bg-primary" : "bg-muted"
                          }`} />}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground ml-1">
                      {language === "ru" ? "Это может занять 10-30 секунд" : "This may take 10-30 seconds"}
                    </p>
                  </div>
                ) : isRecording ? (
                  <Button variant="destructive" onClick={stopRecording} data-testid="button-stop-recording">
                    <MicOff className="w-4 h-4 mr-2" />
                    {t("stopRecording")}
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={startRecording} data-testid="button-start-recording">
                      <Mic className="w-4 h-4 mr-2" />
                      {t("startRecording")}
                    </Button>
                    <input
                      ref={audioFileInputRef}
                      type="file"
                      accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.webm"
                      className="hidden"
                      onChange={handleAudioFileUpload}
                      data-testid="input-audio-upload"
                    />
                    <Button variant="outline" onClick={() => audioFileInputRef.current?.click()} data-testid="button-upload-audio">
                      <Upload className="w-4 h-4 mr-2" />
                      {t("uploadAudio")}
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
              <h2 className="text-xl font-semibold">{t("manageOpenings")}</h2>
              <Button
                onClick={() => {
                  setEditingOpening(null);
                  resetOpeningForm();
                  setOpeningDialogOpen(true);
                }}
                data-testid="button-create-opening"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t("createOpening")}
              </Button>
            </div>

            {openingsLoading ? (
              <p className="text-muted-foreground" data-testid="loading-openings">{t("loading")}</p>
            ) : openings.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Briefcase className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No job openings yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {openings.map((opening) => (
                  <Card key={opening.id} data-testid={`card-opening-${opening.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-semibold" data-testid={`text-opening-title-${opening.id}`}>
                              {opening.title}
                            </h3>
                            {getOpeningStatusBadge(opening.status, t)}
                            {opening.isHighlighted && (
                              <Badge variant="outline" className="border-amber-500/40 text-amber-400 gap-1" data-testid={`badge-highlighted-${opening.id}`}>
                                <Star className="w-3 h-3" />
                                {t("highlightedBadge")}
                              </Badge>
                            )}
                            {opening.isPartner && (
                              <Badge variant="outline" className="border-cyan-500/40 text-cyan-400 gap-1" data-testid={`badge-partner-${opening.id}`}>
                                <Handshake className="w-3 h-3" />
                                {t("partnerBadge")}
                                {opening.companyName ? ` — ${opening.companyName}` : ""}
                              </Badge>
                            )}
                            {opening.isFounderProject && (
                              <Badge variant="outline" className="border-blue-500/40 text-blue-400 gap-1" data-testid={`badge-founder-${opening.id}`}>
                                <Rocket className="w-3 h-3" />
                                {t("founderBadge")}
                                {opening.founderName ? ` — ${opening.founderName}` : ""}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {opening.department}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {opening.location}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {opening.employmentType === "full-time" ? t("fullTime") :
                               opening.employmentType === "part-time" ? t("partTime") : t("internship")}
                            </span>
                            {(opening.salaryMin || opening.salaryMax) && (
                              <span className="flex items-center gap-1">
                                <DollarSign className="w-3 h-3" />
                                {opening.salaryMin && opening.salaryMax
                                  ? `${opening.salaryMin.toLocaleString()} - ${opening.salaryMax.toLocaleString()} ${opening.salaryCurrency || ""}`
                                  : opening.salaryMin
                                  ? `${t("salaryMin")}: ${opening.salaryMin.toLocaleString()} ${opening.salaryCurrency || ""}`
                                  : `${t("salaryMax")}: ${opening.salaryMax?.toLocaleString()} ${opening.salaryCurrency || ""}`}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEditOpening(opening)}
                            data-testid={`button-edit-opening-${opening.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteOpeningMutation.mutate(opening.id)}
                            data-testid={`button-delete-opening-${opening.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="applications" className="mt-6">
            <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
              <h2 className="text-xl font-semibold">
                {t("applications")}
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({t("totalApplications")}: {applications.length})
                </span>
              </h2>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("search")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-applications"
                />
              </div>
              <div className="flex gap-2">
                <Select value={jobFilter} onValueChange={setJobFilter}>
                  <SelectTrigger className="w-full sm:w-48" data-testid="trigger-filter-job">
                    <SelectValue placeholder={t("jobTitle")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Jobs</SelectItem>
                    {openings.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-40" data-testid="trigger-filter-status">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="new">{t("statusNew")}</SelectItem>
                    <SelectItem value="reviewing">{t("statusReviewing")}</SelectItem>
                    <SelectItem value="interview">{t("statusInterview")}</SelectItem>
                    <SelectItem value="offered">{t("statusOffered")}</SelectItem>
                    <SelectItem value="rejected">{t("statusRejected")}</SelectItem>
                    <SelectItem value="hired">{t("statusHired")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {applicationsLoading ? (
              <p className="text-muted-foreground" data-testid="loading-applications">{t("loading")}</p>
            ) : filteredApplications.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="font-semibold mb-1">{t("noApplications")}</p>
                  <p className="text-sm text-muted-foreground">{t("noApplicationsDesc")}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredApplications.map((app) => (
                  <Card
                    key={app.id}
                    className="cursor-pointer hover-elevate"
                    onClick={() => setSelectedApplication(app.id)}
                    data-testid={`card-application-${app.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-semibold" data-testid={`text-applicant-name-${app.id}`}>
                              {app.applicantName}
                            </span>
                            {getApplicationStatusBadge(app.status, t)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {app.email}
                            </span>
                            {app.jobTitle && (
                              <span className="flex items-center gap-1">
                                <Briefcase className="w-3 h-3" />
                                {app.jobTitle}
                              </span>
                            )}
                            {app.createdAt && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(app.createdAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            {pendingLoading ? (
              <div className="text-center py-8 text-muted-foreground">{t("loading")}</div>
            ) : pendingOpenings.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  {t("noPendingSubmissions")}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pendingOpenings.map((opening) => (
                  <Card key={opening.id} className="border-amber-500/30" data-testid={`pending-card-${opening.id}`}>
                    <CardContent className="pt-6">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg">{opening.title}</h3>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{opening.department}</span>
                            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{opening.location}</span>
                            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{opening.employmentType}</span>
                          </div>
                          {opening.submitterFirstName && (
                            <div className="mt-2 text-sm">
                              <span className="text-muted-foreground">{t("submittedByLabel")}: </span>
                              <span className="font-medium">{opening.submitterFirstName} {opening.submitterLastName}</span>
                              {opening.submitterEmail && (
                                <span className="text-muted-foreground ml-2">({opening.submitterEmail})</span>
                              )}
                            </div>
                          )}
                          {opening.isFounderProject && opening.founderProjectName && (
                            <div className="mt-1 text-sm">
                              <Badge variant="outline" className="border-blue-500 text-blue-400 mr-2"><Rocket className="h-3 w-3 mr-1" />{t("founderProject")}</Badge>
                              <span className="text-blue-400">{opening.founderProjectName}</span>
                              {opening.founderName && <span className="text-muted-foreground ml-1">by {opening.founderName}</span>}
                            </div>
                          )}
                          {opening.description && (
                            <p className="mt-3 text-sm text-muted-foreground line-clamp-3">{opening.description.replace(/<[^>]*>/g, '').substring(0, 300)}</p>
                          )}
                          {(opening.salaryMin || opening.salaryMax) && (
                            <div className="mt-2 flex items-center gap-1 text-sm">
                              <DollarSign className="h-3.5 w-3.5" />
                              {opening.salaryMin && opening.salaryMax
                                ? `${opening.salaryMin.toLocaleString()} - ${opening.salaryMax.toLocaleString()} ${opening.salaryCurrency || 'RUB'}`
                                : opening.salaryMin
                                  ? `${t("from")} ${opening.salaryMin.toLocaleString()} ${opening.salaryCurrency || 'RUB'}`
                                  : `${t("upTo")} ${opening.salaryMax?.toLocaleString()} ${opening.salaryCurrency || 'RUB'}`
                              }
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button
                            onClick={() => reviewOpeningMutation.mutate({ id: opening.id, status: "open" })}
                            disabled={reviewOpeningMutation.isPending}
                            className="bg-green-600"
                            data-testid={`button-approve-${opening.id}`}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            {t("approve")}
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => reviewOpeningMutation.mutate({ id: opening.id, status: "rejected" })}
                            disabled={reviewOpeningMutation.isPending}
                            data-testid={`button-reject-${opening.id}`}
                          >
                            <X className="h-4 w-4 mr-2" />
                            {t("reject")}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Dialog
          open={openingDialogOpen}
          onOpenChange={(open) => {
            setOpeningDialogOpen(open);
            if (!open) {
              setEditingOpening(null);
              resetOpeningForm();
            }
          }}
        >
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-opening-form">
            <DialogHeader>
              <DialogTitle>{editingOpening ? t("editOpening") : t("createOpening")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">{t("jobTitle")}</label>
                <Input
                  value={openingForm.title}
                  onChange={(e) => setOpeningForm({ ...openingForm, title: e.target.value })}
                  data-testid="input-opening-title"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{t("department")}</label>
                <Input
                  value={openingForm.department}
                  onChange={(e) => setOpeningForm({ ...openingForm, department: e.target.value })}
                  data-testid="input-opening-department"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{t("location")}</label>
                <Input
                  value={openingForm.location}
                  onChange={(e) => setOpeningForm({ ...openingForm, location: e.target.value })}
                  data-testid="input-opening-location"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{t("employmentType")}</label>
                <Select
                  value={openingForm.employmentType}
                  onValueChange={(value) => setOpeningForm({ ...openingForm, employmentType: value })}
                >
                  <SelectTrigger data-testid="trigger-opening-employment-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-time">{t("fullTime")}</SelectItem>
                    <SelectItem value="part-time">{t("partTime")}</SelectItem>
                    <SelectItem value="internship">{t("internship")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{t("jobDescription")}</label>
                <RichTextEditor
                  value={openingForm.description}
                  onChange={(val) => setOpeningForm({ ...openingForm, description: val })}
                  placeholder={t("jobDescription")}
                  data-testid="input-opening-description"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{t("jobRequirements")}</label>
                <RichTextEditor
                  value={openingForm.requirements}
                  onChange={(val) => setOpeningForm({ ...openingForm, requirements: val })}
                  placeholder={t("jobRequirements")}
                  data-testid="input-opening-requirements"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">{t("salaryMin")}</label>
                  <Input
                    type="number"
                    value={openingForm.salaryMin}
                    onChange={(e) => setOpeningForm({ ...openingForm, salaryMin: e.target.value })}
                    data-testid="input-opening-salary-min"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">{t("salaryMax")}</label>
                  <Input
                    type="number"
                    value={openingForm.salaryMax}
                    onChange={(e) => setOpeningForm({ ...openingForm, salaryMax: e.target.value })}
                    data-testid="input-opening-salary-max"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{t("currency")}</label>
                <Input
                  value={openingForm.salaryCurrency}
                  onChange={(e) => setOpeningForm({ ...openingForm, salaryCurrency: e.target.value })}
                  data-testid="input-opening-currency"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{t("experienceLevelLabel")}</label>
                <Select
                  value={openingForm.experienceLevel || "none_selected"}
                  onValueChange={(value) => setOpeningForm({ ...openingForm, experienceLevel: value === "none_selected" ? "" : value })}
                >
                  <SelectTrigger data-testid="trigger-opening-experience-level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none_selected">—</SelectItem>
                    <SelectItem value="none">{t("noExperience")}</SelectItem>
                    <SelectItem value="1-3">{t("experience1to3")}</SelectItem>
                    <SelectItem value="3-6">{t("experience3to6")}</SelectItem>
                    <SelectItem value="6+">{t("experience6plus")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{t("paymentFrequencyLabel")}</label>
                <Select
                  value={openingForm.paymentFrequency || "none_selected"}
                  onValueChange={(value) => setOpeningForm({ ...openingForm, paymentFrequency: value === "none_selected" ? "" : value })}
                >
                  <SelectTrigger data-testid="trigger-opening-payment-frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none_selected">—</SelectItem>
                    <SelectItem value="twice_monthly">{t("paymentTwiceMonth")}</SelectItem>
                    <SelectItem value="monthly">{t("paymentMonthly")}</SelectItem>
                    <SelectItem value="weekly">{t("paymentWeekly")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{t("accentColorLabel")}</label>
                <Select
                  value={openingForm.accentColor || "none_selected"}
                  onValueChange={(value) => setOpeningForm({ ...openingForm, accentColor: value === "none_selected" ? "" : value })}
                >
                  <SelectTrigger data-testid="trigger-opening-accent-color">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none_selected">—</SelectItem>
                    <SelectItem value="orange">Orange</SelectItem>
                    <SelectItem value="blue">Blue</SelectItem>
                    <SelectItem value="green">Green</SelectItem>
                    <SelectItem value="purple">Purple</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{t("metroStationsLabel")}</label>
                <Input
                  value={openingForm.metroStations}
                  onChange={(e) => setOpeningForm({ ...openingForm, metroStations: e.target.value })}
                  placeholder="Arbatskaya, Tverskaya, Okhotny Ryad"
                  data-testid="input-opening-metro-stations"
                />
              </div>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="isVerified"
                  checked={openingForm.isVerified}
                  onCheckedChange={(checked) => setOpeningForm({ ...openingForm, isVerified: !!checked })}
                  data-testid="checkbox-verified"
                />
                <label htmlFor="isVerified" className="text-sm cursor-pointer">
                  {t("isVerifiedLabel")}
                </label>
              </div>
              <div className="rounded-lg border p-4 space-y-4">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-blue-400" />
                  {t("fieldAndSpecialization")}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">{t("field")}</label>
                    <Select
                      value={openingForm.field || "none"}
                      onValueChange={(v) => setOpeningForm({ ...openingForm, field: v === "none" ? "" : v })}
                    >
                      <SelectTrigger data-testid="select-opening-field">
                        <SelectValue placeholder={t("selectField")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t("notSpecified")}</SelectItem>
                        <SelectItem value="fintech">{t("fieldFintech")}</SelectItem>
                        <SelectItem value="edtech">{t("fieldEdtech")}</SelectItem>
                        <SelectItem value="healthtech">{t("fieldHealthtech")}</SelectItem>
                        <SelectItem value="ecommerce">{t("fieldEcommerce")}</SelectItem>
                        <SelectItem value="ai">{t("fieldAI")}</SelectItem>
                        <SelectItem value="saas">{t("fieldSaaS")}</SelectItem>
                        <SelectItem value="gamedev">{t("fieldGamedev")}</SelectItem>
                        <SelectItem value="media">{t("fieldMedia")}</SelectItem>
                        <SelectItem value="logistics">{t("fieldLogistics")}</SelectItem>
                        <SelectItem value="hr">{t("fieldHR")}</SelectItem>
                        <SelectItem value="legaltech">{t("fieldLegaltech")}</SelectItem>
                        <SelectItem value="insurtech">{t("fieldInsurtech")}</SelectItem>
                        <SelectItem value="other">{t("fieldOther")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">{t("specialization")}</label>
                    <Input
                      value={openingForm.specialization}
                      onChange={(e) => setOpeningForm({ ...openingForm, specialization: e.target.value })}
                      placeholder={language === "ru" ? "Frontend, Backend, DevOps..." : "Frontend, Backend, DevOps..."}
                      data-testid="input-opening-specialization"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-4 space-y-4">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-purple-400" />
                  {t("companyDetails")}
                </h4>
                <div>
                  <label className="text-sm font-medium mb-1 block">{t("companyType")}</label>
                  <Input
                    value={openingForm.companyType}
                    onChange={(e) => setOpeningForm({ ...openingForm, companyType: e.target.value })}
                    placeholder={language === "ru" ? "Стартап, Корпорация, IT-компания..." : "Startup, Corporation, IT company..."}
                    data-testid="input-opening-company-type"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">{t("companyDescription")}</label>
                  <Textarea
                    value={openingForm.companyDescription}
                    onChange={(e) => setOpeningForm({ ...openingForm, companyDescription: e.target.value })}
                    placeholder={language === "ru" ? "Описание компании..." : "Company description..."}
                    className="min-h-[80px]"
                    data-testid="input-opening-company-description"
                  />
                </div>
              </div>

              <div className="rounded-lg border p-4 space-y-4">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-green-400" />
                  {t("workArrangement")}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">{t("schedule")}</label>
                    <Select
                      value={openingForm.schedule || "none"}
                      onValueChange={(v) => setOpeningForm({ ...openingForm, schedule: v === "none" ? "" : v })}
                    >
                      <SelectTrigger data-testid="select-opening-schedule">
                        <SelectValue placeholder={t("selectSchedule")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t("notSpecified")}</SelectItem>
                        <SelectItem value="5/2">{t("schedule52")}</SelectItem>
                        <SelectItem value="2/2">{t("schedule22")}</SelectItem>
                        <SelectItem value="flex">{t("flexSchedule")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">{t("workHours")}</label>
                    <Input
                      value={openingForm.workHours}
                      onChange={(e) => setOpeningForm({ ...openingForm, workHours: e.target.value })}
                      placeholder="9:00-18:00"
                      data-testid="input-opening-work-hours"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="isRemote"
                    checked={openingForm.isRemote}
                    onCheckedChange={(checked) => setOpeningForm({ ...openingForm, isRemote: !!checked })}
                    data-testid="checkbox-remote"
                  />
                  <label htmlFor="isRemote" className="text-sm cursor-pointer">
                    {t("remote")}
                  </label>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <Select
                  value={openingForm.status}
                  onValueChange={(value) => setOpeningForm({ ...openingForm, status: value })}
                >
                  <SelectTrigger data-testid="trigger-opening-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">{t("statusDraft")}</SelectItem>
                    <SelectItem value="open">{t("statusOpen")}</SelectItem>
                    <SelectItem value="closed">{t("statusClosed")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-lg border p-4 space-y-4">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400" />
                  {t("highlightPosition")}
                </h4>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="isHighlighted"
                    checked={openingForm.isHighlighted}
                    onCheckedChange={(checked) => setOpeningForm({ ...openingForm, isHighlighted: !!checked })}
                    data-testid="checkbox-highlighted"
                  />
                  <label htmlFor="isHighlighted" className="text-sm cursor-pointer">
                    {t("markAsHighlighted")}
                  </label>
                </div>
              </div>

              <div className="rounded-lg border p-4 space-y-4">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Handshake className="w-4 h-4 text-cyan-400" />
                  {t("partnerPosition")}
                </h4>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="isPartner"
                    checked={openingForm.isPartner}
                    onCheckedChange={(checked) => setOpeningForm({ ...openingForm, isPartner: !!checked })}
                    data-testid="checkbox-partner"
                  />
                  <label htmlFor="isPartner" className="text-sm cursor-pointer">
                    {t("markAsPartner")}
                  </label>
                </div>
                {openingForm.isPartner && (
                  <div className="space-y-3 pl-6">
                    <div>
                      <label className="text-sm font-medium mb-1 block">{t("companyName")}</label>
                      <Input
                        value={openingForm.companyName}
                        onChange={(e) => setOpeningForm({ ...openingForm, companyName: e.target.value })}
                        placeholder="Google, Yandex, Sber..."
                        data-testid="input-company-name"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">{t("companyLogo")}</label>
                      <input
                        ref={companyLogoInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleLogoUpload(file, "company");
                        }}
                        data-testid="input-company-logo-file"
                      />
                      <div className="flex items-center gap-3">
                        {openingForm.companyLogoUrl ? (
                          <div className="relative">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={openingForm.companyLogoUrl} alt="Company logo" />
                              <AvatarFallback className="bg-cyan-500/20 text-cyan-300 text-xs">
                                {(openingForm.companyName || "C").slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <button
                              type="button"
                              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                              onClick={() => setOpeningForm({ ...openingForm, companyLogoUrl: "" })}
                              data-testid="button-remove-company-logo"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ) : null}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => companyLogoInputRef.current?.click()}
                          disabled={companyLogoUploading}
                          data-testid="button-upload-company-logo"
                        >
                          <Upload className="w-3.5 h-3.5 mr-1.5" />
                          {companyLogoUploading ? t("loading") : openingForm.companyLogoUrl ? t("changeLogo") : t("uploadLogo")}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-amber-500/30 p-4 space-y-4">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  {language === 'ru' ? 'Спец. брендирование' : 'Special Branding'}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {language === 'ru' ? 'Вакансия с индивидуальным оформлением: фирменный цвет, логотип и баннер компании' : 'Vacancy with custom styling: brand color, logo, and company banner'}
                </p>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="isSpecialBranding"
                    checked={openingForm.isSpecialBranding}
                    onCheckedChange={(checked) => setOpeningForm({ ...openingForm, isSpecialBranding: !!checked })}
                    data-testid="checkbox-special-branding"
                  />
                  <label htmlFor="isSpecialBranding" className="text-sm cursor-pointer">
                    {language === 'ru' ? 'Включить спец. брендирование' : 'Enable special branding'}
                  </label>
                </div>
                {openingForm.isSpecialBranding && (
                  <div className="space-y-3 pl-6">
                    <div>
                      <label className="text-sm font-medium mb-1 block">
                        {language === 'ru' ? 'Фирменный цвет (HEX)' : 'Brand color (HEX)'}
                      </label>
                      <div className="flex items-center gap-3">
                        <Input
                          value={openingForm.specialBrandingColor}
                          onChange={(e) => setOpeningForm({ ...openingForm, specialBrandingColor: e.target.value })}
                          placeholder="#e4032e"
                          className="flex-1"
                          data-testid="input-special-branding-color"
                        />
                        <div
                          className="w-9 h-9 rounded-md border border-border flex-shrink-0"
                          style={{ backgroundColor: openingForm.specialBrandingColor || '#ccc' }}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">
                        {language === 'ru' ? 'Логотип компании' : 'Company logo'}
                      </label>
                      {openingForm.specialBrandingLogoUrl ? (
                        <div className="flex items-center gap-3">
                          <img src={openingForm.specialBrandingLogoUrl} alt="Logo" className="h-10 w-auto object-contain rounded-md border border-border p-1" />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setOpeningForm({ ...openingForm, specialBrandingLogoUrl: "" })}
                            data-testid="button-remove-branding-logo"
                          >
                            <X className="h-3.5 w-3.5 mr-1" />
                            {language === 'ru' ? 'Удалить' : 'Remove'}
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            id="branding-logo-upload"
                            data-testid="input-branding-logo-file"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const formData = new FormData();
                              formData.append('image', file);
                              try {
                                const res = await fetch('/api/upload/image', {
                                  method: 'POST',
                                  body: formData,
                                  credentials: 'include',
                                });
                                if (!res.ok) throw new Error('Upload failed');
                                const data = await res.json();
                                setOpeningForm({ ...openingForm, specialBrandingLogoUrl: data.url });
                                toast({ title: language === 'ru' ? 'Логотип загружен' : 'Logo uploaded' });
                              } catch {
                                toast({ title: language === 'ru' ? 'Ошибка загрузки' : 'Upload failed', variant: 'destructive' });
                              }
                              e.target.value = '';
                            }}
                          />
                          <Button
                            variant="outline"
                            onClick={() => document.getElementById('branding-logo-upload')?.click()}
                            data-testid="button-upload-branding-logo"
                          >
                            <ImagePlus className="h-4 w-4 mr-2" />
                            {language === 'ru' ? 'Загрузить логотип' : 'Upload logo'}
                          </Button>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">
                        {language === 'ru' ? 'Баннер' : 'Banner image'}
                      </label>
                      {openingForm.specialBrandingBannerUrl ? (
                        <div className="space-y-2">
                          <img src={openingForm.specialBrandingBannerUrl} alt="Banner" className="w-full h-24 object-cover rounded-md border border-border" />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setOpeningForm({ ...openingForm, specialBrandingBannerUrl: "" })}
                            data-testid="button-remove-branding-banner"
                          >
                            <X className="h-3.5 w-3.5 mr-1" />
                            {language === 'ru' ? 'Удалить' : 'Remove'}
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            id="branding-banner-upload"
                            data-testid="input-branding-banner-file"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const formData = new FormData();
                              formData.append('image', file);
                              try {
                                const res = await fetch('/api/upload/image', {
                                  method: 'POST',
                                  body: formData,
                                  credentials: 'include',
                                });
                                if (!res.ok) throw new Error('Upload failed');
                                const data = await res.json();
                                setOpeningForm({ ...openingForm, specialBrandingBannerUrl: data.url });
                                toast({ title: language === 'ru' ? 'Баннер загружен' : 'Banner uploaded' });
                              } catch {
                                toast({ title: language === 'ru' ? 'Ошибка загрузки' : 'Upload failed', variant: 'destructive' });
                              }
                              e.target.value = '';
                            }}
                          />
                          <Button
                            variant="outline"
                            onClick={() => document.getElementById('branding-banner-upload')?.click()}
                            data-testid="button-upload-branding-banner"
                          >
                            <ImagePlus className="h-4 w-4 mr-2" />
                            {language === 'ru' ? 'Загрузить баннер' : 'Upload banner'}
                          </Button>
                        </div>
                      )}
                    </div>
                    {openingForm.specialBrandingColor && (
                      <div className="rounded-md overflow-hidden border border-border">
                        {openingForm.specialBrandingBannerUrl && (
                          <img src={openingForm.specialBrandingBannerUrl} alt="Banner" className="w-full h-20 object-cover" />
                        )}
                        <div className="px-4 py-2 flex items-center gap-2" style={{ backgroundColor: openingForm.specialBrandingColor }}>
                          {openingForm.specialBrandingLogoUrl && (
                            <img src={openingForm.specialBrandingLogoUrl} alt="" className="h-6 w-auto object-contain" />
                          )}
                          <span className="text-white text-xs font-semibold">{language === 'ru' ? 'Предпросмотр' : 'Preview'}</span>
                        </div>
                        <div className="p-3 text-xs text-muted-foreground">
                          {language === 'ru' ? 'Так будет выглядеть карточка вакансии на портале' : 'This is how the vacancy card will look on the portal'}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-lg border p-4 space-y-4">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Rocket className="w-4 h-4 text-blue-400" />
                  {t("founderProject")}
                </h4>
                <p className="text-xs text-muted-foreground">{t("founderProjectDesc")}</p>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="isFounderProject"
                    checked={openingForm.isFounderProject}
                    onCheckedChange={(checked) => setOpeningForm({ ...openingForm, isFounderProject: !!checked })}
                    data-testid="checkbox-founder-project"
                  />
                  <label htmlFor="isFounderProject" className="text-sm cursor-pointer">
                    {t("markAsFounderProject")}
                  </label>
                </div>
                {openingForm.isFounderProject && (
                  <div className="space-y-3 pl-6">
                    <div>
                      <label className="text-sm font-medium mb-1 block">{t("founderProjectNameLabel")}</label>
                      <Input
                        value={openingForm.founderProjectName}
                        onChange={(e) => setOpeningForm({ ...openingForm, founderProjectName: e.target.value })}
                        placeholder={t("founderProjectNamePlaceholder") as string}
                        data-testid="input-founder-project-name"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">{t("founderName")}</label>
                      <Input
                        value={openingForm.founderName}
                        onChange={(e) => setOpeningForm({ ...openingForm, founderName: e.target.value })}
                        placeholder="Ivan Petrov..."
                        data-testid="input-founder-name"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">{t("founderLogo")}</label>
                      <input
                        ref={founderLogoInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleLogoUpload(file, "founder");
                        }}
                        data-testid="input-founder-logo-file"
                      />
                      <div className="flex items-center gap-3">
                        {openingForm.founderLogoUrl ? (
                          <div className="relative">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={openingForm.founderLogoUrl} alt="Startup logo" />
                              <AvatarFallback className="bg-blue-500/20 text-blue-300 text-xs">
                                {(openingForm.founderProjectName || "S").slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <button
                              type="button"
                              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                              onClick={() => setOpeningForm({ ...openingForm, founderLogoUrl: "" })}
                              data-testid="button-remove-founder-logo"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ) : null}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => founderLogoInputRef.current?.click()}
                          disabled={founderLogoUploading}
                          data-testid="button-upload-founder-logo"
                        >
                          <Upload className="w-3.5 h-3.5 mr-1.5" />
                          {founderLogoUploading ? t("loading") : openingForm.founderLogoUrl ? t("changeLogo") : t("uploadLogo")}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 flex-wrap">
                <Button
                  variant="outline"
                  onClick={() => {
                    setOpeningDialogOpen(false);
                    setEditingOpening(null);
                    resetOpeningForm();
                  }}
                  data-testid="button-cancel-opening"
                >
                  {t("cancel")}
                </Button>
                <Button
                  onClick={handleSubmitOpening}
                  disabled={createOpeningMutation.isPending || updateOpeningMutation.isPending}
                  data-testid="button-save-opening"
                >
                  {(createOpeningMutation.isPending || updateOpeningMutation.isPending) ? t("loading") : t("save")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
