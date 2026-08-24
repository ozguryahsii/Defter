import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEffectivePremium } from "@/lib/premium";
import { isCurrencyCode } from "@/lib/currencies";

export const dynamic = "force-dynamic";

/** Aylık tarama hakkı (premium kullanıcı başına). */
const OCR_MONTHLY_LIMIT = 100;

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MODEL = process.env.ANTHROPIC_OCR_MODEL || "claude-haiku-4-5-20251001";

const PROMPT = `You are reading a photo of a retail/restaurant receipt. The photo may be rotated sideways or completely upside down — if so, mentally rotate it and read it correctly anyway.

Step 1: Briefly transcribe the key lines you can read (merchant name at the top, the line items, and the total line). Keep it short.
Step 2: On the LAST line of your reply, output ONLY minified JSON, exactly this shape:
{"amount":<number|null>,"currency":<string|null>,"merchant":<string|null>}
- amount: the grand total actually paid (TOPLAM/TOTAL/SUMME/Zwischensumme/CELKEM etc.). Sanity-check it against the line items — it should roughly equal their sum. Dot as decimal separator, no thousands separators. null if unreadable.
- currency: ISO 4217 code inferred from symbols, language or country on the receipt (₺ or TL → TRY, € → EUR, Kč → CZK, zł → PLN, £ → GBP, $ → USD, Ft → HUF, kr → SEK/NOK/DKK by country; Austria/Germany → EUR). null only if you truly cannot tell.
- merchant: the store/restaurant name printed at the top, cleaned up (e.g. "Migros", "Meissl & Schadn"). null if unreadable.`;

function extractJson(text: string): {
  amount?: unknown;
  currency?: unknown;
  merchant?: unknown;
} | null {
  // Model önce serbest metinle okur; JSON son satırdadır → SON eşleşmeyi al.
  const matches = text.match(/\{[^{}]*\}/g);
  if (!matches?.length) return null;
  try {
    return JSON.parse(matches[matches.length - 1]);
  } catch {
    return null;
  }
}

/** POST /api/receipt-scan (multipart: file) → { amount, currency, merchant, remaining } */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Oturum bulunamadı." }, { status: 401 });
  const userId = session.user.id;

  if (!(await getEffectivePremium(userId)))
    return NextResponse.json(
      { error: "Fiş tarama Premium özelliğidir." },
      { status: 403 },
    );

  // Aylık kota: ay değiştiyse sayaç sıfırdan başlar.
  const month = new Date().toISOString().slice(0, 7); // "2026-07"
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { ocrUsed: true, ocrMonth: true },
  });
  const used = u?.ocrMonth === month ? (u?.ocrUsed ?? 0) : 0;
  if (used >= OCR_MONTHLY_LIMIT)
    return NextResponse.json(
      { error: "Bu ayki fiş tarama hakkın doldu (100 fiş/ay). Yeni ay başında yenilenir." },
      { status: 429 },
    );

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey)
    return NextResponse.json(
      { error: "Fiş tarama şu anda kullanılamıyor." },
      { status: 503 },
    );

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_FILE_BYTES)
    return NextResponse.json({ error: "Geçersiz dosya." }, { status: 400 });

  const mediaType = ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
    file.type,
  )
    ? file.type
    : "image/jpeg";
  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 800,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    }),
  }).catch(() => null);

  if (!res || !res.ok) {
    console.error("receipt-scan: anthropic error", res?.status, await res?.text().catch(() => ""));
    return NextResponse.json(
      { error: "Fiş okunamadı; daha net bir fotoğraf dene." },
      { status: 502 },
    );
  }

  const data = (await res.json()) as {
    content?: { type: string; text?: string }[];
  };
  const text = data.content?.find((c) => c.type === "text")?.text ?? "";
  const parsed = extractJson(text);

  const rawAmount = Number(parsed?.amount);
  const amount =
    Number.isFinite(rawAmount) && rawAmount > 0 && rawAmount < 10_000_000
      ? Math.round(rawAmount * 100) / 100
      : null;
  const currency = isCurrencyCode(parsed?.currency) ? parsed!.currency : null;
  const merchant =
    typeof parsed?.merchant === "string" && parsed.merchant.trim()
      ? parsed.merchant.trim().slice(0, 60)
      : null;

  if (amount === null && merchant === null)
    return NextResponse.json(
      { error: "Fiş okunamadı; daha net bir fotoğraf dene." },
      { status: 422 },
    );

  // Başarılı okuma → kotadan düş.
  await prisma.user.update({
    where: { id: userId },
    data: { ocrUsed: used + 1, ocrMonth: month },
  });

  return NextResponse.json({
    amount,
    currency,
    merchant,
    remaining: OCR_MONTHLY_LIMIT - used - 1,
  });
}
