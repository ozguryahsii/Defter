"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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

export function CreateGroupForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    const form = new FormData(e.currentTarget);

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
