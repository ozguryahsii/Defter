"use client";

/**
 * RevenueCat (Capacitor) istemci sarmalayıcısı. Yalnızca native (iOS) kabukta
 * çalışır — web'de çağrılmamalı. Native eklenti mobile/'da kurulu olduğundan,
 * bu JS köprü üzerinden native satın almayı tetikler.
 */

export type PaywallPackage = {
  identifier: string;
  productId: string;
  priceString: string;
  period: "monthly" | "yearly" | "other";
  title: string;
};

let configuredFor: string | null = null;

export async function ensureRevenueCat(apiKey: string, userId: string): Promise<void> {
  const { Purchases, LOG_LEVEL } = await import("@revenuecat/purchases-capacitor");
  if (configuredFor === userId) return;
  if (configuredFor === null) {
    await Purchases.setLogLevel({ level: LOG_LEVEL.ERROR });
    await Purchases.configure({ apiKey, appUserID: userId });
  } else {
    await Purchases.logIn({ appUserID: userId });
  }
  configuredFor = userId;
}

export async function getPaywallPackages(): Promise<PaywallPackage[]> {
  const { Purchases } = await import("@revenuecat/purchases-capacitor");
  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  if (!current) return [];
  return current.availablePackages.map((p) => ({
    identifier: p.identifier,
    productId: p.product.identifier,
    priceString: p.product.priceString,
    title: p.product.title,
    period:
      p.packageType === "MONTHLY"
        ? "monthly"
        : p.packageType === "ANNUAL"
          ? "yearly"
          : "other",
  }));
}

/** Paketi satın alır; herhangi bir entitlement aktifse premium true döner. */
export async function purchasePaywallPackage(identifier: string): Promise<boolean> {
  const { Purchases } = await import("@revenuecat/purchases-capacitor");
  const offerings = await Purchases.getOfferings();
  const pkg = offerings.current?.availablePackages.find((p) => p.identifier === identifier);
  if (!pkg) throw new Error("package_not_found");
  const res = await Purchases.purchasePackage({ aPackage: pkg });
  return Object.keys(res.customerInfo.entitlements.active).length > 0;
}

/** Geçmiş satın almaları geri yükler; premium varsa true. */
export async function restorePurchases(): Promise<boolean> {
  const { Purchases } = await import("@revenuecat/purchases-capacitor");
  const res = await Purchases.restorePurchases();
  return Object.keys(res.customerInfo.entitlements.active).length > 0;
}

/** Apple Offer Code (indirim/bedava kod) kullanma sayfasını açar. */
export async function presentRedeemCode(): Promise<void> {
  const { Purchases } = await import("@revenuecat/purchases-capacitor");
  // iOS 16+; yoksa sessizce yok sayılır.
  const anyP = Purchases as unknown as { presentCodeRedemptionSheet?: () => Promise<void> };
  if (anyP.presentCodeRedemptionSheet) await anyP.presentCodeRedemptionSheet();
}
