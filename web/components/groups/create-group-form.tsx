"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { createGroup } from "@/lib/actions";
import { CURRENCIES } from "@/lib/currencies";
import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CreateGroupForm() {
  const router = useRouter();
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    const form = new FormData(e.currentTarget);

    const res = await createGroup({ ok: false }, form);
    if (!res.ok || !res.groupId) {
      setLoading(false);
      if (res.fieldErrors) setErrors(res.fieldErrors);
      if (res.error) toast.error(t(res.error));
      return;
    }
    toast.success(t("Grup oluşturuldu!"));
    router.push(`/groups/${res.groupId}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">{t("Grup adı")}</Label>
        <Input
          id="name"
          name="name"
          placeholder={t("Örn. Bodrum Tatili 2026")}
          required
          autoFocus
        />
        {errors.name && <p className="text-xs text-destructive">{t(errors.name)}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="currency">{t("Para birimi")}</Label>
        <Select name="currency" defaultValue="TRY">
          <SelectTrigger id="currency">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {CURRENCIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.code} — {t(c.name)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/groups")}
        >
          {t("Vazgeç")}
        </Button>
        <Button type="submit" variant="brand" disabled={loading}>
          {loading && <Loader2 className="animate-spin" />}
          {t("Oluştur")}
        </Button>
      </div>
    </form>
  );
}
