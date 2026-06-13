import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  ArrowLeft, 
  ArrowRight,
  Clock, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  Send,
  RotateCcw,
  Trophy,
  Target
} from "lucide-react";
import type { CourseTask, QuizQuestion, QuizAttempt, Course } from "@shared/schema";

export default function QuizViewer() {
  const { id: taskId } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { user } = useAuth();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Fetch task details
  const { data: task, isLoading: taskLoading } = useQuery<CourseTask>({
    queryKey: ['/api/tasks', taskId],
    queryFn: async () => {
      const res = await fetch(`/api/tasks/${taskId}`);
      if (!res.ok) throw new Error("Task not found");
      return res.json();
    },
    enabled: !!taskId,
  });

  // Fetch course details
  const { data: course } = useQuery<Course>({
    queryKey: ['/api/courses', task?.courseId],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${task?.courseId}`);
      return res.json();
    },
    enabled: !!task?.courseId,
  });

  // Fetch quiz questions
  const { data: questions = [], isLoading: questionsLoading } = useQuery<QuizQuestion[]>({
    queryKey: ['/api/tasks', taskId, 'questions'],
    queryFn: async () => {
      const res = await fetch(`/api/tasks/${taskId}/questions`);
      if (!res.ok) throw new Error("Failed to fetch questions");
      return res.json();
    },
    enabled: !!taskId,
  });

  // Fetch user's latest attempt
  const { data: latestAttempt, isLoading: attemptLoading } = useQuery<QuizAttempt | null>({
    queryKey: ['/api/tasks', taskId, 'latest-attempt'],
    queryFn: async () => {
      const res = await fetch(`/api/tasks/${taskId}/latest-attempt`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!taskId && !!user,
  });

  // Start quiz mutation
  const startQuizMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/tasks/${taskId}/start-quiz`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', taskId, 'latest-attempt'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', taskId, 'my-attempts'] });
    },
    onError: (error: Error) => {
      toast({
        title: t("error"),
        description: error.message || t("failedToStartQuiz"),
        variant: "destructive",
      });
    },
  });

  // Submit quiz mutation
  const submitQuizMutation = useMutation({
    mutationFn: async (attemptId: string) => {
      return await apiRequest(`/api/attempts/${attemptId}/submit`, {
        method: "POST",
        body: JSON.stringify({ answers }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', taskId, 'latest-attempt'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', taskId, 'my-attempts'] });
      toast({
        title: t("success"),
        description: t("quizSubmittedSuccessfully"),
      });
    },
    onError: () => {
      toast({
        title: t("error"),
        description: t("failedToSubmitQuiz"),
        variant: "destructive",
      });
    },
  });

  // Timer effect for time-limited quizzes
  useEffect(() => {
    if (latestAttempt && latestAttempt.status === 'in_progress' && task?.timeLimit && latestAttempt.startedAt) {
      const startTime = new Date(latestAttempt.startedAt).getTime();
      const endTime = startTime + task.timeLimit * 60 * 1000;
      
      const interval = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
        setTimeRemaining(remaining);
        
        if (remaining <= 0) {
          clearInterval(interval);
          // Auto-submit when time runs out
          if (latestAttempt.id) {
            submitQuizMutation.mutate(latestAttempt.id);
          }
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [latestAttempt, task?.timeLimit]);

  const sortedQuestions = [...questions].sort((a, b) => a.orderIndex - b.orderIndex);
  const currentQuestion = sortedQuestions[currentQuestionIndex];
  const totalQuestions = sortedQuestions.length;
  const answeredCount = Object.keys(answers).length;
  const progressPercentage = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  const isQuizComplete = latestAttempt?.status === 'completed';
  const isQuizInProgress = latestAttempt?.status === 'in_progress';

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleMultiSelectChange = (questionId: string, option: string, checked: boolean) => {
    setAnswers(prev => {
      const current = prev[questionId] || [];
      if (checked) {
        return { ...prev, [questionId]: [...current, option] };
      } else {
        return { ...prev, [questionId]: current.filter((o: string) => o !== option) };
      }
    });
  };

  const handleStartQuiz = () => {
    startQuizMutation.mutate();
  };

  const handleSubmitQuiz = () => {
    if (!latestAttempt?.id) return;
    setIsSubmitting(true);
    submitQuizMutation.mutate(latestAttempt.id);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (taskLoading || questionsLoading || attemptLoading) {
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
            <p className="text-muted-foreground">{t("quizNotFound")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Quiz completed view - show results
  if (isQuizComplete && latestAttempt) {
    const score = latestAttempt.score || 0;
    const maxScore = latestAttempt.maxScore || 0;
    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    const passed = task.passingScore ? percentage >= task.passingScore : true;

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
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              {passed ? (
                <Trophy className="h-16 w-16 text-yellow-500" />
              ) : (
                <Target className="h-16 w-16 text-muted-foreground" />
              )}
            </div>
            <CardTitle className="text-2xl">{t("quizCompleted")}</CardTitle>
            <CardDescription>{task.title}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-2">
              <div className="text-5xl font-bold">
                {percentage}%
              </div>
              <div className="text-lg text-muted-foreground">
                {score} / {maxScore} {t("points")}
              </div>
              <Badge variant={passed ? "default" : "destructive"} className="text-sm">
                {passed ? t("passed") : t("notPassed")}
              </Badge>
              {task.passingScore && (
                <p className="text-sm text-muted-foreground">
                  {t("passingScore")}: {task.passingScore}%
                </p>
              )}
            </div>

            <Separator />

            <div className="flex justify-center gap-4">
              <Button 
                variant="outline" 
                onClick={() => course && navigate(`/courses/${course.id}`)}
                data-testid="button-return-to-course"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t("returnToCourse")}
              </Button>
              {task.maxAttempts === null || (latestAttempt && task.maxAttempts > 1) && (
                <Button 
                  onClick={handleStartQuiz}
                  disabled={startQuizMutation.isPending}
                  data-testid="button-retry-quiz"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {t("retryQuiz")}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Quiz start view
  if (!isQuizInProgress) {
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
            <CardTitle>{task.title}</CardTitle>
            {task.description && (
              <CardDescription>{task.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span>{totalQuestions} {t("questions")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-muted-foreground" />
                <span>{task.points} {t("points")}</span>
              </div>
              {task.timeLimit && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{task.timeLimit} {t("minutes")}</span>
                </div>
              )}
              {task.passingScore && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  <span>{t("passingScore")}: {task.passingScore}%</span>
                </div>
              )}
            </div>

            {task.maxAttempts && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {t("maxAttemptsWarning")} ({task.maxAttempts})
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full" 
              onClick={handleStartQuiz}
              disabled={startQuizMutation.isPending || questions.length === 0}
              data-testid="button-start-quiz"
            >
              {startQuizMutation.isPending ? t("starting") : t("startQuiz")}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Quiz in progress view
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-semibold">{task.title}</h1>
          <p className="text-sm text-muted-foreground">
            {t("question")} {currentQuestionIndex + 1} {t("of")} {totalQuestions}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {timeRemaining !== null && (
            <Badge variant={timeRemaining < 60 ? "destructive" : "secondary"} className="text-lg px-3 py-1">
              <Clock className="h-4 w-4 mr-2" />
              {formatTime(timeRemaining)}
            </Badge>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{answeredCount} {t("answered")}</span>
          <span>{totalQuestions - answeredCount} {t("remaining")}</span>
        </div>
        <Progress value={progressPercentage} className="h-2" />
      </div>

      {/* Question card */}
      {currentQuestion && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <CardTitle className="text-lg">
                {currentQuestion.questionText}
              </CardTitle>
              <Badge variant="outline">{currentQuestion.points} {t("pts")}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentQuestion.questionType === 'multiple_choice' && currentQuestion.options && (
              <RadioGroup
                value={answers[currentQuestion.id] || ""}
                onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
              >
                {currentQuestion.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 rounded-lg border hover-elevate">
                    <RadioGroupItem 
                      value={option} 
                      id={`option-${index}`}
                      data-testid={`radio-option-${index}`}
                    />
                    <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {currentQuestion.questionType === 'true_false' && (
              <RadioGroup
                value={answers[currentQuestion.id] || ""}
                onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
              >
                {[{label: t("trueOption"), value: "true"}, {label: t("falseOption"), value: "false"}].map((option, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 rounded-lg border hover-elevate">
                    <RadioGroupItem 
                      value={option.value} 
                      id={`tf-${index}`}
                      data-testid={`radio-tf-${index}`}
                    />
                    <Label htmlFor={`tf-${index}`} className="flex-1 cursor-pointer">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {currentQuestion.questionType === 'multiple_select' && currentQuestion.options && (
              <div className="space-y-2">
                {currentQuestion.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 rounded-lg border hover-elevate">
                    <Checkbox 
                      id={`ms-${index}`}
                      checked={(answers[currentQuestion.id] || []).includes(option)}
                      onCheckedChange={(checked) => handleMultiSelectChange(currentQuestion.id, option, !!checked)}
                      data-testid={`checkbox-option-${index}`}
                    />
                    <Label htmlFor={`ms-${index}`} className="flex-1 cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </div>
            )}

            {currentQuestion.questionType === 'short_answer' && (
              <Textarea
                placeholder={t("typeYourAnswer")}
                value={answers[currentQuestion.id] || ""}
                onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                className="min-h-[120px]"
                data-testid="textarea-answer"
              />
            )}

            {currentQuestion.questionType === 'essay' && (
              <Textarea
                placeholder={t("writeYourEssay")}
                value={answers[currentQuestion.id] || ""}
                onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                className="min-h-[200px]"
                data-testid="textarea-essay"
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          disabled={currentQuestionIndex === 0}
          onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
          data-testid="button-prev-question"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("previous")}
        </Button>

        <div className="flex gap-2 flex-wrap justify-center">
          {sortedQuestions.map((_, index) => (
            <Button
              key={index}
              variant={index === currentQuestionIndex ? "default" : answers[sortedQuestions[index].id] ? "secondary" : "outline"}
              size="icon"
              className="w-8 h-8"
              onClick={() => setCurrentQuestionIndex(index)}
              data-testid={`button-question-nav-${index}`}
            >
              {index + 1}
            </Button>
          ))}
        </div>

        {currentQuestionIndex < totalQuestions - 1 ? (
          <Button
            onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
            data-testid="button-next-question"
          >
            {t("next")}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmitQuiz}
            disabled={submitQuizMutation.isPending || answeredCount === 0}
            data-testid="button-submit-quiz"
          >
            <Send className="h-4 w-4 mr-2" />
            {submitQuizMutation.isPending ? t("submitting") : t("submitQuiz")}
          </Button>
        )}
      </div>

      {/* Unanswered warning */}
      {answeredCount < totalQuestions && currentQuestionIndex === totalQuestions - 1 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t("unansweredQuestionsWarning")} ({totalQuestions - answeredCount} {t("remaining")})
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
