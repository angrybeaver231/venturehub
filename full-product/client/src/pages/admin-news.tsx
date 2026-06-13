import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, Pencil, Trash2, Eye, EyeOff, Image as ImageIcon, ExternalLink, Newspaper } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import type { NewsArticle } from "@shared/schema";

interface FormState {
  title: string;
  excerpt: string;
  body: string;
  coverImage: string;
  category: string;
  isPublished: boolean;
}

const EMPTY: FormState = {
  title: "",
  excerpt: "",
  body: "",
  coverImage: "",
  category: "",
  isPublished: false,
};

export default function AdminNewsPage() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const ru = language === "ru";

  const [editing, setEditing] = useState<NewsArticle | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [confirmDelete, setConfirmDelete] = useState<NewsArticle | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: articles = [], isLoading } = useQuery<NewsArticle[]>({
    queryKey: ["/api/admin/news"],
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  };

  const openEdit = (article: NewsArticle) => {
    setEditing(article);
    setForm({
      title: article.title,
      excerpt: article.excerpt || "",
      body: article.body || "",
      coverImage: article.coverImage || "",
      category: article.category || "",
      isPublished: article.isPublished,
    });
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title.trim(),
        excerpt: form.excerpt.trim() || null,
        body: form.body,
        coverImage: form.coverImage || null,
        category: form.category.trim() || null,
        isPublished: form.isPublished,
        publishedAt: form.isPublished ? new Date().toISOString() : null,
      };
      if (editing) {
        return await apiRequest(`/api/admin/news/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      }
      return await apiRequest("/api/admin/news", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/news"] });
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      setOpen(false);
      toast({
        title: ru ? "Сохранено" : "Saved",
        description: ru ? "Новость успешно сохранена." : "Article saved successfully.",
      });
    },
    onError: (err: any) => {
      toast({
        title: ru ? "Ошибка" : "Error",
        description: err?.message || (ru ? "Не удалось сохранить." : "Failed to save."),
        variant: "destructive",
      });
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: async (article: NewsArticle) => {
      const next = !article.isPublished;
      return await apiRequest(`/api/admin/news/${article.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          isPublished: next,
          publishedAt: next ? new Date().toISOString() : null,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/news"] });
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest(`/api/admin/news/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/news"] });
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      setConfirmDelete(null);
      toast({ title: ru ? "Удалено" : "Deleted" });
    },
  });

  const handleCoverUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/upload/image", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setForm((f) => ({ ...f, coverImage: data.url }));
      toast({ title: ru ? "Изображение загружено" : "Image uploaded" });
    } catch (err: any) {
      toast({
        title: ru ? "Ошибка загрузки" : "Upload failed",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const canSave = form.title.trim().length > 0;

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-2">
            <Newspaper className="h-3.5 w-3.5" />
            {ru ? "Управление" : "Management"}
          </div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-admin-news-title">
            {ru ? "Новости" : "News"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {ru
              ? "Создавайте и редактируйте новости платформы. Опубликованные показываются на /news."
              : "Create and edit platform news. Published items appear on /news."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" data-testid="link-view-news">
            <Link href="/news">
              <ExternalLink className="h-4 w-4 mr-2" />
              {ru ? "Открыть" : "View"}
            </Link>
          </Button>
          <Button onClick={openCreate} data-testid="button-new-article">
            <Plus className="h-4 w-4 mr-2" />
            {ru ? "Новая новость" : "New article"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-sm">{ru ? "Загрузка..." : "Loading..."}</div>
      ) : articles.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Newspaper className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">
              {ru ? "Пока нет новостей." : "No news articles yet."}
            </p>
            <Button onClick={openCreate} data-testid="button-empty-create">
              <Plus className="h-4 w-4 mr-2" />
              {ru ? "Создать первую" : "Create the first one"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {articles.map((article) => (
            <Card
              key={article.id}
              data-testid={`row-article-${article.id}`}
              className="overflow-hidden"
            >
              <CardContent className="p-4 flex items-start gap-4 flex-wrap">
                <div className="h-20 w-32 rounded-md bg-muted shrink-0 overflow-hidden">
                  {article.coverImage ? (
                    <img src={article.coverImage} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {article.category && (
                      <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                        {article.category}
                      </Badge>
                    )}
                    <Badge
                      variant={article.isPublished ? "default" : "outline"}
                      className="text-[10px] uppercase tracking-wider"
                    >
                      {article.isPublished ? (ru ? "Опубликовано" : "Published") : (ru ? "Черновик" : "Draft")}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-base truncate" data-testid={`text-title-${article.id}`}>
                    {article.title}
                  </h3>
                  {article.excerpt && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{article.excerpt}</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => togglePublishMutation.mutate(article)}
                    data-testid={`button-toggle-${article.id}`}
                  >
                    {article.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(article)}
                    data-testid={`button-edit-${article.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmDelete(article)}
                    data-testid={`button-delete-${article.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? (ru ? "Редактировать новость" : "Edit article") : (ru ? "Новая новость" : "New article")}
            </DialogTitle>
            <DialogDescription>
              {ru
                ? "Заполните поля. Опубликованная новость становится видимой всем."
                : "Fill in the fields. Published articles are visible to everyone."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                {ru ? "Заголовок" : "Title"} <span className="text-destructive">*</span>
              </label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder={ru ? "Например: Итоги питч-сессии" : "e.g. Pitch session recap"}
                data-testid="input-title"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">{ru ? "Категория" : "Category"}</label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder={ru ? "События, Стартапы..." : "Events, Startups..."}
                  data-testid="input-category"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.isPublished}
                    onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
                    className="h-4 w-4 accent-primary"
                    data-testid="input-published"
                  />
                  {ru ? "Опубликовать" : "Published"}
                </label>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                {ru ? "Краткое описание" : "Excerpt"}
              </label>
              <Textarea
                value={form.excerpt}
                onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                rows={2}
                placeholder={ru ? "Один абзац для карточки." : "One paragraph for the card."}
                data-testid="input-excerpt"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                {ru ? "Обложка" : "Cover image"}
              </label>
              <div className="flex items-start gap-3 flex-wrap">
                <div className="h-24 w-40 rounded-md bg-muted overflow-hidden border border-border">
                  {form.coverImage ? (
                    <img src={form.coverImage} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleCoverUpload(f);
                      e.target.value = "";
                    }}
                    data-testid="input-cover-file"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    data-testid="button-upload-cover"
                  >
                    <ImageIcon className="h-4 w-4 mr-2" />
                    {uploading ? (ru ? "Загрузка..." : "Uploading...") : (ru ? "Загрузить" : "Upload")}
                  </Button>
                  {form.coverImage && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setForm({ ...form, coverImage: "" })}
                      data-testid="button-clear-cover"
                    >
                      {ru ? "Удалить" : "Clear"}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                {ru ? "Текст новости" : "Body"}
              </label>
              <RichTextEditor
                value={form.body}
                onChange={(v) => setForm({ ...form, body: v })}
                placeholder={ru ? "Текст новости. Можно вставлять изображения." : "Article body. Images supported."}
                minHeight={280}
                data-testid="input-body"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setOpen(false)} data-testid="button-cancel">
              {ru ? "Отмена" : "Cancel"}
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!canSave || saveMutation.isPending}
              data-testid="button-save"
            >
              {saveMutation.isPending ? (ru ? "Сохранение..." : "Saving...") : (ru ? "Сохранить" : "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{ru ? "Удалить новость?" : "Delete this article?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {ru
                ? `Действие нельзя отменить. Новость "${confirmDelete?.title}" будет удалена.`
                : `This action cannot be undone. "${confirmDelete?.title}" will be permanently deleted.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              {ru ? "Отмена" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
              data-testid="button-confirm-delete"
            >
              {ru ? "Удалить" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
