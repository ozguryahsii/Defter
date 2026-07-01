"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Receipt, Trash2, Users } from "lucide-react";
import { deleteExpense } from "@/lib/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, initials } from "@/lib/format";

export type ExpenseItem = {
  id: string;
  description: string;
  category: string | null;
  amount: number;
  date: string;
  payerName: string;
  splitType: string;
  shareCount: number;
  canDelete: boolean;
};

export function ExpenseList({
  items,
  currency,
}: {
  items: ExpenseItem[];
  currency: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);

  async function onDelete(id: string) {
    if (!window.confirm("Bu harcamayı silmek istediğine emin misin?")) return;
    setDeleting(id);
    const res = await deleteExpense(id);
    setDeleting(null);
    if (!res.ok) {
      toast.error(res.error ?? "Silinemedi.");
      return;
    }
    toast.success("Harcama silindi.");
    router.refresh();
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-xl border border-border/60 bg-secondary/40">
          <Receipt className="h-5 w-5 text-muted-foreground" />
        </span>
        <p className="text-sm text-muted-foreground">
          Henüz harcama yok. İlk harcamayı ekle.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border/60">
      {items.map((e) => (
        <li
          key={e.id}
          className="group flex items-center gap-3 py-3 first:pt-0 last:pb-0"
        >
          <Avatar className="h-10 w-10">
            <AvatarFallback className="text-[11px]">
              {initials(e.payerName)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium">{e.description}</p>
              {e.category && (
                <Badge variant="outline" className="shrink-0 px-1.5 py-0 text-[10px]">
                  {e.category}
                </Badge>
              )}
            </div>
            <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
              <span>{e.payerName} ödedi</span>
              <span>·</span>
              <span>{formatDate(e.date)}</span>
              <span className="hidden items-center gap-1 sm:inline-flex">
                <span>·</span>
                <Users className="h-3 w-3" />
                {e.shareCount} kişi
              </span>
            </p>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold tabular-nums">
              {formatCurrency(e.amount, currency)}
            </span>
            {e.canDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                onClick={() => onDelete(e.id)}
                disabled={deleting === e.id}
                aria-label="Sil"
              >
                {deleting === e.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
