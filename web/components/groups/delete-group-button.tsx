"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { deleteGroup } from "@/lib/actions";
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

export function DeleteGroupButton({
  groupId,
  groupName,
}: {
  groupId: string;
  groupName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onDelete() {
    setLoading(true);
    const res = await deleteGroup(groupId);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error ?? "Grup silinemedi.");
      return;
    }
    toast.success("Grup silindi.");
    router.push("/groups");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" /> Grubu sil
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>&quot;{groupName}&quot; silinsin mi?</DialogTitle>
          <DialogDescription>
            Tüm harcamalar, ödemeler ve geçmiş kalıcı olarak silinir. Bu işlem
            geri alınamaz ve grubun tüm üyelerini etkiler.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Vazgeç
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onDelete}
            disabled={loading}
          >
            {loading && <Loader2 className="animate-spin" />}
            Kalıcı olarak sil
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
