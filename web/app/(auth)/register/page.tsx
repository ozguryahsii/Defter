import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = { title: "Kayıt" };

export default function RegisterPage() {
  return (
    <Card className="glass gradient-border p-6 sm:p-8">
      <div className="mb-6 space-y-1 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Hesap oluştur</h1>
        <p className="text-sm text-muted-foreground">
          Saniyeler içinde harcamalarını paylaşmaya başla
        </p>
      </div>

      <RegisterForm />
    </Card>
  );
}
