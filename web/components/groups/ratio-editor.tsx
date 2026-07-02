"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { setShareRatios } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Row = { userId: string; name: string; ratio: number | null };

export function RatioEditor({
  groupId,
  members,
  isOwner,
}: {
  groupId: string;
  members: Row[];
  isOwner: boolean;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(
      members.map((m) => [m.userId, m.ratio != null ? String(m.ratio) : ""]),
    ),
  );
  const [loading, setLoading] = useState(false);

  const weights = members.map((m) => parseFloat(values[m.userId] ?? "") || 0);
  const sum = weights.reduce((s, w) => s + w, 0);

  async function save() {
    setLoading(true);
    const ratios: Record<string, number> = {};
    for (const m of members) {
      const v = parseFloat(values[m.userId] ?? "") || 0;
      if (v > 0) ratios[m.userId] = v;
    }
    const res = await setShareRatios(groupId, ratios);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error ?? "Kaydedilemedi.");
      return;
    }
    toast.success("Ortaklık oranları güncellendi.");
    router.refresh();
  }

  return (
    <div className="space-y-2.5">
      {members.map((m) => {
        const w = parseFloat(values[m.userId] ?? "") || 0;
        const pct = sum > 0 ? Math.round((w / sum) * 100) : 0;
        return (
          <div key={m.userId} className="flex items-center gap-3">
            <span className="flex-1 truncate text-sm">{m.name}</span>
            <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">
              %{pct}
            </span>
            {isOwner ? (
              <Input
                type="number"
                min="0"
                step="0.1"
                inputMode="decimal"
                value={values[m.userId] ?? ""}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [m.userId]: e.target.value }))
                }
                placeholder="pay"
                className="h-8 w-20"
              />
            ) : (
              <span className="w-20 text-right text-sm tabular-nums">
                {m.ratio ?? "—"}
              </span>
            )}
          </div>
        );
      })}
      {isOwner && (
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          onClick={save}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Oranları kaydet
        </Button>
      )}
      <p className="text-xs text-muted-foreground">
        Pay değerleri ağırlıktır (örn. 2 ve 3 → %40 / %60). &quot;Oranla böl&quot;
        seçilen harcamalar bu oranlara göre paylaştırılır.
      </p>
    </div>
  );
}
