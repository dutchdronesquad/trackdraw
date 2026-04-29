"use client";

import { useEffect, useId, useState } from "react";
import type { ReactNode } from "react";
import { useHistorySession } from "@/hooks/useHistorySession";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useSessionActions } from "@/store/actions";
import { ChevronDown } from "lucide-react";

export const fmt = (value: number) => Number(value.toFixed(2));

export function useInspectorInputBatch() {
  const { beginInteraction, endInteraction, pauseHistory, resumeHistory } =
    useSessionActions();
  const { startSession, finishSession, cancelSession } = useHistorySession({
    beginInteraction,
    endInteraction,
    pauseHistory,
    resumeHistory,
  });

  const startBatch = () => {
    startSession();
  };

  const finishBatch = () => {
    finishSession();
  };

  useEffect(
    () => () => {
      cancelSession();
    },
    [cancelSession]
  );

  return {
    startBatch,
    finishBatch,
  };
}

export function PanelHeader({
  title,
  actions,
}: {
  title: string;
  actions?: ReactNode;
}) {
  return (
    <div className="border-border/60 bg-card/95 supports-backdrop-filter:bg-card/90 sticky top-0 z-10 flex h-11 shrink-0 items-center justify-between border-b px-4 backdrop-blur lg:h-9 lg:px-3">
      <span className="text-foreground/80 text-xs font-medium tracking-widest uppercase lg:text-[11px]">
        {title}
      </span>
      {actions && <div className="flex gap-1 lg:gap-0.5">{actions}</div>}
    </div>
  );
}

export function Row({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-9 items-center gap-3 py-1 lg:min-h-8 lg:py-0.5">
      <span className="text-muted-foreground/85 w-19.5 shrink-0 text-[11px] tracking-[0.02em] lg:w-22">
        {label}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function Section({
  title,
  children,
  className,
  collapsible = true,
  defaultOpen = true,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const contentId = useId();
  const [open, setOpen] = useState(defaultOpen);
  const isOpen = !collapsible || open;

  useEffect(() => {
    setOpen(defaultOpen);
  }, [defaultOpen]);

  return (
    <div
      className={cn(
        "border-border/20 border-t pt-3 first:border-t-0 first:pt-0",
        isOpen && className
      )}
    >
      {collapsible ? (
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={isOpen}
          aria-controls={contentId}
          className="text-muted-foreground/75 hover:text-foreground focus-visible:ring-ring/40 mb-2 flex min-h-6 w-full shrink-0 items-center justify-between gap-3 rounded-sm text-left text-[11px] font-medium tracking-[0.12em] uppercase transition-colors focus-visible:ring-2 focus-visible:outline-hidden"
        >
          <span>{title}</span>
          <ChevronDown
            className={cn(
              "size-3.5 shrink-0 transition-transform",
              !isOpen && "-rotate-90"
            )}
          />
        </button>
      ) : (
        <p className="text-muted-foreground/75 mb-2 shrink-0 text-[11px] font-medium tracking-[0.12em] uppercase">
          {title}
        </p>
      )}
      <div
        id={contentId}
        hidden={!isOpen}
        className={cn(
          "space-y-1 lg:space-y-0.5",
          isOpen && className && "flex min-h-0 flex-1 flex-col"
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function Num({
  value,
  onChange,
  step = 0.1,
  min,
}: {
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
}) {
  const { startBatch, finishBatch } = useInspectorInputBatch();

  return (
    <Input
      type="number"
      step={step}
      min={min}
      value={value}
      onFocus={startBatch}
      onBlur={finishBatch}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }
      }}
      onChange={(event) => onChange(+event.target.value)}
      className="bg-background border-border/50 focus-visible:border-border/80 h-8 rounded-md px-2.5 font-mono text-[11px] shadow-none focus-visible:ring-0 lg:h-7 lg:px-2"
    />
  );
}

export function IconBtn({
  onClick,
  title,
  children,
  danger,
  label,
}: {
  onClick: () => void;
  title: string;
  children: ReactNode;
  danger?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md border px-2.5 text-[11px] font-medium transition-colors lg:h-7 lg:px-2 ${
        danger
          ? "border-red-500/20 bg-red-500/6 text-red-500 hover:bg-red-500/12"
          : "border-border/50 bg-background text-foreground/82 hover:bg-muted/35"
      }`}
    >
      {children}
      {label ? <span>{label}</span> : null}
    </button>
  );
}
