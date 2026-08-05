import { sign as cryptoSign } from "crypto";
import http2 from "http2";

/**
 * Apple Push Notification service (APNs) — token tabanlı kimlik doğrulama.
 *
 * Gerekli ortam değişkenleri:
 *   APNS_KEY_ID       Apple Developer'da oluşturulan .p8 anahtarının Key ID'si
 *   APNS_TEAM_ID      Apple Developer Team ID
 *   APNS_BUNDLE_ID    Uygulamanın bundle kimliği (net.sobso.app)
 *   APNS_PRIVATE_KEY  .p8 dosyasının içeriği (BEGIN PRIVATE KEY bloğu dahil)
 *   APNS_PRODUCTION   "1" ise canlı APNs, aksi halde sandbox (geliştirme)
 *
 * APNs yalnızca HTTP/2 kabul eder; Node'un yerleşik http2 modülü kullanılır.
 */

export type ApnsResult =
  | { ok: true }
  | { ok: false; dead: boolean; reason: string };

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function apnsConfigured(): boolean {
  return Boolean(
    process.env.APNS_KEY_ID &&
      process.env.APNS_TEAM_ID &&
      process.env.APNS_BUNDLE_ID &&
      process.env.APNS_PRIVATE_KEY,
  );
}

let cachedToken: { jwt: string; issuedAt: number } | null = null;

/**
 * APNs yetkilendirme jetonu (ES256). Apple en fazla 1 saat geçerli sayar ve
 * çok sık üretilmesini reddeder; 50 dakika önbelleklenir.
 */
function authToken(): string {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && now - cachedToken.issuedAt < 50 * 60) return cachedToken.jwt;

  const keyId = process.env.APNS_KEY_ID!;
  const teamId = process.env.APNS_TEAM_ID!;
  // .env tek satırda tutulduğunda satır sonları \n olarak yazılır; geri çevir.
  const privateKey = process.env.APNS_PRIVATE_KEY!.replace(/\\n/g, "\n");

  const header = base64url(JSON.stringify({ alg: "ES256", kid: keyId }));
  const payload = base64url(JSON.stringify({ iss: teamId, iat: now }));
  const signingInput = `${header}.${payload}`;

  // ES256 imzası JOSE biçiminde ham R||S olmalı (DER değil).
  const signature = cryptoSign("sha256", Buffer.from(signingInput), {
    key: privateKey,
    dsaEncoding: "ieee-p1363",
  });

  const jwt = `${signingInput}.${base64url(signature)}`;
  cachedToken = { jwt, issuedAt: now };
  return jwt;
}

const APNS_HOST = () =>
  // APNS_HOST yalnızca test/geliştirme içindir; üretimde tanımlanmaz.
  process.env.APNS_HOST ||
  (process.env.APNS_PRODUCTION === "1"
    ? "https://api.push.apple.com"
    : "https://api.sandbox.push.apple.com");

/** Tek bir cihaza bildirim gönderir. */
export function sendApns(input: {
  deviceToken: string;
  title: string;
  body?: string | null;
  badge?: number;
  /** Uygulama açılınca gidilecek yol, ör. /groups/abc */
  path?: string | null;
}): Promise<ApnsResult> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (r: ApnsResult) => {
      if (!settled) {
        settled = true;
        resolve(r);
      }
    };

    let client: http2.ClientHttp2Session;
    try {
      client = http2.connect(APNS_HOST());
    } catch (e) {
      done({ ok: false, dead: false, reason: `connect: ${String(e)}` });
      return;
    }

    client.on("error", (e) => {
      done({ ok: false, dead: false, reason: `session: ${e.message}` });
      client.close();
    });

    const payload = JSON.stringify({
      aps: {
        alert: { title: input.title, body: input.body ?? "" },
        sound: "default",
        ...(input.badge !== undefined ? { badge: input.badge } : {}),
      },
      ...(input.path ? { path: input.path } : {}),
    });

    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${input.deviceToken}`,
      authorization: `bearer ${authToken()}`,
      "apns-topic": process.env.APNS_BUNDLE_ID!,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "content-type": "application/json",
      "content-length": Buffer.byteLength(payload),
    });

    let status = 0;
    let raw = "";
    req.setEncoding("utf8");
    req.on("response", (headers) => {
      status = Number(headers[":status"] ?? 0);
    });
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("error", (e) => {
      done({ ok: false, dead: false, reason: `request: ${e.message}` });
      client.close();
    });
    req.on("end", () => {
      client.close();
      if (status === 200) {
        done({ ok: true });
        return;
      }
      let reason = raw || `http ${status}`;
      try {
        reason = (JSON.parse(raw) as { reason?: string }).reason ?? reason;
      } catch {
        // gövde JSON değilse ham metni kullan
      }
      // Bu cevaplar cihazın artık geçersiz olduğunu söyler → kaydı sil.
      const dead =
        status === 410 ||
        reason === "BadDeviceToken" ||
        reason === "Unregistered" ||
        reason === "DeviceTokenNotForTopic";
      done({ ok: false, dead, reason });
    });

    req.setTimeout(10_000, () => {
      req.close();
      client.close();
      done({ ok: false, dead: false, reason: "timeout" });
    });

    req.end(payload);
  });
}
