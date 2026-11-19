"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export interface FormFieldProps {
  /** Visible label above the control. */
  label: string;
  htmlFor?: string;
  /** Inline guidance under the label. */
  hint?: string;
  /** Validation message (from Zod/RHF) rendered in the error style. */
  error?: string;
  required?: boolean;
  /** The input control: Input, DatePicker, FilterDropdown, custom control… */
  children: ReactNode;
  className?: string;
}

/**
 * Layout wrapper for a single form control: label, hint, control, error.
 * Pair with `ghms-input`-styled controls and React Hook Form's register.
 */
export function FormField({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("w-full", className)}>
      <label htmlFor={htmlFor} className="ghms-label">
        {label}
        {required ? (
          <span className="ml-0.5 text-danger" aria-hidden>
            *
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}
