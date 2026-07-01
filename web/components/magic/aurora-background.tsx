import { cn } from "@/lib/utils";

/** Decorative animated aurora/gradient blobs behind auth & hero surfaces. */
export function AuroraBackground({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 overflow-hidden",
        className,
      )}
    >
      <div className="absolute -left-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-brand/25 blur-[120px] animate-float" />
      <div className="absolute right-[-6rem] top-1/3 h-[24rem] w-[24rem] rounded-full bg-primary/20 blur-[120px] animate-float [animation-delay:-3s]" />
      <div className="absolute bottom-[-8rem] left-1/3 h-[26rem] w-[26rem] rounded-full bg-fuchsia-500/10 blur-[130px] animate-float [animation-delay:-1.5s]" />
      <div className="absolute inset-0 grid-bg opacity-[0.25] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
    </div>
  );
}
