"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CheckCircle2, Printer, Save, UserRoundPlus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { FieldInput } from "@/components/templates/FieldInput";
import { patientRegistrationSchema, type PatientRegistrationInput } from "@/validation/schemas";

const formSections: Array<{ title: string; description?: string; fields: Array<{
  name: keyof PatientRegistrationInput | "age";
  label: string;
  type: "text" | "tel" | "email" | "date" | "select" | "textarea";
  required?: boolean;
  placeholder?: string;
  span?: 1 | 2;
  options?: Array<{ label: string; value: string }>;
}> }> = [
  {
    title: "Personal information",
    fields: [
      { name: "firstName", label: "First name", type: "text", required: true, placeholder: "e.g. Selam" },
      { name: "middleName", label: "Middle name", type: "text", placeholder: "Optional" },
      { name: "lastName", label: "Last name", type: "text", required: true, placeholder: "e.g. Bekele" },
      { name: "gender", label: "Gender", type: "select", required: true, options: [
        { label: "Select gender", value: "" },
        { label: "Male", value: "male" },
        { label: "Female", value: "female" },
      ]},
      { name: "dateOfBirth", label: "Date of birth", type: "date", required: true },
      { name: "age", label: "Age", type: "text", placeholder: "Calculated automatically" },
      { name: "photograph", label: "Photograph", type: "text", placeholder: "Upload image via future backend integration" },
    ],
  },
  {
    title: "Contact information",
    fields: [
      { name: "phone", label: "Phone number", type: "tel", required: true, placeholder: "+251 9xx xxx xxx" },
      { name: "alternativePhone", label: "Alternative phone", type: "tel", placeholder: "+251 9xx xxx xxx" },
      { name: "email", label: "Email", type: "email", placeholder: "patient@example.com" },
      { name: "region", label: "Region", type: "text", placeholder: "Amhara" },
      { name: "zone", label: "Zone", type: "text", placeholder: "North Gondar" },
      { name: "city", label: "City", type: "text", placeholder: "Gondar" },
      { name: "woreda", label: "Woreda", type: "text", placeholder: "Woreda 01" },
      { name: "kebele", label: "Kebele", type: "text", placeholder: "Kebele 05" },
      { name: "detailedAddress", label: "Detailed address", type: "textarea", span: 2, placeholder: "House number, street name, landmark" },
    ],
  },
  {
    title: "Medical identification",
    description: "Clinical details used for triage, history and pharmacy matching.",
    fields: [
      { name: "department", label: "Registering department", type: "select", required: true, options: [
        { label: "Select department", value: "" },
        { label: "Internal Medicine", value: "Internal Medicine" },
        { label: "Surgery", value: "Surgery" },
        { label: "Pediatrics", value: "Pediatrics" },
        { label: "Gynecology & Obstetrics", value: "Gynecology & Obstetrics" },
        { label: "Orthopedics", value: "Orthopedics" },
        { label: "Dentistry", value: "Dentistry" },
        { label: "Ophthalmology", value: "Ophthalmology" },
      ]},
      { name: "bloodGroup", label: "Blood group", type: "select", options: [
        { label: "Unknown", value: "" },
        { label: "A+", value: "A+" },
        { label: "A-", value: "A-" },
        { label: "B+", value: "B+" },
        { label: "B-", value: "B-" },
        { label: "AB+", value: "AB+" },
        { label: "AB-", value: "AB-" },
        { label: "O+", value: "O+" },
        { label: "O-", value: "O-" },
      ]},
      { name: "allergies", label: "Known allergies", type: "textarea", span: 2, placeholder: "List major medication or food allergies" },
      { name: "medicalConditions", label: "Relevant existing medical conditions", type: "textarea", span: 2, placeholder: "e.g. hypertension, asthma, diabetes" },
    ],
  },
  {
    title: "Emergency contact",
    fields: [
      { name: "emergencyContactName", label: "Contact name", type: "text", placeholder: "Full name" },
      { name: "emergencyRelationship", label: "Relationship", type: "text", placeholder: "Spouse, parent, sibling" },
      { name: "emergencyContactPhone", label: "Phone number", type: "tel", placeholder: "+251 9xx xxx xxx" },
      { name: "emergencyAddress", label: "Address", type: "text", placeholder: "Address or locality" },
    ],
  },
  {
    title: "Guardian information",
    fields: [
      { name: "guardianName", label: "Guardian name", type: "text", placeholder: "Full name" },
      { name: "guardianRelationship", label: "Relationship", type: "text", placeholder: "Parent, relative, caretaker" },
      { name: "guardianContact", label: "Contact details", type: "text", placeholder: "+251 9xx xxx xxx / email" },
    ],
  },
  {
    title: "Insurance",
    fields: [
      { name: "insuranceProvider", label: "Insurance provider", type: "text", placeholder: "e.g. EHIA" },
      { name: "policyNumber", label: "Policy number", type: "text", placeholder: "Policy / card number" },
      { name: "coverageDetails", label: "Coverage information", type: "textarea", span: 2, placeholder: "Coverage level, benefit notes, policy limits" },
    ],
  },
];

export function PatientRegistrationScreen({ title }: { title: string }) {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<PatientRegistrationInput>({
    resolver: zodResolver(patientRegistrationSchema),
    defaultValues: {
      firstName: "",
      middleName: "",
      lastName: "",
      gender: "male",
      dateOfBirth: "",
      phone: "",
      alternativePhone: "",
      email: "",
      region: "",
      zone: "",
      city: "",
      woreda: "",
      kebele: "",
      detailedAddress: "",
      bloodGroup: "",
      allergies: "",
      medicalConditions: "",
      emergencyContactName: "",
      emergencyRelationship: "",
      emergencyContactPhone: "",
      emergencyAddress: "",
      guardianName: "",
      guardianRelationship: "",
      guardianContact: "",
      insuranceProvider: "",
      policyNumber: "",
      coverageDetails: "",
      department: "",
      photograph: "",
    },
  });

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const dob = watch("dateOfBirth");
  const age = useMemo(() => {
    if (!dob || Number.isNaN(Date.parse(dob))) return "";
    const birth = new Date(dob);
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    const monthDiff = now.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
      years -= 1;
    }
    return `${years} years`;
  }, [dob]);

  const onSubmit = handleSubmit(() => setConfirmOpen(true));

  const handleConfirm = async () => {
    await new Promise((resolve) => setTimeout(resolve, 350));
    setConfirmOpen(false);
    setSaved(true);
  };

  if (saved) {
    return (
      <>
        <PageHeader title={title} description="Patient registration completed successfully." />
        <Card>
          <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success-soft text-success dark:bg-success/15 dark:text-green-400">
              <CheckCircle2 className="h-8 w-8" aria-hidden />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Patient registered</h2>
              <p className="mt-2 max-w-lg text-sm text-slate-600 dark:text-slate-300">
                The record has been prepared for review. This is a frontend preview only; no patient data is persisted yet.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Button variant="secondary" onClick={() => { reset(); setSaved(false); }}>
                Register another
              </Button>
              <Button href="/patients" leftIcon={<ArrowLeft className="h-4 w-4" aria-hidden />}>
                Back to patients
              </Button>
            </div>
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={title}
        description="Capture complete patient demographics and relevant clinical information for registration and intake."
        actions={
          <Button variant="secondary" href="/patients" leftIcon={<ArrowLeft className="h-4 w-4" aria-hidden />}>
            Patient list
          </Button>
        }
      />

      <Card>
        <form onSubmit={onSubmit} noValidate className="space-y-8">
          {formSections.map((section, index) => (
            <fieldset key={section.title} className={index > 0 ? "border-t border-slate-100 pt-6 dark:border-slate-800" : undefined}>
              <legend className="mb-1 text-base font-semibold text-slate-800 dark:text-slate-200">{section.title}</legend>
              {section.description ? (
                <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">{section.description}</p>
              ) : null}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {section.fields.map((field) => {
                  const fieldKey = field.name as keyof PatientRegistrationInput;
                  const error = field.name === "age" ? undefined : (errors[fieldKey]?.message as string | undefined);
                  const fieldClass = field.span === 2 ? "md:col-span-2" : undefined;
                  return (
                    <FormField
                      key={field.name}
                      label={field.label}
                      htmlFor={field.name}
                      required={field.required}
                      error={error}
                      className={fieldClass}
                    >
                      {field.name === "age" ? (
                        <div className="ghms-input flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                          {age || "Not calculated yet"}
                        </div>
                      ) : (
                        <FieldInput field={{ ...field, placeholder: field.placeholder }} registration={register(fieldKey)} />
                      )}
                    </FormField>
                  );
                })}
              </div>
            </fieldset>
          ))}

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => reset()}>
              Cancel
            </Button>
            <Button type="button" variant="secondary" onClick={() => window.print()} leftIcon={<Printer className="h-4 w-4" aria-hidden />}>
              Print details
            </Button>
            <Button type="button" variant="secondary" onClick={handleSubmit(() => { setConfirmOpen(true); })} leftIcon={<Save className="h-4 w-4" aria-hidden />}>
              Save and register another
            </Button>
            <Button type="submit" leftIcon={<UserRoundPlus className="h-4 w-4" aria-hidden />}>
              Save patient
            </Button>
          </div>
        </form>
      </Card>

      <ConfirmationDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
        title="Register patient"
        message="Create the patient record and issue a new MRN? This is a frontend preview only."
        confirmLabel="Confirm registration"
        tone="primary"
      />
    </>
  );
}
