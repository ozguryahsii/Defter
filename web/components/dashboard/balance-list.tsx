import { UserAvatar } from "@/components/user-avatar";
import { formatCurrency } from "@/lib/format";
import type { Balance } from "@/lib/settlement";
import { cn } from "@/lib/utils";

export function BalanceList({
  balances,
  currency,
  currentUserId,
}: {
  balances: Balance[];
  currency: string;
  currentUserId?: string;
}) {
  const max = Math.max(1, ...balances.map((b) => Math.abs(b.amount)));

  return (
    <ul className="space-y-3">
      {balances.map((b) => {
        const settled = Math.abs(b.amount) < 0.005;
        const pct = Math.round((Math.abs(b.amount) / max) * 100);
        const positive = b.amount > 0;
        return (
          <li key={b.userId} className="flex items-center gap-3">
            <UserAvatar
              userId={b.userId}
              name={b.userName}
              className="h-9 w-9"
              fallbackClassName="text-[10px]"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="truncate text-sm font-medium">
                  {b.userName}
                  {b.userId === currentUserId && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      (sen)
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    "text-sm font-semibold tabular-nums",
                    settled
                      ? "text-muted-foreground"
                      : positive
                        ? "text-success"
                        : "text-destructive",
                  )}
                >
                  {positive && !settled ? "+" : ""}
                  {formatCurrency(b.amount, currency)}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full",
                    settled
                      ? "bg-muted-foreground/40"
                      : positive
                        ? "bg-success"
                        : "bg-destructive",
                  )}
                  style={{ width: `${settled ? 6 : pct}%` }}
                />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
