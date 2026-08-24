"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Polls the group's pulse endpoint and refreshes the page when something
 * changes (another member added an expense, confirmed a payment, etc.) —
 * the lightweight, self-hosted-friendly stand-in for websockets.
 */
export function LiveRefresh({
  groupId,
  initialVersion,
}: {
  groupId: string;
  initialVersion: number;
}) {
  const router = useRouter();
  const version = useRef(initialVersion);

  useEffect(() => {
    let stopped = false;
    const id = setInterval(async () => {
      if (document.hidden) return;
      try {
        const res = await fetch(`/api/groups/${groupId}/pulse`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { v?: number };
        if (!stopped && typeof data.v === "number" && data.v > version.current) {
          version.current = data.v;
          router.refresh();
        }
      } catch {
        // ignore transient network errors
      }
    }, 6000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [groupId, router]);

  return null;
}
