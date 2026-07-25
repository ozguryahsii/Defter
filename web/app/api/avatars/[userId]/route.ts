import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readReceipt } from "@/lib/uploads";

export const dynamic = "force-dynamic";

/**
 * Serves a user's profile photo to any signed-in user. Returns 404 when the
 * user has no photo — the Avatar component then falls back to initials.
 */
export async function GET(
  _req: Request,
  { params }: { params: { userId: string } },
) {
  const session = await auth();
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { avatarPath: true },
  });
  if (!user?.avatarPath) return new NextResponse("Not found", { status: 404 });

  const file = await readReceipt(user.avatarPath);
  if (!file) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.contentType,
      // Kısa cache: foto değişince en geç 2 dk içinde her yerde tazelenir.
      "Cache-Control": "private, max-age=120",
    },
  });
}
