"use client";

import { formatCurrency } from "@/lib/format";

type TooltipItem = {
  name?: string | number;
  value?: number | string;
  color?: string;
  payload?: Record<string, unknown>;
};

export function ChartTooltip({
  active,
  payload,
  label,
  currency = "TRY",
}: {
  active?: boolean;
  payload?: TooltipItem[];
  label?: string | number;
  currency?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border/70 bg-popover/95 px-3 py-2 text-xs shadow-card backdrop-blur-xl">
      {label !== undefined && (
        <p className="mb-1 font-medium text-foreground">{label}</p>
      )}
      {payload.map((item, i) => (
        <div key={i} className="flex items-center gap-2 text-muted-foreground">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: item.color }}
          />
          <span className="font-medium text-foreground">
            {formatCurrency(Number(item.value ?? 0), currency)}
          </span>
        </div>
      ))}
    </div>
  );
}
