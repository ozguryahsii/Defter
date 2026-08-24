import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { VerifyEmailForm } from "@/components/auth/verify-email-form";
import { getT } from "@/lib/i18n/server";

export function generateMetadata(): Metadata {
  return { title: getT()("E-posta Doğrulama") };
}

/** E-posta adresini gizleyerek gösterir: oz***@gmail.com */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  return `${local.slice(0, 2)}***@${domain}`;
}

export default async function VerifyEmailPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, emailVerified: true },
  });
  if (!user?.email || user.emailVerified) redirect("/dashboard");

  const t = getT();
  return (
    <Card className="glass gradient-border p-6 sm:p-8">
      <div className="mb-6 space-y-1 text-center">
        <h1 className="text-xl font-semibold tracking-tight">
          {t("E-postanı doğrula")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("Sana 6 haneli bir kod gönderdik: {email}", {
            email: maskEmail(user.email),
          })}
        </p>
      </div>
      <VerifyEmailForm />
    </Card>
  );
}
