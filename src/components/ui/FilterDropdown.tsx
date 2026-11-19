"use client";

import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterDropdownProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  options: FilterOption[];
  /** Optional visible label rendered beside the select. */
  label?: string;
  onValueChange?: (value: string) => void;
  wrapperClassName?: string;
}

/** Styled select used for table filters and form selects. */
export const FilterDropdown = forwardRef<HTMLSelectElement, FilterDropdownProps>(
  function FilterDropdown(
    { options, label, onValueChange, className, wrapperClassName, ...props },
    ref,
  ) {
    return (
      <div className={cn("flex items-center gap-2", wrapperClassName)}>
        {label ? (
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {label}
          </span>
        ) : null}
        <div className="relative">
          <select
            ref={ref}
            className={cn(
              "ghms-input h-10 appearance-none pr-8",
              className,
            )}
            onChange={(event) => {
              onValueChange?.(event.target.value);
              props.onChange?.(event);
            }}
            {...props}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
        </div>
      </div>
    );
  },
);
