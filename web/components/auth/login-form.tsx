"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      redirect: false,
      username: String(form.get("username") ?? ""),
      password: String(form.get("password") ?? ""),
    });
    setLoading(false);

    if (res?.error) {
      toast.error("Kullanıcı adı veya parola hatalı.");
      return;
    }
    toast.success("Hoş geldin!");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username">Kullanıcı adı</Label>
        <Input
          id="username"
          name="username"
          autoComplete="username"
          placeholder="kullaniciadi"
          required
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Parola</Label>
        <Input
          id="password"
          name="password"
          type="password"
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
        <Link href="/register" className="font-medium text-primary hover:underline">
          Kayıt ol
        </Link>
      </p>
    </form>
  );
}
