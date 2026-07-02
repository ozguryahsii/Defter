import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { getGroupDetail } from "@/lib/queries";
import { GroupScreen } from "@/components/groups/group-screen";

export const metadata: Metadata = { title: "Grup" };

export default async function GroupDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  const userId = session!.user.id;
  const detail = await getGroupDetail(params.id, userId);
  if (!detail) notFound();

  // The personal budget lives on its own route (keeps the sidebar selection right).
  if (detail.group.type === "Kisisel") redirect("/budget");

  return <GroupScreen detail={detail} userId={userId} />;
}
