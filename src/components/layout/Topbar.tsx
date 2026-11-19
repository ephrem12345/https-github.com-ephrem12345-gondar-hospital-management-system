"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Menu, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { GlobalSearch } from "./GlobalSearch";
import { NotificationPanel } from "@/components/notifications/NotificationPanel";
import { ProfileMenu } from "@/components/profile/ProfileMenu";
import { LanguageSwitcher } from "@/components/settings/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/settings/ThemeSwitcher";

export interface TopbarProps {
  /** Route-derived page title. */
  title: string;
  titleAm: string;
  /** Opens the mobile navigation drawer. */
  onMenuClick: () => void;
  onLogout: () => void | Promise<void>;
  breadcrumbs?: ReactNode;
}

/**
 * Sticky top navigation: page title + breadcrumbs, global search,
 * language, theme, notifications and the profile menu.
 */
export function Topbar({
  title,
  titleAm,
  onMenuClick,
  onLogout,
  breadcrumbs,
}: TopbarProps) {
  const { language } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const displayTitle = language === "am" ? titleAm : title;

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b px-4 backdrop-blur sm:px-6",
        "border-slate-200 bg-surface-light/85 dark:border-slate-800 dark:bg-surface-dark/85",
      )}
    >
      {/* Left: menu + title/breadcrumb */}
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
        <div className="min-w-0">
          {/* Suppress SSR mismatch: language/theme resolve client-side. */}
          <h1 className="truncate text-base font-semibold text-slate-800 dark:text-slate-100 sm:text-lg">
            {displayTitle}
          </h1>
          {breadcrumbs ? (
            <div className="hidden sm:block">
              {breadcrumbs}
            </div>
          ) : null}
        </div>
      </div>

      {/* Right: utilities */}
      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
        <GlobalSearch />
        <div className="mx-1 hidden h-6 w-px bg-slate-200 dark:bg-slate-700 md:block" aria-hidden />
        <LanguageSwitcher />
        {mounted ? <ThemeSwitcher /> : null}
        <Link
          href="/messages"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          title={language === "am" ? "የክሊኒካል መልእክቶች" : "Clinical Messages"}
          aria-label={language === "am" ? "የክሊኒካል መልእክቶች" : "Clinical Messages"}
        >
          <MessageSquare className="h-4 w-4" aria-hidden />
        </Link>
        <NotificationPanel />
        <div className="mx-1 hidden h-6 w-px bg-slate-200 dark:bg-slate-700 sm:block" aria-hidden />
        <ProfileMenu onLogout={onLogout} />
      </div>
    </header>
  );
}
