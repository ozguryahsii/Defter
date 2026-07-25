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
import { useT } from "@/components/i18n-provider";

export function DeleteGroupButton({
  groupId,
  groupName,
}: {
  groupId: string;
  groupName: string;
}) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onDelete() {
    setLoading(true);
    const res = await deleteGroup(groupId);
    setLoading(false);
    if (!res.ok) {
      toast.error(t(res.error ?? "Grup silinemedi."));
      return;
    }
    toast.success(t("Grup silindi."));
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
          <Trash2 className="h-4 w-4" /> {t("Grubu Sil")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("'{name}' silinsin mi?", { name: groupName })}</DialogTitle>
          <DialogDescription>
            {t("Tüm harcamalar, ödemeler ve geçmiş kalıcı olarak silinir. Bu işlem geri alınamaz ve grubun tüm üyelerini etkiler.")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            {t("Vazgeç")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onDelete}
            disabled={loading}
          >
            {loading && <Loader2 className="animate-spin" />}
            {t("Kalıcı olarak sil")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
