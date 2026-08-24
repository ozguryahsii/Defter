"use client";

import { createContext, useContext, useMemo } from "react";
import { makeT, type Locale, type TFunc } from "@/lib/i18n";
import { setFormatLocale } from "@/lib/format";

const I18nContext = createContext<{ locale: Locale; t: TFunc }>({
  locale: "en",
  t: makeT("en"),
});

export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  setFormatLocale(locale);
  const value = useMemo(() => ({ locale, t: makeT(locale) }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

export function useT(): TFunc {
  return useContext(I18nContext).t;
}
