"use client";

import { Ruler } from "lucide-react";
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
  const { unitSystem, setUnitSystem } = useMeasurementUnitSystem();
  const nextUnitSystem = unitSystem === "metric" ? "imperial" : "metric";
  const label = unitSystem === "metric" ? "Metric" : "Imperial";
  const nextLabel = nextUnitSystem === "metric" ? "Metric" : "Imperial";

  const button = (
    <button
      type="button"
      onClick={() => setUnitSystem(nextUnitSystem)}
      aria-label={`Measurement preset: ${label}. Switch to ${nextLabel}.`}
      title={`Measurement preset: ${label}. Switch to ${nextLabel}.`}
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
        <span className="block font-medium">Measurement preset: {label}</span>
        <span className="mt-1 block opacity-80">
          Switch displayed distances and compatible inputs.
        </span>
      </TooltipContent>
    </Tooltip>
  );
}
