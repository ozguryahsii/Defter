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
  req: Request,
  { params }: { params: { userId: string } },
) {
  const session = await auth();
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { avatarPath: true },
  });
  if (!user?.avatarPath)
    return new NextResponse("Not found", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });

  // no-cache + ETag: tarayıcı her seferinde sorar; foto değişmediyse 304
  // döner (hızlı), değiştiyse anında yenisini alır.
  const etag = `"${user.avatarPath}"`;
  if (req.headers.get("if-none-match") === etag)
    return new NextResponse(null, {
      status: 304,
      headers: { ETag: etag, "Cache-Control": "private, no-cache" },
    });

  const file = await readReceipt(user.avatarPath);
  if (!file) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "private, no-cache",
      ETag: etag,
    },
  });
}
