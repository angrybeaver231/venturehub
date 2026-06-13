import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Loader2, Send, User, X, Check } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface GroupNumberChatProps {
  onClose: () => void;
  onSaved: (groupNumber: string) => void;
}

export function GroupNumberChat({ onClose, onSaved }: GroupNumberChatProps) {
  const { language, t } = useLanguage();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "intro",
      role: "assistant",
      content: t("groupNumberRequiredIntro"),
    },
  ]);
  const [value, setValue] = useState("");

  const saveMutation = useMutation({
    mutationFn: async (groupNumber: string) => {
      return apiRequest("/api/user/group-number", {
        method: "PATCH",
        body: JSON.stringify({ groupNumber }),
      });
    },
    onSuccess: (_data, variables) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: t("groupNumberSavedRetrying"),
        },
      ]);
      onSaved(variables);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: language === "ru" ? "Ошибка" : "Error",
        description: error?.message || t("somethingWentWrong"),
      });
    },
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, saveMutation.isPending]);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      toast({
        variant: "destructive",
        title: language === "ru" ? "Ошибка" : "Error",
        description: t("groupNumberInvalid"),
      });
      return;
    }
    if (trimmed.length > 32) {
      toast({
        variant: "destructive",
        title: language === "ru" ? "Ошибка" : "Error",
        description: t("groupNumberInvalid"),
      });
      return;
    }
    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: "user", content: trimmed },
    ]);
    setValue("");
    saveMutation.mutate(trimmed);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto flex flex-col h-[480px] max-h-[80vh]" data-testid="card-group-number-chat">
      <CardHeader className="flex flex-row items-center justify-between gap-2 py-3 border-b">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-2 rounded-full bg-primary/10 shrink-0">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <CardTitle className="text-base truncate">{t("groupNumberRequiredTitle")}</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          data-testid="button-close-group-number-chat"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full p-4" ref={scrollRef}>
          <div className="space-y-4">
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
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
                    className={`rounded-md px-4 py-2 max-w-[80%] ${
                      msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap" data-testid={`text-chat-message-${msg.role}`}>
                      {msg.content}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {saveMutation.isPending && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-secondary">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="rounded-md px-4 py-2 bg-muted">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter className="border-t p-3">
        <div className="flex gap-2 w-full">
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKey}
            placeholder={t("groupNumberPlaceholder")}
            disabled={saveMutation.isPending || saveMutation.isSuccess}
            maxLength={32}
            data-testid="input-group-number-chat"
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!value.trim() || saveMutation.isPending || saveMutation.isSuccess}
            size="icon"
            data-testid="button-send-group-number"
            aria-label={t("sendGroupNumber")}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saveMutation.isSuccess ? (
              <Check className="h-4 w-4" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
