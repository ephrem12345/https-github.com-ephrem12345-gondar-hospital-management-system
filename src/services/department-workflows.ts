export type DepartmentId =
  | "emergency"
  | "internal-medicine"
  | "surgery"
  | "pediatrics"
  | "gynecology-obstetrics"
  | "orthopedics"
  | "dentistry"
  | "ophthalmology"
  | "dermatology"
  | "psychiatry"
  | "icu"
  | "physiotherapy";

export type EmergencyTriageCategory = "Red" | "Orange" | "Yellow" | "Green" | "Blue";

export type EmergencyCaseStatus =
  | "Awaiting triage"
  | "Waiting"
  | "In assessment"
  | "In treatment"
  | "Observation"
  | "Admission requested"
  | "Referral"
  | "Transferred"
  | "Discharged";

export interface DepartmentPatientRecord {
  id: string;
  patientId: string;
  displayName: string;
  department: DepartmentId;
  focus: string;
  clinician: string;
  status: string;
  updatedAt: string;
}

export interface EmergencyCaseRecord {
  caseNumber: string;
  patientIdentifier: string;
  arrivalTime: string;
  triageCategory: EmergencyTriageCategory | "Untriaged";
  presentingComplaint: string;
  assignedDoctor: string;
  currentStatus: EmergencyCaseStatus;
  destination?: string;
}

export type SpecialtyWorkflowKind =
  | "medicine-consultation"
  | "chronic-disease-follow-up"
  | "investigation-request"
  | "treatment-plan"
  | "surgical-request"
  | "preoperative-assessment"
  | "anesthesia-documentation"
  | "operation-note"
  | "postoperative-monitoring"
  | "pediatric-consultation"
  | "growth-measurement"
  | "immunization"
  | "pediatric-follow-up"
  | "pregnancy-registration"
  | "antenatal-visit"
  | "labor-monitoring"
  | "delivery-documentation"
  | "newborn-registration"
  | "postnatal-follow-up"
  | "orthopedic-consultation"
  | "injury-fracture-record"
  | "imaging-review"
  | "rehabilitation-follow-up"
  | "dental-examination"
  | "dental-diagnosis"
  | "dental-treatment"
  | "eye-examination"
  | "ophthalmology-imaging-report"
  | "dermatology-consultation"
  | "dermatology-treatment"
  | "mental-health-assessment"
  | "mental-health-treatment-plan"
  | "icu-observation"
  | "icu-medication-administration"
  | "icu-equipment-assignment"
  | "icu-admission-transfer"
  | "physiotherapy-assessment"
  | "therapy-session"
  | "therapy-progress";

export type DepartmentWorkflowCommand =
  | {
      kind: "emergency-registration";
      patientId: string;
      presentingComplaint: string;
      arrivalTime: string;
      arrivalMode: string;
    }
  | {
      kind: "emergency-triage";
      caseNumber: string;
      triageCategory: EmergencyTriageCategory;
      assignedDoctor: string;
      assessment: string;
      vitalSigns: string;
    }
  | {
      kind: "emergency-disposition";
      caseNumber: string;
      disposition: "admit" | "transfer" | "discharge";
      destination: string;
      instructions: string;
    }
  | {
      kind: SpecialtyWorkflowKind;
      departmentId: Exclude<DepartmentId, "emergency">;
      patientId: string;
      details: Record<string, string>;
    };

export interface DepartmentWorkflowRecord {
  id: string;
  departmentId: DepartmentId;
  kind: DepartmentWorkflowCommand["kind"];
  patientId: string;
  recordedAt: string;
  recordedBy: string;
  status: "Draft" | "Submitted" | "Reviewed" | "Completed";
  summary: string;
  details: Record<string, string>;
}

export interface DepartmentReport {
  departmentId: DepartmentId;
  period: string;
  patientsSeen: number;
  openCases: number;
  completedWorkflows: number;
  statusBreakdown: Record<string, number>;
}

/** API boundary for the department UIs; current screens use synthetic local state only. */
export interface DepartmentWorkflowService {
  listPatients(departmentId: DepartmentId): Promise<DepartmentPatientRecord[]>;
  listEmergencyCases(): Promise<EmergencyCaseRecord[]>;
  registerEmergencyCase(input: Extract<DepartmentWorkflowCommand, { kind: "emergency-registration" }>): Promise<EmergencyCaseRecord>;
  updateEmergencyTriage(input: Extract<DepartmentWorkflowCommand, { kind: "emergency-triage" }>): Promise<EmergencyCaseRecord>;
  updateEmergencyStatus(caseNumber: string, status: EmergencyCaseStatus): Promise<EmergencyCaseRecord>;
  saveWorkflow(input: DepartmentWorkflowCommand): Promise<DepartmentWorkflowRecord>;
  getReport(departmentId: DepartmentId, period: string): Promise<DepartmentReport>;
}
