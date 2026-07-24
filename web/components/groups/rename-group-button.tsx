"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Pencil } from "lucide-react";
import { renameGroup } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/** Owner-only: rename the group via a small pencil next to the title. */
export function RenameGroupButton({
  groupId,
  currentName,
}: {
  groupId: string;
  currentName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(currentName);
  const [loading, setLoading] = useState(false);

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) setName(currentName);
  }

  async function save() {
    setLoading(true);
    const res = await renameGroup(groupId, name);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error ?? "Ad değiştirilemedi.");
      return;
    }
    setOpen(false);
    toast.success("Grup adı güncellendi.");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Grup adını değiştir"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Grup adını değiştir</DialogTitle>
          <DialogDescription>
            Yeni ad tüm üyeler için görünür ve üyeler bilgilendirilir.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
          className="space-y-4"
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            autoFocus
            placeholder="Grup adı"
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Vazgeç
            </Button>
            <Button
              type="submit"
              disabled={loading || name.trim().length === 0}
            >
              {loading && <Loader2 className="animate-spin" />}
              Kaydet
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
