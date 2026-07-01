import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Giriş" };

export default function LoginPage() {
  return (
    <Card className="glass gradient-border p-6 sm:p-8">
      <div className="mb-6 space-y-1 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Tekrar hoş geldin</h1>
        <p className="text-sm text-muted-foreground">
          Hesabına giriş yaparak devam et
        </p>
      </div>

      <LoginForm />

      <div className="mt-6 rounded-xl border border-border/60 bg-secondary/30 p-3 text-center text-xs text-muted-foreground">
        Demo hesabı: <span className="font-medium text-foreground">demo</span> /{" "}
        <span className="font-medium text-foreground">demo12345</span>
      </div>
    </Card>
  );
}
