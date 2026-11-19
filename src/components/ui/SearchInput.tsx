"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface SearchInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Controlled value; enables the clear button. */
  value?: string;
  onClear?: () => void;
  onValueChange?: (value: string) => void;
  wrapperClassName?: string;
}

/** Controlled text search with a leading icon and clear action. */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  function SearchInput(
    { value, onClear, onValueChange, className, wrapperClassName, ...props },
    ref,
  ) {
    const controlled = value !== undefined;
    return (
      <div className={cn("relative w-full", wrapperClassName)}>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(event) => {
            if (!controlled) return;
            onValueChange?.(event.target.value);
            props.onChange?.(event);
          }}
          className={cn("ghms-input pl-9 pr-9", className)}
          {...props}
        />
        {value ? (
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>
    );
  },
);
