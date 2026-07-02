import type { Metadata } from "next";
import { QrDecoder } from "@/components/tools/qr-decoder";

export const metadata: Metadata = { title: "Karekod Çözücü" };

export default function QrToolPage() {
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Karekod Çözücü
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Bir karekod görselini (ekran görüntüsü/fotoğraf) yükle, içindeki ham
          metni gör. Görsel cihazından çıkmaz; çözümleme tarayıcıda yapılır.
        </p>
      </div>
      <QrDecoder />
    </div>
  );
}
