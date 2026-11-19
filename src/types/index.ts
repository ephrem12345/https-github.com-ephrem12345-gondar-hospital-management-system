/** Domain types shared across the frontend. Populated by the mock adapter
 *  until backend integration (API contracts mirror these shapes). */

export interface PersonName {
  firstName: string;
  lastName: string;
}

export interface Patient {
  id: string;
  mrn: string; // Medical Record Number, e.g. GHMS-000123
  firstName: string;
  lastName: string;
  gender: "male" | "female";
  dateOfBirth: string; // ISO date
  phone: string;
  department: string;
  status: "stable" | "critical" | "recovering" | "discharged";
  lastVisit: string; // ISO date
  createdAt: string;
}

export interface Appointment {
  id: string;
  patientName: string;
  patientId: string;
  time: string; // HH:mm
  doctor: string;
  department: string;
  type: "consultation" | "follow-up" | "emergency" | "procedure";
  status: "scheduled" | "in-progress" | "completed" | "cancelled";
}

export interface DashboardStats {
  totalPatients: { value: number; changePercent: number };
  appointmentsToday: { value: number; changePercent: number };
  availableBeds: { value: number; total: number };
  monthlyRevenue: { value: number; currency: string; changePercent: number };
}

export interface TrendPoint {
  month: string;
  admitted: number;
  discharged: number;
}

export interface DepartmentSlice {
  name: string;
  value: number;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  time: string; // display-ready relative time
  category: "appointment" | "lab" | "pharmacy" | "billing" | "system";
  read: boolean;
}

export interface CurrentUser {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  initials: string;
  /** ISO 639-1 code used by the language switcher. */
  preferredLanguage?: string;
  /** URL of the profile photograph, if uploaded. */
  avatarUrl?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type StatusVariant =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "primary"
  | "neutral";

export interface FilterOption {
  label: string;
  value: string;
}

export type DashboardFilterPreset =
  | "today"
  | "yesterday"
  | "last7days"
  | "last30days"
  | "thisMonth"
  | "custom";

export interface DashboardMetricCard {
  id: string;
  label: string;
  value: string;
  change?: { value: number; suffix?: string; positiveIsGood?: boolean };
  hint?: string;
  tone: "primary" | "success" | "warning" | "danger";
  href: string;
}

export interface DashboardActivityItem {
  id: string;
  activity: string;
  user: string;
  department: string;
  timestamp: string;
  status: "success" | "warning" | "danger" | "info";
}

export interface DashboardAppointmentOverview {
  id: string;
  patient: string;
  doctor: string;
  department: string;
  time: string;
  status: "scheduled" | "in-progress" | "completed" | "cancelled";
}

export interface DashboardEmergencyCase {
  id: string;
  patientId: string;
  triage: string;
  arrivalTime: string;
  department: string;
  status: "stable" | "monitoring" | "critical" | "transferred";
}

export interface DashboardPharmacyAlert {
  id: string;
  medicine: string;
  batch: string;
  quantity: number;
  expiry: string;
  alertType: "Low stock" | "Expiring soon" | "Critical stock";
}

export interface DashboardQuickAction {
  id: string;
  label: string;
  href: string;
  icon: string;
  tone: "primary" | "success" | "warning" | "danger";
}

export interface DashboardPoint<T extends string | number = string | number> {
  label: string;
  value: T;
}

export interface DashboardApiBundle {
  summaryMetrics: DashboardMetricCard[];
  patientTrend: Array<{ label: string; visits: number; admissions: number; registrations: number }>;
  departmentMix: Array<{ name: string; value: number }>;
  appointmentBreakdown: Array<{ label: string; scheduled: number; completed: number; cancelled: number; noShow: number }>;
  financialTrend: Array<{ label: string; revenue: number; target: number }>;
  occupancyTrend: Array<{ label: string; available: number; occupied: number; reserved: number; maintenance: number }>;
  labTrend: Array<{ label: string; pending: number; processing: number; completed: number }>;
  recentActivities: DashboardActivityItem[];
  upcomingAppointments: DashboardAppointmentOverview[];
  emergencyCases: DashboardEmergencyCase[];
  pharmacyAlerts: DashboardPharmacyAlert[];
  quickActions: DashboardQuickAction[];
}
