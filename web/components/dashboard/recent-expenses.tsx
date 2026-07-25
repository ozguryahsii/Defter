import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/format";
import type { DashboardData } from "@/lib/queries";

export function RecentExpenses({
  items,
}: {
  items: DashboardData["recentExpenses"];
}) {
  return (
    <ul className="divide-y divide-border/60">
      {items.map((e) => (
        <li key={e.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
          <UserAvatar
            userId={e.payerId}
            name={e.payerName}
            className="h-9 w-9"
            fallbackClassName="text-[10px]"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{e.description}</p>
            <p className="truncate text-xs text-muted-foreground">
              {e.payerName} · {e.groupName}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-sm font-semibold tabular-nums">
              {formatCurrency(e.amount, e.currency)}
            </span>
            <div className="flex items-center gap-1.5">
              {e.category && (
                <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                  {e.category}
                </Badge>
              )}
              <span className="text-[11px] text-muted-foreground">
                {formatDate(e.date)}
              </span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
