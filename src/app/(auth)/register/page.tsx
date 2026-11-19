"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import { authService, ApiError } from "@/services";
import { selfRegistrationSchema, type SelfRegistrationInput } from "@/validation/schemas";
import { AuthShell } from "@/components/auth/AuthShell";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";

const GENDERS = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Other", value: "other" },
];

/**
 * Patient self-registration. The form exposes no role/account-type fields and
 * the auth service always creates accounts with the fixed "Patient" role —
 * public users can never create administrator or staff accounts.
 */
export default function RegisterPage() {
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm<SelfRegistrationInput>({
    resolver: zodResolver(selfRegistrationSchema),
    mode: "onTouched",
    defaultValues: {
      firstName: "",
      middleName: "",
      lastName: "",
      gender: undefined,
      dateOfBirth: "",
      phone: "",
      email: "",
      address: "",
      password: "",
      confirmPassword: "",
      termsAccepted: undefined,
    },
  });

  const password = watch("password");
  const confirmPassword = watch("confirmPassword");
  const email = watch("email");
  const phone = watch("phone");

  // Dynamically re-evaluate confirmPassword when password changes to prevent false "Passwords do not match" errors
  useEffect(() => {
    if (confirmPassword && confirmPassword.length > 0) {
      void trigger("confirmPassword");
    }
  }, [password, confirmPassword, trigger]);

  // Clear server error banner whenever the user edits relevant inputs
  useEffect(() => {
    if (error) setError(null);
  }, [email, phone, password, confirmPassword]);

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const user = await authService.register({
        firstName: values.firstName,
        middleName: values.middleName || "",
        lastName: values.lastName,
        gender: values.gender,
        dateOfBirth: values.dateOfBirth,
        phone: values.phone,
        email: values.email,
        address: values.address,
        password: values.password, // request boundary only; never stored client-side
        termsAccepted: values.termsAccepted,
      });
      setAccountEmail(user.email);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.code === "EMAIL_ALREADY_EXISTS" || err.message.toLowerCase().includes("email")) {
          setFieldError("email", { message: err.message });
          setError(err.message);
        } else if (err.code === "PHONE_ALREADY_EXISTS" || err.message.toLowerCase().includes("phone")) {
          setFieldError("phone", { message: err.message });
          setError(err.message);
        } else {
          setError(err.message);
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Registration could not be completed. Please try again.");
      }
    }
  });

  if (accountEmail) {
    return (
      <AuthShell title="Account created successfully">
        <Card>
          <EmptyState
            icon={CheckCircle2}
            title="Account created"
            description={`Your patient account (${accountEmail}) has been created successfully. You can now sign in with your email and password to book appointments and view your hospital records.`}
            action={
              <Button href="/login">Go to sign in</Button>
            }
          />
        </Card>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your patient account"
      subtitle="Register to book appointments and access your hospital records online."
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="First name" htmlFor="firstName" required error={errors.firstName?.message}>
            <input id="firstName" type="text" autoComplete="given-name" className="ghms-input" {...register("firstName")} />
          </FormField>
          <FormField label="Middle name" htmlFor="middleName" error={errors.middleName?.message}>
            <input id="middleName" type="text" autoComplete="additional-name" className="ghms-input" {...register("middleName")} />
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Last name" htmlFor="lastName" required error={errors.lastName?.message}>
            <input id="lastName" type="text" autoComplete="family-name" className="ghms-input" {...register("lastName")} />
          </FormField>
          <FormField label="Gender" htmlFor="gender" required error={errors.gender?.message}>
            <select id="gender" className="ghms-input" defaultValue="" {...register("gender")}>
              <option value="" disabled>
                Select gender
              </option>
              {GENDERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Date of birth" htmlFor="dateOfBirth" required error={errors.dateOfBirth?.message}>
            <input id="dateOfBirth" type="date" max={new Date().toISOString().slice(0, 10)} className="ghms-input" {...register("dateOfBirth")} />
          </FormField>
          <FormField label="Phone" htmlFor="phone" required error={errors.phone?.message}>
            <input id="phone" type="tel" autoComplete="tel" placeholder="+251 9…" className="ghms-input" {...register("phone")} />
          </FormField>
        </div>

        <FormField label="Email" htmlFor="email" required error={errors.email?.message}>
          <input id="email" type="email" autoComplete="email" placeholder="you@example.com" className="ghms-input" {...register("email")} />
        </FormField>

        <FormField label="Address" htmlFor="address" required error={errors.address?.message}>
          <textarea id="address" rows={2} autoComplete="street-address" className="ghms-input resize-none" {...register("address")} />
        </FormField>

        <FormField label="Password" htmlFor="password" required error={errors.password?.message} hint="At least 8 characters with a letter and a number.">
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

        <div>
          <label htmlFor="termsAccepted" className="flex cursor-pointer items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              id="termsAccepted"
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500/40"
              {...register("termsAccepted")}
            />
            <span>
              I agree to the{" "}
              <span className="font-medium text-primary-600 dark:text-primary-300">Terms of Service</span> and{" "}
              <span className="font-medium text-primary-600 dark:text-primary-300">Privacy Policy</span>, including the
              processing of my health data for care purposes.
            </span>
          </label>
          {errors.termsAccepted ? (
            <p className="mt-1.5 text-xs font-medium text-danger" role="alert">
              {errors.termsAccepted.message}
            </p>
          ) : null}
        </div>

        {error ? (
          <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger dark:bg-danger/15" role="alert">
            {error}
          </p>
        ) : null}

        <Button type="submit" className="w-full" loading={isSubmitting}>
          {isSubmitting ? "Creating account…" : "Create account"}
        </Button>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          Already registered?{" "}
          <Link href="/login" className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-300">
            Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
