"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2, Plus } from "lucide-react";
import { addExpense } from "@/lib/actions";
import { equalShares } from "@/lib/settlement";
import { formatCurrency, initials } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Member = { userId: string; name: string };

export function AddExpenseDialog({
  groupId,
  currency,
  members,
  currentUserId,
}: {
  groupId: string;
  currency: string;
  members: Member[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [payerId, setPayerId] = useState(currentUserId);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [splitType, setSplitType] = useState<"Equal" | "Exact">("Equal");
  const [participants, setParticipants] = useState<string[]>(
    members.map((m) => m.userId),
  );
  const [exact, setExact] = useState<Record<string, string>>({});

  const numericAmount = parseFloat(amount) || 0;

  const exactSum = useMemo(
    () =>
      participants.reduce((s, id) => s + (parseFloat(exact[id] ?? "") || 0), 0),
    [participants, exact],
  );
  const remainder = numericAmount - exactSum;

  const equalPreview = useMemo(() => {
    if (splitType !== "Equal" || participants.length === 0 || numericAmount <= 0)
      return null;
    return equalShares(numericAmount, participants)[0]?.amount ?? 0;
  }, [splitType, participants, numericAmount]);

  function toggleParticipant(id: string) {
    setParticipants((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function reset() {
    setDescription("");
    setCategory("");
    setAmount("");
    setPayerId(currentUserId);
    setDate(new Date().toISOString().slice(0, 10));
    setSplitType("Equal");
    setParticipants(members.map((m) => m.userId));
    setExact({});
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const res = await addExpense({
      groupId,
      description,
      category: category || undefined,
      amount: numericAmount,
      payerId,
      date,
      splitType,
      participantIds: participants,
      exactAmounts:
        splitType === "Exact"
          ? Object.fromEntries(
              participants.map((id) => [id, parseFloat(exact[id] ?? "") || 0]),
            )
          : undefined,
    });
    setLoading(false);

    if (!res.ok) {
      toast.error(res.error ?? "Harcama eklenemedi.");
      return;
    }
    toast.success("Harcama eklendi. Borçlar güncellendi.");
    reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="brand">
          <Plus /> Harcama Ekle
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Harcama Ekle</DialogTitle>
          <DialogDescription>
            Tutarı gir, kimlerin dahil olduğunu seç. Borç tablosu anında güncellenir.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="desc">Açıklama</Label>
            <Input
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Örn. Akşam yemeği"
              required
              autoFocus
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amount">Tutar ({currency})</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat">Kategori</Label>
              <Input
                id="cat"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Örn. Yemek"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
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
            <div className="space-y-2">
              <Label htmlFor="date">Tarih</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          {/* Split type toggle */}
          <div className="space-y-2">
            <Label>Bölüşüm</Label>
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-border/60 bg-muted/40 p-1">
              {(["Equal", "Exact"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSplitType(t)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                    splitType === t
                      ? "bg-background text-foreground shadow-soft"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t === "Equal" ? "Eşit böl" : "Özel tutarlar"}
                </button>
              ))}
            </div>
          </div>

          {/* Participants */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Kimleri kapsıyor?</Label>
              {splitType === "Equal" && equalPreview !== null && (
                <span className="text-xs text-muted-foreground">
                  Kişi başı ~{formatCurrency(equalPreview, currency)}
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              {members.map((m) => {
                const checked = participants.includes(m.userId);
                return (
                  <div
                    key={m.userId}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-3 py-2 transition-colors",
                      checked
                        ? "border-border bg-secondary/40"
                        : "border-border/50 opacity-70",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggleParticipant(m.userId)}
                      className={cn(
                        "grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors",
                        checked
                          ? "border-brand bg-brand text-brand-foreground"
                          : "border-border",
                      )}
                      aria-label={`${m.name} seç`}
                    >
                      {checked && <Check className="h-3.5 w-3.5" />}
                    </button>
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-[10px]">
                        {initials(m.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 text-sm">{m.name}</span>
                    {splitType === "Exact" && checked && (
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        inputMode="decimal"
                        value={exact[m.userId] ?? ""}
                        onChange={(e) =>
                          setExact((prev) => ({
                            ...prev,
                            [m.userId]: e.target.value,
                          }))
                        }
                        placeholder="0.00"
                        className="h-8 w-24"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {splitType === "Exact" && numericAmount > 0 && (
              <p
                className={cn(
                  "text-xs",
                  Math.abs(remainder) < 0.005
                    ? "text-success"
                    : "text-destructive",
                )}
              >
                {Math.abs(remainder) < 0.005
                  ? "Toplam tutarla eşleşiyor ✓"
                  : `Kalan: ${formatCurrency(remainder, currency)}`}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Vazgeç
            </Button>
            <Button type="submit" variant="brand" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />}
              Kaydet
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
