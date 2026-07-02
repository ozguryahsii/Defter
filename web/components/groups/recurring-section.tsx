"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Repeat, Trash2, X } from "lucide-react";
import { addRecurring, deleteRecurring } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/format";
import type { RecurringItem } from "@/lib/queries";

type Member = { userId: string; name: string };

export function RecurringSection({
  groupId,
  currency,
  items,
  members,
  currentUserId,
}: {
  groupId: string;
  currency: string;
  items: RecurringItem[];
  members: Member[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [payerId, setPayerId] = useState(currentUserId);
  const [interval, setIntervalVal] = useState<"monthly" | "weekly">("monthly");
  const [startDate, setStartDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const res = await addRecurring({
      groupId,
      description,
      amount: parseFloat(amount) || 0,
      payerId,
      interval,
      startDate,
      participantIds: members.map((m) => m.userId),
    });
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error ?? "Eklenemedi.");
      return;
    }
    toast.success("Tekrarlayan harcama eklendi.");
    setDescription("");
    setAmount("");
    setOpen(false);
    router.refresh();
  }

  async function remove(id: string) {
    if (!window.confirm("Bu tekrarlayan harcamayı silmek istiyor musun?")) return;
    setBusy(id);
    const res = await deleteRecurring(id);
    setBusy(null);
    if (!res.ok) {
      toast.error(res.error ?? "Silinemedi.");
      return;
    }
    toast.success("Silindi.");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {items.length === 0 && !open && (
        <p className="text-sm text-muted-foreground">
          Kira, abonelik gibi düzenli giderleri buraya ekle; vadesi geldikçe
          otomatik harcamaya dönüşür (herkese eşit bölünür).
        </p>
      )}

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((r) => (
            <li
              key={r.id}
              className="flex items-center gap-2 rounded-xl border border-border/60 bg-secondary/20 px-3 py-2"
            >
              <Repeat className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{r.description}</p>
                <p className="text-xs text-muted-foreground">
                  {r.interval === "weekly" ? "Haftalık" : "Aylık"} · {r.payerName}{" "}
                  · sonraki: {formatDate(r.nextRunAt)}
                </p>
              </div>
              <span className="text-sm font-semibold tabular-nums">
                {formatCurrency(r.amount, currency)}
              </span>
              <button
                onClick={() => remove(r.id)}
                disabled={busy === r.id}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Sil"
              >
                {busy === r.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {open ? (
        <form
          onSubmit={add}
          className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="rdesc">Açıklama</Label>
            <Input
              id="rdesc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Örn. Ev kirası"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="ramount">Tutar ({currency})</Label>
              <Input
                id="ramount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Sıklık</Label>
              <Select
                value={interval}
                onValueChange={(v) => setIntervalVal(v as "monthly" | "weekly")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Aylık</SelectItem>
                  <SelectItem value="weekly">Haftalık</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>Ödeyen</Label>
              <Select value={payerId} onValueChange={setPayerId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.userId} value={m.userId}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rstart">İlk tarih</Label>
              <Input
                id="rstart"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" variant="brand" size="sm" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Ekle
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" /> Vazgeç
            </Button>
          </div>
        </form>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setOpen(true)}
        >
          <Plus className="h-4 w-4" /> Tekrarlayan harcama ekle
        </Button>
      )}
    </div>
  );
}
