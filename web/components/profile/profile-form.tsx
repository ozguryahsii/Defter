"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { updateProfile } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/components/i18n-provider";

export function ProfileForm({
  initial,
}: {
  initial: {
    displayName: string;
    email: string;
    iban: string;
    ibanName: string;
  };
}) {
  const router = useRouter();
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setFieldErrors({});
    const res = await updateProfile({ ok: false }, new FormData(e.currentTarget));
    setLoading(false);
    if (!res.ok) {
      if (res.fieldErrors) setFieldErrors(res.fieldErrors);
      if (res.error) toast.error(t(res.error));
      return;
    }
    toast.success(t("Profil güncellendi."));
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="displayName">{t("Ad-Soyad (değiştirilemez)")}</Label>
        <Input
          id="displayName"
          defaultValue={initial.displayName}
          disabled
          className="opacity-70"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">{t("E-posta")}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={initial.email}
          placeholder={t("ornek@eposta.com")}
          autoComplete="email"
        />
        {fieldErrors.email && (
          <p className="text-xs text-destructive">{t(fieldErrors.email)}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="iban">IBAN</Label>
        <Input
          id="iban"
          name="iban"
          defaultValue={initial.iban}
          placeholder="TR00 0000 0000 0000 0000 0000 00"
          spellCheck={false}
        />
        {fieldErrors.iban && (
          <p className="text-xs text-destructive">{t(fieldErrors.iban)}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {t("Grup arkadaşların sana borçlarını öderken bu IBAN'ı ve QR kodunu görür.")}
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="ibanName">{t("IBAN Sahibinin Adı Soyadı")}</Label>
        <Input
          id="ibanName"
          name="ibanName"
          defaultValue={initial.ibanName}
          placeholder={t("Ad Soyad")}
        />
      </div>
      <Button type="submit" variant="brand" disabled={loading}>
        {loading ? <Loader2 className="animate-spin" /> : <Save />}
        {t("Kaydet")}
      </Button>
    </form>
  );
}
