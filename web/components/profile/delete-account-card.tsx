"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { deleteAccount } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function DeleteAccountCard() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await deleteAccount({ ok: false }, new FormData(e.currentTarget));
    if (!res.ok) {
      setLoading(false);
      setError(res.fieldErrors?.password ?? res.error ?? "İşlem başarısız.");
      return;
    }
    toast.success("Hesabın silindi. Güle güle 👋");
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
        <AlertTriangle className="h-4 w-4" /> Tehlikeli bölge
      </div>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Hesabını silersen kişisel bilgilerin (kullanıcı adı, ad, IBAN) kalıcı
        olarak kaldırılır ve bir daha giriş yapamazsın. Yalnızca sana ait
        gruplar tamamen silinir; ortak gruplardaki harcama kayıtları, diğer
        üyelerin hesabı bozulmasın diye &quot;Silinen Kullanıcı&quot; adıyla
        anonim kalır.
      </p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="destructive" size="sm" className="mt-4">
            <Trash2 className="h-4 w-4" /> Hesabımı sil
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Hesabını silmek üzeresin</DialogTitle>
            <DialogDescription>
              Bu işlem geri alınamaz. Onaylamak için parolanı gir.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="del-password">Parola</Label>
              <Input
                id="del-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                autoFocus
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Vazgeç
              </Button>
              <Button type="submit" variant="destructive" disabled={loading}>
                {loading && <Loader2 className="animate-spin" />}
                Kalıcı olarak sil
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
