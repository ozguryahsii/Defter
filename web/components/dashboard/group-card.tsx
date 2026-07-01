"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Plane, Rocket } from "lucide-react";
import { SpotlightCard } from "@/components/magic/spotlight-card";
import { AvatarStack } from "./avatar-stack";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";
import type { GroupSummary } from "@/lib/queries";
import { cn } from "@/lib/utils";

export function GroupCard({ group }: { group: GroupSummary }) {
  const isVenture = group.type === "Girisim";
  const Icon = isVenture ? Rocket : Plane;
  const balance = group.yourBalance;
  const settled = Math.abs(balance) < 0.005;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
    >
      <Link href={`/groups/${group.id}`}>
        <SpotlightCard className="gradient-border h-full p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl border border-border/60 bg-secondary/50 text-brand">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-semibold leading-tight">{group.name}</h3>
                <Badge
                  variant={isVenture ? "brand" : "secondary"}
                  className="mt-1"
                >
                  {isVenture ? "Girişim" : "Tatil"}
                </Badge>
              </div>
            </div>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>

          <div className="mt-5 flex items-end justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Toplam harcama</p>
              <p className="text-xl font-semibold tracking-tight">
                {formatCurrency(group.total, group.currency)}
              </p>
            </div>
            <AvatarStack names={group.members.map((m) => m.name)} />
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
            <span className="text-xs text-muted-foreground">
              {group.expenseCount} harcama
            </span>
            <span
              className={cn(
                "text-sm font-medium",
                settled
                  ? "text-muted-foreground"
                  : balance > 0
                    ? "text-success"
                    : "text-destructive",
              )}
            >
              {settled
                ? "Ödeşildi"
                : balance > 0
                  ? `+${formatCurrency(balance, group.currency)}`
                  : formatCurrency(balance, group.currency)}
            </span>
          </div>
        </SpotlightCard>
      </Link>
    </motion.div>
  );
}
