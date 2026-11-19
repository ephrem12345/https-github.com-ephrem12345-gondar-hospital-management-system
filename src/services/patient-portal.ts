export type PatientPortalSection =
  | "overview"
  | "profile"
  | "appointments"
  | "records"
  | "billing"
  | "notifications"
  | "support";

export interface PatientPortalProfile {
  patientNumber: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

export type PortalAppointmentStatus =
  | "Confirmed"
  | "Requested"
  | "Cancellation requested"
  | "Reschedule requested"
  | "Completed"
  | "Cancelled";

export interface PatientPortalAppointment {
  id: string;
  date: string;
  time: string;
  department: string;
  doctor: string;
  reason: string;
  status: PortalAppointmentStatus;
}

export interface PatientPortalNotification {
  id: string;
  title: string;
  message: string;
  category: "Appointments" | "Results" | "Billing" | "Hospital";
  createdAt: string;
  read: boolean;
}

export interface PatientPortalVisit {
  id: string;
  date: string;
  department: string;
  clinician: string;
  patientVisibleSummary: string;
}

export interface PatientPortalMedicalRecord {
  id: string;
  date: string;
  category: "Diagnosis" | "Laboratory result" | "Prescription" | "Discharge document";
  title: string;
  releaseStatus: "Released" | "Pending authorization";
  downloadUrl?: string;
}

export interface PatientPortalInvoice {
  id: string;
  issuedAt: string;
  description: string;
  totalAmount: number;
  paidAmount: number;
  status: "Paid" | "Partially paid" | "Unpaid";
}

export interface PatientPortalPayment {
  id: string;
  paidAt: string;
  method: string;
  amount: number;
  receiptUrl?: string;
}

export interface PatientPortalSupportRequest {
  category: "Feedback" | "Complaint" | "Support request";
  subject: string;
  message: string;
}

export interface PatientPortalAnnouncement {
  id: string;
  title: string;
  message: string;
  publishedAt: string;
}

export interface PatientPortalApi {
  getProfile(): Promise<PatientPortalProfile>;
  updateContactInformation(
    input: Pick<PatientPortalProfile, "phone" | "email" | "address" | "emergencyContactName" | "emergencyContactPhone">,
  ): Promise<PatientPortalProfile>;
  listAppointments(): Promise<PatientPortalAppointment[]>;
  requestAppointment(
    input: Pick<PatientPortalAppointment, "date" | "time" | "department" | "doctor" | "reason">,
  ): Promise<PatientPortalAppointment>;
  requestAppointmentChange(
    id: string,
    action: "cancel" | "reschedule",
    newDate?: string,
  ): Promise<PatientPortalAppointment>;
  listVisits(): Promise<PatientPortalVisit[]>;
  listReleasedRecords(): Promise<PatientPortalMedicalRecord[]>;
  listInvoices(): Promise<PatientPortalInvoice[]>;
  listPayments(): Promise<PatientPortalPayment[]>;
  listNotifications(): Promise<PatientPortalNotification[]>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(): Promise<void>;
  listAnnouncements(): Promise<PatientPortalAnnouncement[]>;
  submitSupportRequest(input: PatientPortalSupportRequest): Promise<void>;
}

export const demoPatientProfile: PatientPortalProfile = {  patientNumber: "GHMS-DEMO-10443",
  fullName: "Aster Mekonnen (Synthetic Demo)",
  dateOfBirth: "1992-04-18",
  gender: "Female",
  phone: "+251 900 000 143",
  email: "aster.demo@example.test",
  address: "Demo address, Gondar",
  emergencyContactName: "Demo contact",
  emergencyContactPhone: "+251 900 000 144",
};

export const demoPortalAppointments: PatientPortalAppointment[] = [
  { id: "APT-DEMO-1201", date: "2026-11-18", time: "09:30", department: "Internal Medicine", doctor: "Dr. Demo One", reason: "Follow-up visit", status: "Confirmed" },
  { id: "APT-DEMO-1192", date: "2026-10-28", time: "11:00", department: "Laboratory", doctor: "Assigned at visit", reason: "Completed demonstration visit", status: "Completed" },
];

export const demoPortalNotifications: PatientPortalNotification[] = [
  { id: "NOT-DEMO-01", title: "Appointment reminder", message: "You have a scheduled demonstration appointment on Nov 18.", category: "Appointments", createdAt: "2026-11-16", read: false },
  { id: "NOT-DEMO-02", title: "Result available", message: "A synthetic laboratory report is available in your records.", category: "Results", createdAt: "2026-11-14", read: false },
  { id: "NOT-DEMO-03", title: "Billing statement", message: "A demonstration billing statement is ready to view.", category: "Billing", createdAt: "2026-11-10", read: true },
  { id: "NOT-DEMO-04", title: "Hospital announcement", message: "Patient portal maintenance is scheduled for a demo environment.", category: "Hospital", createdAt: "2026-11-08", read: true },
];

// ---------------------------------------------------------- Implementations

import { apiClient, ApiError } from "./api-client";

interface BackendAppointment {
  id: string;
  patientId: string;
  patient: string;
  doctorId: string;
  doctor: string;
  department: string;
  date: string;
  time: string;
  type: string;
  reason: string;
  notes: string;
  status: string;
}

interface BackendPage<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

interface BackendPortalAppointmentList extends BackendPage<BackendAppointment> {}

function portalStatusFromApi(value: string): PortalAppointmentStatus {
  const normalized = (value || "").toLowerCase().replace(/[\s_-]+/g, " ").trim();
  switch (normalized) {
    case "scheduled":
    case "requested":
    case "pending":
      return "Requested";
    case "confirmed":
    case "checked in":
    case "in progress":
      return "Confirmed";
    case "completed":
      return "Completed";
    case "cancelled":
    case "canceled":
    case "no show":
      return "Cancelled";
    default:
      return "Requested";
  }
}

function toPortalAppointment(appointment: BackendAppointment): PatientPortalAppointment {
  return {
    id: appointment.id,
    date: appointment.date,
    time: appointment.time,
    department: appointment.department,
    doctor: appointment.doctor,
    reason: appointment.reason,
    status: portalStatusFromApi(appointment.status),
  };
}

function notificationCategoryFromApi(value: string): PatientPortalNotification["category"] {
  const normalized = (value || "").toUpperCase().replace(/[\s-]+/g, "_").trim();
  switch (normalized) {
    case "APPOINTMENTS":
    case "APPOINTMENT":
      return "Appointments";
    case "RESULTS":
    case "RESULT":
    case "LABORATORY":
    case "LAB_RESULT_READY":
    case "LAB_ALERT":
      return "Results";
    case "BILLING":
    case "INVOICE":
    case "PAYMENT":
      return "Billing";
    case "HOSPITAL":
    case "ANNOUNCEMENT":
    case "SYSTEM":
    case "CLINICAL_MESSAGE":
    case "CLINICAL_ACKNOWLEDGMENT":
    case "SUPERVISOR_ESCALATION":
    case "TASK_ASSIGNED":
    case "TASK_COMPLETED":
    default:
      return "Hospital";
  }
}

/** Real backend implementation. Every method is patient-scoped server-side. */
export class HttpPatientPortalApi implements PatientPortalApi {
  getProfile() {
    return apiClient.get<PatientPortalProfile>("/portal/profile");
  }

  updateContactInformation(input: Pick<PatientPortalProfile, "phone" | "email" | "address" | "emergencyContactName" | "emergencyContactPhone">) {
    return apiClient.patch<PatientPortalProfile>("/portal/profile", input);
  }

  async listAppointments(): Promise<PatientPortalAppointment[]> {
    const result = await apiClient.get<BackendPortalAppointmentList>("/portal/appointments", { page: 1, pageSize: 100 });
    return (result?.data || []).map(toPortalAppointment);
  }

  async requestAppointment(input: Pick<PatientPortalAppointment, "date" | "time" | "department" | "doctor" | "reason">) {
    const appointment = await apiClient.post<BackendAppointment>("/portal/appointments", {
      department: input.department,
      ...(input.doctor && input.doctor !== "Any available doctor" ? { doctor: input.doctor } : {}),
      date: input.date,
      time: input.time,
      reason: input.reason,
    });
    return toPortalAppointment(appointment);
  }

  async requestAppointmentChange(id: string, action: "cancel" | "reschedule", newDate?: string) {
    const appointment = await apiClient.patch<BackendAppointment>(`/portal/appointments/${encodeURIComponent(id)}/change`, {
      action,
      ...(action === "reschedule" && newDate ? { date: newDate } : {}),
    });
    return toPortalAppointment(appointment);
  }

  async listVisits(): Promise<PatientPortalVisit[]> {
    const visits = await apiClient.get<PatientPortalVisit[]>("/portal/visits");
    return Array.isArray(visits) ? visits : [];
  }

  async listReleasedRecords(): Promise<PatientPortalMedicalRecord[]> {
    const payload = await apiClient.get<{ records?: Array<{ id: string; date: string; category: "Diagnosis" | "Laboratory result"; title: string; releaseStatus: PatientPortalMedicalRecord["releaseStatus"]; summary?: string }> }>("/portal/medical-records");
    return (payload?.records || []).map((record) => ({ id: record.id, date: record.date, category: record.category, title: record.title, releaseStatus: record.releaseStatus }));
  }

  async listInvoices(): Promise<PatientPortalInvoice[]> {
    const payload = await apiClient.get<{ invoices?: PatientPortalInvoice[] }>("/portal/billing");
    return payload?.invoices || [];
  }

  async listPayments(): Promise<PatientPortalPayment[]> {
    const payload = await apiClient.get<{ payments?: PatientPortalPayment[] }>("/portal/billing");
    return payload?.payments || [];
  }

  async listNotifications(): Promise<PatientPortalNotification[]> {
    const payload = await apiClient.get<{ notifications?: Array<Omit<PatientPortalNotification, "category"> & { category: string }> }>("/portal/notifications");
    return (payload?.notifications || []).map((notification) => ({ ...notification, category: notificationCategoryFromApi(notification.category) }));
  }

  async markNotificationRead(id: string): Promise<void> {
    await apiClient.post(`/portal/notifications/${encodeURIComponent(id)}/read`);
  }

  async markAllNotificationsRead(): Promise<void> {
    await apiClient.post("/portal/notifications/read-all");
  }

  async listAnnouncements(): Promise<PatientPortalAnnouncement[]> {
    const announcements = await apiClient.get<PatientPortalAnnouncement[]>("/portal/announcements");
    return Array.isArray(announcements) ? announcements : [];
  }

  submitSupportRequest(input: PatientPortalSupportRequest): Promise<void> {
    return apiClient.post<void>("/portal/support-requests", input);
  }
}

/** Clearly separated demonstration backend used for previews and tests. */
export class DemoPatientPortalApi implements PatientPortalApi {
  private appointments = [...demoPortalAppointments];
  private notifications = [...demoPortalNotifications];

  getProfile() {
    return Promise.resolve(demoPatientProfile);
  }

  updateContactInformation(input: Pick<PatientPortalProfile, "phone" | "email" | "address" | "emergencyContactName" | "emergencyContactPhone">) {
    Object.assign(demoPatientProfile, input);
    return Promise.resolve(demoPatientProfile);
  }

  listAppointments() {
    return Promise.resolve([...this.appointments]);
  }

  requestAppointment(input: Pick<PatientPortalAppointment, "date" | "time" | "department" | "doctor" | "reason">) {
    const appointment: PatientPortalAppointment = {
      id: `APT-DEMO-${Date.now()}`,
      date: input.date,
      time: input.time,
      department: input.department,
      doctor: input.doctor,
      reason: input.reason,
      status: "Requested",
    };
    this.appointments = [appointment, ...this.appointments];
    return Promise.resolve(appointment);
  }

  requestAppointmentChange(id: string, action: "cancel" | "reschedule") {
    const appointment = this.appointments.find((item) => item.id === id);
    if (!appointment) return Promise.reject(new ApiError("Appointment was not found", 404, "NOT_FOUND"));
    appointment.status = action === "cancel" ? "Cancellation requested" : "Reschedule requested";
    return Promise.resolve(appointment);
  }

  listVisits() {
    return Promise.resolve(demoVisits);
  }

  listReleasedRecords() {
    return Promise.resolve(demoMedicalRecords);
  }

  listInvoices() {
    return Promise.resolve(demoInvoices);
  }

  listPayments() {
    return Promise.resolve(demoPayments);
  }

  listNotifications() {
    return Promise.resolve([...this.notifications]);
  }

  async markNotificationRead(id: string) {
    const notification = this.notifications.find((item) => item.id === id);
    if (!notification) throw new ApiError("Notification was not found", 404, "NOT_FOUND");
    notification.read = true;
  }

  async markAllNotificationsRead() {
    this.notifications = this.notifications.map((item) => ({ ...item, read: true }));
  }

  listAnnouncements() {
    return Promise.resolve(demoAnnouncements);
  }

  submitSupportRequest() {
    return Promise.resolve();
  }
}

export const demoApiInstance = new DemoPatientPortalApi();
export const httpApiInstance = new HttpPatientPortalApi();

function getClientUserRole(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("ghms-user");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.role ? String(parsed.role).toUpperCase() : null;
  } catch {
    return null;
  }
}

/** Demo mode is opt-in via NEXT_PUBLIC_API_MODE=demo or automatic preview fallback when not signed in as patient. */
export function patientPortalApi(): PatientPortalApi {
  if (process.env.NEXT_PUBLIC_API_MODE === "demo") return demoApiInstance;
  if (typeof window !== "undefined") {
    const role = getClientUserRole();
    if (role !== "PATIENT") {
      return demoApiInstance;
    }
  }
  return httpApiInstance;
}

export const isDemoPortal = () => {
  if (process.env.NEXT_PUBLIC_API_MODE === "demo") return true;
  if (typeof window !== "undefined") {
    const role = getClientUserRole();
    return role !== "PATIENT";
  }
  return false;
};

// ------------------------------------------------------------- Demo fixtures

export const demoVisits: PatientPortalVisit[] = [
  { id: "VIS-DEMO-01", date: "2026-10-28", department: "Internal Medicine", clinician: "Dr. Demo One", patientVisibleSummary: "Completed demonstration visit" },
  { id: "VIS-DEMO-02", date: "2026-08-03", department: "Emergency", clinician: "Care team", patientVisibleSummary: "Discharge document available" },
];

export const demoMedicalRecords: PatientPortalMedicalRecord[] = [
  { id: "REC-DEMO-01", date: "2026-10-28", category: "Diagnosis", title: "Synthetic follow-up diagnosis", releaseStatus: "Released" },
  { id: "REC-DEMO-02", date: "2026-11-14", category: "Laboratory result", title: "Complete blood count", releaseStatus: "Released" },
  { id: "REC-DEMO-03", date: "2026-10-28", category: "Prescription", title: "Demonstration medication", releaseStatus: "Pending authorization" },
];

export const demoInvoices: PatientPortalInvoice[] = [
  { id: "INV-DEMO-301", issuedAt: "2026-11-10", description: "Outpatient services (demo)", totalAmount: 520, paidAmount: 200, status: "Partially paid" },
  { id: "INV-DEMO-277", issuedAt: "2026-10-28", description: "Laboratory services (demo)", totalAmount: 180, paidAmount: 180, status: "Paid" },
];

export const demoPayments: PatientPortalPayment[] = [
  { id: "RCT-DEMO-901", paidAt: "2026-11-12", method: "Cash (demo)", amount: 200 },
  { id: "RCT-DEMO-874", paidAt: "2026-10-28", method: "Insurance (demo)", amount: 180 },
];

export const demoAnnouncements: PatientPortalAnnouncement[] = [
  { id: "ANN-DEMO-01", title: "Patient services update", message: "For assistance, contact the hospital information desk.", publishedAt: "2026-11-01" },
  { id: "ANN-DEMO-02", title: "Portal preview notice", message: "This preview is not connected to a live patient account.", publishedAt: "2026-10-30" },
];

export const demoPortalDocuments = [
  { name: "Visit summary", fileName: "demo-visit-summary.txt", content: "Synthetic patient portal visit summary. Not a real medical record." },
  { name: "Discharge document", fileName: "demo-discharge-summary.txt", content: "Synthetic discharge summary. Not a real medical record." },
  { name: "Laboratory report", fileName: "demo-laboratory-report.txt", content: "Synthetic laboratory report. Not a real clinical result." },
];
