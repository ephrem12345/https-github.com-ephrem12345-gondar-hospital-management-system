import { cn } from "@/lib/utils/cn";
import type { StatusVariant } from "@/types";

export interface StatusBadgeProps {
  /** Raw status string, e.g. "stable", "scheduled", "completed". */
  status: string;
  /** Explicit variant; when omitted it is derived from the status map. */
  variant?: StatusVariant;
  size?: "sm" | "md";
  className?: string;
}

const variantClasses: Record<StatusVariant, string> = {
  success:
    "bg-success-soft text-success dark:bg-success/15 dark:text-green-400",
  warning:
    "bg-warning-soft text-amber-700 dark:bg-warning/15 dark:text-amber-400",
  danger: "bg-danger-soft text-danger dark:bg-danger/15 dark:text-red-400",
  info: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400",
  primary:
    "bg-light-blue text-primary-700 dark:bg-primary/20 dark:text-primary-300",
  neutral:
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

/** Maps common GHMS status strings to semantic badge colors. */
const statusVariantMap: Record<string, StatusVariant> = {
  stable: "success",
  completed: "success",
  paid: "success",
  active: "success",
  available: "success",
  validated: "success",
  recovering: "info",
  "in-progress": "info",
  scheduled: "primary",
  confirmed: "primary",
  pending: "warning",
  low: "warning",
  critical: "danger",
  cancelled: "danger",
  overdue: "danger",
  failed: "danger",
  discharged: "neutral",
  archived: "neutral",
  closed: "neutral",
};

function resolveVariant(status: string, explicit?: StatusVariant): StatusVariant {
  if (explicit) return explicit;
  return statusVariantMap[status.toLowerCase()] ?? "neutral";
}

function humanize(status: string): string {
  return status
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function StatusBadge({
  status,
  variant,
  size = "md",
  className,
}: StatusBadgeProps) {
  const resolved = resolveVariant(status, variant);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        variantClasses[resolved],
        className,
      )}
    >
      {humanize(status)}
    </span>
  );
}

export function StatusDot({
  variant,
  className,
}: {
  variant: StatusVariant;
  className?: string;
}) {
  const colors: Record<StatusVariant, string> = {
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
    info: "bg-sky-500",
    primary: "bg-primary-600",
    neutral: "bg-slate-400",
  };
  return <span className={cn("h-2 w-2 rounded-full", colors[variant], className)} />;
}
