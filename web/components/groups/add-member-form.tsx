"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useT } from "@/components/i18n-provider";
import { Loader2, UserPlus } from "lucide-react";
import { addMember } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AddMemberForm({ groupId }: { groupId: string }) {
  const t = useT();
  const router = useRouter();
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!value.trim()) return;
    setLoading(true);
    const res = await addMember(groupId, value.trim());
    setLoading(false);
    if (!res.ok) {
      toast.error(t(res.error ?? "Üye eklenemedi."));
      return;
    }
    toast.success(t("Davet gönderildi — onaylayınca gruba katılacak."));
    setValue("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t("kullanıcı adı")}
        aria-label={t("Kullanıcı adı")}
      />
      <Button type="submit" variant="secondary" size="icon" disabled={loading}>
        {loading ? <Loader2 className="animate-spin" /> : <UserPlus />}
      </Button>
    </form>
  );
}
