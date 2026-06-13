import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Activity, Moon, MinusCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { FounderPulse } from "@shared/schema";

const STATUS_CONFIG = {
  active: { Icon: Activity, classes: "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/30" },
  quiet: { Icon: Moon, classes: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30" },
  silent: { Icon: MinusCircle, classes: "bg-muted text-muted-foreground border-border" },
} as const;

type Props = { startupId: string; size?: "sm" | "default"; className?: string };

export function FounderPulseBadge({ startupId, size = "sm", className }: Props) {
  const { t } = useLanguage();
  const { data, isLoading } = useQuery<FounderPulse>({
    queryKey: ["/api/startups", startupId, "founder-pulse"],
    enabled: !!startupId,
    staleTime: 60_000,
  });

  if (isLoading || !data) return null;
  const { Icon, classes } = STATUS_CONFIG[data.status];
  const label =
    data.status === "active"
      ? t("founderPulseActive")
      : data.status === "quiet"
        ? t("founderPulseQuiet")
        : t("founderPulseSilent");

  const breakdown = data.channelBreakdown ?? {};
  const channels = Object.entries(breakdown)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={`${classes} ${className ?? ""}`}
          data-testid={`badge-founder-pulse-${startupId}`}
        >
          <Icon className={size === "sm" ? "h-3 w-3 mr-1" : "h-4 w-4 mr-1"} />
          {label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <div className="space-y-1 text-xs" data-testid={`tooltip-founder-pulse-${startupId}`}>
          <div className="font-medium">
            {t("founderPulse")}: {data.eventsLast21Days} {t("eventsLast21Days")}
          </div>
          {data.lastActivityAt && (
            <div className="text-muted-foreground">
              {new Date(data.lastActivityAt).toLocaleDateString()}
            </div>
          )}
          {channels.length > 0 && (
            <div className="pt-1 border-t border-border/40 space-y-0.5">
              {channels.map(([ch, n]) => (
                <div key={ch} className="flex items-center justify-between gap-3" data-testid={`pulse-channel-${ch}`}>
                  <span className="capitalize">{ch.replace(/_/g, " ")}</span>
                  <span className="font-mono">{n}</span>
                </div>
              ))}
            </div>
          )}
          {data.lastNudgeAt && (
            <div className="pt-1 border-t border-border/40 text-muted-foreground">
              Last nudge: {new Date(data.lastNudgeAt).toLocaleDateString()}
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
