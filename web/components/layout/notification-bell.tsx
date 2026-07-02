"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellRing, Check, Plus, UserPlus, AlarmClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Item = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  groupId: string | null;
  readAt: string | null;
  createdAt: string;
};

function iconFor(type: string) {
  switch (type) {
    case "expense.add":
      return Plus;
    case "settle":
      return Check;
    case "member.add":
      return UserPlus;
    case "payment.reminder":
    case "payment.due":
      return AlarmClock;
    default:
      return BellRing;
  }
}

function relative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "az önce";
  if (min < 60) return `${min} dk`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} sa`;
  return `${Math.floor(h / 24)} g`;
}

export function NotificationBell() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { items: Item[]; unread: number };
      setItems(data.items);
      setUnread(data.unread);
    } catch {
      // offline vs. — sessiz geç
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(() => {
      if (!document.hidden) load();
    }, 45000);
    return () => clearInterval(id);
  }, [load]);

  async function onOpenChange(open: boolean) {
    if (open) {
      load();
      return;
    }
    // Menü kapanınca tümünü okundu işaretle.
    if (unread > 0) {
      try {
        await fetch("/api/notifications", { method: "POST" });
        setUnread(0);
        setItems((prev) =>
          prev.map((i) => ({ ...i, readAt: i.readAt ?? new Date().toISOString() })),
        );
      } catch {
        // sonraki açılışta tekrar dener
      }
    }
  }

  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground"
          aria-label={`Bildirimler${unread ? ` (${unread} okunmamış)` : ""}`}
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-semibold text-brand-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="border-b border-border/60 px-4 py-2.5 text-sm font-semibold">
          Bildirimler
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Henüz bildirim yok.
            </p>
          ) : (
            <ul>
              {items.map((n) => {
                const Icon = iconFor(n.type);
                return (
                  <li key={n.id}>
                    <button
                      className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/40"
                      onClick={() => {
                        if (n.groupId) router.push(`/groups/${n.groupId}`);
                      }}
                    >
                      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-border/60 bg-secondary/40 text-muted-foreground">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={
                            n.readAt
                              ? "block text-sm text-muted-foreground"
                              : "block text-sm font-medium"
                          }
                        >
                          {n.title}
                        </span>
                        {n.body && (
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            {n.body}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {relative(n.createdAt)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
