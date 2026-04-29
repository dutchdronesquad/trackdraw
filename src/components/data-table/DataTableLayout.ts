import { cn } from "@/lib/utils";

export type DataTableColumnMeta = {
  className?: string;
  headerClassName?: string;
  cellClassName?: string;
};

export const dataTableWrapperClassName =
  "overflow-hidden rounded-lg border bg-background";

export const dataTableClassName = "min-w-[760px] table-fixed";

export const dataTableHeadClassName =
  "h-10 px-3 py-2 align-middle text-xs font-medium";

export const dataTableCellClassName = "px-3 py-2.5 align-middle";

export const dataTableSortButtonClassName =
  "text-foreground hover:bg-muted hover:text-foreground -ml-2 h-8 cursor-pointer rounded-md px-2 text-xs font-medium shadow-none";

export function getDataTableColumnClassName(
  meta: unknown,
  slot: "header" | "cell"
) {
  const columnMeta = meta as DataTableColumnMeta | undefined;

  return cn(
    columnMeta?.className,
    slot === "header" ? columnMeta?.headerClassName : columnMeta?.cellClassName
  );
}
