"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plane, Rocket } from "lucide-react";
import { createGroup } from "@/lib/actions";
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
import { cn } from "@/lib/utils";

const TYPES = [
  {
    value: "Tatil",
    label: "Tatil / Arkadaş grubu",
    desc: "Masraflar genelde eşit bölüşülür",
    icon: Plane,
  },
  {
    value: "Girisim",
    label: "Ortak girişim",
    desc: "Ortaklık ve adil hesaplaşma",
    icon: Rocket,
  },
];

export function CreateGroupForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState("Tatil");
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    const form = new FormData(e.currentTarget);
    form.set("type", type);

    const res = await createGroup({ ok: false }, form);
    if (!res.ok || !res.groupId) {
      setLoading(false);
      if (res.fieldErrors) setErrors(res.fieldErrors);
      if (res.error) toast.error(res.error);
      return;
    }
    toast.success("Grup oluşturuldu!");
    router.push(`/groups/${res.groupId}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Grup adı</Label>
        <Input
          id="name"
          name="name"
          placeholder="Örn. Bodrum Tatili 2026"
          required
          autoFocus
        />
        {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
      </div>

      <div className="space-y-2">
        <Label>Tür</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          {TYPES.map((t) => {
            const Icon = t.icon;
            const active = type === t.value;
            return (
              <button
                type="button"
                key={t.value}
                onClick={() => setType(t.value)}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-4 text-left transition-all",
                  active
                    ? "border-brand/50 bg-brand/5 ring-1 ring-brand/40"
                    : "border-border/60 hover:border-border hover:bg-secondary/40",
                )}
              >
                <span
                  className={cn(
                    "grid h-10 w-10 place-items-center rounded-lg border border-border/60",
                    active ? "bg-brand/10 text-brand" : "text-muted-foreground",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-medium">{t.label}</span>
                  <span className="block text-xs text-muted-foreground">
                    {t.desc}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="currency">Para birimi</Label>
        <Select name="currency" defaultValue="TRY">
          <SelectTrigger id="currency">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TRY">₺ TRY — Türk Lirası</SelectItem>
            <SelectItem value="USD">$ USD — Dolar</SelectItem>
            <SelectItem value="EUR">€ EUR — Euro</SelectItem>
            <SelectItem value="GBP">£ GBP — Sterlin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/groups")}
        >
          Vazgeç
        </Button>
        <Button type="submit" variant="brand" disabled={loading}>
          {loading && <Loader2 className="animate-spin" />}
          Oluştur
        </Button>
      </div>
    </form>
  );
}
