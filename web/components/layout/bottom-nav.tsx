"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Wallet, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard", label: "Genel Bakış", icon: LayoutDashboard },
  { href: "/groups", label: "Gruplar", icon: Users },
  { href: "/budget", label: "Bütçe", icon: Wallet },
  { href: "/profile", label: "Profil", icon: UserRound },
];

/**
 * Mobile bottom navigation (app-like thumb reach). Hidden on desktop where
 * the sidebar takes over, and when printing.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/85 backdrop-blur-xl lg:hidden print:hidden"
      style={{ paddingBottom: "var(--safe-bottom)" }}
      aria-label="Alt gezinme"
    >
      <div className="mx-auto grid h-16 max-w-md grid-cols-4">
        {ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                active
                  ? "text-brand"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "grid h-8 w-14 place-items-center rounded-full transition-colors",
                  active && "bg-brand/10",
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
