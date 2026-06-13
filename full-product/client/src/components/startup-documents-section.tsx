import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  FileText,
  Download,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  TrendingUp,
  Sparkles,
} from "lucide-react";

type StartupDocument = {
  id: string;
  startupId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  title: string | null;
  description: string | null;
  isPublic: boolean;
  aiSummary: string | null;
  extractedTraction: ExtractedTraction | null;
  createdAt: string;
};

type ExtractedTraction = {
  mrr?: number | null;
  arr?: number | null;
  revenue?: number | null;
  revenuePeriod?: string | null;
  users?: number | null;
  activeUsers?: number | null;
  paidCustomers?: number | null;
  pilots?: number | null;
  growthRatePct?: number | null;
  churnPct?: number | null;
  fundingRaisedUsd?: number | null;
  partnerships?: string[];
  highlights?: string[];
  currency?: string | null;
  asOf?: string | null;
  confidence?: number;
};

function formatBytes(b: number): string {
  if (!b) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = b;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

function formatNum(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function StartupDocumentsSection({
  startupId,
  canManage,
  publicOnly = false,
}: {
  startupId: string;
  canManage: boolean;
  publicOnly?: boolean;
}) {
  const { language } = useLanguage();
  const { toast } = useToast();

  const { data: docs = [], isLoading } = useQuery<StartupDocument[]>({
    queryKey: ["/api/startups", startupId, "documents"],
    enabled: !!startupId,
  });

  const visibleDocs = publicOnly ? docs.filter((d) => d.isPublic) : docs;

  const togglePublic = useMutation({
    mutationFn: async ({ id, isPublic }: { id: string; isPublic: boolean }) => {
      const res = await apiRequest(`/api/startups/${startupId}/documents/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isPublic }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/startups", startupId, "documents"] });
    },
    onError: (err: any) =>
      toast({ title: "Error", description: err?.message || "", variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest(`/api/startups/${startupId}/documents/${id}`, {
        method: "DELETE",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/startups", startupId, "documents"] });
      toast({ title: language === "ru" ? "Удалено" : "Deleted" });
    },
  });

  const titleText = publicOnly
    ? language === "ru"
      ? "Документы для инвесторов"
      : "Documents for investors"
    : language === "ru"
    ? "Документы стартапа"
    : "Startup documents";

  const subtitleText = canManage
    ? language === "ru"
      ? "Сделайте документ публичным, чтобы инвесторы видели его на странице стартапа."
      : "Mark a document as public to expose it to investors on the startup page."
    : language === "ru"
    ? "Документы, опубликованные основателями для инвесторов."
    : "Documents the founders shared with investors.";

  if (publicOnly && visibleDocs.length === 0) {
    return null;
  }

  return (
    <Card data-testid="card-startup-documents">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {titleText}
          {canManage && (
            <Badge variant="secondary" className="ml-2">
              {visibleDocs.length}
            </Badge>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{subtitleText}</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : visibleDocs.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-6">
            {language === "ru"
              ? "Пока ничего не загружено. Используйте AI-ассистента выше, чтобы загрузить файл."
              : "Nothing uploaded yet. Use the AI assistant above to add a file."}
          </div>
        ) : (
          <div className="space-y-3">
            {visibleDocs.map((doc) => (
              <DocRow
                key={doc.id}
                startupId={startupId}
                doc={doc}
                canManage={canManage}
                onTogglePublic={(isPublic) => togglePublic.mutate({ id: doc.id, isPublic })}
                onDelete={() => remove.mutate(doc.id)}
                togglePending={togglePublic.isPending}
                deletePending={remove.isPending}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DocRow({
  startupId,
  doc,
  canManage,
  onTogglePublic,
  onDelete,
  togglePending,
  deletePending,
}: {
  startupId: string;
  doc: StartupDocument;
  canManage: boolean;
  onTogglePublic: (isPublic: boolean) => void;
  onDelete: () => void;
  togglePending: boolean;
  deletePending: boolean;
}) {
  const { language } = useLanguage();
  const t = doc.extractedTraction;
  const tractionItems: { label: string; value: string }[] = [];
  if (t) {
    if (t.mrr != null) tractionItems.push({ label: "MRR", value: `${t.currency || ""} ${formatNum(t.mrr)}`.trim() });
    if (t.arr != null) tractionItems.push({ label: "ARR", value: `${t.currency || ""} ${formatNum(t.arr)}`.trim() });
    if (t.users != null) tractionItems.push({ label: language === "ru" ? "Польз." : "Users", value: formatNum(t.users) });
    if (t.activeUsers != null) tractionItems.push({ label: language === "ru" ? "Активные" : "Active", value: formatNum(t.activeUsers) });
    if (t.paidCustomers != null) tractionItems.push({ label: language === "ru" ? "Платящие" : "Paid", value: formatNum(t.paidCustomers) });
    if (t.pilots != null) tractionItems.push({ label: language === "ru" ? "Пилоты" : "Pilots", value: formatNum(t.pilots) });
    if (t.growthRatePct != null) tractionItems.push({ label: language === "ru" ? "Рост" : "Growth", value: `${t.growthRatePct}%` });
    if (t.fundingRaisedUsd != null) tractionItems.push({ label: language === "ru" ? "Раунд" : "Funding", value: `$${formatNum(t.fundingRaisedUsd)}` });
  }

  return (
    <div className="rounded-md border p-3 space-y-2" data-testid={`doc-row-${doc.id}`}>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <a
              href={`/api/startups/${startupId}/documents/${doc.id}/file`}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium hover:underline break-all"
              data-testid={`link-doc-${doc.id}`}
            >
              {doc.title || doc.filename}
            </a>
            {doc.isPublic ? (
              <Badge variant="secondary" className="gap-1">
                <Eye className="h-3 w-3" />
                {language === "ru" ? "Публичный" : "Public"}
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1">
                <EyeOff className="h-3 w-3" />
                {language === "ru" ? "Приватный" : "Private"}
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {doc.filename} · {formatBytes(doc.sizeBytes)} ·{" "}
            {new Date(doc.createdAt).toLocaleDateString()}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <Button asChild variant="ghost" size="sm" data-testid={`button-download-${doc.id}`}>
            <a
              href={`/api/startups/${startupId}/documents/${doc.id}/file`}
              target="_blank"
              rel="noreferrer"
            >
              <Download className="h-4 w-4" />
            </a>
          </Button>
          {canManage && (
            <>
              <div className="flex items-center gap-1.5 px-2">
                <Switch
                  checked={doc.isPublic}
                  onCheckedChange={onTogglePublic}
                  disabled={togglePending}
                  data-testid={`switch-public-${doc.id}`}
                />
                <span className="text-xs text-muted-foreground">
                  {language === "ru" ? "Видят инвесторы" : "Investors see"}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                disabled={deletePending}
                data-testid={`button-delete-${doc.id}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {doc.aiSummary && (
        <div className="text-sm bg-muted/40 rounded-md p-2 flex gap-2">
          <Sparkles className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
          <span className="text-muted-foreground">{doc.aiSummary}</span>
        </div>
      )}

      {tractionItems.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
          {tractionItems.map((item, idx) => (
            <Badge
              key={idx}
              variant="secondary"
              className="gap-1"
              data-testid={`traction-${item.label.toLowerCase()}-${doc.id}`}
            >
              <span className="font-normal text-muted-foreground">{item.label}:</span>
              <span className="font-semibold">{item.value}</span>
            </Badge>
          ))}
          {doc.extractedTraction?.confidence != null && (
            <span className="text-xs text-muted-foreground">
              ({language === "ru" ? "уверенность" : "confidence"}{" "}
              {Math.round((doc.extractedTraction.confidence || 0) * 100)}%)
            </span>
          )}
        </div>
      )}
    </div>
  );
}
