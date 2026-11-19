export type DiagnosticWorkflowSection =
  | "laboratory"
  | "catalog"
  | "orders"
  | "specimens"
  | "results"
  | "radiology"
  | "imaging-reports"
  | "attachments"
  | "blood-bank";

export type LaboratoryResultKind = "numeric" | "text" | "qualitative";
export type LaboratoryResultStatus = "Draft" | "Awaiting approval" | "Approved";

export interface LaboratoryTestCatalogItem {
  code: string;
  name: string;
  category: string;
  specimenType: string;
  instructions: string;
  unit: string;
  referenceInterval: string;
  servicePrice: number;
  status: "Active" | "Inactive";
}

export interface LaboratoryOrder {
  id: string;
  patientId: string;
  doctor: string;
  department: string;
  tests: string[];
  requestedAt: string;
  priority: "Routine" | "Urgent" | "STAT";
  status: string;
  assignedTo?: string;
}

export interface LaboratorySpecimen {
  id: string;
  orderId: string;
  patientId: string;
  specimenType: string;
  collectedAt: string;
  collectedBy: string;
  processingStatus: string;
  rejectionReason?: string;
  storageDetails?: string;
}

export interface LaboratoryResult {
  id: string;
  orderId: string;
  patientId: string;
  testName: string;
  kind: LaboratoryResultKind;
  value: string;
  unit: string;
  referenceInterval: string;
  abnormalIndicator: string;
  technicianComments: string;
  authorizedReviewer: string;
  reportDate: string;
  status: LaboratoryResultStatus;
}

export type ImagingModality = "X-ray" | "Ultrasound" | "CT" | "MRI" | "Other";

export interface RadiologyRequest {
  id: string;
  patientId: string;
  doctor: string;
  department: string;
  modality: ImagingModality;
  procedure: string;
  clinicalIndication: string;
  scheduledAt: string;
  status: string;
}

export interface ImagingReport {
  id: string;
  patientId: string;
  procedure: string;
  examinationDate: string;
  clinicalIndication: string;
  findings: string;
  impression: string;
  radiologist: string;
  approvalStatus: "Draft" | "Awaiting approval" | "Approved";
}

export interface DiagnosticAttachment {
  id: string;
  patientId: string;
  title: string;
  modality: ImagingModality;
  studyDate: string;
  mediaType: "Image" | "DICOM study" | "Document";
  access: "Restricted";
}

export interface BloodDonor {
  id: string;
  name: string;
  bloodGroup: string;
  lastDonation: string;
  eligibility: "Eligible" | "Deferred";
}

export interface BloodDonation {
  id: string;
  donorId: string;
  bloodGroup: string;
  donatedAt: string;
  units: number;
  screeningStatus: "Pending" | "Passed" | "Failed";
  status: string;
}

export interface BloodBankUnit {
  id: string;
  bloodGroup: string;
  component: string;
  quantity: number;
  expiresOn: string;
  screeningStatus: "Pending" | "Passed" | "Failed";
  status: string;
}

export interface BloodRequest {
  id: string;
  patientId: string;
  bloodGroup: string;
  component: string;
  unitsRequested: number;
  requestedBy: string;
  priority: "Routine" | "Urgent" | "Emergency";
  status: string;
}

export interface TransfusionRecord {
  id: string;
  patientId: string;
  bloodUnitId: string;
  startedAt: string;
  administeredBy: string;
  status: string;
}

/** API boundary for future server-backed diagnostics; demo UI state is not persisted. */
export interface DiagnosticWorkflowService {
  listTestCatalog(): Promise<LaboratoryTestCatalogItem[]>;
  listLaboratoryOrders(): Promise<LaboratoryOrder[]>;
  updateLaboratoryOrder(orderId: string, status: string, assignedTo?: string): Promise<LaboratoryOrder>;
  listSpecimens(): Promise<LaboratorySpecimen[]>;
  createSpecimen(specimen: Omit<LaboratorySpecimen, "id">): Promise<LaboratorySpecimen>;
  submitLaboratoryResult(result: Omit<LaboratoryResult, "id" | "status">): Promise<LaboratoryResult>;
  submitLaboratoryResultForApproval(resultId: string): Promise<LaboratoryResult>;
  listRadiologyRequests(): Promise<RadiologyRequest[]>;
  createRadiologyRequest(request: Omit<RadiologyRequest, "id" | "status">): Promise<RadiologyRequest>;
  listImagingReports(): Promise<ImagingReport[]>;
  submitImagingReport(report: Omit<ImagingReport, "id" | "approvalStatus">): Promise<ImagingReport>;
  listAttachments(patientId: string): Promise<DiagnosticAttachment[]>;
  listBloodDonors(): Promise<BloodDonor[]>;
  listBloodDonations(): Promise<BloodDonation[]>;
  listBloodInventory(): Promise<BloodBankUnit[]>;
  listBloodRequests(): Promise<BloodRequest[]>;
  listTransfusions(): Promise<TransfusionRecord[]>;
}
