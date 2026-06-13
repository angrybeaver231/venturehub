import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  ArrowLeft, 
  Play, 
  Clock, 
  BookOpen, 
  Users, 
  CheckCircle2, 
  Lock,
  GraduationCap,
  FileText,
  Video,
  Settings,
  Megaphone,
  MessageSquare,
  Pin,
  Plus,
  Trash2
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Course, CourseModule, CourseLesson, CourseEnrollment, CourseProgress, Announcement, DiscussionForum, DiscussionThread } from "@shared/schema";

interface ThreadWithStats extends DiscussionThread {
  replyCount?: number;
  authorName?: string;
}

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { user, isLmsAdmin: isAdmin } = useAuth();
  const isTeacher = user?.role === "teacher";
  const canManageCourse = isAdmin || isTeacher;
  const [isAnnouncementDialogOpen, setIsAnnouncementDialogOpen] = useState(false);
  const [isThreadDialogOpen, setIsThreadDialogOpen] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({ title: "", content: "", isPinned: false });
  const [threadForm, setThreadForm] = useState({ title: "", content: "" });

  const { data: course, isLoading: courseLoading } = useQuery<Course>({
    queryKey: ['/api/courses', id],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${id}`);
      if (!res.ok) throw new Error("Course not found");
      return res.json();
    },
    enabled: !!id,
  });

  const { data: modules = [] } = useQuery<CourseModule[]>({
    queryKey: ['/api/courses', id, 'modules'],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${id}/modules`);
      return res.json();
    },
    enabled: !!id,
  });

  const { data: lessons = [] } = useQuery<CourseLesson[]>({
    queryKey: ['/api/courses', id, 'lessons'],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${id}/lessons`);
      return res.json();
    },
    enabled: !!id,
  });

  const { data: enrollment } = useQuery<CourseEnrollment | null>({
    queryKey: ['/api/courses', id, 'enrollment'],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${id}/enrollment`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!id && !!user,
  });

  const { data: progress } = useQuery<CourseProgress | null>({
    queryKey: ['/api/courses', id, 'my-progress'],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${id}/my-progress`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!id && !!user,
  });

  const { data: announcements = [] } = useQuery<Announcement[]>({
    queryKey: ['/api/announcements', 'course', id],
    queryFn: async () => {
      const res = await fetch(`/api/announcements?courseId=${id}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id,
  });

  const { data: forum } = useQuery<DiscussionForum | null>({
    queryKey: ['/api/courses', id, 'forum'],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${id}/forum`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!id && !!user,
  });

  const { data: threads = [] } = useQuery<ThreadWithStats[]>({
    queryKey: ['/api/forums', forum?.id, 'threads'],
    queryFn: async () => {
      if (!forum?.id) return [];
      const res = await fetch(`/api/forums/${forum.id}/threads`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!forum?.id,
  });

  const enrollMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/courses/${id}/enroll`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/courses', id, 'enrollment'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/enrollments'] });
      toast({
        title: t("success"),
        description: t("enrolledSuccessfully"),
      });
    },
    onError: () => {
      toast({
        title: t("error"),
        description: t("failedToEnroll"),
        variant: "destructive",
      });
    },
  });

  const unenrollMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/courses/${id}/unenroll`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/courses', id, 'enrollment'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/enrollments'] });
      toast({
        title: t("success"),
        description: t("unenrolledSuccessfully"),
      });
    },
    onError: () => {
      toast({
        title: t("error"),
        description: t("failedToUnenroll"),
        variant: "destructive",
      });
    },
  });

  const createAnnouncementMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; isPinned: boolean }) => {
      return await apiRequest("/api/announcements", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          type: "course",
          courseId: id,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/announcements', 'course', id] });
      setIsAnnouncementDialogOpen(false);
      setAnnouncementForm({ title: "", content: "", isPinned: false });
      toast({
        title: t("success"),
        description: t("announcementCreated"),
      });
    },
    onError: (error: any) => {
      console.error("Announcement creation error:", error);
      if (isUnauthorizedError(error)) {
        toast({
          title: t("unauthorized"),
          description: t("loginRequired"),
          variant: "destructive",
        });
        return;
      }
      // Check for forbidden (permission) error
      if (error?.message?.includes("403") || error?.message?.includes("Forbidden")) {
        toast({
          title: t("error"),
          description: "Permission denied - admin or teacher access required",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: t("error"),
        description: t("failedToCreateAnnouncement"),
        variant: "destructive",
      });
    },
  });

  const createThreadMutation = useMutation({
    mutationFn: async (data: { title: string; content: string }) => {
      if (!forum?.id) throw new Error("No forum");
      return await apiRequest(`/api/forums/${forum.id}/threads`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/forums', forum?.id, 'threads'] });
      setIsThreadDialogOpen(false);
      setThreadForm({ title: "", content: "" });
      toast({
        title: t("success"),
        description: t("threadCreated"),
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: t("unauthorized"),
          description: t("loginRequired"),
          variant: "destructive",
        });
        return;
      }
      toast({
        title: t("error"),
        description: t("failedToCreateThread"),
        variant: "destructive",
      });
    },
  });

  const deleteAnnouncementMutation = useMutation({
    mutationFn: async (announcementId: string) => {
      return await apiRequest(`/api/announcements/${announcementId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/announcements', 'course', id] });
      toast({
        title: t("success"),
        description: t("announcementDeleted"),
      });
    },
    onError: () => {
      toast({
        title: t("error"),
        description: t("failedToDeleteAnnouncement"),
        variant: "destructive",
      });
    },
  });

  if (courseLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">{t("loading")}</div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/courses")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("back")}
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{t("courseNotFound")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isEnrolled = !!enrollment && enrollment.status === 'active';
  const canAccess = isEnrolled || isAdmin || isTeacher;
  const progressPercent = progress?.progress || 0;

  const getLessonsByModule = (moduleId: string) => {
    return lessons.filter(l => l.moduleId === moduleId).sort((a, b) => a.orderIndex - b.orderIndex);
  };

  const getLessonsWithoutModule = () => {
    return lessons.filter(l => !l.moduleId).sort((a, b) => a.orderIndex - b.orderIndex);
  };

  const getLessonIcon = (lessonType: string | null) => {
    switch (lessonType) {
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'text':
        return <FileText className="h-4 w-4" />;
      default:
        return <BookOpen className="h-4 w-4" />;
    }
  };

  const handleLessonClick = (lessonId: string) => {
    if (canAccess) {
      navigate(`/lessons/${lessonId}`);
    }
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate("/courses")} data-testid="button-back">
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t("backToCourses")}
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {course.visibility !== 'published' && (
                      <Badge variant="outline" className="text-yellow-600 border-yellow-500">
                        {course.visibility === 'draft' ? t("draft") : t("archived")}
                      </Badge>
                    )}
                    {course.level && (
                      <Badge variant="secondary">{course.level}</Badge>
                    )}
                  </div>
                  <CardTitle className="text-2xl mb-2" data-testid="text-course-title">
                    {course.title}
                  </CardTitle>
                  <CardDescription className="text-base">
                    {course.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  <span>{modules.length} {t("modules")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>{lessons.length} {t("lessons")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{course.duration}</span>
                </div>
              </div>

              {isEnrolled && (
                <div className="mt-6 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t("yourProgress")}</span>
                    <span className="font-medium">{progressPercent}%</span>
                  </div>
                  <Progress value={progressPercent} />
                </div>
              )}
            </CardContent>
          </Card>

          <Tabs defaultValue="content">
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="content" data-testid="tab-content">
                {t("courseContent")}
              </TabsTrigger>
              <TabsTrigger value="announcements" data-testid="tab-announcements">
                <Megaphone className="h-4 w-4 mr-1" />
                {t("announcements")}
              </TabsTrigger>
              {canAccess && (
                <TabsTrigger value="discussions" data-testid="tab-discussions">
                  <MessageSquare className="h-4 w-4 mr-1" />
                  {t("discussions")}
                </TabsTrigger>
              )}
              {canManageCourse && (
                <TabsTrigger value="manage" data-testid="tab-manage">
                  {t("manage")}
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="content" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t("courseContent")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {modules.length === 0 && lessons.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      {t("noContentYet")}
                    </p>
                  ) : (
                    <Accordion type="multiple" className="w-full">
                      {modules.map((module, moduleIndex) => (
                        <AccordionItem key={module.id} value={module.id}>
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-3">
                              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium">
                                {moduleIndex + 1}
                              </span>
                              <span>{module.title}</span>
                              <Badge variant="outline" className="ml-2">
                                {getLessonsByModule(module.id).length} {t("lessons")}
                              </Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            {module.description && (
                              <p className="text-sm text-muted-foreground mb-4 pl-9">
                                {module.description}
                              </p>
                            )}
                            <div className="space-y-2 pl-9">
                              {getLessonsByModule(module.id).map((lesson, lessonIndex) => (
                                <div
                                  key={lesson.id}
                                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                                    canAccess 
                                      ? 'hover:bg-muted cursor-pointer hover-elevate' 
                                      : 'opacity-60'
                                  }`}
                                  onClick={() => handleLessonClick(lesson.id)}
                                  data-testid={`lesson-${lesson.id}`}
                                >
                                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-sm">
                                    {lessonIndex + 1}
                                  </div>
                                  {getLessonIcon(lesson.lessonType)}
                                  <span className="flex-1">{lesson.title}</span>
                                  {lesson.durationMinutes && (
                                    <span className="text-sm text-muted-foreground">
                                      {lesson.durationMinutes} {t("min")}
                                    </span>
                                  )}
                                  {!canAccess && <Lock className="h-4 w-4 text-muted-foreground" />}
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}

                      {getLessonsWithoutModule().length > 0 && (
                        <AccordionItem value="standalone">
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-3">
                              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium">
                                <FileText className="h-3 w-3" />
                              </span>
                              <span>{t("additionalLessons")}</span>
                              <Badge variant="outline" className="ml-2">
                                {getLessonsWithoutModule().length} {t("lessons")}
                              </Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-2 pl-9">
                              {getLessonsWithoutModule().map((lesson, lessonIndex) => (
                                <div
                                  key={lesson.id}
                                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                                    canAccess 
                                      ? 'hover:bg-muted cursor-pointer hover-elevate' 
                                      : 'opacity-60'
                                  }`}
                                  onClick={() => handleLessonClick(lesson.id)}
                                  data-testid={`lesson-${lesson.id}`}
                                >
                                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-sm">
                                    {lessonIndex + 1}
                                  </div>
                                  {getLessonIcon(lesson.lessonType)}
                                  <span className="flex-1">{lesson.title}</span>
                                  {lesson.durationMinutes && (
                                    <span className="text-sm text-muted-foreground">
                                      {lesson.durationMinutes} {t("min")}
                                    </span>
                                  )}
                                  {!canAccess && <Lock className="h-4 w-4 text-muted-foreground" />}
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )}
                    </Accordion>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="announcements" className="mt-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Megaphone className="h-5 w-5" />
                      {t("announcements")}
                    </CardTitle>
                    {isAdmin && (
                      <Dialog open={isAnnouncementDialogOpen} onOpenChange={setIsAnnouncementDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" data-testid="button-create-announcement">
                            <Plus className="h-4 w-4 mr-1" />
                            {t("createAnnouncement")}
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{t("createAnnouncement")}</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={(e) => {
                            e.preventDefault();
                            createAnnouncementMutation.mutate(announcementForm);
                          }} className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="announcement-title">{t("announcementTitle")}</Label>
                              <Input
                                id="announcement-title"
                                value={announcementForm.title}
                                onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                                required
                                data-testid="input-announcement-title"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="announcement-content">{t("announcementContent")}</Label>
                              <Textarea
                                id="announcement-content"
                                value={announcementForm.content}
                                onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
                                required
                                rows={4}
                                data-testid="input-announcement-content"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id="announcement-pinned"
                                checked={announcementForm.isPinned}
                                onChange={(e) => setAnnouncementForm({ ...announcementForm, isPinned: e.target.checked })}
                                className="rounded border-gray-300"
                                data-testid="checkbox-announcement-pinned"
                              />
                              <Label htmlFor="announcement-pinned">{t("pinned")}</Label>
                            </div>
                            <Button type="submit" disabled={createAnnouncementMutation.isPending} data-testid="button-submit-announcement">
                              {t("create")}
                            </Button>
                          </form>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {announcements.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      {t("noAnnouncements")}
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {announcements.map((announcement) => (
                        <div key={announcement.id} className="border rounded-lg p-4" data-testid={`announcement-${announcement.id}`}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                {announcement.isPinned && (
                                  <Pin className="h-4 w-4 text-primary" />
                                )}
                                <h4 className="font-medium">{announcement.title}</h4>
                              </div>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {announcement.content}
                              </p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {new Date(announcement.createdAt!).toLocaleDateString()}
                              </p>
                            </div>
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteAnnouncementMutation.mutate(announcement.id)}
                                disabled={deleteAnnouncementMutation.isPending}
                                data-testid={`button-delete-announcement-${announcement.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {canAccess && (
              <TabsContent value="discussions" className="mt-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        {t("discussions")}
                      </CardTitle>
                      {forum && (
                        <Dialog open={isThreadDialogOpen} onOpenChange={setIsThreadDialogOpen}>
                          <DialogTrigger asChild>
                            <Button size="sm" data-testid="button-create-thread">
                              <Plus className="h-4 w-4 mr-1" />
                              {t("createThread")}
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>{t("createThread")}</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={(e) => {
                              e.preventDefault();
                              createThreadMutation.mutate(threadForm);
                            }} className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="thread-title">{t("threadTitle")}</Label>
                                <Input
                                  id="thread-title"
                                  value={threadForm.title}
                                  onChange={(e) => setThreadForm({ ...threadForm, title: e.target.value })}
                                  required
                                  data-testid="input-thread-title"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="thread-content">{t("threadContent")}</Label>
                                <Textarea
                                  id="thread-content"
                                  value={threadForm.content}
                                  onChange={(e) => setThreadForm({ ...threadForm, content: e.target.value })}
                                  required
                                  rows={4}
                                  data-testid="input-thread-content"
                                />
                              </div>
                              <Button type="submit" disabled={createThreadMutation.isPending} data-testid="button-submit-thread">
                                {t("create")}
                              </Button>
                            </form>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {!forum ? (
                      <p className="text-muted-foreground text-center py-8">
                        {t("noThreads")}
                      </p>
                    ) : threads.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        {t("noThreads")}
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {threads.map((thread) => (
                          <div 
                            key={thread.id} 
                            className="border rounded-lg p-4 hover-elevate cursor-pointer"
                            onClick={() => navigate(`/threads/${thread.id}`)}
                            data-testid={`thread-${thread.id}`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  {thread.isPinned && (
                                    <Pin className="h-4 w-4 text-primary" />
                                  )}
                                  {thread.isLocked && (
                                    <Lock className="h-4 w-4 text-muted-foreground" />
                                  )}
                                  <h4 className="font-medium">{thread.title}</h4>
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {thread.content}
                                </p>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                                  <span>{thread.authorName || "User"}</span>
                                  <span>{thread.viewCount || 0} {t("views")}</span>
                                  <span>{thread.replyCount || 0} {t("replies")}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {canManageCourse && (
              <TabsContent value="manage" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      {t("courseManagement")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isAdmin && (
                      <Button 
                        onClick={() => navigate(`/courses/${id}/edit`)}
                        data-testid="button-edit-course"
                      >
                        {t("editCourse")}
                      </Button>
                    )}
                    <Button 
                      variant="outline"
                      onClick={() => navigate(`/courses/${id}/gradebook`)}
                      data-testid="button-gradebook"
                    >
                      <GraduationCap className="h-4 w-4 mr-2" />
                      {t("gradebook")}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("enrollment")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!user ? (
                <div className="text-center space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {t("loginToEnroll")}
                  </p>
                  <Button 
                    className="w-full" 
                    onClick={() => navigate("/login")}
                    data-testid="button-login-to-enroll"
                  >
                    {t("login")}
                  </Button>
                </div>
              ) : isEnrolled ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">{t("enrolled")}</span>
                  </div>
                  {lessons.length > 0 && (
                    <Button 
                      className="w-full" 
                      onClick={() => handleLessonClick(lessons[0].id)}
                      data-testid="button-continue-learning"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      {progressPercent > 0 ? t("continueLearning") : t("startLearning")}
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => unenrollMutation.mutate()}
                    disabled={unenrollMutation.isPending}
                    data-testid="button-unenroll"
                  >
                    {t("unenroll")}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {course.visibility !== 'published' && !isAdmin ? (
                    <p className="text-sm text-muted-foreground text-center">
                      {t("courseNotAvailable")}
                    </p>
                  ) : (
                    <Button 
                      className="w-full"
                      onClick={() => enrollMutation.mutate()}
                      disabled={enrollMutation.isPending}
                      data-testid="button-enroll"
                    >
                      <GraduationCap className="h-4 w-4 mr-2" />
                      {t("enrollNow")}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("courseInfo")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("totalLessons")}</span>
                <span className="font-medium">{lessons.length}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("duration")}</span>
                <span className="font-medium">{course.duration}</span>
              </div>
              {course.level && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t("level")}</span>
                    <span className="font-medium capitalize">{course.level}</span>
                  </div>
                </>
              )}
              {course.category && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t("category")}</span>
                    <span className="font-medium">{course.category}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
