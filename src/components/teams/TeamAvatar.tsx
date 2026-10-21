import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function TeamAvatar({
  name,
  square = false,
}: {
  name: string;
  square?: boolean;
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => Array.from(part)[0])
    .join("")
    .toLocaleUpperCase();
  return (
    <Avatar
      aria-hidden="true"
      className={square ? "size-11 rounded-xl" : "size-11"}
    >
      <AvatarFallback
        className={
          square
            ? "bg-brand-primary/12 text-brand-primary rounded-xl text-sm font-medium"
            : "text-foreground/80 text-sm font-medium"
        }
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
