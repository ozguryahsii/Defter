"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { KeyRound, Loader2, Send } from "lucide-react";
import { requestPasswordReset, resetPasswordWithCode } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { useT } from "@/components/i18n-provider";

export function ForgotPasswordForm() {
  const router = useRouter();
  const t = useT();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onRequest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const res = await requestPasswordReset(email);
    setBusy(false);
    if (!res.ok) {
      toast.error(t(res.error ?? "İşlem başarısız."));
      return;
    }
    toast.success(t("Eğer bu e-posta kayıtlıysa, sıfırlama kodu gönderildi."));
    setStep("code");
  }

  async function onReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const res = await resetPasswordWithCode({ email, code, password });
    setBusy(false);
    if (!res.ok) {
      toast.error(t(res.error ?? "İşlem başarısız."));
      return;
    }
    toast.success(t("Parolan güncellendi. Şimdi giriş yapabilirsin."));
    router.push("/login");
  }

  if (step === "email")
    return (
      <form onSubmit={onRequest} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{t("E-posta")}</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder={t("ornek@eposta.com")}
            required
            autoFocus
          />
        </div>
        <Button type="submit" variant="brand" className="w-full" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <Send />}
          {t("Kod gönder")}
        </Button>
        <p className="pt-2 text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-primary hover:underline">
            {t("Girişe dön")}
          </Link>
        </p>
      </form>
    );

  return (
    <form onSubmit={onReset} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="code">{t("6 haneli kod")}</Label>
        <Input
          id="code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          className="text-center text-xl font-semibold tracking-[0.4em]"
          required
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="new-password">{t("Yeni parola")}</Label>
        <PasswordInput
          id="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          placeholder={t("En az 8 karakter")}
          required
        />
      </div>
      <Button
        type="submit"
        variant="brand"
        className="w-full"
        disabled={busy || code.length < 6 || password.length < 8}
      >
        {busy ? <Loader2 className="animate-spin" /> : <KeyRound />}
        {t("Parolayı sıfırla")}
      </Button>
      <p className="pt-2 text-center text-sm text-muted-foreground">
        <button
          type="button"
          onClick={() => setStep("email")}
          className="font-medium text-primary hover:underline"
        >
          {t("Farklı e-posta dene")}
        </button>
      </p>
    </form>
  );
}
