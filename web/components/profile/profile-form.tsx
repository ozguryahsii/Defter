"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { updateProfile } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      if (res.error) toast.error(res.error);
      return;
    }
    toast.success("Profil güncellendi.");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="displayName">Görünen ad</Label>
        <Input
          id="displayName"
          name="displayName"
          defaultValue={initial.displayName}
          placeholder="Adın Soyadın"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">E-posta</Label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={initial.email}
          placeholder="ornek@eposta.com"
          autoComplete="email"
        />
        {fieldErrors.email && (
          <p className="text-xs text-destructive">{fieldErrors.email}</p>
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
          <p className="text-xs text-destructive">{fieldErrors.iban}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Grup arkadaşların sana borçlarını öderken bu IBAN&apos;ı ve QR kodunu
          görür.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="ibanName">IBAN hesap adı</Label>
        <Input
          id="ibanName"
          name="ibanName"
          defaultValue={initial.ibanName}
          placeholder="Ad Soyad (hesap sahibi)"
        />
      </div>
      <Button type="submit" variant="brand" disabled={loading}>
        {loading ? <Loader2 className="animate-spin" /> : <Save />}
        Kaydet
      </Button>
    </form>
  );
}
