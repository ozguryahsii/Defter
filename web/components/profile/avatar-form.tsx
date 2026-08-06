"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { updateAvatar, removeAvatar } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { useT } from "@/components/i18n-provider";

export function AvatarForm({
  userId,
  name,
  hasAvatar,
}: {
  userId: string;
  name: string;
  hasAvatar: boolean;
}) {
  const router = useRouter();
  const t = useT();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  // Yükleme sonrası tarayıcı önbelleğini kırmak için avatar'ı yeniden çiz.
  const [bump, setBump] = useState(0);

  /**
   * Fotoğrafı ortadan kare olarak kırpar ve 512x512'ye küçültür. Böylece
   * avatar hiçbir yerde ezilip bükülmez ve dosya boyutu küçük kalır.
   * Kırpma başarısız olursa (eski tarayıcı vb.) orijinal dosya gönderilir.
   */
  async function toSquare(file: File): Promise<File | Blob> {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
      }).catch(() => createImageBitmap(file));

      // Kısa kenara göre ortadan kare al (merkezden çerçeveleme).
      const side = Math.min(bitmap.width, bitmap.height);
      const sx = (bitmap.width - side) / 2;
      const sy = (bitmap.height - side) / 2;
      const out = Math.min(512, side);

      const canvas = document.createElement("canvas");
      canvas.width = out;
      canvas.height = out;
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, out, out);
      bitmap.close();

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.9),
      );
      return blob ?? file;
    } catch {
      return file;
    }
  }

  async function onFile(file: File) {
    setBusy(true);
    const square = await toSquare(file);
    const fd = new FormData();
    fd.append("avatar", square, "avatar.jpg");
    const res = await updateAvatar(fd);
    setBusy(false);
    if (!res.ok) {
      toast.error(t(res.error ?? "Fotoğraf yüklenemedi."));
      return;
    }
    toast.success(t("Profil fotoğrafın güncellendi."));
    setBump((b) => b + 1);
    router.refresh();
  }

  async function onRemove() {
    setBusy(true);
    const res = await removeAvatar();
    setBusy(false);
    if (!res.ok) {
      toast.error(t(res.error ?? "İşlem başarısız."));
      return;
    }
    toast.success(t("Fotoğraf kaldırıldı."));
    setBump((b) => b + 1);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-4">
      <UserAvatar
        key={bump}
        userId={userId}
        name={name}
        className="h-16 w-16"
        fallbackClassName="text-lg"
      />
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? <Loader2 className="animate-spin" /> : <Camera />}
          {t("Fotoğraf Yükle")}
        </Button>
        {hasAvatar && (
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={onRemove}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 /> {t("Kaldır")}
          </Button>
        )}
      </div>
    </div>
  );
}
