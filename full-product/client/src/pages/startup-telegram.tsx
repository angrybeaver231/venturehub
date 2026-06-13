import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Loader2, Send, Copy, ExternalLink, ArrowLeft, Trash2 } from "lucide-react";

type TelegramStatus = {
  botConfigured: boolean;
  provisioningError: string | null;
  botUsername: string | null;
  linkToken: string;
  founderBound: boolean;
  founderTelegramUsername: string | null;
  deepLinkChat: string | null;
  deepLinkPrivate: string | null;
  chats: Array<{
    id: string;
    telegramChatId: string;
    title: string | null;
    chatType: string | null;
    addedAt: string;
    isActive: boolean;
    lastMemberCount: number | null;
  }>;
};

export default function StartupTelegram() {
  const { id } = useParams<{ id: string }>();
  const startupId = id!;
  const { toast } = useToast();
  const { language } = useLanguage();
  const ru = language === "ru";

  const { data, isLoading } = useQuery<TelegramStatus>({
    queryKey: ["/api/startups", startupId, "telegram"],
  });

  const unlinkMutation = useMutation({
    mutationFn: async (telegramChatId: string) => {
      await apiRequest(`/api/startups/${startupId}/telegram/chats/${encodeURIComponent(telegramChatId)}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/startups", startupId, "telegram"] });
      toast({ title: ru ? "Чат отвязан" : "Chat unlinked" });
    },
    onError: (e: any) => toast({ title: ru ? "Ошибка" : "Error", description: e.message, variant: "destructive" }),
  });

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast({ title: ru ? "Скопировано" : "Copied" });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl space-y-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" data-testid="link-back-startup">
          <Link href={`/startups/${startupId}`}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            {ru ? "Назад к стартапу" : "Back to startup"}
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Send className="h-5 w-5" />
          {ru ? "Telegram-бот рабочего пространства" : "Telegram workspace bot"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {ru
            ? "Один бот платформы для команды стартапа. Считает только метаданные — содержимое сообщений никогда не сохраняется."
            : "Single platform bot for your startup team. Only metadata is counted — message content is never stored."}
        </p>
      </div>

      {!data?.botConfigured && (
        <Card className="border-amber-300/40">
          <CardHeader>
            <CardTitle className="text-base">{ru ? "Бот не настроен" : "Bot not configured"}</CardTitle>
            <CardDescription>
              {ru
                ? "Администратор платформы должен задать переменные TELEGRAM_BOT_TOKEN и TELEGRAM_WEBHOOK_SECRET и подключить вебхук."
                : "Platform admin must set TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET and register the webhook."}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{ru ? "1. Привязать командный чат" : "1. Link your team chat"}</CardTitle>
          <CardDescription>
            {ru
              ? "Откройте ссылку в Telegram, выберите чат — бот вступит и автоматически привяжется к стартапу."
              : "Open this link in Telegram, pick your chat — the bot will join and bind itself to your startup."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Input value={data?.deepLinkChat ?? ""} readOnly data-testid="input-deeplink-chat" />
            <Button
              size="icon"
              variant="outline"
              onClick={() => data?.deepLinkChat && copy(data.deepLinkChat)}
              disabled={!data?.deepLinkChat}
              data-testid="button-copy-chat-link"
            >
              <Copy className="h-4 w-4" />
            </Button>
            {data?.deepLinkChat && (
              <Button asChild size="icon" variant="outline" data-testid="link-open-chat-link">
                <a href={data.deepLinkChat} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {ru ? "2. Привязать ваш Telegram" : "2. Link your Telegram account"}
            {data?.founderBound && (
              <Badge data-testid="badge-founder-bound">
                {ru ? "Привязан" : "Linked"}
                {data.founderTelegramUsername ? ` · @${data.founderTelegramUsername}` : ""}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {ru
              ? "Откройте бота в личных сообщениях. После привязки пересылайте посты — они появятся в ленте сигналов. Реакция 🚀 или хэштег #vmu в чате команды отметит сообщение как веху."
              : "Open the bot in private chat. Once linked, forward any post to log it as a signal. A 🚀 reaction or #vmu hashtag in the team chat captures a milestone."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Input value={data?.deepLinkPrivate ?? ""} readOnly data-testid="input-deeplink-private" />
            <Button
              size="icon"
              variant="outline"
              onClick={() => data?.deepLinkPrivate && copy(data.deepLinkPrivate)}
              disabled={!data?.deepLinkPrivate}
              data-testid="button-copy-private-link"
            >
              <Copy className="h-4 w-4" />
            </Button>
            {data?.deepLinkPrivate && (
              <Button asChild size="icon" variant="outline" data-testid="link-open-private-link">
                <a href={data.deepLinkPrivate} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{ru ? "Привязанные чаты" : "Linked chats"}</CardTitle>
        </CardHeader>
        <CardContent>
          {!data?.chats?.length ? (
            <p className="text-sm text-muted-foreground" data-testid="text-no-chats">
              {ru ? "Чаты ещё не привязаны." : "No chats linked yet."}
            </p>
          ) : (
            <div className="space-y-2">
              {data.chats.map((chat) => (
                <div
                  key={chat.id}
                  className="flex items-center justify-between gap-3 rounded-md border p-3"
                  data-testid={`row-chat-${chat.telegramChatId}`}
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate" data-testid={`text-chat-title-${chat.telegramChatId}`}>
                      {chat.title || chat.telegramChatId}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                      {chat.chatType && <Badge variant="secondary">{chat.chatType}</Badge>}
                      {chat.isActive ? (
                        <Badge>{ru ? "Активен" : "Active"}</Badge>
                      ) : (
                        <Badge variant="outline">{ru ? "Отвязан" : "Unlinked"}</Badge>
                      )}
                      {chat.lastMemberCount != null && (
                        <span>{chat.lastMemberCount} {ru ? "участников" : "members"}</span>
                      )}
                    </div>
                  </div>
                  {chat.isActive && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => unlinkMutation.mutate(chat.telegramChatId)}
                      disabled={unlinkMutation.isPending}
                      data-testid={`button-unlink-${chat.telegramChatId}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
