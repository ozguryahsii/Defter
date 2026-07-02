import Link from "next/link";
import { Logo } from "@/components/layout/logo";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8 flex justify-center">
        <Logo href="/" size="md" />
      </div>
      <article className="space-y-6 text-sm leading-relaxed text-muted-foreground [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h1]:text-foreground [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        {children}
      </article>
      <footer className="mt-10 flex justify-center gap-4 border-t border-border/60 pt-6 text-xs text-muted-foreground">
        <Link href="/privacy" className="hover:text-foreground">
          Gizlilik Politikası
        </Link>
        <Link href="/terms" className="hover:text-foreground">
          Kullanım Şartları
        </Link>
        <Link href="/login" className="hover:text-foreground">
          Giriş
        </Link>
      </footer>
    </div>
  );
}
