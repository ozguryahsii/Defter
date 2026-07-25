"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { updateAvatar, removeAvatar } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";

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
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  // Yükleme sonrası tarayıcı önbelleğini kırmak için avatar'ı yeniden çiz.
  const [bump, setBump] = useState(0);

  async function onFile(file: File) {
    setBusy(true);
    const fd = new FormData();
    fd.append("avatar", file);
    const res = await updateAvatar(fd);
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error ?? "Fotoğraf yüklenemedi.");
      return;
    }
    toast.success("Profil fotoğrafın güncellendi.");
    setBump((b) => b + 1);
    router.refresh();
  }

  async function onRemove() {
    setBusy(true);
    const res = await removeAvatar();
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error ?? "İşlem başarısız.");
      return;
    }
    toast.success("Fotoğraf kaldırıldı.");
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
          Fotoğraf Yükle
        </Button>
        {hasAvatar && (
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={onRemove}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 /> Kaldır
          </Button>
        )}
      </div>
    </div>
  );
}
