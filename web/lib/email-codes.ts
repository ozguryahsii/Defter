import { createHash, randomInt } from "crypto";
import { prisma } from "./prisma";
import { sendEmail } from "./email";
import { getT } from "./i18n/server";

/**
 * 6 haneli e-posta kodları: kayıt doğrulama ("verify") ve şifre sıfırlama
 * ("reset"). Kod düz metin olarak saklanmaz (sha256); 10 dk geçerlidir,
 * 5 yanlış denemede iptal olur, saatte en fazla 3 kod istenebilir.
 */
const EXPIRY_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_SENDS_PER_HOUR = 3;

export type Purpose = "verify" | "reset";

function hash(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export async function issueEmailCode(
  email: string,
  purpose: Purpose,
): Promise<"ok" | "rate_limited" | "send_failed"> {
  const t = getT();
  const recent = await prisma.emailCode.count({
    where: {
      email,
      purpose,
      createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) },
    },
  });
  if (recent >= MAX_SENDS_PER_HOUR) return "rate_limited";

  const code = String(randomInt(100000, 1000000));

  // Aynı amaç için önceki kodlar geçersizleşir — yalnızca sonuncusu çalışır.
  await prisma.emailCode.updateMany({
    where: { email, purpose, usedAt: null },
    data: { usedAt: new Date() },
  });
  await prisma.emailCode.create({
    data: {
      email,
      purpose,
      codeHash: hash(code),
      expiresAt: new Date(Date.now() + EXPIRY_MS),
    },
  });

  const subject =
    purpose === "verify"
      ? t("SOBSO e-posta doğrulama kodun")
      : t("SOBSO şifre sıfırlama kodun");
  const line =
    purpose === "verify"
      ? t("SOBSO hesabını doğrulamak için kodun:")
      : t("SOBSO şifreni sıfırlamak için kodun:");
  const footer = t("Kod 10 dakika geçerlidir. Bu isteği sen yapmadıysan bu e-postayı yok say.");

  const ok = await sendEmail({
    to: email,
    subject,
    text: `${line}\n\n${code}\n\n${footer}`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:420px;margin:0 auto;padding:24px">
      <h2 style="color:#7c3aed;margin:0 0 16px">SOBSO</h2>
      <p style="margin:0 0 12px">${line}</p>
      <p style="font-size:32px;font-weight:700;letter-spacing:6px;margin:0 0 16px">${code}</p>
      <p style="color:#6b7280;font-size:13px;margin:0">${footer}</p>
    </div>`,
  });
  return ok ? "ok" : "send_failed";
}

export async function checkEmailCode(
  email: string,
  purpose: Purpose,
  code: string,
): Promise<"ok" | "invalid" | "expired" | "too_many"> {
  const row = await prisma.emailCode.findFirst({
    where: { email, purpose, usedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!row) return "invalid";
  if (row.expiresAt <= new Date()) return "expired";
  if (row.attempts >= MAX_ATTEMPTS) return "too_many";

  if (hash(code.trim()) !== row.codeHash) {
    await prisma.emailCode.update({
      where: { id: row.id },
      data: { attempts: { increment: 1 } },
    });
    return "invalid";
  }

  await prisma.emailCode.update({
    where: { id: row.id },
    data: { usedAt: new Date() },
  });
  return "ok";
}
