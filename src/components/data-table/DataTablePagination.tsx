"use client";

import type { Table } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DataTablePaginationProps<TData> = {
  table: Table<TData>;
  pageSizeOptions?: number[];
};

export default function DataTablePagination<TData>({
  table,
  pageSizeOptions = [10, 25, 50],
}: DataTablePaginationProps<TData>) {
  const t = useTranslations("common.dataTable");
  const pageCount = Math.max(table.getPageCount(), 1);
  const pageIndex = Math.min(
    table.getState().pagination.pageIndex,
    pageCount - 1
  );

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-xs">
          {t("rowsPerPage")}
        </span>
        <Select
          value={`${table.getState().pagination.pageSize}`}
          onValueChange={(value) => table.setPageSize(Number(value))}
        >
          <SelectTrigger
            className="h-8 w-20 text-xs"
            aria-label={t("rowsPerPage")}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {pageSizeOptions.map((pageSize) => (
              <SelectItem key={pageSize} value={`${pageSize}`}>
                {pageSize}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <span className="min-w-24 text-center text-xs tabular-nums">
        {t("page", { current: pageIndex + 1, total: pageCount })}
      </span>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          aria-label={t("previousPage")}
        >
          <ChevronLeft />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          aria-label={t("nextPage")}
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
