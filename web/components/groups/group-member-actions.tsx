"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, ArchiveRestore, DoorOpen, Loader2 } from "lucide-react";
import { leaveGroup, setGroupArchived } from "@/lib/actions";
import { Button } from "@/components/ui/button";

/** Owner: archive/unarchive toggle (prominent, full-width). */
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
    <Button
      variant="outline"
      className="w-full justify-center"
      onClick={toggle}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : archived ? (
        <ArchiveRestore className="h-4 w-4" />
      ) : (
        <Archive className="h-4 w-4" />
      )}
      {archived ? "Arşivden Çıkar" : "Grubu Arşivle"}
    </Button>
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
    <Button
      variant="outline"
      className="w-full justify-center border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
      onClick={leave}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <DoorOpen className="h-4 w-4" />
      )}
      Gruptan Ayrıl
    </Button>
  );
}
