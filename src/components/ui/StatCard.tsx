import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "./Card";
import { cn } from "@/lib/utils/cn";

export type StatTone = "primary" | "success" | "warning" | "danger";

export interface StatCardProps {
  label: string;
  value: string;
  icon: ReactNode;
  /** Percentage change vs previous period; drives the trend chip. */
  change?: { value: number; suffix?: string; positiveIsGood?: boolean };
  /** Secondary line, e.g. "214 of 420 beds". */
  hint?: string;
  tone?: StatTone;
  className?: string;
}

const toneClasses: Record<StatTone, { chip: string }> = {
  primary: { chip: "bg-light-blue text-primary-700 dark:bg-primary/15 dark:text-primary-300" },
  success: { chip: "bg-success-soft text-success dark:bg-success/15 dark:text-green-400" },
  warning: { chip: "bg-warning-soft text-amber-700 dark:bg-warning/15 dark:text-amber-400" },
  danger: { chip: "bg-danger-soft text-danger dark:bg-danger/15 dark:text-red-400" },
};

export function StatCard({
  label,
  value,
  icon,
  change,
  hint,
  tone = "primary",
  className,
}: StatCardProps) {
  const up = (change?.value ?? 0) >= 0;
  const good = change?.positiveIsGood === false ? !up : up;

  return (
    <Card
      className={cn(
        "flex items-start justify-between gap-4 transition-shadow hover:shadow-card-hover",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <p className="mt-2 text-2xl font-bold tracking-tight text-slate-800 dark:text-white">
          {value}
        </p>
        {change ? (
          <p className="mt-2 flex items-center gap-1 text-xs font-medium">
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5",
                good
                  ? "bg-success-soft text-success dark:bg-success/15 dark:text-green-400"
                  : "bg-danger-soft text-danger dark:bg-danger/15 dark:text-red-400",
              )}
            >
              {up ? (
                <ArrowUpRight className="h-3 w-3" aria-hidden />
              ) : (
                <ArrowDownRight className="h-3 w-3" aria-hidden />
              )}
              {Math.abs(change.value).toFixed(1)}
              {change.suffix ?? "%"}
            </span>
            <span className="text-slate-400 dark:text-slate-500">vs last month</span>
          </p>
        ) : hint ? (
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">{hint}</p>
        ) : null}
      </div>
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
          toneClasses[tone].chip,
        )}
        aria-hidden
      >
        {icon}
      </div>
    </Card>
  );
}
