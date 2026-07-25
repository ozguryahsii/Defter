"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Logo } from "./logo";
import { SidebarNav } from "./sidebar-nav";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
import { NotificationBell } from "./notification-bell";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function Topbar({
  userId,
  name,
  username,
  avatarVersion,
}: {
  userId: string;
  name: string;
  username: string;
  avatarVersion?: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border/60 bg-background/70 px-4 backdrop-blur-xl lg:px-8"
      // Çentik/Dynamic Island altında kalmasın (native iOS kabuğu + PWA)
      style={{ height: "calc(4rem + var(--safe-top))", paddingTop: "var(--safe-top)" }}
    >
      {/* Mobile menu */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left">
          <Logo />
          <div className="mt-4">
            <SidebarNav onNavigate={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Brand (mobile — desktop shows it in the sidebar) */}
      <div className="lg:hidden">
        <Logo />
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <NotificationBell />
        <ThemeToggle />
        <div className="mx-1 h-6 w-px bg-border" />
        <UserMenu
          userId={userId}
          name={name}
          username={username}
          avatarVersion={avatarVersion}
        />
      </div>
    </header>
  );
}
