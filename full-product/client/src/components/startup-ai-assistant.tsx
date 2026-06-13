import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Bot,
  Send,
  Paperclip,
  Loader2,
  Sparkles,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { StartupDocumentsSection } from "./startup-documents-section";

type ToolCallResult = {
  name: string;
  args: any;
  result: { ok: boolean; message: string; data?: any };
};
type ChatMessage = {
  id: string;
  startupId: string;
  userId: string | null;
  role: "user" | "assistant" | "system";
  content: string;
  documentId: string | null;
  metadata?: { toolCalls?: ToolCallResult[] } | null;
  createdAt: string;
};

export function StartupAiAssistant({ startupId }: { startupId: string }) {
  const { language, t } = useLanguage();
  const { toast } = useToast();
  const [input, setInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/startups", startupId, "ai-chat", "messages"],
    enabled: !!startupId,
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest(`/api/startups/${startupId}/ai-chat/messages`, {
        method: "POST",
        body: JSON.stringify({ content, language }),
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      setInput("");
      queryClient.invalidateQueries({
        queryKey: ["/api/startups", startupId, "ai-chat", "messages"],
      });
      // If the AI took any actions, refresh affected sections so the founder
      // sees them immediately on the page.
      const calls: { name: string }[] = data?.toolCalls || [];
      if (calls.length) {
        const names = new Set(calls.map((c) => c.name));
        if (names.has("update_startup_profile")) {
          queryClient.invalidateQueries({ queryKey: ["/api/startups", startupId] });
        }
        if (names.has("add_or_update_metric")) {
          queryClient.invalidateQueries({ queryKey: ["/api/startups", startupId, "metrics"] });
          queryClient.invalidateQueries({ queryKey: [`/api/startups/${startupId}/metrics`] });
        }
        if (names.has("add_team_member")) {
          queryClient.invalidateQueries({ queryKey: ["/api/startups", startupId, "team-members"] });
          queryClient.invalidateQueries({ queryKey: [`/api/startups/${startupId}/team-members`] });
          queryClient.invalidateQueries({ queryKey: ["/api/startups", startupId, "members"] });
        }
        if (names.has("publish_document")) {
          queryClient.invalidateQueries({ queryKey: ["/api/startups", startupId, "documents"] });
        }
        const ok = calls.filter((c: any) => c.result?.ok).length;
        if (ok > 0) {
          toast({
            title: language === "ru" ? "AI обновил стартап" : "AI updated the startup",
            description:
              (language === "ru" ? "Действий выполнено: " : "Actions taken: ") + ok,
          });
        }
      }
    },
    onError: (err: any) => {
      toast({
        title: language === "ru" ? "Ошибка" : "Error",
        description: err?.message || "Failed to send",
        variant: "destructive",
      });
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(`/api/startups/${startupId}/ai-chat/messages`, {
        method: "DELETE",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/startups", startupId, "ai-chat", "messages"],
      });
    },
  });

  const onPickFile = () => fileInputRef.current?.click();

  const handleFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("isPublic", "false");
      const res = await fetch(`/api/startups/${startupId}/documents`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      if (!res.ok) throw new Error((await res.json()).message || "Upload failed");
      const doc = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/startups", startupId, "documents"] });
      // Auto-send a chat message describing what was uploaded so the AI replies
      // with an extraction summary in-thread.
      const prompt =
        language === "ru"
          ? `Я загрузил документ "${doc.filename}". Расскажи, что в нём, и какие метрики traction можно вынести.`
          : `I uploaded a document "${doc.filename}". Summarise it and call out any traction metrics you can pull.`;
      sendMutation.mutate(prompt);
      toast({
        title: language === "ru" ? "Файл загружен" : "File uploaded",
        description: doc.aiSummary || (language === "ru" ? "AI обрабатывает файл" : "AI is analysing the file"),
      });
    } catch (err: any) {
      toast({
        title: language === "ru" ? "Ошибка загрузки" : "Upload failed",
        description: err?.message || "",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || sendMutation.isPending) return;
    sendMutation.mutate(text);
  };

  return (
    <div className="space-y-6">
      <Card data-testid="card-startup-ai-assistant">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2 flex-wrap">
            <span className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {language === "ru" ? "AI-ассистент основателя" : "Founder AI assistant"}
              <Badge variant="secondary" className="ml-2">
                {language === "ru" ? "Только для основателей" : "Founders only"}
              </Badge>
            </span>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearMutation.mutate()}
                disabled={clearMutation.isPending}
                data-testid="button-clear-chat"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                {language === "ru" ? "Очистить" : "Clear"}
              </Button>
            )}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {language === "ru"
              ? "Загружайте презентации, отчёты, финансовые таблицы — AI прочитает их и подскажет, какие метрики traction можно опубликовать. Только участники команды видят этот чат."
              : "Drop in pitch decks, reports, financial spreadsheets — AI will read them and surface traction you can publish. Only your team sees this chat."}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            ref={scrollRef}
            className="h-[400px] overflow-y-auto rounded-md border bg-muted/30 p-3"
            data-testid="region-chat-messages"
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-sm text-muted-foreground gap-2">
                <Bot className="h-8 w-8" />
                <div>
                  {language === "ru"
                    ? "Начните диалог или загрузите документ — AI прочитает PDF, Excel, PowerPoint, Word."
                    : "Start a conversation or upload a document — AI reads PDF, Excel, PowerPoint, Word."}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((m) => (
                  <ChatBubble key={m.id} message={m} />
                ))}
                {sendMutation.isPending && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {language === "ru" ? "AI думает…" : "AI is thinking…"}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                language === "ru"
                  ? "Задайте вопрос или попросите проанализировать загруженный документ…"
                  : "Ask a question or request analysis of an uploaded document…"
              }
              className="resize-none min-h-[80px]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              data-testid="input-chat-message"
            />
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={onPickFile}
                disabled={uploading}
                data-testid="button-attach-file"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Paperclip className="h-4 w-4 mr-1" />
                )}
                {language === "ru" ? "Прикрепить файл" : "Attach file"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                hidden
                accept=".pdf,.xlsx,.xls,.pptx,.docx,.doc,.csv,.txt,image/*"
                onChange={handleFileChosen}
                data-testid="input-file-upload"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || sendMutation.isPending}
                data-testid="button-send-message"
              >
                <Send className="h-4 w-4 mr-1" />
                {language === "ru" ? "Отправить" : "Send"}
                <span className="ml-2 text-xs text-muted-foreground hidden sm:inline">⌘↵</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <StartupDocumentsSection startupId={startupId} canManage={true} />
    </div>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const calls = message.metadata?.toolCalls || [];
  return (
    <div
      className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}
      data-testid={`message-${message.role}-${message.id}`}
    >
      {!isUser && (
        <div className="flex-shrink-0 h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
          <Bot className="h-4 w-4 text-primary" />
        </div>
      )}
      <div
        className={`max-w-[80%] space-y-1 ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        <div
          className={`rounded-md px-3 py-2 text-sm whitespace-pre-wrap break-words ${
            isUser ? "bg-primary text-primary-foreground" : "bg-card border"
          }`}
        >
          {message.content}
        </div>
        {!isUser && calls.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {calls.map((c, i) => (
              <Badge
                key={i}
                variant={c.result.ok ? "secondary" : "destructive"}
                className="gap-1 text-xs"
                data-testid={`tool-call-${c.name}-${i}`}
              >
                <Sparkles className="h-3 w-3" />
                {prettyToolLabel(c)}
              </Badge>
            ))}
          </div>
        )}
      </div>
      {isUser && (
        <div className="flex-shrink-0 h-8 w-8 rounded-md bg-muted flex items-center justify-center">
          <UserIcon className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}

function prettyToolLabel(c: ToolCallResult): string {
  switch (c.name) {
    case "update_startup_profile":
      return `Updated profile (${Object.keys(c.args || {}).join(", ")})`;
    case "add_or_update_metric": {
      const a = c.args || {};
      const bits = ["mrr", "revenue", "users", "pilots"]
        .filter((k) => typeof a[k] === "number")
        .map((k) => `${k}=${a[k]}`);
      return `Saved metric ${a.month || ""} ${bits.join(", ")}`.trim();
    }
    case "add_team_member":
      return `Added ${c.args?.fullName || "member"}${c.args?.role ? ` (${c.args.role})` : ""}`;
    case "publish_document":
      return c.args?.isPublic === false
        ? `Hid document`
        : `Published document`;
    default:
      return c.name;
  }
}
