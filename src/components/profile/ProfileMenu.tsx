"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ChevronDown, LogOut, Settings, UserRound } from "lucide-react";
import { mockCurrentUser } from "@/data/mock";
import { useClickOutside } from "@/hooks/useClickOutside";
import { cn } from "@/lib/utils/cn";
import { useTranslation } from "@/lib/i18n/I18nProvider";

export interface ProfileMenuProps {
  onLogout?: () => void | Promise<void>;
}

/** Avatar button + account dropdown (profile, settings, logout). */
export function ProfileMenu({ onLogout }: ProfileMenuProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useClickOutside(containerRef, () => setOpen(false), open);

  const user = mockCurrentUser;

  const handleLogout = async () => {
    setOpen(false);
    setLoggingOut(true);
    try {
      await onLogout?.();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={t("topbar.profile")}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-xs font-semibold text-white">
          {user.initials}
        </span>
        <span className="hidden min-w-0 text-left lg:block">
          <span className="block truncate text-sm font-medium leading-tight text-slate-700 dark:text-slate-200">
            {user.name}
          </span>
          <span className="block truncate text-[11px] leading-tight text-slate-400">
            {user.role}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "hidden h-4 w-4 text-slate-400 transition-transform lg:block",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-card border border-slate-200 bg-surface-light shadow-dropdown animate-fade-in dark:border-slate-800 dark:bg-surface-dark">
          <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
              {user.name}
            </p>
            <p className="truncate text-xs text-slate-400">{user.email}</p>
            <p className="mt-1 inline-flex rounded-full bg-light-blue px-2 py-0.5 text-[11px] font-medium text-primary-700 dark:bg-primary/15 dark:text-primary-300">
              {user.department} · {user.role}
            </p>
          </div>
          <ul className="py-1.5">
            <li>
              <Link
                href="/profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <UserRound className="h-4 w-4 text-slate-400" aria-hidden />
                {t("common.profile")}
              </Link>
            </li>
            <li>
              <Link
                href="/hospital-settings"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Settings className="h-4 w-4 text-slate-400" aria-hidden />
                {t("common.settings")}
              </Link>
            </li>
          </ul>
          <div className="border-t border-slate-100 py-1.5 dark:border-slate-800">
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex w-full items-center gap-2.5 px-4 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger-soft/60 disabled:opacity-60 dark:text-red-400 dark:hover:bg-danger/10"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              {t("common.logout")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
