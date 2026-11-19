import { type ReactNode } from "react";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { StatCard, type StatTone } from "@/components/ui/StatCard";

export type TableColumn = { label: string; value: ReactNode };

export const inputClass =
  "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

export function DataTable({
  headers,
  children,
  label,
}: {
  headers: string[];
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm" aria-label={label}>
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900/50 dark:text-slate-400">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-3 font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{children}</tbody>
      </table>
    </div>
  );
}

export function TableRow({ cells }: { cells: TableColumn[] }) {
  return (
    <tr className="align-top text-slate-700 dark:text-slate-200">
      {cells.map((cell, index) => (
        <td key={index} className="px-4 py-3">
          {cell.value}
        </td>
      ))}
    </tr>
  );
}

export function Field({
  label,
  children,
  required = false,
}: {
  label: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
      {label}
      {required ? (
        <span className="ml-1 text-danger" aria-hidden="true">
          *
        </span>
      ) : null}
      {children}
    </label>
  );
}

export function Notice({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "warning";
}) {
  const isWarning = tone === "warning";
  return (
    <div
      className={`flex gap-3 rounded-xl border p-4 text-sm ${
        isWarning
          ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
          : "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-200"
      }`}
      role="note"
    >
      {isWarning ? (
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      ) : (
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      )}
      <div>{children}</div>
    </div>
  );
}

export function MetricGrid({
  metrics,
}: {
  metrics: Array<{
    label: string;
    value: string;
    hint: string;
    icon: ReactNode;
    tone: StatTone;
  }>;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <StatCard key={metric.label} {...metric} />
      ))}
    </div>
  );
}
