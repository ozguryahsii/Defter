"use client";

import { useEffect } from "react";

/**
 * Service worker'ı yalnızca CANLI modda kaydeder. Geliştirme modunda
 * kayıtlıysa kaldırır: dev'de chunk adresleri sabit olduğu için SW eski
 * dosyaları servis edip "Cannot read properties of undefined (reading
 * 'call')" hatalarına yol açıyordu.
 */
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister()))
        .catch(() => {});
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // ignore — PWA is progressive enhancement
    });
  }, []);
  return null;
}
