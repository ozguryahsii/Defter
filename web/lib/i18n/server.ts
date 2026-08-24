import { cookies } from "next/headers";
import { LOCALE_COOKIE, makeT, normalizeLocale, type Locale } from "./index";

/** Sunucu bileşenleri/aksiyonları için: cookie'den dil. */
export function getLocale(): Locale {
  return normalizeLocale(cookies().get(LOCALE_COOKIE)?.value);
}

export function getT() {
  return makeT(getLocale());
}
