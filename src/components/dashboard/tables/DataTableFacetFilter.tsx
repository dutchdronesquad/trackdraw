"use client";

import { useMemo, useState } from "react";
import { CheckIcon, PlusCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type DataTableFacetOption<TValue extends string = string> = {
  label: string;
  value: TValue;
  count?: number;
};

type DataTableFacetFilterProps<TValue extends string = string> = {
  title: string;
  selected: TValue[];
  options: DataTableFacetOption<TValue>[];
  onChange: (selected: TValue[]) => void;
  onClear?: () => void;
};

export default function DataTableFacetFilter<TValue extends string>({
  title,
  selected,
  options,
  onChange,
  onClear,
}: DataTableFacetFilterProps<TValue>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedLabels = selected.map(
    (value) => options.find((option) => option.value === value)?.label ?? value
  );
  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;

    return options.filter((option) =>
      option.label.toLowerCase().includes(normalizedQuery)
    );
  }, [options, query]);

  const toggleValue = (value: TValue) => {
    const nextSelected: TValue[] = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value];

    onChange(nextSelected);
  };

  const clearSelection = () => {
    onChange([]);
    onClear?.();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          buttonVariants({ variant: "outline", size: "lg" }),
          "w-full justify-center border-dashed sm:w-auto sm:justify-start"
        )}
      >
        <PlusCircle className="size-4" />
        <span>{title}</span>
        {selected.length > 0 && (
          <>
            <Separator
              orientation="vertical"
              className="mx-1 h-4 self-center data-vertical:self-center"
            />
            <span className="flex min-w-0 items-center gap-1">
              {selected.length > 2 ? (
                <Badge
                  variant="muted"
                  className="rounded-sm px-1.5 font-medium tracking-normal normal-case"
                >
                  {selected.length} selected
                </Badge>
              ) : (
                selected.map((value, index) => (
                  <Badge
                    key={value}
                    variant="muted"
                    className="max-w-28 truncate rounded-sm px-1.5 font-medium tracking-normal normal-case"
                  >
                    {selectedLabels[index]}
                  </Badge>
                ))
              )}
            </span>
          </>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 gap-0 p-0">
        <div className="border-b p-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Filter ${title.toLowerCase()}...`}
            className="h-8"
          />
        </div>
        <div className="max-h-72 overflow-y-auto p-1">
          {filteredOptions.length === 0 ? (
            <p className="text-muted-foreground px-2 py-6 text-center text-sm">
              No results found.
            </p>
          ) : (
            filteredOptions.map((option) => {
              const isSelected = selected.includes(option.value);

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleValue(option.value)}
                  className="text-foreground hover:bg-muted focus-visible:bg-muted flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors outline-none"
                >
                  <span
                    className={cn(
                      "flex size-4 items-center justify-center rounded-sm border transition-colors",
                      isSelected
                        ? "border-sky-600 bg-sky-600 text-white"
                        : "border-border bg-background text-transparent"
                    )}
                  >
                    <CheckIcon className="size-3" />
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {option.label}
                  </span>
                  {typeof option.count === "number" && (
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {option.count}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
        {selected.length > 0 && (
          <>
            <Separator />
            <div className="p-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-center"
                onClick={clearSelection}
              >
                Clear filters
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
