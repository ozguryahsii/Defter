"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { submitIssueReport } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useT } from "@/components/i18n-provider";

export function IssueReportForm() {
  const t = useT();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const res = await submitIssueReport(message);
    setLoading(false);
    if (!res.ok) {
      toast.error(t(res.error ?? "Gönderilemedi, tekrar dene."));
      return;
    }
    toast.success(t("Bildirimin alındı, teşekkürler!"));
    setMessage("");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="issue-message">
          {t("Karşılaştığın sorunu ya da önerini yaz")}
        </Label>
        <textarea
          id="issue-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={2000}
          rows={4}
          required
          placeholder={t("Ne oldu, ne bekliyordun?")}
          className="flex w-full rounded-lg border border-input bg-background/60 px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
      <Button type="submit" variant="outline" disabled={loading || message.trim().length < 5}>
        {loading ? <Loader2 className="animate-spin" /> : <Send />}
        {t("Gönder")}
      </Button>
    </form>
  );
}
