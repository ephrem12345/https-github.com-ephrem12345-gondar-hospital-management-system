"use client";

import { useRef, useState } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type Theme } from "@/lib/theme/ThemeProvider";
import { useClickOutside } from "@/hooks/useClickOutside";
import { cn } from "@/lib/utils/cn";
import { useTranslation } from "@/lib/i18n/I18nProvider";

const options: Array<{ value: Theme; labelKey: string; icon: typeof Sun }> = [
  { value: "light", labelKey: "common.light", icon: Sun },
  { value: "dark", labelKey: "common.dark", icon: Moon },
  { value: "system", labelKey: "common.system", icon: Monitor },
];

/** Light / Dark / System theme selector; persists to localStorage. */
export function ThemeSwitcher() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useClickOutside(containerRef, () => setOpen(false), open);

  const ActiveIcon = resolvedTheme === "dark" ? Moon : Sun;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={t("common.theme")}
        aria-expanded={open}
        title={t("common.theme")}
        className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <ActiveIcon className="h-5 w-5" aria-hidden />
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-40 overflow-hidden rounded-card border border-slate-200 bg-surface-light shadow-dropdown animate-fade-in dark:border-slate-800 dark:bg-surface-dark">
          <ul className="py-1.5" role="listbox" aria-label={t("common.theme")}>
            {options.map((option) => (
              <li key={option.value} role="option" aria-selected={option.value === theme}>
                <button
                  type="button"
                  onClick={() => {
                    setTheme(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3.5 py-2 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800",
                    option.value === theme
                      ? "font-medium text-primary-600 dark:text-primary-300"
                      : "text-slate-600 dark:text-slate-300",
                  )}
                >
                  <option.icon className="h-4 w-4 text-slate-400" aria-hidden />
                  <span className="flex-1 text-left">{t(option.labelKey)}</span>
                  {option.value === theme ? (
                    <Check className="h-4 w-4" aria-hidden />
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
