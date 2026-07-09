"use client";

import type * as React from "react";
import { Calendar as BaseCalendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

type MetricsRangeCalendarProps = React.ComponentProps<typeof BaseCalendar>;

const metricsRangeClassNames = {
  month_grid: "w-auto border-collapse",
  weekdays: "flex",
  weekday:
    "text-muted-foreground flex size-8 select-none items-center justify-center rounded-md text-[0.8rem] font-normal",
  week: "mt-1 flex w-auto",
  day: "group/day relative size-8 select-none p-0 text-center [&:first-child[data-selected=true]_button]:rounded-l-md [&:last-child[data-selected=true]_button]:rounded-r-md",
  day_button: "size-8 min-w-8",
  today:
    "[&>button]:border [&>button]:border-border/70 [&>button]:bg-transparent [&>button]:text-foreground",
  button_previous: "size-8 select-none p-0",
  button_next: "size-8 select-none p-0",
  month_caption: "flex h-8 w-full items-center justify-center px-8",
} satisfies NonNullable<MetricsRangeCalendarProps["classNames"]>;

export function MetricsRangeCalendar({
  className,
  classNames,
  showOutsideDays = false,
  ...props
}: MetricsRangeCalendarProps) {
  return (
    <BaseCalendar
      showOutsideDays={showOutsideDays}
      className={cn("bg-popover p-3", className)}
      classNames={{
        ...metricsRangeClassNames,
        ...classNames,
        month_grid: cn(
          metricsRangeClassNames.month_grid,
          classNames?.month_grid
        ),
        weekdays: cn(metricsRangeClassNames.weekdays, classNames?.weekdays),
        weekday: cn(metricsRangeClassNames.weekday, classNames?.weekday),
        week: cn(metricsRangeClassNames.week, classNames?.week),
        day: cn(metricsRangeClassNames.day, classNames?.day),
        day_button: cn(
          metricsRangeClassNames.day_button,
          classNames?.day_button
        ),
        today: cn(metricsRangeClassNames.today, classNames?.today),
        button_previous: cn(
          metricsRangeClassNames.button_previous,
          classNames?.button_previous
        ),
        button_next: cn(
          metricsRangeClassNames.button_next,
          classNames?.button_next
        ),
        month_caption: cn(
          metricsRangeClassNames.month_caption,
          classNames?.month_caption
        ),
      }}
      {...props}
    />
  );
}
