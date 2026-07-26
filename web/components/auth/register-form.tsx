"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";
import { registerUser } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { useT } from "@/components/i18n-provider";

export function RegisterForm() {
  const router = useRouter();
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setFieldErrors({});
    const form = new FormData(e.currentTarget);

    const res = await registerUser({ ok: false }, form);
    if (!res.ok) {
      setLoading(false);
      if (res.fieldErrors) setFieldErrors(res.fieldErrors);
      if (res.error) toast.error(t(res.error));
      return;
    }

    // Auto sign-in after successful registration.
    const signInRes = await signIn("credentials", {
      redirect: false,
      username: String(form.get("username") ?? ""),
      password: String(form.get("password") ?? ""),
    });
    setLoading(false);

    if (signInRes?.error) {
      toast.success(t("Hesap oluşturuldu. Lütfen giriş yapın."));
      router.push("/login");
      return;
    }
    toast.success(t("Hesabın hazır!"));
    // Tam sayfa yönlendirme: mobilde client-side push oturum çerezinden
    // önce koşup boş sayfada bırakabiliyor.
    window.location.assign("/dashboard");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username">{t("Kullanıcı adı")}</Label>
        <Input
          id="username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder={t("kullaniciadi")}
          required
          autoFocus
        />
        {fieldErrors.username && (
          <p className="text-xs text-destructive">{t(fieldErrors.username)}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">{t("E-posta")}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder={t("ornek@eposta.com")}
          required
        />
        {fieldErrors.email && (
          <p className="text-xs text-destructive">{t(fieldErrors.email)}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="displayName">{t("Görünen ad (değiştirilemez)")}</Label>
        <Input
          id="displayName"
          name="displayName"
          autoComplete="name"
          placeholder={t("Adın Soyadın")}
          required
        />
        {fieldErrors.displayName && (
          <p className="text-xs text-destructive">{t(fieldErrors.displayName)}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {t("Grup arkadaşların seni bu adla görür; kayıt sonrası değiştirilemez.")}
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{t("Parola")}</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          placeholder={t("En az 8 karakter")}
          required
        />
        {fieldErrors.password && (
          <p className="text-xs text-destructive">{t(fieldErrors.password)}</p>
        )}
      </div>
      <Button
        type="submit"
        variant="brand"
        className="w-full"
        disabled={loading}
      >
        {loading ? <Loader2 className="animate-spin" /> : <UserPlus />}
        {t("Kayıt ol")}
      </Button>

      <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
        {t("Kayıt olarak")}{" "}
        <Link href="/terms" className="underline hover:text-foreground">
          {t("Kullanım Şartları")}
        </Link>
        {t("'nı ve")}{" "}
        <Link href="/privacy" className="underline hover:text-foreground">
          {t("Gizlilik Politikası")}
        </Link>
        {t("'nı kabul etmiş olursun.")}
      </p>

      <p className="pt-2 text-center text-sm text-muted-foreground">
        {t("Zaten hesabın var mı?")}{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          {t("Giriş yap")}
        </Link>
      </p>
    </form>
  );
}
