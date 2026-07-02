"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ImagePlus,
  Loader2,
  Paperclip,
  Pencil,
  Receipt,
  Trash2,
  Users,
} from "lucide-react";
import { attachReceipt, deleteExpense } from "@/lib/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, initials } from "@/lib/format";
import {
  AddExpenseDialog,
  type EditExpenseInit,
} from "@/components/groups/add-expense-dialog";

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
  canEdit: boolean;
  receiptPath: string | null;
  original: { amount: number; currency: string } | null;
  editInit: EditExpenseInit;
};

type Member = { userId: string; name: string };

export function ExpenseList({
  items,
  currency,
  members,
  currentUserId,
  groupId,
}: {
  items: ExpenseItem[];
  currency: string;
  members: Member[];
  currentUserId: string;
  groupId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  async function onDelete(id: string) {
    if (!window.confirm("Bu harcamayı silmek istediğine emin misin?")) return;
    setBusy(id);
    const res = await deleteExpense(id);
    setBusy(null);
    if (!res.ok) {
      toast.error(res.error ?? "Silinemedi.");
      return;
    }
    toast.success("Harcama silindi.");
    router.refresh();
  }

  async function onReceipt(id: string, file: File) {
    setBusy(id);
    const fd = new FormData();
    fd.append("file", file);
    const res = await attachReceipt(id, fd);
    setBusy(null);
    if (!res.ok) {
      toast.error(res.error ?? "Fiş yüklenemedi.");
      return;
    }
    toast.success("Fiş eklendi.");
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
              {e.receiptPath && (
                <a
                  href={`/api/receipts/${e.receiptPath}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-0.5 text-[10px] text-brand hover:underline"
                >
                  <Paperclip className="h-3 w-3" /> fiş
                </a>
              )}
            </div>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              <span>{e.payerName} ödedi</span>
              <span>·</span>
              <span>{formatDate(e.date)}</span>
              <span className="hidden items-center gap-1 sm:inline-flex">
                <span>·</span>
                <Users className="h-3 w-3" />
                {e.shareCount} kişi
              </span>
              {e.original && (
                <>
                  <span>·</span>
                  <span>
                    {formatCurrency(e.original.amount, e.original.currency)}
                  </span>
                </>
              )}
            </p>
          </div>

          <div className="flex items-center gap-0.5">
            <span className="mr-1 text-sm font-semibold tabular-nums">
              {formatCurrency(e.amount, currency)}
            </span>

            {e.canEdit && (
              <>
                <input
                  ref={(el) => {
                    fileInputs.current[e.id] = el;
                  }}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(ev) => {
                    const f = ev.target.files?.[0];
                    if (f) onReceipt(e.id, f);
                    ev.target.value = "";
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                  onClick={() => fileInputs.current[e.id]?.click()}
                  disabled={busy === e.id}
                  aria-label="Fiş ekle"
                  title="Fiş fotoğrafı ekle"
                >
                  {busy === e.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImagePlus className="h-4 w-4" />
                  )}
                </Button>

                <AddExpenseDialog
                  groupId={groupId}
                  currency={currency}
                  members={members}
                  currentUserId={currentUserId}
                  expense={e.editInit}
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                      aria-label="Düzenle"
                      title="Düzenle"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  }
                />
              </>
            )}

            {e.canDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                onClick={() => onDelete(e.id)}
                disabled={busy === e.id}
                aria-label="Sil"
              >
                {busy === e.id ? (
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
