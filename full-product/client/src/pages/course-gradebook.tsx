import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  ArrowLeft, 
  Download, 
  Plus,
  Trash2,
  Edit,
  GraduationCap,
  Users,
  FileSpreadsheet,
  Percent,
  BookOpen,
  ClipboardList
} from "lucide-react";
import type { Course, GradeCategory, Rubric, GradebookEntry } from "@shared/schema";

interface GradebookStudent {
  userId: string;
  userName: string;
  userEmail: string;
  entries: GradebookEntry[];
  averageGrade: number;
  letterGrade: string;
}

interface GradebookData {
  students: GradebookStudent[];
  categories: GradeCategory[];
}

interface RubricWithCriteria extends Rubric {
  totalPoints: number;
  criteria: {
    id: string;
    name: string;
    description: string | null;
    maxPoints: number;
    orderIndex: number;
    levels: {
      id: string;
      name: string;
      description: string | null;
      points: number;
      orderIndex: number;
    }[];
  }[];
}

export default function CourseGradebook() {
  const { id: courseId } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { user, isLmsAdmin: isAdmin } = useAuth();
  const isTeacher = user?.role === "teacher";
  
  const [activeTab, setActiveTab] = useState("grades");
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [rubricDialogOpen, setRubricDialogOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: "", weight: 0 });
  const [newRubric, setNewRubric] = useState({ name: "", description: "", maxPoints: 100 });
  const [rubricCriteria, setRubricCriteria] = useState<{ name: string; description: string; maxPoints: number; levels: { name: string; description: string; points: number }[] }[]>([]);

  const canManageGrades = isAdmin || isTeacher;

  const { data: course, isLoading: courseLoading } = useQuery<Course>({
    queryKey: ['/api/courses', courseId],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${courseId}`);
      if (!res.ok) throw new Error("Course not found");
      return res.json();
    },
    enabled: !!courseId,
  });

  const { data: gradebook, isLoading: gradebookLoading } = useQuery<GradebookData>({
    queryKey: ['/api/courses', courseId, 'gradebook'],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${courseId}/gradebook`);
      if (!res.ok) throw new Error("Failed to fetch gradebook");
      return res.json();
    },
    enabled: !!courseId && canManageGrades,
  });

  const { data: categories = [] } = useQuery<GradeCategory[]>({
    queryKey: ['/api/courses', courseId, 'grade-categories'],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${courseId}/grade-categories`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!courseId,
  });

  const { data: rubrics = [] } = useQuery<RubricWithCriteria[]>({
    queryKey: ['/api/courses', courseId, 'rubrics'],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${courseId}/rubrics`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!courseId,
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: { name: string; weight: number }) => {
      return await apiRequest(`/api/courses/${courseId}/grade-categories`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/courses', courseId, 'grade-categories'] });
      setCategoryDialogOpen(false);
      setNewCategory({ name: "", weight: 0 });
      toast({ title: t("success"), description: t("categoryCreated") });
    },
    onError: () => {
      toast({ title: t("error"), description: t("failedToCreateCategory"), variant: "destructive" });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      return await apiRequest(`/api/grade-categories/${categoryId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/courses', courseId, 'grade-categories'] });
      toast({ title: t("success"), description: t("categoryDeleted") });
    },
  });

  const createRubricMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest(`/api/courses/${courseId}/rubrics`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/courses', courseId, 'rubrics'] });
      setRubricDialogOpen(false);
      setNewRubric({ name: "", description: "", maxPoints: 100 });
      setRubricCriteria([]);
      toast({ title: t("success"), description: t("rubricCreated") });
    },
    onError: () => {
      toast({ title: t("error"), description: t("failedToCreateRubric"), variant: "destructive" });
    },
  });

  const deleteRubricMutation = useMutation({
    mutationFn: async (rubricId: string) => {
      return await apiRequest(`/api/rubrics/${rubricId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/courses', courseId, 'rubrics'] });
      toast({ title: t("success"), description: t("rubricDeleted") });
    },
  });

  const handleExportGradebook = async () => {
    try {
      const res = await fetch(`/api/courses/${courseId}/gradebook/export`);
      if (!res.ok) throw new Error("Export failed");
      const data = await res.json();
      
      const csvContent = [
        ["Student", "Email", "Average", "Letter Grade", ...categories.map(c => c.name)].join(","),
        ...data.map((row: any) => [
          row.userName,
          row.userEmail,
          row.averageGrade?.toFixed(1) || "N/A",
          row.letterGrade || "N/A",
          ...categories.map(c => row.categoryGrades?.[c.id]?.toFixed(1) || "N/A")
        ].join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gradebook-${course?.title || courseId}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({ title: t("success"), description: t("gradebookExported") });
    } catch {
      toast({ title: t("error"), description: t("failedToExport"), variant: "destructive" });
    }
  };

  const handleCreateCategory = () => {
    if (!newCategory.name || newCategory.weight <= 0) return;
    createCategoryMutation.mutate(newCategory);
  };

  const handleAddCriterion = () => {
    setRubricCriteria([...rubricCriteria, { 
      name: "", 
      description: "", 
      maxPoints: 25,
      levels: [
        { name: t("excellent"), description: "", points: 25 },
        { name: t("good"), description: "", points: 20 },
        { name: t("satisfactory"), description: "", points: 15 },
        { name: t("needsImprovement"), description: "", points: 5 },
      ]
    }]);
  };

  const handleCreateRubric = () => {
    if (!newRubric.name || rubricCriteria.length === 0) return;
    createRubricMutation.mutate({
      ...newRubric,
      criteria: rubricCriteria.map((c, idx) => ({
        ...c,
        orderIndex: idx,
        levels: c.levels.map((l, lidx) => ({ ...l, orderIndex: lidx }))
      }))
    });
  };

  const getLetterGradeBadge = (grade: string | null) => {
    if (!grade) return <Badge variant="outline">N/A</Badge>;
    const colors: Record<string, string> = {
      "A+": "bg-green-500", "A": "bg-green-500", "A-": "bg-green-400",
      "B+": "bg-blue-500", "B": "bg-blue-500", "B-": "bg-blue-400",
      "C+": "bg-yellow-500", "C": "bg-yellow-500", "C-": "bg-yellow-400",
      "D+": "bg-orange-500", "D": "bg-orange-500", "D-": "bg-orange-400",
      "F": "bg-red-500"
    };
    return <Badge className={`${colors[grade] || "bg-muted"} text-white`}>{grade}</Badge>;
  };

  if (!canManageGrades) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t("noPermission")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (courseLoading) {
    return (
      <div className="container mx-auto p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(`/courses/${courseId}`)}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t("gradebook")}</h1>
            <p className="text-muted-foreground">{course?.title}</p>
          </div>
        </div>
        <Button onClick={handleExportGradebook} data-testid="button-export-gradebook">
          <Download className="mr-2 h-4 w-4" />
          {t("exportGrades")}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="grades" data-testid="tab-grades">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            {t("grades")}
          </TabsTrigger>
          <TabsTrigger value="categories" data-testid="tab-categories">
            <Percent className="mr-2 h-4 w-4" />
            {t("categories")}
          </TabsTrigger>
          <TabsTrigger value="rubrics" data-testid="tab-rubrics">
            <ClipboardList className="mr-2 h-4 w-4" />
            {t("rubrics")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="grades" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t("studentGrades")}
              </CardTitle>
              <CardDescription>{t("studentGradesDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              {gradebookLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : gradebook?.students && gradebook.students.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("student")}</TableHead>
                        <TableHead>{t("email")}</TableHead>
                        <TableHead className="text-center">{t("average")}</TableHead>
                        <TableHead className="text-center">{t("letterGrade")}</TableHead>
                        {categories.map(cat => (
                          <TableHead key={cat.id} className="text-center">
                            {cat.name} ({cat.weight}%)
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gradebook.students.map(student => (
                        <TableRow key={student.userId} data-testid={`row-student-${student.userId}`}>
                          <TableCell className="font-medium">{student.userName}</TableCell>
                          <TableCell className="text-muted-foreground">{student.userEmail}</TableCell>
                          <TableCell className="text-center">
                            {student.averageGrade?.toFixed(1) || "N/A"}
                          </TableCell>
                          <TableCell className="text-center">
                            {getLetterGradeBadge(student.letterGrade)}
                          </TableCell>
                          {categories.map(cat => {
                            const entry = student.entries?.find(e => e.categoryId === cat.id);
                            return (
                              <TableCell key={cat.id} className="text-center">
                                {entry?.score?.toFixed(1) || "-"}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">{t("noStudentsEnrolled")}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>{t("gradeCategories")}</CardTitle>
                <CardDescription>{t("gradeCategoriesDescription")}</CardDescription>
              </div>
              <Button onClick={() => setCategoryDialogOpen(true)} data-testid="button-add-category">
                <Plus className="mr-2 h-4 w-4" />
                {t("addCategory")}
              </Button>
            </CardHeader>
            <CardContent>
              {categories.length === 0 ? (
                <div className="text-center py-12">
                  <Percent className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">{t("noCategoriesYet")}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {categories.map(cat => (
                    <div 
                      key={cat.id} 
                      className="flex items-center justify-between p-4 border rounded-lg"
                      data-testid={`category-${cat.id}`}
                    >
                      <div>
                        <h3 className="font-medium">{cat.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {t("weight")}: {cat.weight}%
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => deleteCategoryMutation.mutate(cat.id)}
                        data-testid={`button-delete-category-${cat.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{t("totalWeight")}</span>
                    <span className={categories.reduce((sum, c) => sum + c.weight, 0) === 100 ? "text-green-600" : "text-orange-600"}>
                      {categories.reduce((sum, c) => sum + c.weight, 0)}%
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rubrics" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>{t("gradingRubrics")}</CardTitle>
                <CardDescription>{t("gradingRubricsDescription")}</CardDescription>
              </div>
              <Button onClick={() => setRubricDialogOpen(true)} data-testid="button-add-rubric">
                <Plus className="mr-2 h-4 w-4" />
                {t("createRubric")}
              </Button>
            </CardHeader>
            <CardContent>
              {rubrics.length === 0 ? (
                <div className="text-center py-12">
                  <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">{t("noRubricsYet")}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {rubrics.map(rubric => (
                    <Card key={rubric.id} data-testid={`rubric-${rubric.id}`}>
                      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                        <div>
                          <CardTitle className="text-lg">{rubric.name}</CardTitle>
                          {rubric.description && (
                            <CardDescription>{rubric.description}</CardDescription>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{rubric.totalPoints} {t("points")}</Badge>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => deleteRubricMutation.mutate(rubric.id)}
                            data-testid={`button-delete-rubric-${rubric.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {rubric.criteria && rubric.criteria.length > 0 && (
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>{t("criterion")}</TableHead>
                                  {rubric.criteria[0]?.levels?.map(level => (
                                    <TableHead key={level.id} className="text-center">
                                      {level.name} ({level.points})
                                    </TableHead>
                                  ))}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {rubric.criteria.map(criterion => (
                                  <TableRow key={criterion.id}>
                                    <TableCell className="font-medium">
                                      {criterion.name}
                                      <span className="text-muted-foreground ml-2">
                                        (max {criterion.maxPoints})
                                      </span>
                                    </TableCell>
                                    {criterion.levels?.map(level => (
                                      <TableCell key={level.id} className="text-center text-sm text-muted-foreground">
                                        {level.description || "-"}
                                      </TableCell>
                                    ))}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("addGradeCategory")}</DialogTitle>
            <DialogDescription>{t("addGradeCategoryDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("categoryName")}</Label>
              <Input
                value={newCategory.name}
                onChange={e => setNewCategory({ ...newCategory, name: e.target.value })}
                placeholder={t("enterCategoryName")}
                data-testid="input-category-name"
              />
            </div>
            <div>
              <Label>{t("weight")} (%)</Label>
              <Input
                type="number"
                min="1"
                max="100"
                value={newCategory.weight || ""}
                onChange={e => setNewCategory({ ...newCategory, weight: parseInt(e.target.value) || 0 })}
                placeholder="25"
                data-testid="input-category-weight"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>
              {t("cancel")}
            </Button>
            <Button 
              onClick={handleCreateCategory}
              disabled={!newCategory.name || newCategory.weight <= 0 || createCategoryMutation.isPending}
              data-testid="button-save-category"
            >
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rubricDialogOpen} onOpenChange={setRubricDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("createRubric")}</DialogTitle>
            <DialogDescription>{t("createRubricDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("rubricName")}</Label>
                <Input
                  value={newRubric.name}
                  onChange={e => setNewRubric({ ...newRubric, name: e.target.value })}
                  placeholder={t("enterRubricName")}
                  data-testid="input-rubric-name"
                />
              </div>
              <div>
                <Label>{t("maxPoints")}</Label>
                <Input
                  type="number"
                  min="1"
                  value={newRubric.maxPoints}
                  onChange={e => setNewRubric({ ...newRubric, maxPoints: parseInt(e.target.value) || 100 })}
                  data-testid="input-rubric-max-points"
                />
              </div>
            </div>
            <div>
              <Label>{t("description")}</Label>
              <Input
                value={newRubric.description}
                onChange={e => setNewRubric({ ...newRubric, description: e.target.value })}
                placeholder={t("optionalDescription")}
                data-testid="input-rubric-description"
              />
            </div>
            
            <Separator />
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">{t("criteria")}</Label>
                <Button variant="outline" size="sm" onClick={handleAddCriterion} data-testid="button-add-criterion">
                  <Plus className="mr-2 h-4 w-4" />
                  {t("addCriterion")}
                </Button>
              </div>
              
              {rubricCriteria.map((criterion, idx) => (
                <Card key={idx} className="p-4">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1 grid grid-cols-2 gap-4">
                      <div>
                        <Label>{t("criterionName")}</Label>
                        <Input
                          value={criterion.name}
                          onChange={e => {
                            const updated = [...rubricCriteria];
                            updated[idx].name = e.target.value;
                            setRubricCriteria(updated);
                          }}
                          placeholder={t("enterCriterionName")}
                          data-testid={`input-criterion-name-${idx}`}
                        />
                      </div>
                      <div>
                        <Label>{t("maxPoints")}</Label>
                        <Input
                          type="number"
                          min="1"
                          value={criterion.maxPoints}
                          onChange={e => {
                            const updated = [...rubricCriteria];
                            updated[idx].maxPoints = parseInt(e.target.value) || 0;
                            setRubricCriteria(updated);
                          }}
                          data-testid={`input-criterion-points-${idx}`}
                        />
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setRubricCriteria(rubricCriteria.filter((_, i) => i !== idx))}
                      data-testid={`button-remove-criterion-${idx}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {criterion.levels.map((level, lidx) => (
                      <div key={lidx} className="text-center p-2 border rounded text-sm">
                        <div className="font-medium">{level.name}</div>
                        <div className="text-muted-foreground">{level.points} pts</div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
              
              {rubricCriteria.length === 0 && (
                <p className="text-center text-muted-foreground py-4">{t("addCriteriaToRubric")}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setRubricDialogOpen(false);
              setRubricCriteria([]);
            }}>
              {t("cancel")}
            </Button>
            <Button 
              onClick={handleCreateRubric}
              disabled={!newRubric.name || rubricCriteria.length === 0 || createRubricMutation.isPending}
              data-testid="button-save-rubric"
            >
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
