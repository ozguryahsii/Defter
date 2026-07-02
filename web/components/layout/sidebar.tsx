import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import { Logo } from "./logo";
import { SidebarNav } from "./sidebar-nav";
import { Button } from "@/components/ui/button";

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border/60 bg-card/40 px-4 py-6 backdrop-blur-xl lg:flex">
      <div className="px-2">
        <Logo size="md" />
      </div>

      <div className="mt-6 px-2">
        <Button asChild variant="brand" className="w-full justify-start">
          <Link href="/groups/new">
            <Plus /> Yeni Ortak Harcama
          </Link>
        </Button>
      </div>

      <div className="mt-6 flex-1">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          Menü
        </p>
        <SidebarNav />
      </div>

      <div className="gradient-border relative rounded-2xl bg-secondary/40 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-brand" />
          İpucu
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          Her harcama girişinde borç tablosu otomatik yeniden hesaplanır.
        </p>
      </div>
    </aside>
  );
}
