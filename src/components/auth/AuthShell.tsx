"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { HeartPulse, Plus, ShieldCheck } from "lucide-react";
import { LanguageSwitcher } from "@/components/settings/LanguageSwitcher";

/** Hospital brand mark shared by every authentication page. */
export function HospitalLogo({ size = "md" }: { size?: "md" | "lg" }) {
  const box = size === "lg" ? "h-14 w-14 rounded-2xl" : "h-11 w-11 rounded-xl";
  const icon = size === "lg" ? "h-7 w-7" : "h-6 w-6";
  return (
    <span
      className={`flex ${box} items-center justify-center bg-primary-600 text-white shadow-card`}
    >
      <svg viewBox="0 0 24 24" className={icon} fill="currentColor" aria-hidden>
        <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3z" />
      </svg>
    </span>
  );
}

/**
 * Split-screen layout for authentication pages: decorative medical brand
 * panel on large screens, focused form card on small screens.
 */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <main id="main-content" className="flex min-h-screen bg-background-light dark:bg-background-dark">
      {/* Brand panel */}
      <aside className="relative hidden w-[44%] max-w-2xl flex-col justify-between overflow-hidden bg-gradient-to-br from-dark-blue via-primary-800 to-primary-600 p-10 text-white lg:flex">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <Plus className="absolute left-[12%] top-[10%] h-16 w-16 text-white/10" />
          <Plus className="absolute right-[15%] top-[28%] h-24 w-24 text-white/[0.07]" />
          <Plus className="absolute bottom-[18%] left-[8%] h-10 w-10 text-white/10" />
          <Plus className="absolute bottom-[8%] right-[10%] h-14 w-14 text-white/[0.08]" />
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/[0.06]" />
          <div className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-white/[0.05]" />
          <HeartPulse className="absolute right-[18%] top-[6%] h-10 w-10 text-white/20" />
        </div>

        <div className="relative">
          <div className="flex items-center gap-3">
            <HospitalLogo />
            <div>
              <p className="text-lg font-bold leading-tight">GHMS</p>
              <p className="text-xs text-white/70">Gondar Hospital Management System</p>
            </div>
          </div>
        </div>

        <div className="relative">
          <h2 className="max-w-md text-3xl font-bold leading-snug">
            Unified care, from reception to pharmacy.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-6 text-white/75">
            One secure platform for patient services, clinical care, diagnostics,
            pharmacy, facility management and finance at Gondar University
            Specialized Hospital.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-white/85">
            {[
              "Patient records and appointments in one place",
              "Laboratory, radiology and pharmacy workflows",
              "Role-based access for every department",
            ].map((line) => (
              <li key={line} className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
                {line}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/50">
          © {new Date().getFullYear()} Gondar University Specialized Hospital
        </p>
      </aside>

      {/* Form area */}
      <section className="flex flex-1 flex-col px-4 py-8 sm:px-8">
        <div className="mx-auto flex w-full max-w-lg flex-col">
          <div className="flex items-center justify-between">
            <Link href="/login" className="flex items-center gap-2.5 lg:invisible">
              <HospitalLogo />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                GHMS
              </span>
            </Link>
            <LanguageSwitcher />
          </div>

          <div className="mt-8 flex flex-1 flex-col justify-center pb-10">
            <div className="rounded-card border border-slate-200 bg-surface-light p-6 shadow-card dark:border-slate-800 dark:bg-surface-dark sm:p-8">
              <h1 className="text-xl font-bold text-slate-800 dark:text-white sm:text-2xl">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                  {subtitle}
                </p>
              ) : null}
              <div className="mt-6">{children}</div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
