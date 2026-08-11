import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import { getT } from "@/lib/i18n/server";
import { syncBadgeForUser } from "@/lib/push";

/**
 * Lazy due-date reminders for the personal budget: any future-dated expense
 * gets an in-app notification 2 days and 1 day before its date. Runs on the
 * bell's periodic fetch, deduped via the meta key — no cron needed.
 */
async function generateDueReminders(userId: string): Promise<void> {
  try {
    const now = new Date();
    const horizon = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const upcoming = await prisma.expense.findMany({
      where: {
        payerId: userId,
        kind: "expense",
        date: { gt: now, lte: horizon },
        group: { type: "Kisisel", createdById: userId },
      },
      select: { id: true, description: true, amount: true, date: true, groupId: true },
    });
    if (upcoming.length === 0) return;

    for (const e of upcoming) {
      const daysLeft = Math.ceil(
        (new Date(e.date).getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
      );
      if (daysLeft !== 2 && daysLeft !== 1) continue;

      const metaKey = JSON.stringify({ due: e.id, d: daysLeft });
      const exists = await prisma.notification.findFirst({
        where: { userId, type: "payment.due", meta: metaKey },
        select: { id: true },
      });
      if (exists) continue;

      await notify({
        userId,
        type: "payment.due",
        title: getT()("Yaklaşan ödeme: {desc}", { desc: e.description }),
        body: getT()("{amount} tutarındaki ödemene {n} gün kaldı.", { amount: e.amount.toFixed(2), n: daysLeft }),
        groupId: e.groupId,
        meta: { due: e.id, d: daysLeft },
      });
    }
  } catch {
    // best-effort — asıl listelemeyi engellemesin
  }
}

// GET: latest notifications + unread count for the signed-in user.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ items: [], unread: 0 }, { status: 401 });

  await generateDueReminders(session.user.id);

  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        groupId: true,
        meta: true,
        readAt: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({
      where: { userId: session.user.id, readAt: null },
    }),
  ]);

  // Rozeti her yoklamada gerçek sayıyla senkronize et — bu düzeltmeden önce
  // sıkışmış kalan eski rozet değerlerini de kendiliğinden onarır.
  void syncBadgeForUser(session.user.id);

  return NextResponse.json({ items, unread });
}

// POST: mark all as read.
export async function POST() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ ok: false }, { status: 401 });

  await prisma.notification.updateMany({
    where: { userId: session.user.id, readAt: null },
    data: { readAt: new Date() },
  });

  // Rozeti sessizce sıfırla; aksi halde bir sonraki push'a kadar sıkışır.
  void syncBadgeForUser(session.user.id);

  return NextResponse.json({ ok: true });
}
