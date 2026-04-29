"use client";

import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type DataTableToolbarProps = {
  searchValue: string;
  searchPlaceholder: string;
  onSearchChange: (value: string) => void;
  children?: ReactNode;
  className?: string;
  searchClassName?: string;
};

export default function DataTableToolbar({
  searchValue,
  searchPlaceholder,
  onSearchChange,
  children,
  className,
  searchClassName,
}: DataTableToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:items-center",
        className
      )}
    >
      <Input
        value={searchValue}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={searchPlaceholder}
        className={cn(
          "focus-visible:border-border/80 focus-visible:ring-ring/20 h-9 w-full rounded-lg shadow-none sm:w-90",
          searchClassName
        )}
      />
      {children ? (
        <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto sm:justify-end">
          {children}
        </div>
      ) : null}
    </div>
  );
}
