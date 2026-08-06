import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * RevenueCat webhook — abonelik olaylarını dinler ve kullanıcının premium
 * durumunu günceller. RevenueCat, App User ID olarak bizim user.id'yi
 * gönderir (uygulamada Purchases.logIn(user.id) ile ayarlanır).
 *
 * Güvenlik: RevenueCat panelinde tanımladığımız Authorization başlığı
 * REVENUECAT_WEBHOOK_SECRET ile doğrulanır.
 */
type RCEvent = {
  type?: string;
  app_user_id?: string;
  original_app_user_id?: string;
  product_id?: string;
  expiration_at_ms?: number | null;
  store?: string; // APP_STORE | PLAY_STORE
};

function planFromProductId(productId?: string): string | null {
  const p = (productId ?? "").toLowerCase();
  if (p.includes("month")) return "monthly";
  if (p.includes("year") || p.includes("annual")) return "yearly";
  return null;
}

function sourceFromStore(store?: string): string {
  return store === "PLAY_STORE" ? "playstore" : "appstore";
}

// Premium'u aktif eden olaylar
const ACTIVATING = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "UNCANCELLATION",
  "PRODUCT_CHANGE",
  "NON_RENEWING_PURCHASE",
  "SUBSCRIPTION_EXTENDED",
]);
// Premium'u bitiren olaylar (CANCELLATION = yalnızca otomatik yenileme kapandı,
// süre bitene kadar premium DEVAM eder; bu yüzden listede yok.)
const DEACTIVATING = new Set(["EXPIRATION"]);

export async function POST(req: NextRequest) {
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== secret) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  let body: { event?: RCEvent };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const event = body.event;
  const type = event?.type ?? "";

  // RevenueCat test olayı: sadece 200 dön.
  if (type === "TEST") return NextResponse.json({ ok: true });

  const userId = event?.app_user_id || event?.original_app_user_id;
  if (!userId) return NextResponse.json({ ok: true }); // eşleştirilecek kullanıcı yok

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) return NextResponse.json({ ok: true }); // bilinmeyen kullanıcı — sessizce geç

  if (ACTIVATING.has(type)) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        premium: true,
        premiumPlan: planFromProductId(event?.product_id),
        premiumSource: sourceFromStore(event?.store),
        premiumUntil: event?.expiration_at_ms ? new Date(event.expiration_at_ms) : null,
      },
    });
  } else if (DEACTIVATING.has(type)) {
    await prisma.user.update({
      where: { id: userId },
      data: { premium: false, premiumPlan: null, premiumSource: null, premiumUntil: null },
    });
  }
  // Diğer olaylar (CANCELLATION, BILLING_ISSUE vb.) durumu değiştirmez.

  return NextResponse.json({ ok: true });
}
