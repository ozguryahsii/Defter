import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CreateGroupForm } from "@/components/groups/create-group-form";

export const metadata: Metadata = { title: "Yeni Grup" };

export default function NewGroupPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/groups"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Gruplar
      </Link>

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-gradient">
          Yeni Grup Ekle
        </h1>
        <p className="text-sm text-muted-foreground">
          Bir grup oluştur, sonra kullanıcı adına göre arkadaşlarını ekle.
        </p>
      </div>

      <Card className="gradient-border p-6 sm:p-8">
        <CreateGroupForm />
      </Card>
    </div>
  );
}
