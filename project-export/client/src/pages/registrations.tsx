import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  RichTextEditor,
  type AttachedFile,
} from "@/components/ui/rich-text-editor";
import { EmailPreview, EmailPreviewToggle } from "@/components/email-preview";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isEmailContentEmpty } from "@/lib/emailUtils";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Download,
  Mail,
  Users,
  FileText,
  Shield,
  CheckCircle2,
  XCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  CalendarClock,
  TrendingUp,
  Repeat,
  Sparkles,
  Building2,
  Clock,
  CalendarDays,
  Percent,
  UserPlus,
  Activity,
  Trophy,
  GraduationCap,
  AtSign,
} from "lucide-react";
import type { EventRegistrationWithUser, Event } from "@shared/schema";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Legend,
} from "recharts";

const PAGE_SIZE = 10;
type SortKey = "name" | "date" | "status";
type Range = "7d" | "30d" | "90d" | "all";

// --- shared bits ---------------------------------------------------------

function StatusPill({
  attended,
  time,
}: {
  attended: boolean;
  time?: string | null;
}) {
  if (attended) {
    return (
      <Badge
        className={cn(
          "rounded-full px-3 gap-1 border-0",
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
        )}
      >
        <CheckCircle2 className="h-3 w-3" />
        Attended
        {time && (
          <span className="text-[10px] opacity-75 ml-1">
            {new Date(time).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="rounded-full px-3 gap-1 text-muted-foreground"
    >
      <XCircle className="h-3 w-3" />
      Not yet
    </Badge>
  );
}

function HeroKpiCard({
  label,
  value,
  delta,
  subtitle,
  variant = "default",
  icon: Icon,
  testId,
}: {
  label: string;
  value: number | string;
  delta?: string;
  subtitle?: string;
  variant?: "present" | "absent" | "total" | "default";
  icon: React.ElementType;
  testId?: string;
}) {
  const styles =
    variant === "present"
      ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30"
      : variant === "absent"
      ? "bg-primary/5 border-primary/30"
      : "bg-card";
  const accent =
    variant === "present"
      ? "text-emerald-700 dark:text-emerald-300"
      : variant === "absent"
      ? "text-primary"
      : "text-foreground";

  return (
    <Card className={cn("overflow-hidden", styles)} data-testid={testId}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className={cn("text-sm font-semibold", accent)}>
          {label}
        </CardTitle>
        <div
          className={cn(
            "h-8 w-8 rounded-md flex items-center justify-center bg-background/60",
            accent,
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <span
            className="text-3xl font-bold tabular-nums"
            data-testid={`${testId}-value`}
          >
            {value}
          </span>
          {delta && (
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {delta}
            </span>
          )}
        </div>
        {subtitle && (
          <div className="mt-3 pt-3 border-t border-border/60 text-xs text-muted-foreground">
            {subtitle}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ChartCard({
  title,
  description,
  children,
  testId,
  action,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  testId?: string;
  action?: React.ReactNode;
}) {
  return (
    <Card data-testid={testId}>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-3">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          {description && (
            <CardDescription className="text-xs mt-0.5">
              {description}
            </CardDescription>
          )}
        </div>
        {action}
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

function HBarList({
  data,
  total,
  emptyLabel,
}: {
  data: Array<{ key: string; value: number }>;
  total: number;
  emptyLabel: string;
}) {
  if (data.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center">
        {emptyLabel}
      </div>
    );
  }
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-3">
      {data.map((d) => {
        const pct = Math.round((d.value / max) * 100);
        const sharePct = total > 0 ? Math.round((d.value / total) * 100) : 0;
        return (
          <div key={d.key} className="space-y-1.5 min-w-0">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-medium truncate">{d.key}</span>
              <span className="text-muted-foreground tabular-nums shrink-0">
                {d.value} · {sharePct}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-[width] duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

const PIE_COLORS = [
  "hsl(var(--primary))",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
];

// --- main page -----------------------------------------------------------

export default function Registrations() {
  const { toast } = useToast();
  const { language } = useLanguage();
  const ru = language === "ru";

  // Email/export state (preserved)
  const [isEmailRegistrantsOpen, setIsEmailRegistrantsOpen] = useState(false);
  const [isEmailAllUsersOpen, setIsEmailAllUsersOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailAttachments, setEmailAttachments] = useState<AttachedFile[]>([]);
  const [emailMode, setEmailMode] = useState<"compose" | "preview">("compose");

  // Table state (Attendance tab)
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("date");
  const [statusFilter, setStatusFilter] =
    useState<"all" | "attended" | "notAttended">("all");
  const [page, setPage] = useState(1);

  // Dashboard filters
  const [range, setRange] = useState<Range>("30d");
  const [tab, setTab] = useState<string>("overview");

  const { data: registrationsAll, isLoading, error } = useQuery<
    EventRegistrationWithUser[]
  >({
    queryKey: ["/api/admin/registrations"],
  });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  // Range filter
  const inRange = useMemo(() => {
    if (range === "all") return () => true;
    const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return (iso: string | Date | null) =>
      !!iso && new Date(iso).getTime() >= cutoff;
  }, [range]);

  const registrations = useMemo(
    () => registrationsAll || [],
    [registrationsAll],
  );

  const ranged = useMemo(
    () => registrations.filter((r) => inRange(r.createdAt as any)),
    [registrations, inRange],
  );

  // --- aggregates ---

  const eventMap = useMemo(() => {
    const m = new Map<string, Event>();
    for (const e of events) m.set(e.id, e);
    return m;
  }, [events]);

  const stats = useMemo(() => {
    const total = ranged.length;
    const attended = ranged.filter((r) => r.attendanceMarked).length;
    const notAttended = total - attended;
    const attendanceRate = total > 0 ? Math.round((attended / total) * 100) : 0;
    const uniqueUsers = new Set(
      ranged.map((r) => r.userId || `g:${r.guestEmail}`).filter(Boolean),
    ).size;
    const guestCount = ranged.filter((r) => !r.userId).length;
    const memberCount = total - guestCount;
    const eventsCovered = new Set(ranged.map((r) => r.eventId)).size;
    const avgPerEvent =
      eventsCovered > 0 ? +(total / eventsCovered).toFixed(1) : 0;
    return {
      total,
      attended,
      notAttended,
      attendanceRate,
      uniqueUsers,
      guestCount,
      memberCount,
      eventsCovered,
      avgPerEvent,
    };
  }, [ranged]);

  const orgTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of ranged) {
      const t = r.userOrganizationType || (ru ? "Не указано" : "Not specified");
      counts[t] = (counts[t] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([key, value]) => ({ key, value }))
      .sort((a, b) => b.value - a.value);
  }, [ranged, ru]);

  const topOrgs = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of ranged) {
      const n = (r.userOrganizationName || "").trim();
      if (!n) continue;
      counts[n] = (counts[n] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([key, value]) => ({ key, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [ranged]);

  const emailDomains = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of ranged) {
      const e = r.userEmail || r.guestEmail;
      if (!e) continue;
      const d = e.split("@")[1]?.toLowerCase();
      if (!d) continue;
      counts[d] = (counts[d] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([key, value]) => ({ key, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [ranged]);

  // Per-event aggregates (uses ALL registrations, then filtered by event date if needed)
  const eventBreakdown = useMemo(() => {
    const byEvent = new Map<
      string,
      { regs: number; attended: number; lastReg: number }
    >();
    for (const r of ranged) {
      const cur = byEvent.get(r.eventId) || {
        regs: 0,
        attended: 0,
        lastReg: 0,
      };
      cur.regs += 1;
      if (r.attendanceMarked) cur.attended += 1;
      const t = r.createdAt ? new Date(r.createdAt as any).getTime() : 0;
      if (t > cur.lastReg) cur.lastReg = t;
      byEvent.set(r.eventId, cur);
    }
    return Array.from(byEvent.entries()).map(([id, v]) => {
      const e = eventMap.get(id);
      return {
        id,
        name: e?.name || (ru ? "Удалённое событие" : "Deleted event"),
        date: e?.date || "",
        regs: v.regs,
        attended: v.attended,
        rate: v.regs > 0 ? Math.round((v.attended / v.regs) * 100) : 0,
        lastReg: v.lastReg,
      };
    });
  }, [ranged, eventMap, ru]);

  const topEventsByRegs = useMemo(
    () => [...eventBreakdown].sort((a, b) => b.regs - a.regs).slice(0, 8),
    [eventBreakdown],
  );

  const topEventsByAttendance = useMemo(
    () =>
      [...eventBreakdown]
        .filter((e) => e.regs >= 3)
        .sort((a, b) => b.rate - a.rate)
        .slice(0, 8),
    [eventBreakdown],
  );

  // Top registrants (most events)
  const topRegistrants = useMemo(() => {
    const counts = new Map<
      string,
      { name: string; email: string; events: Set<string>; attended: number }
    >();
    for (const r of ranged) {
      const key = r.userId || `g:${r.guestEmail || ""}`;
      if (!key || key === "g:") continue;
      const name =
        [r.userFirstName || r.guestName, r.userLastName]
          .filter(Boolean)
          .join(" ") ||
        r.userEmail ||
        r.guestEmail ||
        "—";
      const cur = counts.get(key) || {
        name,
        email: r.userEmail || r.guestEmail || "",
        events: new Set<string>(),
        attended: 0,
      };
      cur.events.add(r.eventId);
      if (r.attendanceMarked) cur.attended += 1;
      counts.set(key, cur);
    }
    return Array.from(counts.values())
      .map((v) => ({
        name: v.name,
        email: v.email,
        eventCount: v.events.size,
        attended: v.attended,
      }))
      .sort((a, b) => b.eventCount - a.eventCount)
      .slice(0, 10);
  }, [ranged]);

  const repeatStats = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of ranged) {
      const key = r.userId || `g:${r.guestEmail || ""}`;
      if (!key || key === "g:") continue;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    let single = 0;
    let repeat = 0;
    counts.forEach((c) => {
      if (c <= 1) single += 1;
      else repeat += 1;
    });
    return { single, repeat, total: single + repeat };
  }, [ranged]);

  // --- time series ---

  const dailySeries = useMemo(() => {
    const days =
      range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 60;
    const map = new Map<string, number>();
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      map.set(key, 0);
    }
    for (const r of ranged) {
      if (!r.createdAt) continue;
      const k = new Date(r.createdAt as any).toISOString().slice(0, 10);
      if (map.has(k)) map.set(k, (map.get(k) || 0) + 1);
    }
    let cum = 0;
    return Array.from(map.entries()).map(([date, count]) => {
      cum += count;
      return {
        date: new Date(date).toLocaleDateString(ru ? "ru-RU" : "en-US", {
          month: "short",
          day: "numeric",
        }),
        count,
        cumulative: cum,
      };
    });
  }, [ranged, range, ru]);

  const dayOfWeekSeries = useMemo(() => {
    const labels = ru
      ? ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"]
      : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const counts = new Array(7).fill(0);
    for (const r of ranged) {
      if (!r.createdAt) continue;
      counts[new Date(r.createdAt as any).getDay()] += 1;
    }
    return labels.map((label, i) => ({ day: label, count: counts[i] }));
  }, [ranged, ru]);

  const hourSeries = useMemo(() => {
    const counts = new Array(24).fill(0);
    for (const r of ranged) {
      if (!r.createdAt) continue;
      counts[new Date(r.createdAt as any).getHours()] += 1;
    }
    return counts.map((count, hour) => ({
      hour: `${String(hour).padStart(2, "0")}h`,
      count,
    }));
  }, [ranged]);

  const statusPie = [
    {
      name: ru ? "Присутствовали" : "Attended",
      value: stats.attended,
      color: "#10b981",
    },
    {
      name: ru ? "Не отметились" : "Not yet",
      value: stats.notAttended,
      color: "hsl(var(--primary))",
    },
  ];

  const guestsPie = [
    {
      name: ru ? "Участники" : "Members",
      value: stats.memberCount,
      color: "hsl(var(--primary))",
    },
    {
      name: ru ? "Гости" : "Guests",
      value: stats.guestCount,
      color: "#f59e0b",
    },
  ];

  // Faculty breakdown for FU users only
  const facultyData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of ranged) {
      if (r.userOrganizationType !== "financial_university") continue;
      const f = (r as any).userFaculty || (ru ? "Не указан" : "Unknown");
      counts[f] = (counts[f] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([key, value]) => ({ key, value }))
      .sort((a, b) => b.value - a.value);
  }, [ranged, ru]);

  // --- email/export handlers (unchanged) ---

  const emailRegistrantsMutation = useMutation({
    mutationFn: async ({
      subject,
      message,
    }: {
      subject: string;
      message: string;
    }) => {
      const formData = new FormData();
      formData.append("subject", subject);
      formData.append("message", message);
      emailAttachments.forEach((att) => formData.append("attachments", att.file));
      const response = await fetch("/api/admin/registrations/send-email", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: "Failed" }));
        throw new Error(err.message);
      }
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Success", description: data.message });
      setIsEmailRegistrantsOpen(false);
      setEmailSubject("");
      setEmailMessage("");
      setEmailAttachments([]);
    },
    onError: (e: any) =>
      toast({
        title: "Error",
        description: e.message || "Failed to send email",
        variant: "destructive",
      }),
  });

  const emailAllUsersMutation = useMutation({
    mutationFn: async ({
      subject,
      message,
    }: {
      subject: string;
      message: string;
    }) => {
      const formData = new FormData();
      formData.append("subject", subject);
      formData.append("message", message);
      emailAttachments.forEach((att) => formData.append("attachments", att.file));
      const response = await fetch("/api/admin/users/send-email", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: "Failed" }));
        throw new Error(err.message);
      }
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Sending started", description: data.message });
      setIsEmailAllUsersOpen(false);
      setEmailSubject("");
      setEmailMessage("");
      setEmailAttachments([]);
    },
    onError: (e: any) =>
      toast({
        title: "Error",
        description: e.message || "Failed to send email",
        variant: "destructive",
      }),
  });

  const handleDownloadExcel = async () => {
    try {
      const response = await fetch("/api/admin/registrations/export", {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "registrations.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({ title: "Success", description: "Exported successfully" });
    } catch {
      toast({
        title: "Error",
        description: "Failed to export",
        variant: "destructive",
      });
    }
  };

  // --- attendance table data ---

  const filteredAndSorted = useMemo(() => {
    const list = ranged.filter((r) => {
      if (statusFilter === "attended" && !r.attendanceMarked) return false;
      if (statusFilter === "notAttended" && r.attendanceMarked) return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      const name = `${r.userFirstName || r.guestName || ""} ${
        r.userLastName || ""
      } ${r.userPatronymic || ""}`.toLowerCase();
      const email = (r.userEmail || r.guestEmail || "").toLowerCase();
      const org = (r.userOrganizationName || r.userOrganizationType || "")
        .toLowerCase();
      return name.includes(q) || email.includes(q) || org.includes(q);
    });
    list.sort((a, b) => {
      if (sortBy === "name") {
        const an = (a.userLastName || a.userFirstName || a.guestName || "")
          .toLowerCase();
        const bn = (b.userLastName || b.userFirstName || b.guestName || "")
          .toLowerCase();
        return an.localeCompare(bn);
      }
      if (sortBy === "status")
        return Number(b.attendanceMarked) - Number(a.attendanceMarked);
      const ad = a.createdAt ? new Date(a.createdAt as any).getTime() : 0;
      const bd = b.createdAt ? new Date(b.createdAt as any).getTime() : 0;
      return bd - ad;
    });
    return list;
  }, [ranged, search, sortBy, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageRows = filteredAndSorted.slice(pageStart, pageStart + PAGE_SIZE);

  // --- loading / error ---

  if (isLoading) {
    return (
      <div className="min-h-screen p-3 sm:p-6 md:p-8 overflow-x-hidden">
        <div className="max-w-7xl mx-auto w-full space-y-6">
          <div className="h-9 w-48 bg-muted rounded-md animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-28 bg-muted rounded-md animate-pulse" />
            ))}
          </div>
          <div className="h-96 bg-muted rounded-md animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    const msg = (error as any)?.message || "";
    const isAuthError = /\b(401|403)\b/.test(msg);
    return (
      <div className="min-h-screen p-3 sm:p-6 md:p-8 overflow-x-hidden">
        <div className="max-w-7xl mx-auto w-full">
          <Card className="bg-destructive/10 border-destructive/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Shield className="w-6 h-6" />
                {isAuthError
                  ? ru
                    ? "Доступ запрещён"
                    : "Access Denied"
                  : ru
                  ? "Не удалось загрузить данные"
                  : "Could not load data"}
              </CardTitle>
              <CardDescription>
                {isAuthError
                  ? ru
                    ? "У вас нет прав для просмотра этой страницы."
                    : "You do not have permission to access this page."
                  : ru
                  ? "Проверьте подключение и попробуйте обновить страницу."
                  : "Check your connection and try refreshing the page."}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  // --- render ---

  return (
    <div className="min-h-screen p-3 sm:p-6 md:p-8 overflow-x-hidden">
      <div className="max-w-7xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground mb-1">
              {ru ? "Отчёты / Данные" : "Reports / Data"}
            </div>
            <h1
              className="text-2xl sm:text-3xl font-bold"
              data-testid="text-page-title"
            >
              {ru ? "Данные" : "Data"}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {ru
                ? "Расширенная аналитика по регистрациям и участию в событиях"
                : "Extended analytics for event registrations and attendance"}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <Select
              value={range}
              onValueChange={(v) => setRange(v as Range)}
            >
              <SelectTrigger
                className="w-[140px]"
                data-testid="select-range"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">{ru ? "7 дней" : "Last 7 days"}</SelectItem>
                <SelectItem value="30d">{ru ? "30 дней" : "Last 30 days"}</SelectItem>
                <SelectItem value="90d">{ru ? "90 дней" : "Last 90 days"}</SelectItem>
                <SelectItem value="all">{ru ? "Всё время" : "All time"}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleDownloadExcel}
              className="gap-2"
              variant="outline"
              data-testid="button-export-excel"
            >
              <Download className="w-4 h-4" />
              {ru ? "Экспорт" : "Export"}
            </Button>
            <Dialog
              open={isEmailRegistrantsOpen}
              onOpenChange={(open) => {
                setIsEmailRegistrantsOpen(open);
                if (open) setEmailMode("compose");
              }}
            >
              <DialogTrigger asChild>
                <Button className="gap-2" data-testid="button-email-registrants">
                  <Mail className="w-4 h-4" />
                  {ru ? "Письмо участникам" : "Email Registrants"}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
                  <div>
                    <DialogTitle>
                      {ru
                        ? "Письмо зарегистрированным"
                        : "Send Email to Registered Users"}
                    </DialogTitle>
                    <DialogDescription>
                      {ru
                        ? "Отправить email всем, кто зарегистрировался на события"
                        : "Send an email to all registered users"}
                    </DialogDescription>
                  </div>
                  <EmailPreviewToggle
                    mode={emailMode}
                    onToggleMode={setEmailMode}
                  />
                </DialogHeader>
                {emailMode === "compose" ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="subject-registrants">
                        {ru ? "Тема" : "Subject"}
                      </Label>
                      <Input
                        id="subject-registrants"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        data-testid="input-email-subject"
                      />
                    </div>
                    <RichTextEditor
                      value={emailMessage}
                      onChange={setEmailMessage}
                      placeholder="..."
                      data-testid="textarea-email-message"
                      showAttachments
                      attachments={emailAttachments}
                      onAttachmentsChange={setEmailAttachments}
                      minHeight={300}
                    />
                  </div>
                ) : (
                  <EmailPreview
                    htmlContent={emailMessage}
                    subject={emailSubject}
                    attachments={emailAttachments}
                  />
                )}
                <DialogFooter>
                  <Button
                    onClick={() =>
                      emailRegistrantsMutation.mutate({
                        subject: emailSubject,
                        message: emailMessage,
                      })
                    }
                    disabled={
                      emailRegistrantsMutation.isPending ||
                      !emailSubject ||
                      isEmailContentEmpty(emailMessage)
                    }
                    data-testid="button-send-email-registrants"
                  >
                    {emailRegistrantsMutation.isPending
                      ? ru
                        ? "Отправка..."
                        : "Sending..."
                      : ru
                      ? "Отправить"
                      : "Send Email"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog
              open={isEmailAllUsersOpen}
              onOpenChange={(open) => {
                setIsEmailAllUsersOpen(open);
                if (open) setEmailMode("compose");
              }}
            >
              <DialogTrigger asChild>
                <Button
                  className="gap-2"
                  variant="secondary"
                  data-testid="button-email-all-users"
                >
                  <FileText className="w-4 h-4" />
                  {ru ? "Письмо всем" : "Email All"}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
                  <div>
                    <DialogTitle>
                      {ru
                        ? "Письмо всем пользователям"
                        : "Send Email to All Platform Users"}
                    </DialogTitle>
                    <DialogDescription>
                      {ru
                        ? "Отправить email всем зарегистрированным на платформе"
                        : "Send an email to all platform users"}
                    </DialogDescription>
                  </div>
                  <EmailPreviewToggle
                    mode={emailMode}
                    onToggleMode={setEmailMode}
                  />
                </DialogHeader>
                {emailMode === "compose" ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="subject-all">
                        {ru ? "Тема" : "Subject"}
                      </Label>
                      <Input
                        id="subject-all"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        data-testid="input-email-subject-all"
                      />
                    </div>
                    <RichTextEditor
                      value={emailMessage}
                      onChange={setEmailMessage}
                      placeholder="..."
                      data-testid="textarea-email-message-all"
                      showAttachments
                      attachments={emailAttachments}
                      onAttachmentsChange={setEmailAttachments}
                      minHeight={300}
                    />
                  </div>
                ) : (
                  <EmailPreview
                    htmlContent={emailMessage}
                    subject={emailSubject}
                    attachments={emailAttachments}
                  />
                )}
                <DialogFooter>
                  <Button
                    onClick={() =>
                      emailAllUsersMutation.mutate({
                        subject: emailSubject,
                        message: emailMessage,
                      })
                    }
                    disabled={
                      emailAllUsersMutation.isPending ||
                      !emailSubject ||
                      isEmailContentEmpty(emailMessage)
                    }
                    data-testid="button-send-email-all"
                  >
                    {emailAllUsersMutation.isPending
                      ? ru
                        ? "Отправка..."
                        : "Sending..."
                      : ru
                      ? "Отправить"
                      : "Send Email"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          <TabsList
            className="flex w-full flex-wrap h-auto justify-start gap-1 bg-muted/40 p-1"
            data-testid="tabs-data"
          >
            <TabsTrigger value="overview" data-testid="tab-overview">
              <Activity className="h-4 w-4 mr-1.5" />
              {ru ? "Обзор" : "Overview"}
            </TabsTrigger>
            <TabsTrigger value="trends" data-testid="tab-trends">
              <TrendingUp className="h-4 w-4 mr-1.5" />
              {ru ? "Тренды" : "Trends"}
            </TabsTrigger>
            <TabsTrigger value="demographics" data-testid="tab-demographics">
              <Users className="h-4 w-4 mr-1.5" />
              {ru ? "Демография" : "Demographics"}
            </TabsTrigger>
            <TabsTrigger value="events" data-testid="tab-events">
              <CalendarDays className="h-4 w-4 mr-1.5" />
              {ru ? "Cобытия" : "Events"}
            </TabsTrigger>
            <TabsTrigger value="people" data-testid="tab-people">
              <Trophy className="h-4 w-4 mr-1.5" />
              {ru ? "Люди" : "People"}
            </TabsTrigger>
            <TabsTrigger value="attendance" data-testid="tab-attendance">
              <UserCheck className="h-4 w-4 mr-1.5" />
              {ru ? "Посещаемость" : "Attendance"}
            </TabsTrigger>
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="space-y-6 mt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <HeroKpiCard
                label={ru ? "Всего регистраций" : "Total Registrations"}
                value={stats.total}
                variant="total"
                icon={Users}
                subtitle={`${stats.uniqueUsers} ${
                  ru ? "уникальных людей" : "unique people"
                }`}
                testId="kpi-total"
              />
              <HeroKpiCard
                label={ru ? "Присутствовали" : "Present"}
                value={stats.attended}
                variant="present"
                icon={UserCheck}
                subtitle={`${stats.attendanceRate}% ${
                  ru ? "посещаемость" : "attendance rate"
                }`}
                testId="kpi-present"
              />
              <HeroKpiCard
                label={ru ? "Не отметились" : "Not Yet"}
                value={stats.notAttended}
                variant="absent"
                icon={UserX}
                subtitle={ru ? "Ожидают чек-ина" : "Pending check-in"}
                testId="kpi-absent"
              />
              <HeroKpiCard
                label={ru ? "Событий охвачено" : "Events Covered"}
                value={stats.eventsCovered}
                icon={CalendarClock}
                subtitle={`${stats.avgPerEvent} ${
                  ru ? "средн. на событие" : "avg per event"
                }`}
                testId="kpi-events"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <ChartCard
                title={ru ? "Посещаемость" : "Attendance Status"}
                description={
                  ru
                    ? "Доля присутствовавших и не отметившихся"
                    : "Share of present vs not yet"
                }
                testId="chart-status-pie"
              >
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={statusPie}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {statusPie.map((s, i) => (
                        <Cell key={i} fill={s.color} />
                      ))}
                    </Pie>
                    <RTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title={ru ? "Гости и участники" : "Guests vs Members"}
                description={
                  ru
                    ? "Кто регистрировался: профили или гости"
                    : "Profile users vs guest sign-ups"
                }
                testId="chart-guests-pie"
              >
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={guestsPie}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {guestsPie.map((s, i) => (
                        <Cell key={i} fill={s.color} />
                      ))}
                    </Pie>
                    <RTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title={ru ? "Топ-5 событий" : "Top 5 Events"}
                description={ru ? "По числу регистраций" : "By registration count"}
                testId="chart-top-events-mini"
              >
                <HBarList
                  data={topEventsByRegs.slice(0, 5).map((e) => ({
                    key: e.name,
                    value: e.regs,
                  }))}
                  total={stats.total}
                  emptyLabel={ru ? "Нет данных" : "No data"}
                />
              </ChartCard>
            </div>

            <ChartCard
              title={ru ? "Регистрации по дням" : "Registrations Over Time"}
              description={
                ru
                  ? "Ежедневный поток регистраций за выбранный период"
                  : "Daily registration flow for the selected range"
              }
              testId="chart-overview-timeline"
            >
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={dailySeries}>
                  <defs>
                    <linearGradient id="reg" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="hsl(var(--primary))"
                        stopOpacity={0.4}
                      />
                      <stop
                        offset="95%"
                        stopColor="hsl(var(--primary))"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <RTooltip />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--primary))"
                    fill="url(#reg)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </TabsContent>

          {/* TRENDS */}
          <TabsContent value="trends" className="space-y-6 mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard
                title={ru ? "Поток регистраций" : "Registration Flow"}
                description={ru ? "По дням" : "Daily count"}
                testId="chart-daily"
              >
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={dailySeries}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <RTooltip />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title={ru ? "Накопительно" : "Cumulative"}
                description={ru ? "Общий рост" : "Total over time"}
                testId="chart-cumulative"
              >
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={dailySeries}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <RTooltip />
                    <Line
                      type="monotone"
                      dataKey="cumulative"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title={ru ? "По дням недели" : "Day of Week"}
                description={
                  ru
                    ? "Когда люди чаще регистрируются"
                    : "When people register most"
                }
                testId="chart-dow"
              >
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={dayOfWeekSeries}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <RTooltip />
                    <Bar
                      dataKey="count"
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title={ru ? "По часам" : "Hour of Day"}
                description={
                  ru ? "Время отправки регистраций" : "Registration submit time"
                }
                testId="chart-hour"
              >
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={hourSeries}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      dataKey="hour"
                      tick={{ fontSize: 10 }}
                      interval={1}
                    />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <RTooltip />
                    <Bar
                      dataKey="count"
                      fill="#8b5cf6"
                      radius={[3, 3, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </TabsContent>

          {/* DEMOGRAPHICS */}
          <TabsContent value="demographics" className="space-y-6 mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard
                title={ru ? "Тип организации" : "Organization Type"}
                description={
                  ru
                    ? "Распределение по типу организации"
                    : "Breakdown by org type"
                }
                testId="chart-org-type"
              >
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={orgTypeCounts.map((d) => ({
                        name: d.key,
                        value: d.value,
                      }))}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={90}
                      label={(e) => `${e.name}`}
                    >
                      {orgTypeCounts.map((_, i) => (
                        <Cell
                          key={i}
                          fill={PIE_COLORS[i % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <RTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title={ru ? "Топ организаций" : "Top Organizations"}
                description={
                  ru
                    ? "Самые активные организации"
                    : "Most active organizations"
                }
                testId="chart-top-orgs"
              >
                <HBarList
                  data={topOrgs}
                  total={stats.total}
                  emptyLabel={
                    ru
                      ? "Организации не указаны"
                      : "No organizations recorded"
                  }
                />
              </ChartCard>

              <ChartCard
                title={ru ? "Факультеты ФУ" : "FU Faculties"}
                description={
                  ru
                    ? "Только студенты Финансового университета"
                    : "Financial University students only"
                }
                testId="chart-faculties"
                action={<GraduationCap className="h-4 w-4 text-muted-foreground" />}
              >
                <HBarList
                  data={facultyData}
                  total={facultyData.reduce((s, d) => s + d.value, 0)}
                  emptyLabel={
                    ru ? "Нет данных по ФУ" : "No FU registrations"
                  }
                />
              </ChartCard>

              <ChartCard
                title={ru ? "Email-домены" : "Email Domains"}
                description={
                  ru
                    ? "По домену почты участников"
                    : "By registrant email domain"
                }
                testId="chart-email-domains"
                action={<AtSign className="h-4 w-4 text-muted-foreground" />}
              >
                <HBarList
                  data={emailDomains}
                  total={stats.total}
                  emptyLabel={ru ? "Нет данных" : "No data"}
                />
              </ChartCard>
            </div>
          </TabsContent>

          {/* EVENTS */}
          <TabsContent value="events" className="space-y-6 mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard
                title={ru ? "Топ событий по регистрациям" : "Top Events by Registrations"}
                testId="chart-top-events-bar"
              >
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={topEventsByRegs}
                    layout="vertical"
                    margin={{ left: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      width={140}
                    />
                    <RTooltip />
                    <Bar
                      dataKey="regs"
                      fill="hsl(var(--primary))"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title={
                  ru
                    ? "Лучшая посещаемость (от 3 регистраций)"
                    : "Best Attendance (3+ regs)"
                }
                testId="chart-best-attendance"
                action={<Percent className="h-4 w-4 text-muted-foreground" />}
              >
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={topEventsByAttendance}
                    layout="vertical"
                    margin={{ left: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      width={140}
                    />
                    <RTooltip formatter={(v: any) => `${v}%`} />
                    <Bar
                      dataKey="rate"
                      fill="#10b981"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {ru ? "Сводка по событиям" : "Per-Event Breakdown"}
                </CardTitle>
                <CardDescription>
                  {eventBreakdown.length}{" "}
                  {ru ? "событий с регистрациями" : "events with registrations"}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{ru ? "Событие" : "Event"}</TableHead>
                        <TableHead className="text-right">
                          {ru ? "Регистрации" : "Regs"}
                        </TableHead>
                        <TableHead className="text-right">
                          {ru ? "Пришло" : "Attended"}
                        </TableHead>
                        <TableHead className="text-right">
                          {ru ? "% посещ." : "Rate"}
                        </TableHead>
                        <TableHead className="text-right pr-4">
                          {ru ? "Последняя" : "Last reg"}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {eventBreakdown.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-center text-muted-foreground py-12"
                          >
                            {ru ? "Нет регистраций" : "No registrations yet"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        [...eventBreakdown]
                          .sort((a, b) => b.regs - a.regs)
                          .map((e) => (
                            <TableRow key={e.id} data-testid={`row-event-${e.id}`}>
                              <TableCell className="max-w-[300px]">
                                <div className="font-medium truncate">{e.name}</div>
                                {e.date && (
                                  <div className="text-xs text-muted-foreground">
                                    {e.date}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-right tabular-nums font-medium">
                                {e.regs}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {e.attended}
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "tabular-nums",
                                    e.rate >= 70 &&
                                      "text-emerald-700 border-emerald-300 dark:text-emerald-300 dark:border-emerald-500/40",
                                  )}
                                >
                                  {e.rate}%
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right pr-4 text-xs text-muted-foreground whitespace-nowrap">
                                {e.lastReg
                                  ? new Date(e.lastReg).toLocaleDateString()
                                  : "—"}
                              </TableCell>
                            </TableRow>
                          ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PEOPLE */}
          <TabsContent value="people" className="space-y-6 mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <HeroKpiCard
                label={ru ? "Уникальных людей" : "Unique People"}
                value={stats.uniqueUsers}
                icon={Users}
                subtitle={`${stats.guestCount} ${ru ? "гостей" : "guests"}`}
                testId="kpi-unique"
              />
              <HeroKpiCard
                label={ru ? "Повторные участники" : "Repeat Attendees"}
                value={repeatStats.repeat}
                icon={Repeat}
                subtitle={
                  repeatStats.total > 0
                    ? `${Math.round(
                        (repeatStats.repeat / repeatStats.total) * 100,
                      )}% ${ru ? "от всех" : "of all"}`
                    : ""
                }
                testId="kpi-repeat"
              />
              <HeroKpiCard
                label={ru ? "Разовые участники" : "One-Time Attendees"}
                value={repeatStats.single}
                icon={UserPlus}
                subtitle={ru ? "Зарегистрировались впервые" : "First-timers"}
                testId="kpi-single"
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-primary" />
                  {ru ? "Самые активные" : "Top Registrants"}
                </CardTitle>
                <CardDescription>
                  {ru
                    ? "Кто посетил больше всего событий"
                    : "Most active people by event count"}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>{ru ? "Имя" : "Name"}</TableHead>
                        <TableHead className="text-right">
                          {ru ? "Событий" : "Events"}
                        </TableHead>
                        <TableHead className="text-right pr-4">
                          {ru ? "Пришло" : "Attended"}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topRegistrants.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="text-center text-muted-foreground py-12"
                          >
                            {ru ? "Нет данных" : "No data yet"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        topRegistrants.map((p, i) => (
                          <TableRow
                            key={`${p.email}-${i}`}
                            data-testid={`row-top-registrant-${i}`}
                          >
                            <TableCell className="font-semibold tabular-nums text-muted-foreground">
                              {i + 1}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3 min-w-0">
                                <Avatar className="h-8 w-8 shrink-0">
                                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                    {(p.name[0] || "?").toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <div className="text-sm font-medium truncate">
                                    {p.name}
                                  </div>
                                  <div className="text-xs text-muted-foreground truncate">
                                    {p.email}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right tabular-nums font-medium">
                              {p.eventCount}
                            </TableCell>
                            <TableCell className="text-right pr-4 tabular-nums">
                              {p.attended}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ATTENDANCE TABLE */}
          <TabsContent value="attendance" className="space-y-6 mt-0">
            <Card>
              <CardHeader className="gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
                  <div>
                    <CardTitle>
                      {ru ? "Список регистраций" : "Event Attendance"}
                    </CardTitle>
                    <CardDescription>
                      {filteredAndSorted.length} {ru ? "из" : "of"} {stats.total}{" "}
                      {stats.total === 1
                        ? ru
                          ? "результат"
                          : "result"
                        : ru
                        ? "результатов"
                        : "results"}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        type="search"
                        placeholder={
                          ru ? "Поиск..." : "Search registrant..."
                        }
                        className="pl-8 w-[200px] sm:w-[260px]"
                        value={search}
                        onChange={(e) => {
                          setSearch(e.target.value);
                          setPage(1);
                        }}
                        data-testid="input-search-registrants"
                      />
                    </div>
                    <Select
                      value={statusFilter}
                      onValueChange={(v) => {
                        setStatusFilter(v as any);
                        setPage(1);
                      }}
                    >
                      <SelectTrigger
                        className="w-[140px]"
                        data-testid="select-status-filter"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All status</SelectItem>
                        <SelectItem value="attended">Attended</SelectItem>
                        <SelectItem value="notAttended">Not yet</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={sortBy}
                      onValueChange={(v) => setSortBy(v as SortKey)}
                    >
                      <SelectTrigger
                        className="w-[140px]"
                        data-testid="select-sort-by"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Sort: Date</SelectItem>
                        <SelectItem value="name">Sort: Name</SelectItem>
                        <SelectItem value="status">Sort: Status</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Organization</TableHead>
                        <TableHead>Registered</TableHead>
                        <TableHead>Check-In</TableHead>
                        <TableHead className="text-right pr-4">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pageRows.length > 0 ? (
                        pageRows.map((reg) => {
                          const fullName =
                            `${reg.userFirstName || reg.guestName || ""} ${
                              reg.userLastName || ""
                            } ${reg.userPatronymic || ""}`.trim() || "—";
                          const initials =
                            (
                              (reg.userFirstName || reg.guestName || "?")[0] +
                              (reg.userLastName || "")[0]
                            )
                              .toUpperCase()
                              .trim() || "?";
                          const email = reg.userEmail || reg.guestEmail || "";
                          const orgType =
                            reg.userOrganizationType || "Not specified";
                          const orgName = reg.userOrganizationName || "";
                          return (
                            <TableRow
                              key={reg.id}
                              data-testid={`row-registration-${reg.id}`}
                            >
                              <TableCell data-testid={`text-name-${reg.id}`}>
                                <div className="flex items-center gap-3 min-w-0">
                                  <Avatar className="h-9 w-9 shrink-0">
                                    <AvatarImage
                                      src={
                                        (reg as any).userProfileImageUrl ||
                                        undefined
                                      }
                                      alt={fullName}
                                    />
                                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                      {initials}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <div className="text-sm font-medium truncate">
                                      {fullName}
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate">
                                      {email}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell data-testid={`text-org-${reg.id}`}>
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                                  <div className="min-w-0">
                                    <div className="text-sm truncate">
                                      {orgType}
                                    </div>
                                    {orgName && (
                                      <div className="text-xs text-muted-foreground truncate">
                                        {orgName}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell
                                data-testid={`text-date-${reg.id}`}
                                className="text-sm whitespace-nowrap"
                              >
                                {reg.createdAt
                                  ? new Date(reg.createdAt as any).toLocaleDateString()
                                  : "—"}
                              </TableCell>
                              <TableCell
                                data-testid={`text-checkin-${reg.id}`}
                                className="text-sm whitespace-nowrap"
                              >
                                {reg.attendanceTime
                                  ? new Date(reg.attendanceTime as any).toLocaleTimeString(
                                      [],
                                      { hour: "2-digit", minute: "2-digit" },
                                    )
                                  : "—"}
                              </TableCell>
                              <TableCell
                                className="text-right pr-4"
                                data-testid={`text-attendance-${reg.id}`}
                              >
                                <StatusPill
                                  attended={!!reg.attendanceMarked}
                                  time={reg.attendanceTime as any}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-center text-muted-foreground py-12"
                          >
                            No registrations match your filters
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="md:hidden divide-y">
                  {pageRows.length > 0 ? (
                    pageRows.map((reg) => {
                      const fullName =
                        `${reg.userFirstName || reg.guestName || ""} ${
                          reg.userLastName || ""
                        } ${reg.userPatronymic || ""}`.trim() || "—";
                      const initials =
                        (
                          (reg.userFirstName || reg.guestName || "?")[0] +
                          (reg.userLastName || "")[0]
                        )
                          .toUpperCase()
                          .trim() || "?";
                      const email = reg.userEmail || reg.guestEmail || "";
                      const orgType =
                        reg.userOrganizationType || "Not specified";
                      return (
                        <div
                          key={reg.id}
                          className="p-3 space-y-2"
                          data-testid={`card-registration-${reg.id}`}
                        >
                          <div className="flex items-start gap-3">
                            <Avatar className="h-10 w-10 shrink-0">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium truncate">
                                {fullName}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {email}
                              </div>
                            </div>
                            <StatusPill
                              attended={!!reg.attendanceMarked}
                              time={reg.attendanceTime as any}
                            />
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground gap-3 flex-wrap">
                            <span className="flex items-center gap-1.5 min-w-0 truncate">
                              <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                              <span className="truncate">{orgType}</span>
                            </span>
                            <span className="whitespace-nowrap">
                              {reg.createdAt
                                ? new Date(
                                    reg.createdAt as any,
                                  ).toLocaleDateString()
                                : "—"}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      No registrations match your filters
                    </div>
                  )}
                </div>

                {filteredAndSorted.length > PAGE_SIZE && (
                  <div className="flex items-center justify-between gap-3 px-4 py-3 border-t flex-wrap">
                    <div className="text-xs text-muted-foreground">
                      Showing {pageStart + 1}–
                      {Math.min(
                        pageStart + PAGE_SIZE,
                        filteredAndSorted.length,
                      )}{" "}
                      of {filteredAndSorted.length}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={safePage <= 1}
                        aria-label="Previous page"
                        data-testid="button-prev-page"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className="px-3 text-sm tabular-nums">
                        {safePage} / {totalPages}
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={safePage >= totalPages}
                        aria-label="Next page"
                        data-testid="button-next-page"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
