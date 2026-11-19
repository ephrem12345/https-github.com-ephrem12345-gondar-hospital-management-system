import { z } from "zod";

/**
 * Zod validation schemas for the foundation phase.
 * These are wired into pages in upcoming phases (patient registration,
 * user management) together with React Hook Form via @hookform/resolvers.
 */

/** Shared password policy used by login, registration and reset flows. */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(64, "Password must be at most 64 characters")
  .regex(/[A-Za-z]/, "Password must contain a letter")
  .regex(/\d/, "Password must contain a number");

const phoneSchema = z
  .string()
  .min(9, "Enter a valid phone number")
  .regex(/^[+\d\s()-]+$/, "Phone number contains invalid characters");

const identifierSchema = z
  .string()
  .min(1, "Enter your email, phone or username")
  .refine(
    (value) =>
      value.includes("@")
        ? z.string().email().safeParse(value).success
        : value.length >= 3,
    { message: "Enter a valid email address or username" },
  );

export const loginSchema = z.object({
  identifier: identifierSchema,
  password: z.string().min(1, "Password is required"),
  remember: z.boolean().optional(),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const selfRegistrationSchema = z
  .object({
    firstName: z
      .string()
      .min(2, "First name is required")
      .max(50, "First name is too long"),
    middleName: z.string().max(50, "Middle name is too long").optional().or(z.literal("")),
    lastName: z
      .string()
      .min(2, "Last name is required")
      .max(50, "Last name is too long"),
    gender: z.enum(["male", "female", "other"], { message: "Select a gender" }),
    dateOfBirth: z
      .string()
      .min(1, "Date of birth is required")
      .refine((value) => !Number.isNaN(Date.parse(value)), {
        message: "Enter a valid date",
      })
      .refine((value) => new Date(value) <= new Date(), {
        message: "Date of birth cannot be in the future",
      }),
    phone: phoneSchema,
    email: z.string().min(1, "Email is required").email("Enter a valid email"),
    address: z.string().min(4, "Address is required").max(200, "Address is too long"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
    termsAccepted: z.literal(true, {
      message: "You must accept the terms and privacy policy",
    }),
  })
  .refine((data) => !data.confirmPassword || data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type SelfRegistrationInput = z.infer<typeof selfRegistrationSchema>;

export const forgotPasswordSchema = z.object({
  identifier: identifierSchema,
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is missing or invalid"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => !data.confirmPassword || data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password !== data.currentPassword, {
    message: "New password must be different from the current password",
    path: ["password"],
  })
  .refine((data) => !data.confirmPassword || data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const patientRegistrationSchema = z.object({
  firstName: z.string().min(2, "First name is required").max(50, "First name is too long"),
  middleName: z.string().max(50, "Middle name is too long").optional().or(z.literal("")),
  lastName: z.string().min(2, "Last name is required").max(50, "Last name is too long"),
  gender: z.enum(["male", "female"], { message: "Select a gender" }),
  dateOfBirth: z
    .string()
    .min(1, "Date of birth is required")
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: "Enter a valid date",
    })
    .refine((value) => new Date(value) <= new Date(), {
      message: "Date of birth cannot be in the future",
    }),
  phone: phoneSchema,
  alternativePhone: z.string().regex(/^[+\d\s()-]*$/, "Phone number contains invalid characters").optional(),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  region: z.string().max(80).optional().or(z.literal("")),
  zone: z.string().max(80).optional().or(z.literal("")),
  city: z.string().max(80).optional().or(z.literal("")),
  woreda: z.string().max(80).optional().or(z.literal("")),
  kebele: z.string().max(80).optional().or(z.literal("")),
  detailedAddress: z.string().max(200, "Address is too long").optional().or(z.literal("")),
  bloodGroup: z.string().max(10).optional().or(z.literal("")),
  allergies: z.string().max(200).optional().or(z.literal("")),
  medicalConditions: z.string().max(200).optional().or(z.literal("")),
  emergencyContactName: z.string().max(80).optional().or(z.literal("")),
  emergencyRelationship: z.string().max(60).optional().or(z.literal("")),
  emergencyContactPhone: z.string().regex(/^[+\d\s()-]*$/, "Phone number contains invalid characters").optional().or(z.literal("")),
  emergencyAddress: z.string().max(200).optional().or(z.literal("")),
  guardianName: z.string().max(80).optional().or(z.literal("")),
  guardianRelationship: z.string().max(60).optional().or(z.literal("")),
  guardianContact: z.string().max(120).optional().or(z.literal("")),
  insuranceProvider: z.string().max(80).optional().or(z.literal("")),
  policyNumber: z.string().max(80).optional().or(z.literal("")),
  coverageDetails: z.string().max(200).optional().or(z.literal("")),
  department: z.string().min(1, "Select a department"),
  photograph: z.any().optional(),
});
export type PatientRegistrationInput = z.infer<typeof patientRegistrationSchema>;

export const appointmentSchema = z.object({
  patientId: z.string().min(1, "Select a patient"),
  doctor: z.string().min(1, "Select a doctor"),
  department: z.string().min(1, "Select a department"),
  date: z
    .string()
    .min(1, "Date is required")
    .refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value, {
      message: "Enter a valid appointment date",
    }),
  time: z
    .string()
    .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Enter a valid time"),
  type: z.enum(["consultation", "follow-up", "emergency", "procedure"], {
    message: "Select an appointment type",
  }),
  reason: z.string().min(1, "Enter a reason for the appointment").max(200, "Reason is too long"),
  notes: z.string().max(500).optional(),
});
export type AppointmentInput = z.infer<typeof appointmentSchema>;

const optionalClinicalText = (max: number) =>
  z.string().max(max, `Must be ${max} characters or fewer`).optional().or(z.literal(""));

export const clinicalConsultationDraftSchema = z.object({
  patientId: z.string().min(1, "Select a patient"),
  presentingComplaint: optionalClinicalText(500),
  historyOfPresentIllness: optionalClinicalText(2000),
  pastMedicalHistory: optionalClinicalText(1500),
  surgicalHistory: optionalClinicalText(1500),
  familyHistory: optionalClinicalText(1500),
  socialHistory: optionalClinicalText(1500),
  currentMedications: optionalClinicalText(1500),
  allergies: optionalClinicalText(1000),
  examination: optionalClinicalText(2000),
  bloodPressure: optionalClinicalText(20),
  heartRate: optionalClinicalText(20),
  respiratoryRate: optionalClinicalText(20),
  temperature: optionalClinicalText(20),
  oxygenSaturation: optionalClinicalText(20),
  diagnosis: optionalClinicalText(1000),
  investigationRequests: optionalClinicalText(1000),
  treatmentPlan: optionalClinicalText(2000),
  followUpInstructions: optionalClinicalText(1000),
});

export const finalizedConsultationSchema = clinicalConsultationDraftSchema.extend({
  presentingComplaint: z.string().min(1, "Enter the presenting complaint").max(500),
  historyOfPresentIllness: z.string().min(1, "Enter the history of present illness").max(2000),
  examination: z.string().min(1, "Enter the clinical examination").max(2000),
  diagnosis: z.string().min(1, "Enter a diagnosis").max(1000),
  treatmentPlan: z.string().min(1, "Enter a treatment plan").max(2000),
});
export type ClinicalConsultationInput = z.infer<typeof clinicalConsultationDraftSchema>;

export const clinicalVitalSignsSchema = z.object({
  patientId: z.string().min(1, "Select a patient"),
  bloodPressure: z.string().regex(/^\d{2,3}\/\d{2,3}$/, "Enter blood pressure as systolic/diastolic"),
  heartRate: z.coerce.number().int().min(20).max(250),
  respiratoryRate: z.coerce.number().int().min(4).max(80),
  temperature: z.coerce.number().min(25).max(45),
  oxygenSaturation: z.coerce.number().int().min(50).max(100),
  weight: z.coerce.number().positive().max(500),
  height: z.coerce.number().positive().max(300),
  painScore: z.coerce.number().int().min(0).max(10),
});
export type ClinicalVitalSignsInput = z.infer<typeof clinicalVitalSignsSchema>;

export const nursingNoteSchema = z.object({
  patientId: z.string().min(1, "Select a patient"),
  nursingAssessment: z.string().min(1, "Enter the nursing assessment").max(2000),
  nursingNotes: optionalClinicalText(2000),
  carePlan: optionalClinicalText(2000),
  medicationAdministration: optionalClinicalText(1000),
  observations: optionalClinicalText(1500),
  shiftHandover: optionalClinicalText(1500),
});
export type NursingNoteInput = z.infer<typeof nursingNoteSchema>;

export const clinicalDiagnosisSchema = z.object({
  patientId: z.string().min(1, "Select a patient"),
  diagnosis: z.string().min(1, "Enter a diagnosis").max(300),
  diagnosisCode: z.string().max(30).optional().or(z.literal("")),
  diagnosisDate: z.string().min(1, "Select a diagnosis date"),
  clinician: z.string().min(1, "Enter the responsible clinician").max(120),
  clinicalNotes: optionalClinicalText(1500),
  primary: z.enum(["yes", "no"]),
});
export type ClinicalDiagnosisInput = z.infer<typeof clinicalDiagnosisSchema>;

export const clinicalAllergySchema = z.object({
  patientId: z.string().min(1, "Select a patient"),
  allergyName: z.string().min(1, "Enter an allergy").max(120),
  reaction: z.string().min(1, "Enter the reaction").max(300),
  severity: z.enum(["mild", "moderate", "severe"]),
  verificationStatus: z.enum(["unverified", "verified"]),
});
export type ClinicalAllergyInput = z.infer<typeof clinicalAllergySchema>;

export const clinicalTreatmentPlanSchema = z.object({
  patientId: z.string().min(1, "Select a patient"),
  treatmentInstructions: z.string().min(1, "Enter treatment instructions").max(2000),
  medicationPlan: optionalClinicalText(1500),
  followUpPlan: optionalClinicalText(1000),
  requestedInvestigations: optionalClinicalText(1000),
  referrals: optionalClinicalText(1000),
});
export type ClinicalTreatmentPlanInput = z.infer<typeof clinicalTreatmentPlanSchema>;

export const clinicalReferralSchema = z.object({
  patientId: z.string().min(1, "Select a patient"),
  referralType: z.enum(["internal", "external"]),
  receivingDepartment: z.string().min(1, "Select a receiving department"),
  referralReason: z.string().min(1, "Enter a referral reason").max(1000),
  referringDoctor: z.string().min(1, "Enter the referring doctor").max(120),
  priority: z.enum(["routine", "urgent", "emergency"]),
  documents: optionalClinicalText(1000),
});
export type ClinicalReferralInput = z.infer<typeof clinicalReferralSchema>;

export const laboratoryResultSchema = z
  .object({
    orderId: z.string().min(1, "Select a laboratory order"),
    patientId: z.string().min(1, "Patient identifier is required"),
    testName: z.string().min(1, "Select a test"),
    kind: z.enum(["numeric", "text", "qualitative"]),
    value: z.string().min(1, "Enter a result").max(1000, "Result is too long"),
    unit: z.string().max(40, "Unit is too long").optional().or(z.literal("")),
    referenceInterval: z.string().max(100, "Reference interval is too long").optional().or(z.literal("")),
    abnormalIndicator: z.enum(["Normal", "Low", "High", "Abnormal", "Critical"]),
    technicianComments: z.string().max(1000, "Comments are too long").optional().or(z.literal("")),
  })
  .superRefine((result, context) => {
    if (result.kind === "numeric" && !Number.isFinite(Number(result.value))) {
      context.addIssue({
        code: "custom",
        message: "Enter a valid numeric result",
        path: ["value"],
      });
    }
    if (
      result.kind === "qualitative" &&
      !["Positive", "Negative", "Indeterminate"].includes(result.value)
    ) {
      context.addIssue({
        code: "custom",
        message: "Choose Positive, Negative or Indeterminate",
        path: ["value"],
      });
    }
  });
export type LaboratoryResultInput = z.infer<typeof laboratoryResultSchema>;
