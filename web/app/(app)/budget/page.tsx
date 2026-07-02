import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGroupDetail } from "@/lib/queries";
import { GroupScreen } from "@/components/groups/group-screen";

export const metadata: Metadata = { title: "Kişisel Bütçe" };

// The personal budget renders on its own route so the sidebar highlights
// "Kişisel Bütçe" (not "Gruplar"). The backing group is created on first visit.
export default async function BudgetPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  let group = await prisma.group.findFirst({
    where: {
      type: "Kisisel",
      createdById: userId,
      members: { some: { userId } },
    },
    select: { id: true },
  });

  if (!group) {
    group = await prisma.group.create({
      data: {
        name: "Kişisel Bütçe",
        type: "Kisisel",
        currency: "TRY",
        createdById: userId,
        members: { create: { userId } },
      },
      select: { id: true },
    });
  }

  const detail = await getGroupDetail(group.id, userId);
  if (!detail) redirect("/dashboard");

  return <GroupScreen detail={detail} userId={userId} />;
}
