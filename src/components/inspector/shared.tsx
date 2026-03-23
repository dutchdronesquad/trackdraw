"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { useEditor } from "@/store/editor";

export const fmt = (value: number) => Number(value.toFixed(2));

export function useInspectorInputBatch() {
  const beginInteraction = useEditor((state) => state.beginInteraction);
  const endInteraction = useEditor((state) => state.endInteraction);
  const pauseHistory = useEditor((state) => state.pauseHistory);
  const resumeHistory = useEditor((state) => state.resumeHistory);
  const batchActiveRef = useRef(false);

  const startBatch = () => {
    if (batchActiveRef.current) return;
    batchActiveRef.current = true;
    beginInteraction();
    pauseHistory();
  };

  const finishBatch = () => {
    if (!batchActiveRef.current) return;
    batchActiveRef.current = false;
    resumeHistory();
    endInteraction();
  };

  useEffect(
    () => () => {
      if (!batchActiveRef.current) return;
      batchActiveRef.current = false;
      resumeHistory();
      endInteraction();
    },
    [endInteraction, resumeHistory]
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
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="border-border/20 border-t pt-3 first:border-t-0 first:pt-0">
      <p className="text-muted-foreground/75 mb-2 text-[11px] font-medium tracking-[0.12em] uppercase">
        {title}
      </p>
      <div className="space-y-1 lg:space-y-0.5">{children}</div>
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
}: {
  onClick: () => void;
  title: string;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex size-7 items-center justify-center rounded-md transition-colors lg:size-6 lg:rounded ${
        danger
          ? "text-muted-foreground hover:text-foreground hover:bg-muted/20"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
      }`}
    >
      {children}
    </button>
  );
}
