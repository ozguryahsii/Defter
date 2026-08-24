import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getT } from "@/lib/i18n/server";
import { formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * GET /api/notifications/upcoming
 *
 * Kişisel bütçedeki ileri tarihli ödemeler için hatırlatma listesi döner.
 * Native kabuk bunları telefona YEREL bildirim olarak planlar; böylece
 * uygulama kapalıyken de hatırlatma düşer (sunucudan gönderim gerekmez).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ items: [] }, { status: 401 });

  const now = new Date();
  const horizon = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 gün

  const upcoming = await prisma.expense.findMany({
    where: {
      payerId: session.user.id,
      kind: "expense",
      date: { gt: now, lte: horizon },
      group: { type: "Kisisel", createdById: session.user.id },
    },
    select: {
      id: true,
      description: true,
      amount: true,
      date: true,
      group: { select: { currency: true } },
    },
    take: 100,
  });

  const t = getT();
  const items: { seed: string; title: string; body: string; at: string }[] = [];

  for (const e of upcoming) {
    // Ödemeden 2 ve 1 gün önce, yerel saatle 10:00'da hatırlat.
    for (const daysBefore of [2, 1]) {
      const at = new Date(e.date);
      at.setDate(at.getDate() - daysBefore);
      at.setHours(10, 0, 0, 0);
      if (at.getTime() <= now.getTime()) continue;

      items.push({
        seed: `due:${e.id}:${daysBefore}`,
        title: t("Yaklaşan ödeme: {desc}", { desc: e.description }),
        body: t("{amount} tutarındaki ödemene {n} gün kaldı.", {
          amount: formatCurrency(e.amount, e.group.currency),
          n: daysBefore,
        }),
        at: at.toISOString(),
      });
    }
  }

  return NextResponse.json({ items });
}
