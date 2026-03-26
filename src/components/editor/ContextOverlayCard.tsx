"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContextOverlayCardProps {
  icon: ReactNode;
  title: string;
  badge?: string;
  description: string;
  action?: ReactNode;
  actionPlacement?: "below" | "right";
  dismissLabel: string;
  onDismiss: () => void;
  variant?: "default" | "subtle";
  className?: string;
}

export function ContextOverlayCard({
  icon,
  title,
  badge,
  description,
  action,
  actionPlacement = "below",
  dismissLabel,
  onDismiss,
  variant = "default",
  className,
}: ContextOverlayCardProps) {
  const dismissButton = (
    <button
      onClick={onDismiss}
      className="text-muted-foreground hover:text-foreground mt-0.5 shrink-0 rounded-full p-1 transition-colors"
      aria-label={dismissLabel}
    >
      <X className="size-3.5" />
    </button>
  );

  return (
    <div
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border backdrop-blur",
        variant === "default" &&
          "border-border/70 bg-background/94 px-3 py-3 shadow-[0_18px_36px_rgba(15,23,42,0.12)]",
        variant === "subtle" &&
          "border-border/60 bg-background/88 px-3 py-2.5 shadow-[0_10px_24px_rgba(15,23,42,0.08)]",
        className
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex shrink-0 items-center justify-center rounded-lg",
          variant === "default" && "bg-primary/10 text-primary size-8",
          variant === "subtle" && "bg-muted text-muted-foreground size-7"
        )}
      >
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p
            className={cn(
              "text-foreground font-semibold",
              variant === "default" && "text-sm",
              variant === "subtle" && "text-[13px]"
            )}
          >
            {title}
          </p>
          {badge ? (
            <span className="border-border/60 bg-muted/45 text-muted-foreground rounded-md border px-1.5 py-0.5 text-[11px] font-medium tracking-[0.08em] uppercase">
              {badge}
            </span>
          ) : null}
        </div>
        <p
          className={cn(
            "text-muted-foreground mt-1 leading-relaxed",
            variant === "default" && "text-[11px]",
            variant === "subtle" && "text-foreground/75 text-[11px]"
          )}
        >
          {description}
        </p>
        {action && actionPlacement === "below" ? (
          <div
            className={cn(
              "flex items-center gap-2",
              variant === "default" && "mt-2.5",
              variant === "subtle" && "mt-2"
            )}
          >
            {action}
          </div>
        ) : null}
      </div>

      {action && actionPlacement === "right" ? (
        <div className="flex shrink-0 flex-col items-end gap-2">
          {dismissButton}
          <div>{action}</div>
        </div>
      ) : null}

      {actionPlacement !== "right" ? dismissButton : null}
    </div>
  );
}
