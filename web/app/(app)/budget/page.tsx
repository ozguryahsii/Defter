import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Kişisel Bütçe" };

// Entry point for the personal budget: finds (or creates once) the user's
// single "Kisisel" group and forwards to its screen.
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

  redirect(`/groups/${group.id}`);
}
