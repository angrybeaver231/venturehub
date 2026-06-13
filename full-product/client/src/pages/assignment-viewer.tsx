import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/queryClient";
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  Upload,
  FileText,
  Calendar,
  Trophy,
  Download,
  ExternalLink
} from "lucide-react";
import type { CourseTask, CourseSubmission, Course } from "@shared/schema";
import { format } from "date-fns";

export default function AssignmentViewer() {
  const { id: taskId } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: task, isLoading: taskLoading } = useQuery<CourseTask>({
    queryKey: ['/api/tasks', taskId],
    queryFn: async () => {
      const res = await fetch(`/api/tasks/${taskId}`);
      if (!res.ok) throw new Error("Task not found");
      return res.json();
    },
    enabled: !!taskId,
  });

  const { data: course } = useQuery<Course>({
    queryKey: ['/api/courses', task?.courseId],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${task?.courseId}`);
      return res.json();
    },
    enabled: !!task?.courseId,
  });

  const { data: submission, isLoading: submissionLoading } = useQuery<CourseSubmission | null>({
    queryKey: ['/api/tasks', taskId, 'my-submission'],
    queryFn: async () => {
      const res = await fetch(`/api/tasks/${taskId}/my-submission`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!taskId && !!user,
  });

  const submitMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch(`/api/tasks/${taskId}/submit`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!res.ok) {
        throw new Error('Failed to submit');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', taskId, 'my-submission'] });
      setSelectedFile(null);
      toast({
        title: t("success"),
        description: t("assignmentSubmittedSuccessfully"),
      });
    },
    onError: () => {
      toast({
        title: t("error"),
        description: t("failedToSubmitAssignment"),
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSubmit = () => {
    if (selectedFile) {
      submitMutation.mutate(selectedFile);
    }
  };

  const isOverdue = task?.dueAt ? new Date(task.dueAt) < new Date() : false;
  const hasSubmission = !!submission;
  const isGraded = submission?.status === 'graded';

  if (taskLoading || submissionLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">{t("loading")}</div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/courses")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("back")}
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{t("assignmentNotFound")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Button 
        variant="ghost" 
        onClick={() => course ? navigate(`/courses/${course.id}`) : navigate('/courses')} 
        data-testid="button-back-to-course"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t("backToCourse")}
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <CardTitle>{task.title}</CardTitle>
              {task.description && (
                <CardDescription className="mt-2">{task.description}</CardDescription>
              )}
            </div>
            <Badge variant={isOverdue ? "destructive" : "secondary"}>
              {task.points} {t("points")}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            {task.dueAt && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className={isOverdue ? "text-destructive" : ""}>
                  {t("dueDate")}: {format(new Date(task.dueAt), "PPp")}
                </span>
              </div>
            )}
            {task.passingScore && (
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-muted-foreground" />
                <span>{t("passingScore")}: {task.passingScore}%</span>
              </div>
            )}
          </div>

          {isOverdue && !hasSubmission && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{t("assignmentOverdue")}</AlertDescription>
            </Alert>
          )}

          <Separator />

          {hasSubmission ? (
            <div className="space-y-4">
              <h3 className="font-semibold">{t("yourSubmission")}</h3>
              
              <div className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{t("submittedFile")}</span>
                  </div>
                  <Badge variant={isGraded ? "default" : "secondary"}>
                    {isGraded ? t("graded") : t("pendingReview")}
                  </Badge>
                </div>

                {submission.fileUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={submission.fileUrl} target="_blank" rel="noopener noreferrer" data-testid="link-download-submission">
                      <Download className="h-4 w-4 mr-2" />
                      {t("downloadSubmission")}
                    </a>
                  </Button>
                )}

                {submission.createdAt && (
                  <p className="text-sm text-muted-foreground">
                    {t("submittedOn")}: {format(new Date(submission.createdAt), "PPp")}
                  </p>
                )}

                {isGraded && (
                  <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{t("grade")}:</span>
                      <span className="text-2xl font-bold">
                        {submission.grade}/{task.points}
                      </span>
                    </div>
                    {submission.feedback && (
                      <div>
                        <span className="font-medium">{t("feedback")}:</span>
                        <p className="mt-1 text-muted-foreground">{submission.feedback}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {!isOverdue && (
                <div className="pt-4">
                  <p className="text-sm text-muted-foreground mb-4">{t("resubmitNote")}</p>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="file-upload">{t("uploadNewFile")}</Label>
                      <div className="flex gap-2 mt-2">
                        <Input 
                          id="file-upload"
                          type="file" 
                          ref={fileInputRef}
                          onChange={handleFileSelect}
                          className="flex-1"
                          data-testid="input-file-upload"
                        />
                      </div>
                    </div>
                    {selectedFile && (
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4" />
                        <span>{selectedFile.name}</span>
                      </div>
                    )}
                    <Button 
                      onClick={handleSubmit}
                      disabled={!selectedFile || submitMutation.isPending}
                      data-testid="button-resubmit"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {submitMutation.isPending ? t("submitting") : t("resubmit")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="font-semibold">{t("submitYourWork")}</h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="file-upload">{t("uploadFile")}</Label>
                  <div className="flex gap-2 mt-2">
                    <Input 
                      id="file-upload"
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      className="flex-1"
                      disabled={isOverdue}
                      data-testid="input-file-upload"
                    />
                  </div>
                </div>
                {selectedFile && (
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4" />
                    <span>{selectedFile.name}</span>
                  </div>
                )}
                <Button 
                  onClick={handleSubmit}
                  disabled={!selectedFile || submitMutation.isPending || isOverdue}
                  className="w-full"
                  data-testid="button-submit-assignment"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {submitMutation.isPending ? t("submitting") : t("submitAssignment")}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
