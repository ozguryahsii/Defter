"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltip } from "./chart-tooltip";

const axisTick = { fill: "hsl(var(--muted-foreground))", fontSize: 12 };

export function MemberBarChart({
  data,
  currency = "TRY",
}: {
  data: { name: string; paid: number }[];
  currency?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={288}>
      <BarChart data={data} margin={{ left: -12, right: 8, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.95} />
            <stop offset="100%" stopColor="hsl(var(--brand))" stopOpacity={0.5} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="4 4"
          vertical={false}
          stroke="hsl(var(--border))"
          strokeOpacity={0.5}
        />
        <XAxis
          dataKey="name"
          tickLine={false}
          axisLine={false}
          tick={axisTick}
          dy={6}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={axisTick}
          width={52}
          tickFormatter={(v: number) =>
            v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`
          }
        />
        <Tooltip
          cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
          content={<ChartTooltip currency={currency} />}
        />
        <Bar dataKey="paid" fill="url(#barFill)" radius={[8, 8, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}
