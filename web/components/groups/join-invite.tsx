"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, PartyPopper, XCircle } from "lucide-react";
import { joinViaInvite } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/i18n-provider";

export function JoinInvite({ token }: { token: string }) {
  const router = useRouter();
  const t = useT();
  const [state, setState] = useState<"loading" | "error">("loading");
  const [message, setMessage] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // avoid double-run in strict mode
    ran.current = true;
    (async () => {
      const res = await joinViaInvite(token);
      if (res.ok && res.groupId) {
        router.replace(`/groups/${res.groupId}`);
        return;
      }
      setState("error");
      setMessage(t(res.error ?? "Davet linki geçersiz."));
    })();
  }, [token, router]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border border-border/60 bg-card p-10 text-center shadow-card">
      {state === "loading" ? (
        <>
          <Loader2 className="h-10 w-10 animate-spin text-brand" />
          <PartyPopper className="hidden" />
          <p className="text-sm text-muted-foreground">{t("Gruba ekleniyorsun...")}</p>
        </>
      ) : (
        <>
          <XCircle className="h-10 w-10 text-destructive" />
          <p className="font-medium">{message}</p>
          <Button asChild variant="outline">
            <Link href="/groups">{t("Gruplarıma dön")}</Link>
          </Button>
        </>
      )}
    </div>
  );
}
