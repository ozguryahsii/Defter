import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PremiumScreen } from "@/components/premium/premium-screen";
import { getT } from "@/lib/i18n/server";

export function generateMetadata(): Metadata {
  return { title: getT()("Premium") };
}

export default async function PremiumPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      premium: true,
      premiumPlan: true,
      premiumUntil: true,
      codeRedemptions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { code: true },
      },
    },
  });
  if (!user) redirect("/login");

  const lastCode = user.codeRedemptions[0]?.code;

  return (
    <PremiumScreen
      userId={session.user.id}
      premium={user.premium && (!user.premiumUntil || user.premiumUntil > new Date())}
      premiumUntil={user.premiumUntil?.toISOString() ?? null}
      plan={user.premiumPlan}
      initialCode={
        lastCode && lastCode.active
          ? { code: lastCode.code, percent: lastCode.percent }
          : null
      }
    />
  );
}
