"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { setDisplayCurrency } from "@/lib/actions";
import { CURRENCIES } from "@/lib/currencies";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/components/i18n-provider";

/**
 * Ana sayfadaki özet kutularının para birimi. Grupların kendi para birimleri
 * bundan etkilenmez — yalnızca üstteki toplamlar bu birime çevrilir.
 */
export function DisplayCurrencySelect({ value }: { value: string }) {
  const router = useRouter();
  const t = useT();
  const [busy, setBusy] = useState(false);

  async function onChange(next: string) {
    setBusy(true);
    const res = await setDisplayCurrency(next);
    setBusy(false);
    if (!res.ok) {
      toast.error(t(res.error ?? "İşlem başarısız."));
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">
        {t("Özet para birimi")}
      </span>
      <Select value={value} onValueChange={onChange} disabled={busy}>
        <SelectTrigger className="h-9 w-24">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <SelectValue />}
        </SelectTrigger>
        <SelectContent>
          {CURRENCIES.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              {c.code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
