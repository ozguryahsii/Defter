"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2, Pencil, Target, X } from "lucide-react";
import { setBudget } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export function BudgetCard({
  groupId,
  currency,
  monthSpend,
  budget,
  isOwner,
}: {
  groupId: string;
  currency: string;
  monthSpend: number;
  budget: number | null;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(budget ? String(budget) : "");
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    const parsed = value.trim() === "" ? null : parseFloat(value);
    const res = await setBudget(groupId, parsed);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error ?? "Kaydedilemedi.");
      return;
    }
    toast.success("Bütçe güncellendi.");
    setEditing(false);
    router.refresh();
  }

  const pct = budget && budget > 0 ? Math.min(100, (monthSpend / budget) * 100) : 0;
  const over = budget != null && monthSpend > budget;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Target className="h-4 w-4" /> Bu ay
        </div>
        {isOwner && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            <Pencil className="mr-1 inline h-3 w-3" />
            {budget ? "düzenle" : "bütçe koy"}
          </button>
        )}
      </div>

      {editing ? (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={`Aylık bütçe (${currency})`}
            className="h-9"
          />
          <Button size="icon" className="h-9 w-9" onClick={save} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9"
            onClick={() => setEditing(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-semibold tracking-tight">
              {formatCurrency(monthSpend, currency)}
            </span>
            {budget != null && (
              <span className="text-sm text-muted-foreground">
                / {formatCurrency(budget, currency)}
              </span>
            )}
          </div>
          {budget != null && (
            <>
              <Progress
                value={pct}
                className={cn(over && "[&>div]:bg-destructive")}
              />
              <p
                className={cn(
                  "text-xs",
                  over ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {over
                  ? `Bütçe ${formatCurrency(monthSpend - budget, currency)} aşıldı`
                  : `${formatCurrency(budget - monthSpend, currency)} kaldı`}
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}
