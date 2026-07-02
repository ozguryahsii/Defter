"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Loader2,
  Lock,
  Undo2,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, initials } from "@/lib/format";
import { settleTransfer, unsettleTransfer } from "@/lib/actions";
import type { Transfer } from "@/lib/settlement";
import type { SettledItem } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { PayDialog } from "@/components/groups/pay-dialog";

export type PayInfo = Record<
  string,
  { iban?: string | null; ibanName?: string | null }
>;

export function GroupSettlement({
  groupId,
  transfers,
  settled,
  currency,
  currentUserId,
  payInfo = {},
}: {
  groupId: string;
  transfers: Transfer[];
  settled: SettledItem[];
  currency: string;
  currentUserId: string;
  payInfo?: PayInfo;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function onSettle(t: Transfer) {
    const key = `${t.fromUserId}->${t.toUserId}`;
    setBusy(key);
    const res = await settleTransfer(groupId, t.fromUserId, t.toUserId);
    setBusy(null);
    if (!res.ok) {
      toast.error(res.error ?? "İşlem başarısız.");
      return;
    }
    toast.success(`${t.fromUserName} → sen: ödeme alındı olarak işaretlendi.`);
    router.refresh();
  }

  async function onUndo(s: SettledItem) {
    setBusy(s.id);
    const res = await unsettleTransfer(s.id);
    setBusy(null);
    if (!res.ok) {
      toast.error(res.error ?? "Geri alınamadı.");
      return;
    }
    toast.success("Ödeme geri alındı, borç yeniden açıldı.");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {/* Outstanding debts */}
      {transfers.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-success/40 bg-success/5 py-10 text-center">
          <CheckCircle2 className="h-8 w-8 text-success" />
          <p className="text-sm font-medium text-success">
            Herkes ödeşmiş — bekleyen borç yok.
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {transfers.map((t) => {
            const key = `${t.fromUserId}->${t.toUserId}`;
            const isCreditor = t.toUserId === currentUserId;
            const isDebtor = t.fromUserId === currentUserId;
            const involvesYou = isCreditor || isDebtor;
            const loading = busy === key;

            return (
              <li
                key={key}
                className={cn(
                  "flex flex-wrap items-center gap-3 rounded-xl border p-3 transition-colors",
                  involvesYou
                    ? "border-brand/30 bg-brand/5"
                    : "border-border/60 bg-secondary/30",
                )}
              >
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-[10px]">
                      {initials(t.fromUserName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{t.fromUserName}</span>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-[10px]">
                      {initials(t.toUserName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{t.toUserName}</span>
                </div>

                <span className="ml-auto text-sm font-semibold tabular-nums">
                  {formatCurrency(t.amount, currency)}
                </span>

                {/* Action / hint — only the creditor can confirm */}
                {isCreditor ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 border-success/40 text-success hover:bg-success/10 hover:text-success"
                    disabled={loading}
                    onClick={() => onSettle(t)}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Ödeme Onay
                  </Button>
                ) : isDebtor ? (
                  <PayDialog
                    creditorName={t.toUserName}
                    iban={payInfo[t.toUserId]?.iban}
                    ibanName={payInfo[t.toUserId]?.ibanName}
                    amount={t.amount}
                    currency={currency}
                  />
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Lock className="h-3 w-3" />
                    sadece {t.toUserName}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Settled history — struck through, marked paid */}
      {settled.length > 0 && (
        <div>
          <div className="mb-2.5 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <h4 className="text-sm font-medium text-muted-foreground">
              Ödenenler ({settled.length})
            </h4>
          </div>
          <ul className="space-y-2">
            {settled.map((s) => {
              const canUndo = s.toUserId === currentUserId;
              const loading = busy === s.id;
              return (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center gap-2 rounded-xl border border-border/50 bg-secondary/20 px-3 py-2"
                >
                  <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground line-through decoration-success/60">
                    {s.fromName}
                    <ArrowRight className="h-3.5 w-3.5" />
                    {s.toName}
                  </span>
                  <span className="text-sm font-medium tabular-nums text-muted-foreground line-through decoration-success/60">
                    {formatCurrency(s.amount, currency)}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                    <Check className="h-3 w-3" /> ödendi
                  </span>
                  <span className="hidden text-[11px] text-muted-foreground sm:inline">
                    {formatDate(s.createdAt)}
                  </span>
                  {canUndo && (
                    <button
                      type="button"
                      onClick={() => onUndo(s)}
                      disabled={loading}
                      className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
                    >
                      {loading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Undo2 className="h-3 w-3" />
                      )}
                      geri al
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
