"use client";

import { Box, Square } from "lucide-react";
import { cn } from "@/lib/utils";

type ViewMode = "2d" | "3d";

type ViewModeSwitchProps = {
  value: ViewMode;
  onValueChange: (value: ViewMode) => void;
  size?: "mobile" | "desktop" | "drawer";
  className?: string;
};

const options: Array<{
  value: ViewMode;
  label: string;
  drawerLabel: string;
  Icon: typeof Square;
}> = [
  { value: "2d", label: "2D", drawerLabel: "2D Canvas", Icon: Square },
  { value: "3d", label: "3D", drawerLabel: "3D Preview", Icon: Box },
];

export default function ViewModeSwitch({
  value,
  onValueChange,
  size = "desktop",
  className,
}: ViewModeSwitchProps) {
  const isMobile = size === "mobile";
  const isDrawer = size === "drawer";
  const outerRadiusClassName = isDrawer
    ? "rounded-lg"
    : isMobile
      ? "rounded-lg"
      : "rounded-md";
  const innerRadiusClassName = isDrawer
    ? "rounded-md"
    : isMobile
      ? "rounded-md"
      : "rounded-sm";

  return (
    <div
      role="group"
      aria-label="View mode"
      className={cn(
        "border-border/70 bg-sidebar/90 relative grid grid-cols-2 items-center overflow-hidden border p-0.5 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur",
        isDrawer
          ? "h-11 w-full text-xs"
          : isMobile
            ? "h-8 w-[6.125rem] text-[11px]"
            : "h-7 w-[6.25rem] text-[11px]",
        outerRadiusClassName,
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "border-brand-primary/60 bg-brand-primary/38 absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] border shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] transition-transform duration-200 ease-out",
          innerRadiusClassName,
          value === "3d" && "translate-x-full"
        )}
      />
      {options.map((option) => {
        const active = value === option.value;
        const Icon = option.Icon;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onValueChange(option.value)}
            className={cn(
              "focus-visible:ring-ring/30 relative z-10 grid h-full cursor-pointer items-center justify-center gap-0.5 leading-none font-semibold transition-colors outline-none focus-visible:ring-2",
              innerRadiusClassName,
              isDrawer
                ? "grid-cols-[1rem_auto] px-3.5"
                : "grid-cols-[0.875rem_1.125rem] px-1.5",
              active
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="flex size-3.5 items-center justify-center">
              <Icon
                strokeWidth={2.1}
                className={cn("size-3.5", active ? "opacity-95" : "opacity-65")}
              />
            </span>
            <span className="block text-center tabular-nums">
              {isDrawer ? option.drawerLabel : option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
