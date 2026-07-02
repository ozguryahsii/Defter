"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Copy, QrCode, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format";

function formatIban(iban: string): string {
  return iban.replace(/(.{4})/g, "$1 ").trim();
}

export function PayDialog({
  creditorName,
  iban,
  ibanName,
  amount,
  currency,
}: {
  creditorName: string;
  iban?: string | null;
  ibanName?: string | null;
  amount: number;
  currency: string;
}) {
  const [open, setOpen] = useState(false);
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    if (open && iban) {
      QRCode.toDataURL(iban, { width: 220, margin: 1 })
        .then(setQr)
        .catch(() => setQr(null));
    }
  }, [open, iban]);

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} kopyalandı.`);
    } catch {
      toast.error("Kopyalanamadı.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-8">
          <Wallet className="h-4 w-4" /> Öde
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{creditorName}&apos;e öde</DialogTitle>
          <DialogDescription>
            {formatCurrency(amount, currency)} tutarını gönder. Ödemeni{" "}
            {creditorName} aldığında &quot;Ödendi&quot; olarak onaylar.
          </DialogDescription>
        </DialogHeader>

        {iban ? (
          <div className="space-y-4">
            {qr && (
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qr}
                  alt="IBAN QR"
                  className="rounded-xl border border-border/60 bg-white p-2"
                  width={220}
                  height={220}
                />
              </div>
            )}
            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <QrCode className="h-3.5 w-3.5" /> Banka uygulamandan QR&apos;ı okut
            </div>

            <div className="space-y-2 rounded-xl border border-border/60 bg-secondary/30 p-3">
              {ibanName && (
                <div className="text-sm font-medium">{ibanName}</div>
              )}
              <div className="flex items-center justify-between gap-2">
                <code className="text-xs tracking-wide">{formatIban(iban)}</code>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0"
                  onClick={() => copy(iban, "IBAN")}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-2">
                <span className="text-sm font-semibold tabular-nums">
                  {formatCurrency(amount, currency)}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7"
                  onClick={() => copy(String(amount.toFixed(2)), "Tutar")}
                >
                  <Copy className="h-3.5 w-3.5" /> Tutarı kopyala
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            {creditorName} henüz IBAN eklemedi. Profilinden ekleyebilir.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
