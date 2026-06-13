import { useMemo } from "react";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import type { StartupMetric } from "@shared/schema";

export function StartupMetricsChart({ metrics }: { metrics: StartupMetric[] }) {
  const data = useMemo(() => {
    return [...metrics]
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((m) => ({
        month: m.month,
        users: m.users ?? 0,
        revenue: m.revenue ?? 0,
        mrr: m.mrr ?? 0,
        pilots: m.pilots ?? 0,
      }));
  }, [metrics]);

  if (data.length < 2) return null;

  return (
    <div className="h-64 w-full" data-testid="chart-startup-metrics">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <Tooltip
            contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 6 }}
            labelStyle={{ color: "hsl(var(--foreground))" }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="mrr" stroke="hsl(142 71% 45%)" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="users" stroke="hsl(217 91% 60%)" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="pilots" stroke="hsl(38 92% 50%)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function computeMoM(metrics: StartupMetric[]) {
  if (metrics.length < 2) return null;
  const sorted = [...metrics].sort((a, b) => a.month.localeCompare(b.month));
  const last = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];
  function pct(curr: number | null | undefined, prior: number | null | undefined) {
    const c = Number(curr || 0), p = Number(prior || 0);
    if (p === 0) return c > 0 ? 100 : null;
    return ((c - p) / p) * 100;
  }
  return {
    users: pct(last.users, prev.users),
    revenue: pct(last.revenue, prev.revenue),
    mrr: pct(last.mrr, prev.mrr),
    pilots: pct(last.pilots, prev.pilots),
  };
}
