import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, User, Mail, FileText, Download, ChevronDown, ChevronUp, Paperclip, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/contexts/LanguageContext";
import type { EventFormResponseWithAnswers, EventFormField } from "@shared/schema";

interface EventFormResponsesProps {
  eventId: string;
}

export function EventFormResponses({ eventId }: EventFormResponsesProps) {
  const { t } = useLanguage();
  const [selectedResponse, setSelectedResponse] = useState<EventFormResponseWithAnswers | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const { data: responses = [], isLoading } = useQuery<EventFormResponseWithAnswers[]>({
    queryKey: ["/api/events", eventId, "form", "responses"],
    queryFn: async () => {
      const response = await fetch(`/api/events/${eventId}/form/responses`);
      if (!response.ok) throw new Error("Failed to fetch responses");
      return response.json();
    },
  });

  const { data: formFields = [] } = useQuery<EventFormField[]>({
    queryKey: ["/api/events", eventId, "form", "fields"],
    queryFn: async () => {
      const response = await fetch(`/api/events/${eventId}/form/fields`);
      if (!response.ok) throw new Error("Failed to fetch form fields");
      return response.json();
    },
  });

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const getDisplayName = (response: EventFormResponseWithAnswers) => {
    if (response.userFirstName || response.userLastName) {
      return `${response.userFirstName || ""} ${response.userLastName || ""}`.trim();
    }
    return response.guestName || t("anonymous");
  };

  const getDisplayEmail = (response: EventFormResponseWithAnswers) => {
    return response.userEmail || response.guestEmail || "-";
  };

  const formatAnswer = (answer: EventFormResponseWithAnswers["answers"][0]) => {
    if (!answer) return "-";
    
    switch (answer.field.type) {
      case "short_text":
      case "long_text":
        return answer.valueText || "-";
      case "single_choice":
        return answer.valueOptions?.[0] || "-";
      case "multiple_choice":
        return answer.valueOptions?.join(", ") || "-";
      case "file":
        if (answer.filePath) {
          return (
            <a 
              href={`/objects/${answer.filePath}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <Paperclip className="h-3 w-3" />
              {answer.fileName || t("downloadFile")}
            </a>
          );
        }
        return "-";
      default:
        return "-";
    }
  };

  if (isLoading) {
    return <div className="text-muted-foreground">{t("loading")}</div>;
  }

  if (formFields.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          {t("formResponses")}
        </CardTitle>
        <CardDescription>
          {t("formResponsesCount", { count: responses.length })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {responses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t("noResponsesYet")}</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>{t("participant")}</TableHead>
                  <TableHead>{t("email")}</TableHead>
                  <TableHead>{t("submittedAt")}</TableHead>
                  <TableHead>{t("answers")}</TableHead>
                  <TableHead className="w-24">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {responses.map((response) => {
                  const isExpanded = expandedRows.has(response.id);
                  return (
                    <>
                      <TableRow key={response.id} data-testid={`response-row-${response.id}`}>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={() => toggleRow(response.id)}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {getDisplayName(response)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate max-w-[200px]">{getDisplayEmail(response)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {response.createdAt 
                            ? new Date(response.createdAt).toLocaleDateString() 
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {response.answers.length} {t("answersCount")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setSelectedResponse(response)}
                            data-testid={`button-view-response-${response.id}`}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            {t("view")}
                          </Button>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow key={`${response.id}-expanded`}>
                          <TableCell colSpan={6} className="bg-muted/30 p-4">
                            <div className="space-y-3">
                              {formFields.map((field) => {
                                const answer = response.answers.find(a => a.fieldId === field.id);
                                return (
                                  <div key={field.id} className="grid grid-cols-[200px_1fr] gap-4 items-start">
                                    <div className="font-medium text-sm flex items-center gap-2">
                                      {field.label}
                                      {field.required && <Badge variant="outline" className="text-xs">*</Badge>}
                                    </div>
                                    <div className="text-sm">
                                      {answer ? formatAnswer(answer) : (
                                        <span className="text-muted-foreground">{t("noAnswer")}</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={!!selectedResponse} onOpenChange={() => setSelectedResponse(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {selectedResponse && getDisplayName(selectedResponse)}
              </DialogTitle>
              <DialogDescription>
                {selectedResponse?.userEmail || selectedResponse?.guestEmail}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              {selectedResponse && (
                <div className="space-y-4 pr-4">
                  {formFields.map((field) => {
                    const answer = selectedResponse.answers.find(a => a.fieldId === field.id);
                    return (
                      <div key={field.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <h4 className="font-medium">{field.label}</h4>
                            {field.description && (
                              <p className="text-sm text-muted-foreground">{field.description}</p>
                            )}
                          </div>
                          {field.required && <Badge variant="secondary">{t("required")}</Badge>}
                        </div>
                        <div className="mt-2">
                          {answer ? (
                            <div className="bg-muted/50 rounded p-3">
                              {field.type === "file" && answer.filePath ? (
                                <a 
                                  href={`/objects/${answer.filePath}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-primary hover:underline"
                                >
                                  <Download className="h-4 w-4" />
                                  {answer.fileName || t("downloadFile")}
                                </a>
                              ) : field.type === "multiple_choice" && answer.valueOptions ? (
                                <div className="flex flex-wrap gap-2">
                                  {answer.valueOptions.map((opt, i) => (
                                    <Badge key={i} variant="outline">{opt}</Badge>
                                  ))}
                                </div>
                              ) : field.type === "single_choice" && answer.valueOptions?.[0] ? (
                                <Badge variant="outline">{answer.valueOptions[0]}</Badge>
                              ) : (
                                <p className="whitespace-pre-wrap">{answer.valueText || "-"}</p>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <X className="h-4 w-4" />
                              {t("noAnswer")}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
