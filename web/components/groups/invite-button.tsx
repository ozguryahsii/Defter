"use client";

import { useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Check, Copy, Loader2, QrCode } from "lucide-react";
import { createInvite } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * "Davet QR Oluştur": generates an invite link, shows it as a scannable QR
 * (camera → tap → join) with the raw link + copy button underneath.
 */
export function InviteButton({ groupId }: { groupId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    const res = await createInvite(groupId);
    setLoading(false);
    if (!res.ok || !res.token) {
      toast.error(res.error ?? "Davet oluşturulamadı.");
      return;
    }
    const link = `${window.location.origin}/join/${res.token}`;
    setUrl(link);
    setCopied(false);
    try {
      setQr(await QRCode.toDataURL(link, { width: 240, margin: 1 }));
    } catch {
      setQr(null);
    }
    setOpen(true);
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Davet linki kopyalandı.");
    } catch {
      toast.error("Kopyalanamadı.");
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={generate}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <QrCode className="h-4 w-4" />
        )}
        Davet QR Oluştur
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Gruba Davet</DialogTitle>
            <DialogDescription>
              Arkadaşın kamerasıyla okutup tıklayınca gruba katılır. Link 7 gün
              geçerlidir.
            </DialogDescription>
          </DialogHeader>

          {qr && (
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qr}
                alt="Davet QR"
                width={240}
                height={240}
                className="rounded-xl border border-border/60 bg-white p-2"
              />
            </div>
          )}

          {url && (
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-secondary/30 px-2.5 py-2">
              <code className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
                {url}
              </code>
              <button
                type="button"
                onClick={copy}
                className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Linki kopyala"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
