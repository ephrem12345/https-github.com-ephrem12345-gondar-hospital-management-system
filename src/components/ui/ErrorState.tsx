import { AlertCircle, RefreshCcw } from "lucide-react";
import { Button } from "./Button";
import { cn } from "@/lib/utils/cn";

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center px-6 py-14 text-center",
        className,
      )}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger dark:bg-danger/15">
        <AlertCircle className="h-6 w-6" aria-hidden />
      </div>
      <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">
        {title}
      </h3>
      <p className="mt-1 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
        {message}
      </p>
      {onRetry ? (
        <Button
          variant="secondary"
          size="sm"
          className="mt-5"
          leftIcon={<RefreshCcw className="h-4 w-4" aria-hidden />}
          onClick={onRetry}
        >
          Try again
        </Button>
      ) : null}
    </div>
  );
}
