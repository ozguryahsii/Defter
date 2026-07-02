"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { LogOut, UserRound } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/format";

export function UserMenu({
  name,
  username,
}: {
  name: string;
  username: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none ring-ring transition focus-visible:ring-2">
        <Avatar className="h-9 w-9 ring-2 ring-border/60">
          <AvatarFallback>{initials(name)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground">{name}</span>
            <span className="text-xs text-muted-foreground">@{username}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <UserRound /> Profil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={async () => {
            // redirect:false + kendi yönlendirmemiz: NextAuth'un mutlak URL
            // (NEXTAUTH_URL/localhost) yönlendirmesi mobil/canlıda kırılıyordu.
            await signOut({ redirect: false });
            window.location.assign("/login");
          }}
          className="text-destructive focus:text-destructive [&_svg]:text-destructive"
        >
          <LogOut /> Çıkış yap
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
