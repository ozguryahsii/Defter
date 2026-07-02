"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, ArchiveRestore, DoorOpen, Loader2 } from "lucide-react";
import { leaveGroup, setGroupArchived } from "@/lib/actions";

/** Owner: archive/unarchive toggle. */
export function ArchiveGroupButton({
  groupId,
  archived,
}: {
  groupId: string;
  archived: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (
      !archived &&
      !window.confirm(
        "Grup arşivlensin mi? Arşivdeki gruplarda yeni harcama/ödeme yapılamaz; kayıtlar okunabilir kalır.",
      )
    )
      return;
    setLoading(true);
    const res = await setGroupArchived(groupId, !archived);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error ?? "İşlem başarısız.");
      return;
    }
    toast.success(archived ? "Grup arşivden çıkarıldı." : "Grup arşivlendi.");
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : archived ? (
        <ArchiveRestore className="h-3.5 w-3.5" />
      ) : (
        <Archive className="h-3.5 w-3.5" />
      )}
      {archived ? "Arşivden çıkar" : "Arşivle"}
    </button>
  );
}

/** Non-owner member: leave the group (blocked while balance is unsettled). */
export function LeaveGroupButton({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function leave() {
    if (!window.confirm("Gruptan ayrılmak istediğine emin misin?")) return;
    setLoading(true);
    const res = await leaveGroup(groupId);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error ?? "Ayrılamadın.");
      return;
    }
    toast.success("Gruptan ayrıldın.");
    router.push("/groups");
    router.refresh();
  }

  return (
    <button
      onClick={leave}
      disabled={loading}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <DoorOpen className="h-3.5 w-3.5" />
      )}
      Gruptan ayrıl
    </button>
  );
}
