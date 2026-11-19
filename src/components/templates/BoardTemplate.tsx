"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatCard, type StatCardProps } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { BoardScreen } from "@/modules/types";
import { cn } from "@/lib/utils/cn";

const columnTones: Record<string, string> = {
  success: "border-t-success",
  warning: "border-t-warning",
  danger: "border-t-danger",
  info: "border-t-sky-500",
  primary: "border-t-primary-600",
  neutral: "border-t-slate-300 dark:border-t-slate-600",
};

/**
 * Column-board screen used for queues, triage and workflow pipelines.
 */
export function BoardTemplate({
  title,
  screen,
}: {
  title: string;
  screen: BoardScreen;
}) {
  return (
    <>
      <PageHeader title={title} description={screen.description} />

      {screen.stats ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {screen.stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>
      ) : null}

      <div
        className={cn(
          "grid gap-4",
          screen.columns.length >= 5
            ? "sm:grid-cols-2 xl:grid-cols-5"
            : screen.columns.length === 4
              ? "sm:grid-cols-2 xl:grid-cols-4"
              : "sm:grid-cols-2 xl:grid-cols-3",
          screen.stats && "mt-6",
        )}
      >
        {screen.columns.map((column) => (
          <Card key={column.id} flush className={cn("border-t-4", columnTones[column.tone ?? "neutral"])}>
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {column.title}
              </h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {column.items.length}
              </span>
            </div>
            <div className="max-h-[28rem] space-y-3 overflow-y-auto p-3">
              {column.items.length === 0 ? (
                <p className="px-2 py-6 text-center text-xs text-slate-400">
                  Empty
                </p>
              ) : (
                column.items.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "rounded-lg border border-slate-100 bg-surface-light p-3 shadow-card dark:border-slate-800 dark:bg-slate-900/40",
                      item.urgent && "border-danger/40 bg-danger-soft/40 dark:bg-danger/10",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {item.title}
                      </p>
                      {item.badge ? (
                        <StatusBadge status={item.badge} size="sm" />
                      ) : null}
                    </div>
                    {item.subtitle ? (
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {item.subtitle}
                      </p>
                    ) : null}
                    {item.meta ? (
                      <p className="mt-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                        {item.meta}
                      </p>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
