"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <Button variant="brand" onClick={() => window.print()}>
      <Printer className="h-4 w-4" /> Yazdır / PDF
    </Button>
  );
}
