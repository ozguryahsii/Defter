"use client";

import { ArrowRight, CheckCircle2 } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { formatCurrency } from "@/lib/format";
import { useT } from "@/components/i18n-provider";
import type { Transfer } from "@/lib/settlement";
import { cn } from "@/lib/utils";

export function SettlementList({
  transfers,
  currency,
  currentUserId,
}: {
  transfers: Transfer[];
  currency: string;
  currentUserId?: string;
}) {
  const t = useT();
  if (transfers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-success/40 bg-success/5 py-10 text-center">
        <CheckCircle2 className="h-8 w-8 text-success" />
        <p className="text-sm font-medium text-success">
          {t("Herkes ödeşmiş — bekleyen borç yok.")}
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2.5">
      {transfers.map((t, i) => {
        const involvesYou =
          t.fromUserId === currentUserId || t.toUserId === currentUserId;
        return (
          <li
            key={i}
            className={cn(
              "flex items-center gap-3 rounded-xl border p-3 transition-colors",
              involvesYou
                ? "border-brand/30 bg-brand/5"
                : "border-border/60 bg-secondary/30",
            )}
          >
            <div className="flex items-center gap-2">
              <UserAvatar
                userId={t.fromUserId}
                name={t.fromUserName}
                className="h-8 w-8"
                fallbackClassName="text-[10px]"
              />
              <span className="text-sm font-medium">{t.fromUserName}</span>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <UserAvatar
                userId={t.toUserId}
                name={t.toUserName}
                className="h-8 w-8"
                fallbackClassName="text-[10px]"
              />
              <span className="text-sm font-medium">{t.toUserName}</span>
            </div>
            <span className="ml-auto text-sm font-semibold tabular-nums">
              {formatCurrency(t.amount, currency)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
