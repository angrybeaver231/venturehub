import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Calendar, Clock, MapPin, ArrowLeft, Users, Download, Mail, Edit, Upload, X, ImageIcon, CheckCircle2, XCircle, MessageSquare, Shield, Sparkles, Map as MapIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor, type AttachedFile } from "@/components/ui/rich-text-editor";
import { EmailPreview, EmailPreviewToggle } from "@/components/email-preview";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { QRCodeDisplay } from "@/components/qr-code-display";
import { EventFormBuilder } from "@/components/event-form-builder";
import { EventFormResponses } from "@/components/event-form-responses";
import { EventShowcaseSection } from "@/components/event-showcase-section";
import { EventRegistrationForm } from "@/components/event-registration-form";
import { AIChat } from "@/components/ai-chat";
import { GroupNumberChat } from "@/components/group-number-chat";
import { useLanguage } from "@/contexts/LanguageContext";
import type { EventFormField } from "@shared/schema";
import { Popover, PopoverContentNoPortal, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarWidget } from "@/components/ui/calendar";
import { usePageSEO } from "@/hooks/usePageSEO";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isEmailContentEmpty } from "@/lib/emailUtils";
import { formatEventDate, parseDateToDateObject } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ru as ruLocale, enUS } from "date-fns/locale";
import type { Event, EventRegistrationWithUser } from "@shared/schema";
import brandingPattern from "@assets/generated_images/Business_club_branding_pattern_53894416.png";
import { useState } from "react";

export default function EventDetail() {
  const [, params] = useRoute("/events/:id");
  const [, setLocation] = useLocation();
  const { t, language } = useLanguage();
  const { user, isEventAdmin: isAdmin } = useAuth();
  const { toast } = useToast();
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailAttachments, setEmailAttachments] = useState<AttachedFile[]>([]);
  const [emailMode, setEmailMode] = useState<'compose' | 'preview'>('compose');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: "",
    date: "",
    time: "",
    location: "",
    duration: "",
    description: "",
    status: "upcoming",
  });
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string>("");
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [registrationFormOpen, setRegistrationFormOpen] = useState(false);
  const [chatRegistrationOpen, setChatRegistrationOpen] = useState(false);
  const [groupNumberChatOpen, setGroupNumberChatOpen] = useState(false);
  
  const eventId = params?.id;

  const { data: event, isLoading } = useQuery<Event>({
    queryKey: ["/api/events", eventId],
    queryFn: async () => {
      const response = await fetch(`/api/events/${eventId}`);
      if (!response.ok) throw new Error("Event not found");
      return response.json();
    },
    enabled: !!eventId,
  });

  const { data: myRegistration } = useQuery<{ id: number; eventId: number; userId: number } | null>({
    queryKey: ["/api/events", eventId, "my-registration"],
    enabled: !!eventId && !!user,
  });

  const { data: registrations = [] } = useQuery<EventRegistrationWithUser[]>({
    queryKey: ["/api/events", eventId, "registrations"],
    enabled: !!eventId && !!isAdmin,
  });

  const { data: formFields = [] } = useQuery<EventFormField[]>({
    queryKey: ["/api/events", eventId, "form", "fields"],
    queryFn: async () => {
      const response = await fetch(`/api/events/${eventId}/form/fields`);
      if (!response.ok) throw new Error("Failed to fetch form fields");
      return response.json();
    },
    enabled: !!eventId,
  });

  const hasFormFields = formFields.length > 0;

  const registerMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/events/${eventId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const err: any = new Error(data?.message || `${res.status}`);
        err.status = res.status;
        err.code = data?.code;
        throw err;
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: language === "ru" ? "Регистрация успешна" : "Registration Successful",
        description: language === "ru" ? "Вы зарегистрированы на мероприятие" : "You have been registered for this event",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "my-registration"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
    },
    onError: (error: any) => {
      if (error?.code === "GROUP_NUMBER_REQUIRED") {
        setGroupNumberChatOpen(true);
        return;
      }
      toast({
        variant: "destructive",
        title: language === "ru" ? "Ошибка регистрации" : "Registration Failed",
        description: error?.message || (language === "ru" ? "Пожалуйста, попробуйте снова" : "Please try again"),
      });
    },
  });

  const toggleRequiresGroupNumberMutation = useMutation({
    mutationFn: async (requiresGroupNumber: boolean) =>
      apiRequest(`/api/events/${eventId}`, {
        method: "PATCH",
        body: JSON.stringify({ requiresGroupNumber }),
      }),
    onSuccess: () => {
      toast({
        title: language === "ru" ? "Настройки обновлены" : "Settings Updated",
        description: t("requiresGroupNumberHelp"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: language === "ru" ? "Ошибка" : "Error",
        description: language === "ru" ? "Пожалуйста, попробуйте снова" : "Please try again",
      });
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('subject', emailSubject);
      formData.append('message', emailMessage);
      emailAttachments.forEach(att => {
        formData.append('attachments', att.file);
      });
      const response = await fetch(`/api/events/${eventId}/registrations/send-email`, {
        method: "POST",
        body: formData,
        credentials: 'include',
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: 'Failed' }));
        throw new Error(err.message);
      }
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Email Sent",
        description: data.message || `Successfully sent email`,
      });
      setEmailDialogOpen(false);
      setEmailSubject("");
      setEmailMessage("");
      setEmailAttachments([]);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Failed to Send Email",
        description: "Please try again",
      });
    },
  });

  const setFeaturedMutation = useMutation({
    mutationFn: async (isFeatured: boolean) => 
      apiRequest(`/api/events/${eventId}/feature`, {
        method: "PATCH",
        body: JSON.stringify({ isFeatured }),
      }),
    onSuccess: () => {
      toast({
        title: "Featured Event Updated",
        description: "Event featured status has been updated",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events/featured/current"] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to Update Featured Status",
        description: error.message || "Please try again",
      });
    },
  });

  const toggleRegistrationMutation = useMutation({
    mutationFn: async (isOpen: boolean) => 
      apiRequest(`/api/events/${eventId}/registration-status`, {
        method: "PATCH",
        body: JSON.stringify({ isOpen }),
      }),
    onSuccess: () => {
      toast({
        title: "Registration Status Updated",
        description: "Event registration status has been updated",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Failed to Update Registration Status",
        description: "Please try again",
      });
    },
  });

  const toggleGuestChatMutation = useMutation({
    mutationFn: async (allowGuestChatRegistration: boolean) => 
      apiRequest(`/api/events/${eventId}/guest-chat`, {
        method: "PATCH",
        body: JSON.stringify({ allowGuestChatRegistration }),
      }),
    onSuccess: () => {
      toast({
        title: language === "ru" ? "Настройки обновлены" : "Settings Updated",
        description: language === "ru" 
          ? "Настройки гостевой регистрации обновлены" 
          : "Guest registration settings have been updated",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: language === "ru" ? "Ошибка" : "Error",
        description: language === "ru" ? "Пожалуйста, попробуйте снова" : "Please try again",
      });
    },
  });

  const updateRestrictionsMutation = useMutation({
    mutationFn: async (restrictedTo: string[] | null) =>
      apiRequest(`/api/events/${eventId}`, {
        method: "PATCH",
        body: JSON.stringify({ registrationRestrictedTo: restrictedTo }),
      }),
    onSuccess: () => {
      toast({
        title: language === "ru" ? "Ограничения обновлены" : "Restrictions Updated",
        description: language === "ru"
          ? "Настройки ограничения регистрации обновлены"
          : "Registration restriction settings have been updated",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: language === "ru" ? "Ошибка" : "Error",
        description: language === "ru" ? "Пожалуйста, попробуйте снова" : "Please try again",
      });
    },
  });

  const publishEventMutation = useMutation({
    mutationFn: async () => 
      apiRequest(`/api/events/${eventId}/publish`, {
        method: "POST",
      }),
    onSuccess: () => {
      toast({
        title: language === 'ru' ? "Мероприятие опубликовано" : "Event Published",
        description: language === 'ru' ? "Мероприятие теперь доступно всем пользователям" : "The event is now visible to all users",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: language === 'ru' ? "Не удалось опубликовать" : "Failed to Publish",
        description: error.message || (language === 'ru' ? "Пожалуйста, добавьте хотя бы один вопрос для регистрации" : "Please add at least one question for registration"),
      });
    },
  });

  const unpublishEventMutation = useMutation({
    mutationFn: async () => 
      apiRequest(`/api/events/${eventId}/unpublish`, {
        method: "POST",
      }),
    onSuccess: () => {
      toast({
        title: language === 'ru' ? "Мероприятие снято с публикации" : "Event Unpublished",
        description: language === 'ru' ? "Мероприятие перемещено в черновики" : "The event has been moved to drafts",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: language === 'ru' ? "Ошибка" : "Error",
        description: language === 'ru' ? "Пожалуйста, попробуйте снова" : "Please try again",
      });
    },
  });

  const toggleAttendanceMutation = useMutation({
    mutationFn: async ({ registrationId, attendanceMarked }: { registrationId: string; attendanceMarked: boolean }) => {
      return apiRequest(`/api/events/${eventId}/registrations/${registrationId}/attendance`, {
        method: "PATCH",
        body: JSON.stringify({ attendanceMarked }),
      });
    },
    onSuccess: () => {
      toast({
        title: t("attendanceUpdated"),
        description: t("attendanceUpdatedSuccess"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "registrations"] });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: t("attendanceUpdateFailed"),
        description: t("pleaseTryAgain"),
      });
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest(`/api/events/${eventId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Event Updated",
        description: "Event has been successfully updated",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setEditDialogOpen(false);
      resetEditForm();
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Failed to update event. Please try again",
      });
    },
  });

  const handleOpenEditDialog = () => {
    if (!event) return;
    resetEditForm();
    setEditFormData({
      name: event.name,
      date: event.date,
      time: event.time,
      location: event.location,
      duration: event.duration,
      description: event.description || "",
      status: event.status,
    });
    setCoverImagePreview(event.customImage || "");
    setExistingPhotos(event.photos || []);
    setEditDialogOpen(true);
  };

  const resetEditForm = () => {
    setCoverImageFile(null);
    setCoverImagePreview("");
    setGalleryFiles([]);
    setGalleryPreviews([]);
    setExistingPhotos([]);
  };

  const handleEditDialogChange = (open: boolean) => {
    setEditDialogOpen(open);
    if (!open) {
      resetEditForm();
    }
  };

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGalleryImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setGalleryFiles(prev => [...prev, ...files]);
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setGalleryPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeGalleryPreview = (index: number) => {
    setGalleryFiles(prev => prev.filter((_, i) => i !== index));
    setGalleryPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingPhoto = (url: string) => {
    setExistingPhotos(prev => prev.filter(photo => photo !== url));
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadingImages(true);

    try {
      let coverImageUrl = event?.customImage || "";
      const galleryUrls: string[] = [...existingPhotos];

      if (coverImageFile) {
        const formData = new FormData();
        formData.append('image', coverImageFile);
        
        const response = await fetch('/api/upload/image', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });
        
        if (!response.ok) throw new Error('Cover image upload failed');
        const data = await response.json();
        coverImageUrl = data.url;
      }

      if (galleryFiles.length > 0) {
        const formData = new FormData();
        galleryFiles.forEach(file => {
          formData.append('images', file);
        });
        
        const response = await fetch('/api/upload/images', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });
        
        if (!response.ok) throw new Error('Gallery images upload failed');
        const data = await response.json();
        galleryUrls.push(...data.urls);
      }

      setUploadingImages(false);

      updateEventMutation.mutate({
        ...editFormData,
        customImage: coverImageUrl,
        photos: galleryUrls,
      });
    } catch (error) {
      setUploadingImages(false);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: "Failed to upload images. Please try again",
      });
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/registrations/export`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Export failed");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${event?.name}_registrations.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export Successful",
        description: "Registration data has been downloaded",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "Please try again",
      });
    }
  };

  const isRegistered = !!myRegistration;

  // Calculate organization statistics
  const orgStats = registrations.reduce((acc, reg) => {
    const orgType = reg.userOrganizationType || 'not-specified';
    acc[orgType] = (acc[orgType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const orgTypeLabels: Record<string, string> = {
    'financial-university': 'Financial University',
    'other-university': 'Other University',
    'school': 'School',
    'workplace': 'Workplace',
    'not-specified': 'Not Specified',
  };

  usePageSEO({
    title: event ? `${event.name} | Business Events` : 'Event Details | Business Events',
    description: event?.description || 'View details about this business event',
    keywords: 'business event, networking, financial university'
  });

  const statusColors = {
    upcoming: "bg-accent text-accent-foreground",
    full: "bg-destructive text-destructive-foreground",
    past: "bg-muted text-muted-foreground",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">{t("loadingEvents")}</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="text-muted-foreground">Event not found</div>
        <Button onClick={() => setLocation("/events")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Events
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-6">
      <Dialog open={groupNumberChatOpen} onOpenChange={setGroupNumberChatOpen}>
        <DialogContent className="max-w-lg p-0 border-0 bg-transparent shadow-none">
          <DialogHeader className="sr-only">
            <DialogTitle>{t("groupNumberRequiredTitle")}</DialogTitle>
            <DialogDescription>{t("groupNumberRequiredIntro")}</DialogDescription>
          </DialogHeader>
          <GroupNumberChat
            onClose={() => setGroupNumberChatOpen(false)}
            onSaved={async () => {
              await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
              setTimeout(() => {
                setGroupNumberChatOpen(false);
                registerMutation.mutate();
              }, 700);
            }}
          />
        </DialogContent>
      </Dialog>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Button variant="ghost" onClick={() => setLocation("/events")} data-testid="button-back-to-events">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Events
        </Button>
        <div className="flex gap-2 flex-wrap items-center">
          {user && (
            <Button variant="default" onClick={() => setLocation(`/events/${eventId}/networking`)} data-testid="button-open-networking">
              <Sparkles className="h-4 w-4 mr-2" />
              {language === "ru" ? "Нетворкинг" : "Networking"}
            </Button>
          )}
          {isAdmin && eventId && <VenueMapAdminDialog eventId={eventId} language={language} />}
        </div>
        {isAdmin && (
          <div className="flex gap-2 flex-wrap">
            <Dialog open={editDialogOpen} onOpenChange={handleEditDialogChange}>
              <DialogTrigger asChild>
                <Button onClick={handleOpenEditDialog} data-testid="button-edit-event">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Event
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Event</DialogTitle>
                <DialogDescription>
                  Update event details and manage images
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUpdateEvent} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Event Name</Label>
                  <Input
                    id="edit-name"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    required
                    data-testid="input-edit-event-name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-date">Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !editFormData.date && "text-muted-foreground"
                          )}
                          data-testid="input-edit-event-date"
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {editFormData.date ? (
                            formatEventDate(editFormData.date, language)
                          ) : (
                            <span>{t("selectDate")}</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContentNoPortal className="w-auto p-0" align="start">
                        <CalendarWidget
                          mode="single"
                          selected={parseDateToDateObject(editFormData.date)}
                          onSelect={(date) => {
                            if (date) {
                              const year = date.getFullYear();
                              const month = String(date.getMonth() + 1).padStart(2, '0');
                              const day = String(date.getDate()).padStart(2, '0');
                              setEditFormData({ ...editFormData, date: `${year}-${month}-${day}` });
                            }
                          }}
                          locale={language === 'ru' ? ruLocale : enUS}
                        />
                      </PopoverContentNoPortal>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-time">Time</Label>
                    <Input
                      id="edit-time"
                      value={editFormData.time}
                      onChange={(e) => setEditFormData({ ...editFormData, time: e.target.value })}
                      required
                      data-testid="input-edit-event-time"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-location">Location</Label>
                    <Input
                      id="edit-location"
                      value={editFormData.location}
                      onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                      required
                      data-testid="input-edit-event-location"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-duration">Duration</Label>
                    <Input
                      id="edit-duration"
                      value={editFormData.duration}
                      onChange={(e) => setEditFormData({ ...editFormData, duration: e.target.value })}
                      required
                      data-testid="input-edit-event-duration"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-status">Status</Label>
                  <Select value={editFormData.status} onValueChange={(value) => setEditFormData({ ...editFormData, status: value })}>
                    <SelectTrigger data-testid="select-edit-event-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="full">Full</SelectItem>
                      <SelectItem value="past">Past</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editFormData.description}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                    rows={4}
                    data-testid="textarea-edit-event-description"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Cover Image</Label>
                  {coverImagePreview && (
                    <div className="relative w-full h-48 rounded-md overflow-hidden">
                      <img src={coverImagePreview} alt="Cover preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverImageChange}
                      className="flex-1"
                      data-testid="input-edit-cover-image"
                    />
                    {coverImageFile && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCoverImageFile(null);
                          setCoverImagePreview(event?.customImage || "");
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Gallery Photos</Label>
                  
                  {existingPhotos.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Current Photos</p>
                      <div className="grid grid-cols-3 gap-2">
                        {existingPhotos.map((url, index) => (
                          <div key={index} className="relative aspect-square rounded-md overflow-hidden group">
                            <img src={url} alt={`Gallery ${index}`} className="w-full h-full object-cover" />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removeExistingPhoto(url)}
                              data-testid={`button-remove-existing-photo-${index}`}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {galleryPreviews.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">New Photos to Upload</p>
                      <div className="grid grid-cols-3 gap-2">
                        {galleryPreviews.map((preview, index) => (
                          <div key={index} className="relative aspect-square rounded-md overflow-hidden group">
                            <img src={preview} alt={`New ${index}`} className="w-full h-full object-cover" />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removeGalleryPreview(index)}
                              data-testid={`button-remove-new-photo-${index}`}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleGalleryImagesChange}
                    data-testid="input-edit-gallery-images"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={uploadingImages || updateEventMutation.isPending}
                    data-testid="button-submit-edit-event"
                  >
                    {uploadingImages ? "Uploading Images..." : updateEventMutation.isPending ? "Updating..." : "Update Event"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditDialogOpen(false);
                      resetEditForm();
                    }}
                    disabled={uploadingImages || updateEventMutation.isPending}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          
          {user?.isHeadAdmin && event.status === "upcoming" && (
            <Button
              onClick={() => setFeaturedMutation.mutate(!event.isFeatured)}
              variant={event.isFeatured ? "destructive" : "secondary"}
              disabled={setFeaturedMutation.isPending}
              data-testid={event.isFeatured ? "button-unfeature-event" : "button-feature-event"}
            >
              {setFeaturedMutation.isPending 
                ? "Updating..." 
                : event.isFeatured 
                  ? "Remove Featured" 
                  : "Set as Featured"}
            </Button>
          )}
          
          {/* Publish/Unpublish buttons */}
          {event.isDraft ? (
            <Button
              onClick={() => publishEventMutation.mutate()}
              variant="default"
              disabled={publishEventMutation.isPending}
              data-testid="button-publish-event"
            >
              {publishEventMutation.isPending 
                ? (language === 'ru' ? "Публикация..." : "Publishing...")
                : (language === 'ru' ? "Опубликовать" : "Publish Event")}
            </Button>
          ) : (
            <Button
              onClick={() => unpublishEventMutation.mutate()}
              variant="outline"
              disabled={unpublishEventMutation.isPending}
              data-testid="button-unpublish-event"
            >
              {unpublishEventMutation.isPending 
                ? (language === 'ru' ? "Отмена публикации..." : "Unpublishing...")
                : (language === 'ru' ? "Снять с публикации" : "Unpublish")}
            </Button>
          )}
          
          {/* Only show registration toggle for published events */}
          {!event.isDraft && (
            <Button
              onClick={() => toggleRegistrationMutation.mutate(!event.registrationOpen)}
              variant={event.registrationOpen ? "outline" : "default"}
              disabled={toggleRegistrationMutation.isPending}
              data-testid="button-toggle-registration"
            >
              {toggleRegistrationMutation.isPending 
                ? t("updating")
                : event.registrationOpen 
                  ? t("closeRegistration")
                  : t("openRegistration")}
            </Button>
          )}
          
          {/* Require group number toggle - Admin */}
          {isAdmin && !event.isDraft && (
            <Button
              onClick={() => toggleRequiresGroupNumberMutation.mutate(!event.requiresGroupNumber)}
              variant={event.requiresGroupNumber ? "outline" : "secondary"}
              disabled={toggleRequiresGroupNumberMutation.isPending}
              data-testid="button-toggle-requires-group-number"
            >
              {toggleRequiresGroupNumberMutation.isPending
                ? (language === "ru" ? "Обновление..." : "Updating...")
                : event.requiresGroupNumber
                  ? (language === "ru" ? "Не требовать номер группы" : "Don't Require Group Number")
                  : (language === "ru" ? "Требовать номер группы" : "Require Group Number")}
            </Button>
          )}

          {/* Guest chat registration toggle - Head Admin only */}
          {user?.isHeadAdmin && !event.isDraft && hasFormFields && (
            <Button
              onClick={() => toggleGuestChatMutation.mutate(!event.allowGuestChatRegistration)}
              variant={event.allowGuestChatRegistration ? "outline" : "secondary"}
              disabled={toggleGuestChatMutation.isPending}
              data-testid="button-toggle-guest-chat"
            >
              {toggleGuestChatMutation.isPending 
                ? (language === "ru" ? "Обновление..." : "Updating...")
                : event.allowGuestChatRegistration 
                  ? (language === "ru" ? "Отключить гостевую регистрацию" : "Disable Guest Registration")
                  : (language === "ru" ? "Включить гостевую регистрацию" : "Enable Guest Registration")}
            </Button>
          )}
        </div>
        )}
      </div>

      {/* Registration restrictions - Admin only */}
      {isAdmin && !event.isDraft && (
        <div className="p-3 border rounded-md bg-muted/30 space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {language === "ru" ? "Ограничить регистрацию по типу организации" : "Restrict Registration by Organization Type"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: "financial_university", labelRu: "Финансовый университет", labelEn: "Financial University" },
              { value: "other_university", labelRu: "Другой вуз", labelEn: "Other University" },
              { value: "school", labelRu: "Школа", labelEn: "School" },
              { value: "workplace", labelRu: "Место работы", labelEn: "Workplace" },
            ].map((orgType) => {
              const currentRestrictions = event.registrationRestrictedTo || [];
              const isChecked = currentRestrictions.includes(orgType.value);
              return (
                <label key={orgType.value} className="flex items-center gap-2 text-sm cursor-pointer" data-testid={`checkbox-restrict-${orgType.value}`}>
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={(checked) => {
                      let newRestrictions: string[];
                      if (checked) {
                        newRestrictions = [...currentRestrictions, orgType.value];
                      } else {
                        newRestrictions = currentRestrictions.filter((r: string) => r !== orgType.value);
                      }
                      updateRestrictionsMutation.mutate(newRestrictions.length > 0 ? newRestrictions : null);
                    }}
                    disabled={updateRestrictionsMutation.isPending}
                  />
                  <span>{language === "ru" ? orgType.labelRu : orgType.labelEn}</span>
                </label>
              );
            })}
          </div>
          {event.registrationRestrictedTo && event.registrationRestrictedTo.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {language === "ru"
                ? "Только отмеченные типы организаций могут регистрироваться."
                : "Only checked organization types can register."}
            </p>
          )}
          {(!event.registrationRestrictedTo || event.registrationRestrictedTo.length === 0) && (
            <p className="text-xs text-muted-foreground mt-1">
              {language === "ru"
                ? "Нет ограничений — все могут регистрироваться."
                : "No restrictions — anyone can register."}
            </p>
          )}
        </div>
      )}

      <div 
        className="h-96 bg-cover bg-center relative rounded-lg overflow-hidden"
        style={{ backgroundImage: `url(${event.customImage || brandingPattern})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-6 left-6 right-6 text-white">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
            <h1 className="text-4xl font-bold" data-testid="text-event-title">{event.name}</h1>
            <div className="flex gap-2 items-center">
              {event.isDraft && isAdmin && (
                <Badge variant="outline" className="bg-yellow-500/20 text-yellow-200 border-yellow-500">
                  {language === 'ru' ? 'Черновик' : 'Draft'}
                </Badge>
              )}
              <Badge className={event.status === "upcoming" && !event.registrationOpen 
                ? "bg-muted text-muted-foreground" 
                : statusColors[event.status as keyof typeof statusColors]}>
                {event.status === "upcoming" 
                  ? (event.registrationOpen ? t("registrationOpen") : (language === "ru" ? "Регистрация закрыта" : "Registration Closed"))
                  : event.status === "full" ? t("full") : t("pastEvent")}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {event.description && (
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-semibold mb-4">{t("aboutThisEvent")}</h2>
                <p className="text-muted-foreground whitespace-pre-wrap" data-testid="text-event-description">
                  {event.description}
                </p>
              </CardContent>
            </Card>
          )}

          {event.photos && event.photos.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-semibold mb-4">{t("photoGallery")}</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {event.photos.map((photoUrl, index) => (
                    <div
                      key={index}
                      className="aspect-square bg-cover bg-center rounded-md overflow-hidden hover-elevate cursor-pointer"
                      style={{ backgroundImage: `url(${photoUrl})` }}
                      data-testid={`photo-${index}`}
                      onClick={() => window.open(photoUrl, '_blank')}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {eventId && (
            <EventShowcaseSection
              eventId={eventId}
              eventType={event.eventType}
              isAdmin={isAdmin}
              showcaseSlug={event.showcaseSlug ?? null}
            />
          )}

          {isAdmin && registrations.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold">{t("eventRegistrations")}</h2>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExport}
                      data-testid="button-export-event-registrations"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {t("exportToExcel")}
                    </Button>
                    <Dialog open={emailDialogOpen} onOpenChange={(open) => { setEmailDialogOpen(open); if (open) setEmailMode('compose'); }}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          data-testid="button-email-event-registrants"
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          {t("emailRegistrants")}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
                          <DialogTitle>{t("sendEmailToRegistrants")}</DialogTitle>
                          <EmailPreviewToggle mode={emailMode} onToggleMode={setEmailMode} />
                        </DialogHeader>
                        {emailMode === 'compose' ? (
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="email-subject-event">{t("subject")}</Label>
                              <Input
                                id="email-subject-event"
                                value={emailSubject}
                                onChange={(e) => setEmailSubject(e.target.value)}
                                placeholder={t("enterEmailSubject")}
                                data-testid="input-email-subject-event"
                              />
                            </div>
                            <div>
                              <RichTextEditor
                                value={emailMessage}
                                onChange={setEmailMessage}
                                placeholder="Напишите что-нибудь..."
                                data-testid="textarea-email-message-event"
                                showAttachments
                                attachments={emailAttachments}
                                onAttachmentsChange={setEmailAttachments}
                                minHeight={300}
                              />
                            </div>
                          </div>
                        ) : (
                          <EmailPreview htmlContent={emailMessage} subject={emailSubject} attachments={emailAttachments} />
                        )}
                        <Button
                          onClick={() => sendEmailMutation.mutate()}
                          disabled={sendEmailMutation.isPending || !emailSubject || isEmailContentEmpty(emailMessage)}
                          className="w-full"
                          data-testid="button-send-email-event"
                        >
                          {sendEmailMutation.isPending ? "Sending..." : `Send Email to ${registrations.length} Registrants`}
                        </Button>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{registrations.length}</div>
                      <div className="text-sm text-muted-foreground">Total Registrations</div>
                    </CardContent>
                  </Card>
                  {Object.entries(orgStats).map(([orgType, count]) => (
                    <Card key={orgType}>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{count}</div>
                        <div className="text-sm text-muted-foreground">{orgTypeLabels[orgType]}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Organization Type</TableHead>
                        <TableHead>Organization Name</TableHead>
                        <TableHead>Registration Date</TableHead>
                        <TableHead>Attendance</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {registrations.map((reg) => (
                        <TableRow key={reg.id} data-testid={`row-registration-${reg.id}`}>
                          <TableCell>
                            {reg.userFirstName} {reg.userLastName} {reg.userPatronymic}
                            {reg.guestName && <span>{reg.guestName}</span>}
                          </TableCell>
                          <TableCell>{reg.userEmail || reg.guestEmail}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {orgTypeLabels[reg.userOrganizationType || 'not-specified']}
                            </Badge>
                          </TableCell>
                          <TableCell>{reg.userOrganizationName || '-'}</TableCell>
                          <TableCell>
                            {reg.createdAt ? new Date(reg.createdAt).toLocaleDateString() : '-'}
                          </TableCell>
                          <TableCell data-testid={`text-attendance-${reg.id}`}>
                            {reg.attendanceMarked ? (
                              <Badge className="bg-green-600 hover:bg-green-700 text-white gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                {t("attended")}
                                {reg.attendanceTime && (
                                  <span className="text-xs ml-1">
                                    {new Date(reg.attendanceTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1">
                                <XCircle className="h-3 w-3" />
                                {t("notAttended")}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant={reg.attendanceMarked ? "outline" : "default"}
                              size="sm"
                              onClick={() => toggleAttendanceMutation.mutate({
                                registrationId: reg.id,
                                attendanceMarked: !reg.attendanceMarked
                              })}
                              disabled={toggleAttendanceMutation.isPending}
                              data-testid={`button-toggle-attendance-${reg.id}`}
                            >
                              {toggleAttendanceMutation.isPending ? (
                                t("updating")
                              ) : reg.attendanceMarked ? (
                                t("unmarkAttendance")
                              ) : (
                                t("markAttendanceManually")
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
          
          {isAdmin && eventId && (
            <EventFormBuilder eventId={eventId} />
          )}
          
          {isAdmin && eventId && (
            <EventFormResponses eventId={eventId} />
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h2 className="text-xl font-semibold">{t("eventDetails")}</h2>
              
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">{t("date")}</p>
                  <p className="text-muted-foreground" data-testid="text-event-date">{formatEventDate(event.date, language)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">{t("time")}</p>
                  <p className="text-muted-foreground" data-testid="text-event-time">{event.time}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">{t("duration")}</p>
                  <p className="text-muted-foreground" data-testid="text-event-duration">{event.duration}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">{t("location")}</p>
                  <p className="text-muted-foreground" data-testid="text-event-location">{event.location}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {event.status === "upcoming" && !isAdmin && (() => {
            const restrictions = event.registrationRestrictedTo;
            const userOrgType = user?.organizationType || "";
            const isRestricted = restrictions && restrictions.length > 0 && !restrictions.includes(userOrgType);
            
            const orgTypeLabels: Record<string, { ru: string; en: string }> = {
              financial_university: { ru: "Финансовый университет", en: "Financial University" },
              other_university: { ru: "Другой вуз", en: "Other University" },
              school: { ru: "Школа", en: "School" },
              workplace: { ru: "Место работы", en: "Workplace" },
            };
            
            if (isRestricted) {
              const allowedLabels = restrictions.map((r: string) => orgTypeLabels[r]?.[language === "ru" ? "ru" : "en"] || r).join(", ");
              return (
                <Card className="border-orange-500/30 bg-orange-500/5">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-5 w-5 text-orange-500" />
                      <h3 className="font-semibold text-orange-600 dark:text-orange-400" data-testid="text-registration-restricted">
                        {language === "ru" ? "Регистрация ограничена" : "Registration Restricted"}
                      </h3>
                    </div>
                    <p className="text-sm text-muted-foreground" data-testid="text-restriction-details">
                      {language === "ru"
                        ? `Это мероприятие доступно только для: ${allowedLabels}. Ваш тип организации не соответствует требованиям.`
                        : `This event is only available for: ${allowedLabels}. Your organization type does not match the requirements.`}
                    </p>
                  </CardContent>
                </Card>
              );
            }
            
            return (
            <>
              {isRegistered ? (
                <div className="space-y-4">
                  <Button variant="secondary" className="w-full" size="lg" disabled data-testid="button-registered">
                    {t("registered")}
                  </Button>
                  {myRegistration && (
                    <QRCodeDisplay 
                      registrationId={myRegistration.id} 
                      eventName={event.name}
                      showDownload={true}
                    />
                  )}
                </div>
              ) : (
                <>
                  {chatRegistrationOpen ? (
                    <div className="space-y-4">
                      <AIChat
                        eventId={eventId}
                        type="event_registration"
                        onClose={() => setChatRegistrationOpen(false)}
                        onRegistrationComplete={() => {
                          setChatRegistrationOpen(false);
                          toast({
                            title: language === "ru" ? "Регистрация успешна!" : "Registration Successful!",
                            description: language === "ru" ? "Вы зарегистрированы на мероприятие" : "You have been registered for this event",
                          });
                          queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "my-registration"] });
                          queryClient.invalidateQueries({ queryKey: ["/api/events"] });
                        }}
                      />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {hasFormFields ? (
                        <>
                          {event.registrationOpen ? (
                            <Button 
                              className="w-full" 
                              size="lg"
                              onClick={() => setChatRegistrationOpen(true)}
                              data-testid="button-chat-register"
                            >
                              <MessageSquare className="h-4 w-4 mr-2" />
                              {language === "ru" ? "Зарегистрироваться" : "Register for Event"}
                            </Button>
                          ) : (
                            <Button variant="secondary" className="w-full" size="lg" disabled data-testid="button-registration-closed">
                              {language === "ru" ? "Регистрация закрыта" : "Registration Closed"}
                            </Button>
                          )}
                          {event.registrationOpen && (
                            <p className="text-xs text-muted-foreground text-center">
                              {language === "ru" 
                                ? "Регистрация проходит через AI-чат" 
                                : "Registration is done through AI chat"}
                            </p>
                          )}
                        </>
                      ) : (
                        <>
                          <Button 
                            className="w-full" 
                            size="lg" 
                            onClick={() => registerMutation.mutate()}
                            disabled={!event.registrationOpen || registerMutation.isPending}
                            data-testid="button-register-event"
                          >
                            {!event.registrationOpen 
                              ? (language === "ru" ? "Регистрация закрыта" : "Registration Closed")
                              : registerMutation.isPending 
                                ? t("loading") 
                                : t("registerForEvent")}
                          </Button>
                          
                          {event.registrationOpen && (
                            <Button 
                              className="w-full" 
                              size="lg"
                              variant="outline"
                              onClick={() => setChatRegistrationOpen(true)}
                              data-testid="button-chat-register-alt"
                            >
                              <MessageSquare className="h-4 w-4 mr-2" />
                              {language === "ru" ? "Регистрация через чат" : "Register via Chat"}
                            </Button>
                          )}
                        </>
                      )}
                      
                      {!event.registrationOpen && (
                        <p className="text-sm text-muted-foreground text-center mt-2">
                          {language === "ru" 
                            ? "Регистрация на это мероприятие закрыта организаторами."
                            : "Registration for this event has been closed by the organizers."}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

function VenueMapAdminDialog({ eventId, language }: { eventId: string; language: string }) {
  const t = (ru: string, en: string) => (language === "ru" ? ru : en);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [pinName, setPinName] = useState("");
  const [pinKind, setPinKind] = useState("booth");
  const [pinX, setPinX] = useState(0.5);
  const [pinY, setPinY] = useState(0.5);
  const [placingPin, setPlacingPin] = useState(false);

  const q = useQuery<{ map: any; pins: any[] }>({
    queryKey: ["/api/events", eventId, "venue-map"],
    enabled: open,
  });

  const saveMapM = useMutation({
    mutationFn: async () => {
      const r = await apiRequest(`/api/events/${eventId}/venue-map`, { method: "POST", body: JSON.stringify({ imageUrl }) });
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "venue-map"] });
      setImageUrl("");
      toast({ title: t("Карта сохранена", "Map saved") });
    },
    onError: (e: any) => toast({ title: t("Ошибка", "Error"), description: e.message, variant: "destructive" }),
  });

  const addPinM = useMutation({
    mutationFn: async () => {
      const r = await apiRequest(`/api/events/${eventId}/venue-pins`, {
        method: "POST",
        body: JSON.stringify({ name: pinName, kind: pinKind, x: pinX, y: pinY }),
      });
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "venue-map"] });
      setPinName("");
    },
  });

  const delPinM = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/api/venue-pins/${id}`, { method: "DELETE" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "venue-map"] }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="button-venue-map-admin">
          <MapIcon className="h-4 w-4 mr-2" />
          {t("Карта веню", "Venue map")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("Карта веню для нетворкинга", "Venue map for networking")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("URL изображения карты", "Map image URL")}</Label>
            <div className="flex gap-2">
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder={q.data?.map?.imageUrl || "https://…"}
                data-testid="input-venue-map-url"
              />
              <Button onClick={() => saveMapM.mutate()} disabled={!imageUrl || saveMapM.isPending} data-testid="button-save-venue-map">
                {t("Сохранить", "Save")}
              </Button>
            </div>
          </div>

          {q.data?.map && (
            <div>
              <Label>{t("Кликните по карте, чтобы поставить точку", "Click on the map to place a pin")}</Label>
              <div
                className="relative w-full mt-2 cursor-crosshair border rounded-md overflow-hidden"
                style={{ aspectRatio: "16 / 10" }}
                onClick={(e) => {
                  const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                  setPinX(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
                  setPinY(Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)));
                  setPlacingPin(true);
                }}
                data-testid="container-venue-map-edit"
              >
                <img src={q.data.map.imageUrl} alt="venue" className="w-full h-full object-contain pointer-events-none" />
                {q.data.pins.map((p: any) => (
                  <div key={p.id} className="absolute -translate-x-1/2 -translate-y-full" style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}>
                    <Badge>{p.name}</Badge>
                    <MapPin className="h-4 w-4 mx-auto text-primary" />
                  </div>
                ))}
                {placingPin && (
                  <div className="absolute -translate-x-1/2 -translate-y-full" style={{ left: `${pinX * 100}%`, top: `${pinY * 100}%` }}>
                    <Badge variant="destructive">new</Badge>
                    <MapPin className="h-4 w-4 mx-auto text-destructive" />
                  </div>
                )}
              </div>

              {placingPin && (
                <div className="mt-3 grid grid-cols-2 gap-2 items-end">
                  <div>
                    <Label>{t("Название точки", "Pin name")}</Label>
                    <Input value={pinName} onChange={(e) => setPinName(e.target.value)} data-testid="input-pin-name" />
                  </div>
                  <div>
                    <Label>{t("Тип", "Type")}</Label>
                    <select className="w-full border rounded-md h-9 px-2 bg-background" value={pinKind} onChange={(e) => setPinKind(e.target.value)} data-testid="select-pin-kind">
                      <option value="stage">{t("Сцена", "Stage")}</option>
                      <option value="booth">{t("Стенд", "Booth")}</option>
                      <option value="coffee">{t("Кофе-зона", "Coffee")}</option>
                      <option value="registration">{t("Регистрация", "Registration")}</option>
                      <option value="other">{t("Другое", "Other")}</option>
                    </select>
                  </div>
                  <div className="col-span-2 flex gap-2">
                    <Button onClick={() => { addPinM.mutate(); setPlacingPin(false); }} disabled={!pinName || addPinM.isPending} data-testid="button-add-pin">
                      {t("Добавить точку", "Add pin")}
                    </Button>
                    <Button variant="ghost" onClick={() => setPlacingPin(false)}>{t("Отмена", "Cancel")}</Button>
                  </div>
                </div>
              )}

              {q.data.pins.length > 0 && (
                <div className="mt-4 space-y-1">
                  <Label>{t("Существующие точки", "Existing pins")}</Label>
                  <div className="grid gap-1">
                    {q.data.pins.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between border rounded-md px-3 py-1.5 text-sm">
                        <span>{p.name} <span className="text-muted-foreground">· {p.kind}</span></span>
                        <Button size="icon" variant="ghost" onClick={() => delPinM.mutate(p.id)} data-testid={`button-del-pin-${p.id}`}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
