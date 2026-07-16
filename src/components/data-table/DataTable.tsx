"use client";

import {
  flexRender,
  type Row,
  type Table as ReactTable,
} from "@tanstack/react-table";
import type { ComponentProps, ReactNode } from "react";
import {
  Table as UiTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  dataTableCellClassName,
  dataTableClassName,
  dataTableHeadClassName,
  dataTableWrapperClassName,
  getDataTableColumnClassName,
} from "./DataTableLayout";
import DataTablePagination from "./DataTablePagination";

type DataTableFrameProps = ComponentProps<"div"> & {
  minWidthClassName?: string;
  tableClassName?: string;
  tableProps?: Omit<ComponentProps<typeof UiTable>, "className">;
};

type DataTableProps<TData> = {
  table: ReactTable<TData>;
  rows?: Row<TData>[];
  emptyMessage: ReactNode;
  columnsLength?: number;
  minWidthClassName?: string;
  wrapperClassName?: string;
  tableClassName?: string;
  emptyClassName?: string;
  onRowClick?: (row: Row<TData>) => void;
  getRowAriaLabel?: (row: Row<TData>) => string;
  pagination?: {
    summary?: ReactNode;
    pageSizeOptions?: number[];
  };
};

type DataTableEmptyStateProps = ComponentProps<typeof TableCell> & {
  message: ReactNode;
  colSpan: number;
};

export function DataTableFrame({
  children,
  className,
  minWidthClassName,
  tableClassName,
  tableProps,
  ...props
}: DataTableFrameProps) {
  return (
    <div className={cn(dataTableWrapperClassName, className)} {...props}>
      <UiTable
        className={cn(dataTableClassName, minWidthClassName, tableClassName)}
        {...tableProps}
      >
        {children}
      </UiTable>
    </div>
  );
}

export function DataTableHeaderCell({
  className,
  ...props
}: ComponentProps<typeof TableHead>) {
  return (
    <TableHead className={cn(dataTableHeadClassName, className)} {...props} />
  );
}

export function DataTableBodyCell({
  className,
  ...props
}: ComponentProps<typeof TableCell>) {
  return (
    <TableCell className={cn(dataTableCellClassName, className)} {...props} />
  );
}

export function DataTableEmptyState({
  message,
  className,
  ...props
}: DataTableEmptyStateProps) {
  return (
    <TableRow>
      <TableCell
        className={cn(
          "text-muted-foreground h-24 text-center text-sm",
          className
        )}
        {...props}
      >
        {message}
      </TableCell>
    </TableRow>
  );
}

export default function DataTable<TData>({
  table,
  rows = table.getRowModel().rows,
  emptyMessage,
  columnsLength = table.getAllLeafColumns().length,
  minWidthClassName,
  wrapperClassName,
  tableClassName,
  emptyClassName,
  onRowClick,
  getRowAriaLabel,
  pagination,
}: DataTableProps<TData>) {
  return (
    <div className="space-y-3">
      <DataTableFrame
        className={wrapperClassName}
        minWidthClassName={minWidthClassName}
        tableClassName={tableClassName}
      >
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <DataTableHeaderCell
                  key={header.id}
                  className={getDataTableColumnClassName(
                    header.column.columnDef.meta,
                    "header"
                  )}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </DataTableHeaderCell>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.length ? (
            rows.map((row) => (
              <TableRow
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onRowClick(row);
                        }
                      }
                    : undefined
                }
                tabIndex={onRowClick ? 0 : undefined}
                className={onRowClick ? "cursor-pointer" : undefined}
                aria-label={getRowAriaLabel ? getRowAriaLabel(row) : undefined}
              >
                {row.getVisibleCells().map((cell) => (
                  <DataTableBodyCell
                    key={cell.id}
                    className={getDataTableColumnClassName(
                      cell.column.columnDef.meta,
                      "cell"
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </DataTableBodyCell>
                ))}
              </TableRow>
            ))
          ) : (
            <DataTableEmptyState
              colSpan={columnsLength}
              message={emptyMessage}
              className={emptyClassName}
            />
          )}
        </TableBody>
      </DataTableFrame>

      {pagination ? (
        <div
          className={cn(
            "flex flex-col gap-3 sm:flex-row sm:items-center",
            pagination.summary ? "sm:justify-between" : "sm:justify-end"
          )}
        >
          {pagination.summary}
          <DataTablePagination
            table={table}
            pageSizeOptions={pagination.pageSizeOptions}
          />
        </div>
      ) : null}
    </div>
  );
}
