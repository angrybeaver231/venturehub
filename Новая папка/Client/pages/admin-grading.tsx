import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle,
  FileText,
  Download,
  User,
  Clock,
  GraduationCap,
  Send
} from "lucide-react";
import type { Course, CourseTask, CourseSubmission, User as UserType } from "@shared/schema";
import { format } from "date-fns";

interface SubmissionWithDetails extends CourseSubmission {
  user?: UserType;
  task?: CourseTask;
}

export default function AdminGrading() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { user, isTeacherOrAdmin } = useAuth();
  
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionWithDetails | null>(null);
  const [gradeValue, setGradeValue] = useState<string>("");
  const [feedbackValue, setFeedbackValue] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ['/api/courses'],
    enabled: isTeacherOrAdmin,
  });

  const { data: submissions = [], isLoading } = useQuery<CourseSubmission[]>({
    queryKey: ['/api/my-submissions'],
    enabled: false,
  });

  const { data: tasks = [] } = useQuery<CourseTask[]>({
    queryKey: ['/api/courses', selectedCourse, 'tasks'],
    queryFn: async () => {
      if (selectedCourse === 'all') return [];
      const res = await fetch(`/api/courses/${selectedCourse}/tasks`);
      return res.json();
    },
    enabled: selectedCourse !== 'all',
  });

  const [allSubmissions, setAllSubmissions] = useState<SubmissionWithDetails[]>([]);
  
  const { data: taskSubmissions = [], isLoading: submissionsLoading, refetch: refetchSubmissions } = useQuery<SubmissionWithDetails[]>({
    queryKey: ['/api/admin/submissions', selectedCourse],
    queryFn: async () => {
      if (selectedCourse === 'all' || tasks.length === 0) return [];
      
      const allSubs: SubmissionWithDetails[] = [];
      for (const task of tasks) {
        try {
          const res = await fetch(`/api/tasks/${task.id}/submissions`);
          if (res.ok) {
            const subs = await res.json();
            allSubs.push(...subs.map((s: CourseSubmission) => ({ ...s, task })));
          }
        } catch (e) {
          console.error('Error fetching submissions for task', task.id);
        }
      }
      return allSubs;
    },
    enabled: selectedCourse !== 'all' && tasks.length > 0,
  });

  const gradeMutation = useMutation({
    mutationFn: async ({ submissionId, grade, feedback }: { submissionId: string; grade: number; feedback: string }) => {
      return await apiRequest(`/api/submissions/${submissionId}/grade`, {
        method: "POST",
        body: JSON.stringify({ grade, feedback }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/submissions'] });
      refetchSubmissions();
      setDialogOpen(false);
      setSelectedSubmission(null);
      setGradeValue("");
      setFeedbackValue("");
      toast({
        title: t("success"),
        description: t("submissionGraded"),
      });
    },
    onError: () => {
      toast({
        title: t("error"),
        description: t("failedToGrade"),
        variant: "destructive",
      });
    },
  });

  const handleGrade = () => {
    if (!selectedSubmission || !gradeValue) return;
    
    const grade = parseInt(gradeValue);
    if (isNaN(grade) || grade < 0 || grade > 100) {
      toast({
        title: t("error"),
        description: t("invalidGrade"),
        variant: "destructive",
      });
      return;
    }
    
    gradeMutation.mutate({
      submissionId: selectedSubmission.id,
      grade,
      feedback: feedbackValue,
    });
  };

  const openGradingDialog = (submission: SubmissionWithDetails) => {
    setSelectedSubmission(submission);
    setGradeValue(submission.grade?.toString() || "");
    setFeedbackValue(submission.feedback || "");
    setDialogOpen(true);
  };

  const pendingSubmissions = taskSubmissions.filter(s => s.status !== 'graded');
  const gradedSubmissions = taskSubmissions.filter(s => s.status === 'graded');

  if (!isTeacherOrAdmin) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{t("adminRequired")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("gradingDashboard")}</h1>
          <p className="text-muted-foreground">{t("gradingDashboardDescription")}</p>
        </div>
        <Button variant="ghost" onClick={() => navigate("/admin")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("backToAdmin")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("selectCourse")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger data-testid="select-course">
              <SelectValue placeholder={t("selectACourse")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allCourses")}</SelectItem>
              {courses.map(course => (
                <SelectItem key={course.id} value={course.id}>
                  {course.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedCourse !== 'all' && (
        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending" data-testid="tab-pending">
              {t("pendingReview")} ({pendingSubmissions.length})
            </TabsTrigger>
            <TabsTrigger value="graded" data-testid="tab-graded">
              {t("graded")} ({gradedSubmissions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {submissionsLoading ? (
              <div className="py-8 text-center text-muted-foreground">{t("loading")}</div>
            ) : pendingSubmissions.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <p className="text-muted-foreground">{t("noPendingSubmissions")}</p>
                </CardContent>
              </Card>
            ) : (
              pendingSubmissions.map(submission => (
                <Card key={submission.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{submission.task?.title || t("unknownTask")}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {submission.userId}
                          </span>
                          {submission.createdAt && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(submission.createdAt), "PP")}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {submission.fileUrl && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={submission.fileUrl} target="_blank" rel="noopener noreferrer" data-testid={`link-download-${submission.id}`}>
                              <Download className="h-4 w-4 mr-1" />
                              {t("download")}
                            </a>
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          onClick={() => openGradingDialog(submission)}
                          data-testid={`button-grade-${submission.id}`}
                        >
                          <GraduationCap className="h-4 w-4 mr-1" />
                          {t("grade")}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="graded" className="space-y-4">
            {gradedSubmissions.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">{t("noGradedSubmissions")}</p>
                </CardContent>
              </Card>
            ) : (
              gradedSubmissions.map(submission => (
                <Card key={submission.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{submission.task?.title || t("unknownTask")}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {submission.userId}
                          </span>
                          <span className="flex items-center gap-1">
                            <GraduationCap className="h-3 w-3" />
                            {submission.grade}/{submission.task?.points || 100}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {submission.grade}/{submission.task?.points || 100}
                        </Badge>
                        <Button 
                          variant="outline"
                          size="sm" 
                          onClick={() => openGradingDialog(submission)}
                          data-testid={`button-edit-grade-${submission.id}`}
                        >
                          {t("editGrade")}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("gradeSubmission")}</DialogTitle>
            <DialogDescription>
              {selectedSubmission?.task?.title}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedSubmission?.fileUrl && (
              <Button variant="outline" className="w-full" asChild>
                <a href={selectedSubmission.fileUrl} target="_blank" rel="noopener noreferrer" data-testid="dialog-download-link">
                  <Download className="h-4 w-4 mr-2" />
                  {t("downloadSubmission")}
                </a>
              </Button>
            )}
            
            <div>
              <Label htmlFor="grade">{t("grade")} (0-{selectedSubmission?.task?.points || 100})</Label>
              <Input 
                id="grade"
                type="number" 
                min={0} 
                max={selectedSubmission?.task?.points || 100}
                value={gradeValue}
                onChange={(e) => setGradeValue(e.target.value)}
                placeholder={t("enterGrade")}
                data-testid="input-grade"
              />
            </div>
            
            <div>
              <Label htmlFor="feedback">{t("feedback")}</Label>
              <Textarea 
                id="feedback"
                value={feedbackValue}
                onChange={(e) => setFeedbackValue(e.target.value)}
                placeholder={t("enterFeedback")}
                className="min-h-[100px]"
                data-testid="textarea-feedback"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("cancel")}
            </Button>
            <Button 
              onClick={handleGrade}
              disabled={!gradeValue || gradeMutation.isPending}
              data-testid="button-submit-grade"
            >
              <Send className="h-4 w-4 mr-2" />
              {gradeMutation.isPending ? t("submitting") : t("submitGrade")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
