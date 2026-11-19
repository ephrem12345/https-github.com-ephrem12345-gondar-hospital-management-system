"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { z } from "zod";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { FieldInput } from "./FieldInput";
import type { SettingsScreen } from "@/modules/types";
import { cn } from "@/lib/utils/cn";

/**
 * Grouped settings screen (e.g. Hospital Settings): each section renders a
 * card of fields with a single save action confirmed by a dialog.
 */
export function SettingsTemplate({
  title,
  screen,
}: {
  title: string;
  screen: SettingsScreen;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(z.record(z.string(), z.unknown()) as never) as never,
  });

  const onSubmit = handleSubmit(() => setConfirmOpen(true));
  const handleConfirm = async () => {
    // Backend integration point — simulated persistence for this phase.
    await new Promise((resolve) => setTimeout(resolve, 300));
    setConfirmOpen(false);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 4000);
  };

  return (
    <>
      <PageHeader title={title} description={screen.description} />

      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {screen.sections.map((section) => (
          <Card key={section.title}>
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {section.title}
            </h2>
            {section.description ? (
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {section.description}
              </p>
            ) : null}
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {section.fields.map((field) => (
                <FormField
                  key={field.name}
                  label={field.type === "checkbox" ? "" : field.label}
                  htmlFor={field.name}
                  hint={field.hint}
                  error={errors[field.name]?.message as string | undefined}
                  className={cn(
                    field.span === 2 && "sm:col-span-2",
                    field.type === "checkbox" && "sm:col-span-2",
                  )}
                >
                  {field.type === "checkbox" ? (
                    <label
                      htmlFor={field.name}
                      className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-300"
                    >
                      <FieldInput field={field} registration={register(field.name)} />
                      {field.label}
                    </label>
                  ) : (
                    <FieldInput field={field} registration={register(field.name)} />
                  )}
                </FormField>
              ))}
            </div>
          </Card>
        ))}

        <div className="flex items-center justify-end gap-3">
          {saved ? (
            <span className="flex items-center gap-1.5 text-sm font-medium text-success">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              Changes saved
            </span>
          ) : null}
          <Button type="submit">Save changes</Button>
        </div>
      </form>

      <ConfirmationDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
        title="Save changes"
        message="Apply these settings for the whole hospital? The values take effect for all users after saving."
        confirmLabel="Save changes"
        tone="primary"
      />
    </>
  );
}
