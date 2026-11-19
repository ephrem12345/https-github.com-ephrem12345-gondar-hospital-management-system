"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, CheckCircle2, Eye, EyeOff, LogOut, Save } from "lucide-react";
import { authService } from "@/services";
import { changePasswordSchema, type ChangePasswordInput } from "@/validation/schemas";
import { useTranslation, type Language } from "@/lib/i18n/I18nProvider";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import type { CurrentUser } from "@/types";

const LANGUAGES: Array<{ value: Language; label: string }> = [
  { value: "en", label: "English" },
  { value: "am", label: "አማርኛ (Amharic)" },
];

export default function ProfilePage() {
  const router = useRouter();
  const { language, setLanguage } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  useEffect(() => {
    setUser(authService.currentUser());
  }, []);

  const passwordForm = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", password: "", confirmPassword: "" },
  });

  const onPasswordSubmit = passwordForm.handleSubmit(async (values) => {
    setPasswordError(null);
    try {
      const result = await authService.changePassword(
        values.currentPassword,
        values.password,
      );
      setPasswordMessage(result.message);
      passwordForm.reset();
      window.setTimeout(() => setPasswordMessage(null), 5000);
    } catch {
      setPasswordError("The current password is incorrect or the change failed.");
    }
  });

  const handleLogout = async () => {
    setLoggingOut(true);
    setLogoutError(null);
    try {
      await authService.logout();
      router.push("/login");
    } catch {
      setLogoutError("Sign out could not reach the server. Your local session was cleared; try signing in again.");
      setLoggingOut(false);
    }
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatar(String(reader.result));
    reader.readAsDataURL(file);
  };

  const initials = user
    ? user.name
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "—";

  return (
    <>
      <PageHeader
        title="My profile"
        description="Manage your personal details, security and session."
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Identity card */}
        <Card className="xl:col-span-1">
          <div className="flex flex-col items-center px-6 py-8 text-center">
            <div className="relative">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatar}
                  alt="Profile photograph"
                  className="h-24 w-24 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-24 w-24 items-center justify-center rounded-full bg-primary-600 text-2xl font-bold text-white">
                  {initials}
                </span>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Change profile photograph"
                className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface-light bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 dark:border-surface-dark dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <Camera className="h-4 w-4" aria-hidden />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <p className="mt-4 text-lg font-semibold text-slate-800 dark:text-white">
              {user?.name ?? "—"}
            </p>
            <p className="mt-1 inline-flex rounded-full bg-light-blue px-2.5 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary/15 dark:text-primary-300">
              {user?.role ?? "—"} · {user?.department ?? "—"}
            </p>

            <dl className="mt-6 w-full space-y-2.5 text-left text-sm">
              {[
                ["Email", user?.email ?? "—"],
                ["Phone", user?.phone ?? "—"],
                ["Staff / patient ID", user?.id ?? "—"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4">
                  <dt className="text-slate-400">{label}</dt>
                  <dd className="truncate font-medium text-slate-700 dark:text-slate-200">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>

            <Button
              variant="danger"
              className="mt-6 w-full"
              loading={loggingOut}
              onClick={handleLogout}
              leftIcon={<LogOut className="h-4 w-4" aria-hidden />}
            >
              {loggingOut ? "Signing out…" : "Sign out of this device"}
            </Button>
            {logoutError ? <p className="mt-2 text-sm text-danger" role="alert">{logoutError}</p> : null}
          </div>
        </Card>

        <div className="flex flex-col gap-4 xl:col-span-2">
          {/* Editable details */}
          <Card>
            <CardHeader
              title="Profile information"
              subtitle="Changes are saved to your account when you press save."
            />
            <form
              className="px-6 pb-6"
              onSubmit={(event) => {
                event.preventDefault();
                if (!user) return;
                const form = event.target as HTMLFormElement;
                const data = new FormData(form);
                authService
                  .updateProfile({
                    name: String(data.get("name") ?? user.name),
                    email: String(data.get("email") ?? user.email),
                    phone: String(data.get("phone") ?? user.phone),
                    preferredLanguage: String(data.get("language") ?? language),
                  })
                  .then(setUser)
                  .then(() => {
                    const chosen = String(data.get("language") ?? "en") as Language;
                    if (chosen !== language) setLanguage(chosen);
                    setProfileMessage("Profile updated successfully.");
                    window.setTimeout(() => setProfileMessage(null), 4000);
                  });
              }}
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Full name" htmlFor="name" required>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    defaultValue={user?.name}
                    key={`name-${user?.id ?? "loading"}`}
                    className="ghms-input"
                    required
                  />
                </FormField>
                <FormField label="Email" htmlFor="email" required>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={user?.email}
                    key={`email-${user?.id ?? "loading"}`}
                    className="ghms-input"
                    required
                  />
                </FormField>
                <FormField label="Phone" htmlFor="phone" required>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    defaultValue={user?.phone}
                    key={`phone-${user?.id ?? "loading"}`}
                    className="ghms-input"
                    required
                  />
                </FormField>
                <FormField label="Preferred language" htmlFor="language">
                  <select
                    id="language"
                    name="language"
                    defaultValue={language}
                    className="ghms-input"
                  >
                    {LANGUAGES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Role" htmlFor="role">
                  <input
                    id="role"
                    type="text"
                    value={user?.role ?? "—"}
                    disabled
                    className="ghms-input cursor-not-allowed opacity-60"
                  />
                </FormField>
                <FormField label="Department" htmlFor="department">
                  <input
                    id="department"
                    type="text"
                    value={user?.department ?? "—"}
                    disabled
                    className="ghms-input cursor-not-allowed opacity-60"
                  />
                </FormField>
              </div>

              {profileMessage ? (
                <p
                  className="mt-4 flex items-center gap-2 rounded-lg bg-success-soft px-3 py-2 text-sm text-success dark:bg-success/15 dark:text-green-400"
                  role="status"
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                  {profileMessage}
                </p>
              ) : null}

              <div className="mt-6 flex justify-end border-t border-slate-100 pt-4 dark:border-slate-800">
                <Button type="submit" leftIcon={<Save className="h-4 w-4" aria-hidden />}>
                  Save changes
                </Button>
              </div>
            </form>
          </Card>

          {/* Change password */}
          <Card>
            <CardHeader
              title="Change password"
              subtitle="Use at least 8 characters including a letter and a number."
            />
            <form onSubmit={onPasswordSubmit} className="px-6 pb-6" noValidate>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  label="Current password"
                  htmlFor="currentPassword"
                  required
                  error={passwordForm.formState.errors.currentPassword?.message}
                >
                  <div className="relative">
                    <input
                      id="currentPassword"
                      type={showCurrent ? "text" : "password"}
                      autoComplete="current-password"
                      className="ghms-input pr-10"
                      {...passwordForm.register("currentPassword")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent((value) => !value)}
                      aria-label={showCurrent ? "Hide password" : "Show password"}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      {showCurrent ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                    </button>
                  </div>
                </FormField>
                <FormField
                  label="New password"
                  htmlFor="newPassword"
                  required
                  error={passwordForm.formState.errors.password?.message}
                >
                  <div className="relative">
                    <input
                      id="newPassword"
                      type={showNew ? "text" : "password"}
                      autoComplete="new-password"
                      className="ghms-input pr-10"
                      {...passwordForm.register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew((value) => !value)}
                      aria-label={showNew ? "Hide password" : "Show password"}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      {showNew ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                    </button>
                  </div>
                </FormField>
                <FormField
                  label="Confirm new password"
                  htmlFor="confirmNewPassword"
                  required
                  error={passwordForm.formState.errors.confirmPassword?.message}
                  className="sm:col-span-2"
                >
                  <div className="relative">
                    <input
                      id="confirmNewPassword"
                      type={showConfirm ? "text" : "password"}
                      autoComplete="new-password"
                      className="ghms-input pr-10"
                      {...passwordForm.register("confirmPassword")}
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
              </div>

              {passwordMessage ? (
                <p
                  className="mt-4 flex items-center gap-2 rounded-lg bg-success-soft px-3 py-2 text-sm text-success dark:bg-success/15 dark:text-green-400"
                  role="status"
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                  {passwordMessage}
                </p>
              ) : null}
              {passwordError ? (
                <p
                  className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger dark:bg-danger/15"
                  role="alert"
                >
                  {passwordError}
                </p>
              ) : null}

              <div className="mt-6 flex justify-end border-t border-slate-100 pt-4 dark:border-slate-800">
                <Button type="submit" loading={passwordForm.formState.isSubmitting}>
                  Update password
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
