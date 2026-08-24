"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, UserMinus } from "lucide-react";
import { removeMember } from "@/lib/actions";
import { useT } from "@/components/i18n-provider";

/** Owner-only "kick member" control shown next to each non-owner member. */
export function RemoveMemberButton({
  groupId,
  userId,
  name,
}: {
  groupId: string;
  userId: string;
  name: string;
}) {
  const t = useT();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onRemove() {
    if (!window.confirm(t("{name} gruptan çıkarılsın mı?", { name }))) return;
    setLoading(true);
    const res = await removeMember(groupId, userId);
    setLoading(false);
    if (!res.ok) {
      toast.error(t(res.error ?? "Üye çıkarılamadı."));
      return;
    }
    toast.success(t("{name} gruptan çıkarıldı.", { name }));
    router.refresh();
  }

  return (
    <button
      onClick={onRemove}
      disabled={loading}
      className="text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
      aria-label={name}
      title={t("Üyeyi çıkar (yalnızca grup sahibi)")}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <UserMinus className="h-4 w-4" />
      )}
    </button>
  );
}
