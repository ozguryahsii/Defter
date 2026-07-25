"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/i18n-provider";

export function PrintButton() {
  const t = useT();
  return (
    <Button variant="brand" onClick={() => window.print()}>
      <Printer className="h-4 w-4" /> {t("Yazdır / PDF")}
    </Button>
  );
}
