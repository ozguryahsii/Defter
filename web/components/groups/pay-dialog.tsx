"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Copy, QrCode, Wallet } from "lucide-react";
import { buildFastKarekod } from "@/lib/trkarekod";
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
import { useT } from "@/components/i18n-provider";

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
  const t = useT();
  const [open, setOpen] = useState(false);
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !iban) return;
    try {
      // FAST TR Karekod payload (TCMB standard). FAST works in TRY only, so
      // the amount is embedded only for TRY groups; otherwise a static code
      // (recipient info only) is produced and the payer types the amount.
      const payload = buildFastKarekod({
        iban,
        name: ibanName || creditorName,
        amount: currency === "TRY" ? amount : undefined,
      });
      QRCode.toDataURL(payload, {
        width: 220,
        margin: 1,
        errorCorrectionLevel: "M",
      })
        .then(setQr)
        .catch(() => setQr(null));
    } catch {
      setQr(null);
    }
  }, [open, iban, ibanName, creditorName, amount, currency]);

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("{x} kopyalandı.", { x: label }));
    } catch {
      toast.error(t("Kopyalanamadı."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-8">
          <Wallet className="h-4 w-4" /> {t("Öde")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("{name}'e öde", { name: creditorName })}</DialogTitle>
          <DialogDescription>
            {t("{amount} tutarını gönder. Ödemeni {name} aldığında 'Ödendi' olarak onaylar.", { amount: formatCurrency(amount, currency), name: creditorName })}
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
              <QrCode className="h-3.5 w-3.5" /> {t("Banka uygulamanın")}{" "}
              <span className="font-medium">{t("FAST / Karekod ile ödeme")}</span>{" "}
              {t("ekranından okut")}
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
                  onClick={() => copy(String(amount.toFixed(2)), t("Tutar"))}
                >
                  <Copy className="h-3.5 w-3.5" /> {t("Tutarı kopyala")}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            {t("{name} henüz IBAN eklemedi. Profilinden ekleyebilir.", { name: creditorName })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
