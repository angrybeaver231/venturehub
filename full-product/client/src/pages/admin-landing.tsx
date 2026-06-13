import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Plus, Pencil, Trash2, Globe, ExternalLink, Layout } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DEFAULT_THEME } from "@/lib/landing-blocks";
import type { LandingPage } from "@shared/schema";

export default function AdminLandingPage() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const ru = language === "ru";

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ slug: "", title: "" });
  const [confirmDelete, setConfirmDelete] = useState<LandingPage | null>(null);

  const { data: pages = [], isLoading } = useQuery<LandingPage[]>({
    queryKey: ["/api/admin/landing"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const slug = createForm.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-+|-+$/g, "");
      if (!slug || !createForm.title.trim()) {
        throw new Error(ru ? "Заполните поля" : "Fill in the fields");
      }
      return await apiRequest("/api/admin/landing", {
        method: "POST",
        body: JSON.stringify({
          slug,
          title: createForm.title.trim(),
          sections: [],
          theme: DEFAULT_THEME,
          isPublished: false,
        }),
      });
    },
    onSuccess: async (resp: any) => {
      const created = await (resp as Response).json().catch(() => null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/landing"] });
      setCreateOpen(false);
      setCreateForm({ slug: "", title: "" });
      if (created?.id) setLocation(`/admin/landing/${created.id}`);
    },
    onError: (err: any) => {
      toast({
        title: ru ? "Ошибка" : "Error",
        description: err?.message || (ru ? "Не удалось создать." : "Failed to create."),
        variant: "destructive",
      });
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: async (page: LandingPage) =>
      apiRequest(`/api/admin/landing/${page.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isPublished: !page.isPublished }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/landing"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest(`/api/admin/landing/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/landing"] });
      setConfirmDelete(null);
    },
  });

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-2">
            <Layout className="h-3.5 w-3.5" />
            {ru ? "Конструктор" : "Builder"}
          </div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-admin-landing-title">
            {ru ? "Лендинги событий" : "Event landing pages"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            {ru
              ? "Создавайте посадочные страницы для событий. Опубликованные доступны на /p/{slug} и x.ecfinuni.com."
              : "Create event microsites. Published ones live at /p/{slug} and x.ecfinuni.com."}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} data-testid="button-new-landing">
          <Plus className="h-4 w-4 mr-2" />
          {ru ? "Новый лендинг" : "New landing"}
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-sm">{ru ? "Загрузка..." : "Loading..."}</div>
      ) : pages.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Layout className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">
              {ru ? "Пока нет лендингов." : "No landing pages yet."}
            </p>
            <Button onClick={() => setCreateOpen(true)} data-testid="button-empty-create">
              <Plus className="h-4 w-4 mr-2" />
              {ru ? "Создать первый" : "Create your first"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pages.map((page) => (
            <Card key={page.id} className="overflow-hidden hover-elevate" data-testid={`card-landing-${page.id}`}>
              <CardContent className="p-5 flex flex-col h-full">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <Badge
                    variant={page.isPublished ? "default" : "outline"}
                    className="text-[10px] uppercase tracking-wider"
                  >
                    {page.isPublished ? (ru ? "Опубликовано" : "Published") : (ru ? "Черновик" : "Draft")}
                  </Badge>
                </div>
                <h3 className="font-bold text-lg leading-tight mb-2" data-testid={`text-landing-title-${page.id}`}>
                  {page.title}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4 font-mono">
                  <Globe className="h-3 w-3" />
                  <span className="text-foreground font-semibold">{page.slug}</span>
                  <span>.ecfinuni.com</span>
                </div>
                <div className="text-xs text-muted-foreground mb-4">
                  {(page.sections?.length || 0)} {ru ? "блоков" : "sections"}
                </div>
                <div className="mt-auto flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="default" data-testid={`button-edit-${page.id}`}>
                    <Link href={`/admin/landing/${page.id}`}>
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      {ru ? "Редактор" : "Editor"}
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" data-testid={`button-preview-${page.id}`}>
                    <a href={`/p/${page.slug}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5 mr-1" />
                      {ru ? "Открыть" : "View"}
                    </a>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => togglePublishMutation.mutate(page)}
                    data-testid={`button-toggle-${page.id}`}
                  >
                    {page.isPublished ? (ru ? "Снять" : "Unpublish") : (ru ? "Опубликовать" : "Publish")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setConfirmDelete(page)}
                    data-testid={`button-delete-${page.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{ru ? "Новый лендинг" : "New landing page"}</DialogTitle>
            <DialogDescription>
              {ru
                ? "Поддомен формирует адрес страницы (например, spring.ecfinuni.com)."
                : "The slug becomes the subdomain (e.g. spring.ecfinuni.com)."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                {ru ? "Поддомен" : "Subdomain"} <span className="text-destructive">*</span>
              </label>
              <div className="flex items-center gap-1">
                <Input
                  value={createForm.slug}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                    })
                  }
                  placeholder="spring"
                  data-testid="input-slug"
                />
                <span className="text-sm text-muted-foreground font-mono shrink-0">.ecfinuni.com</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                {ru ? "Название" : "Title"} <span className="text-destructive">*</span>
              </label>
              <Input
                value={createForm.title}
                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                placeholder={ru ? "Spring Conference 2026" : "Spring Conference 2026"}
                data-testid="input-title"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} data-testid="button-cancel">
              {ru ? "Отмена" : "Cancel"}
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              data-testid="button-create"
            >
              {createMutation.isPending ? (ru ? "Создание..." : "Creating...") : (ru ? "Создать" : "Create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{ru ? "Удалить лендинг?" : "Delete landing page?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {ru
                ? `«${confirmDelete?.title}» будет удалён без возможности восстановления.`
                : `"${confirmDelete?.title}" will be permanently deleted.`}
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
