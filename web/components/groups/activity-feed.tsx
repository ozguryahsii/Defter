import {
  Check,
  Pencil,
  Plus,
  Repeat,
  Sparkles,
  Target,
  Trash2,
  Undo2,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import type { ActivityItem } from "@/lib/queries";
import { initials } from "@/lib/format";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const ICONS: Record<string, LucideIcon> = {
  "expense.add": Plus,
  "expense.edit": Pencil,
  "expense.delete": Trash2,
  settle: Check,
  unsettle: Undo2,
  "member.add": UserPlus,
  "member.join": UserPlus,
  "group.create": Sparkles,
  "budget.set": Target,
  "recurring.add": Repeat,
  "recurring.run": Repeat,
};

function relativeTime(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "az önce";
  if (min < 60) return `${min} dk önce`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} sa önce`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} gün önce`;
  return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" }).format(
    new Date(date),
  );
}

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Henüz hareket yok.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((a) => {
        const Icon = ICONS[a.type] ?? Sparkles;
        return (
          <li key={a.id} className="flex items-start gap-3">
            <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-border/60 bg-secondary/40 text-muted-foreground">
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug">{a.summary}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Avatar className="h-4 w-4">
                  <AvatarFallback className="text-[8px]">
                    {initials(a.actorName)}
                  </AvatarFallback>
                </Avatar>
                {a.actorName} · {relativeTime(a.createdAt)}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
