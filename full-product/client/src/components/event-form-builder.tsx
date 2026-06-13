import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Trash2, GripVertical, Edit, FileText, AlignLeft, CircleDot, CheckSquare, Paperclip, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { EventFormField, FormFieldType } from "@shared/schema";

interface EventFormBuilderProps {
  eventId: string;
}

const FIELD_TYPE_ICONS: Record<FormFieldType, typeof FileText> = {
  short_text: FileText,
  long_text: AlignLeft,
  single_choice: CircleDot,
  multiple_choice: CheckSquare,
  file: Paperclip,
};

const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  short_text: "Short Text",
  long_text: "Long Text",
  single_choice: "Single Choice",
  multiple_choice: "Multiple Choice",
  file: "File Upload",
};

export function EventFormBuilder({ eventId }: EventFormBuilderProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<EventFormField | null>(null);
  const [newField, setNewField] = useState({
    type: "short_text" as FormFieldType,
    label: "",
    description: "",
    required: false,
    options: [""],
    maxFileSize: 10,
    allowedFileTypes: [".pdf", ".docx", ".doc"],
  });

  const { data: formFields = [], isLoading } = useQuery<EventFormField[]>({
    queryKey: ["/api/events", eventId, "form", "fields"],
    queryFn: async () => {
      const response = await fetch(`/api/events/${eventId}/form/fields`);
      if (!response.ok) throw new Error("Failed to fetch form fields");
      return response.json();
    },
  });

  const createFieldMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/events/${eventId}/form/fields`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "form", "fields"] });
      setAddDialogOpen(false);
      resetNewField();
      toast({ title: t("success"), description: t("questionAdded") });
    },
    onError: (error: any) => {
      toast({ title: t("error"), description: error.message || t("failedToAddQuestion"), variant: "destructive" });
    },
  });

  const updateFieldMutation = useMutation({
    mutationFn: async ({ fieldId, data }: { fieldId: string; data: any }) => {
      return apiRequest(`/api/events/${eventId}/form/fields/${fieldId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "form", "fields"] });
      setEditDialogOpen(false);
      setEditingField(null);
      toast({ title: t("success"), description: t("questionUpdated") });
    },
    onError: (error: any) => {
      toast({ title: t("error"), description: error.message || t("failedToUpdateQuestion"), variant: "destructive" });
    },
  });

  const deleteFieldMutation = useMutation({
    mutationFn: async (fieldId: string) => {
      return apiRequest(`/api/events/${eventId}/form/fields/${fieldId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "form", "fields"] });
      toast({ title: t("success"), description: t("questionDeleted") });
    },
    onError: () => {
      toast({ title: t("error"), description: t("failedToDeleteQuestion"), variant: "destructive" });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (fieldIds: string[]) => {
      return apiRequest(`/api/events/${eventId}/form/reorder`, {
        method: "PATCH",
        body: JSON.stringify({ fieldIds }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "form", "fields"] });
    },
  });

  const resetNewField = () => {
    setNewField({
      type: "short_text",
      label: "",
      description: "",
      required: false,
      options: [""],
      maxFileSize: 10,
      allowedFileTypes: [".pdf", ".docx", ".doc"],
    });
  };

  const handleAddField = () => {
    const data: any = {
      type: newField.type,
      label: newField.label,
      description: newField.description || undefined,
      required: newField.required,
      orderIndex: formFields.length,
    };

    if (newField.type === "single_choice" || newField.type === "multiple_choice") {
      data.options = newField.options.filter(o => o.trim() !== "");
    }

    if (newField.type === "file") {
      data.maxFileSize = newField.maxFileSize * 1024 * 1024;
      data.allowedFileTypes = newField.allowedFileTypes;
    }

    createFieldMutation.mutate(data);
  };

  const handleUpdateField = () => {
    if (!editingField) return;
    
    const data: any = {
      type: editingField.type,
      label: editingField.label,
      description: editingField.description || undefined,
      required: editingField.required,
    };

    if (editingField.type === "single_choice" || editingField.type === "multiple_choice") {
      data.options = (editingField.options || []).filter(o => o.trim() !== "");
    }

    if (editingField.type === "file") {
      data.maxFileSize = editingField.maxFileSize;
      data.allowedFileTypes = editingField.allowedFileTypes;
    }

    updateFieldMutation.mutate({ fieldId: editingField.id, data });
  };

  const handleMoveField = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= formFields.length) return;

    const newOrder = [...formFields];
    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
    reorderMutation.mutate(newOrder.map(f => f.id));
  };

  const addOption = () => {
    setNewField({ ...newField, options: [...newField.options, ""] });
  };

  const removeOption = (index: number) => {
    setNewField({ ...newField, options: newField.options.filter((_, i) => i !== index) });
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...newField.options];
    newOptions[index] = value;
    setNewField({ ...newField, options: newOptions });
  };

  const addEditOption = () => {
    if (!editingField) return;
    setEditingField({ ...editingField, options: [...(editingField.options || []), ""] });
  };

  const removeEditOption = (index: number) => {
    if (!editingField) return;
    setEditingField({ ...editingField, options: (editingField.options || []).filter((_, i) => i !== index) });
  };

  const updateEditOption = (index: number, value: string) => {
    if (!editingField) return;
    const newOptions = [...(editingField.options || [])];
    newOptions[index] = value;
    setEditingField({ ...editingField, options: newOptions });
  };

  if (isLoading) {
    return <div className="text-muted-foreground">{t("loading")}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t("registrationForm")}
            </CardTitle>
            <CardDescription>{t("registrationFormDescription")}</CardDescription>
          </div>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-question">
                <Plus className="h-4 w-4 mr-2" />
                {t("addQuestion")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t("addQuestion")}</DialogTitle>
                <DialogDescription>{t("addQuestionDescription")}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("questionType")}</Label>
                  <Select 
                    value={newField.type} 
                    onValueChange={(value: FormFieldType) => setNewField({ ...newField, type: value })}
                  >
                    <SelectTrigger data-testid="select-question-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["short_text", "long_text", "single_choice", "multiple_choice", "file"] as FormFieldType[]).map(type => {
                        const Icon = FIELD_TYPE_ICONS[type];
                        return (
                          <SelectItem key={type} value={type}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {FIELD_TYPE_LABELS[type]}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t("questionText")}</Label>
                  <Input
                    value={newField.label}
                    onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                    placeholder={t("enterQuestionText")}
                    data-testid="input-question-label"
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t("helpText")}</Label>
                  <Textarea
                    value={newField.description}
                    onChange={(e) => setNewField({ ...newField, description: e.target.value })}
                    placeholder={t("optionalHelpText")}
                    rows={2}
                    data-testid="input-question-description"
                  />
                </div>

                {(newField.type === "single_choice" || newField.type === "multiple_choice") && (
                  <div className="space-y-2">
                    <Label>{t("options")}</Label>
                    {newField.options.map((option, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={option}
                          onChange={(e) => updateOption(index, e.target.value)}
                          placeholder={`${t("option")} ${index + 1}`}
                          data-testid={`input-option-${index}`}
                        />
                        {newField.options.length > 1 && (
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon"
                            onClick={() => removeOption(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={addOption}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t("addOption")}
                    </Button>
                  </div>
                )}

                {newField.type === "file" && (
                  <div className="space-y-2">
                    <Label>{t("maxFileSize")}</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={newField.maxFileSize}
                        onChange={(e) => setNewField({ ...newField, maxFileSize: parseInt(e.target.value) || 10 })}
                        min={1}
                        max={100}
                        className="w-24"
                        data-testid="input-max-file-size"
                      />
                      <span className="text-muted-foreground">MB</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Switch
                    checked={newField.required}
                    onCheckedChange={(checked) => setNewField({ ...newField, required: checked })}
                    data-testid="switch-required"
                  />
                  <Label>{t("required")}</Label>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={handleAddField}
                  disabled={!newField.label.trim() || createFieldMutation.isPending}
                  data-testid="button-save-question"
                >
                  {createFieldMutation.isPending ? t("saving") : t("addQuestion")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {formFields.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t("noQuestionsYet")}</p>
            <p className="text-sm">{t("addQuestionsPrompt")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {formFields.map((field, index) => {
              const Icon = FIELD_TYPE_ICONS[field.type as FormFieldType];
              return (
                <div 
                  key={field.id} 
                  className="flex items-start gap-3 p-4 border rounded-lg bg-card hover-elevate"
                  data-testid={`form-field-${field.id}`}
                >
                  <div className="flex flex-col gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={() => handleMoveField(index, "up")}
                      disabled={index === 0}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={() => handleMoveField(index, "down")}
                      disabled={index === formFields.length - 1}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium truncate">{field.label}</span>
                      {field.required && <Badge variant="secondary" className="text-xs">{t("required")}</Badge>}
                    </div>
                    {field.description && (
                      <p className="text-sm text-muted-foreground mb-2">{field.description}</p>
                    )}
                    {(field.type === "single_choice" || field.type === "multiple_choice") && field.options && (
                      <div className="flex flex-wrap gap-1">
                        {field.options.map((opt, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{opt}</Badge>
                        ))}
                      </div>
                    )}
                    {field.type === "file" && (
                      <p className="text-xs text-muted-foreground">
                        Max: {field.maxFileSize ? Math.round(field.maxFileSize / 1024 / 1024) : 10}MB
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        setEditingField(field);
                        setEditDialogOpen(true);
                      }}
                      data-testid={`button-edit-field-${field.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        if (confirm(t("confirmDeleteQuestion"))) {
                          deleteFieldMutation.mutate(field.id);
                        }
                      }}
                      data-testid={`button-delete-field-${field.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("editQuestion")}</DialogTitle>
          </DialogHeader>
          {editingField && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("questionType")}</Label>
                <Select 
                  value={editingField.type as FormFieldType} 
                  onValueChange={(value: FormFieldType) => setEditingField({ ...editingField, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["short_text", "long_text", "single_choice", "multiple_choice", "file"] as FormFieldType[]).map(type => {
                      const Icon = FIELD_TYPE_ICONS[type];
                      return (
                        <SelectItem key={type} value={type}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {FIELD_TYPE_LABELS[type]}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("questionText")}</Label>
                <Input
                  value={editingField.label}
                  onChange={(e) => setEditingField({ ...editingField, label: e.target.value })}
                  placeholder={t("enterQuestionText")}
                />
              </div>

              <div className="space-y-2">
                <Label>{t("helpText")}</Label>
                <Textarea
                  value={editingField.description || ""}
                  onChange={(e) => setEditingField({ ...editingField, description: e.target.value })}
                  placeholder={t("optionalHelpText")}
                  rows={2}
                />
              </div>

              {(editingField.type === "single_choice" || editingField.type === "multiple_choice") && (
                <div className="space-y-2">
                  <Label>{t("options")}</Label>
                  {(editingField.options || []).map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={option}
                        onChange={(e) => updateEditOption(index, e.target.value)}
                        placeholder={`${t("option")} ${index + 1}`}
                      />
                      {(editingField.options || []).length > 1 && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon"
                          onClick={() => removeEditOption(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addEditOption}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("addOption")}
                  </Button>
                </div>
              )}

              {editingField.type === "file" && (
                <div className="space-y-2">
                  <Label>{t("maxFileSize")}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={editingField.maxFileSize ? Math.round(editingField.maxFileSize / 1024 / 1024) : 10}
                      onChange={(e) => setEditingField({ ...editingField, maxFileSize: (parseInt(e.target.value) || 10) * 1024 * 1024 })}
                      min={1}
                      max={100}
                      className="w-24"
                    />
                    <span className="text-muted-foreground">MB</span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Switch
                  checked={editingField.required}
                  onCheckedChange={(checked) => setEditingField({ ...editingField, required: checked })}
                />
                <Label>{t("required")}</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              onClick={handleUpdateField}
              disabled={!editingField?.label.trim() || updateFieldMutation.isPending}
            >
              {updateFieldMutation.isPending ? t("saving") : t("saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
