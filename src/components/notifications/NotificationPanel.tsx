"use client";

import { useEffect, useRef, useState } from "react";
import {
  Banknote,
  Bell,
  CalendarCheck,
  CheckCheck,
  FlaskConical,
  Pill,
  Settings,
} from "lucide-react";
import { notificationService } from "@/services";
import type { AppNotification } from "@/types";
import { useClickOutside } from "@/hooks/useClickOutside";
import { cn } from "@/lib/utils/cn";
import { useTranslation } from "@/lib/i18n/I18nProvider";

const categoryIcon: Record<AppNotification["category"], typeof Bell> = {
  appointment: CalendarCheck,
  lab: FlaskConical,
  pharmacy: Pill,
  billing: Banknote,
  system: Settings,
};

const categoryStyles: Record<AppNotification["category"], string> = {
  appointment: "bg-light-blue text-primary-700 dark:bg-primary/15 dark:text-primary-300",
  lab: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  pharmacy: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  billing: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  system: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
};

/**
 * Notification dropdown fed by the notification service (mock-backed).
 * Read state is client-side for now; persists server-side later.
 */
export function NotificationPanel() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loaded, setLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useClickOutside(containerRef, () => setOpen(false), open);

  useEffect(() => {
    if (!open || loaded) return;
    let cancelled = false;
    notificationService.getAll().then((data) => {
      if (cancelled) return;
      setItems(data);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [open, loaded]);

  const unread = items.filter((item) => !item.read).length;

  const markAllRead = () => {
    setItems((prev) => prev.map((item) => ({ ...item, read: true })));
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={t("topbar.notifications")}
        aria-expanded={open}
        className="relative rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <Bell className="h-5 w-5" aria-hidden />
        {unread > 0 ? (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold leading-none text-white">
            {unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-card border border-slate-200 bg-surface-light shadow-dropdown animate-fade-in dark:border-slate-800 dark:bg-surface-dark sm:w-96">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t("topbar.notifications")}
              {unread > 0 ? (
                <span className="ml-2 rounded-full bg-danger px-2 py-0.5 text-[10px] font-semibold text-white">
                  {unread}
                </span>
              ) : null}
            </h2>
            <button
              type="button"
              onClick={markAllRead}
              disabled={unread === 0}
              className="flex items-center gap-1 text-xs font-medium text-primary-600 transition-colors hover:text-primary-700 disabled:pointer-events-none disabled:opacity-40 dark:text-primary-300"
            >
              <CheckCheck className="h-3.5 w-3.5" aria-hidden />
              {t("topbar.markAllRead")}
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                {t("topbar.noNotifications")}
              </p>
            ) : (
              <ul>
                {items.map((item) => {
                  const Icon = categoryIcon[item.category];
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={cn(
                          "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60",
                          !item.read && "bg-light-blue/60 dark:bg-slate-800",
                        )}
                        onClick={() =>
                          setItems((prev) =>
                            prev.map((n) =>
                              n.id === item.id ? { ...n, read: true } : n,
                            ),
                          )
                        }
                      >
                        <span
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                            categoryStyles[item.category],
                          )}
                          aria-hidden
                        >
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                              {item.title}
                            </span>
                            <span className="shrink-0 text-[11px] text-slate-400">
                              {item.time}
                            </span>
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
                            {item.body}
                          </span>
                        </span>
                        {!item.read ? (
                          <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary-600" aria-hidden />
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
