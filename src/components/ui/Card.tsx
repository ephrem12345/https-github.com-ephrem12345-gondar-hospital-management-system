import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Removes default padding for full-bleed content. */
  flush?: boolean;
}

/** Standard white surface used across dashboards, tables and panels. */
export function Card({ flush = false, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-card border border-slate-200 bg-surface-light shadow-card dark:border-slate-800 dark:bg-surface-dark",
        !flush && "p-5 sm:p-6",
        className,
      )}
      {...props}
    />
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function CardHeader({ title, subtitle, actions, className }: CardHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="truncate text-base font-semibold text-slate-800 dark:text-slate-100">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
