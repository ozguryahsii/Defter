import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SectionCard } from "@/components/dashboard/section-card";
import { ProfileForm } from "@/components/profile/profile-form";
import { AvatarForm } from "@/components/profile/avatar-form";
import { ChangePasswordForm } from "@/components/profile/change-password-form";
import { DeleteAccountCard } from "@/components/profile/delete-account-card";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Profil" };

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!user) redirect("/login");
  const t = getT();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("Profil")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          @{user.username} · {t("görünen adını ve ödeme bilgilerini yönet")}
        </p>
      </div>

      <SectionCard
        title={t("Profil Fotoğrafı")}
        description={t("Fotoğrafın grup arkadaşlarına her yerde görünür")}
      >
        <AvatarForm
          userId={user.id}
          name={user.displayName ?? user.username}
          hasAvatar={!!user.avatarPath}
        />
      </SectionCard>

      <SectionCard
        title={t("Hesap & Ödeme Bilgileri")}
        description={t("IBAN eklersen borç ödemelerinde QR ile kolayca ödeme alırsın")}
      >
        <ProfileForm
          initial={{
            displayName: user.displayName ?? "",
            email: user.email ?? "",
            iban: user.iban ?? "",
            ibanName: user.ibanName ?? "",
          }}
        />
      </SectionCard>

      <SectionCard
        title={t("Parola Değiştir")}
        description={t("Hesap güvenliğin için güçlü bir parola kullan")}
      >
        <ChangePasswordForm />
      </SectionCard>

      <DeleteAccountCard />
    </div>
  );
}
