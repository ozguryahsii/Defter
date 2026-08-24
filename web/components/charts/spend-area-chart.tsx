"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltip } from "./chart-tooltip";

const axisTick = { fill: "hsl(var(--muted-foreground))", fontSize: 12 };

export function SpendAreaChart({
  data,
  currency = "TRY",
}: {
  data: { month: string; amount: number }[];
  currency?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={288}>
      <AreaChart data={data} margin={{ left: -12, right: 8, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--brand))" stopOpacity={0.4} />
            <stop offset="100%" stopColor="hsl(var(--brand))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="4 4"
          vertical={false}
          stroke="hsl(var(--border))"
          strokeOpacity={0.5}
        />
        <XAxis
          dataKey="month"
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
          cursor={{ stroke: "hsl(var(--border))" }}
          content={<ChartTooltip currency={currency} />}
        />
        <Area
          type="monotone"
          dataKey="amount"
          stroke="hsl(var(--brand))"
          strokeWidth={2.5}
          fill="url(#spendFill)"
          activeDot={{ r: 5, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
