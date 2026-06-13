import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  ArrowLeft, 
  Plus, 
  Edit2,
  Trash2,
  GripVertical,
  Save,
  Video,
  FileText,
  BookOpen,
  Upload,
  Loader2,
  ClipboardCheck,
  Calendar
} from "lucide-react";
import type { Course, CourseModule, CourseLesson, CourseTask } from "@shared/schema";

export default function CourseEdit() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { isTeacherOrAdmin, isLoading: authLoading } = useAuth();

  const [editingModule, setEditingModule] = useState<CourseModule | null>(null);
  const [editingLesson, setEditingLesson] = useState<CourseLesson | null>(null);
  const [newModuleOpen, setNewModuleOpen] = useState(false);
  const [newLessonOpen, setNewLessonOpen] = useState(false);
  const [selectedModuleForLesson, setSelectedModuleForLesson] = useState<string | null>(null);

  const [moduleForm, setModuleForm] = useState({
    title: "",
    description: "",
  });

  const [lessonForm, setLessonForm] = useState({
    title: "",
    description: "",
    lessonType: "text" as "video" | "text",
    content: "",
    videoUrl: "",
    durationMinutes: 0,
  });

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoInputType, setVideoInputType] = useState<"url" | "upload">("url");
  const videoInputRef = useRef<HTMLInputElement>(null);
  
  const [newAssignmentOpen, setNewAssignmentOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<CourseTask | null>(null);
  const [assignmentForm, setAssignmentForm] = useState({
    title: "",
    description: "",
    taskType: "assignment" as "assignment" | "quiz",
    points: 100,
    dueAt: "",
    moduleId: null as string | null,
  });

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

  const { data: tasks = [] } = useQuery<CourseTask[]>({
    queryKey: ['/api/courses', id, 'tasks'],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${id}/tasks`);
      return res.json();
    },
    enabled: !!id,
  });

  const createModuleMutation = useMutation({
    mutationFn: async (data: { title: string; description: string }) => {
      return await apiRequest(`/api/courses/${id}/modules`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/courses', id, 'modules'] });
      setNewModuleOpen(false);
      setModuleForm({ title: "", description: "" });
      toast({
        title: t("success"),
        description: t("moduleCreated"),
      });
    },
    onError: () => {
      toast({
        title: t("error"),
        description: t("failedToCreateModule"),
        variant: "destructive",
      });
    },
  });

  const updateModuleMutation = useMutation({
    mutationFn: async ({ moduleId, data }: { moduleId: string; data: { title: string; description: string } }) => {
      return await apiRequest(`/api/modules/${moduleId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/courses', id, 'modules'] });
      setEditingModule(null);
      toast({
        title: t("success"),
        description: t("moduleUpdated"),
      });
    },
    onError: () => {
      toast({
        title: t("error"),
        description: t("failedToUpdateModule"),
        variant: "destructive",
      });
    },
  });

  const deleteModuleMutation = useMutation({
    mutationFn: async (moduleId: string) => {
      return await apiRequest(`/api/modules/${moduleId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/courses', id, 'modules'] });
      queryClient.invalidateQueries({ queryKey: ['/api/courses', id, 'lessons'] });
      toast({
        title: t("success"),
        description: t("moduleDeleted"),
      });
    },
    onError: () => {
      toast({
        title: t("error"),
        description: t("failedToDeleteModule"),
        variant: "destructive",
      });
    },
  });

  const createLessonMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/courses/${id}/lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      if (!res.ok) throw new Error("Failed to create lesson");
      return res.json();
    },
    onSuccess: async (lesson) => {
      // If there's a video file to upload, do it now
      if (videoFile && lesson.id) {
        uploadVideoMutation.mutate({ lessonId: lesson.id, file: videoFile });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/courses', id, 'lessons'] });
      setNewLessonOpen(false);
      setSelectedModuleForLesson(null);
      setLessonForm({
        title: "",
        description: "",
        lessonType: "text",
        content: "",
        videoUrl: "",
        durationMinutes: 0,
      });
      setVideoFile(null);
      setVideoInputType("url");
      toast({
        title: t("success"),
        description: t("lessonCreated"),
      });
    },
    onError: () => {
      toast({
        title: t("error"),
        description: t("failedToCreateLesson"),
        variant: "destructive",
      });
    },
  });

  const updateLessonMutation = useMutation({
    mutationFn: async ({ lessonId, data }: { lessonId: string; data: any }) => {
      return await apiRequest(`/api/lessons/${lessonId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/courses', id, 'lessons'] });
      setEditingLesson(null);
      toast({
        title: t("success"),
        description: t("lessonUpdated"),
      });
    },
    onError: () => {
      toast({
        title: t("error"),
        description: t("failedToUpdateLesson"),
        variant: "destructive",
      });
    },
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      return await apiRequest(`/api/lessons/${lessonId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/courses', id, 'lessons'] });
      toast({
        title: t("success"),
        description: t("lessonDeleted"),
      });
    },
    onError: () => {
      toast({
        title: t("error"),
        description: t("failedToDeleteLesson"),
        variant: "destructive",
      });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest(`/api/courses/${id}/tasks`, {
        method: "POST",
        body: JSON.stringify({
          ...data,
          orderIndex: tasks.length,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/courses', id, 'tasks'] });
      setNewAssignmentOpen(false);
      setAssignmentForm({ title: "", description: "", taskType: "assignment", points: 100, dueAt: "", moduleId: null });
      toast({
        title: t("success"),
        description: t("assignmentCreated"),
      });
    },
    onError: () => {
      toast({
        title: t("error"),
        description: t("failedToCreateAssignment"),
        variant: "destructive",
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string; data: any }) => {
      return await apiRequest(`/api/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/courses', id, 'tasks'] });
      setEditingAssignment(null);
      toast({
        title: t("success"),
        description: t("assignmentUpdated"),
      });
    },
    onError: () => {
      toast({
        title: t("error"),
        description: t("failedToUpdateAssignment"),
        variant: "destructive",
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return await apiRequest(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/courses', id, 'tasks'] });
      toast({
        title: t("success"),
        description: t("assignmentDeleted"),
      });
    },
    onError: () => {
      toast({
        title: t("error"),
        description: t("failedToDeleteAssignment"),
        variant: "destructive",
      });
    },
  });

  const uploadVideoMutation = useMutation({
    mutationFn: async ({ lessonId, file }: { lessonId: string; file: File }) => {
      const formData = new FormData();
      formData.append('video', file);
      const res = await fetch(`/api/lessons/${lessonId}/upload-video`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Upload failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/courses', id, 'lessons'] });
      toast({
        title: t("success"),
        description: t("videoUploaded"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("error"),
        description: error.message || t("failedToUploadVideo"),
        variant: "destructive",
      });
    },
  });

  // Wait for auth to load before checking permissions
  if (authLoading || courseLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">{t("loading")}</div>
      </div>
    );
  }

  if (!isTeacherOrAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">{t("adminRequired")}</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/courses")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("backToCourses")}
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{t("courseNotFound")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getLessonsByModule = (moduleId: string) => {
    return lessons.filter(l => l.moduleId === moduleId).sort((a, b) => a.orderIndex - b.orderIndex);
  };

  const handleCreateModule = (e: React.FormEvent) => {
    e.preventDefault();
    createModuleMutation.mutate(moduleForm);
  };

  const handleCreateLesson = (e: React.FormEvent) => {
    e.preventDefault();
    // Calculate next orderIndex based on existing lessons in the module or course
    const relevantLessons = selectedModuleForLesson 
      ? lessons.filter(l => l.moduleId === selectedModuleForLesson)
      : lessons.filter(l => !l.moduleId);
    const nextOrderIndex = relevantLessons.length > 0 
      ? Math.max(...relevantLessons.map(l => l.orderIndex)) + 1 
      : 0;
    
    createLessonMutation.mutate({
      ...lessonForm,
      moduleId: selectedModuleForLesson,
      orderIndex: nextOrderIndex,
    });
  };

  const handleOpenEditLesson = (lesson: CourseLesson) => {
    setEditingLesson(lesson);
    setLessonForm({
      title: lesson.title,
      description: lesson.description || "",
      lessonType: (lesson.lessonType as "video" | "text") || "text",
      content: lesson.content || "",
      videoUrl: lesson.videoUrl || "",
      durationMinutes: lesson.durationMinutes || 0,
    });
  };

  const handleUpdateLesson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLesson) return;
    updateLessonMutation.mutate({
      lessonId: editingLesson.id,
      data: lessonForm,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(`/courses/${id}`)} data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("backToCourse")}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{t("editingCourse")}: {course.title}</CardTitle>
          <CardDescription>{t("manageCourseContent")}</CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="modules">
        <TabsList>
          <TabsTrigger value="modules" data-testid="tab-modules">
            {t("modules")}
          </TabsTrigger>
          <TabsTrigger value="lessons" data-testid="tab-lessons">
            {t("allLessons")}
          </TabsTrigger>
          <TabsTrigger value="assignments" data-testid="tab-assignments">
            {t("assignments")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="modules" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">{t("courseModules")}</h3>
            <Dialog open={newModuleOpen} onOpenChange={setNewModuleOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-module">
                  <Plus className="h-4 w-4 mr-2" />
                  {t("addModule")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("addNewModule")}</DialogTitle>
                  <DialogDescription>{t("createModuleDescription")}</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateModule} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="module-title">{t("moduleTitle")}</Label>
                    <Input
                      id="module-title"
                      value={moduleForm.title}
                      onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
                      required
                      data-testid="input-module-title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="module-description">{t("moduleDescription")}</Label>
                    <Textarea
                      id="module-description"
                      value={moduleForm.description}
                      onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
                      data-testid="input-module-description"
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createModuleMutation.isPending} data-testid="button-submit-module">
                      {t("createModule")}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {modules.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">{t("noModulesYet")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {modules.sort((a, b) => a.orderIndex - b.orderIndex).map((module, index) => (
                <Card key={module.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{module.title}</CardTitle>
                          {module.description && (
                            <CardDescription className="mt-1">{module.description}</CardDescription>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditingModule(module);
                            setModuleForm({ title: module.title, description: module.description || "" });
                          }}
                          data-testid={`button-edit-module-${module.id}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            if (confirm(t("confirmDeleteModule"))) {
                              deleteModuleMutation.mutate(module.id);
                            }
                          }}
                          data-testid={`button-delete-module-${module.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {getLessonsByModule(module.id).length} {t("lessons")}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedModuleForLesson(module.id);
                            setNewLessonOpen(true);
                          }}
                          data-testid={`button-add-lesson-${module.id}`}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          {t("addLesson")}
                        </Button>
                      </div>
                      {getLessonsByModule(module.id).map((lesson, lessonIndex) => (
                        <div
                          key={lesson.id}
                          className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                        >
                          <span className="text-sm text-muted-foreground w-6">{lessonIndex + 1}.</span>
                          {lesson.lessonType === 'video' ? (
                            <Video className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="flex-1">{lesson.title}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleOpenEditLesson(lesson)}
                            data-testid={`button-edit-lesson-${lesson.id}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              if (confirm(t("confirmDeleteLesson"))) {
                                deleteLessonMutation.mutate(lesson.id);
                              }
                            }}
                            data-testid={`button-delete-lesson-${lesson.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="lessons" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">{t("allCourseLessons")}</h3>
            <Button
              onClick={() => {
                setSelectedModuleForLesson(null);
                setNewLessonOpen(true);
              }}
              data-testid="button-add-lesson-general"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t("addLesson")}
            </Button>
          </div>

          {lessons.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">{t("noLessonsYet")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {lessons.sort((a, b) => a.orderIndex - b.orderIndex).map((lesson, index) => (
                <Card key={lesson.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground w-8">{index + 1}.</span>
                      {lesson.lessonType === 'video' ? (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Video className="h-3 w-3" />
                          {t("videoLesson")}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {t("textLesson")}
                        </Badge>
                      )}
                      <span className="flex-1 font-medium">{lesson.title}</span>
                      {lesson.durationMinutes && (
                        <span className="text-sm text-muted-foreground">
                          {lesson.durationMinutes} {t("min")}
                        </span>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleOpenEditLesson(lesson)}
                        data-testid={`button-edit-lesson-all-${lesson.id}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(t("confirmDeleteLesson"))) {
                            deleteLessonMutation.mutate(lesson.id);
                          }
                        }}
                        data-testid={`button-delete-lesson-all-${lesson.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="assignments" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">{t("courseAssignments")}</h3>
            <Button onClick={() => setNewAssignmentOpen(true)} data-testid="button-add-assignment">
              <Plus className="h-4 w-4 mr-2" />
              {t("addAssignment")}
            </Button>
          </div>

          {tasks.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">{t("noAssignmentsYet")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {tasks.sort((a, b) => a.orderIndex - b.orderIndex).map((task, index) => (
                <Card key={task.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground w-8">{index + 1}.</span>
                      <Badge variant={task.taskType === 'quiz' ? 'secondary' : 'outline'} className="flex items-center gap-1">
                        <ClipboardCheck className="h-3 w-3" />
                        {task.taskType === 'quiz' ? t("quiz") : t("assignment")}
                      </Badge>
                      <span className="flex-1 font-medium">{task.title}</span>
                      <Badge variant="outline">{task.points} {t("assignmentPoints")}</Badge>
                      {task.dueAt && (
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(task.dueAt).toLocaleDateString()}
                        </span>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditingAssignment(task);
                          setAssignmentForm({
                            title: task.title,
                            description: task.description,
                            taskType: task.taskType as "assignment" | "quiz",
                            points: task.points,
                            dueAt: task.dueAt ? new Date(task.dueAt).toISOString().split('T')[0] : "",
                            moduleId: task.moduleId || null,
                          });
                        }}
                        data-testid={`button-edit-assignment-${task.id}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(t("confirmDeleteAssignment"))) {
                            deleteTaskMutation.mutate(task.id);
                          }
                        }}
                        data-testid={`button-delete-assignment-${task.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={newAssignmentOpen} onOpenChange={setNewAssignmentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("addNewAssignment")}</DialogTitle>
            <DialogDescription>{t("createAssignmentDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("title")}</Label>
              <Input
                value={assignmentForm.title}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                data-testid="input-assignment-title"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("description")}</Label>
              <Textarea
                value={assignmentForm.description}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, description: e.target.value })}
                rows={4}
                data-testid="input-assignment-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("assignmentType")}</Label>
                <Select
                  value={assignmentForm.taskType}
                  onValueChange={(v: "assignment" | "quiz") => setAssignmentForm({ ...assignmentForm, taskType: v })}
                >
                  <SelectTrigger data-testid="select-assignment-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="assignment">{t("assignment")}</SelectItem>
                    <SelectItem value="quiz">{t("quiz")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("assignmentPoints")}</Label>
                <Input
                  type="number"
                  value={assignmentForm.points}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, points: parseInt(e.target.value) || 0 })}
                  data-testid="input-assignment-points"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("dueDate")}</Label>
              <Input
                type="date"
                value={assignmentForm.dueAt}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, dueAt: e.target.value })}
                data-testid="input-assignment-due-date"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewAssignmentOpen(false)}>
                {t("cancel")}
              </Button>
              <Button
                onClick={() => createTaskMutation.mutate({
                  title: assignmentForm.title,
                  description: assignmentForm.description,
                  taskType: assignmentForm.taskType,
                  points: assignmentForm.points,
                  dueAt: assignmentForm.dueAt ? new Date(assignmentForm.dueAt) : null,
                  moduleId: assignmentForm.moduleId,
                })}
                disabled={!assignmentForm.title.trim() || !assignmentForm.description.trim() || createTaskMutation.isPending}
                data-testid="button-create-assignment"
              >
                {createTaskMutation.isPending ? t("creating") : t("create")}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingAssignment} onOpenChange={(open) => !open && setEditingAssignment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("editAssignment")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("title")}</Label>
              <Input
                value={assignmentForm.title}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                data-testid="input-edit-assignment-title"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("description")}</Label>
              <Textarea
                value={assignmentForm.description}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, description: e.target.value })}
                rows={4}
                data-testid="input-edit-assignment-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("assignmentPoints")}</Label>
                <Input
                  type="number"
                  value={assignmentForm.points}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, points: parseInt(e.target.value) || 0 })}
                  data-testid="input-edit-assignment-points"
                />
              </div>
              <div className="space-y-2">
                <Label>{t("dueDate")}</Label>
                <Input
                  type="date"
                  value={assignmentForm.dueAt}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, dueAt: e.target.value })}
                  data-testid="input-edit-assignment-due-date"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingAssignment(null)}>
                {t("cancel")}
              </Button>
              <Button
                onClick={() => {
                  if (editingAssignment) {
                    updateTaskMutation.mutate({
                      taskId: editingAssignment.id,
                      data: {
                        title: assignmentForm.title,
                        description: assignmentForm.description,
                        points: assignmentForm.points,
                        dueAt: assignmentForm.dueAt ? new Date(assignmentForm.dueAt) : null,
                        moduleId: assignmentForm.moduleId,
                      }
                    });
                  }
                }}
                disabled={!assignmentForm.title.trim() || updateTaskMutation.isPending}
                data-testid="button-update-assignment"
              >
                {updateTaskMutation.isPending ? t("saving") : t("save")}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={newLessonOpen} onOpenChange={setNewLessonOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("addNewLesson")}</DialogTitle>
            <DialogDescription>{t("createLessonDescription")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateLesson} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lesson-title">{t("lessonTitle")}</Label>
                <Input
                  id="lesson-title"
                  value={lessonForm.title}
                  onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                  required
                  data-testid="input-lesson-title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lesson-type">{t("lessonType")}</Label>
                <Select
                  value={lessonForm.lessonType}
                  onValueChange={(v: "video" | "text") => setLessonForm({ ...lessonForm, lessonType: v })}
                >
                  <SelectTrigger data-testid="select-lesson-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">{t("textLesson")}</SelectItem>
                    <SelectItem value="video">{t("videoLesson")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lesson-description">{t("lessonDescription")}</Label>
              <Textarea
                id="lesson-description"
                value={lessonForm.description}
                onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                data-testid="input-lesson-description"
              />
            </div>
            {lessonForm.lessonType === 'video' && (
              <div className="space-y-4">
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant={videoInputType === "url" ? "default" : "outline"}
                    onClick={() => {
                      setVideoInputType("url");
                      setVideoFile(null);
                    }}
                    data-testid="button-video-url"
                  >
                    {t("videoUrl")}
                  </Button>
                  <Button
                    type="button"
                    variant={videoInputType === "upload" ? "default" : "outline"}
                    onClick={() => {
                      setVideoInputType("upload");
                      setLessonForm({ ...lessonForm, videoUrl: "" });
                    }}
                    data-testid="button-video-upload"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {t("uploadVideo")}
                  </Button>
                </div>
                
                {videoInputType === "url" ? (
                  <div className="space-y-2">
                    <Label htmlFor="lesson-video-url">{t("videoUrl")}</Label>
                    <Input
                      id="lesson-video-url"
                      type="url"
                      value={lessonForm.videoUrl}
                      onChange={(e) => setLessonForm({ ...lessonForm, videoUrl: e.target.value })}
                      placeholder="https://rutube.ru/video/... or https://youtube.com/..."
                      data-testid="input-lesson-video-url"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>{t("uploadVideoFile")}</Label>
                    <div className="border-2 border-dashed rounded-lg p-6 text-center">
                      <input
                        ref={videoInputRef}
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setVideoFile(file);
                        }}
                        data-testid="input-video-file"
                      />
                      {videoFile ? (
                        <div className="space-y-2">
                          <Video className="h-8 w-8 mx-auto text-primary" />
                          <p className="font-medium">{videoFile.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setVideoFile(null)}
                          >
                            {t("removeVideo")}
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                          <p className="text-muted-foreground">{t("dragOrClickToUpload")}</p>
                          <p className="text-sm text-muted-foreground">{t("supportedFormats")}: MP4, WebM, MOV (max 500MB)</p>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => videoInputRef.current?.click()}
                          >
                            {t("selectFile")}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="lesson-content">{t("lessonContent")}</Label>
              <Textarea
                id="lesson-content"
                value={lessonForm.content}
                onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })}
                rows={6}
                data-testid="input-lesson-content"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lesson-duration">{t("durationMinutes")}</Label>
              <Input
                id="lesson-duration"
                type="number"
                value={lessonForm.durationMinutes}
                onChange={(e) => setLessonForm({ ...lessonForm, durationMinutes: parseInt(e.target.value) || 0 })}
                min={0}
                data-testid="input-lesson-duration"
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createLessonMutation.isPending} data-testid="button-submit-lesson">
                {t("createLesson")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingLesson} onOpenChange={(open) => !open && setEditingLesson(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("editLesson")}</DialogTitle>
            <DialogDescription>{t("updateLessonDetails")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateLesson} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-lesson-title">{t("lessonTitle")}</Label>
                <Input
                  id="edit-lesson-title"
                  value={lessonForm.title}
                  onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                  required
                  data-testid="input-edit-lesson-title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lesson-type">{t("lessonType")}</Label>
                <Select
                  value={lessonForm.lessonType}
                  onValueChange={(v: "video" | "text") => setLessonForm({ ...lessonForm, lessonType: v })}
                >
                  <SelectTrigger data-testid="select-edit-lesson-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">{t("textLesson")}</SelectItem>
                    <SelectItem value="video">{t("videoLesson")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-lesson-description">{t("lessonDescription")}</Label>
              <Textarea
                id="edit-lesson-description"
                value={lessonForm.description}
                onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                data-testid="input-edit-lesson-description"
              />
            </div>
            {lessonForm.lessonType === 'video' && (
              <div className="space-y-2">
                <Label htmlFor="edit-lesson-video-url">{t("videoUrl")}</Label>
                <Input
                  id="edit-lesson-video-url"
                  type="url"
                  value={lessonForm.videoUrl}
                  onChange={(e) => setLessonForm({ ...lessonForm, videoUrl: e.target.value })}
                  placeholder="https://rutube.ru/video/..."
                  data-testid="input-edit-lesson-video-url"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="edit-lesson-content">{t("lessonContent")}</Label>
              <Textarea
                id="edit-lesson-content"
                value={lessonForm.content}
                onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })}
                rows={6}
                data-testid="input-edit-lesson-content"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-lesson-duration">{t("durationMinutes")}</Label>
              <Input
                id="edit-lesson-duration"
                type="number"
                value={lessonForm.durationMinutes}
                onChange={(e) => setLessonForm({ ...lessonForm, durationMinutes: parseInt(e.target.value) || 0 })}
                min={0}
                data-testid="input-edit-lesson-duration"
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={updateLessonMutation.isPending} data-testid="button-update-lesson">
                <Save className="h-4 w-4 mr-2" />
                {t("saveChanges")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingModule} onOpenChange={(open) => !open && setEditingModule(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("editModule")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!editingModule) return;
            updateModuleMutation.mutate({
              moduleId: editingModule.id,
              data: moduleForm,
            });
          }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-module-title">{t("moduleTitle")}</Label>
              <Input
                id="edit-module-title"
                value={moduleForm.title}
                onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
                required
                data-testid="input-edit-module-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-module-description">{t("moduleDescription")}</Label>
              <Textarea
                id="edit-module-description"
                value={moduleForm.description}
                onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
                data-testid="input-edit-module-description"
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={updateModuleMutation.isPending} data-testid="button-update-module">
                <Save className="h-4 w-4 mr-2" />
                {t("saveChanges")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
