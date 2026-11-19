"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { ChevronDown, PanelLeftClose, PanelLeftOpen, Plus, X } from "lucide-react";
import { navigation } from "@/data/navigation";
import { cn } from "@/lib/utils/cn";
import { useTranslation } from "@/lib/i18n/I18nProvider";

export interface SidebarProps {
  /** Desktop rail state. */
  collapsed?: boolean;
  onCollapse?: Dispatch<SetStateAction<boolean>>;
  /** Mobile drawer props. */
  mobile?: boolean;
  open?: boolean;
  onClose?: () => void;
  activeHref: string;
}

function Logo({ collapsed }: { collapsed: boolean }) {
  return (
    <Link href="/overview" className="flex items-center gap-3 px-3 py-1" aria-label="GHMS home">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm">
        {/* Cross mark — hospital identity */}
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
          <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3z" />
        </svg>
      </span>
      {!collapsed ? (
        <span className="min-w-0">
          <span className="block truncate text-lg font-bold leading-tight text-slate-800 dark:text-white">
            GHMS
          </span>
          <span className="block truncate text-[11px] leading-tight text-slate-400 dark:text-slate-500">
            Gondar Hospital
          </span>
        </span>
      ) : null}
    </Link>
  );
}

export function Sidebar({
  collapsed = false,
  onCollapse,
  mobile = false,
  open = false,
  onClose,
  activeHref,
}: SidebarProps) {
  const { language, t } = useTranslation();
  const pick = (en: string, am: string) => (language === "am" ? am : en);

  // Groups containing the active route start expanded.
  const initialOpen = navigation.map((group) =>
    group.items.some((item) => item.href === activeHref),
  );
  const [openGroups, setOpenGroups] = useState<boolean[]>(initialOpen);

  useEffect(() => {
    setOpenGroups(
      navigation.map((group) => group.items.some((item) => item.href === activeHref)),
    );
  }, [activeHref]);

  const toggleGroup = (index: number) => {
    setOpenGroups((prev) =>
      prev.map((isOpen, i) => (i === index ? !isOpen : isOpen)),
    );
  };

  const isCollapsed = mobile ? false : collapsed;

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-slate-200 bg-surface-light dark:border-slate-800 dark:bg-surface-dark",
        isCollapsed ? "w-16" : "w-full",
        !mobile && "fixed inset-y-0 left-0 z-30",
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "relative flex h-16 shrink-0 items-center border-b border-slate-100 dark:border-slate-800",
          isCollapsed ? "justify-center px-2" : "justify-between px-4",
        )}
      >
        <Logo collapsed={isCollapsed} />
        {mobile ? (
          <button
            type="button"
            onClick={onClose}
            aria-label={t("sidebar.closeMenu")}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        ) : null}
      </div>

      {/* Quick action */}
      {!isCollapsed ? (
        <div className="px-4 pt-4">
          <Link
            href="/patient-registration"
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" aria-hidden />
            {pick("Register Patient", "ታካሚ መዝገብ")}
          </Link>
        </div>
      ) : null}

      {/* Navigation */}
      <nav
        className={cn(
          "flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden px-3 py-4",
        )}
        aria-label="Main navigation"
      >
        {navigation.map((group, index) => {
          const isOpen = isCollapsed ? false : openGroups[index];
          const groupActive = group.items.some((item) => item.href === activeHref);
          return (
            <div key={group.id}>
              <button
                type="button"
                onClick={() => toggleGroup(index)}
                aria-expanded={isOpen}
                title={isCollapsed ? pick(group.label, group.labelAm) : undefined}
                className={cn(
                  "flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  groupActive
                    ? "bg-light-blue text-primary-700 dark:bg-primary/15 dark:text-primary-300"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white",
                  isCollapsed && "justify-center px-2",
                )}
              >
                <group.icon
                  className={cn(
                    "h-5 w-5 shrink-0",
                    groupActive ? "text-primary-600 dark:text-primary-300" : "text-slate-400",
                  )}
                  aria-hidden
                />
                {!isCollapsed ? (
                  <>
                    <span className="ml-3 flex-1 truncate text-left">
                      {pick(group.label, group.labelAm)}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200",
                        isOpen && "rotate-180",
                      )}
                      aria-hidden
                    />
                  </>
                ) : null}
              </button>

              {/* Items */}
              {!isCollapsed && isOpen ? (
                <ul className="mt-0.5 space-y-0.5">
                  {group.items.map((item) => {
                    const active = item.href === activeHref;
                    return (
                      <li key={item.id}>
                        <Link
                          href={item.href}
                          onClick={onClose}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "relative flex items-center rounded-lg py-2 pl-11 pr-3 text-sm transition-colors",
                            active
                              ? "bg-light-blue font-medium text-primary-700 dark:bg-primary/15 dark:text-primary-300"
                              : "text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200",
                          )}
                        >
                          {active ? (
                            <span
                              className="absolute left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-primary-600"
                              aria-hidden
                            />
                          ) : null}
                          <item.icon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                          <span className="ml-3 truncate">
                            {pick(item.label, item.labelAm)}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          );
        })}
      </nav>

      {/* Footer / collapse control */}
      <div
        className={cn(
          "shrink-0 border-t border-slate-100 dark:border-slate-800",
          isCollapsed ? "flex justify-center py-3" : "flex items-center justify-between px-4 py-3",
        )}
      >
        {!isCollapsed ? (
          <span className="text-[11px] text-slate-400 dark:text-slate-600">
            GHMS v0.1.0
          </span>
        ) : null}
        {onCollapse ? (
          <button
            type="button"
            onClick={() => onCollapse((value) => !value)}
            aria-label={isCollapsed ? t("sidebar.expand") : t("sidebar.collapse")}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-5 w-5" aria-hidden />
            ) : (
              <PanelLeftClose className="h-5 w-5" aria-hidden />
            )}
          </button>
        ) : null}
      </div>
    </aside>
  );
}
