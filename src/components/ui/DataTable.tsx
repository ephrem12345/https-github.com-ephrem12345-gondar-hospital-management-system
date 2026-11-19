"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { Pagination } from "./Pagination";
import { TableSkeleton } from "./LoadingState";
import { cn } from "@/lib/utils/cn";

export interface Column<T> {
  key: string;
  header: string;
  /** Accessor used for sorting; defaults to reading the key from the row. */
  sortValue?: (row: T) => string | number;
  align?: "left" | "right" | "center";
  widthClass?: string;
  render?: (row: T) => ReactNode;
  hideOnMobile?: boolean;
  hideOnTablet?: boolean;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  /** Enables client-side pagination. Omit to render all rows. */
  pageSize?: number;
  loading?: boolean;
  emptyState?: { icon?: LucideIcon; title: string; description?: string };
  onRowClick?: (row: T) => void;
  /** Toolbar row rendered above the table (search, filters, actions). */
  toolbar?: ReactNode;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  pageSize,
  loading = false,
  emptyState,
  onRowClick,
  toolbar,
  className,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    const column = columns.find((col) => col.key === sortKey);
    if (!column) return data;
    const accessor =
      column.sortValue ?? ((row: T) => (row as Record<string, unknown>)[column.key]);
    const dirFactor = sortDir === "asc" ? 1 : -1;
    return [...data].sort((a, b) => {
      const av = accessor(a);
      const bv = accessor(b);
      if (av === bv) return 0;
      if (av === undefined || av === null) return 1;
      if (bv === undefined || bv === null) return -1;
      if (typeof av === "number" && typeof bv === "number")
        return (av - bv) * dirFactor;
      return String(av).localeCompare(String(bv)) * dirFactor;
    });
  }, [data, columns, sortKey, sortDir]);

  const pageCount = pageSize ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1;
  const safePage = Math.min(page, pageCount);
  const visible = pageSize
    ? sorted.slice((safePage - 1) * pageSize, safePage * pageSize)
    : sorted;

  const context = pageSize
    ? `Showing ${(safePage - 1) * pageSize + 1}–${Math.min(
        safePage * pageSize,
        sorted.length,
      )} of ${sorted.length}`
    : undefined;

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return (
    <div className={cn("overflow-hidden", className)}>
      {toolbar ? (
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          {toolbar}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
              {columns.map((column) => {
                const isSorted = sortKey === column.key;
                const sortable =
                  column.sortValue !== undefined || column.render === undefined;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    className={cn(
                      "whitespace-nowrap px-4 py-3 first:pl-5 last:pr-5",
                      column.align === "right" && "text-right",
                      column.align === "center" && "text-center",
                      column.hideOnMobile && "hidden md:table-cell",
                      column.hideOnTablet && "hidden lg:table-cell",
                      sortable && "cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-200",
                    )}
                    onClick={sortable ? () => toggleSort(column.key) : undefined}
                    aria-sort={
                      isSorted
                        ? sortDir === "asc"
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                  >
                    <span
                      className={cn(
                        "inline-flex items-center gap-1",
                        column.align === "right" && "flex-row-reverse",
                      )}
                    >
                      {column.header}
                      {sortable ? (
                        isSorted ? (
                          sortDir === "asc" ? (
                            <ArrowUp className="h-3 w-3" aria-hidden />
                          ) : (
                            <ArrowDown className="h-3 w-3" aria-hidden />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40" aria-hidden />
                        )
                      ) : null}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          {loading ? (
            <TableSkeleton rows={pageSize ?? 5} columns={columns.length} />
          ) : (
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-2">
                    <EmptyState
                      icon={emptyState?.icon}
                      title={emptyState?.title ?? "No records found"}
                      description={emptyState?.description}
                    />
                  </td>
                </tr>
              ) : (
                visible.map((row) => (
                  <tr
                    key={keyExtractor(row)}
                    className={cn(
                      "border-b border-slate-100 transition-colors last:border-0 dark:border-slate-800",
                      onRowClick &&
                        "cursor-pointer hover:bg-light-blue/60 dark:hover:bg-slate-800/60",
                    )}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                  >
                    {columns.map((column) => {
                      const content = column.render
                        ? column.render(row)
                        : stringOf((row as Record<string, unknown>)[column.key]);
                      return (
                        <td
                          key={column.key}
                          className={cn(
                            "whitespace-nowrap px-4 py-3.5 text-slate-600 first:pl-5 last:pr-5 dark:text-slate-300",
                            column.align === "right" && "text-right",
                            column.align === "center" && "text-center",
                            column.hideOnMobile && "hidden md:table-cell",
                            column.hideOnTablet && "hidden lg:table-cell",
                          )}
                        >
                          {content}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          )}
        </table>
      </div>

      {pageCount > 1 || context ? (
        <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-5">
          <Pagination
            page={safePage}
            pageCount={pageCount}
            onPageChange={setPage}
            context={context}
          />
        </div>
      ) : null}
    </div>
  );
}

function stringOf(value: unknown): ReactNode {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}
