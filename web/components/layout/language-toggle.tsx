"use client";

import { useI18n } from "@/components/i18n-provider";
import { LOCALE_COOKIE } from "@/lib/i18n";

/** TR ⇄ EN anahtarı: cookie yazar, sayfayı tam yeniler. */
export function LanguageToggle({ className }: { className?: string }) {
  const { locale } = useI18n();
  const next = locale === "tr" ? "en" : "tr";

  return (
    <button
      type="button"
      aria-label={locale === "tr" ? "Switch to English" : "Türkçe'ye geç"}
      className={
        className ??
        "inline-flex h-9 items-center rounded-lg px-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      }
      onClick={() => {
        document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
        window.location.reload();
      }}
    >
      {locale === "tr" ? "EN" : "TR"}
    </button>
  );
}
