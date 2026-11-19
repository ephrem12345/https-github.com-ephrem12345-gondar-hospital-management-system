import type { LucideIcon } from "lucide-react";
import type { ZodType } from "zod";
import type { FilterOption, StatusVariant } from "@/types";
import type { StatCardProps } from "@/components/ui/StatCard";
import type { Column } from "@/components/ui/DataTable";

/** Screen kinds rendered by the module catch-all route. */
export type ModuleScreen =
  | { kind: "list"; screen: ListScreen }
  | { kind: "form"; screen: FormScreen }
  | { kind: "board"; screen: BoardScreen }
  | { kind: "grid"; screen: GridScreen }
  | { kind: "analytics"; screen: AnalyticsScreen }
  | { kind: "settings"; screen: SettingsScreen }
  | { kind: "custom"; screen: CustomScreen };

export type CustomScreen =
  | "patient-management"
  | "patient-registration"
  | "appointment-management"
  | "queue-management"
  | "waiting-room"
  | "departments-workspace"
  | "permissions"
  | "clinical-messages";

// ------------------------------------------------------------------ List

/** Rows in module screens are record-like; render callbacks cast locally. */
export type AnyRow = Record<string, unknown>;

export interface ListFilterConfig {
  label: string;
  options: FilterOption[];
  /** Returns true when the row matches the selected value. */
  matches: (row: AnyRow, value: string) => boolean;
}

export interface ListScreen {
  description: string;
  columns: Column<AnyRow>[];
  data: unknown[];
  keyExtractor: (row: AnyRow) => string;
  searchKeys?: string[];
  searchPlaceholder?: string;
  filters?: ListFilterConfig[];
  stats?: StatCardProps[];
  onRowClick?: (row: AnyRow) => void;
  emptyIcon?: LucideIcon;
  pageSize?: number;
}

// ------------------------------------------------------------------ Form

export interface FormFieldConfig {
  name: string;
  label: string;
  type:
    | "text"
    | "tel"
    | "email"
    | "number"
    | "date"
    | "time"
    | "select"
    | "textarea"
    | "checkbox";
  options?: FilterOption[];
  required?: boolean;
  placeholder?: string;
  hint?: string;
  span?: 1 | 2;
  defaultValue?: string | boolean;
}

export interface FormSection {
  title?: string;
  description?: string;
  fields: FormFieldConfig[];
}

export interface FormScreen {
  description: string;
  schema: ZodType;
  sections: FormSection[];
  submitLabel?: string;
  confirmTitle?: string;
  confirmMessage?: string;
  successTitle: string;
  successDescription?: string;
  backHref?: string;
}

// ----------------------------------------------------------------- Board

export interface BoardItem {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  meta?: string;
  urgent?: boolean;
}

export interface BoardColumn {
  id: string;
  title: string;
  tone?: StatusVariant;
  items: BoardItem[];
}

export interface BoardScreen {
  description: string;
  columns: BoardColumn[];
  stats?: StatCardProps[];
}

// ------------------------------------------------------------------ Grid

export interface GridItem {
  id: string;
  title: string;
  subtitle?: string;
  status?: string;
  icon?: LucideIcon;
  category?: string;
  details?: { label: string; value: string }[];
}

export interface GridScreen {
  description: string;
  items: GridItem[];
  stats?: StatCardProps[];
  filterLabel?: string;
  filterOptions?: FilterOption[];
}

// -------------------------------------------------------------- Analytics

export type ChartConfig =
  | {
      type: "area" | "bar";
      title: string;
      subtitle?: string;
      data: Record<string, string | number>[];
      xKey: string;
      series: { key: string; label: string; color: string }[];
    }
  | {
      type: "pie";
      title: string;
      subtitle?: string;
      data: { name: string; value: number }[];
    };

export interface AnalyticsScreen {
  description: string;
  kpis?: StatCardProps[];
  charts: ChartConfig[];
}

// --------------------------------------------------------------- Settings

export interface SettingsScreen {
  description: string;
  sections: { title: string; description?: string; fields: FormFieldConfig[] }[];
}
