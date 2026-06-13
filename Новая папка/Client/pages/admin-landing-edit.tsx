import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation, useRoute } from "wouter";
import {
  ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Save, Eye, EyeOff,
  Image as ImageIcon, Settings, Layers, Palette, Monitor, ExternalLink,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { LandingRenderer } from "@/components/landing/section-renderer";
import {
  SECTION_LIBRARY, newSection, DEFAULT_THEME,
  type SectionType, type LandingSection, type LandingTheme,
} from "@/lib/landing-blocks";
import type { LandingPage } from "@shared/schema";

async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("image", file);
  const res = await fetch("/api/upload/image", { method: "POST", credentials: "include", body: fd });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.url as string;
}

function ImageField({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <label className="text-xs font-medium mb-1 block uppercase tracking-wider opacity-70">{label}</label>
      <div className="flex items-start gap-2 flex-wrap">
        <div className="h-16 w-24 rounded-md bg-muted overflow-hidden border border-border shrink-0">
          {value ? (
            <img src={value} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <ImageIcon className="h-4 w-4" />
            </div>
          )}
        </div>
        <input
          ref={ref}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            setBusy(true);
            try { onChange(await uploadImage(f)); } finally { setBusy(false); }
          }}
        />
        <div className="flex flex-col gap-1">
          <Button type="button" size="sm" variant="outline" onClick={() => ref.current?.click()} disabled={busy}>
            <ImageIcon className="h-3.5 w-3.5 mr-1" />
            {busy ? "..." : "Upload"}
          </Button>
          {value && (
            <Button type="button" size="sm" variant="ghost" onClick={() => onChange("")}>
              Clear
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionEditor({ section, onChange, ru }: { section: LandingSection; onChange: (data: Record<string, any>) => void; ru: boolean }) {
  const d = section.data || {};
  const set = (k: string, v: any) => onChange({ ...d, [k]: v });
  const setItems = (key: string, items: any[]) => onChange({ ...d, [key]: items });

  const updateItem = (key: string, idx: number, patch: any) => {
    const list = [...(d[key] || [])];
    list[idx] = { ...list[idx], ...patch };
    setItems(key, list);
  };
  const addItem = (key: string, template: any) => setItems(key, [...(d[key] || []), template]);
  const removeItem = (key: string, idx: number) => setItems(key, (d[key] || []).filter((_: any, i: number) => i !== idx));

  switch (section.type) {
    case "hero":
    case "cta":
      return (
        <div className="space-y-3">
          <Input value={d.eyebrow || ""} onChange={(e) => set("eyebrow", e.target.value)} placeholder={ru ? "Надзаголовок" : "Eyebrow"} />
          <Input value={d.title || ""} onChange={(e) => set("title", e.target.value)} placeholder={ru ? "Заголовок" : "Title"} />
          {section.type === "hero" && (
            <Textarea rows={2} value={d.subtitle || ""} onChange={(e) => set("subtitle", e.target.value)} placeholder={ru ? "Описание" : "Subtitle"} />
          )}
          {section.type === "hero" && (
            <div className="grid grid-cols-2 gap-2">
              <Input value={d.date || ""} onChange={(e) => set("date", e.target.value)} placeholder={ru ? "Дата" : "Date"} />
              <Input value={d.location || ""} onChange={(e) => set("location", e.target.value)} placeholder={ru ? "Место" : "Location"} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Input value={d.ctaText || ""} onChange={(e) => set("ctaText", e.target.value)} placeholder={ru ? "Текст кнопки" : "Button text"} />
            <Input value={d.ctaUrl || ""} onChange={(e) => set("ctaUrl", e.target.value)} placeholder="https://..." />
          </div>
          <ImageField value={d.bgImage || ""} onChange={(v) => set("bgImage", v)} label={ru ? "Фон" : "Background image"} />
        </div>
      );

    case "richText":
      return (
        <div className="space-y-3">
          <Input value={d.heading || ""} onChange={(e) => set("heading", e.target.value)} placeholder={ru ? "Заголовок" : "Heading"} />
          <RichTextEditor value={d.body || ""} onChange={(v) => set("body", v)} placeholder={ru ? "Текст..." : "Body..."} minHeight={220} />
        </div>
      );

    case "stats":
      return (
        <div className="space-y-3">
          <Input value={d.heading || ""} onChange={(e) => set("heading", e.target.value)} placeholder={ru ? "Заголовок" : "Heading"} />
          <div className="space-y-2">
            {(d.items || []).map((item: any, i: number) => (
              <div key={i} className="flex gap-2 items-start">
                <Input value={item.value || ""} onChange={(e) => updateItem("items", i, { value: e.target.value })} placeholder="500+" className="w-28" />
                <Input value={item.label || ""} onChange={(e) => updateItem("items", i, { label: e.target.value })} placeholder={ru ? "Подпись" : "Label"} />
                <Button type="button" variant="ghost" size="icon" onClick={() => removeItem("items", i)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button type="button" size="sm" variant="outline" onClick={() => addItem("items", { value: "", label: "" })}>
            <Plus className="h-3.5 w-3.5 mr-1" />{ru ? "Добавить" : "Add"}
          </Button>
        </div>
      );

    case "features":
      return (
        <div className="space-y-3">
          <Input value={d.heading || ""} onChange={(e) => set("heading", e.target.value)} placeholder={ru ? "Заголовок" : "Heading"} />
          <div className="space-y-3">
            {(d.items || []).map((item: any, i: number) => (
              <div key={i} className="p-3 rounded-md border border-border bg-muted/30 space-y-2">
                <div className="flex gap-2">
                  <Input value={item.title || ""} onChange={(e) => updateItem("items", i, { title: e.target.value })} placeholder={ru ? "Название" : "Title"} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeItem("items", i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Textarea rows={2} value={item.description || ""} onChange={(e) => updateItem("items", i, { description: e.target.value })} placeholder={ru ? "Описание" : "Description"} />
              </div>
            ))}
          </div>
          <Button type="button" size="sm" variant="outline" onClick={() => addItem("items", { title: "", description: "" })}>
            <Plus className="h-3.5 w-3.5 mr-1" />{ru ? "Добавить" : "Add"}
          </Button>
        </div>
      );

    case "speakers":
      return (
        <div className="space-y-3">
          <Input value={d.heading || ""} onChange={(e) => set("heading", e.target.value)} placeholder={ru ? "Заголовок" : "Heading"} />
          <div className="space-y-3">
            {(d.items || []).map((item: any, i: number) => (
              <div key={i} className="p-3 rounded-md border border-border bg-muted/30 space-y-2">
                <div className="flex gap-2">
                  <Input value={item.name || ""} onChange={(e) => updateItem("items", i, { name: e.target.value })} placeholder={ru ? "Имя" : "Name"} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeItem("items", i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Input value={item.role || ""} onChange={(e) => updateItem("items", i, { role: e.target.value })} placeholder={ru ? "Должность, компания" : "Role, Company"} />
                <Textarea rows={2} value={item.bio || ""} onChange={(e) => updateItem("items", i, { bio: e.target.value })} placeholder={ru ? "Био" : "Bio"} />
                <ImageField value={item.photo || ""} onChange={(v) => updateItem("items", i, { photo: v })} label={ru ? "Фото" : "Photo"} />
              </div>
            ))}
          </div>
          <Button type="button" size="sm" variant="outline" onClick={() => addItem("items", { name: "", role: "", bio: "", photo: "" })}>
            <Plus className="h-3.5 w-3.5 mr-1" />{ru ? "Спикер" : "Speaker"}
          </Button>
        </div>
      );

    case "schedule":
      return (
        <div className="space-y-3">
          <Input value={d.heading || ""} onChange={(e) => set("heading", e.target.value)} placeholder={ru ? "Заголовок" : "Heading"} />
          <div className="space-y-3">
            {(d.items || []).map((item: any, i: number) => (
              <div key={i} className="p-3 rounded-md border border-border bg-muted/30 space-y-2">
                <div className="flex gap-2">
                  <Input value={item.time || ""} onChange={(e) => updateItem("items", i, { time: e.target.value })} placeholder="10:00" className="w-24" />
                  <Input value={item.title || ""} onChange={(e) => updateItem("items", i, { title: e.target.value })} placeholder={ru ? "Название" : "Title"} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeItem("items", i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Input value={item.speaker || ""} onChange={(e) => updateItem("items", i, { speaker: e.target.value })} placeholder={ru ? "Спикер" : "Speaker"} />
                <Textarea rows={2} value={item.description || ""} onChange={(e) => updateItem("items", i, { description: e.target.value })} placeholder={ru ? "Описание" : "Description"} />
              </div>
            ))}
          </div>
          <Button type="button" size="sm" variant="outline" onClick={() => addItem("items", { time: "", title: "", speaker: "", description: "" })}>
            <Plus className="h-3.5 w-3.5 mr-1" />{ru ? "Сессия" : "Session"}
          </Button>
        </div>
      );

    case "gallery": {
      const images: string[] = d.images || [];
      const add = async (file: File) => {
        try {
          const url = await uploadImage(file);
          set("images", [...images, url]);
        } catch {}
      };
      return (
        <div className="space-y-3">
          <Input value={d.heading || ""} onChange={(e) => set("heading", e.target.value)} placeholder={ru ? "Заголовок" : "Heading"} />
          <div className="grid grid-cols-3 gap-2">
            {images.map((src, i) => (
              <div key={i} className="relative aspect-square rounded-md overflow-hidden bg-muted">
                <img src={src} alt="" className="w-full h-full object-cover" />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6"
                  onClick={() => set("images", images.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <label className="aspect-square rounded-md border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover-elevate">
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={async (e) => {
                  const files = Array.from(e.target.files || []);
                  e.target.value = "";
                  for (const f of files) await add(f);
                }}
              />
            </label>
          </div>
        </div>
      );
    }

    case "partners":
      return (
        <div className="space-y-3">
          <Input value={d.heading || ""} onChange={(e) => set("heading", e.target.value)} placeholder={ru ? "Заголовок" : "Heading"} />
          <div className="space-y-3">
            {(d.logos || []).map((p: any, i: number) => (
              <div key={i} className="p-3 rounded-md border border-border bg-muted/30 space-y-2">
                <div className="flex gap-2">
                  <Input value={p.name || ""} onChange={(e) => updateItem("logos", i, { name: e.target.value })} placeholder={ru ? "Название" : "Name"} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeItem("logos", i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Input value={p.url || ""} onChange={(e) => updateItem("logos", i, { url: e.target.value })} placeholder="https://..." />
                <ImageField value={p.image || ""} onChange={(v) => updateItem("logos", i, { image: v })} label={ru ? "Логотип" : "Logo"} />
              </div>
            ))}
          </div>
          <Button type="button" size="sm" variant="outline" onClick={() => addItem("logos", { name: "", image: "", url: "" })}>
            <Plus className="h-3.5 w-3.5 mr-1" />{ru ? "Партнёр" : "Partner"}
          </Button>
        </div>
      );

    case "faq":
      return (
        <div className="space-y-3">
          <Input value={d.heading || ""} onChange={(e) => set("heading", e.target.value)} placeholder={ru ? "Заголовок" : "Heading"} />
          <div className="space-y-3">
            {(d.items || []).map((item: any, i: number) => (
              <div key={i} className="p-3 rounded-md border border-border bg-muted/30 space-y-2">
                <div className="flex gap-2">
                  <Input value={item.question || ""} onChange={(e) => updateItem("items", i, { question: e.target.value })} placeholder={ru ? "Вопрос" : "Question"} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeItem("items", i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Textarea rows={2} value={item.answer || ""} onChange={(e) => updateItem("items", i, { answer: e.target.value })} placeholder={ru ? "Ответ" : "Answer"} />
              </div>
            ))}
          </div>
          <Button type="button" size="sm" variant="outline" onClick={() => addItem("items", { question: "", answer: "" })}>
            <Plus className="h-3.5 w-3.5 mr-1" />{ru ? "Вопрос" : "Question"}
          </Button>
        </div>
      );

    case "video":
      return (
        <div className="space-y-3">
          <Input value={d.heading || ""} onChange={(e) => set("heading", e.target.value)} placeholder={ru ? "Заголовок" : "Heading"} />
          <Input value={d.url || ""} onChange={(e) => set("url", e.target.value)} placeholder="YouTube / RuTube / Vimeo URL" />
        </div>
      );

    case "footer":
      return (
        <div className="space-y-3">
          <Input value={d.text || ""} onChange={(e) => set("text", e.target.value)} placeholder={ru ? "© Ваше событие" : "© Your event"} />
          <div className="space-y-2">
            {(d.links || []).map((l: any, i: number) => (
              <div key={i} className="flex gap-2">
                <Input value={l.label || ""} onChange={(e) => updateItem("links", i, { label: e.target.value })} placeholder={ru ? "Подпись" : "Label"} />
                <Input value={l.url || ""} onChange={(e) => updateItem("links", i, { url: e.target.value })} placeholder="https://..." />
                <Button type="button" variant="ghost" size="icon" onClick={() => removeItem("links", i)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button type="button" size="sm" variant="outline" onClick={() => addItem("links", { label: "", url: "" })}>
            <Plus className="h-3.5 w-3.5 mr-1" />{ru ? "Ссылка" : "Link"}
          </Button>
        </div>
      );

    default:
      return null;
  }
}

export default function AdminLandingEditPage() {
  const [, params] = useRoute<{ id: string }>("/admin/landing/:id");
  const id = params?.id;
  const { language } = useLanguage();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const ru = language === "ru";

  const { data: page, isLoading } = useQuery<LandingPage>({
    queryKey: ["/api/admin/landing", id],
    enabled: !!id,
  });

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [ogImage, setOgImage] = useState("");
  const [customCss, setCustomCss] = useState("");
  const [theme, setTheme] = useState<LandingTheme>(DEFAULT_THEME);
  const [sections, setSections] = useState<LandingSection[]>([]);
  const [isPublished, setIsPublished] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tab, setTab] = useState<"sections" | "theme" | "seo">("sections");

  useEffect(() => {
    if (page) {
      setTitle(page.title);
      setSlug(page.slug);
      setSeoTitle(page.seoTitle || "");
      setSeoDescription(page.seoDescription || "");
      setOgImage(page.ogImage || "");
      setCustomCss(page.customCss || "");
      setTheme((page.theme as LandingTheme) || DEFAULT_THEME);
      setSections((page.sections as LandingSection[]) || []);
      setIsPublished(page.isPublished);
    }
  }, [page]);

  const saveMutation = useMutation({
    mutationFn: async () =>
      apiRequest(`/api/admin/landing/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title, slug, seoTitle: seoTitle || null, seoDescription: seoDescription || null,
          ogImage: ogImage || null, customCss: customCss || null, theme, sections, isPublished,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/landing"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/landing", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/landing/by-slug", slug] });
      toast({ title: ru ? "Сохранено" : "Saved" });
    },
    onError: (err: any) => toast({
      title: ru ? "Ошибка" : "Error",
      description: err?.message,
      variant: "destructive",
    }),
  });

  const addSection = (type: SectionType) => {
    const s = newSection(type);
    setSections([...sections, s]);
    setActiveId(s.id);
  };
  const updateSection = (id: string, data: Record<string, any>) =>
    setSections(sections.map((s) => (s.id === id ? { ...s, data } : s)));
  const removeSection = (id: string) => {
    setSections(sections.filter((s) => s.id !== id));
    if (activeId === id) setActiveId(null);
  };
  const moveSection = (id: string, dir: -1 | 1) => {
    const idx = sections.findIndex((s) => s.id === id);
    const ni = idx + dir;
    if (ni < 0 || ni >= sections.length) return;
    const next = [...sections];
    [next[idx], next[ni]] = [next[ni], next[idx]];
    setSections(next);
  };

  if (isLoading) {
    return <div className="p-12 text-center text-muted-foreground">{ru ? "Загрузка..." : "Loading..."}</div>;
  }
  if (!page) {
    return <div className="p-12 text-center text-muted-foreground">{ru ? "Не найдено" : "Not found"}</div>;
  }

  const active = sections.find((s) => s.id === activeId) || null;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Left panel: section list + editor */}
      <div className="w-[420px] shrink-0 border-r border-border flex flex-col bg-background">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2 flex-wrap">
          <Button variant="ghost" size="icon" asChild data-testid="link-back">
            <Link href="/admin/landing"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="flex-1 min-w-0">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-8 font-semibold"
              data-testid="input-title"
            />
          </div>
          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            data-testid="button-save"
          >
            <Save className="h-3.5 w-3.5 mr-1" />
            {saveMutation.isPending ? "..." : (ru ? "Сохранить" : "Save")}
          </Button>
        </div>

        <div className="px-4 py-2 border-b border-border flex items-center gap-2 flex-wrap text-xs">
          <Button
            size="sm"
            variant={isPublished ? "default" : "outline"}
            onClick={() => setIsPublished(!isPublished)}
            data-testid="button-publish-toggle"
          >
            {isPublished ? <Eye className="h-3.5 w-3.5 mr-1" /> : <EyeOff className="h-3.5 w-3.5 mr-1" />}
            {isPublished ? (ru ? "Опубликовано" : "Published") : (ru ? "Черновик" : "Draft")}
          </Button>
          <Button size="sm" variant="outline" asChild>
            <a href={`/p/${slug}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5 mr-1" />
              {ru ? "Открыть" : "Preview"}
            </a>
          </Button>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="rounded-none border-b border-border h-10 bg-background w-full">
            <TabsTrigger value="sections" className="flex-1"><Layers className="h-3.5 w-3.5 mr-1" />{ru ? "Блоки" : "Sections"}</TabsTrigger>
            <TabsTrigger value="theme" className="flex-1"><Palette className="h-3.5 w-3.5 mr-1" />{ru ? "Тема" : "Theme"}</TabsTrigger>
            <TabsTrigger value="seo" className="flex-1"><Settings className="h-3.5 w-3.5 mr-1" />SEO</TabsTrigger>
          </TabsList>

          <TabsContent value="sections" className="flex-1 overflow-y-auto m-0 p-3 space-y-3">
            {/* Add section menu */}
            <div className="grid grid-cols-2 gap-1.5">
              {SECTION_LIBRARY.map((meta) => (
                <Button
                  key={meta.type}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addSection(meta.type)}
                  className="justify-start text-xs h-8"
                  data-testid={`button-add-${meta.type}`}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {ru ? meta.labelRu : meta.labelEn}
                </Button>
              ))}
            </div>

            {/* Section list */}
            <div className="space-y-1.5 pt-2">
              {sections.length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-6 border border-dashed border-border rounded-md">
                  {ru ? "Добавьте первый блок выше" : "Add your first section above"}
                </div>
              )}
              {sections.map((s, i) => {
                const meta = SECTION_LIBRARY.find((m) => m.type === s.type);
                const isActive = activeId === s.id;
                return (
                  <div
                    key={s.id}
                    className={`rounded-md border ${isActive ? "border-primary bg-primary/5" : "border-border"}`}
                    data-testid={`section-item-${s.id}`}
                  >
                    <div className="flex items-center gap-1 p-2">
                      <button
                        type="button"
                        onClick={() => setActiveId(isActive ? null : s.id)}
                        className="flex-1 text-left text-sm font-medium truncate hover-elevate rounded px-1 py-0.5"
                      >
                        <span className="text-xs text-muted-foreground mr-1">{i + 1}.</span>
                        {ru ? meta?.labelRu : meta?.labelEn}
                      </button>
                      <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveSection(s.id, -1)}>
                        <ChevronUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveSection(s.id, 1)}>
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeSection(s.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {isActive && (
                      <div className="border-t border-border p-3 space-y-2">
                        <SectionEditor
                          section={s}
                          onChange={(data) => updateSection(s.id, data)}
                          ru={ru}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="theme" className="flex-1 overflow-y-auto m-0 p-4 space-y-4">
            <div>
              <label className="text-xs font-medium uppercase tracking-wider opacity-70 mb-1 block">{ru ? "Поддомен" : "Subdomain"}</label>
              <div className="flex items-center gap-1">
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                  className="font-mono"
                  data-testid="input-slug"
                />
                <span className="text-xs text-muted-foreground font-mono shrink-0">.ecfinuni.com</span>
              </div>
            </div>
            <ColorField label={ru ? "Фон" : "Background"} value={theme.bg} onChange={(v) => setTheme({ ...theme, bg: v })} />
            <ColorField label={ru ? "Текст" : "Text"} value={theme.text} onChange={(v) => setTheme({ ...theme, text: v })} />
            <ColorField label={ru ? "Акцент" : "Accent"} value={theme.accent} onChange={(v) => setTheme({ ...theme, accent: v })} />
            <ColorField label={ru ? "Основной" : "Primary"} value={theme.primary} onChange={(v) => setTheme({ ...theme, primary: v })} />
            <div>
              <label className="text-xs font-medium uppercase tracking-wider opacity-70 mb-1 block">{ru ? "Шрифт" : "Font"}</label>
              <Select value={theme.font} onValueChange={(v: any) => setTheme({ ...theme, font: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="display">Display (Inter)</SelectItem>
                  <SelectItem value="sans">System Sans</SelectItem>
                  <SelectItem value="serif">Serif (Playfair)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wider opacity-70 mb-1 block">{ru ? "Кастомный CSS" : "Custom CSS"}</label>
              <Textarea
                value={customCss}
                onChange={(e) => setCustomCss(e.target.value)}
                rows={6}
                className="font-mono text-xs"
                placeholder=".my-class { color: red; }"
              />
            </div>
          </TabsContent>

          <TabsContent value="seo" className="flex-1 overflow-y-auto m-0 p-4 space-y-3">
            <div>
              <label className="text-xs font-medium uppercase tracking-wider opacity-70 mb-1 block">{ru ? "Title для поисковиков" : "SEO title"}</label>
              <Input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wider opacity-70 mb-1 block">{ru ? "Описание" : "Description"}</label>
              <Textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={3} />
            </div>
            <ImageField value={ogImage} onChange={setOgImage} label={ru ? "OG-картинка" : "OG image"} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Right: live preview */}
      <div className="flex-1 overflow-y-auto bg-zinc-950">
        <div className="bg-zinc-900 border-b border-white/10 px-4 py-2 text-xs font-mono text-white/60 flex items-center gap-2 sticky top-0 z-10">
          <Monitor className="h-3.5 w-3.5" />
          {slug}.ecfinuni.com
        </div>
        {customCss && <style dangerouslySetInnerHTML={{ __html: customCss }} />}
        <LandingRenderer sections={sections} theme={theme} />
        {sections.length === 0 && (
          <div className="p-24 text-center text-white/40">
            <Layers className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">{ru ? "Пустой лендинг — добавьте блоки слева" : "Empty page — add sections from the left panel"}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs font-medium uppercase tracking-wider opacity-70 mb-1 block">{label}</label>
      <div className="flex gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 rounded-md border border-border cursor-pointer bg-background"
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="font-mono" />
      </div>
    </div>
  );
}
