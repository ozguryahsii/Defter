import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/providers";
import { PwaRegister } from "@/components/pwa-register";

const sans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: {
    default: "SOBSO! — Ortak Harcama Paylaşımı",
    template: "%s · SOBSO!",
  },
  description:
    "Arkadaş grupları ve ortak girişimler için premium harcama paylaşım ve borç hesaplama uygulaması. I hope so!",
  manifest: "/manifest.webmanifest",
  applicationName: "SOBSO!",
  appleWebApp: { capable: true, title: "SOBSO!", statusBarStyle: "black-translucent" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0f",
  width: "device-width",
  initialScale: 1,
  // iOS, 16px altındaki inputlara odaklanınca sayfayı kendiliğinden
  // yakınlaştırıp kaydırıyor; uygulama hissi için zoom sabitlendi.
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover", // çentikli ekranlarda güvenli alan değişkenleri için
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" className={`dark ${sans.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>{children}</Providers>
        <PwaRegister />
      </body>
    </html>
  );
}
