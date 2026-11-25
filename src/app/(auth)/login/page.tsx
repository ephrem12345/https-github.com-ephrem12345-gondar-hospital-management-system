"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { authService, ApiError, apiClient } from "@/services";
import type { ConnectionDiagnostic } from "@/services/api-client";
import { loginSchema, type LoginInput } from "@/validation/schemas";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { LoadingState } from "@/components/ui/LoadingState";
import {
  getRoleConfig,
  getRoleDefaultDashboard,
  formatRoleTitle,
  type RoleConfig,
} from "@/config/roles";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams?.get("role") ?? null;
  const selectedRole: RoleConfig | null = getRoleConfig(roleParam);

  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [diag, setDiag] = useState<ConnectionDiagnostic | null>(null);
  const [checkingDiag, setCheckingDiag] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "", remember: true },
  });

  useEffect(() => {
    // Prefill the remembered identifier (never the password).
    const remembered = window.localStorage.getItem("ghms-remember");
    if (remembered) setValue("identifier", remembered);
  }, [setValue]);

  useEffect(() => {
    // Only redirect away from login if the user has an active, backend-verified session
    let isMounted = true;
    async function verifyExistingSession() {
      const user = await authService.checkSession();
      if (!isMounted || !user) return;
      if (user.role?.toUpperCase() === "PATIENT") {
        router.replace("/patient-portal");
      } else if (selectedRole) {
        router.replace(selectedRole.defaultDashboard);
      } else {
        router.replace(getRoleDefaultDashboard(user.role));
      }
    }
    void verifyExistingSession();
    return () => {
      isMounted = false;
    };
  }, [router, selectedRole]);

  const onSubmit = handleSubmit(async (values) => {
    if (isSubmitting) return;
    setError(null);
    try {
      const user = await authService.login(
        values.identifier,
        values.password,
        values.remember,
        selectedRole?.expectedRoles
      );

      // Verify the selected role against the authenticated user's actual backend role
      if (selectedRole) {
        const userBackendRole = (user?.role || "").toUpperCase();
        const isMatch = selectedRole.expectedRoles.some(
          (expected) => expected.toUpperCase() === userBackendRole
        );

        if (!isMatch) {
          // Security enforcement: immediately revoke session and clear cookies
          await authService.logout().catch(() => {});
          setError(
            `Access Denied: You selected "${selectedRole.title}", but your account has the role "${formatRoleTitle(
              user?.role
            )}". Please sign in using the correct portal for your role.`
          );
          return;
        }
      }

      const requestedNext = searchParams?.get("next");
      const safeNext =
        requestedNext &&
        requestedNext.startsWith("/") &&
        !requestedNext.startsWith("//") &&
        !requestedNext.startsWith("/\\") &&
        !requestedNext.toLowerCase().includes("javascript:") &&
        !requestedNext.startsWith("/login")
          ? requestedNext
          : null;

      // Role verification passed or generic login: navigate to the appropriate authorized dashboard
      if (user?.role?.toUpperCase() === "PATIENT") {
        router.push(safeNext?.startsWith("/patient-portal") ? safeNext : "/patient-portal");
      } else if (safeNext && !safeNext.startsWith("/patient-portal")) {
        router.push(safeNext);
      } else if (selectedRole) {
        router.push(selectedRole.defaultDashboard);
      } else {
        router.push(getRoleDefaultDashboard(user?.role));
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setError("Unable to sign in. Please check your credentials and try again.");
        } else {
          setError(err.message || "Unable to sign in. Please check your credentials and try again.");
        }
      } else if (err instanceof Error) {
        setError(err.message || "Unable to sign in. Please check your credentials and try again.");
      } else {
        setError("Unable to sign in. Please check your credentials and try again.");
      }
    }
  });

  const pageTitle = selectedRole ? selectedRole.title : "Welcome back";
  const pageSubtitle = selectedRole
    ? `Sign in with your ${selectedRole.shortRole} credentials to access the ${selectedRole.portalName}.`
    : "Sign in with your staff or patient credentials to access the hospital system.";

  return (
    <AuthShell title={pageTitle} subtitle={pageSubtitle}>
      {/* Selected Role Pill / Back to Role Selection */}
      <div className="mb-5 flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>All Role Portals</span>
        </Link>

        {selectedRole ? (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${selectedRole.badgeClass}`}
          >
            <selectedRole.icon className="h-3 w-3" />
            <span>{selectedRole.shortRole} Portal</span>
          </span>
        ) : (
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Unified Login
          </span>
        )}
      </div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormField
          label="Email, username or phone"
          htmlFor="identifier"
          required
          error={errors.identifier?.message}
        >
          <input
            id="identifier"
            type="text"
            autoComplete="username"
            placeholder={
              selectedRole?.key === "patient"
                ? "patient@gondar-hospital.et or phone"
                : "name@gondar-hospital.et or username"
            }
            className="ghms-input"
            {...register("identifier")}
          />
        </FormField>

        <FormField
          label="Password"
          htmlFor="password"
          required
          error={errors.password?.message}
        >
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              className="ghms-input pr-10"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden />
              ) : (
                <Eye className="h-4 w-4" aria-hidden />
              )}
            </button>
          </div>
        </FormField>

        <div className="flex items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500/40"
              {...register("remember")}
            />
            Remember me
          </label>
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-300 dark:hover:text-primary-200"
          >
            Forgot password?
          </Link>
        </div>

        {error ? (
          <div className="space-y-2">
            <p
              className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger dark:bg-danger/15 leading-relaxed"
              role="alert"
            >
              {error}
            </p>
            {error.includes("Unable to connect") || error.includes("server") || error.includes("timed out") ? (
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3 text-xs text-slate-600 dark:text-slate-300 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">Server Diagnostic Tool</span>
                  <button
                    type="button"
                    onClick={async () => {
                      setCheckingDiag(true);
                      const res = await apiClient.checkConnection();
                      setDiag(res);
                      setCheckingDiag(false);
                    }}
                    className="text-primary-600 dark:text-primary-400 hover:underline font-medium"
                    disabled={checkingDiag}
                  >
                    {checkingDiag ? "Testing..." : "Test Server Connection"}
                  </button>
                </div>
                {diag ? (
                  <div className="space-y-1 font-mono text-[11px] pt-1">
                    <div className="flex justify-between">
                      <span>API URL:</span>
                      <span className="text-slate-800 dark:text-slate-200">{diag.apiUrl}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Backend (/api/health):</span>
                      <span className={diag.backendReachable ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
                        {diag.backendReachable ? `ONLINE (${diag.latencyMs}ms)` : "OFFLINE / UNREACHABLE"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>MySQL Database:</span>
                      <span className={diag.databaseReady ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
                        {diag.databaseReady ? "READY" : "NOT READY"}
                      </span>
                    </div>
                    <p className="text-slate-500 pt-1 font-sans">{diag.message}</p>
                  </div>
                ) : (
                  <p className="text-slate-500">
                    To start the backend and database, run <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">START-GHMS.bat</span> in the GHMS project directory.
                  </p>
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        <Button type="submit" className="w-full" loading={isSubmitting} disabled={isSubmitting}>
          {isSubmitting
            ? "Verifying & signing in…"
            : selectedRole
            ? `Sign in as ${selectedRole.shortRole}`
            : "Sign in"}
        </Button>

        <div className="pt-2 text-center text-sm text-slate-500 dark:text-slate-400">
          {selectedRole?.key === "patient" ? (
            <p>
              New patient?{" "}
              <Link
                href="/register"
                className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-300"
              >
                Create a patient account
              </Link>
            </p>
          ) : (
            <p>
              Need hospital access?{" "}
              <Link
                href="/"
                className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-300"
              >
                Choose another role portal
              </Link>
            </p>
          )}
        </div>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingState variant="page" />}>
      <LoginForm />
    </Suspense>
  );
}



