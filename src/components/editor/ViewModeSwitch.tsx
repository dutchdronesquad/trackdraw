"use client";

import { Box, Columns2, Square } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId } from "react";
import { cn } from "@/lib/utils";

type ViewMode = "2d" | "3d";

export interface SplitViewOption {
  active: boolean;
  available: boolean;
  onSelect: () => void;
}

type ViewModeSwitchProps = {
  value: ViewMode;
  onValueChange: (value: ViewMode) => void;
  size?: "mobile" | "desktop" | "drawer";
  className?: string;
  splitView?: SplitViewOption;
};

export default function ViewModeSwitch({
  value,
  onValueChange,
  size = "desktop",
  className,
  splitView,
}: ViewModeSwitchProps) {
  const t = useTranslations("editor.viewModeSwitch");
  const spaceHintId = useId();
  const options: Array<{
    value: ViewMode | "split";
    label: string;
    drawerLabel: string;
    Icon: typeof Square;
  }> = [
    {
      value: "2d",
      label: t("canvas2dShort"),
      drawerLabel: t("canvas2dDrawer"),
      Icon: Square,
    },
    {
      value: "3d",
      label: t("preview3dShort"),
      drawerLabel: t("preview3dDrawer"),
      Icon: Box,
    },
  ];
  if (splitView) {
    options.push({
      value: "split",
      label: t("sideBySide"),
      drawerLabel: t("sideBySide"),
      Icon: Columns2,
    });
  }
  const isMobile = size === "mobile";
  const isDrawer = size === "drawer";
  const outerRadiusClassName = isDrawer
    ? "rounded-lg"
    : isMobile
      ? "rounded-md"
      : "rounded-md";
  const innerRadiusClassName = isDrawer
    ? "rounded-md"
    : isMobile
      ? "rounded-sm"
      : "rounded-sm";

  return (
    <div
      role="group"
      aria-label={t("ariaLabel")}
      className={cn(
        "border-border/70 bg-sidebar/90 relative grid grid-cols-2 items-center overflow-hidden border p-0.5 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur",
        isDrawer
          ? "h-11 w-full text-xs"
          : isMobile
            ? "h-8 w-[6.125rem] text-[11px]"
            : "h-7 w-[6.25rem] text-[11px]",
        splitView && "w-auto grid-cols-[3rem_3rem_auto]",
        outerRadiusClassName,
        className
      )}
    >
      {!splitView && (
        <span
          aria-hidden="true"
          className={cn(
            "border-brand-primary/60 bg-brand-primary/38 absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] border shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] transition-transform duration-200 ease-out",
            innerRadiusClassName,
            value === "3d" && "translate-x-full"
          )}
        />
      )}
      {splitView && !splitView.available && (
        <span id={spaceHintId} hidden>
          {t("splitNeedsSpace")}
        </span>
      )}
      {options.map((option) => {
        const optionValue = option.value;
        const active = splitView?.active
          ? optionValue === "split"
          : value === optionValue;
        const Icon = option.Icon;
        const unavailable = optionValue === "split" && !splitView?.available;
        const unavailableHint = unavailable ? t("splitNeedsSpace") : undefined;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            aria-disabled={unavailable || undefined}
            aria-describedby={unavailable ? spaceHintId : undefined}
            title={unavailableHint}
            onClick={() => {
              if (optionValue !== "split") {
                onValueChange(optionValue);
              } else if (splitView?.available) {
                splitView.onSelect();
              }
            }}
            className={cn(
              "focus-visible:ring-ring/30 relative z-10 grid h-full cursor-pointer items-center justify-center gap-0.5 leading-none font-semibold transition-colors outline-none focus-visible:ring-2",
              innerRadiusClassName,
              optionValue === "split"
                ? "grid-cols-[0.875rem_auto] gap-1 px-2 whitespace-nowrap"
                : isDrawer
                  ? "grid-cols-[1rem_auto] px-3.5"
                  : "grid-cols-[0.875rem_1.125rem] px-1.5",
              splitView &&
                active &&
                "border-brand-primary/60 bg-brand-primary/38 border",
              unavailable && "cursor-default opacity-50",
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
