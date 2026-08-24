"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { SpotlightCard } from "@/components/magic/spotlight-card";
import { NumberTicker } from "@/components/magic/number-ticker";
import { cn } from "@/lib/utils";

const CURRENCY_SYMBOL: Record<string, string> = {
  TRY: "₺",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

export function StatCard({
  label,
  value,
  icon,
  currency,
  decimals = 0,
  hint,
  delta,
  tone = "default",
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  currency?: string;
  decimals?: number;
  hint?: string;
  delta?: number;
  tone?: "default" | "success" | "destructive" | "brand";
}) {
  const prefix = currency ? `${CURRENCY_SYMBOL[currency] ?? ""} ` : "";
  const toneClasses = {
    default: "text-foreground",
    success: "text-success",
    destructive: "text-destructive",
    brand: "text-brand",
  }[tone];

  return (
    <SpotlightCard className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="grid h-9 w-9 place-items-center rounded-xl border border-border/60 bg-secondary/50 text-muted-foreground [&_svg]:h-[18px] [&_svg]:w-[18px]">
          {icon}
        </span>
      </div>

      <div className={cn("mt-4 text-2xl font-semibold tracking-tight", toneClasses)}>
        <NumberTicker
          value={value}
          decimals={decimals}
          prefix={prefix}
        />
      </div>

      <div className="mt-1.5 flex items-center gap-2">
        {typeof delta === "number" && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium",
              delta >= 0
                ? "bg-success/15 text-success"
                : "bg-destructive/15 text-destructive",
            )}
          >
            {delta >= 0 ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {Math.abs(delta)}%
          </span>
        )}
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
    </SpotlightCard>
  );
}
