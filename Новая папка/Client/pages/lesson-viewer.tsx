import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  ArrowLeft, 
  ArrowRight,
  Play, 
  Clock, 
  BookOpen, 
  CheckCircle2, 
  Circle,
  FileText,
  Video,
  Download,
  ExternalLink,
  MessageCircle,
  Send
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Course, CourseModule, CourseLesson, CourseLessonProgress, CourseMaterial, LessonComment } from "@shared/schema";

interface CommentWithAuthor extends LessonComment {
  authorFirstName?: string | null;
  authorLastName?: string | null;
  authorRole?: string | null;
}

export default function LessonViewer() {
  const { id: lessonId } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [commentText, setCommentText] = useState("");

  const { data: lesson, isLoading: lessonLoading } = useQuery<CourseLesson>({
    queryKey: ['/api/lessons', lessonId],
    queryFn: async () => {
      const res = await fetch(`/api/lessons/${lessonId}`);
      if (!res.ok) throw new Error("Lesson not found");
      return res.json();
    },
    enabled: !!lessonId,
  });

  const { data: course } = useQuery<Course>({
    queryKey: ['/api/courses', lesson?.courseId],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${lesson?.courseId}`);
      return res.json();
    },
    enabled: !!lesson?.courseId,
  });

  const { data: allLessons = [] } = useQuery<CourseLesson[]>({
    queryKey: ['/api/courses', lesson?.courseId, 'lessons'],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${lesson?.courseId}/lessons`);
      return res.json();
    },
    enabled: !!lesson?.courseId,
  });

  const { data: materials = [] } = useQuery<CourseMaterial[]>({
    queryKey: ['/api/lessons', lessonId, 'materials'],
    queryFn: async () => {
      const res = await fetch(`/api/lessons/${lessonId}/materials`);
      return res.json();
    },
    enabled: !!lessonId,
  });

  const { data: lessonProgress } = useQuery<CourseLessonProgress | null>({
    queryKey: ['/api/lessons', lessonId, 'progress'],
    queryFn: async () => {
      const res = await fetch(`/api/lessons/${lessonId}/progress`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!lessonId && !!user,
  });

  const { data: comments = [] } = useQuery<CommentWithAuthor[]>({
    queryKey: ['/api/lessons', lessonId, 'comments'],
    queryFn: async () => {
      const res = await fetch(`/api/lessons/${lessonId}/comments`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!lessonId && !!user,
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest(`/api/lessons/${lessonId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lessons', lessonId, 'comments'] });
      setCommentText("");
      toast({
        title: t("success"),
        description: t("commentPosted"),
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
        description: t("failedToPostComment"),
        variant: "destructive",
      });
    },
  });

  const markCompleteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/lessons/${lessonId}/complete`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lessons', lessonId, 'progress'] });
      queryClient.invalidateQueries({ queryKey: ['/api/courses', lesson?.courseId, 'my-progress'] });
      toast({
        title: t("success"),
        description: t("lessonMarkedComplete"),
      });
    },
    onError: () => {
      toast({
        title: t("error"),
        description: t("failedToMarkComplete"),
        variant: "destructive",
      });
    },
  });

  if (lessonLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">{t("loading")}</div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/courses")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("back")}
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{t("lessonNotFound")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sortedLessons = [...allLessons].sort((a, b) => a.orderIndex - b.orderIndex);
  const currentIndex = sortedLessons.findIndex(l => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? sortedLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < sortedLessons.length - 1 ? sortedLessons[currentIndex + 1] : null;
  const isCompleted = lessonProgress?.completed || false;

  const renderVideoPlayer = () => {
    if (!lesson.videoUrl) return null;

    const isRuTube = lesson.videoUrl.includes('rutube.ru');
    const isYoutube = lesson.videoUrl.includes('youtube.com') || lesson.videoUrl.includes('youtu.be');

    if (isRuTube) {
      let embedUrl = lesson.videoUrl;
      if (!lesson.videoUrl.includes('/play/embed/')) {
        const videoMatch = lesson.videoUrl.match(/\/video\/([a-zA-Z0-9_-]+)/i);
        if (videoMatch && videoMatch[1]) {
          embedUrl = `https://rutube.ru/play/embed/${videoMatch[1]}`;
        }
      }
      return (
        <div className="aspect-video rounded-lg overflow-hidden bg-black">
          <iframe
            src={embedUrl}
            className="w-full h-full"
            frameBorder="0"
            allow="clipboard-write; autoplay"
            allowFullScreen
          />
        </div>
      );
    }

    if (isYoutube) {
      let videoId = '';
      if (lesson.videoUrl.includes('youtu.be')) {
        videoId = lesson.videoUrl.split('/').pop() || '';
      } else {
        const url = new URL(lesson.videoUrl);
        videoId = url.searchParams.get('v') || '';
      }
      return (
        <div className="aspect-video rounded-lg overflow-hidden bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            className="w-full h-full"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }

    return (
      <div className="aspect-video rounded-lg overflow-hidden bg-black">
        <video 
          controls 
          className="w-full h-full"
          src={lesson.videoUrl}
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <Button 
          variant="ghost" 
          onClick={() => course ? navigate(`/courses/${course.id}`) : navigate('/courses')} 
          data-testid="button-back-to-course"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("backToCourse")}
        </Button>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={!prevLesson}
            onClick={() => prevLesson && navigate(`/lessons/${prevLesson.id}`)}
            data-testid="button-prev-lesson"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("previousLesson")}
          </Button>
          <Button
            disabled={!nextLesson}
            onClick={() => nextLesson && navigate(`/lessons/${nextLesson.id}`)}
            data-testid="button-next-lesson"
          >
            {t("nextLesson")}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {lesson.lessonType && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        {lesson.lessonType === 'video' ? (
                          <><Video className="h-3 w-3" /> {t("videoLesson")}</>
                        ) : (
                          <><FileText className="h-3 w-3" /> {t("textLesson")}</>
                        )}
                      </Badge>
                    )}
                    {isCompleted && (
                      <Badge variant="outline" className="text-green-600 border-green-500 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {t("completed")}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-2xl" data-testid="text-lesson-title">
                    {lesson.title}
                  </CardTitle>
                  {lesson.description && (
                    <CardDescription className="mt-2 text-base">
                      {lesson.description}
                    </CardDescription>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {lesson.durationMinutes && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{lesson.durationMinutes} {t("min")}</span>
                </div>
              )}

              {lesson.lessonType === 'video' && renderVideoPlayer()}

              {lesson.content && (
                <div 
                  className="prose dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: lesson.content }}
                />
              )}

              <Separator />

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("lessonProgress")}
                </span>
                {!isCompleted ? (
                  <Button
                    onClick={() => markCompleteMutation.mutate()}
                    disabled={markCompleteMutation.isPending}
                    data-testid="button-mark-complete"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {t("markAsComplete")}
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">{t("lessonCompleted")}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                {t("comments")} ({comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {user && (
                <div className="mb-6">
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {user.firstName?.[0] || user.email?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <Textarea
                        placeholder={t("addComment")}
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        rows={3}
                        data-testid="input-comment"
                      />
                      <div className="flex justify-end mt-2">
                        <Button
                          size="sm"
                          onClick={() => addCommentMutation.mutate(commentText)}
                          disabled={!commentText.trim() || addCommentMutation.isPending}
                          data-testid="button-post-comment"
                        >
                          <Send className="h-4 w-4 mr-1" />
                          {t("postComment")}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {comments.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  {t("noComments")}
                </p>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => {
                    const authorName = comment.authorFirstName && comment.authorLastName
                      ? `${comment.authorFirstName} ${comment.authorLastName}`
                      : "User";
                    const initials = comment.authorFirstName?.[0] || "U";
                    return (
                      <div key={comment.id} className="flex gap-3" data-testid={`comment-${comment.id}`}>
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{authorName}</span>
                            {comment.authorRole && comment.authorRole !== 'member' && (
                              <Badge variant="secondary" className="text-xs">
                                {comment.authorRole}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {new Date(comment.createdAt!).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {materials.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("downloadMaterials")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {materials.map((material) => (
                  <a
                    key={material.id}
                    href={`/api/materials/${material.id}/download`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors hover-elevate"
                    data-testid={`material-${material.id}`}
                  >
                    <Download className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{material.title}</p>
                      {material.mimeType && (
                        <p className="text-xs text-muted-foreground uppercase">
                          {material.mimeType.split('/')[1] || material.mimeType}
                        </p>
                      )}
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </a>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("lessonList")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {sortedLessons.map((l, index) => (
                    <div
                      key={l.id}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer ${
                        l.id === lessonId 
                          ? 'bg-primary/10 border border-primary/20' 
                          : 'hover:bg-muted hover-elevate'
                      }`}
                      onClick={() => navigate(`/lessons/${l.id}`)}
                      data-testid={`nav-lesson-${l.id}`}
                    >
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-sm">
                        {index + 1}
                      </div>
                      <span className="flex-1 text-sm truncate">{l.title}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
