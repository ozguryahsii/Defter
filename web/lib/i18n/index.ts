import { EN } from "./en";

/**
 * SOBSO i18n — gettext tarzı: Türkçe metnin kendisi anahtardır.
 * - locale "tr": metin olduğu gibi döner.
 * - locale "en": EN sözlüğünde karşılığı aranır; yoksa Türkçe'ye düşer
 *   (eksik çeviri uygulamayı asla bozmaz).
 * {name} gibi yer tutucular params ile doldurulur.
 */
export type Locale = "tr" | "en";

export const LOCALE_COOKIE = "sobso_locale";

export function normalizeLocale(value: unknown): Locale {
  return value === "en" ? "en" : "tr";
}

export type TFunc = (key: string, params?: Record<string, string | number>) => string;

export function makeT(locale: Locale): TFunc {
  return (key, params) => {
    let text = locale === "en" ? (EN[key] ?? key) : key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.split(`{${k}}`).join(String(v));
      }
    }
    return text;
  };
}
