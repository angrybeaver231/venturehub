import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, User, Send, Loader2, X, MessageSquare, Check, Paperclip, File } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface ChatSession {
  id: string;
  type: string;
  status: string;
  eventId?: string;
  eventName?: string;
  messages: Message[];
}

interface AIChatProps {
  eventId?: string;
  type: "event_registration" | "onboarding";
  onClose?: () => void;
  onRegistrationComplete?: (registrationId: string) => void;
}

interface UploadedFile {
  fileName: string;
  filePath: string;
  mimeType: string;
}

export function AIChat({ eventId, type, onClose, onRegistrationComplete }: AIChatProps) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: session, isLoading: sessionLoading } = useQuery<ChatSession>({
    queryKey: ["/api/chat", sessionId],
    enabled: !!sessionId,
    refetchInterval: false,
  });

  const startSessionMutation = useMutation({
    mutationFn: async () => {
      const endpoint = type === "event_registration" 
        ? `/api/chat/event/${eventId}/start`
        : "/api/chat/onboarding/start";
      const res = await apiRequest(endpoint, { method: "POST" });
      return res.json();
    },
    onSuccess: (data: { sessionId: string }) => {
      setSessionId(data.sessionId);
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest(`/api/chat/${sessionId}/message`, {
        method: "POST",
        body: JSON.stringify({ message }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat", sessionId] });
      setIsTyping(false);
    },
    onError: () => {
      setIsTyping(false);
    },
  });

  const completeRegistrationMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(`/api/chat/${sessionId}/complete-registration`, {
        method: "POST",
      });
      return res.json();
    },
    onSuccess: (data: { registrationId?: string }) => {
      if (onRegistrationComplete && data.registrationId) {
        onRegistrationComplete(data.registrationId);
      }
    },
  });

  const uploadFileMutation = useMutation({
    mutationFn: async (file: globalThis.File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await fetch(`/api/chat/${sessionId}/upload`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Upload failed");
      }
      
      return res.json();
    },
    onSuccess: (data: { fileName: string; filePath: string; mimeType: string }) => {
      setUploadedFiles(prev => [...prev, data]);
      toast({
        title: language === "ru" ? "Файл загружен" : "File Uploaded",
        description: data.fileName,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/chat", sessionId] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: language === "ru" ? "Ошибка загрузки" : "Upload Failed",
        description: error.message,
      });
    },
  });

  useEffect(() => {
    if (!sessionId) {
      startSessionMutation.mutate();
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [session?.messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || !sessionId || sendMessageMutation.isPending) return;
    
    const message = inputValue.trim();
    setInputValue("");
    setIsTyping(true);
    
    queryClient.setQueryData<ChatSession>(["/api/chat", sessionId], (old) => {
      if (!old) return old;
      return {
        ...old,
        messages: [
          ...old.messages,
          {
            id: `temp-${Date.now()}`,
            role: "user",
            content: message,
            createdAt: new Date().toISOString(),
          },
        ],
      };
    });

    sendMessageMutation.mutate(message);
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCompleteRegistration = () => {
    if (window.confirm(
      language === "ru" 
        ? "Подтвердить регистрацию на мероприятие?" 
        : "Confirm event registration?"
    )) {
      completeRegistrationMutation.mutate();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!sessionId) {
      toast({
        variant: "destructive",
        title: language === "ru" ? "Ошибка" : "Error",
        description: language === "ru" ? "Сессия чата не готова" : "Chat session not ready",
      });
      e.target.value = "";
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast({
        variant: "destructive",
        title: language === "ru" ? "Файл слишком большой" : "File too large",
        description: language === "ru" ? "Максимальный размер: 10MB" : "Maximum size: 10MB",
      });
      e.target.value = "";
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
      "text/csv",
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast({
        variant: "destructive",
        title: language === "ru" ? "Недопустимый тип файла" : "Invalid file type",
        description: language === "ru" 
          ? "Разрешены: PDF, DOC, DOCX, XLS, XLSX, TXT, CSV, JPG, PNG, GIF, WEBP" 
          : "Allowed: PDF, DOC, DOCX, XLS, XLSX, TXT, CSV, JPG, PNG, GIF, WEBP",
      });
      e.target.value = "";
      return;
    }

    uploadFileMutation.mutate(file);
    e.target.value = "";
  };

  const isLoading = startSessionMutation.isPending || sessionLoading;
  const messages = session?.messages || [];

  return (
    <Card className="w-full max-w-lg mx-auto flex flex-col h-[600px] max-h-[80vh]">
      <CardHeader className="flex flex-row items-center justify-between gap-2 py-3 border-b">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-full bg-primary/10">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">
              {type === "event_registration" 
                ? (language === "ru" ? "Регистрация через чат" : "Chat Registration")
                : (language === "ru" ? "Помощник Клуба" : "Club Assistant")}
            </CardTitle>
            {session?.eventName && (
              <p className="text-xs text-muted-foreground">{session.eventName}</p>
            )}
          </div>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            data-testid="button-close-chat"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full p-4" ref={scrollRef}>
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {messages.map((msg, index) => (
                  <motion.div
                    key={msg.id || index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className={msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary"}>
                        {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`rounded-lg px-4 py-2 max-w-[80%] ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3"
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-secondary">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="rounded-lg px-4 py-2 bg-muted">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>

      <CardFooter className="border-t p-3 flex flex-col gap-2">
        {type === "event_registration" && session?.status === "active" && (
          <Button
            onClick={handleCompleteRegistration}
            disabled={completeRegistrationMutation.isPending || messages.length < 4}
            className="w-full"
            variant="default"
            data-testid="button-complete-registration"
          >
            {completeRegistrationMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            {language === "ru" ? "Подтвердить регистрацию" : "Confirm Registration"}
          </Button>
        )}

        {uploadedFiles.length > 0 && (
          <div className="w-full flex flex-wrap gap-2">
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-1 px-2 py-1 bg-muted rounded-md text-xs"
              >
                <File className="h-3 w-3" />
                <span className="truncate max-w-[100px]">{file.fileName}</span>
              </div>
            ))}
          </div>
        )}
        
        <div className="flex gap-2 w-full">
          {type === "event_registration" && session?.status === "active" && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={!sessionId || uploadFileMutation.isPending}
                data-testid="button-upload-file"
              >
                {uploadFileMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Paperclip className="h-4 w-4" />
                )}
              </Button>
            </>
          )}
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={language === "ru" ? "Введите сообщение..." : "Type a message..."}
            disabled={!sessionId || sendMessageMutation.isPending || session?.status !== "active"}
            data-testid="input-chat-message"
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || !sessionId || sendMessageMutation.isPending}
            size="icon"
            data-testid="button-send-message"
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

interface ChatButtonProps {
  onClick: () => void;
  className?: string;
}

export function OnboardingChatButton({ onClick, className }: ChatButtonProps) {
  const { language } = useLanguage();
  
  return (
    <Button
      onClick={onClick}
      className={className}
      variant="outline"
      data-testid="button-open-onboarding-chat"
    >
      <MessageSquare className="h-4 w-4 mr-2" />
      {language === "ru" ? "Чат с помощником" : "Chat with Assistant"}
    </Button>
  );
}

export function FloatingChatButton({ onClick }: ChatButtonProps) {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="fixed bottom-6 right-6 z-50"
    >
      <Button
        onClick={onClick}
        size="lg"
        className="rounded-full h-14 w-14 shadow-lg hover-elevate"
        data-testid="button-floating-chat"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>
    </motion.div>
  );
}
