import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { FileText, Upload, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { EventFormField } from "@shared/schema";

interface EventRegistrationFormProps {
  eventId: string;
  eventName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface FormAnswer {
  fieldId: string;
  valueText?: string;
  valueOptions?: string[];
  filePath?: string;
  fileName?: string;
}

export function EventRegistrationForm({ 
  eventId, 
  eventName, 
  open, 
  onOpenChange,
  onSuccess 
}: EventRegistrationFormProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [answers, setAnswers] = useState<FormAnswer[]>([]);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { data: formFields = [], isLoading } = useQuery<EventFormField[]>({
    queryKey: ["/api/events", eventId, "form", "fields"],
    queryFn: async () => {
      const response = await fetch(`/api/events/${eventId}/form/fields`);
      if (!response.ok) throw new Error("Failed to fetch form fields");
      return response.json();
    },
    enabled: open,
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      setFieldErrors({});
      const response = await fetch(`/api/events/${eventId}/register-with-form`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ answers }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.fieldErrors) {
          setFieldErrors(errorData.fieldErrors);
        }
        throw new Error(errorData.message || "Registration failed");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t("success"),
        description: t("registeredSuccess"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "my-registration"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      onOpenChange(false);
      setAnswers([]);
      setFieldErrors({});
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: t("error"),
        description: error.message || t("failedToRegisterEvent"),
      });
    },
  });

  const getAnswer = (fieldId: string): FormAnswer | undefined => {
    return answers.find(a => a.fieldId === fieldId);
  };

  const updateAnswer = (fieldId: string, update: Partial<FormAnswer>) => {
    setAnswers(prev => {
      const existing = prev.find(a => a.fieldId === fieldId);
      if (existing) {
        return prev.map(a => a.fieldId === fieldId ? { ...a, ...update } : a);
      } else {
        return [...prev, { fieldId, ...update }];
      }
    });
  };

  const handleTextChange = (fieldId: string, value: string) => {
    updateAnswer(fieldId, { valueText: value });
  };

  const handleSingleChoiceChange = (fieldId: string, value: string) => {
    updateAnswer(fieldId, { valueOptions: [value] });
  };

  const handleMultipleChoiceChange = (fieldId: string, option: string, checked: boolean) => {
    const answer = getAnswer(fieldId);
    const currentOptions = answer?.valueOptions || [];
    
    if (checked) {
      updateAnswer(fieldId, { valueOptions: [...currentOptions, option] });
    } else {
      updateAnswer(fieldId, { valueOptions: currentOptions.filter(o => o !== option) });
    }
  };

  const handleFileUpload = async (fieldId: string, file: File, field: EventFormField) => {
    // Client-side validation before upload
    const maxSize = field.maxFileSize || 20 * 1024 * 1024; // 20MB default
    if (file.size > maxSize) {
      toast({
        variant: "destructive",
        title: t("error"),
        description: `${t("fileTooLarge")}: ${Math.round(maxSize / 1024 / 1024)}MB`,
      });
      return;
    }
    
    // Check file type if field has restrictions
    if (field.allowedFileTypes && field.allowedFileTypes.length > 0) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const allowedExts = field.allowedFileTypes.map(t => t.toLowerCase().replace('.', ''));
      if (ext && !allowedExts.includes(ext)) {
        toast({
          variant: "destructive",
          title: t("error"),
          description: `${t("fileTypeNotAllowed")}: .${ext}`,
        });
        return;
      }
    }
    
    setUploadingField(fieldId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/upload/form-file", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Upload failed");
      }
      
      const result = await response.json();
      updateAnswer(fieldId, { 
        filePath: result.path,
        fileName: result.filename,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("error"),
        description: error.message || t("failedToUploadFile"),
      });
    } finally {
      setUploadingField(null);
    }
  };

  const handleSubmit = () => {
    registerMutation.mutate();
  };

  const isFieldComplete = (field: EventFormField): boolean => {
    const answer = getAnswer(field.id);
    if (!answer) return false;

    switch (field.type) {
      case "short_text":
      case "long_text":
        return !!answer.valueText?.trim();
      case "single_choice":
      case "multiple_choice":
        return !!answer.valueOptions && answer.valueOptions.length > 0;
      case "file":
        return !!answer.filePath;
      default:
        return false;
    }
  };

  const isFormValid = (): boolean => {
    return formFields
      .filter(f => f.required)
      .every(f => isFieldComplete(f));
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t("registerForEvent")}
          </DialogTitle>
          <DialogDescription>
            {eventName}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] pr-4">
          {formFields.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <p>{t("noQuestionsRequired")}</p>
              <p className="text-sm mt-2">{t("clickRegisterToContinue")}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {formFields.map((field) => {
                const answer = getAnswer(field.id);
                
                return (
                  <div key={field.id} className="space-y-2" data-testid={`form-field-${field.id}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Label className="text-base">
                          {field.label}
                          {field.required && <span className="text-destructive ml-1">*</span>}
                        </Label>
                        {field.description && (
                          <p className="text-sm text-muted-foreground mt-1">{field.description}</p>
                        )}
                      </div>
                      {isFieldComplete(field) && (
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                      )}
                    </div>
                    
                    {field.type === "short_text" && (
                      <Input
                        value={answer?.valueText || ""}
                        onChange={(e) => handleTextChange(field.id, e.target.value)}
                        placeholder={t("enterYourAnswer")}
                        data-testid={`input-field-${field.id}`}
                      />
                    )}
                    
                    {field.type === "long_text" && (
                      <Textarea
                        value={answer?.valueText || ""}
                        onChange={(e) => handleTextChange(field.id, e.target.value)}
                        placeholder={t("enterYourAnswer")}
                        rows={4}
                        data-testid={`textarea-field-${field.id}`}
                      />
                    )}
                    
                    {field.type === "single_choice" && field.options && (
                      <RadioGroup
                        value={answer?.valueOptions?.[0] || ""}
                        onValueChange={(value) => handleSingleChoiceChange(field.id, value)}
                        className="space-y-2"
                      >
                        {field.options.map((option, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <RadioGroupItem 
                              value={option} 
                              id={`${field.id}-${index}`}
                              data-testid={`radio-${field.id}-${index}`}
                            />
                            <Label htmlFor={`${field.id}-${index}`} className="font-normal">
                              {option}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}
                    
                    {field.type === "multiple_choice" && field.options && (
                      <div className="space-y-2">
                        {field.options.map((option, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <Checkbox
                              id={`${field.id}-${index}`}
                              checked={answer?.valueOptions?.includes(option) || false}
                              onCheckedChange={(checked) => 
                                handleMultipleChoiceChange(field.id, option, checked as boolean)
                              }
                              data-testid={`checkbox-${field.id}-${index}`}
                            />
                            <Label htmlFor={`${field.id}-${index}`} className="font-normal">
                              {option}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {field.type === "file" && (
                      <div className="space-y-2">
                        {answer?.filePath ? (
                          <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
                            <Check className="h-4 w-4 text-green-500" />
                            <span className="text-sm truncate flex-1">{answer.fileName}</span>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => updateAnswer(field.id, { filePath: undefined, fileName: undefined })}
                            >
                              {t("remove")}
                            </Button>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed rounded-lg p-4 text-center">
                            {uploadingField === field.id ? (
                              <div className="flex items-center justify-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-sm text-muted-foreground">{t("uploading")}</span>
                              </div>
                            ) : (
                              <label className="cursor-pointer">
                                <div className="flex flex-col items-center gap-2">
                                  <Upload className="h-8 w-8 text-muted-foreground" />
                                  <span className="text-sm text-muted-foreground">{t("clickToUpload")}</span>
                                  {field.maxFileSize && (
                                    <span className="text-xs text-muted-foreground">
                                      Max: {Math.round(field.maxFileSize / 1024 / 1024)}MB
                                    </span>
                                  )}
                                </div>
                                <input
                                  type="file"
                                  className="hidden"
                                  accept={field.allowedFileTypes?.join(',')}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      handleFileUpload(field.id, file, field);
                                    }
                                  }}
                                  data-testid={`file-input-${field.id}`}
                                />
                              </label>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {fieldErrors[field.id] && (
                      <p className="text-sm text-destructive" data-testid={`error-${field.id}`}>
                        {fieldErrors[field.id]}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!isFormValid() || registerMutation.isPending}
            data-testid="button-submit-registration"
          >
            {registerMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("registering")}
              </>
            ) : (
              t("registerForEvent")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
