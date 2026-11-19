import { apiClient, ApiError } from "./api-client";
import type { AppointmentInput } from "@/validation/schemas";
import type { AppointmentRecord, AppointmentStatus, QueueRecord, QueueStatus } from "./appointment-queue";
import type { DepartmentId, EmergencyCaseRecord, EmergencyTriageCategory } from "./department-workflows";

interface PageResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

interface BackendAppointment extends Omit<AppointmentRecord, "status"> {
  status: string;
  doctorId: string;
  createdAt: string;
  updatedAt: string;
}

interface BackendQueueRecord extends QueueRecord {
  id: string;
}

interface BackendEmergencyCase extends Omit<EmergencyCaseRecord, "currentStatus"> {
  currentStatus: string;
}

interface EmergencyRegistrationInput {
  patientIdentifier?: string;
  unidentified?: boolean;
  temporaryPatient?: { fullName?: string; sex?: string; dateOfBirth?: string; phone?: string };
  newPatient?: {
    firstName: string;
    middleName?: string;
    lastName: string;
    sex: string;
    dateOfBirth: string;
    phone: string;
    department?: string;
  };
  arrivalAt?: string;
  arrivalMode: string;
  presentingComplaint: string;
}

const departmentNames: Record<Exclude<DepartmentId, "emergency">, string> = {
  "internal-medicine": "Internal Medicine",
  surgery: "Surgery",
  pediatrics: "Pediatrics",
  "gynecology-obstetrics": "Gynecology and Obstetrics",
  orthopedics: "Orthopedics",
  dentistry: "Dentistry",
  ophthalmology: "Ophthalmology",
  dermatology: "Dermatology",
  psychiatry: "Psychiatry",
  icu: "ICU",
  physiotherapy: "Physiotherapy",
};

const appointmentStatuses: Record<AppointmentStatus, string> = {
  Scheduled: "Scheduled",
  Confirmed: "Confirmed",
  "Checked In": "Checked In",
  Completed: "Completed",
  Cancelled: "Cancelled",
  "No Show": "No Show",
};

const queueStatuses: Record<QueueStatus, string> = {
  Waiting: "Waiting",
  Consulting: "Consulting",
  Completed: "Completed",
  Absent: "Absent",
  Transferred: "Transferred",
};

function titleCaseStatus(value: string): string {
  return value.split(" ").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

async function findQueueEntry(queueNumber: number, department?: string): Promise<BackendQueueRecord> {
  const result = await apiClient.get<PageResult<BackendQueueRecord>>("/queue", { department, page: 1, pageSize: 100 });
  const entries = result.data.filter((item) => item.queueNumber === queueNumber);
  if (entries.length === 0) throw new ApiError("Queue entry was not found", 404, "NOT_FOUND");
  if (entries.length > 1) throw new ApiError("Provide the department to identify this queue entry", 409, "AMBIGUOUS_QUEUE_NUMBER");
  return entries[0];
}

function appointmentStatusFromApi(value: string): AppointmentStatus {
  const status = titleCaseStatus(value);
  switch (status) {
    case "Scheduled": return "Scheduled";
    case "Confirmed": return "Confirmed";
    case "Checked In": return "Checked In";
    case "Completed": return "Completed";
    case "Cancelled": return "Cancelled";
    case "No Show": return "No Show";
    default: throw new ApiError("The API returned an unsupported appointment status", 502, "INVALID_API_RESPONSE");
  }
}

function queueStatusFromApi(value: string): QueueStatus {
  const status = titleCaseStatus(value);
  switch (status) {
    case "Waiting": return "Waiting";
    case "Consulting": return "Consulting";
    case "Completed": return "Completed";
    case "Absent": return "Absent";
    case "Transferred": return "Transferred";
    default: throw new ApiError("The API returned an unsupported queue status", 502, "INVALID_API_RESPONSE");
  }
}

function emergencyStatusFromApi(value: string): EmergencyCaseRecord["currentStatus"] {
  switch (value) {
    case "ARRIVAL": return "Awaiting triage";
    case "WAITING": return "Waiting";
    case "ASSESSMENT": return "In assessment";
    case "TREATMENT": return "In treatment";
    case "OBSERVATION": return "Observation";
    case "ADMISSION": return "Admission requested";
    case "REFERRAL": return "Referral";
    case "TRANSFER": return "Transferred";
    case "DISCHARGE": return "Discharged";
    default: throw new ApiError("The API returned an unsupported emergency case status", 502, "INVALID_API_RESPONSE");
  }
}

export const appointmentBackendApi = {
  async list(from: string, to: string): Promise<AppointmentRecord[]> {
    const result = await apiClient.get<PageResult<BackendAppointment>>("/appointments", { from, to, page: 1, pageSize: 100 });
    return result.data.map((appointment) => ({ ...appointment, status: appointmentStatusFromApi(appointment.status) }));
  },
  async create(input: AppointmentInput): Promise<AppointmentRecord> {
    const appointment = await apiClient.post<BackendAppointment>("/appointments", input);
    return { ...appointment, status: appointmentStatusFromApi(appointment.status) };
  },
  async update(id: string, input: AppointmentInput): Promise<AppointmentRecord> {
    const appointment = await apiClient.patch<BackendAppointment>(`/appointments/${encodeURIComponent(id)}`, input);
    return { ...appointment, status: appointmentStatusFromApi(appointment.status) };
  },
  async updateStatus(id: string, status: AppointmentStatus): Promise<AppointmentRecord> {
    const appointment = await apiClient.patch<BackendAppointment>(`/appointments/${encodeURIComponent(id)}/status`, { status: appointmentStatuses[status] });
    return { ...appointment, status: appointmentStatusFromApi(appointment.status) };
  },
  async doctorAvailability(date: string, department?: string) {
    return apiClient.get("/doctors/availability", { date, department });
  },
  async availableTimeSlots(doctorId: string, date: string): Promise<string[]> {
    return apiClient.get(`/doctors/${encodeURIComponent(doctorId)}/slots`, { date });
  },
  async listQueue(department?: string): Promise<QueueRecord[]> {
    const result = await apiClient.get<PageResult<BackendQueueRecord>>("/queue", { department, page: 1, pageSize: 100 });
    return result.data.map(({ id: _id, ...entry }) => ({ ...entry, status: queueStatusFromApi(entry.status) }));
  },
  async updateQueueStatus(queueNumber: number, status: QueueStatus, department?: string): Promise<QueueRecord> {
    const entry = await findQueueEntry(queueNumber, department);
    const updated = await apiClient.patch<BackendQueueRecord>(`/queue/${encodeURIComponent(entry.id)}/status`, { status: queueStatuses[status] });
    return { ...updated, status: queueStatusFromApi(updated.status) };
  },
  async transferQueuePatient(queueNumber: number, department: string, currentDepartment?: string): Promise<QueueRecord> {
    const entry = await findQueueEntry(queueNumber, currentDepartment);
    const created = await apiClient.post<BackendQueueRecord>(`/queue/${encodeURIComponent(entry.id)}/transfer`, { department });
    return { ...created, status: queueStatusFromApi(created.status) };
  },
  async callNextPatient(department: string): Promise<QueueRecord | null> {
    const entry = await apiClient.post<BackendQueueRecord | null>("/queue/call-next", { department });
    return entry ? { ...entry, status: queueStatusFromApi(entry.status) } : null;
  },
};

export const emergencyBackendApi = {
  async listCases(query: { status?: string; search?: string; page?: number; pageSize?: number } = {}) {
    const result = await apiClient.get<PageResult<BackendEmergencyCase>>("/emergency/cases", query);
    return { ...result, data: result.data.map((item) => ({ ...item, currentStatus: emergencyStatusFromApi(item.currentStatus) })) };
  },
  async register(input: EmergencyRegistrationInput): Promise<EmergencyCaseRecord> {
    const item = await apiClient.post<BackendEmergencyCase>("/emergency/cases", input);
    return { ...item, currentStatus: emergencyStatusFromApi(item.currentStatus) };
  },
  async recordTriage(caseNumber: string, input: {
    category: EmergencyTriageCategory;
    priority: string;
    assignedStaff: string;
    assessmentNotes: string;
    vitalSigns: string | Record<string, unknown>;
    protocolName?: string;
    protocolVersion?: string;
    reassessment?: boolean;
  }): Promise<EmergencyCaseRecord> {
    const item = await apiClient.post<BackendEmergencyCase>(`/emergency/cases/${encodeURIComponent(caseNumber)}/triage`, input);
    return { ...item, currentStatus: emergencyStatusFromApi(item.currentStatus) };
  },
  async transition(caseNumber: string, status: Exclude<EmergencyCaseRecord["currentStatus"], "Awaiting triage">, details: { destination?: string; instructions?: string } = {}) {
    const statusValue: Record<Exclude<EmergencyCaseRecord["currentStatus"], "Awaiting triage">, string> = {
      Waiting: "WAITING",
      "In assessment": "ASSESSMENT",
      "In treatment": "TREATMENT",
      Observation: "OBSERVATION",
      "Admission requested": "ADMISSION",
      Referral: "REFERRAL",
      Transferred: "TRANSFER",
      Discharged: "DISCHARGE",
    };
    const item = await apiClient.post<BackendEmergencyCase>(`/emergency/cases/${encodeURIComponent(caseNumber)}/transitions`, { status: statusValue[status], ...details });
    return { ...item, currentStatus: emergencyStatusFromApi(item.currentStatus) };
  },
  history(caseNumber: string) {
    return apiClient.get(`/emergency/cases/${encodeURIComponent(caseNumber)}/history`);
  },
  report(from?: string, to?: string) {
    return apiClient.get("/emergency/reports", { from, to });
  },
  listDepartmentAssignments(department: string) {
    return apiClient.get("/departments/assignments", { department });
  },
  createDepartmentAssignment(input: { patientId: string; department: string; focus: string; clinician: string }) {
    return apiClient.post("/departments/assignments", input);
  },
  saveSpecialistWorkflow(input: {
    patientId: string;
    encounterId?: string;
    departmentId: Exclude<DepartmentId, "emergency">;
    kind: string;
    details: Record<string, string>;
    summary: string;
  }) {
    const { departmentId, ...body } = input;
    return apiClient.post("/departments/workflows", { ...body, department: departmentNames[departmentId] });
  },
};
