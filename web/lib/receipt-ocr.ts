"use client";

/**
 * Fiş fotoğrafından tutar + para birimi + mağaza adı çıkarımı.
 * Görüntü cihazda küçültülür (maks. 1568px — token maliyetini düşürür),
 * sonra sunucudaki AI tabanlı OCR'a gönderilir (/api/receipt-scan).
 * Sunucu premium + aylık kota kontrolünü yapar.
 */
export type ReceiptScan = {
  amount: number | null;
  /** Fişteki para birimi (ISO kodu); okunamadıysa null. */
  currency: string | null;
  merchant: string | null;
  /** Bu ay kalan tarama hakkı. */
  remaining: number;
};

const MAX_DIM = 1568;

/** Büyük fotoğrafları JPEG'e küçültür; küçükse olduğu gibi döner. */
async function downscale(file: File): Promise<Blob> {
  try {
    // EXIF yönünü uygula — iPhone fotoğrafları aksi halde yan/ters gidebilir.
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    }).catch(() => createImageBitmap(file));
    const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1.5 * 1024 * 1024) {
      bitmap.close();
      return file;
    }
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    );
    return blob ?? file;
  } catch {
    return file; // küçültme başarısızsa orijinali gönder
  }
}

export async function scanReceipt(file: File): Promise<ReceiptScan> {
  const blob = await downscale(file);
  const form = new FormData();
  form.append("file", blob, "receipt.jpg");

  const res = await fetch("/api/receipt-scan", { method: "POST", body: form });
  const data = (await res.json().catch(() => null)) as
    | (ReceiptScan & { error?: string })
    | null;

  if (!res.ok || !data)
    throw new Error(data?.error ?? "Fiş okunamadı; daha net bir fotoğraf dene.");

  return {
    amount: data.amount ?? null,
    currency: data.currency ?? null,
    merchant: data.merchant ?? null,
    remaining: data.remaining ?? 0,
  };
}
