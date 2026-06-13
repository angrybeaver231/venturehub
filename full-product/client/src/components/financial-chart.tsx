import { useMemo } from "react";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import type { StartupFinancial } from "@shared/schema";
import { useLanguage } from "@/contexts/LanguageContext";

export function FinancialChart({ data }: { data: StartupFinancial[] }) {
  const { language } = useLanguage();
  const ru = language === "ru";

  const points = useMemo(() => {
    // collapse to one row per snapshotDate by picking max MRR (preferring live providers)
    const byDate = new Map<string, { date: string; mrr: number; revenue: number }>();
    for (const r of data) {
      const existing = byDate.get(r.snapshotDate);
      const mrr = r.mrrMinor / 100;
      const revenue = r.revenueMinor / 100;
      if (!existing || mrr > existing.mrr) {
        byDate.set(r.snapshotDate, { date: r.snapshotDate, mrr, revenue });
      }
    }
    return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [data]);

  if (points.length < 2) {
    return (
      <div className="text-sm text-muted-foreground py-6" data-testid="text-no-financial-history">
        {ru
          ? "Недостаточно данных для графика. Подключите платёжную систему или загрузите выписку, чтобы увидеть динамику."
          : "Not enough data for a chart yet. Connect a payment system or upload a bank statement to see the trend."}
      </div>
    );
  }

  return (
    <div className="h-64 w-full" data-testid="chart-financials">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <Tooltip
            contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 6 }}
            labelStyle={{ color: "hsl(var(--foreground))" }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" name={ru ? "Выручка (30д)" : "Revenue (30d)"} dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
          <Line type="monotone" name="MRR" dataKey="mrr" stroke="hsl(38 92% 50%)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
