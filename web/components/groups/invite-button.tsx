"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Link2, Loader2, Copy, Check } from "lucide-react";
import { createInvite } from "@/lib/actions";
import { Button } from "@/components/ui/button";

export function InviteButton({ groupId }: { groupId: string }) {
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    const res = await createInvite(groupId);
    setLoading(false);
    if (!res.ok || !res.token) {
      toast.error(res.error ?? "Davet linki oluşturulamadı.");
      return;
    }
    const link = `${window.location.origin}/join/${res.token}`;
    setUrl(link);
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Davet linki kopyalandı (7 gün geçerli).");
    } catch {
      toast.success("Davet linki oluşturuldu.");
    }
  }

  async function copyAgain() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Kopyalandı.");
  }

  return (
    <div className="space-y-2">
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
          <Link2 className="h-4 w-4" />
        )}
        Davet linki oluştur
      </Button>
      {url && (
        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-secondary/30 px-2 py-1.5">
          <code className="flex-1 truncate text-[11px] text-muted-foreground">
            {url}
          </code>
          <button
            type="button"
            onClick={copyAgain}
            className="shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Kopyala"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-success" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}
