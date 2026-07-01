import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

export function AvatarStack({
  names,
  max = 4,
  className,
}: {
  names: string[];
  max?: number;
  className?: string;
}) {
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;

  return (
    <div className={cn("flex items-center -space-x-2.5", className)}>
      {shown.map((name, i) => (
        <Avatar
          key={i}
          className="h-8 w-8 ring-2 ring-card"
          title={name}
        >
          <AvatarFallback className="text-[10px]">
            {initials(name)}
          </AvatarFallback>
        </Avatar>
      ))}
      {extra > 0 && (
        <span className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-[10px] font-semibold text-muted-foreground ring-2 ring-card">
          +{extra}
        </span>
      )}
    </div>
  );
}
