import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readReceipt } from "@/lib/uploads";

// Serves a receipt image only to members of the group it belongs to.
export async function GET(
  _req: Request,
  { params }: { params: { name: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const name = params.name;
  const expenseId = name.split(".")[0];

  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: { group: { include: { members: true } } },
  });
  if (
    !expense ||
    expense.receiptPath !== name ||
    !expense.group.members.some((m) => m.userId === session.user.id)
  ) {
    return new NextResponse("Not found", { status: 404 });
  }

  const file = await readReceipt(name);
  if (!file) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
