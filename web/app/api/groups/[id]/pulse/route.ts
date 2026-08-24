import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Lightweight "has anything changed?" probe for live refresh. Returns the
// timestamp of the most recent activity in the group (0 if none).
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ v: 0 }, { status: 401 });

  const member = await prisma.groupMember.findFirst({
    where: { groupId: params.id, userId: session.user.id },
    select: { id: true },
  });
  if (!member) return NextResponse.json({ v: 0 }, { status: 404 });

  const last = await prisma.activity.findFirst({
    where: { groupId: params.id },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  return NextResponse.json({ v: last ? last.createdAt.getTime() : 0 });
}
