"use client";

import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, Loader2 } from "lucide-react";
import { changePassword } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm() {
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
      if (res.error) toast.error(res.error);
      return;
    }
    toast.success("Parolan güncellendi.");
    form.reset();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Mevcut parola</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
        {fieldErrors.currentPassword && (
          <p className="text-xs text-destructive">{fieldErrors.currentPassword}</p>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="newPassword">Yeni parola</Label>
          <Input
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            placeholder="En az 8 karakter"
            required
          />
          {fieldErrors.newPassword && (
            <p className="text-xs text-destructive">{fieldErrors.newPassword}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Yeni parola (tekrar)</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
          />
          {fieldErrors.confirmPassword && (
            <p className="text-xs text-destructive">{fieldErrors.confirmPassword}</p>
          )}
        </div>
      </div>
      <Button type="submit" variant="outline" disabled={loading}>
        {loading ? <Loader2 className="animate-spin" /> : <KeyRound />}
        Parolayı değiştir
      </Button>
    </form>
  );
}
