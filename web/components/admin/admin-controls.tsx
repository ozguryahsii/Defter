"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Crown, Loader2, Plus, Power } from "lucide-react";
import {
  adminCreateCode,
  adminSetCodeActive,
  adminSetPremium,
} from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/components/i18n-provider";

/** Yeni indirim kodu oluşturma formu. */
export function CodeCreateForm() {
  const router = useRouter();
  const t = useT();
  const [code, setCode] = useState("");
  const [percent, setPercent] = useState("20");
  const [influencer, setInfluencer] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const res = await adminCreateCode({
      code,
      percent: parseInt(percent, 10),
      influencer: influencer || undefined,
      expiresAt: expiresAt || undefined,
    });
    setBusy(false);
    if (!res.ok) {
      toast.error(t(res.error ?? "Kod oluşturulamadı."));
      return;
    }
    toast.success(t("{code} oluşturuldu.", { code: code.trim().toUpperCase() }));
    setCode("");
    setInfluencer("");
    setExpiresAt("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="ac-code">{t("Kod")}</Label>
        <Input
          id="ac-code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder={t("KODUGIRINIZ")}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          maxLength={20}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ac-percent">{t("İndirim (%)")}</Label>
        <Input
          id="ac-percent"
          type="number"
          min={1}
          max={90}
          value={percent}
          onChange={(e) => setPercent(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ac-inf">{t("Influencer (opsiyonel)")}</Label>
        <Input
          id="ac-inf"
          value={influencer}
          onChange={(e) => setInfluencer(e.target.value)}
          placeholder={t("Örn. Özge")}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ac-exp">{t("Son kullanma (opsiyonel)")}</Label>
        <Input
          id="ac-exp"
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
        />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" variant="brand" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <Plus />}
          {t("Kod Oluştur")}
        </Button>
      </div>
    </form>
  );
}

/** Kod aktif/pasif düğmesi. */
export function CodeActiveToggle({
  codeId,
  active,
}: {
  codeId: string;
  active: boolean;
}) {
  const router = useRouter();
  const t = useT();
  const [busy, setBusy] = useState(false);

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={busy}
      className={active ? "text-success" : "text-muted-foreground"}
      onClick={async () => {
        setBusy(true);
        const res = await adminSetCodeActive(codeId, !active);
        setBusy(false);
        if (!res.ok) {
          toast.error(t(res.error ?? "İşlem başarısız."));
          return;
        }
        toast.success(active ? t("Kod pasifleştirildi.") : t("Kod aktifleştirildi."));
        router.refresh();
      }}
    >
      {busy ? <Loader2 className="animate-spin" /> : <Power />}
      {active ? t("Aktif") : t("Pasif")}
    </Button>
  );
}

/** Üyenin premium durumunu elle aç/kapat. */
export function PremiumToggle({
  userId,
  premium,
}: {
  userId: string;
  premium: boolean;
}) {
  const router = useRouter();
  const t = useT();
  const [busy, setBusy] = useState(false);

  return (
    <Button
      variant={premium ? "outline" : "ghost"}
      size="sm"
      disabled={busy}
      className={premium ? "text-brand" : "text-muted-foreground"}
      onClick={async () => {
        setBusy(true);
        const res = await adminSetPremium(userId, !premium);
        setBusy(false);
        if (!res.ok) {
          toast.error(t(res.error ?? "İşlem başarısız."));
          return;
        }
        toast.success(premium ? t("Premium kapatıldı.") : t("Premium verildi."));
        router.refresh();
      }}
    >
      {busy ? <Loader2 className="animate-spin" /> : <Crown />}
      {premium ? "Premium" : "Free"}
    </Button>
  );
}
