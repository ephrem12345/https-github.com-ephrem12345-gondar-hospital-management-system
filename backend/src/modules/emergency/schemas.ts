import { z } from "zod";

const departmentSchema = z.enum([
  "Emergency",
  "Internal Medicine",
  "Surgery",
  "Pediatrics",
  "Gynecology and Obstetrics",
  "Orthopedics",
  "Dentistry",
  "Ophthalmology",
  "Dermatology",
  "Psychiatry",
  "ICU",
  "Physiotherapy",
]);

export const emergencyRegistrationSchema = z.object({
  patientIdentifier: z.string().trim().min(1).max(32).optional(),
  newPatient: z.object({
    firstName: z.string().trim().min(1).max(50),
    middleName: z.string().trim().max(50).optional(),
    lastName: z.string().trim().min(1).max(50),
    sex: z.string().trim().min(1).max(20),
    dateOfBirth: z.coerce.date(),
    phone: z.string().trim().min(1).max(32),
    department: z.string().trim().min(1).max(100).default("Emergency"),
  }).optional(),
  unidentified: z.boolean().default(false),
  temporaryPatient: z.object({
    fullName: z.string().trim().max(120).optional(),
    sex: z.string().trim().max(20).optional(),
    dateOfBirth: z.coerce.date().optional(),
    phone: z.string().trim().max(32).optional(),
  }).optional(),
  arrivalAt: z.coerce.date().optional(),
  arrivalMode: z.string().trim().min(1).max(40),
  presentingComplaint: z.string().trim().min(1).max(2000),
}).refine(
  (value) => Number(Boolean(value.patientIdentifier)) + Number(Boolean(value.newPatient)) + Number(value.unidentified) === 1,
  { message: "Provide an existing patient, new patient details, or mark the patient unidentified" },
);

export const emergencyTriageSchema = z.object({
  category: z.enum(["Red", "Orange", "Yellow", "Green", "Blue"]),
  priority: z.string().trim().min(1).max(40),
  assignedStaff: z.string().trim().min(1).max(120),
  assessmentNotes: z.string().trim().min(1).max(4000),
  vitalSigns: z.union([z.string().trim().min(1).max(2000), z.record(z.string(), z.unknown())]),
  protocolName: z.string().trim().max(160).optional(),
  protocolVersion: z.string().trim().max(60).optional(),
  reassessment: z.boolean().default(false),
});

export const emergencyWorkflowSchema = z.object({
  status: z.enum(["TRIAGE", "WAITING", "ASSESSMENT", "TREATMENT", "OBSERVATION", "ADMISSION", "REFERRAL", "TRANSFER", "DISCHARGE"]),
  destination: z.string().trim().max(160).optional(),
  instructions: z.string().trim().max(4000).optional(),
});

export const emergencyConsultationSchema = z.object({
  assessment: z.string().trim().min(1).max(4000),
  diagnosis: z.string().trim().min(1).max(300),
  treatment: z.string().trim().min(1).max(4000),
  investigations: z.string().trim().max(2000).optional(),
});

export const emergencyListQuerySchema = z.object({
  status: z.string().max(30).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const emergencyResourceSchema = z.object({
  resourceType: z.enum(["BED", "AMBULANCE"]),
  resourceId: z.string().trim().min(1).max(80),
});

export const departmentAssignmentSchema = z.object({
  patientId: z.string().trim().min(1).max(32),
  department: departmentSchema.exclude(["Emergency"]),
  focus: z.string().trim().min(1).max(300),
  clinician: z.string().trim().min(1).max(120),
});

const workflowKinds = [
  "medicine-consultation", "chronic-disease-follow-up", "investigation-request", "treatment-plan",
  "surgical-request", "preoperative-assessment", "anesthesia-documentation", "operation-note",
  "postoperative-monitoring", "pediatric-consultation", "growth-measurement", "immunization",
  "pediatric-follow-up", "pregnancy-registration", "antenatal-visit", "labor-monitoring",
  "delivery-documentation", "newborn-registration", "postnatal-follow-up", "orthopedic-consultation",
  "injury-fracture-record", "imaging-review", "rehabilitation-follow-up", "dental-examination",
  "dental-diagnosis", "dental-treatment", "eye-examination", "ophthalmology-imaging-report",
  "dermatology-consultation", "dermatology-treatment", "mental-health-assessment",
  "mental-health-treatment-plan", "icu-observation", "icu-medication-administration",
  "icu-equipment-assignment", "icu-admission-transfer", "physiotherapy-assessment",
  "therapy-session", "therapy-progress",
] as const;

export const departmentWorkflowSchema = z.object({
  patientId: z.string().trim().min(1).max(32),
  encounterId: z.string().uuid().optional(),
  department: departmentSchema.exclude(["Emergency"]),
  kind: z.enum(workflowKinds),
  details: z.record(z.string(), z.string()),
  summary: z.string().trim().min(1).max(500),
});

export const departmentListQuerySchema = z.object({
  department: departmentSchema.optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});
