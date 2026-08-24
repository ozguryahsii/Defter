import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getT } from "@/lib/i18n/server";

export default function GroupNotFound() {
  const t = getT();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="relative mb-5 grid h-16 w-16 place-items-center rounded-2xl border border-border/60 bg-secondary/40">
        <div className="absolute inset-0 rounded-2xl bg-brand/10 blur-xl" />
        <SearchX className="relative h-7 w-7 text-brand" />
      </div>
      <h1 className="text-xl font-semibold">{t("Grup bulunamadı")}</h1>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        {t("Bu grup mevcut değil ya da erişim yetkin yok.")}
      </p>
      <Button asChild variant="brand" className="mt-6">
        <Link href="/groups">{t("Gruplarıma dön")}</Link>
      </Button>
    </div>
  );
}
