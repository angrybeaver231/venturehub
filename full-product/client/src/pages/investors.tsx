import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Briefcase,
  Plus,
  Loader2,
  Globe,
  MapPin,
  DollarSign,
  TrendingUp,
  User,
  Building2,
} from "lucide-react";
import type { Investor } from "@shared/schema";

const KIND_LABELS_EN: Record<string, string> = {
  vcFund: "VC Fund",
  angel: "Business Angel",
  familyOffice: "Family Office",
  corporateVc: "Corporate VC",
};
const KIND_LABELS_RU: Record<string, string> = {
  vcFund: "Венчурный фонд",
  angel: "Бизнес-ангел",
  familyOffice: "Семейный офис",
  corporateVc: "Корпоративный фонд",
};

const ANGEL_KINDS = new Set(["angel"]);
const FIRM_KINDS = new Set(["vcFund", "corporateVc", "familyOffice"]);

type TabValue = "all" | "angels" | "firms";

function fmtCheck(amount?: number | null): string {
  if (!amount) return "?";
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}k`;
  return `$${amount}`;
}

export default function Investors() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const ru = language === "ru";

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabValue>("all");

  const [name, setName] = useState("");
  const [kind, setKind] = useState<string>("vcFund");
  const [thesis, setThesis] = useState("");
  const [website, setWebsite] = useState("");
  const [hqCity, setHqCity] = useState("");
  const [checkMin, setCheckMin] = useState("");
  const [checkMax, setCheckMax] = useState("");

  const KIND_LABELS = ru ? KIND_LABELS_RU : KIND_LABELS_EN;

  const { data: investors = [], isLoading } = useQuery<Investor[]>({
    queryKey: ["/api/investors"],
    enabled: isAuthenticated,
  });

  const grouped = useMemo(() => {
    const angels = investors.filter((i) => ANGEL_KINDS.has(i.kind));
    const firms = investors.filter((i) => FIRM_KINDS.has(i.kind));
    return { angels, firms };
  }, [investors]);

  const visible = useMemo(() => {
    if (tab === "angels") return grouped.angels;
    if (tab === "firms") return grouped.firms;
    return investors;
  }, [tab, investors, grouped]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/api/investors", {
        method: "POST",
        body: JSON.stringify({
          name,
          kind,
          thesis: thesis || undefined,
          website: website || undefined,
          hqCity: hqCity || undefined,
          checkSizeMin: checkMin ? Number(checkMin) : undefined,
          checkSizeMax: checkMax ? Number(checkMax) : undefined,
        }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investors"] });
      setOpen(false);
      setName("");
      setKind("vcFund");
      setThesis("");
      setWebsite("");
      setHqCity("");
      setCheckMin("");
      setCheckMax("");
      toast({ title: ru ? "Инвестор создан" : "Investor created" });
    },
    onError: (e: any) => {
      toast({ title: t("error"), description: e.message, variant: "destructive" });
    },
  });

  const isAngel = (k: string) => ANGEL_KINDS.has(k);

  const renderInvestorCard = (inv: Investor) => {
    const initials = inv.name.slice(0, 2).toUpperCase();
    const angel = isAngel(inv.kind);
    const KindIcon = angel ? User : Building2;
    const kindLabel = KIND_LABELS[inv.kind] || inv.kind;
    const websiteHost = (() => {
      if (!inv.website) return null;
      try {
        return new URL(inv.website.startsWith("http") ? inv.website : `https://${inv.website}`)
          .hostname;
      } catch {
        return inv.website;
      }
    })();

    return (
      <Link
        key={inv.id}
        href={`/investors/${inv.id}`}
        data-testid={`link-investor-${inv.id}`}
      >
        <Card
          className="hover-elevate cursor-pointer h-full overflow-hidden"
          data-testid={`card-investor-${inv.id}`}
        >
          <CardHeader className="items-center text-center pb-3">
            <div
              className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
              data-testid={`text-investor-kind-tag-${inv.id}`}
            >
              <KindIcon className="h-3 w-3" />
              {kindLabel}
            </div>
            <Avatar className="h-20 w-20 ring-4 ring-primary/10">
              {(inv.logo || (inv as any).creatorImage) ? (
                <AvatarImage src={inv.logo || (inv as any).creatorImage} alt={inv.name} />
              ) : null}
              <AvatarFallback className="bg-primary/15 text-primary text-lg font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <CardTitle
              className="text-lg line-clamp-1"
              data-testid={`text-investor-name-${inv.id}`}
            >
              {inv.name}
            </CardTitle>
            {inv.thesis && (
              <p
                className="text-xs text-muted-foreground line-clamp-2 px-2"
                data-testid={`text-investor-thesis-${inv.id}`}
              >
                {inv.thesis}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="rounded-md border bg-card/40 divide-y divide-border text-sm">
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="text-muted-foreground text-xs">
                  {ru ? "Город" : "HQ"}
                </span>
                <span
                  className="font-medium truncate max-w-[60%]"
                  data-testid={`text-investor-city-${inv.id}`}
                >
                  {inv.hqCity || "—"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="text-muted-foreground text-xs">
                  {ru ? "Чек" : "Check"}
                </span>
                <span
                  className="font-medium tabular-nums"
                  data-testid={`text-investor-check-${inv.id}`}
                >
                  {inv.checkSizeMin || inv.checkSizeMax
                    ? `${fmtCheck(inv.checkSizeMin)} – ${fmtCheck(inv.checkSizeMax)}`
                    : "—"}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {websiteHost && (
                <Badge variant="secondary" data-testid={`badge-investor-site-${inv.id}`}>
                  <Globe className="h-3 w-3 mr-1" />
                  {websiteHost}
                </Badge>
              )}
              {(inv.portfolioCount ?? 0) > 0 && (
                <Badge variant="secondary" data-testid={`badge-investor-portfolio-${inv.id}`}>
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {inv.portfolioCount} {ru ? "портф." : "portfolio"}
                </Badge>
              )}
              {inv.hqCity && (
                <Badge variant="secondary" data-testid={`badge-investor-loc-${inv.id}`}>
                  <MapPin className="h-3 w-3 mr-1" />
                  {inv.hqCity}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  };

  const emptyMsg = (() => {
    if (tab === "angels")
      return ru
        ? "Пока нет бизнес-ангелов. Добавьте первого."
        : "No business angels yet. Add the first one.";
    if (tab === "firms")
      return ru
        ? "Пока нет венчурных фондов. Добавьте первый."
        : "No venture firms yet. Add the first one.";
    return ru ? "Пока нет инвесторов. Добавьте первого." : "No investors yet. Add the first one.";
  })();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="text-3xl font-bold flex items-center gap-2"
            data-testid="text-investors-title"
          >
            <Briefcase className="h-7 w-7" />
            {ru ? "Капитал" : "Capital"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {ru
              ? "Бизнес-ангелы и венчурные фонды на платформе"
              : "Business angels and venture firms on the platform"}
          </p>
        </div>
        <Button onClick={() => setOpen(true)} data-testid="button-create-investor">
          <Plus className="h-4 w-4 mr-1" />
          {ru ? "Добавить" : "Add"}
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)} className="w-full">
        <TabsList data-testid="tabs-investor-kind">
          <TabsTrigger value="all" data-testid="tab-investors-all">
            {ru ? "Все" : "All"}
            <Badge variant="secondary" className="ml-2 text-[10px]">
              {investors.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="angels" data-testid="tab-investors-angels">
            <User className="h-3.5 w-3.5 mr-1" />
            {ru ? "Бизнес-ангелы" : "Business angels"}
            <Badge variant="secondary" className="ml-2 text-[10px]">
              {grouped.angels.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="firms" data-testid="tab-investors-firms">
            <Building2 className="h-3.5 w-3.5 mr-1" />
            {ru ? "Венчурные фонды" : "Venture firms"}
            <Badge variant="secondary" className="ml-2 text-[10px]">
              {grouped.firms.length}
            </Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : visible.length === 0 ? (
        <Card>
          <CardContent className="py-12 flex flex-col items-center text-center">
            {tab === "angels" ? (
              <User className="h-12 w-12 text-muted-foreground mb-4" />
            ) : tab === "firms" ? (
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            ) : (
              <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
            )}
            <p className="text-muted-foreground" data-testid="text-investors-empty">
              {emptyMsg}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map(renderInvestorCard)}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{ru ? "Новый участник" : "New entry"}</DialogTitle>
            <DialogDescription>
              {ru
                ? "Бизнес-ангел или венчурный фонд — выберите тип."
                : "Business angel or venture firm — pick a type."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{ru ? "Название *" : "Name *"}</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="input-investor-name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">{ru ? "Тип" : "Kind"}</label>
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger data-testid="select-investor-kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(KIND_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">
                {ru ? "Инвестиционный тезис" : "Investment thesis"}
              </label>
              <Textarea
                value={thesis}
                onChange={(e) => setThesis(e.target.value)}
                placeholder={
                  ru ? "Что вы ищете и почему..." : "What you look for and why..."
                }
                data-testid="input-investor-thesis"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">{ru ? "Город HQ" : "HQ city"}</label>
                <Input
                  value={hqCity}
                  onChange={(e) => setHqCity(e.target.value)}
                  data-testid="input-investor-city"
                />
              </div>
              <div>
                <label className="text-sm font-medium">{ru ? "Сайт" : "Website"}</label>
                <Input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  data-testid="input-investor-website"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">
                  {ru ? "Чек, мин ($)" : "Check min ($)"}
                </label>
                <Input
                  type="number"
                  value={checkMin}
                  onChange={(e) => setCheckMin(e.target.value)}
                  data-testid="input-investor-check-min"
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  {ru ? "Чек, макс ($)" : "Check max ($)"}
                </label>
                <Input
                  type="number"
                  value={checkMax}
                  onChange={(e) => setCheckMax(e.target.value)}
                  data-testid="input-investor-check-max"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!name || createMutation.isPending}
              data-testid="button-save-investor"
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
