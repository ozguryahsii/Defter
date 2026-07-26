import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { RegisterForm } from "@/components/auth/register-form";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { getT } from "@/lib/i18n/server";

export function generateMetadata(): Metadata {
  return { title: getT()("Kayıt") };
}

export default function RegisterPage() {
  const t = getT();
  return (
    <Card className="glass gradient-border p-6 sm:p-8">
      <div className="flex justify-end">
        <LanguageToggle />
      </div>
      <div className="mb-6 space-y-1 text-center">
        <h1 className="text-xl font-semibold tracking-tight">{t("Hesap oluştur")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("Saniyeler içinde harcamalarını paylaşmaya başla")}
        </p>
      </div>

      <RegisterForm />
    </Card>
  );
}
