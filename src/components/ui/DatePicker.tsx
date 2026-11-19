"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface DatePickerProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  onValueChange?: (value: string) => void;
}

/** Native date input styled consistently with the other form controls. */
export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  function DatePicker({ className, onValueChange, ...props }, ref) {
    return (
      <div className="relative">
        <input
          ref={ref}
          type="date"
          className={cn("ghms-input pr-9", className)}
          onChange={(event) => {
            onValueChange?.(event.target.value);
            props.onChange?.(event);
          }}
          {...props}
        />
        <CalendarDays
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
      </div>
    );
  },
);
