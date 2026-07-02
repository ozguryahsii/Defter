"use client";

import { useState } from "react";
import jsQR from "jsqr";
import { toast } from "sonner";
import { Copy, ImageUp, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Client-side QR decoder. Tries the image at several scales and inversion
 * modes so screenshots and photos of screens decode reliably.
 */
async function decodeImage(file: File): Promise<string | null> {
  const bitmap = await createImageBitmap(file);
  const scales = [1, 1.5, 2, 0.75, 0.5];

  for (const scale of scales) {
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) continue;
    ctx.imageSmoothingEnabled = scale > 1;
    ctx.drawImage(bitmap, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h);
    const result = jsQR(data.data, w, h, { inversionAttempts: "attemptBoth" });
    if (result?.data) return result.data;
  }
  return null;
}

export function QrDecoder() {
  const [results, setResults] = useState<{ name: string; text: string }[]>([]);
  const [busy, setBusy] = useState(false);

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    const next: { name: string; text: string }[] = [];
    for (const file of Array.from(files)) {
      try {
        const text = await decodeImage(file);
        next.push({
          name: file.name,
          text: text ?? "(çözülemedi — daha net/yakın bir görüntü dene)",
        });
      } catch {
        next.push({ name: file.name, text: "(görsel okunamadı)" });
      }
    }
    setResults((prev) => [...next, ...prev]);
    setBusy(false);
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    toast.success("Kopyalandı.");
  }

  return (
    <div className="space-y-4">
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border/70 bg-card p-10 text-center transition-colors hover:border-brand/50">
        <ImageUp className="h-8 w-8 text-muted-foreground" />
        <span className="text-sm font-medium">
          Karekod görseli seç (birden fazla seçebilirsin)
        </span>
        <span className="text-xs text-muted-foreground">
          PNG, JPG veya ekran görüntüsü
        </span>
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
      </label>

      {busy && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <ScanLine className="h-4 w-4 animate-pulse" /> Çözülüyor...
        </p>
      )}

      {results.map((r, i) => (
        <div
          key={i}
          className="space-y-2 rounded-xl border border-border/60 bg-card p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs text-muted-foreground">
              {r.name}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 shrink-0"
              onClick={() => copy(r.text)}
            >
              <Copy className="h-3.5 w-3.5" /> Kopyala
            </Button>
          </div>
          <code className="block whitespace-pre-wrap break-all rounded-lg bg-secondary/40 p-3 text-xs">
            {r.text}
          </code>
        </div>
      ))}
    </div>
  );
}
