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
    <div className="border-border flex h-9 shrink-0 items-center justify-between border-b px-3">
      <span className="text-foreground/70 text-[11px] font-medium">
        {title}
      </span>
      {actions && <div className="flex gap-0.5">{actions}</div>}
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
    <div className="flex h-8 items-center gap-2">
      <span className="text-muted-foreground/80 w-[88px] shrink-0 text-[11px]">
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
    <div>
      <p className="text-muted-foreground/60 mb-2 text-[10px] font-medium tracking-[0.1em] uppercase">
        {title}
      </p>
      <div className="space-y-0.5">{children}</div>
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
      className="bg-muted/50 border-border/70 focus-visible:border-primary/50 focus-visible:ring-primary/20 h-7 rounded-md px-2 font-mono text-[11px] focus-visible:ring-1"
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
      className={`flex size-6 items-center justify-center rounded transition-colors ${
        danger
          ? "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
      }`}
    >
      {children}
    </button>
  );
}
