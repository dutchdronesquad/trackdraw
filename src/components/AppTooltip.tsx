"use client";

import * as React from "react";
import {
  Tooltip,
  TooltipContent as UiTooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export const appTooltipContentClassName =
  "border-neutral-950 bg-neutral-950 text-neutral-50 shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-50";

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof UiTooltipContent>,
  React.ComponentPropsWithoutRef<typeof UiTooltipContent>
>(({ className, ...props }, ref) => (
  <UiTooltipContent
    ref={ref}
    className={cn(appTooltipContentClassName, className)}
    {...props}
  />
));
TooltipContent.displayName = UiTooltipContent.displayName;

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
