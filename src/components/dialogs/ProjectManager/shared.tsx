"use client";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function formatRelativeTime(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return "";
  }
}

export function itemLabel(count: number): string {
  return count === 1 ? "1 item" : `${count} items`;
}

const AVATAR_COLORS = [
  "bg-blue-500/15 text-blue-400",
  "bg-violet-500/15 text-violet-400",
  "bg-emerald-500/15 text-emerald-400",
  "bg-amber-500/15 text-amber-400",
  "bg-rose-500/15 text-rose-400",
  "bg-cyan-500/15 text-cyan-400",
];

function avatarColor(id: string): string {
  const hash = id.split("").reduce((sum, c) => sum + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length] ?? AVATAR_COLORS[0]!;
}

export function ProjectAvatar({ id, title }: { id: string; title: string }) {
  const letter = (title || "?")[0]?.toUpperCase() ?? "?";
  return (
    <div
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-semibold",
        avatarColor(id)
      )}
    >
      {letter}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="border-border/40 bg-background/60 flex animate-pulse items-center gap-3 rounded-xl border px-3 py-2.5">
      <div className="bg-muted/70 size-9 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="bg-muted/70 h-3.5 w-28 rounded-md" />
        <div className="bg-muted/50 h-2.5 w-16 rounded-md" />
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
}) {
  return (
    <div className="border-border/40 flex flex-col items-center gap-2.5 rounded-xl border border-dashed px-4 py-8 text-center">
      <div className="text-muted-foreground/35">{icon}</div>
      <div>
        <p className="text-muted-foreground text-sm font-medium">{title}</p>
        <p className="text-muted-foreground/60 mt-0.5 text-[11px] leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}

export function CurrentBadge({ label = "current" }: { label?: string }) {
  return (
    <span className="bg-primary/10 text-primary/80 inline-flex shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium tracking-wide">
      {label}
    </span>
  );
}

export function DesktopActionTooltip({
  label,
  children,
}: {
  label: string;
  children: React.ReactElement;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
