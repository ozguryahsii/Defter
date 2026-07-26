import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CreateGroupForm } from "@/components/groups/create-group-form";
import { getT } from "@/lib/i18n/server";

export function generateMetadata(): Metadata {
  return { title: getT()("Yeni Grup") };
}

export default function NewGroupPage() {
  const t = getT();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/groups"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {t("Gruplar")}
      </Link>

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-gradient">
          {t("Yeni Grup Ekle")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("Bir grup oluştur, sonra kullanıcı adına göre arkadaşlarını ekle.")}
        </p>
      </div>

      <Card className="gradient-border p-6 sm:p-8">
        <CreateGroupForm />
      </Card>
    </div>
  );
}
