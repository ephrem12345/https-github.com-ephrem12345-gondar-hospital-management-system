import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { NavGroup, NavItem } from "@/types/navigation";
import { cn } from "@/lib/utils/cn";

export interface BreadcrumbProps {
  group: NavGroup;
  item: NavItem;
  className?: string;
}

/**
 * Route-derived breadcrumb: Home › Group › Item.
 * Rendered by the Topbar; hidden on very small screens.
 */
export function Breadcrumb({ group, item, className }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn("min-w-0", className)}>
      <ol className="flex items-center gap-1 text-sm">
        <li className="shrink-0">
          <Link
            href="/"
            className="truncate text-slate-400 transition-colors hover:text-primary-600 dark:text-slate-500 dark:hover:text-primary-300"
          >
            Home
          </Link>
        </li>
        <li className="flex shrink-0 items-center gap-1 text-slate-300 dark:text-slate-600" aria-hidden>
          <ChevronRight className="h-3.5 w-3.5" />
        </li>
        <li className="hidden truncate sm:block">
          <span className="text-slate-400 dark:text-slate-500">{group.label}</span>
        </li>
        {group.label ? (
          <li
            className="hidden shrink-0 text-slate-300 dark:text-slate-600 sm:flex sm:items-center"
            aria-hidden
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </li>
        ) : null}
        <li className="min-w-0 truncate">
          <span className="font-medium text-slate-600 dark:text-slate-300">
            {item.label}
          </span>
        </li>
      </ol>
    </nav>
  );
}
