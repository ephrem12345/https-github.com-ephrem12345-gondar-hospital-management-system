"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { authService } from "@/services";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/validation/schemas";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Card } from "@/components/ui/Card";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [sentTo, setSentTo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { identifier: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const result = await authService.requestPasswordReset(values.identifier);
      if (result) {
        setSentTo(values.identifier);
        setSent(true);
      }
    } catch {
      setError("The request could not be sent. Please try again.");
    }
  });

  if (sent) {
    return (
      <AuthShell title="Check your inbox">
        <Card className="p-0">
          <div className="rounded-lg bg-success-soft px-4 py-3 text-sm text-success dark:bg-success/15 dark:text-green-400" role="status">
            <span className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                If an account exists for <strong>{sentTo}</strong>, a password reset link
                has been sent. The link expires in 30 minutes.
              </span>
            </span>
          </div>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Button href="/reset-password" className="flex-1">
              Open reset page
            </Button>
            <Button href="/login" variant="secondary" className="flex-1">
              Back to sign in
            </Button>
          </div>
          <p className="mt-4 text-center text-xs text-slate-400">
            Did not receive the message? Check your spam folder or contact the
            hospital IT help desk.
          </p>
        </Card>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Forgot password"
      subtitle="Enter your registered email, phone number or username and we will send you a reset link."
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormField
          label="Email, phone or username"
          htmlFor="identifier"
          required
          error={errors.identifier?.message}
        >
          <input
            id="identifier"
            type="text"
            autoComplete="username"
            placeholder="name@gondar-hospital.et"
            className="ghms-input"
            {...register("identifier")}
          />
        </FormField>

        {error ? (
          <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger dark:bg-danger/15" role="alert">
            {error}
          </p>
        ) : null}

        <Button type="submit" className="w-full" loading={isSubmitting}>
          {isSubmitting ? "Sending request…" : "Send reset link"}
        </Button>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          Remembered it?{" "}
          <Link href="/login" className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-300">
            Back to sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
