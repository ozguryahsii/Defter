"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ChartTooltip } from "./chart-tooltip";
import { formatCurrency } from "@/lib/format";
import { useT } from "@/components/i18n-provider";

const COLORS = [
  "hsl(var(--brand))",
  "hsl(var(--primary))",
  "hsl(262 83% 78%)",
  "hsl(199 89% 60%)",
  "hsl(152 58% 52%)",
  "hsl(38 92% 60%)",
];

export function CategoryDonut({
  data,
  currency = "TRY",
}: {
  data: { category: string; amount: number }[];
  currency?: string;
}) {
  const t = useT();
  const total = data.reduce((s, d) => s + d.amount, 0);

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative h-[180px] w-[180px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="amount"
              nameKey="category"
              innerRadius={62}
              outerRadius={86}
              paddingAngle={3}
              stroke="none"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip currency={currency} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-muted-foreground">{t("Toplam")}</span>
          <span className="text-lg font-semibold">
            {total >= 1000 ? `${Math.round(total / 1000)}k` : total}
          </span>
        </div>
      </div>

      <ul className="grid w-full min-w-0 flex-1 gap-2">
        {data.map((d, i) => (
          <li key={d.category} className="flex items-center gap-2.5 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: COLORS[i % COLORS.length] }}
            />
            <span className="flex-1 truncate text-muted-foreground">
              {d.category}
            </span>
            <span className="font-medium tabular-nums">
              {formatCurrency(d.amount, currency)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
