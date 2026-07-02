"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * SOBSO! brand mark. Renders /logo.png (drop the brand PNG into web/public);
 * falls back to a styled wordmark if the file is missing.
 */
export function Logo({
  href = "/dashboard",
  size = "sm",
  className,
}: {
  href?: string;
  size?: "sm" | "lg";
  className?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  // The brand PNG has generous padding around the wordmark, so the rendered
  // boxes are intentionally large for the mark to read well.
  const dims =
    size === "lg"
      ? { w: 640, h: 320, class: "h-56 w-auto sm:h-72" }
      : { w: 240, h: 120, class: "h-14 w-auto" };

  return (
    <Link
      href={href}
      className={cn("group flex items-center gap-2.5", className)}
      aria-label="SOBSO! ana sayfa"
    >
      {imgFailed ? (
        <span className="flex items-center gap-2.5">
          <span
            className={cn(
              "relative grid place-items-center rounded-xl bg-gradient-to-br from-brand to-primary text-brand-foreground shadow-glow",
              size === "lg" ? "h-14 w-14" : "h-9 w-9",
            )}
          >
            <ArrowLeftRight className={size === "lg" ? "h-7 w-7" : "h-5 w-5"} />
          </span>
          <span
            className={cn(
              "font-semibold tracking-tight",
              size === "lg" ? "text-4xl" : "text-lg",
            )}
          >
            SOBSO!
          </span>
        </span>
      ) : (
        <Image
          src="/logo.png"
          alt="SOBSO!"
          width={dims.w}
          height={dims.h}
          className={cn(dims.class, "object-contain")}
          priority={size === "lg"}
          unoptimized
          onError={() => setImgFailed(true)}
        />
      )}
    </Link>
  );
}
