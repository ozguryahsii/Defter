import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AuroraBackground } from "@/components/magic/aurora-background";
import { Logo } from "@/components/layout/logo";

/**
 * Doğrulama ekranı: (auth) grubundan AYRI — o layout oturumu olan herkesi
 * /dashboard'a atar, bu ise oturum İSTER (aksi halde /login). Aynı görsel
 * sarmalayıcı, farklı oturum kuralı; yönlendirme döngüsü böylece kırılır.
 */
export default async function VerifyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <AuroraBackground />
      <div className="w-full max-w-md">
        <div className="mb-2 flex justify-center">
          <Logo href="/dashboard" size="lg" />
        </div>
        {children}
      </div>
    </div>
  );
}
