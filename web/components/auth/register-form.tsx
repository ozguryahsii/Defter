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
import { Label } from "@/components/ui/label";

export function RegisterForm() {
  const router = useRouter();
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
      if (res.error) toast.error(res.error);
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
      toast.success("Hesap oluşturuldu. Lütfen giriş yapın.");
      router.push("/login");
      return;
    }
    toast.success("Hesabın hazır!");
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
        {fieldErrors.username && (
          <p className="text-xs text-destructive">{fieldErrors.username}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="displayName">Görünen ad (opsiyonel)</Label>
        <Input
          id="displayName"
          name="displayName"
          autoComplete="name"
          placeholder="Adın Soyadın"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Parola</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="En az 8 karakter"
          required
        />
        {fieldErrors.password && (
          <p className="text-xs text-destructive">{fieldErrors.password}</p>
        )}
      </div>
      <Button
        type="submit"
        variant="brand"
        className="w-full"
        disabled={loading}
      >
        {loading ? <Loader2 className="animate-spin" /> : <UserPlus />}
        Kayıt ol
      </Button>

      <p className="pt-2 text-center text-sm text-muted-foreground">
        Zaten hesabın var mı?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Giriş yap
        </Link>
      </p>
    </form>
  );
}
