"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils/cn";

const LABELS = ["Very weak", "Weak", "Fair", "Good", "Strong"] as const;
const COLORS = [
  "bg-danger",
  "bg-danger",
  "bg-warning",
  "bg-success",
  "bg-success",
] as const;

/** 0–4 password score shared by registration and reset flows. */
export function scorePassword(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(4, score);
}

/** Live strength indicator rendered under password inputs. */
export function PasswordStrength({ password }: { password: string }) {
  const score = useMemo(() => scorePassword(password), [password]);
  if (!password) return null;

  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1.5">
        {[0, 1, 2, 3, 4].map((index) => (
          <span
            key={index}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              index <= score && password ? COLORS[score] : "bg-slate-200 dark:bg-slate-700",
            )}
          />
        ))}
      </div>
      <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
        Password strength:{" "}
        <span className="font-medium text-slate-700 dark:text-slate-200">
          {LABELS[score]}
        </span>
      </p>
    </div>
  );
}
