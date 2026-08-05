"use client";

import { useEffect, useState } from "react";

/**
 * Uygulama Capacitor iOS kabuğu içinde mi çalışıyor?
 * App Store kuralı (Guideline 3.1.1) gereği, iOS uygulamasında dijital içeriği
 * In-App Purchase dışında bir yolla (ör. indirim/promosyon kodu) açan arayüzler
 * gizlenmelidir. Web ve Android'de davranış değişmez.
 *
 * SSR sırasında window yok; mount sonrası gerçek değeri döner (hydration güvenli).
 */
export function useIsIosApp(): boolean {
  const [isIos, setIsIos] = useState(false);
  useEffect(() => {
    const cap = (window as any)?.Capacitor;
    if (cap?.getPlatform?.() === "ios") setIsIos(true);
  }, []);
  return isIos;
}
