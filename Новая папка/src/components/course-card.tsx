import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Clock, FileText, BookOpen } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/LanguageContext";

export interface Course {
  id: string;
  title: string;
  description: string;
  modules: number;
  duration: string;
  thumbnailUrl?: string | null;
  track?: string | null;
  progress?: number;
  status?: "not-started" | "in-progress" | "completed";
}

export function CourseCard({ course, onStart }: { course: Course; onStart?: (id: string) => void }) {
  const { t } = useLanguage();

  const statusColors = {
    "not-started": "bg-muted text-muted-foreground",
    "in-progress": "bg-primary text-primary-foreground",
    "completed": "bg-accent text-accent-foreground",
  };

  const statusLabels = {
    "not-started": "Not Started",
    "in-progress": "In Progress",
    "completed": "Completed",
  };

  const trackLabel = course.track === "program" ? t("trackProgram") : t("trackCourse");

  return (
    <Card className="hover-elevate overflow-visible flex flex-col" data-testid={`card-course-${course.id}`}>
      {course.thumbnailUrl && (
        <div className="aspect-video w-full overflow-hidden rounded-t-md">
          <img
            src={course.thumbnailUrl}
            alt={course.title}
            className="w-full h-full object-cover"
            data-testid={`img-course-thumbnail-${course.id}`}
          />
        </div>
      )}
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-xl mb-2" data-testid={`text-course-title-${course.id}`}>
              {course.title}
            </CardTitle>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {course.description}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {course.track && (
              <Badge
                variant={course.track === "program" ? "default" : "secondary"}
                data-testid={`badge-track-${course.id}`}
              >
                {course.track === "program" ? <BookOpen className="h-3 w-3 mr-1" /> : <GraduationCap className="h-3 w-3 mr-1" />}
                {trackLabel}
              </Badge>
            )}
            {course.status && (
              <Badge className={statusColors[course.status]} data-testid={`badge-status-${course.id}`}>
                {statusLabels[course.status]}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 flex-1">
        <div className="flex items-center gap-6 text-sm text-muted-foreground flex-wrap">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            <span>{course.modules} {t("modules")}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>{course.duration}</span>
          </div>
        </div>

        {course.progress !== undefined && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("progress")}</span>
              <span className="font-medium">{course.progress}%</span>
            </div>
            <Progress value={course.progress} />
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Button 
          className="w-full" 
          variant={course.status === "not-started" ? "default" : "outline"}
          onClick={() => onStart?.(course.id)}
          data-testid={`button-course-${course.id}`}
        >
          {course.status === "not-started" ? t("startCourse") : 
           course.status === "completed" ? t("continueCourse") : t("continueCourse")}
        </Button>
      </CardFooter>
    </Card>
  );
}
