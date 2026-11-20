"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { authService } from "@/services";

const links = [
  { href: "/patient-portal", label: "Dashboard" },
  { href: "/patient-portal/profile", label: "My profile" },
  { href: "/patient-portal/appointments", label: "Appointments" },
  { href: "/patient-portal/records", label: "Medical records" },
  { href: "/patient-portal/billing", label: "Billing" },
  { href: "/patient-portal/notifications", label: "Notifications" },
  { href: "/patient-portal/support", label: "Support" },
];

export function PatientPortalLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const user = authService.currentUser();
    if (!user) {
      router.replace("/login?role=patient");
      return;
    }
    if (String(user.role || "").toUpperCase() !== "PATIENT") {
      router.replace("/access-denied");
      return;
    }
    setReady(true);
  }, [router]);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } finally {
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
        <p className="text-sm" role="status">Checking your session...</p>
      </div>
    );
  }

  const user = authService.currentUser();
  const roleLabel = user?.role ? String(user.role).replace(/_/g, " ") : "Account";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/patient-portal" className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
            <span className="block text-lg font-bold text-blue-800 dark:text-blue-300">Gondar Hospital</span>
            <span className="block text-xs text-slate-500">Patient portal</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">{roleLabel}</span>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <nav aria-label="Patient portal" className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2 sm:px-6 lg:px-8">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                  active
                    ? "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
                href={link.href}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>
      <main id="main-content" className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      <footer className="border-t border-slate-200 px-4 py-5 text-center text-xs text-slate-500 dark:border-slate-800">
        For emergencies, contact local emergency services or visit the hospital directly.
      </footer>
    </div>
  );
}
