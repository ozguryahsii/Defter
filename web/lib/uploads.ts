import path from "path";
import fs from "fs/promises";

/**
 * Where uploaded receipt images live. Kept outside the build output so files
 * survive redeploys; override with DEFTER_UPLOAD_DIR.
 */
export function uploadDir(): string {
  return (
    process.env.DEFTER_UPLOAD_DIR ||
    path.join(process.cwd(), "data", "receipts")
  );
}

const ALLOWED = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export const MAX_RECEIPT_BYTES = 8 * 1024 * 1024; // 8 MB

export function extensionFor(mime: string): string | null {
  return ALLOWED.get(mime) ?? null;
}

/** Persists a receipt image and returns the stored filename. */
export async function saveReceipt(
  expenseId: string,
  file: File,
): Promise<{ ok: true; filename: string } | { ok: false; error: string }> {
  const ext = extensionFor(file.type);
  if (!ext) return { ok: false, error: "Sadece JPG, PNG veya WEBP yükleyebilirsiniz." };
  if (file.size > MAX_RECEIPT_BYTES)
    return { ok: false, error: "Dosya 8 MB'tan büyük olamaz." };

  const dir = uploadDir();
  await fs.mkdir(dir, { recursive: true });
  const filename = `${expenseId}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(dir, filename), buffer);
  return { ok: true, filename };
}

export const MAX_AVATAR_BYTES = 4 * 1024 * 1024; // 4 MB

/** Persists a profile photo and returns the stored filename. */
export async function saveAvatar(
  userId: string,
  file: File,
): Promise<{ ok: true; filename: string } | { ok: false; error: string }> {
  const ext = extensionFor(file.type);
  if (!ext) return { ok: false, error: "Sadece JPG, PNG veya WEBP yükleyebilirsiniz." };
  if (file.size > MAX_AVATAR_BYTES)
    return { ok: false, error: "Fotoğraf 4 MB'tan büyük olamaz." };

  const dir = uploadDir();
  await fs.mkdir(dir, { recursive: true });
  // Her yüklemede benzersiz ad: URL değişir, tarayıcı önbelleği eski
  // fotoğrafı gösteremez.
  const filename = `avatar_${userId}_${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(dir, filename), buffer);

  // Bu kullanıcıya ait eski fotoğrafları temizle.
  const prefix = `avatar_${userId}`;
  for (const f of await fs.readdir(dir)) {
    if (f === filename) continue;
    if (
      f.startsWith(prefix) &&
      (f[prefix.length] === "." || f[prefix.length] === "_")
    )
      await fs.unlink(path.join(dir, f)).catch(() => {});
  }
  return { ok: true, filename };
}

export async function readReceipt(
  filename: string,
): Promise<{ data: Buffer; contentType: string } | null> {
  // Guard against path traversal — only a bare filename is allowed.
  if (filename.includes("/") || filename.includes("\\") || filename.includes(".."))
    return null;
  const ext = filename.split(".").pop()?.toLowerCase();
  const contentType =
    ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  try {
    const data = await fs.readFile(path.join(uploadDir(), filename));
    return { data, contentType };
  } catch {
    return null;
  }
}
