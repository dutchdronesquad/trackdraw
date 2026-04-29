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
}: DataTableProps<TData>) {
  return (
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
            <TableRow key={row.id}>
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
  );
}
