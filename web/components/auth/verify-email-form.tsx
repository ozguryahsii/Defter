"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, MailCheck, RotateCw } from "lucide-react";
import { confirmEmailCode, resendVerificationCode } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/components/i18n-provider";

export function VerifyEmailForm() {
  const t = useT();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (code.trim().length < 6) return;
    setBusy(true);
    const res = await confirmEmailCode(code);
    setBusy(false);
    if (!res.ok) {
      toast.error(t(res.error ?? "Kod hatalı."));
      return;
    }
    toast.success(t("E-posta doğrulandı 🎉"));
    window.location.assign("/dashboard");
  }

  async function onResend() {
    setResending(true);
    const res = await resendVerificationCode();
    setResending(false);
    if (!res.ok) {
      toast.error(t(res.error ?? "E-posta gönderilemedi. Lütfen daha sonra tekrar dene."));
      return;
    }
    toast.success(t("Kod gönderildi."));
    setCooldown(true);
    setTimeout(() => setCooldown(false), 30_000);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="000000"
        className="text-center text-2xl font-semibold tracking-[0.5em]"
        required
        autoFocus
      />
      <Button
        type="submit"
        variant="brand"
        className="w-full"
        disabled={busy || code.length < 6}
      >
        {busy ? <Loader2 className="animate-spin" /> : <MailCheck />}
        {t("Doğrula")}
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="w-full"
        disabled={resending || cooldown}
        onClick={onResend}
      >
        {resending ? <Loader2 className="animate-spin" /> : <RotateCw />}
        {cooldown ? t("Kod gönderildi.") : t("Kodu tekrar gönder")}
      </Button>
    </form>
  );
}
