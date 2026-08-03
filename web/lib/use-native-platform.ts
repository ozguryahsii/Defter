"use client";

import { useEffect, useState } from "react";

type CapacitorGlobal = { getPlatform?: () => string; isNativePlatform?: () => boolean };

/** Uygulama Capacitor iOS kabuğu içinde mi çalışıyor? (mount sonrası true olur) */
export function useIsIosApp(): boolean {
  const [isIos, setIsIos] = useState(false);
  useEffect(() => {
    const cap = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
    if (cap?.getPlatform?.() === "ios") setIsIos(true);
  }, []);
  return isIos;
}
