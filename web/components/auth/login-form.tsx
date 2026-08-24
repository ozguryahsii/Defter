"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Heart, Loader2, LogIn } from "lucide-react";
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

export function LoginForm() {
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [welcome, setWelcome] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      redirect: false,
      username: String(form.get("username") ?? ""),
      password: String(form.get("password") ?? ""),
    });

    if (res?.error) {
      setLoading(false);
      toast.error(t("Kullanıcı adı veya parola hatalı."));
      return;
    }

    // Ekranın ortasında hoş geldin kartı göster, sonra TAM sayfa yönlendirme
    // yap (window.location) — client-side push mobilde oturum çerezinden önce
    // koşup boş sayfada bırakabiliyordu.
    setWelcome(true);
    setTimeout(() => {
      window.location.assign("/dashboard");
    }, 1100);
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

      {welcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="animate-in fade-in zoom-in-95 flex items-center gap-3 rounded-2xl border border-purple-300/60 bg-purple-100 px-8 py-5 shadow-xl dark:border-purple-500/40 dark:bg-purple-950/80">
            <span className="text-lg font-semibold text-purple-700 dark:text-purple-300">
              {t("Hoş geldin!")}
            </span>
            <Heart className="h-5 w-5 fill-purple-600 text-purple-600 dark:fill-purple-400 dark:text-purple-400" />
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">{t("Kullanıcı adı veya e-posta")}</Label>
          <Input
            id="username"
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder={t("kullaniciadi veya ornek@eposta.com")}
            required
            autoFocus
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t("Parola")}</Label>
            <Link
              href="/forgot"
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              {t("Şifreni mi unuttun?")}
            </Link>
          </div>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
          />
        </div>
        <Button
          type="submit"
          variant="brand"
          className="w-full"
          disabled={loading}
        >
          {loading ? <Loader2 className="animate-spin" /> : <LogIn />}
          {t("Giriş yap")}
        </Button>

        <p className="pt-2 text-center text-sm text-muted-foreground">
          {t("Hesabın yok mu?")}{" "}
          <Link
            href="/register"
            className="font-medium text-primary hover:underline"
          >
            {t("Kayıt ol")}
          </Link>
        </p>
      </form>
    </>
  );
}
