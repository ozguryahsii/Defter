"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, ArchiveRestore, DoorOpen, Loader2 } from "lucide-react";
import { leaveGroup, setGroupArchived } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/** Owner: archive/unarchive toggle (prominent, full-width). */
export function ArchiveGroupButton({
  groupId,
  archived,
}: {
  groupId: string;
  archived: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function apply(next: boolean) {
    setLoading(true);
    const res = await setGroupArchived(groupId, next);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error ?? "İşlem başarısız.");
      return;
    }
    setOpen(false);
    toast.success(next ? "Grup arşivlendi." : "Grup arşivden çıkarıldı.");
    router.refresh();
  }

  // Unarchive is harmless — no confirmation needed.
  if (archived) {
    return (
      <Button
        variant="outline"
        className="w-full justify-center"
        onClick={() => apply(false)}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ArchiveRestore className="h-4 w-4" />
        )}
        Arşivden Çıkar
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-center">
          <Archive className="h-4 w-4" /> Grubu Arşivle
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Grup arşivlensin mi?</DialogTitle>
          <DialogDescription>
            Arşivdeki gruplarda yeni harcama veya ödeme yapılamaz; kayıtlar
            okunabilir kalır. İstediğin zaman arşivden çıkarabilirsin.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Vazgeç
          </Button>
          <Button type="button" onClick={() => apply(true)} disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            Arşivle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Non-owner member: leave the group (blocked while balance is unsettled). */
export function LeaveGroupButton({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function leave() {
    setLoading(true);
    const res = await leaveGroup(groupId);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error ?? "Ayrılamadın.");
      return;
    }
    setOpen(false);
    toast.success("Gruptan ayrıldın.");
    router.push("/groups");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-center border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <DoorOpen className="h-4 w-4" /> Gruptan Ayrıl
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Gruptan ayrılmak istediğine emin misin?</DialogTitle>
          <DialogDescription>
            Gruptan ayrıldığında harcama ve ödeme geçmişine erişimin sona erer.
            Tekrar katılmak için yeniden davet edilmen gerekir.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Vazgeç
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={leave}
            disabled={loading}
          >
            {loading && <Loader2 className="animate-spin" />}
            Gruptan Ayrıl
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
