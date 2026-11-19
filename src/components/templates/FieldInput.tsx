"use client";

import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { FilterDropdown, type FilterOption } from "@/components/ui/FilterDropdown";
import { DatePicker } from "@/components/ui/DatePicker";
import type { FormFieldConfig } from "@/modules/types";

export const textInputClass = "ghms-input";

/** Text/number/email/tel input bound to React Hook Form via register. */
export const TextInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function TextInput(props, ref) {
  return <input ref={ref} className={textInputClass} {...props} />;
});

export const TextArea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function TextArea(props, ref) {
  return <textarea ref={ref} rows={3} className={textInputClass} {...props} />;
});

interface FieldInputProps {
  field: FormFieldConfig;
  /** Spread from RHF register(name). */
  registration: Record<string, unknown>;
  error?: string;
}

/** Renders the right control for a FormFieldConfig inside FormField. */
export function FieldInput({ field, registration }: FieldInputProps) {
  const common = {
    id: field.name,
    placeholder: field.placeholder,
    ...registration,
  };

  switch (field.type) {
    case "select": {
      const options: FilterOption[] =
        field.options?.map((option) => option) ?? [];
      return (
        <FilterDropdown
          options={options}
          aria-label={field.label}
          {...(common as Record<string, unknown>)}
        />
      );
    }
    case "date":
      return <DatePicker aria-label={field.label} {...(common as Record<string, unknown>)} />;
    case "textarea":
      return <TextArea aria-label={field.label} {...(common as Record<string, unknown>)} />;
    case "checkbox":
      return (
        <input
          id={field.name}
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500/40"
          {...registration}
        />
      );
    default:
      return (
        <TextInput
          type={field.type}
          aria-label={field.label}
          {...(common as Record<string, unknown>)}
        />
      );
  }
}
