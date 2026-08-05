import { prisma } from "../prisma";
import { apnsConfigured, sendApns } from "./apns";
import { fcmConfigured, sendFcm } from "./fcm";

/**
 * Bir kullanıcının tüm cihazlarına anlık bildirim gönderir.
 *
 * "En iyi çaba" ilkesiyle çalışır: gönderim başarısız olsa bile çağıran işlem
 * (harcama ekleme, ödeşme vb.) asla etkilenmez. Sağlayıcı bir cihazın artık
 * geçerli olmadığını bildirirse kayıt otomatik silinir.
 */
export async function sendPushToUser(input: {
  userId: string;
  title: string;
  body?: string | null;
  /** Bildirime dokununca açılacak yol, ör. /groups/abc */
  path?: string | null;
}): Promise<void> {
  if (!apnsConfigured() && !fcmConfigured()) return;

  try {
    const devices = await prisma.pushDevice.findMany({
      where: { userId: input.userId },
      select: { id: true, token: true, platform: true },
    });
    if (devices.length === 0) return;

    // Okunmamış sayısı rozet (badge) olarak gönderilir.
    const badge = await prisma.notification.count({
      where: { userId: input.userId, readAt: null },
    });

    const dead: string[] = [];

    await Promise.all(
      devices.map(async (d) => {
        try {
          const res =
            d.platform === "ios"
              ? await sendApns({
                  deviceToken: d.token,
                  title: input.title,
                  body: input.body,
                  badge,
                  path: input.path,
                })
              : await sendFcm({
                  deviceToken: d.token,
                  title: input.title,
                  body: input.body,
                  path: input.path,
                });

          if (!res.ok) {
            if (res.dead) dead.push(d.id);
            else
              console.error(
                `push: ${d.platform} gönderilemedi (${res.reason})`,
              );
          }
        } catch (e) {
          console.error("push: beklenmeyen hata", e);
        }
      }),
    );

    if (dead.length > 0) {
      await prisma.pushDevice.deleteMany({ where: { id: { in: dead } } });
    }
  } catch (e) {
    console.error("push: gönderim atlandı", e);
  }
}

/** Birden çok kullanıcıya aynı bildirimi gönderir. */
export async function sendPushToUsers(input: {
  userIds: string[];
  title: string;
  body?: string | null;
  path?: string | null;
}): Promise<void> {
  await Promise.all(
    input.userIds.map((userId) =>
      sendPushToUser({ ...input, userId }),
    ),
  );
}
