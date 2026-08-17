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

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28v-3.1H1.26A12 12 0 0 0 0 12c0 1.94.46 3.77 1.26 5.38l4.01-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.26 6.62l4.01 3.1C6.22 6.88 8.87 4.77 12 4.77Z"
      />
    </svg>
  );
}

function AppleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M16.36 1.04c.13 1.05-.3 2.08-.94 2.83-.66.77-1.75 1.37-2.8 1.29-.15-1.02.34-2.08.96-2.79.68-.79 1.86-1.38 2.78-1.33Zm2.9 17.13c-.4.94-.6 1.36-1.12 2.2-.72 1.18-1.74 2.65-3 2.66-1.12.02-1.41-.73-2.93-.72-1.53.01-1.85.73-2.97.72-1.26-.01-2.22-1.34-2.94-2.52C4.3 17.7 3.47 14.06 4.6 11.6c.6-1.3 1.68-2.13 2.85-2.15 1.1-.02 1.79.75 2.93.75 1.13 0 1.83-.75 2.94-.73.99.02 2.03.55 2.66 1.42-2.34 1.29-1.96 4.66.28 5.68Z" />
    </svg>
  );
}

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
    window.location.assign("/verify-email");
  }

  return (
    <>
      <div className="mb-4 space-y-2">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
        >
          <GoogleIcon className="h-4 w-4" />
          {t("Google ile devam et")}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => signIn("apple", { callbackUrl: "/dashboard" })}
        >
          <AppleIcon className="h-4 w-4" />
          {t("Apple ile devam et")}
        </Button>
      </div>
      <div className="mb-4 flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        {t("veya")}
        <div className="h-px flex-1 bg-border" />
      </div>
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
        <Label htmlFor="displayName">{t("Ad-Soyad (değiştirilemez)")}</Label>
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
    </>
  );
}
