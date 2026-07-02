"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * SOBSO! brand mark. Renders /logo.png cropped to the central wordmark band:
 * the source PNG is a square canvas with lots of padding, so we show it inside
 * a wide box with object-cover — the padding is cropped away and the wordmark
 * fills the box. Falls back to a styled wordmark if the file is missing.
 */
export function Logo({
  href = "/dashboard",
  size = "sm",
  className,
}: {
  href?: string;
  /** sm: topbar · md: sidebar · lg: login/register */
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  const box = {
    sm: "h-12 w-32", // 48 × 128 — mobile topbar
    md: "h-20 w-48", // 80 × 192 — sidebar
    lg: "h-44 w-full max-w-[26rem] sm:h-48", // login hero
  }[size];

  if (imgFailed) {
    const big = size === "lg";
    return (
      <Link
        href={href}
        className={cn("group flex items-center gap-2.5", className)}
        aria-label="SOBSO! ana sayfa"
      >
        <span
          className={cn(
            "relative grid place-items-center rounded-xl bg-gradient-to-br from-brand to-primary text-brand-foreground shadow-glow",
            big ? "h-14 w-14" : "h-9 w-9",
          )}
        >
          <ArrowLeftRight className={big ? "h-7 w-7" : "h-5 w-5"} />
        </span>
        <span
          className={cn(
            "font-semibold tracking-tight",
            big ? "text-4xl" : "text-lg",
          )}
        >
          SOBSO!
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={cn("block", size === "lg" && "w-full", className)}
      aria-label="SOBSO! ana sayfa"
    >
      <span className={cn("relative block overflow-hidden", box)}>
        <Image
          src="/logo.png"
          alt="SOBSO!"
          fill
          sizes="(max-width: 640px) 90vw, 480px"
          className="object-cover"
          priority={size === "lg"}
          unoptimized
          onError={() => setImgFailed(true)}
        />
      </span>
    </Link>
  );
}
