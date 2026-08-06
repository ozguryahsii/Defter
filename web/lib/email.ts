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

  // Geçici hatalarda (ağ kopması, 429/5xx) tek denemede pes etmeyip kısa
  // aralıkla tekrar dener; ilk kodun hiç ulaşmaması sorununu önler.
  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let res: Response | null = null;
    let networkError: unknown = null;
    try {
      res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({ from, to, subject, text, html }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (e) {
      networkError = e;
    }

    if (res?.ok) return true;

    const status = res?.status;
    const body = res ? await res.text().catch(() => "") : String(networkError);
    // 4xx (401 geçersiz anahtar, 422 hatalı adres…) tekrar denemekle düzelmez.
    const retriable = !res || status === 429 || (status !== undefined && status >= 500);
    console.error(
      `sendEmail failed (deneme ${attempt}/${MAX_ATTEMPTS}) to=${to} status=${status ?? "network"} ${body}`,
    );
    if (!retriable || attempt === MAX_ATTEMPTS) return false;
    await new Promise((r) => setTimeout(r, 400 * attempt));
  }
  return false;
}
