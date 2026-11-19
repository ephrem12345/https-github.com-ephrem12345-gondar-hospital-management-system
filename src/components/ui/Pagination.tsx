"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface PaginationProps {
  /** 1-based current page. */
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  /** Optional context line, e.g. "Showing 1–10 of 48". */
  context?: string;
  className?: string;
}

function pageWindow(page: number, pageCount: number): number[] {
  const pages: number[] = [];
  const start = Math.max(1, Math.min(page - 2, pageCount - 4));
  const end = Math.min(pageCount, start + 4);
  for (let i = start; i <= end; i++) pages.push(i);
  return pages;
}

export function Pagination({
  page,
  pageCount,
  onPageChange,
  context,
  className,
}: PaginationProps) {
  if (pageCount <= 1) {
    return context ? (
      <div className={cn("text-sm text-slate-500 dark:text-slate-400", className)}>
        {context}
      </div>
    ) : null;
  }

  const pages = pageWindow(page, pageCount);

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        "flex flex-wrap items-center justify-between gap-3",
        className,
      )}
    >
      <div className="order-2 text-sm text-slate-500 dark:text-slate-400 sm:order-1">
        {context}
      </div>
      <div className="order-1 flex items-center gap-1 sm:order-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(
              "h-8 min-w-8 rounded-lg px-2 text-sm font-medium transition-colors",
              p === page
                ? "bg-primary-600 text-white"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
            )}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          aria-label="Next page"
          className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </nav>
  );
}
