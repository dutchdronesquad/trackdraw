import { cn } from "@/lib/utils";

interface UserAvatarProps {
  name?: string | null;
  email?: string | null;
  className?: string;
}

function getInitials(name?: string | null, email?: string | null): string {
  const source = name?.trim() || email?.trim() || "T";
  const parts = source
    .split(/[\s@._-]+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "T";
}

export default function UserAvatar({ name, email, className }: UserAvatarProps) {
  return (
    <span
      className={cn(
        "bg-foreground text-background flex shrink-0 items-center justify-center rounded-full font-medium select-none",
        className
      )}
      aria-hidden="true"
    >
      {getInitials(name, email)}
    </span>
  );
}
