export type PharmacyWorkflowSection =
  | "dashboard"
  | "medicines"
  | "batches"
  | "prescriptions"
  | "dispensing"
  | "suppliers"
  | "procurement";

export type FacilityWorkflowSection =
  | "inpatient"
  | "wards"
  | "beds"
  | "admissions"
  | "discharges"
  | "operating-rooms"
  | "ambulance"
  | "general-inventory"
  | "assets"
  | "maintenance";

export interface MedicineRecord {
  id: string;
  genericName: string;
  brandName: string;
  category: string;
  strength: string;
  dosageForm: string;
  manufacturer: string;
  unit: string;
  price: number;
  reorderLevel: number;
}

export interface MedicineBatch {
  id: string;
  medicineId: string;
  medicineName: string;
  batchNumber: string;
  quantity: number;
  purchaseDate: string;
  expiryDate: string;
  supplier: string;
  storageLocation: string;
}

export interface PrescriptionMedicine {
  medicineId: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  quantity: number;
  dispensedQuantity: number;
}

export interface PharmacyPrescription {
  id: string;
  patientId: string;
  patientName: string;
  doctor: string;
  issuedAt: string;
  items: PrescriptionMedicine[];
  dispensingStatus: "Pending" | "Partial" | "Dispensed";
}

export interface DispensingRecord {
  id: string;
  prescriptionId: string;
  patientId: string;
  batchNumber: string;
  medicineName: string;
  quantity: number;
  dispensedAt: string;
  receiptNumber: string;
}

export interface PharmacySupplier {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  status: "Active" | "Inactive";
}

export interface ProcurementRecord {
  id: string;
  supplierId: string;
  supplierName: string;
  medicineName: string;
  quantity: number;
  requestedAt: string;
  status: "Requested" | "Purchase order" | "Received" | "Invoiced";
  invoiceNumber?: string;
}

export interface WardRecord {
  id: string;
  name: string;
  type: string;
  capacity: number;
  assignedStaff: string[];
}

export type BedStatus = "Available" | "Occupied" | "Reserved" | "Cleaning" | "Maintenance";

export interface BedRecord {
  id: string;
  wardId: string;
  status: BedStatus;
  patientId?: string;
  patientName?: string;
  history: string[];
}

export interface AdmissionRecord {
  id: string;
  patientId: string;
  patientName: string;
  doctor: string;
  wardId: string;
  bedId: string;
  reason: string;
  admittedAt: string;
  status: "Pending" | "Admitted" | "Discharged";
}

export interface DischargeRecord {
  id: string;
  patientId: string;
  admissionId: string;
  finalDiagnosis: string;
  medicationInstructions: string;
  followUpInstructions: string;
  requestedAt: string;
  authorizationStatus: "Pending authorization" | "Authorized";
}

export interface OperatingRoomRecord {
  id: string;
  name: string;
  status: "Available" | "Scheduled" | "In use" | "Cleaning" | "Maintenance";
  procedure?: string;
  patientId?: string;
  scheduledAt?: string;
  surgicalTeam?: string;
}

export interface AmbulanceRecord {
  id: string;
  vehicleNumber: string;
  driver: string;
  phone: string;
  status: "Available" | "Dispatched" | "Maintenance";
}

export interface AmbulanceTrip {
  id: string;
  ambulanceId: string;
  destination: string;
  patientId: string;
  dispatchedAt: string;
  status: "Requested" | "Dispatched" | "Completed";
}

export interface AmbulanceMaintenanceRecord {
  id: string;
  ambulanceId: string;
  description: string;
  requestedAt: string;
  status: "Open" | "In progress" | "Completed";
}

export interface GeneralInventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  location: string;
  reorderLevel: number;
}

export interface HospitalAsset {
  id: string;
  name: string;
  category: string;
  serialNumber: string;
  assignedDepartment: string;
  location: string;
  condition: "Operational" | "Needs maintenance" | "Out of service";
}

export interface MaintenanceRequest {
  id: string;
  assetId: string;
  description: string;
  priority: "Routine" | "Urgent" | "Critical";
  requestedAt: string;
  status: "Open" | "In progress" | "Completed";
}

/** API integration boundary; current frontends use only in-memory synthetic data. */
export interface PharmacyWorkflowService {
  listMedicines(): Promise<MedicineRecord[]>;
  listBatches(): Promise<MedicineBatch[]>;
  listPrescriptions(): Promise<PharmacyPrescription[]>;
  dispense(input: Omit<DispensingRecord, "id" | "receiptNumber" | "dispensedAt">): Promise<DispensingRecord>;
  listSuppliers(): Promise<PharmacySupplier[]>;
  listProcurement(): Promise<ProcurementRecord[]>;
}

export interface HospitalOperationsService {
  listWards(): Promise<WardRecord[]>;
  listBeds(): Promise<BedRecord[]>;
  listAdmissions(): Promise<AdmissionRecord[]>;
  requestDischarge(input: Omit<DischargeRecord, "id" | "requestedAt" | "authorizationStatus">): Promise<DischargeRecord>;
  listOperatingRooms(): Promise<OperatingRoomRecord[]>;
  listAmbulances(): Promise<AmbulanceRecord[]>;
  listAmbulanceTrips(): Promise<AmbulanceTrip[]>;
  listAmbulanceMaintenance(): Promise<AmbulanceMaintenanceRecord[]>;
  createAmbulanceMaintenance(ambulanceId: string, description: string): Promise<AmbulanceMaintenanceRecord>;
  listInventory(): Promise<GeneralInventoryItem[]>;
  listAssets(): Promise<HospitalAsset[]>;
  listMaintenanceRequests(): Promise<MaintenanceRequest[]>;
}
