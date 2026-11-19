"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { authService } from "@/services";
import { resetPasswordSchema, type ResetPasswordInput } from "@/validation/schemas";
import { AuthShell } from "@/components/auth/AuthShell";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, password: "", confirmPassword: "" },
  });

  const password = watch("password");

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      await authService.resetPassword(values.token, values.password);
      router.push("/login?reset=success");
    } catch {
      setError("The reset link may have expired. Please request a new one.");
    }
  });

  return (
    <AuthShell
      title="Reset password"
      subtitle="Choose a new password for your account."
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <input type="hidden" {...register("token")} />

        {!token ? (
          <p
            className="rounded-lg bg-warning-soft px-3 py-2 text-sm text-amber-700 dark:bg-warning/15 dark:text-amber-400"
            role="alert"
          >
            No reset token found in the link. Open the latest reset link from your
            email, or{" "}
            <Link href="/forgot-password" className="font-medium underline">
              request a new one
            </Link>
            .
          </p>
        ) : null}

        <FormField label="New password" htmlFor="password" required error={errors.password?.message} hint="At least 8 characters with a letter and a number.">
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              className="ghms-input pr-10"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
            </button>
          </div>
          <PasswordStrength password={password} />
        </FormField>

        <FormField label="Confirm password" htmlFor="confirmPassword" required error={errors.confirmPassword?.message}>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              className="ghms-input pr-10"
              {...register("confirmPassword")}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((value) => !value)}
              aria-label={showConfirm ? "Hide password" : "Show password"}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              {showConfirm ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
            </button>
          </div>
        </FormField>

        {error ? (
          <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger dark:bg-danger/15" role="alert">
            {error}
          </p>
        ) : null}

        <Button type="submit" className="w-full" loading={isSubmitting}>
          {isSubmitting ? "Updating password…" : "Reset password"}
        </Button>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          <Link href="/login" className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-300">
            Back to sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
