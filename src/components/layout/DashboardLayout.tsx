"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { authService } from "@/services";
import { resolveNav } from "@/data/navigation";
import { cn } from "@/lib/utils/cn";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { Breadcrumb } from "./Breadcrumb";

export interface DashboardLayoutProps {
  children: ReactNode;
}

/**
 * Application shell: collapsible sidebar + sticky topbar + content area.
 * The page title and breadcrumbs are derived from the current route so every
 * page gets a correct header without manual wiring.
 */
export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile drawer
  const [collapsed, setCollapsed] = useState(false); // desktop collapsed rail
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const pathname = usePathname();

  const nav = useMemo(() => resolveNav(pathname), [pathname]);
  const title = nav?.item.label ?? "Dashboard";
  const titleAm = nav?.item.labelAm ?? "ዳሽቦርድ";

  const closeMobile = useCallback(() => setSidebarOpen(false), []);

  const handleLogout = useCallback(async () => {
    setLogoutError(null);
    try {
      await authService.logout();
      router.push("/login");
    } catch {
      setLogoutError("Sign out could not reach the server. Your local session was cleared; try signing in again.");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      {/* Desktop sidebar */}
      <Sidebar
        collapsed={collapsed}
        onCollapse={setCollapsed}
        activeHref={pathname}
      />

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-40 lg:hidden",
          sidebarOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!sidebarOpen}
      >
        <div
          className={cn(
            "absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-200",
            sidebarOpen ? "opacity-100" : "opacity-0",
          )}
          onClick={closeMobile}
        />
        <div
          className={cn(
            "absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-dropdown transition-transform duration-200",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <Sidebar
            mobile
            open={sidebarOpen}
            onClose={closeMobile}
            activeHref={pathname}
          />
        </div>
      </div>

      <div
        className={cn(
          "flex min-h-screen flex-col transition-[padding] duration-200",
          collapsed ? "lg:pl-16" : "lg:pl-64",
        )}
      >
        <Topbar
          title={title}
          titleAm={titleAm}
          onMenuClick={() => setSidebarOpen(true)}
          onLogout={handleLogout}
          breadcrumbs={
            nav ? <Breadcrumb group={nav.group} item={nav.item} /> : null
          }
        />

        <main id="main-content" className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            {logoutError ? <p className="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">{logoutError}</p> : null}
            {children}
          </div>
        </main>

        <footer className="px-4 pb-6 pt-2 sm:px-6 lg:px-8">
          <p className="mx-auto max-w-7xl text-xs text-slate-400 dark:text-slate-600">
            Gondar Hospital Management System · Authorized staff access only
          </p>
        </footer>
      </div>
    </div>
  );
}
