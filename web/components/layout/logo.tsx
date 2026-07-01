import Link from "next/link";
import { Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({
  href = "/dashboard",
  className,
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("group flex items-center gap-2.5", className)}
    >
      <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand to-primary text-brand-foreground shadow-glow">
        <Wallet className="h-5 w-5" />
      </span>
      <span className="text-lg font-semibold tracking-tight">Defter</span>
    </Link>
  );
}
