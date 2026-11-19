"use client";

import { useMemo, useState, type ReactNode } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatCard, type StatCardProps } from "@/components/ui/StatCard";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import type { LucideIcon } from "lucide-react";

export interface ListFilterControl {
  label: string;
  options: { label: string; value: string }[];
  matches: (row: unknown, value: string) => boolean;
}

export interface ListTemplateProps<T> {
  title: string;
  description: string;
  actions?: ReactNode;
  stats?: StatCardProps[];
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  searchKeys?: string[];
  searchPlaceholder?: string;
  filters?: ListFilterControl[];
  emptyIcon?: LucideIcon;
  onRowClick?: (row: T) => void;
  pageSize?: number;
}

/**
 * Standard module list screen: header, optional KPI row, then a card with
 * search + filters + a sortable, paginated data table.
 */
export function ListTemplate<T>({
  title,
  description,
  actions,
  stats,
  columns,
  data,
  keyExtractor,
  searchKeys = [],
  searchPlaceholder = "Search…",
  filters,
  emptyIcon,
  onRowClick,
  pageSize = 10,
}: ListTemplateProps<T>) {
  const [query, setQuery] = useState("");
  const [filterValues, setFilterValues] = useState<string[]>(
    () => filters?.map(() => "") ?? [],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.filter((row) => {
      const record = row as Record<string, unknown>;
      const matchesQuery =
        !q ||
        searchKeys.some((key) => {
          const value = record[key];
          return value !== undefined && String(value).toLowerCase().includes(q);
        });
      const matchesFilters = (filters ?? []).every((filter, index) => {
        const value = filterValues[index];
        return !value || filter.matches(row, value);
      });
      return matchesQuery && matchesFilters;
    });
  }, [data, query, searchKeys, filters, filterValues]);

  return (
    <>
      <PageHeader title={title} description={description} actions={actions} />

      {stats ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>
      ) : null}

      <Card flush className={stats ? "mt-6" : undefined}>
        <CardHeader title={title} />
        <DataTable
          columns={columns}
          data={filtered}
          keyExtractor={keyExtractor}
          pageSize={pageSize}
          onRowClick={onRowClick}
          emptyState={{ icon: emptyIcon, title: "No matching records" }}
          toolbar={
            <div className="flex w-full flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <SearchInput
                value={query}
                onValueChange={setQuery}
                onClear={() => setQuery("")}
                placeholder={searchPlaceholder}
                wrapperClassName="lg:max-w-xs"
                aria-label={searchPlaceholder}
              />
              {filters?.length ? (
                <div className="flex flex-wrap gap-2">
                  {filters.map((filter, index) => (
                    <FilterDropdown
                      key={filter.label}
                      label={filter.label}
                      options={filter.options}
                      value={filterValues[index] ?? ""}
                      onValueChange={(value) =>
                        setFilterValues((prev) =>
                          prev.map((current, i) =>
                            i === index ? value : current,
                          ),
                        )
                      }
                      aria-label={filter.label}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          }
        />
      </Card>
    </>
  );
}
