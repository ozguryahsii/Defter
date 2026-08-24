"use client";

import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/components/i18n-provider";
import type { Locale } from "@/lib/i18n";

export function Providers({
  locale = "en",
  children,
}: {
  locale?: Locale;
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        disableTransitionOnChange
      >
        <TooltipProvider delayDuration={200}>
          <I18nProvider locale={locale}>{children}</I18nProvider>
          {/* offset: bildirimler çentik/durum çubuğunun altına girmesin */}
          <Toaster
            position="top-right"
            richColors
            closeButton
            offset={{ top: "calc(var(--safe-top) + 16px)" }}
            mobileOffset={{ top: "calc(var(--safe-top) + 12px)" }}
          />
        </TooltipProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
