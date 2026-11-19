import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface LoadingStateProps {
  /** `full` centers in a tall block, `page` fills remaining height, `inline` is compact. */
  variant?: "full" | "page" | "inline";
  label?: string;
  className?: string;
}

export function LoadingState({
  variant = "full",
  label = "Loading…",
  className,
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center justify-center gap-3 text-sm text-slate-500 dark:text-slate-400",
        variant === "full" && "py-16",
        variant === "page" && "min-h-[60vh]",
        variant === "inline" && "py-2",
        className,
      )}
    >
      <Loader2 className="h-5 w-5 animate-spin text-primary-600" aria-hidden />
      <span>{label}</span>
    </div>
  );
}

/** Skeleton rows used inside tables while data loads. */
export function TableSkeleton({
  rows = 5,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <tbody aria-hidden>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex} className="border-b border-slate-100 dark:border-slate-800">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <td key={colIndex} className="px-4 py-3.5">
              <div
                className="h-4 animate-pulse rounded-md bg-slate-200 dark:bg-slate-700"
                style={{ width: `${60 + ((rowIndex + colIndex) % 4) * 8}%` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}
