import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BadgeCheck } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { VerifiedMrr } from "@shared/schema";

const CURRENCY_SYMBOL: Record<string, string> = { RUB: "₽", USD: "$", EUR: "€" };

export function formatMoney(minor: number, currency: string, language: string): string {
  const major = minor / 100;
  const sym = CURRENCY_SYMBOL[currency] ?? currency;
  if (major >= 1_000_000) return `${(major / 1_000_000).toFixed(1)}M ${sym}`;
  if (major >= 1_000) return `${(major / 1_000).toFixed(1)}k ${sym}`;
  try {
    return new Intl.NumberFormat(language === "ru" ? "ru-RU" : "en-US", {
      maximumFractionDigits: 0,
    }).format(major) + ` ${sym}`;
  } catch {
    return `${major.toFixed(0)} ${sym}`;
  }
}

function relTime(iso: string, language: string): string {
  const ru = language === "ru";
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days <= 0) return ru ? "сегодня" : "today";
  if (days === 1) return ru ? "вчера" : "1 day ago";
  if (days < 30) return ru ? `${days} дн назад` : `${days} days ago`;
  const months = Math.floor(days / 30);
  return ru ? `${months} мес назад` : `${months}mo ago`;
}

export function VerifiedMrrBadge({
  startupId,
  size = "sm",
  data: initialData,
}: {
  startupId: string;
  size?: "sm" | "md";
  data?: VerifiedMrr | null;
}) {
  const { language } = useLanguage();
  const ru = language === "ru";
  const { data } = useQuery<VerifiedMrr | null>({
    queryKey: ["/api/startups", startupId, "verified-mrr"],
    queryFn: async () => {
      const res = await fetch(`/api/startups/${startupId}/verified-mrr`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !initialData,
    initialData: initialData ?? undefined,
  });

  if (!data || !data.isVerified) return null;

  const amount = formatMoney(data.mrrMinor, data.currency, language);
  const tooltipText = ru
    ? `Подтверждённый MRR: ${amount}\nИсточник: ${data.sourceLabel}\nОбновлено: ${relTime(data.capturedAt, language)}\nДанные предоставлены стартапом через подключённую платёжную систему.`
    : `Verified MRR: ${amount}\nSource: ${data.sourceLabel}\nUpdated: ${relTime(data.capturedAt, language)}\nSelf-reported via the startup's connected payment system.`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          className="bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-700/60 gap-1"
          data-testid={`badge-verified-mrr-${startupId}`}
        >
          <BadgeCheck className={size === "md" ? "h-4 w-4" : "h-3 w-3"} />
          <span>{ru ? "MRR" : "MRR"} {amount}</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="whitespace-pre-line max-w-xs text-xs">
        {tooltipText}
      </TooltipContent>
    </Tooltip>
  );
}
