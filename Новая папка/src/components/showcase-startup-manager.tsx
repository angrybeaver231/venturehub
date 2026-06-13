import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Settings, Plus, Pencil, Trash2, ArrowLeft, Upload, Check, X, Loader2, Rocket, Video, FileText, Presentation, Image as ImageIcon, Database, Search, Sparkles, User,
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import type { EventShowcaseStartup, ShowcaseCofounder, InsertEventShowcaseStartup, Startup } from "@shared/schema";

function extOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot).toLowerCase() : "";
}

/** Max showcase upload size (presigned upload bypasses the proxy, so we cap on the client). */
const MAX_SHOWCASE_UPLOAD_BYTES = 200 * 1024 * 1024; // 200MB

/** The standard event branding cover (served from client/public). */
const STANDARD_EVENT_COVER = "/event-cover-default.png";

/**
 * Upload a showcase file straight to object storage via a presigned PUT URL.
 * This bypasses the app/proxy request-size limit (which rejects large videos
 * with a 413), so files upload at full quality with no re-encoding.
 * Returns the public path the file is served at.
 */
async function uploadShowcaseFile(
  eventId: string,
  file: File,
  onProgress?: (ratio: number) => void,
): Promise<string> {
  const res = await fetch(`/api/events/${eventId}/startups/upload-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ ext: extOf(file.name) }),
  });
  if (!res.ok) {
    throw new Error((await res.text()) || res.statusText);
  }
  const { uploadURL, servePath } = (await res.json()) as {
    uploadURL: string;
    servePath: string;
  };

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadURL);
    if (file.type) xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Upload failed (${xhr.status})`));
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(file);
  });

  return servePath;
}

type FormState = {
  name: string;
  shortDescription: string;
  longDescription: string;
  sector: string;
  presentationUrl: string;
  presentationPdfUrl: string;
  presentationPptxUrl: string;
  websiteUrl: string;
  founderName: string;
  founderAvatarUrl: string;
  founderTelegram: string;
  cofounders: ShowcaseCofounder[];
  videoUrl: string;
  logoUrl: string;
  coverImageUrl: string;
  materialImages: string[];
};

const EMPTY_FORM: FormState = {
  name: "",
  shortDescription: "",
  longDescription: "",
  sector: "",
  presentationUrl: "",
  presentationPdfUrl: "",
  presentationPptxUrl: "",
  websiteUrl: "",
  founderName: "",
  founderAvatarUrl: "",
  founderTelegram: "",
  cofounders: [],
  videoUrl: "",
  logoUrl: "",
  coverImageUrl: "",
  materialImages: [],
};

function toForm(s: EventShowcaseStartup): FormState {
  return {
    name: s.name ?? "",
    shortDescription: s.shortDescription ?? "",
    longDescription: s.longDescription ?? "",
    sector: s.sector ?? "",
    presentationUrl: s.presentationUrl ?? "",
    presentationPdfUrl: s.presentationPdfUrl ?? "",
    presentationPptxUrl: s.presentationPptxUrl ?? "",
    websiteUrl: s.websiteUrl ?? "",
    founderName: s.founderName ?? "",
    founderAvatarUrl: s.founderAvatarUrl ?? "",
    founderTelegram: s.founderTelegram ?? "",
    cofounders: (s.cofounders ?? []).map((c) => ({
      name: c.name,
      telegram: c.telegram ?? "",
      avatarUrl: c.avatarUrl ?? "",
    })),
    videoUrl: s.videoUrl ?? "",
    logoUrl: s.logoUrl ?? "",
    coverImageUrl: s.coverImageUrl ?? "",
    materialImages: s.materialImages ?? [],
  };
}

function fromPlatformStartup(s: Startup): FormState {
  return {
    ...EMPTY_FORM,
    name: s.name ?? "",
    shortDescription: s.description ? s.description.slice(0, 160) : "",
    longDescription: s.description ?? "",
    sector: s.vertical ?? "",
    websiteUrl: s.website ?? "",
    presentationUrl: s.pitchDeckUrl ?? "",
    logoUrl: s.logo ?? "",
  };
}

function toPayload(f: FormState): InsertEventShowcaseStartup {
  const clean = (v: string) => (v.trim() === "" ? null : v.trim());
  return {
    name: f.name.trim(),
    shortDescription: clean(f.shortDescription),
    longDescription: clean(f.longDescription),
    sector: clean(f.sector),
    presentationUrl: clean(f.presentationUrl),
    presentationPdfUrl: clean(f.presentationPdfUrl),
    presentationPptxUrl: clean(f.presentationPptxUrl),
    websiteUrl: clean(f.websiteUrl),
    founderName: clean(f.founderName),
    founderAvatarUrl: clean(f.founderAvatarUrl),
    founderTelegram: clean(f.founderTelegram),
    cofounders: f.cofounders
      .filter((c) => c.name.trim() !== "")
      .map((c) => ({
        name: c.name.trim(),
        telegram: (c.telegram ?? "").trim(),
        avatarUrl: (c.avatarUrl ?? "").trim(),
      })),
    videoUrl: clean(f.videoUrl),
    logoUrl: clean(f.logoUrl),
    coverImageUrl: clean(f.coverImageUrl),
    materialImages: f.materialImages,
  } as InsertEventShowcaseStartup;
}

function FileUpload({
  eventId,
  label,
  accept,
  icon: Icon,
  value,
  onUploaded,
  testid,
}: {
  eventId: string;
  label: string;
  accept: string;
  icon: typeof Upload;
  value: string;
  onUploaded: (url: string) => void;
  testid: string;
}) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const ru = language === "ru";
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFile = async (file: File) => {
    if (file.size > MAX_SHOWCASE_UPLOAD_BYTES) {
      toast({
        title: ru ? "Файл слишком большой" : "File too large",
        description: ru
          ? "Максимальный размер файла — 200 МБ."
          : "Maximum file size is 200MB.",
        variant: "destructive",
      });
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setUploading(true);
    setProgress(0);
    try {
      const servePath = await uploadShowcaseFile(eventId, file, (r) =>
        setProgress(Math.round(r * 100)),
      );
      onUploaded(servePath);
      toast({ title: ru ? "Файл загружен" : "File uploaded" });
    } catch (e: any) {
      toast({
        title: ru ? "Ошибка загрузки" : "Upload failed",
        description: e?.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </Label>
      <div className="flex items-center gap-2 flex-wrap">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
          data-testid={`input-file-${testid}`}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          data-testid={`button-upload-${testid}`}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-1" />
          )}
          {uploading
            ? ru
              ? `Загрузка… ${progress}%`
              : `Uploading… ${progress}%`
            : value
            ? ru
              ? "Заменить"
              : "Replace"
            : ru
            ? "Загрузить"
            : "Upload"}
        </Button>
        {value && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Check className="h-3.5 w-3.5 text-green-600" />
            {ru ? "Загружено" : "Uploaded"}
            <button
              type="button"
              onClick={() => onUploaded("")}
              className="ml-1 text-muted-foreground hover:text-destructive"
              data-testid={`button-clear-${testid}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        )}
      </div>
    </div>
  );
}

function MultiImageUpload({
  eventId,
  label,
  values,
  onChange,
  testid,
}: {
  eventId: string;
  label: string;
  values: string[];
  onChange: (urls: string[]) => void;
  testid: string;
}) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const ru = language === "ru";
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: FileList) => {
    const tooBig = Array.from(files).find(
      (f) => f.size > MAX_SHOWCASE_UPLOAD_BYTES,
    );
    if (tooBig) {
      toast({
        title: ru ? "Файл слишком большой" : "File too large",
        description: ru
          ? "Максимальный размер файла — 200 МБ."
          : "Maximum file size is 200MB.",
        variant: "destructive",
      });
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setUploading(true);
    const uploaded: string[] = [];
    try {
      for (const file of Array.from(files)) {
        const servePath = await uploadShowcaseFile(eventId, file);
        uploaded.push(servePath);
      }
      if (uploaded.length) onChange([...values, ...uploaded]);
      toast({ title: ru ? "Изображения загружены" : "Images uploaded" });
    } catch (e: any) {
      toast({
        title: ru ? "Ошибка загрузки" : "Upload failed",
        description: e?.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5">
        <ImageIcon className="h-3.5 w-3.5" />
        {label}
      </Label>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((url, i) => (
            <div key={url + i} className="relative h-20 w-28 rounded-md overflow-hidden border">
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onChange(values.filter((_, idx) => idx !== i))}
                className="absolute top-1 right-1 h-5 w-5 rounded-full bg-background/90 text-muted-foreground hover:text-destructive flex items-center justify-center"
                data-testid={`button-remove-${testid}-${i}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.gif,.webp,image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) handleFiles(e.target.files);
        }}
        data-testid={`input-file-${testid}`}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        data-testid={`button-upload-${testid}`}
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
        ) : (
          <Upload className="h-4 w-4 mr-1" />
        )}
        {ru ? "Добавить изображения" : "Add images"}
      </Button>
    </div>
  );
}

export function ShowcaseStartupManager({
  eventId,
  startups,
}: {
  eventId: string;
  startups: EventShowcaseStartup[];
}) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const ru = language === "ru";

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"list" | "form" | "pick">("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pickSearch, setPickSearch] = useState("");

  const { data: platformStartups = [], isLoading: loadingPlatform } = useQuery<Startup[]>({
    queryKey: ["/api/startups"],
    enabled: open && mode === "pick",
    staleTime: 60_000,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "startups"] });

  const createMutation = useMutation({
    mutationFn: async (payload: InsertEventShowcaseStartup) => {
      const res = await apiRequest(`/api/events/${eventId}/startups`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      toast({ title: ru ? "Проект добавлен" : "Project added" });
      setMode("list");
    },
    onError: (e: Error) =>
      toast({ title: ru ? "Ошибка" : "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: InsertEventShowcaseStartup }) => {
      const res = await apiRequest(`/api/events/${eventId}/startups/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      toast({ title: ru ? "Проект обновлён" : "Project updated" });
      setMode("list");
    },
    onError: (e: Error) =>
      toast({ title: ru ? "Ошибка" : "Error", description: e.message, variant: "destructive" }),
  });

  const generateCoverMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(`/api/events/${eventId}/startups/cover/generate`, {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          shortDescription: form.shortDescription,
          longDescription: form.longDescription,
          sector: form.sector,
        }),
      });
      return (await res.json()) as { url: string };
    },
    onSuccess: (data) => {
      set({ coverImageUrl: data.url });
      toast({ title: ru ? "Обложка сгенерирована" : "Cover generated" });
    },
    onError: (e: Error) =>
      toast({
        title: ru ? "Не удалось сгенерировать обложку" : "Failed to generate cover",
        description: e.message,
        variant: "destructive",
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/api/events/${eventId}/startups/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      invalidate();
      toast({ title: ru ? "Проект удалён" : "Project deleted" });
      setDeleteId(null);
    },
    onError: (e: Error) =>
      toast({ title: ru ? "Ошибка" : "Error", description: e.message, variant: "destructive" }),
  });

  const importMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest(`/api/events/${eventId}/startups/${id}/import-to-platform`, {
        method: "POST",
      });
      return await res.json();
    },
    onSuccess: (res: any) => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["/api/startups"] });
      toast({
        title: res?.alreadyImported
          ? ru ? "Уже на платформе" : "Already on platform"
          : ru ? "Добавлено в базу стартапов" : "Added to startups",
      });
    },
    onError: (e: Error) =>
      toast({ title: ru ? "Ошибка" : "Error", description: e.message, variant: "destructive" }),
  });

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setMode("form");
  };

  const openEdit = (s: EventShowcaseStartup) => {
    setEditingId(s.id);
    setForm(toForm(s));
    setMode("form");
  };

  const openPick = () => {
    setPickSearch("");
    setMode("pick");
  };

  const pickPlatform = (s: Startup) => {
    setEditingId(null);
    setForm(fromPlatformStartup(s));
    setMode("form");
  };

  const filteredPlatform = platformStartups.filter((s) => {
    const q = pickSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      (s.vertical ?? "").toLowerCase().includes(q)
    );
  });

  const submit = () => {
    if (form.name.trim() === "") {
      toast({
        title: ru ? "Введите название" : "Name required",
        variant: "destructive",
      });
      return;
    }
    const payload = toPayload(form);
    if (editingId) updateMutation.mutate({ id: editingId, payload });
    else createMutation.mutate(payload);
  };

  const saving = createMutation.isPending || updateMutation.isPending;
  const set = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }));

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setMode("list");
        }}
      >
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" data-testid={`button-manage-startups-${eventId}`}>
            <Settings className="h-4 w-4 mr-1" />
            {ru ? "Управление" : "Manage"}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
          {mode === "list" ? (
            <>
              <DialogHeader>
                <DialogTitle>{ru ? "Проекты-участники" : "Participating projects"}</DialogTitle>
                <DialogDescription>
                  {ru
                    ? "Добавляйте проекты вручную — они не обязаны быть на платформе."
                    : "Add projects manually — they don't need to exist on the platform."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                {startups.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    {ru ? "Проектов пока нет." : "No projects yet."}
                  </p>
                )}
                {startups.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 rounded-md border p-2.5"
                    data-testid={`row-manage-startup-${s.id}`}
                  >
                    <Avatar className="h-9 w-9 rounded-md shrink-0">
                      {s.logoUrl && <AvatarImage src={s.logoUrl} alt={s.name} />}
                      <AvatarFallback className="rounded-md bg-muted text-muted-foreground">
                        <Rocket className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{s.name}</div>
                      {s.sector && (
                        <Badge variant="outline" className="mt-0.5">
                          <span className="truncate">{s.sector}</span>
                        </Badge>
                      )}
                    </div>
                    {s.platformStartupId ? (
                      <Badge variant="secondary" className="shrink-0 gap-1" data-testid={`badge-on-platform-${s.id}`}>
                        <Check className="h-3 w-3" />
                        {ru ? "На платформе" : "On platform"}
                      </Badge>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        title={ru ? "Добавить в базу стартапов" : "Add to startups"}
                        disabled={importMutation.isPending}
                        onClick={() => importMutation.mutate(s.id)}
                        data-testid={`button-import-startup-${s.id}`}
                      >
                        {importMutation.isPending && importMutation.variables === s.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Rocket className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(s)}
                      data-testid={`button-edit-startup-${s.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(s.id)}
                      data-testid={`button-delete-startup-${s.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={openAdd} className="flex-1" data-testid="button-add-startup">
                  <Plus className="h-4 w-4 mr-1" />
                  {ru ? "Добавить вручную" : "Add manually"}
                </Button>
                <Button onClick={openPick} variant="outline" className="flex-1" data-testid="button-pick-platform-startup">
                  <Database className="h-4 w-4 mr-1" />
                  {ru ? "С платформы" : "From platform"}
                </Button>
              </div>
            </>
          ) : mode === "pick" ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setMode("list")}
                    data-testid="button-back-from-pick"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  {ru ? "Выбрать с платформы" : "Pick from platform"}
                </DialogTitle>
                <DialogDescription>
                  {ru
                    ? "Данные проекта подставятся в форму — их можно отредактировать перед сохранением."
                    : "The project's data will prefill the form — you can edit it before saving."}
                </DialogDescription>
              </DialogHeader>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={pickSearch}
                  onChange={(e) => setPickSearch(e.target.value)}
                  placeholder={ru ? "Поиск по названию или сфере" : "Search by name or sector"}
                  className="pl-9"
                  data-testid="input-pick-search"
                />
              </div>
              <div className="space-y-2 max-h-[55vh] overflow-y-auto">
                {loadingPlatform && (
                  <div className="flex items-center justify-center py-6 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                )}
                {!loadingPlatform && filteredPlatform.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    {ru ? "Стартапы не найдены." : "No startups found."}
                  </p>
                )}
                {filteredPlatform.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => pickPlatform(s)}
                    className="w-full text-left flex items-center gap-3 rounded-md border p-2.5 hover-elevate active-elevate-2"
                    data-testid={`row-platform-startup-${s.id}`}
                  >
                    <Avatar className="h-9 w-9 rounded-md shrink-0">
                      {s.logo && <AvatarImage src={s.logo} alt={s.name} />}
                      <AvatarFallback className="rounded-md bg-muted text-muted-foreground">
                        <Rocket className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{s.name}</div>
                      {s.vertical && (
                        <Badge variant="outline" className="mt-0.5">
                          <span className="truncate">{s.vertical}</span>
                        </Badge>
                      )}
                    </div>
                    <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setMode("list")}
                    data-testid="button-back-to-list"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  {editingId
                    ? ru ? "Редактировать проект" : "Edit project"
                    : ru ? "Новый проект" : "New project"}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="sc-name">{ru ? "Название" : "Name"} *</Label>
                  <Input
                    id="sc-name"
                    value={form.name}
                    onChange={(e) => set({ name: e.target.value })}
                    data-testid="input-startup-name"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <Avatar className="h-14 w-14 rounded-md shrink-0">
                    {form.logoUrl && <AvatarImage src={form.logoUrl} alt={form.name} />}
                    <AvatarFallback className="rounded-md bg-muted text-muted-foreground">
                      <Rocket className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <FileUpload
                    eventId={eventId}
                    label={ru ? "Логотип" : "Logo"}
                    accept=".jpg,.jpeg,.png,.gif,.webp,image/*"
                    icon={ImageIcon}
                    value={form.logoUrl}
                    onUploaded={(url) => set({ logoUrl: url })}
                    testid="logo"
                  />
                </div>

                <div className="space-y-2">
                  <Label>{ru ? "Обложка (изображение сверху)" : "Cover image (top)"}</Label>
                  {form.coverImageUrl && (
                    <div className="relative rounded-md overflow-hidden border">
                      <img
                        src={form.coverImageUrl}
                        alt=""
                        className="w-full max-h-44 object-cover"
                        data-testid="img-cover-preview"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        className="absolute top-2 right-2"
                        onClick={() => set({ coverImageUrl: "" })}
                        data-testid="button-cover-clear"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => generateCoverMutation.mutate()}
                      disabled={!form.name.trim() || generateCoverMutation.isPending}
                      data-testid="button-cover-generate"
                    >
                      {generateCoverMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      {ru ? "Сгенерировать с ИИ" : "Generate with AI"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => set({ coverImageUrl: STANDARD_EVENT_COVER })}
                      data-testid="button-cover-standard"
                    >
                      <ImageIcon className="h-4 w-4" />
                      {ru ? "Стандартная обложка" : "Standard cover"}
                    </Button>
                  </div>
                  {!form.name.trim() && (
                    <p className="text-xs text-muted-foreground">
                      {ru
                        ? "Укажите название проекта, чтобы сгенерировать обложку."
                        : "Enter a project name to generate a cover."}
                    </p>
                  )}
                  <FileUpload
                    eventId={eventId}
                    label={ru ? "…или загрузить свою" : "…or upload your own"}
                    accept=".jpg,.jpeg,.png,.gif,.webp,image/*"
                    icon={Upload}
                    value={form.coverImageUrl}
                    onUploaded={(url) => set({ coverImageUrl: url })}
                    testid="cover"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="sc-short">{ru ? "Краткое описание" : "Short description"}</Label>
                  <Input
                    id="sc-short"
                    value={form.shortDescription}
                    onChange={(e) => set({ shortDescription: e.target.value })}
                    data-testid="input-startup-short"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="sc-long">{ru ? "Подробное описание" : "Long description"}</Label>
                  <Textarea
                    id="sc-long"
                    rows={4}
                    value={form.longDescription}
                    onChange={(e) => set({ longDescription: e.target.value })}
                    data-testid="input-startup-long"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="sc-sector">{ru ? "Сфера / направление" : "Sector / area"}</Label>
                  <Input
                    id="sc-sector"
                    value={form.sector}
                    onChange={(e) => set({ sector: e.target.value })}
                    placeholder={ru ? "Напр. EdTech, FinTech" : "e.g. EdTech, FinTech"}
                    data-testid="input-startup-sector"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="sc-website">{ru ? "Сайт" : "Website"}</Label>
                  <Input
                    id="sc-website"
                    value={form.websiteUrl}
                    onChange={(e) => set({ websiteUrl: e.target.value })}
                    placeholder="example.com"
                    data-testid="input-startup-website"
                  />
                </div>

                <Separator />
                <div className="text-sm font-semibold">{ru ? "Презентация" : "Presentation"}</div>
                <div className="space-y-1.5">
                  <Label htmlFor="sc-pres-link">{ru ? "Ссылка на презентацию" : "Presentation link"}</Label>
                  <Input
                    id="sc-pres-link"
                    value={form.presentationUrl}
                    onChange={(e) => set({ presentationUrl: e.target.value })}
                    placeholder="https://..."
                    data-testid="input-startup-presentation-url"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FileUpload
                    eventId={eventId}
                    label="PDF"
                    accept=".pdf,application/pdf"
                    icon={FileText}
                    value={form.presentationPdfUrl}
                    onUploaded={(url) => set({ presentationPdfUrl: url })}
                    testid="pdf"
                  />
                  <FileUpload
                    eventId={eventId}
                    label="PPTX"
                    accept=".pptx,.ppt"
                    icon={Presentation}
                    value={form.presentationPptxUrl}
                    onUploaded={(url) => set({ presentationPptxUrl: url })}
                    testid="pptx"
                  />
                </div>

                <Separator />
                <div className="text-sm font-semibold">
                  {ru ? "Прикреплённые материалы" : "Attached materials"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {ru
                    ? "Загрузите изображения слайдов — они будут показаны как превью."
                    : "Upload slide images — they will be shown as previews."}
                </p>
                <MultiImageUpload
                  eventId={eventId}
                  label={ru ? "Изображения-материалы" : "Material images"}
                  values={form.materialImages}
                  onChange={(urls) => set({ materialImages: urls })}
                  testid="materials"
                />

                <Separator />
                <div className="text-sm font-semibold">{ru ? "Демо-видео" : "Demo video"}</div>
                <FileUpload
                  eventId={eventId}
                  label={ru ? "Видео (mp4, webm, mov)" : "Video (mp4, webm, mov)"}
                  accept=".mp4,.webm,.mov,.m4v,video/*"
                  icon={Video}
                  value={form.videoUrl}
                  onUploaded={(url) => set({ videoUrl: url })}
                  testid="video"
                />
                {form.videoUrl && (
                  <video src={form.videoUrl} controls playsInline className="w-full rounded-md max-h-64 bg-black" />
                )}

                <Separator />
                <div className="text-sm font-semibold">{ru ? "Команда" : "Team"}</div>
                <div className="flex items-center gap-3">
                  <Avatar className="h-14 w-14 shrink-0">
                    {form.founderAvatarUrl && (
                      <AvatarImage src={form.founderAvatarUrl} alt={form.founderName} />
                    )}
                    <AvatarFallback className="bg-muted text-muted-foreground">
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <FileUpload
                    eventId={eventId}
                    label={ru ? "Аватарка основателя" : "Founder avatar"}
                    accept=".jpg,.jpeg,.png,.gif,.webp,image/*"
                    icon={ImageIcon}
                    value={form.founderAvatarUrl}
                    onUploaded={(url) => set({ founderAvatarUrl: url })}
                    testid="founder-avatar"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="sc-founder">{ru ? "Имя основателя" : "Founder name"}</Label>
                    <Input
                      id="sc-founder"
                      value={form.founderName}
                      onChange={(e) => set({ founderName: e.target.value })}
                      data-testid="input-startup-founder"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sc-founder-tg">{ru ? "Telegram основателя" : "Founder Telegram"}</Label>
                    <Input
                      id="sc-founder-tg"
                      value={form.founderTelegram}
                      onChange={(e) => set({ founderTelegram: e.target.value })}
                      placeholder="@username"
                      data-testid="input-startup-founder-tg"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{ru ? "Сооснователи" : "Co-founders"}</Label>
                  {form.cofounders.map((c, i) => (
                    <div key={i} className="rounded-md border p-3 space-y-2">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 shrink-0">
                          {c.avatarUrl && <AvatarImage src={c.avatarUrl} alt={c.name} />}
                          <AvatarFallback className="bg-muted text-muted-foreground">
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                          <Input
                            value={c.name}
                            onChange={(e) =>
                              set({
                                cofounders: form.cofounders.map((x, idx) =>
                                  idx === i ? { ...x, name: e.target.value } : x
                                ),
                              })
                            }
                            placeholder={ru ? "Имя" : "Name"}
                            className="flex-1 min-w-[120px]"
                            data-testid={`input-cofounder-name-${i}`}
                          />
                          <Input
                            value={c.telegram}
                            onChange={(e) =>
                              set({
                                cofounders: form.cofounders.map((x, idx) =>
                                  idx === i ? { ...x, telegram: e.target.value } : x
                                ),
                              })
                            }
                            placeholder="@username"
                            className="flex-1 min-w-[120px]"
                            data-testid={`input-cofounder-tg-${i}`}
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            set({ cofounders: form.cofounders.filter((_, idx) => idx !== i) })
                          }
                          data-testid={`button-remove-cofounder-${i}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <FileUpload
                        eventId={eventId}
                        label={ru ? "Аватарка" : "Avatar"}
                        accept=".jpg,.jpeg,.png,.gif,.webp,image/*"
                        icon={ImageIcon}
                        value={c.avatarUrl ?? ""}
                        onUploaded={(url) =>
                          set({
                            cofounders: form.cofounders.map((x, idx) =>
                              idx === i ? { ...x, avatarUrl: url } : x
                            ),
                          })
                        }
                        testid={`cofounder-avatar-${i}`}
                      />
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => set({ cofounders: [...form.cofounders, { name: "", telegram: "", avatarUrl: "" }] })}
                    data-testid="button-add-cofounder"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {ru ? "Добавить сооснователя" : "Add co-founder"}
                  </Button>
                </div>

                <Separator />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setMode("list")} data-testid="button-cancel-startup">
                    {ru ? "Отмена" : "Cancel"}
                  </Button>
                  <Button onClick={submit} disabled={saving} data-testid="button-save-startup">
                    {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                    {ru ? "Сохранить" : "Save"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{ru ? "Удалить проект?" : "Delete project?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {ru
                ? "Это действие нельзя отменить."
                : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              {ru ? "Отмена" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              data-testid="button-confirm-delete"
            >
              {ru ? "Удалить" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
