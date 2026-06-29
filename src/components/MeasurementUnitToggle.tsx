"use client";

import { Ruler } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/AppTooltip";
import { useMeasurementUnitSystem } from "@/hooks/useMeasurementUnitSystem";
import { cn } from "@/lib/utils";

export function MeasurementUnitToggle({
  compact = false,
  className,
  tooltip = true,
}: {
  compact?: boolean;
  className?: string;
  tooltip?: boolean;
}) {
  const t = useTranslations("common.measurementUnit");
  const { unitSystem, setUnitSystem } = useMeasurementUnitSystem();
  const nextUnitSystem = unitSystem === "metric" ? "imperial" : "metric";
  const label = unitSystem === "metric" ? t("metric") : t("imperial");
  const nextLabel = nextUnitSystem === "metric" ? t("metric") : t("imperial");
  const actionLabel = t("presetAriaLabel", {
    current: label,
    next: nextLabel,
  });

  const button = (
    <button
      type="button"
      onClick={() => setUnitSystem(nextUnitSystem)}
      aria-label={actionLabel}
      title={actionLabel}
      className={cn(
        "text-muted-foreground hover:bg-muted hover:text-foreground inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs transition-colors lg:h-7 lg:px-2",
        className
      )}
    >
      <Ruler className="size-3.5" />
      <span className="font-mono">{compact ? label.slice(0, 3) : label}</span>
    </button>
  );

  if (!tooltip) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>
        <span className="block font-medium">
          {t("presetLabel", { current: label })}
        </span>
        <span className="mt-1 block opacity-80">{t("description")}</span>
      </TooltipContent>
    </Tooltip>
  );
}
