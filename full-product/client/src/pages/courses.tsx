import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CourseCard } from "@/components/course-card";
import { Button } from "@/components/ui/button";
import { Plus, Upload, Loader2, Image as ImageIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageSEO } from "@/hooks/usePageSEO";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useLocation } from "wouter";
import type { Course, CourseProgress } from "@shared/schema";

export default function Courses() {
  const { toast } = useToast();
  const { user, isLmsAdmin: isAdmin } = useAuth();
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  usePageSEO({
    title: 'Business Courses | Бизнес Курсы',
    description: 'Business education courses from Financial University Business Club. Learn entrepreneurship, finance, and business development. Курсы обучения Предпринимательского Клуба.',
    keywords: 'business courses, entrepreneurship education, online learning, financial university courses, бизнес курсы, обучение предпринимательству'
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    modules: 0,
    duration: "",
    track: "course" as "course" | "program",
  });

  const { data: courses = [], isLoading } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
  });

  const { data: progressMap = {} } = useQuery<Record<string, CourseProgress>>({
    queryKey: ["/api/courses/progress"],
    queryFn: async () => {
      if (!user) return {};
      const result: Record<string, CourseProgress> = {};
      for (const course of courses) {
        try {
          const response = await fetch(`/api/courses/${course.id}/my-progress`);
          if (response.ok) {
            const progress = await response.json();
            if (progress) result[course.id] = progress;
          }
        } catch (error) {
          console.error(`Error fetching progress for course ${course.id}:`, error);
        }
      }
      return result;
    },
    enabled: !!user && courses.length > 0,
  });

  const createCourseMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/courses", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: t("success"),
        description: t("courseCreated"),
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: t("unauthorized"),
          description: t("loginRequired"),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: t("error"),
        description: t("failedToCreateCourse"),
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      modules: 0,
      duration: "",
      track: "course",
    });
    setThumbnailFile(null);
    setThumbnailPreview(null);
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);

    try {
      let thumbnailUrl: string | undefined;

      if (thumbnailFile) {
        const uploadData = new FormData();
        uploadData.append("image", thumbnailFile);
        const uploadRes = await fetch("/api/upload/image", {
          method: "POST",
          body: uploadData,
          credentials: "include",
        });
        if (uploadRes.ok) {
          const result = await uploadRes.json();
          thumbnailUrl = result.url;
        }
      }

      createCourseMutation.mutate({
        ...formData,
        modules: Number(formData.modules),
        ...(thumbnailUrl ? { thumbnailUrl } : {}),
      });
    } catch {
      toast({
        title: t("error"),
        description: t("failedToCreateCourse"),
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const filteredCourses = courses.filter((course) => {
    if (activeTab === "all") return true;
    return course.track === activeTab;
  });

  if (isLoading) {
    return <div>{t("loadingCourses")}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold mb-2">{t("learningCourses")}</h1>
          <p className="text-muted-foreground">
            {isAdmin ? t("coursesSubtitleAdmin") : t("coursesSubtitleMember")}
          </p>
        </div>
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-course">
                <Plus className="h-4 w-4 mr-2" />
                {t("createCourse")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{t("createCourse")}</DialogTitle>
                <DialogDescription>
                  {t("addNewCourseDescription")}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("courseThumbnail")}</Label>
                  <div
                    className="border-2 border-dashed rounded-md p-4 text-center cursor-pointer hover-elevate transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="input-course-thumbnail-area"
                  >
                    {thumbnailPreview ? (
                      <div className="relative aspect-video w-full overflow-hidden rounded-md">
                        <img
                          src={thumbnailPreview}
                          alt="Thumbnail preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 py-4 text-muted-foreground">
                        <ImageIcon className="h-8 w-8" />
                        <span className="text-sm">{t("uploadThumbnail")}</span>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleThumbnailChange}
                      data-testid="input-course-thumbnail"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">{t("courseTitle")}</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    data-testid="input-course-title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">{t("courseDescription")}</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    data-testid="input-course-description"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("selectTrack")}</Label>
                  <Select
                    value={formData.track}
                    onValueChange={(value: "course" | "program") => setFormData({ ...formData, track: value })}
                  >
                    <SelectTrigger data-testid="select-course-track">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="course" data-testid="select-track-course">{t("trackCourse")}</SelectItem>
                      <SelectItem value="program" data-testid="select-track-program">{t("trackProgram")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="modules">{t("numberOfModules")}</Label>
                    <Input
                      id="modules"
                      type="number"
                      value={formData.modules}
                      onChange={(e) => setFormData({ ...formData, modules: parseInt(e.target.value) || 0 })}
                      required
                      data-testid="input-course-modules"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration">{t("estimatedDuration")}</Label>
                    <Input
                      id="duration"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      placeholder={t("estimatedDurationPlaceholder")}
                      required
                      data-testid="input-course-duration"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isUploading || createCourseMutation.isPending}
                  data-testid="button-submit-course"
                >
                  {(isUploading || createCourseMutation.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {t("createCourse")}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="tabs-course-tracks">
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all-tracks">{t("allTracks")}</TabsTrigger>
          <TabsTrigger value="program" data-testid="tab-programs">{t("programs")}</TabsTrigger>
          <TabsTrigger value="course" data-testid="tab-courses">{t("coursesTab")}</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab} className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => {
              const progress = progressMap[course.id];
              return (
                <CourseCard
                  key={course.id}
                  course={{
                    id: course.id,
                    title: course.title,
                    description: course.description,
                    modules: course.modules,
                    duration: course.duration,
                    thumbnailUrl: course.thumbnailUrl,
                    track: course.track,
                    progress: progress?.progress || 0,
                    status: progress?.status as any || "not-started",
                  }}
                  onStart={(id) => navigate(`/courses/${id}`)}
                />
              );
            })}
            {filteredCourses.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                {activeTab === "program" ? t("programs") : activeTab === "course" ? t("coursesTab") : t("allCourses")} — {t("noContentYet")}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
