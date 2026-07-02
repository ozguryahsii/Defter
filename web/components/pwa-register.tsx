"use client";

import { useEffect } from "react";

/** Registers the service worker so Defter is installable as a PWA. */
export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // ignore — PWA is progressive enhancement
      });
    }
  }, []);
  return null;
}
