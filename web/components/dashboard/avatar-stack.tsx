import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";

export function AvatarStack({
  users,
  max = 4,
  className,
}: {
  users: { id: string; name: string }[];
  max?: number;
  className?: string;
}) {
  const shown = users.slice(0, max);
  const extra = users.length - shown.length;

  return (
    <div className={cn("flex items-center -space-x-2.5", className)}>
      {shown.map((u) => (
        <UserAvatar
          key={u.id}
          userId={u.id}
          name={u.name}
          className="h-8 w-8 ring-2 ring-card"
          fallbackClassName="text-[10px]"
        />
      ))}
      {extra > 0 && (
        <span className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-[10px] font-semibold text-muted-foreground ring-2 ring-card">
          +{extra}
        </span>
      )}
    </div>
  );
}
