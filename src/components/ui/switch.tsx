"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, className, disabled, onCheckedChange, ...props }, ref) => {
    return (
      <button
        {...props}
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        data-state={checked ? "checked" : "unchecked"}
        className={cn(
          "focus-visible:ring-ring inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-40",
          checked ? "bg-primary justify-end" : "bg-muted justify-start",
          className
        )}
        onClick={() => {
          if (disabled) return;
          onCheckedChange?.(!checked);
        }}
      >
        <span
          className={cn(
            "bg-background pointer-events-none mx-0.5 block h-4 w-4 rounded-full shadow-sm transition-transform"
          )}
        />
      </button>
    );
  }
);

Switch.displayName = "Switch";
