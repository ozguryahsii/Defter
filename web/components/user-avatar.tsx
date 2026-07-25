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
  className,
  fallbackClassName,
}: {
  userId: string;
  name: string;
  className?: string;
  fallbackClassName?: string;
}) {
  return (
    <Avatar className={className}>
      <AvatarImage src={`/api/avatars/${userId}`} alt={name} />
      <AvatarFallback className={cn(fallbackClassName)}>
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
