"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Kullanıcı avatarı: profil fotoğrafı varsa onu, yoksa baş harfleri gösterir.
 * Fotoğraf /api/avatars/<id> üzerinden gelir; 404 dönerse Radix otomatik
 * olarak baş harflere düşer — çağıran tarafın avatarPath bilmesi gerekmez.
 */
export function UserAvatar({
  userId,
  name,
  version,
  className,
  fallbackClassName,
}: {
  userId: string;
  name: string;
  /** Foto değişince URL de değişsin diye sürüm damgası (örn. avatarPath). */
  version?: string | null;
  className?: string;
  fallbackClassName?: string;
}) {
  const src = version
    ? `/api/avatars/${userId}?v=${encodeURIComponent(version)}`
    : `/api/avatars/${userId}`;
  return (
    <Avatar className={className}>
      <AvatarImage src={src} alt={name} />
      <AvatarFallback className={cn(fallbackClassName)}>
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
