"use client";

/**
 * Native (Capacitor) sistem bildirimleri.
 *
 * Uygulama iOS/Android kabuğu içinde çalışırken telefonun kendi bildirim
 * merkezini kullanır. Web tarayıcısında hiçbir şey yapmaz — tüm çağrılar
 * sessizce false döner, böylece çağıran taraf platform kontrolü yapmak
 * zorunda kalmaz.
 *
 * Kapsam: yerel (local) bildirimler. Uygulama tamamen kapalıyken başkasının
 * yaptığı işlemler için bildirim göndermek uzaktan gönderim (APNs/FCM)
 * gerektirir; o ayrı bir altyapıdır ve Apple Developer üyeliği ister.
 */

type CapacitorGlobal = { isNativePlatform?: () => boolean };

/** Capacitor kabuğu içinde miyiz? */
export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
  return cap?.isNativePlatform?.() === true;
}

async function plugin() {
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  return LocalNotifications;
}

/**
 * Bildirim iznini ister (iOS'ta sistem penceresi çıkar). İzin verilmişse
 * true döner. Bu çağrı yapılmadan iOS Ayarlar'da uygulamanın "Bildirimler"
 * satırı hiç görünmez.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!isNativeApp()) return false;
  try {
    const LocalNotifications = await plugin();
    const current = await LocalNotifications.checkPermissions();
    if (current.display === "granted") return true;
    if (current.display === "denied") return false;
    const asked = await LocalNotifications.requestPermissions();
    return asked.display === "granted";
  } catch {
    return false; // eklenti yoksa (eski kabuk sürümü) sessizce geç
  }
}

/** Bildirim kimliği: Capacitor 32-bit tamsayı ister; metinden türetiriz. */
function idFrom(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h) % 2_000_000_000;
}

/** Anında sistem bildirimi gösterir. */
export async function showNow(input: {
  seed: string;
  title: string;
  body?: string | null;
}): Promise<boolean> {
  if (!isNativeApp()) return false;
  try {
    const LocalNotifications = await plugin();
    await LocalNotifications.schedule({
      notifications: [
        {
          id: idFrom(input.seed),
          title: input.title,
          body: input.body ?? "",
          // 300 ms sonra: iOS aynı anda planlanıp gösterilen bildirimleri
          // bazen yutuyor; küçük gecikme güvenli.
          schedule: { at: new Date(Date.now() + 300) },
        },
      ],
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * İleri tarihli bir ödeme için hatırlatma planlar (uygulama KAPALIYKEN de
 * çalışır). Aynı kimlikle tekrar planlamak mevcut kaydı günceller, bu yüzden
 * her açılışta yeniden planlamak güvenlidir.
 */
export async function scheduleReminders(
  items: { seed: string; title: string; body?: string | null; at: string }[],
): Promise<number> {
  if (!isNativeApp() || items.length === 0) return 0;
  try {
    const LocalNotifications = await plugin();
    const now = Date.now();
    const notifications = items
      .map((i) => ({
        id: idFrom(i.seed),
        title: i.title,
        body: i.body ?? "",
        schedule: { at: new Date(i.at) },
      }))
      .filter((n) => n.schedule.at.getTime() > now + 5000);
    if (notifications.length === 0) return 0;
    await LocalNotifications.schedule({ notifications });
    return notifications.length;
  } catch {
    return 0;
  }
}
