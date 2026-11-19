"use client";

import { useRef, useState } from "react";
import { Check, Globe } from "lucide-react";
import { useClickOutside } from "@/hooks/useClickOutside";
import { useTranslation, type Language } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils/cn";

const options: Array<{ value: Language; label: string; native: string }> = [
  { value: "en", label: "English", native: "English" },
  { value: "am", label: "Amharic", native: "አማርኛ" },
];

/** Dropdown language selector (EN / አማርኛ); persists to localStorage. */
export function LanguageSwitcher() {
  const { language, setLanguage, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useClickOutside(containerRef, () => setOpen(false), open);

  const current = options.find((option) => option.value === language) ?? options[0];

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={t("common.language")}
        aria-expanded={open}
        title={t("common.language")}
        className="flex items-center gap-1.5 rounded-lg p-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <Globe className="h-5 w-5" aria-hidden />
        <span className="hidden sm:inline">{current.native}</span>
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-40 overflow-hidden rounded-card border border-slate-200 bg-surface-light shadow-dropdown animate-fade-in dark:border-slate-800 dark:bg-surface-dark">
          <ul className="py-1.5" role="listbox" aria-label={t("common.language")}>
            {options.map((option) => (
              <li key={option.value} role="option" aria-selected={option.value === language}>
                <button
                  type="button"
                  onClick={() => {
                    setLanguage(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between px-3.5 py-2 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800",
                    option.value === language
                      ? "font-medium text-primary-600 dark:text-primary-300"
                      : "text-slate-600 dark:text-slate-300",
                  )}
                >
                  <span>{option.native}</span>
                  {option.value === language ? (
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
