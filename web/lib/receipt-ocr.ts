"use client";

/**
 * Fiş fotoğrafından tutar + mağaza adı çıkarımı (cihazda, ücretsiz).
 * Tesseract.js tarayıcıda çalışır; görüntü cihazdan çıkmaz, API maliyeti yok.
 * İleride yapay zekâ tabanlı sunucu OCR'ına geçilecek (daha isabetli).
 */
export type ReceiptScan = { merchant: string | null; amount: number | null };

function parseAmount(text: string): number | null {
  const lines = text.split(/\n+/);
  const toNum = (s: string) =>
    s.includes(",")
      ? parseFloat(s.replace(/\./g, "").replace(",", ".")) // 1.234,56 → 1234.56
      : parseFloat(s); // 12.34 → 12.34
  // 1) TOPLAM/TUTAR/TOTAL geçen satırdaki sayı
  for (const line of lines) {
    if (/topla|tutar|total/i.test(line)) {
      const m = line.match(/(\d{1,3}(?:\.\d{3})*,\d{2}|\d+[.,]\d{2})/);
      if (m) return toNum(m[1]);
    }
  }
  // 2) Metindeki en büyük ondalıklı sayı (kuruşlu)
  const all = [...text.matchAll(/(\d{1,3}(?:\.\d{3})*,\d{2}|\d+[.,]\d{2})/g)]
    .map((m) => toNum(m[1]))
    .filter((n) => Number.isFinite(n) && n > 0 && n < 1_000_000);
  return all.length ? Math.max(...all) : null;
}

function parseMerchant(text: string): string | null {
  const skip = /fiş|fis|tarih|saat|kdv|no[:.]|tel|adres|http|topkdv|\d{2}[./]\d{2}[./]\d{2}/i;
  for (const raw of text.split(/\n+/).slice(0, 6)) {
    const line = raw.trim();
    if (line.length < 4 || line.length > 40) continue;
    if (skip.test(line)) continue;
    const letters = (line.match(/[A-Za-zÇĞİÖŞÜçğıöşü]/g) ?? []).length;
    if (letters < line.length * 0.5) continue;
    return line;
  }
  return null;
}

export async function scanReceipt(file: File): Promise<ReceiptScan> {
  const { default: Tesseract } = await import("tesseract.js");
  const { data } = await Tesseract.recognize(file, "tur+eng");
  const text = data.text ?? "";
  return { merchant: parseMerchant(text), amount: parseAmount(text) };
}
