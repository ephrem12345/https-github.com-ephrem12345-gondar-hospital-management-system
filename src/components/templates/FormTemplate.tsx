"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { FieldInput } from "./FieldInput";
import type { FormScreen } from "@/modules/types";
import { cn } from "@/lib/utils/cn";

/**
 * Standard module data-entry screen: sectioned form driven by a Zod schema
 * and React Hook Form, with a confirmation step and success state.
 */
export function FormTemplate({
  title,
  screen,
}: {
  title: string;
  screen: FormScreen;
}) {
  const {
    schema,
    sections,
    submitLabel = "Save",
    confirmTitle = "Confirm submission",
    confirmMessage = "Are you sure you want to submit this form? The details will be recorded once confirmed.",
    successTitle,
    successDescription,
    backHref,
  } = screen;

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema as never),
  });

  const onSubmit = handleSubmit(() => setConfirmOpen(true), undefined);

  const handleConfirm = async () => {
    // Backend integration point — simulated latency for this phase.
    await new Promise((resolve) => setTimeout(resolve, 400));
    setConfirmOpen(false);
    setSaved(true);
  };

  if (saved) {
    return (
      <>
        <PageHeader title={title} description={screen.description} />
        <Card>
          <EmptyState
            icon={CheckCircle2}
            title={successTitle}
            description={successDescription}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    reset();
                    setSaved(false);
                  }}
                >
                  Create another
                </Button>
                {backHref ? (
                  <Button href={backHref} leftIcon={<ArrowLeft className="h-4 w-4" aria-hidden />}>
                    Back
                  </Button>
                ) : (
                  <Button href="/">Back to dashboard</Button>
                )}
              </div>
            }
          />
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={title}
        description={screen.description}
        actions={
          backHref ? (
            <Button
              variant="secondary"
              href={backHref}
              leftIcon={<ArrowLeft className="h-4 w-4" aria-hidden />}
            >
              Back
            </Button>
          ) : undefined
        }
      />

      <Card>
        <form onSubmit={onSubmit} noValidate>
          {sections.map((section, sectionIndex) => (
            <fieldset
              key={section.title ?? sectionIndex}
              className={cn(sectionIndex > 0 && "mt-6 border-t border-slate-100 pt-6 dark:border-slate-800")}
            >
              {section.title ? (
                <legend className="mb-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {section.title}
                </legend>
              ) : null}
              {section.description ? (
                <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
                  {section.description}
                </p>
              ) : null}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {section.fields.map((field) => (
                  <FormField
                    key={field.name}
                    label={field.type === "checkbox" ? "" : field.label}
                    htmlFor={field.name}
                    required={field.required}
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
            </fieldset>
          ))}

          <div className="mt-8 flex items-center justify-end gap-3 border-t border-slate-100 pt-6 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => reset()}>
              Reset
            </Button>
            <Button type="submit">{submitLabel}</Button>
          </div>
        </form>
      </Card>

      <ConfirmationDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
        title={confirmTitle}
        message={confirmMessage}
        confirmLabel={submitLabel}
        tone="primary"
      />
    </>
  );
}
