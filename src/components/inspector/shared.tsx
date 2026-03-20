"use client";

import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";

export const fmt = (value: number) => Number(value.toFixed(2));

export function PanelHeader({
  title,
  actions,
}: {
  title: string;
  actions?: ReactNode;
}) {
  return (
    <div className="border-border/60 bg-card/95 supports-[backdrop-filter]:bg-card/90 sticky top-0 z-10 flex h-11 shrink-0 items-center justify-between border-b px-4 backdrop-blur lg:h-9 lg:px-3">
      <span className="text-foreground/70 text-[11px] font-medium tracking-[0.12em] uppercase lg:text-[10px]">
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
      <span className="text-muted-foreground/70 w-[78px] shrink-0 text-[10px] tracking-[0.04em] lg:w-[88px]">
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
      <p className="text-muted-foreground/50 mb-2 text-[10px] font-medium tracking-[0.14em] uppercase">
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
  return (
    <Input
      type="number"
      step={step}
      min={min}
      value={value}
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
