"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  BadgePercent,
  Check,
  Crown,
  Loader2,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { applyDiscountCode } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/dashboard/section-card";
import { cn } from "@/lib/utils";

const PLANS = [
  { id: "monthly", name: "Aylık", price: 2.99, per: "/ay" },
  { id: "yearly", name: "Yıllık", price: 20, per: "/yıl", tag: "%44 avantajlı" },
] as const;

const PERKS = [
  "Sınırsız grup oluşturma",
  "Gruplarda sınırsız harcama",
  "Gelecek premium özelliklerine erken erişim",
];

function discounted(price: number, percent: number): string {
  return (price * (1 - percent / 100)).toFixed(2);
}

export function PremiumScreen({
  premium,
  plan,
  initialCode,
}: {
  premium: boolean;
  plan: string | null;
  initialCode: { code: string; percent: number } | null;
}) {
  const [codeInput, setCodeInput] = useState("");
  const [applied, setApplied] = useState(initialCode);
  const [busy, setBusy] = useState(false);

  async function onApply(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!codeInput.trim()) return;
    setBusy(true);
    const res = await applyDiscountCode(codeInput);
    setBusy(false);
    if (!res.ok || !res.percent) {
      toast.error(res.error ?? "Kod doğrulanamadı.");
      return;
    }
    setApplied({ code: codeInput.trim().toUpperCase(), percent: res.percent });
    setCodeInput("");
    toast.success(`Kod uygulandı: %${res.percent} indirim!`);
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Crown className="h-6 w-6 text-brand" /> SOBSO Premium
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sınırsız grup ve harcama ile tatil hesaplarını özgürce tut.
        </p>
      </div>

      {premium ? (
        <SectionCard
          title="Premium üyesin 🎉"
          description={
            plan === "yearly" ? "Yıllık plan aktif" : "Aylık plan aktif"
          }
        >
          <ul className="space-y-2">
            {PERKS.map((p) => (
              <li key={p} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-success" /> {p}
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : (
        <>
          {/* Plan kartları */}
          <div className="grid gap-3 sm:grid-cols-2">
            {PLANS.map((p) => (
              <div
                key={p.id}
                className={cn(
                  "relative rounded-2xl border p-5",
                  p.id === "yearly"
                    ? "border-brand/50 bg-brand/5"
                    : "border-border/60 bg-card/40",
                )}
              >
                {"tag" in p && p.tag && (
                  <Badge
                    variant="brand"
                    className="absolute -top-2.5 right-4 text-[10px]"
                  >
                    {p.tag}
                  </Badge>
                )}
                <p className="text-sm font-medium text-muted-foreground">
                  {p.name}
                </p>
                <p className="mt-1.5">
                  {applied ? (
                    <>
                      <span className="mr-2 text-base text-muted-foreground line-through">
                        ${p.price}
                      </span>
                      <span className="text-2xl font-semibold text-brand">
                        ${discounted(p.price, applied.percent)}
                      </span>
                    </>
                  ) : (
                    <span className="text-2xl font-semibold">${p.price}</span>
                  )}
                  <span className="ml-1 text-xs text-muted-foreground">
                    {p.per}
                  </span>
                </p>
              </div>
            ))}
          </div>

          <SectionCard
            title="İndirim kodun var mı?"
            description="Influencer kodunu gir, indirimli fiyatı gör"
          >
            <form onSubmit={onApply} className="flex gap-2">
              <Input
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                placeholder="KODUGIRINIZ"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                maxLength={20}
                className="flex-1"
              />
              <Button type="submit" variant="outline" disabled={busy}>
                {busy ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <BadgePercent />
                )}
                Uygula
              </Button>
            </form>
            {applied && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-success">
                <Check className="h-4 w-4" />
                {applied.code} uygulandı — %{applied.percent} indirim
              </p>
            )}
          </SectionCard>

          <SectionCard title="Premium'da neler var?">
            <ul className="space-y-2">
              {PERKS.map((p) => (
                <li key={p} className="flex items-center gap-2 text-sm">
                  <Sparkles className="h-4 w-4 text-brand" /> {p}
                </li>
              ))}
            </ul>
          </SectionCard>

          <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-secondary/30 p-4">
            <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
            <div className="text-sm">
              <p className="font-medium">Satın alma çok yakında</p>
              <p className="mt-0.5 text-muted-foreground">
                Premium üyelik satın alımı SOBSO mobil uygulaması üzerinden
                (App Store / Google Play) yapılacak. İndirim kodunu şimdiden
                işleyebilirsin; satın alma açıldığında kodun otomatik uygulanır.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
