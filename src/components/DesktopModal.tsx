"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DesktopModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Max-width class for the panel, defaults to "max-w-sm". */
  maxWidth?: string;
}

/**
 * Desktop overlay modal that matches the style used by ShareDialog and
 * ProjectManagerDialog: backdrop blur, rounded card panel with close button.
 *
 * Use together with MobileDrawer for a fully responsive dialog.
 */
export function DesktopModal({
  open,
  onOpenChange,
  title,
  subtitle,
  children,
  maxWidth = "max-w-sm",
}: DesktopModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/10 px-5 backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
    >
      <div
        className={cn(
          "border-border/50 bg-card/97 pointer-events-auto w-full overflow-hidden rounded-3xl border p-6 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur",
          maxWidth
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-foreground text-[1rem] font-semibold tracking-[-0.01em]">
              {title}
            </p>
            {subtitle && (
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground/75 hover:text-foreground hover:bg-muted cursor-pointer rounded-full p-1.5 transition-colors"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
