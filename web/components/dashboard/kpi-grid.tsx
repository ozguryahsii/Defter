"use client";

import { useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  Receipt,
  Scale,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type KpiRow = { left: string; sub?: string; right: string };

export type KpiItem = {
  key: string;
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "brand" | "success" | "destructive";
  icon?: "wallet" | "receipt" | "in" | "out" | "scale";
  rows: KpiRow[];
  emptyText: string;
  /** Dialog başlığı altındaki açıklama. */
  detailHint?: string;
};

const ICONS: Record<string, LucideIcon> = {
  wallet: Wallet,
  receipt: Receipt,
  in: ArrowUpRight,
  out: ArrowDownRight,
  scale: Scale,
};

const TONE: Record<string, string> = {
  default: "text-foreground",
  brand: "text-brand",
  success: "text-success",
  destructive: "text-destructive",
};

/**
 * Clickable KPI tiles; each opens a dialog listing the rows behind the number.
 */
export function KpiGrid({ items }: { items: KpiItem[] }) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const active = items.find((i) => i.key === openKey) ?? null;

  return (
    <>
      <div
        className={cn(
          "grid grid-cols-2 gap-3 sm:gap-4",
          items.length >= 5
            ? "lg:grid-cols-3 xl:grid-cols-5"
            : "xl:grid-cols-4",
        )}
      >
        {items.map((item) => {
          const Icon = item.icon ? ICONS[item.icon] : null;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setOpenKey(item.key)}
              className="group rounded-2xl border border-border/60 bg-card p-4 text-left shadow-card transition-colors hover:border-brand/40"
            >
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-2">
                  {Icon && <Icon className="h-4 w-4" />}
                  {item.label}
                </span>
                <ChevronRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <p
                className={cn(
                  "mt-1.5 truncate text-lg font-semibold tracking-tight sm:text-xl",
                  TONE[item.tone ?? "default"],
                )}
              >
                {item.value}
              </p>
              {item.hint && (
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {item.hint}
                </p>
              )}
            </button>
          );
        })}
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setOpenKey(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-md">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle>{active.label}</DialogTitle>
                <DialogDescription>
                  {active.detailHint ?? "Bu tutarın dökümü"}
                </DialogDescription>
              </DialogHeader>
              {active.rows.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {active.emptyText}
                </p>
              ) : (
                <ul className="divide-y divide-border/60">
                  {active.rows.map((r, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between gap-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm">{r.left}</p>
                        {r.sub && (
                          <p className="truncate text-xs text-muted-foreground">
                            {r.sub}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 text-sm font-semibold tabular-nums">
                        {r.right}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
