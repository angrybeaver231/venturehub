import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  ArrowLeft,
  MessageSquare,
  Plus,
  Send,
  Lock,
  Pin,
  Eye,
  Clock
} from "lucide-react";
import type { Course, DiscussionForum, DiscussionThread, DiscussionReply } from "@shared/schema";

interface ThreadWithAuthor extends DiscussionThread {
  authorFirstName?: string | null;
  authorLastName?: string | null;
  replyCount?: number;
}

interface ReplyWithAuthor extends DiscussionReply {
  authorFirstName?: string | null;
  authorLastName?: string | null;
}

export default function CourseForum() {
  const { id: courseId } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { user, isLmsAdmin: isAdmin } = useAuth();
  
  const [selectedThread, setSelectedThread] = useState<ThreadWithAuthor | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState("");
  const [newThreadContent, setNewThreadContent] = useState("");
  const [replyContent, setReplyContent] = useState("");

  const { data: course } = useQuery<Course>({
    queryKey: ['/api/courses', courseId],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${courseId}`);
      return res.json();
    },
    enabled: !!courseId,
  });

  const { data: forum, isLoading: forumLoading, error: forumError } = useQuery<DiscussionForum | null>({
    queryKey: ['/api/courses', courseId, 'forum'],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${courseId}/forum`);
      if (res.status === 401) {
        throw new Error("Unauthorized");
      }
      if (res.status === 403) {
        throw new Error("NotEnrolled");
      }
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!courseId && !!user,
  });

  const { data: threads = [], isLoading: threadsLoading, error: threadsError } = useQuery<ThreadWithAuthor[]>({
    queryKey: ['/api/forums', forum?.id, 'threads'],
    queryFn: async () => {
      const res = await fetch(`/api/forums/${forum?.id}/threads`);
      if (res.status === 401 || res.status === 403) {
        throw new Error("Unauthorized");
      }
      if (!res.ok) throw new Error("Failed to load threads");
      return res.json();
    },
    enabled: !!forum?.id,
  });

  const { data: replies = [], isLoading: repliesLoading } = useQuery<ReplyWithAuthor[]>({
    queryKey: ['/api/threads', selectedThread?.id, 'replies'],
    queryFn: async () => {
      const res = await fetch(`/api/threads/${selectedThread?.id}/replies`);
      if (!res.ok) throw new Error("Failed to load replies");
      return res.json();
    },
    enabled: !!selectedThread?.id,
  });

  const createThreadMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/forums/${forum?.id}/threads`, {
        method: "POST",
        body: JSON.stringify({ title: newThreadTitle, content: newThreadContent }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/forums', forum?.id, 'threads'] });
      setCreateDialogOpen(false);
      setNewThreadTitle("");
      setNewThreadContent("");
      toast({
        title: t("success"),
        description: t("threadCreated"),
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: t("unauthorized"),
          description: t("loginRequired"),
          variant: "destructive",
        });
        return;
      }
      toast({
        title: t("error"),
        description: t("failedToCreateThread"),
        variant: "destructive",
      });
    },
  });

  const postReplyMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/threads/${selectedThread?.id}/replies`, {
        method: "POST",
        body: JSON.stringify({ content: replyContent }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/threads', selectedThread?.id, 'replies'] });
      setReplyContent("");
      toast({
        title: t("success"),
        description: t("replyPosted"),
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: t("unauthorized"),
          description: t("loginRequired"),
          variant: "destructive",
        });
        return;
      }
      toast({
        title: t("error"),
        description: t("failedToPostReply"),
        variant: "destructive",
      });
    },
  });

  const formatDate = (date: Date | string | null) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!user) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(`/courses/${courseId}`)} data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("back")}
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{t("loginRequired")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => selectedThread ? setSelectedThread(null) : navigate(`/courses/${courseId}`)} data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("back")}
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="h-6 w-6" />
              {selectedThread ? selectedThread.title : t("discussions")}
            </h1>
            {course && !selectedThread && (
              <p className="text-sm text-muted-foreground">{course.title}</p>
            )}
          </div>
        </div>
        {!selectedThread && forum && (
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-thread">
                <Plus className="h-4 w-4 mr-2" />
                {t("createThread")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("createThread")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">{t("threadTitle")}</label>
                  <Input
                    value={newThreadTitle}
                    onChange={(e) => setNewThreadTitle(e.target.value)}
                    placeholder={t("threadTitle")}
                    data-testid="input-thread-title"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">{t("threadContent")}</label>
                  <Textarea
                    value={newThreadContent}
                    onChange={(e) => setNewThreadContent(e.target.value)}
                    placeholder={t("threadContent")}
                    rows={5}
                    data-testid="input-thread-content"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    {t("cancel")}
                  </Button>
                  <Button
                    onClick={() => createThreadMutation.mutate()}
                    disabled={!newThreadTitle.trim() || !newThreadContent.trim() || createThreadMutation.isPending}
                    data-testid="button-submit-thread"
                  >
                    {t("create")}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {forumLoading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="animate-pulse text-muted-foreground">{t("loading")}</div>
          </CardContent>
        </Card>
      ) : forumError ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {(forumError as Error).message === "NotEnrolled" 
                ? t("mustEnrollToAccess")
                : t("loginRequired")}
            </p>
          </CardContent>
        </Card>
      ) : !forum ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{t("forumNotAvailable")}</p>
          </CardContent>
        </Card>
      ) : selectedThread ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {selectedThread.authorFirstName?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">
                      {selectedThread.authorFirstName && selectedThread.authorLastName
                        ? `${selectedThread.authorFirstName} ${selectedThread.authorLastName}`
                        : "User"}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      {formatDate(selectedThread.createdAt)}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex gap-2">
                  {selectedThread.isPinned && (
                    <Badge variant="secondary">
                      <Pin className="h-3 w-3 mr-1" />
                      {t("pinned")}
                    </Badge>
                  )}
                  {selectedThread.isLocked && (
                    <Badge variant="outline">
                      <Lock className="h-3 w-3 mr-1" />
                      {t("locked")}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{selectedThread.content}</p>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              {t("replies")} ({replies.length})
            </h3>

            {repliesLoading ? (
              <div className="py-8 text-center text-muted-foreground">{t("loading")}</div>
            ) : replies.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  {t("noReplies")}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {replies.map((reply) => {
                  const authorName = reply.authorFirstName && reply.authorLastName
                    ? `${reply.authorFirstName} ${reply.authorLastName}`
                    : "User";
                  return (
                    <Card key={reply.id} data-testid={`reply-${reply.id}`}>
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {reply.authorFirstName?.[0] || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{authorName}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(reply.createdAt)}
                              </span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{reply.content}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {!selectedThread.isLocked && (
              <Card>
                <CardContent className="pt-4">
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {user.firstName?.[0] || user.email?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <Textarea
                        placeholder={t("reply")}
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        rows={3}
                        data-testid="input-reply"
                      />
                      <div className="flex justify-end mt-2">
                        <Button
                          size="sm"
                          onClick={() => postReplyMutation.mutate()}
                          disabled={!replyContent.trim() || postReplyMutation.isPending}
                          data-testid="button-post-reply"
                        >
                          <Send className="h-4 w-4 mr-1" />
                          {t("reply")}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("threads")}</CardTitle>
          </CardHeader>
          <CardContent>
            {threadsLoading ? (
              <div className="py-8 text-center text-muted-foreground">{t("loading")}</div>
            ) : threads.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">{t("noThreads")}</div>
            ) : (
              <ScrollArea className="max-h-[600px]">
                <div className="space-y-2">
                  {threads.map((thread) => {
                    const authorName = thread.authorFirstName && thread.authorLastName
                      ? `${thread.authorFirstName} ${thread.authorLastName}`
                      : "User";
                    return (
                      <div
                        key={thread.id}
                        className="p-4 rounded-lg hover:bg-muted transition-colors cursor-pointer hover-elevate"
                        onClick={() => setSelectedThread(thread)}
                        data-testid={`thread-${thread.id}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {thread.isPinned && <Pin className="h-3 w-3 text-primary" />}
                              {thread.isLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
                              <h4 className="font-medium truncate">{thread.title}</h4>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                              {thread.content}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Avatar className="h-4 w-4">
                                  <AvatarFallback className="text-[8px]">
                                    {thread.authorFirstName?.[0] || "U"}
                                  </AvatarFallback>
                                </Avatar>
                                {authorName}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDate(thread.createdAt)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {thread.viewCount || 0} {t("views")}
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                {thread.replyCount || 0} {t("replies")}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
