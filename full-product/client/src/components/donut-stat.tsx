import { cn } from "@/lib/utils";

interface DonutStatProps {
  label: string;
  value: number | string;
  sub?: string;
  /** 0..100 — proportion of the ring that is "filled". Defaults to 100 when omitted. */
  percent?: number;
  /** When true, the tile gets a soft accent-tinted background (Figma's "All Leaves" highlight). */
  highlight?: boolean;
  testId?: string;
  size?: number;
}

/**
 * TeamHub-style donut stat tile: a soft-shadowed white card with a partial
 * progress ring and a big number in the middle. Uses platform palette
 * (`primary` / `accent` tokens) so it inherits dark-mode automatically.
 */
export function DonutStat({
  label,
  value,
  sub,
  percent = 100,
  highlight = false,
  testId,
  size = 92,
}: DonutStatProps) {
  const pct = Math.max(0, Math.min(100, percent));
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return (
    <div
      className={cn(
        "rounded-md border bg-card p-4 flex flex-col items-center justify-center text-center gap-1.5",
        highlight && "bg-accent border-accent-border",
      )}
      data-testid={testId}
    >
      <div className="text-xs font-medium text-muted-foreground" data-testid={testId ? `${testId}-label` : undefined}>
        {label}
      </div>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="currentColor"
            strokeWidth={stroke}
            fill="none"
            className={highlight ? "text-accent-foreground/25" : "text-border"}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${dash} ${c}`}
            className="text-primary transition-all"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-semibold tabular-nums" data-testid={testId ? `${testId}-value` : undefined}>
            {value}
          </span>
          {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
        </div>
      </div>
    </div>
  );
}

/**
 * Compact horizontal stat row used in TeamHub-style "Personal Info" blocks:
 * an icon chip on the left, label + value stacked on the right.
 */
export function InfoRow({
  icon,
  label,
  value,
  testId,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  testId?: string;
}) {
  return (
    <div className="flex items-center gap-3" data-testid={testId}>
      <div className="h-9 w-9 rounded-md bg-accent text-accent-foreground flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-sm font-medium truncate">{value}</div>
      </div>
    </div>
  );
}
