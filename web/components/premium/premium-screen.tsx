"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  BadgePercent,
  Check,
  Crown,
  Loader2,
  RotateCcw,
  Smartphone,
  Sparkles,
  Ticket,
} from "lucide-react";
import { applyDiscountCode } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/dashboard/section-card";
import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n-provider";
import { useIsIosApp, useIsAndroidApp } from "@/lib/use-native-platform";
import {
  ensureRevenueCat,
  getPaywallPackages,
  purchasePaywallPackage,
  restorePurchases,
  presentRedeemCode,
  type PaywallPackage,
} from "@/lib/revenuecat-client";

// Public App Store SDK anahtarı (uygulamaya gömülmek için — gizli değil).
const RC_APPLE_KEY = "appl_QMvgTRNoeLDbPoWnMGxZPYNfJmk";
// Public Google Play SDK anahtarı (uygulamaya gömülmek için — gizli değil).
const RC_GOOGLE_KEY = "goog_ljPlOoempEDKPsqvhoTrzSEnUSn";

const PLANS = [
  { id: "monthly", name: "Aylık", price: 2.99, per: "/ay" },
  { id: "yearly", name: "Yıllık", price: 24.99, per: "/yıl", tag: "%30 avantajlı" },
] as const;

const PERKS = [
  "Sınırsız grup oluşturma",
  "Gruplarda sınırsız harcama",
  "Fiş okutma — fotoğraftan harcamayı otomatik doldur",
];

function discounted(price: number, percent: number): string {
  return (price * (1 - percent / 100)).toFixed(2);
}

export function PremiumScreen({
  premium,
  premiumUntil,
  plan,
  initialCode,
  userId,
}: {
  premium: boolean;
  premiumUntil?: string | null;
  plan: string | null;
  initialCode: { code: string; percent: number } | null;
  userId: string;
}) {
  const daysLeft = premiumUntil
    ? Math.max(0, Math.ceil((new Date(premiumUntil).getTime() - Date.now()) / 86400000))
    : null;
  const t = useT();
  const isIosApp = useIsIosApp();
  const isAndroidApp = useIsAndroidApp();

  // --- Web indirim kodu akışı (iOS'ta gizli) ---
  const [codeInput, setCodeInput] = useState("");
  const [applied, setApplied] = useState(initialCode);
  const [busy, setBusy] = useState(false);

  async function onApply(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!codeInput.trim()) return;
    setBusy(true);
    const res = await applyDiscountCode(codeInput);
    setBusy(false);
    if (!res.ok || (!res.percent && !res.trialDays)) {
      toast.error(t(res.error ?? "Kod doğrulanamadı."));
      return;
    }
    if (res.trialDays) {
      toast.success(t("{n} günlük Premium başladı! 🎉", { n: res.trialDays }));
      window.location.reload();
      return;
    }
    setApplied({ code: codeInput.trim().toUpperCase(), percent: res.percent! });
    setCodeInput("");
    toast.success(t("Kod uygulandı: %{p} indirim!", { p: res.percent! }));
  }

  // --- iOS native IAP (RevenueCat) akışı ---
  const [packages, setPackages] = useState<PaywallPackage[] | null>(null);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    if (premium) return;
    // iOS'ta davranış birebir aynı kalır (RC_APPLE_KEY); Android'de RC_GOOGLE_KEY
    // doldurulana kadar (Android Yayın Planı Faz 3) hiçbir şey yapmaz.
    const apiKey = isIosApp ? RC_APPLE_KEY : isAndroidApp ? RC_GOOGLE_KEY : null;
    if (!apiKey) return;
    let cancelled = false;
    (async () => {
      try {
        await ensureRevenueCat(apiKey, userId);
        const pkgs = await getPaywallPackages();
        if (!cancelled) setPackages(pkgs);
      } catch {
        if (!cancelled) setPackages([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isIosApp, isAndroidApp, premium, userId]);

  // Satın alma sonrası: sunucu premium'u webhook ile birkaç saniyede günceller.
  const finishActivation = useCallback(() => {
    setActivating(true);
    setTimeout(() => window.location.reload(), 3500);
  }, []);

  async function onSubscribe(pkg: PaywallPackage) {
    setPurchasing(pkg.identifier);
    try {
      const ok = await purchasePaywallPackage(pkg.identifier);
      if (ok) {
        toast.success(t("Premium başladı! 🎉"));
        finishActivation();
      } else {
        toast.error(t("Satın alma tamamlanamadı."));
      }
    } catch (e) {
      const msg = (e as { message?: string })?.message ?? "";
      if (!/cancel/i.test(msg)) toast.error(t("Satın alma tamamlanamadı."));
    } finally {
      setPurchasing(null);
    }
  }

  async function onRestore() {
    setBusy(true);
    try {
      const ok = await restorePurchases();
      if (ok) {
        toast.success(t("Aboneliğin geri yüklendi 🎉"));
        finishActivation();
      } else {
        toast.error(t("Geri yüklenecek aktif abonelik bulunamadı."));
      }
    } catch {
      toast.error(t("Geri yükleme başarısız."));
    } finally {
      setBusy(false);
    }
  }

  function priceOf(period: "monthly" | "yearly"): string | null {
    const p = packages?.find((x) => x.period === period);
    return p?.priceString ?? null;
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Crown className="h-6 w-6 text-brand" /> SOBSO Premium
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("Sınırsız grup ve harcama ile tatil hesaplarını özgürce tut.")}
        </p>
      </div>

      {premium ? (
        <SectionCard
          title={t("Premium üyesin 🎉")}
          description={
            daysLeft != null
              ? t("Deneme süresi — {n} gün kaldı", { n: daysLeft })
              : plan === "yearly"
                ? t("Yıllık plan aktif")
                : t("Aylık plan aktif")
          }
        >
          <ul className="space-y-2">
            {PERKS.map((p) => (
              <li key={p} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-success" /> {t(p)}
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : isIosApp ? (
        // ---------------- iOS: gerçek In-App Purchase paywall ----------------
        <>
          <SectionCard title={t("Premium'da neler var?")}>
            <ul className="space-y-2">
              {PERKS.map((p) => (
                <li key={p} className="flex items-center gap-2 text-sm">
                  <Sparkles className="h-4 w-4 text-brand" /> {t(p)}
                </li>
              ))}
            </ul>
          </SectionCard>

          {packages === null ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : packages.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">
              {t("Abonelik şu an yüklenemedi. Lütfen daha sonra tekrar dene.")}
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {(["yearly", "monthly"] as const).map((period) => {
                const pkg = packages.find((x) => x.period === period);
                if (!pkg) return null;
                const isYear = period === "yearly";
                return (
                  <button
                    key={pkg.identifier}
                    onClick={() => onSubscribe(pkg)}
                    disabled={!!purchasing || activating}
                    className={cn(
                      "relative rounded-2xl border p-5 text-left transition active:scale-[0.99]",
                      isYear ? "border-brand/50 bg-brand/5" : "border-border/60 bg-card/40",
                    )}
                  >
                    {isYear && (
                      <Badge variant="brand" className="absolute -top-2.5 right-4 text-[10px]">
                        {t("En avantajlı")}
                      </Badge>
                    )}
                    <p className="text-sm font-medium text-muted-foreground">
                      {isYear ? t("Yıllık") : t("Aylık")}
                    </p>
                    <p className="mt-1.5 text-2xl font-semibold">{priceOf(period)}</p>
                    <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand">
                      {purchasing === pkg.identifier ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Crown className="h-4 w-4" />
                      )}
                      {t("Abone ol")}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {activating && (
            <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> {t("Premium aktifleşiyor…")}
            </p>
          )}

          {/* İndirim kodu: App Store Offer Code kutusunu açar — belirgin buton */}
          <button
            onClick={() => presentRedeemCode()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-brand/50 bg-brand/5 px-5 py-4 text-base font-medium text-foreground transition active:scale-[0.99]"
          >
            <Ticket className="h-5 w-5 text-brand" /> {t("İndirim kodu kullan")}
          </button>

          <div className="flex justify-center pt-1 text-sm">
            <button onClick={onRestore} disabled={busy} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
              <RotateCcw className="h-4 w-4" /> {t("Satın alımları geri yükle")}
            </button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            {t("Abonelik otomatik yenilenir. Dilediğin zaman Ayarlar'dan iptal edebilirsin.")}
          </p>

          {/* App Store Guideline 3.1.2: paywall'da Kullanım Koşulları (EULA) + Gizlilik linkleri zorunlu */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center text-xs text-muted-foreground">
            <a href="/terms" className="underline underline-offset-2 hover:text-foreground">
              {t("Kullanım Koşulları")}
            </a>
            <span aria-hidden>·</span>
            <a href="/privacy" className="underline underline-offset-2 hover:text-foreground">
              {t("Gizlilik Politikası")}
            </a>
          </div>
        </>
      ) : isAndroidApp ? (
        // ---------------- Android: gerçek In-App Purchase paywall (Google Play Billing) ----------------
        <>
          <SectionCard title={t("Premium'da neler var?")}>
            <ul className="space-y-2">
              {PERKS.map((p) => (
                <li key={p} className="flex items-center gap-2 text-sm">
                  <Sparkles className="h-4 w-4 text-brand" /> {t(p)}
                </li>
              ))}
            </ul>
          </SectionCard>

          {packages === null ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : packages.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">
              {t("Abonelik şu an yüklenemedi. Lütfen daha sonra tekrar dene.")}
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {(["yearly", "monthly"] as const).map((period) => {
                const pkg = packages.find((x) => x.period === period);
                if (!pkg) return null;
                const isYear = period === "yearly";
                return (
                  <button
                    key={pkg.identifier}
                    onClick={() => onSubscribe(pkg)}
                    disabled={!!purchasing || activating}
                    className={cn(
                      "relative rounded-2xl border p-5 text-left transition active:scale-[0.99]",
                      isYear ? "border-brand/50 bg-brand/5" : "border-border/60 bg-card/40",
                    )}
                  >
                    {isYear && (
                      <Badge variant="brand" className="absolute -top-2.5 right-4 text-[10px]">
                        {t("En avantajlı")}
                      </Badge>
                    )}
                    <p className="text-sm font-medium text-muted-foreground">
                      {isYear ? t("Yıllık") : t("Aylık")}
                    </p>
                    <p className="mt-1.5 text-2xl font-semibold">{priceOf(period)}</p>
                    <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand">
                      {purchasing === pkg.identifier ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Crown className="h-4 w-4" />
                      )}
                      {t("Abone ol")}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {activating && (
            <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> {t("Premium aktifleşiyor…")}
            </p>
          )}

          {/* Play Store'da uygulama içi kod kullanımı promosyon kodları için ayrı bir akıştır
              (Play Store uygulaması üzerinden), bu yüzden burada gösterilmiyor. */}
          <div className="flex justify-center pt-1 text-sm">
            <button onClick={onRestore} disabled={busy} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
              <RotateCcw className="h-4 w-4" /> {t("Satın alımları geri yükle")}
            </button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            {t("Abonelik otomatik yenilenir. Dilediğin zaman Play Store'dan iptal edebilirsin.")}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center text-xs text-muted-foreground">
            <a href="/terms" className="underline underline-offset-2 hover:text-foreground">
              {t("Kullanım Koşulları")}
            </a>
            <span aria-hidden>·</span>
            <a href="/privacy" className="underline underline-offset-2 hover:text-foreground">
              {t("Gizlilik Politikası")}
            </a>
          </div>
        </>
      ) : (
        // ---------------- Web: planlar + indirim kodu ----------------
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {PLANS.map((p) => (
              <div
                key={p.id}
                className={cn(
                  "relative rounded-2xl border p-5",
                  p.id === "yearly" ? "border-brand/50 bg-brand/5" : "border-border/60 bg-card/40",
                )}
              >
                {"tag" in p && p.tag && (
                  <Badge variant="brand" className="absolute -top-2.5 right-4 text-[10px]">
                    {t(p.tag)}
                  </Badge>
                )}
                <p className="text-sm font-medium text-muted-foreground">{t(p.name)}</p>
                <p className="mt-1.5">
                  {applied ? (
                    <>
                      <span className="mr-2 text-base text-muted-foreground line-through">${p.price}</span>
                      <span className="text-2xl font-semibold text-brand">${discounted(p.price, applied.percent)}</span>
                    </>
                  ) : (
                    <span className="text-2xl font-semibold">${p.price}</span>
                  )}
                  <span className="ml-1 text-xs text-muted-foreground">{t(p.per)}</span>
                </p>
              </div>
            ))}
          </div>

          <SectionCard
            title={t("İndirim kodun var mı?")}
            description={t("Influencer kodunu gir, indirimli fiyatı gör")}
          >
            <form onSubmit={onApply} className="flex gap-2">
              <Input
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                placeholder={t("KODUGIRINIZ")}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                maxLength={20}
                className="flex-1"
              />
              <Button type="submit" variant="outline" disabled={busy}>
                {busy ? <Loader2 className="animate-spin" /> : <BadgePercent />}
                {t("Uygula")}
              </Button>
            </form>
            {applied && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-success">
                <Check className="h-4 w-4" />
                {t("{code} uygulandı — %{p} indirim", { code: applied.code, p: applied.percent })}
              </p>
            )}
          </SectionCard>

          <SectionCard title={t("Premium'da neler var?")}>
            <ul className="space-y-2">
              {PERKS.map((p) => (
                <li key={p} className="flex items-center gap-2 text-sm">
                  <Sparkles className="h-4 w-4 text-brand" /> {t(p)}
                </li>
              ))}
            </ul>
          </SectionCard>

          <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-secondary/30 p-4">
            <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
            <div className="text-sm">
              <p className="font-medium">{t("Satın alma çok yakında")}</p>
              <p className="mt-0.5 text-muted-foreground">
                {t("Premium üyelik satın alımı SOBSO mobil uygulaması üzerinden (App Store / Google Play) yapılacak. İndirim kodunu şimdiden işleyebilirsin; satın alma açıldığında kodun otomatik uygulanır.")}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
