import { sign as cryptoSign } from "crypto";

/**
 * Firebase Cloud Messaging (HTTP v1) — Android bildirimleri.
 *
 * Gerekli ortam değişkeni:
 *   FCM_SERVICE_ACCOUNT  Firebase servis hesabı JSON'unun TAMAMI (tek satır)
 *
 * Firebase konsolunda: Proje ayarları → Hizmet hesapları → Yeni özel anahtar
 * oluştur. İnen JSON dosyasının içeriği bu değişkene yazılır.
 */

export type FcmResult =
  | { ok: true }
  | { ok: false; dead: boolean; reason: string };

type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function serviceAccount(): ServiceAccount | null {
  const raw = process.env.FCM_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    const sa = JSON.parse(raw) as ServiceAccount;
    if (!sa.project_id || !sa.client_email || !sa.private_key) return null;
    return sa;
  } catch {
    return null;
  }
}

export function fcmConfigured(): boolean {
  return serviceAccount() !== null;
}

let cachedAccess: { token: string; expiresAt: number } | null = null;

/** Servis hesabı JWT'sini OAuth2 erişim jetonuna çevirir (1 saat geçerli). */
async function accessToken(sa: ServiceAccount): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedAccess && cachedAccess.expiresAt - 60 > now) return cachedAccess.token;

  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const signingInput = `${header}.${claim}`;
  const signature = cryptoSign("sha256", Buffer.from(signingInput), {
    key: sa.private_key.replace(/\\n/g, "\n"),
  });
  const assertion = `${signingInput}.${base64url(signature)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);

  if (!res?.ok) return null;
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) return null;

  cachedAccess = {
    token: data.access_token,
    expiresAt: now + (data.expires_in ?? 3600),
  };
  return cachedAccess.token;
}

/** Tek bir Android cihazına bildirim gönderir. */
export async function sendFcm(input: {
  deviceToken: string;
  title: string;
  body?: string | null;
  path?: string | null;
}): Promise<FcmResult> {
  const sa = serviceAccount();
  if (!sa) return { ok: false, dead: false, reason: "not_configured" };

  const token = await accessToken(sa);
  if (!token) return { ok: false, dead: false, reason: "auth_failed" };

  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token: input.deviceToken,
          notification: { title: input.title, body: input.body ?? "" },
          ...(input.path ? { data: { path: input.path } } : {}),
          android: { priority: "HIGH" },
        },
      }),
      signal: AbortSignal.timeout(10_000),
    },
  ).catch(() => null);

  if (!res) return { ok: false, dead: false, reason: "network" };
  if (res.ok) return { ok: true };

  const raw = await res.text().catch(() => "");
  // 404 UNREGISTERED / 400 INVALID_ARGUMENT → kayıt geçersiz, sil.
  const dead =
    res.status === 404 ||
    raw.includes("UNREGISTERED") ||
    raw.includes("INVALID_ARGUMENT");
  return { ok: false, dead, reason: raw || `http ${res.status}` };
}
