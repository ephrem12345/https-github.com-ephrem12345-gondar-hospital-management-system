import type {
  ClinicalAllergyInput,
  ClinicalConsultationInput,
  ClinicalDiagnosisInput,
  ClinicalReferralInput,
  ClinicalTreatmentPlanInput,
  ClinicalVitalSignsInput,
  NursingNoteInput,
} from "@/validation/schemas";

export type ClinicalRecordStatus = "draft" | "finalized";

export interface ClinicalRecord<TInput> {
  id: string;
  patientId: string;
  patientLabel: string;
  recordedAt: string;
  recordedBy: string;
  status: ClinicalRecordStatus;
  data: TInput;
}

export interface ClinicalEncounterSummary {
  id: string;
  patientId: string;
  patientLabel: string;
  department: string;
  clinician: string;
  startedAt: string;
  status: "Active" | "Pending note" | "Follow-up";
  summary: string;
}

export interface ClinicalTimelineEvent {
  id: string;
  patientId: string;
  type: "Consultation" | "Diagnosis" | "Prescription" | "Laboratory result" | "Admission" | "Discharge summary" | "Nursing note" | "Vital signs" | "Referral";
  occurredAt: string;
  recordedBy: string;
  summary: string;
  status: ClinicalRecordStatus | "Recorded";
}

export interface ClinicalAllergyRecord {
  id: string;
  patientId: string;
  allergyName: string;
  reaction: string;
  severity: "mild" | "moderate" | "severe";
  verificationStatus: "unverified" | "verified";
  recordedAt: string;
}

export interface ClinicalReferralRecord {
  id: string;
  patientId: string;
  referralType: "internal" | "external";
  receivingDepartment: string;
  referralReason: string;
  referringDoctor: string;
  priority: "routine" | "urgent" | "emergency";
  status: "pending" | "accepted" | "completed" | "cancelled";
  documents: string[];
}

/** Future backend boundary; this frontend currently uses local demonstration state only. */
export interface ClinicalRecordsService {
  searchPatients(query: string): Promise<Array<{ id: string; label: string }>>;
  listEncounters(): Promise<ClinicalEncounterSummary[]>;
  listTimeline(patientId: string): Promise<ClinicalTimelineEvent[]>;
  listConsultations(patientId: string): Promise<Array<ClinicalRecord<ClinicalConsultationInput>>>;
  listNursingNotes(patientId: string): Promise<Array<ClinicalRecord<NursingNoteInput>>>;
  listVitalSigns(patientId: string): Promise<Array<ClinicalRecord<ClinicalVitalSignsInput>>>;
  listDiagnoses(patientId: string): Promise<Array<ClinicalRecord<ClinicalDiagnosisInput>>>;
  listAllergies(patientId: string): Promise<ClinicalAllergyRecord[]>;
  listTreatmentPlans(patientId: string): Promise<Array<ClinicalRecord<ClinicalTreatmentPlanInput>>>;
  listReferrals(patientId: string): Promise<ClinicalReferralRecord[]>;
  saveConsultation(input: ClinicalConsultationInput, status: ClinicalRecordStatus): Promise<ClinicalRecord<ClinicalConsultationInput>>;
  saveNursingNote(input: NursingNoteInput): Promise<ClinicalRecord<NursingNoteInput>>;
  recordVitalSigns(input: ClinicalVitalSignsInput): Promise<ClinicalRecord<ClinicalVitalSignsInput>>;
  recordDiagnosis(input: ClinicalDiagnosisInput): Promise<ClinicalRecord<ClinicalDiagnosisInput>>;
  recordAllergy(input: ClinicalAllergyInput): Promise<ClinicalRecord<ClinicalAllergyInput>>;
  saveTreatmentPlan(input: ClinicalTreatmentPlanInput): Promise<ClinicalRecord<ClinicalTreatmentPlanInput>>;
  createReferral(input: ClinicalReferralInput): Promise<ClinicalRecord<ClinicalReferralInput>>;
}
