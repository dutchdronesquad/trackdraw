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
        className={cn("w-full sm:w-90", searchClassName)}
      />
      {children ? (
        <div className="flex flex-col items-center gap-2 sm:ml-auto sm:flex-row sm:items-center">
          {children}
        </div>
      ) : null}
    </div>
  );
}
