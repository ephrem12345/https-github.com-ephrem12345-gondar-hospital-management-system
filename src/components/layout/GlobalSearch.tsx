"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CornerDownLeft, Loader2 } from "lucide-react";
import { SearchInput } from "@/components/ui/SearchInput";
import { searchService, type SearchResult } from "@/services";
import { useClickOutside } from "@/hooks/useClickOutside";
import { cn } from "@/lib/utils/cn";
import { useTranslation } from "@/lib/i18n/I18nProvider";

/**
 * Global quick search: indexes the navigation structure client-side.
 * Selecting a result (or pressing Enter on the first result) navigates.
 */
export function GlobalSearch() {
  const router = useRouter();
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useClickOutside(containerRef, () => setOpen(false), open);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let cancelled = false;
    searchService.quickSearch(trimmed).then((found) => {
      if (cancelled) return;
      setResults(found);
      setLoading(false);
      setOpen(true);
    });
    return () => {
      cancelled = true;
    };
  }, [query]);

  const go = (result: SearchResult) => {
    setOpen(false);
    setQuery("");
    router.push(result.href);
  };

  const showPanel = open && query.trim().length > 0;

  return (
    <div ref={containerRef} className="relative hidden md:block md:w-64 lg:w-80">
      <SearchInput
        value={query}
        onValueChange={setQuery}
        onClear={() => {
          setQuery("");
          setOpen(false);
        }}
        placeholder={t("topbar.searchPlaceholder")}
        aria-label={t("common.search")}
        onKeyDown={(event) => {
          if (event.key === "Enter" && results.length > 0) {
            event.preventDefault();
            go(results[0]);
          }
          if (event.key === "Escape") setOpen(false);
        }}
      />
      {showPanel ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-full overflow-hidden rounded-card border border-slate-200 bg-surface-light shadow-dropdown animate-fade-in dark:border-slate-800 dark:bg-surface-dark">
          {loading && results.length === 0 ? (
            <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-slate-500 dark:text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {t("common.search")}…
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              {t("common.noResults")}
            </div>
          ) : (
            <ul role="listbox" aria-label={t("common.search")}>
              {results.map((result, index) => (
                <li key={`${result.href}-${index}`} role="option" aria-selected={index === 0}>
                  <button
                    type="button"
                    onMouseDown={(event) => {
                      // mousedown so click happens before input blur closes panel
                      event.preventDefault();
                      go(result);
                    }}
                    className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-light-blue dark:hover:bg-slate-800"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-slate-700 dark:text-slate-200">
                        {result.label}
                      </span>
                      <span className="block truncate text-xs text-slate-400">
                        {result.group}
                      </span>
                    </span>
                    <CornerDownLeft
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 text-slate-300 dark:text-slate-600",
                        index > 0 && "opacity-0",
                      )}
                      aria-hidden
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
