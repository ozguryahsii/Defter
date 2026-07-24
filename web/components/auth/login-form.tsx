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

export function LoginForm() {
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
      toast.error("Kullanıcı adı veya parola hatalı.");
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
      {welcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="animate-in fade-in zoom-in-95 flex items-center gap-3 rounded-2xl border border-purple-300/60 bg-purple-100 px-8 py-5 shadow-xl dark:border-purple-500/40 dark:bg-purple-950/80">
            <span className="text-lg font-semibold text-purple-700 dark:text-purple-300">
              Hoş geldin!
            </span>
            <Heart className="h-5 w-5 fill-purple-600 text-purple-600 dark:fill-purple-400 dark:text-purple-400" />
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">Kullanıcı adı</Label>
          <Input
            id="username"
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="kullaniciadi"
            required
            autoFocus
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Parola</Label>
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
          Giriş yap
        </Button>

        <p className="pt-2 text-center text-sm text-muted-foreground">
          Hesabın yok mu?{" "}
          <Link
            href="/register"
            className="font-medium text-primary hover:underline"
          >
            Kayıt ol
          </Link>
        </p>
      </form>
    </>
  );
}
