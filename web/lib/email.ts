/**
 * E-posta gönderimi (Resend). RESEND_API_KEY yoksa (lokal geliştirme)
 * gönderilecek içerik sunucu konsoluna yazılır — akış test edilebilir.
 */
export async function sendEmail({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "SOBSO <noreply@sobso.net>";

  if (!key) {
    console.log(`[email-dev] to=${to} subject="${subject}"\n${text}`);
    return true;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ from, to, subject, text, html }),
  }).catch(() => null);

  if (!res?.ok)
    console.error("sendEmail failed", res?.status, await res?.text().catch(() => ""));
  return !!res?.ok;
}
