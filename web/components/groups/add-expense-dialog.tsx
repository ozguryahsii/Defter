"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2, Plus } from "lucide-react";
import { addExpense, editExpense } from "@/lib/actions";
import { equalShares } from "@/lib/settlement";
import { formatCurrency } from "@/lib/format";
import { CURRENCIES } from "@/lib/currencies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserAvatar } from "@/components/user-avatar";
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

export type EditExpenseInit = {
  id: string;
  description: string;
  category: string;
  amount: number;
  payerId: string;
  date: string; // yyyy-mm-dd
  splitType: "Equal" | "Exact";
  participantIds: string[];
  exactAmounts: Record<string, string>;
};

export function AddExpenseDialog({
  groupId,
  currency,
  members,
  currentUserId,
  expense,
  trigger,
  personal = false,
  mode = "expense",
}: {
  groupId: string;
  currency: string;
  members: Member[];
  currentUserId: string;
  expense?: EditExpenseInit;
  trigger?: React.ReactNode;
  /** Personal budget group: single member, no payer/participant/split UI. */
  personal?: boolean;
  /** "income" renders the simplified income form (personal budget only). */
  mode?: "expense" | "income";
}) {
  const router = useRouter();
  const isEdit = !!expense;
  const isIncome = mode === "income";
  const simple = personal || isIncome;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [description, setDescription] = useState(expense?.description ?? "");
  const [category, setCategory] = useState(expense?.category ?? "");
  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const [payerId, setPayerId] = useState(expense?.payerId ?? currentUserId);
  const [date, setDate] = useState(
    expense?.date ?? new Date().toISOString().slice(0, 10),
  );
  const [splitType, setSplitType] = useState<"Equal" | "Exact">(
    expense?.splitType ?? "Equal",
  );
  const [participants, setParticipants] = useState<string[]>(
    expense?.participantIds ?? members.map((m) => m.userId),
  );
  const [exact, setExact] = useState<Record<string, string>>(
    expense?.exactAmounts ?? {},
  );
  const [entryCurrency, setEntryCurrency] = useState(currency);
  // Kur otomatik alınır ve değiştirilemez; null = henüz yükleniyor/alınamadı.
  const [autoRate, setAutoRate] = useState<number | null>(null);
  const [fxFailed, setFxFailed] = useState(false);

  useEffect(() => {
    if (entryCurrency === currency) {
      setAutoRate(null);
      setFxFailed(false);
      return;
    }
    let cancelled = false;
    setAutoRate(null);
    setFxFailed(false);
    fetch(`/api/fx?from=${entryCurrency}&to=${currency}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { rate?: number } | null) => {
        if (cancelled) return;
        if (data?.rate) setAutoRate(data.rate);
        else setFxFailed(true);
      })
      .catch(() => {
        if (!cancelled) setFxFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [entryCurrency, currency]);

  const enteredAmount = parseFloat(amount) || 0;
  const isForeign = entryCurrency !== currency;
  const rate = isForeign ? (autoRate ?? 0) : 1;
  // numericAmount is always in the GROUP currency (converted when foreign).
  const numericAmount = isForeign
    ? Math.round(enteredAmount * rate * 100) / 100
    : enteredAmount;


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
    if (expense) {
      // Edit mode: restore to the expense's saved values.
      setDescription(expense.description);
      setCategory(expense.category);
      setAmount(String(expense.amount));
      setPayerId(expense.payerId);
      setDate(expense.date);
      setSplitType(expense.splitType);
      setParticipants(expense.participantIds);
      setExact(expense.exactAmounts);
    } else {
      setDescription("");
      setCategory("");
      setAmount("");
      setPayerId(currentUserId);
      setDate(new Date().toISOString().slice(0, 10));
      setSplitType("Equal");
      setParticipants(members.map((m) => m.userId));
      setExact({});
    }
    setEntryCurrency(currency);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const exactAmounts =
      splitType === "Exact"
        ? Object.fromEntries(
            participants.map((id) => [id, parseFloat(exact[id] ?? "") || 0]),
          )
        : undefined;

    const res = isEdit
      ? await editExpense({
          expenseId: expense!.id,
          description,
          category: category || undefined,
          amount: numericAmount,
          payerId,
          date,
          splitType,
          participantIds: participants,
          exactAmounts,
        })
      : await addExpense({
          groupId,
          description,
          category: category || undefined,
          amount: numericAmount,
          payerId: simple ? currentUserId : payerId,
          date,
          splitType: simple ? "Equal" : splitType,
          participantIds: simple ? [currentUserId] : participants,
          kind: isIncome ? "income" : "expense",
          originalAmount: isForeign ? enteredAmount : undefined,
          originalCurrency: isForeign ? entryCurrency : undefined,
          fxRate: isForeign ? rate : undefined,
          exactAmounts,
        });
    setLoading(false);

    if (!res.ok) {
      toast.error(res.error ?? "İşlem başarısız.");
      return;
    }
    toast.success(
      isEdit
        ? "Kayıt güncellendi."
        : isIncome
          ? "Gelir eklendi."
          : "Harcama eklendi.",
    );
    if (!isEdit) reset(); // clear the form so the next "add" starts fresh
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
        {trigger ?? (
          <Button variant={isIncome ? "outline" : "brand"}>
            <Plus /> {isIncome ? "Gelir Ekle" : "Harcama Ekle"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? "Kaydı Düzenle"
              : isIncome
                ? "Gelir Ekle"
                : "Harcama Ekle"}
          </DialogTitle>
          <DialogDescription>
            {isIncome
              ? "Bütçene giren parayı kaydet (maaş, ek gelir vb.)."
              : simple
                ? "Tutarı gir; bütçe özeti anında güncellenir."
                : "Tutarı gir, kimlerin dahil olduğunu seç. Borç tablosu anında güncellenir."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="desc">Açıklama</Label>
            <Input
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isIncome ? "Örn. Maaş" : "Örn. Akşam yemeği"}
              required
              autoFocus
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amount">Tutar</Label>
              <div className="flex gap-2">
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
                  className="flex-1"
                />
                {!isEdit && (
                  <Select value={entryCurrency} onValueChange={setEntryCurrency}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
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

          {isForeign && (
            <div className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
              {autoRate !== null ? (
                <p className="text-xs text-muted-foreground">
                  Güncel kur: 1 {entryCurrency} ={" "}
                  {(Math.round(autoRate * 10000) / 10000).toLocaleString("tr-TR")}{" "}
                  {currency}
                  {numericAmount > 0 && (
                    <>
                      {" · "}
                      {enteredAmount} {entryCurrency} ≈{" "}
                      <span className="font-medium text-foreground">
                        {formatCurrency(numericAmount, currency)}
                      </span>
                    </>
                  )}
                </p>
              ) : fxFailed ? (
                <p className="text-xs text-destructive">
                  Güncel kur şu anda alınamıyor. Lütfen biraz sonra tekrar dene
                  veya tutarı {currency} olarak gir.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Güncel kur alınıyor…
                </p>
              )}
            </div>
          )}

          <div className={cn("grid gap-3", !simple && "sm:grid-cols-2")}>
            {!simple && (
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
            )}
            <div className="space-y-2">
              <Label htmlFor="date">Tarih</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              {simple && !isIncome && (
                <p className="text-xs text-muted-foreground">
                  İleri tarih girersen, 2 gün ve 1 gün kala sana hatırlatırız.
                </p>
              )}
            </div>
          </div>

          {/* Split type toggle */}
          {!simple && (
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
          )}

          {/* Participants */}
          <div className={cn("space-y-2", simple && "hidden")}>
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
                    <UserAvatar
                      userId={m.userId}
                      name={m.name}
                      className="h-7 w-7"
                      fallbackClassName="text-[10px]"
                    />
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
              onClick={() => {
                reset();
                setOpen(false);
              }}
            >
              Vazgeç
            </Button>
            <Button
              type="submit"
              variant="brand"
              disabled={loading || (isForeign && autoRate === null)}
            >
              {loading && <Loader2 className="animate-spin" />}
              {isEdit ? "Güncelle" : "Kaydet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
