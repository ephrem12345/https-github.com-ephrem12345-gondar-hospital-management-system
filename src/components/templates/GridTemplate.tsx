"use client";

import { useMemo, useState, type ReactNode } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatCard, type StatCardProps } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import type { GridScreen } from "@/modules/types";

/**
 * Card-grid screen for physical entities: wards, beds, rooms, fleet, units.
 * Optional category filter and KPI row.
 */
export function GridTemplate({
  title,
  screen,
  actions,
}: {
  title: string;
  screen: GridScreen;
  actions?: ReactNode;
}) {
  const [category, setCategory] = useState("");

  const items = useMemo(() => {
    if (!category) return screen.items;
    return screen.items.filter((item) => item.category === category);
  }, [screen.items, category]);

  return (
    <>
      <PageHeader
        title={title}
        description={screen.description}
        actions={
          <>
            {screen.filterOptions ? (
              <FilterDropdown
                label={screen.filterLabel ?? "Filter"}
                options={screen.filterOptions}
                value={category}
                onValueChange={setCategory}
                aria-label={screen.filterLabel ?? "Filter"}
              />
            ) : null}
            {actions}
          </>
        }
      />

      {screen.stats ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {screen.stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>
      ) : null}

      <div
        className={
          screen.stats
            ? "mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
            : "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
        }
      >
        {items.map((item) => (
          <Card key={item.id} className="transition-shadow hover:shadow-card-hover">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {item.title}
                </p>
                {item.subtitle ? (
                  <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                    {item.subtitle}
                  </p>
                ) : null}
              </div>
              {item.status ? <StatusBadge status={item.status} /> : null}
            </div>
            {item.details ? (
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                {item.details.map((detail) => (
                  <div key={detail.label} className="min-w-0">
                    <dt className="truncate text-slate-400 dark:text-slate-500">
                      {detail.label}
                    </dt>
                    <dd className="truncate font-medium text-slate-600 dark:text-slate-300">
                      {detail.value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </Card>
        ))}
      </div>
    </>
  );
}
