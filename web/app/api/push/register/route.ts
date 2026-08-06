import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/push/register   { token, platform }
 *
 * Uygulama açılışında cihazın bildirim jetonunu kaydeder. Aynı jeton başka
 * bir hesaba aitse o hesaptan alınıp bu kullanıcıya bağlanır (aynı telefonda
 * hesap değiştirildiğinde bildirimler yanlış kişiye gitmesin).
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ ok: false }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    token?: unknown;
    platform?: unknown;
  } | null;

  const token = typeof body?.token === "string" ? body.token.trim() : "";
  const platform = body?.platform === "android" ? "android" : "ios";
  if (!token || token.length > 512)
    return NextResponse.json({ ok: false }, { status: 400 });

  await prisma.pushDevice.upsert({
    where: { token },
    update: {
      userId: session.user.id,
      platform,
      lastSeenAt: new Date(),
      failedAt: null,
    },
    create: { userId: session.user.id, token, platform },
  });

  return NextResponse.json({ ok: true });
}

/** DELETE /api/push/register?token=... — çıkışta cihazı kaydından düşürür. */
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ ok: false }, { status: 401 });

  const token = new URL(req.url).searchParams.get("token");
  if (!token) return NextResponse.json({ ok: false }, { status: 400 });

  await prisma.pushDevice.deleteMany({
    where: { token, userId: session.user.id },
  });
  return NextResponse.json({ ok: true });
}
