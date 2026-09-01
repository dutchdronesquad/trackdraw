"use client";

import { useMemo, useState } from "react";
import { de, enUS, nl, zhCN } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function formatDateKey(date: Date | undefined) {
  if (!date) return "";
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(value: string | undefined) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!match) return undefined;

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return formatDateKey(date) === value ? date : undefined;
}

function initialDateRange(from: string | undefined, to: string | undefined) {
  const parsedFrom = parseDateKey(from);
  const parsedTo = parseDateKey(to);
  return parsedFrom ? { from: parsedFrom, to: parsedTo } : undefined;
}

export default function AuditDateRangeFilter({
  id,
  from,
  to,
  label,
  placeholder,
  clearLabel,
  applyLabel,
  locale,
  onChange,
  className,
}: {
  id: string;
  from: string;
  to: string;
  label: string;
  placeholder: string;
  clearLabel: string;
  applyLabel: string;
  locale: string;
  onChange: (from: string, to: string) => void;
  className?: string;
}) {
  const selectedRange = useMemo(() => initialDateRange(from, to), [from, to]);
  const [open, setOpen] = useState(false);
  const [draftRange, setDraftRange] = useState<DateRange | undefined>(
    selectedRange
  );
  const calendarLocale = locale.startsWith("nl")
    ? nl
    : locale.startsWith("de")
      ? de
      : locale.startsWith("zh")
        ? zhCN
        : enUS;
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    [locale]
  );
  const displayValue =
    selectedRange?.from && selectedRange.to
      ? `${dateFormatter.format(selectedRange.from)} – ${dateFormatter.format(selectedRange.to)}`
      : selectedRange?.from
        ? dateFormatter.format(selectedRange.from)
        : placeholder;

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) setDraftRange(selectedRange);
        setOpen(nextOpen);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          aria-label={`${label}: ${displayValue}`}
          className={cn(
            "bg-background w-full justify-start gap-2 px-3 text-left font-normal shadow-sm",
            !selectedRange?.from && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="size-4 shrink-0" />
          <span className="truncate">{displayValue}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        collisionPadding={16}
        className="w-[calc(100vw-2rem)] max-w-96 overflow-hidden p-0"
      >
        <Calendar
          mode="range"
          selected={draftRange}
          onSelect={setDraftRange}
          defaultMonth={draftRange?.from}
          numberOfMonths={1}
          locale={calendarLocale}
          className="w-full p-3 [--cell-size:clamp(2rem,10vw,2.5rem)] sm:p-4"
          classNames={{
            root: "w-full",
            months: "relative flex w-full flex-col",
            month: "flex w-full flex-col gap-3",
            month_grid: "w-full table-fixed border-collapse",
            weekdays: "grid grid-cols-7",
            weekday:
              "text-muted-foreground flex h-[var(--cell-size)] items-center justify-center text-xs font-normal",
            week: "mt-1 grid grid-cols-7",
            day: "group/day relative size-[var(--cell-size)] p-0 text-center",
            day_button: "size-[var(--cell-size)] min-w-[var(--cell-size)]",
            month_caption: "flex h-10 w-full items-center justify-center px-10",
            button_previous: "size-10 p-0",
            button_next: "size-10 p-0",
          }}
          autoFocus
        />
        <div className="border-border flex items-center justify-between border-t p-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!draftRange?.from}
            onClick={() => {
              setDraftRange(undefined);
              onChange("", "");
              setOpen(false);
            }}
          >
            {clearLabel}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!draftRange?.from || !draftRange.to}
            onClick={() => {
              onChange(
                formatDateKey(draftRange?.from),
                formatDateKey(draftRange?.to)
              );
              setOpen(false);
            }}
          >
            {applyLabel}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
