import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SectionCard } from "@/components/dashboard/section-card";
import { ProfileForm } from "@/components/profile/profile-form";

export const metadata: Metadata = { title: "Profil" };

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profil</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          @{user.username} · görünen adını ve ödeme bilgilerini yönet
        </p>
      </div>

      <SectionCard
        title="Hesap & Ödeme Bilgileri"
        description="IBAN eklersen borç ödemelerinde QR ile kolayca ödeme alırsın"
      >
        <ProfileForm
          initial={{
            displayName: user.displayName ?? "",
            iban: user.iban ?? "",
            ibanName: user.ibanName ?? "",
          }}
        />
      </SectionCard>
    </div>
  );
}
