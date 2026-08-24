import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { getT } from "@/lib/i18n/server";

export function generateMetadata(): Metadata {
  return { title: getT()("Şifremi Unuttum") };
}

export default function ForgotPage() {
  const t = getT();
  return (
    <Card className="glass gradient-border p-6 sm:p-8">
      <div className="mb-6 space-y-1 text-center">
        <h1 className="text-xl font-semibold tracking-tight">
          {t("Şifreni mi unuttun?")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("E-posta adresini gir; sana 6 haneli bir sıfırlama kodu gönderelim.")}
        </p>
      </div>
      <ForgotPasswordForm />
    </Card>
  );
}
