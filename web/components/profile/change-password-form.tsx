"use client";

import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, Loader2 } from "lucide-react";
import { changePassword } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { useT } from "@/components/i18n-provider";

export function ChangePasswordForm() {
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setLoading(true);
    setFieldErrors({});
    const res = await changePassword({ ok: false }, new FormData(form));
    setLoading(false);
    if (!res.ok) {
      if (res.fieldErrors) setFieldErrors(res.fieldErrors);
      if (res.error) toast.error(t(res.error));
      return;
    }
    toast.success(t("Parolan güncellendi."));
    form.reset();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="currentPassword">{t("Mevcut parola")}</Label>
        <PasswordInput
          id="currentPassword"
          name="currentPassword"
          autoComplete="current-password"
          required
        />
        {fieldErrors.currentPassword && (
          <p className="text-xs text-destructive">{t(fieldErrors.currentPassword)}</p>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="newPassword">{t("Yeni parola")}</Label>
          <PasswordInput
            id="newPassword"
            name="newPassword"
            autoComplete="new-password"
            placeholder={t("En az 8 karakter")}
            required
          />
          {fieldErrors.newPassword && (
            <p className="text-xs text-destructive">{t(fieldErrors.newPassword)}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">{t("Yeni parola (tekrar)")}</Label>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="new-password"
            required
          />
          {fieldErrors.confirmPassword && (
            <p className="text-xs text-destructive">{t(fieldErrors.confirmPassword)}</p>
          )}
        </div>
      </div>
      <Button type="submit" variant="outline" disabled={loading}>
        {loading ? <Loader2 className="animate-spin" /> : <KeyRound />}
        {t("Parolayı değiştir")}
      </Button>
    </form>
  );
}
