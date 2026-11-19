import type {
  AppNotification,
  Appointment,
  CurrentUser,
  DashboardApiBundle,
  DashboardStats,
  DepartmentSlice,
  Patient,
  TrendPoint,
} from "@/types";

/**
 * Typed demonstration-data adapter (visual preview only).
 * Every consumer reads this through the service layer in `src/services`,
 * so swapping to a real API later touches only service implementations.
 */

export const mockCurrentUser: CurrentUser = {
  id: "usr-001",
  name: "Dr. Abebe Bekele",
  role: "Chief Administrator",
  department: "Administration",
  email: "abebe.bekele@gondar-hospital.et",
  phone: "+251 911 000 111",
  initials: "AB",
};

export const mockStats: DashboardStats = {
  totalPatients: { value: 12847, changePercent: 8.2 },
  appointmentsToday: { value: 348, changePercent: 4.6 },
  availableBeds: { value: 214, total: 420 },
  monthlyRevenue: { value: 4210000, currency: "ETB", changePercent: -2.1 },
};

export const mockAdmissionsTrend: TrendPoint[] = [
  { month: "Dec", admitted: 610, discharged: 540 },
  { month: "Jan", admitted: 640, discharged: 575 },
  { month: "Feb", admitted: 700, discharged: 640 },
  { month: "Mar", admitted: 720, discharged: 668 },
  { month: "Apr", admitted: 685, discharged: 655 },
  { month: "May", admitted: 745, discharged: 690 },
  { month: "Jun", admitted: 780, discharged: 725 },
  { month: "Jul", admitted: 815, discharged: 760 },
  { month: "Aug", admitted: 790, discharged: 770 },
  { month: "Sep", admitted: 850, discharged: 795 },
  { month: "Oct", admitted: 880, discharged: 830 },
  { month: "Nov", admitted: 905, discharged: 852 },
];

export const mockDepartmentDistribution: DepartmentSlice[] = [
  { name: "Internal Medicine", value: 32 },
  { name: "Pediatrics", value: 24 },
  { name: "Surgery", value: 16 },
  { name: "Gyn & Obstetrics", value: 12 },
  { name: "Orthopedics", value: 9 },
  { name: "Other", value: 7 },
];

export const mockPatients: Patient[] = [
  { id: "pat-001", mrn: "GHMS-000001", firstName: "Almaz", lastName: "Tadesse", gender: "female", dateOfBirth: "1985-04-12", phone: "+251 911 234 567", department: "Internal Medicine", status: "stable", lastVisit: "2026-11-10", createdAt: "2026-11-10" },
  { id: "pat-002", mrn: "GHMS-000002", firstName: "Getachew", lastName: "Molla", gender: "male", dateOfBirth: "1972-09-30", phone: "+251 912 345 678", department: "Surgery", status: "recovering", lastVisit: "2026-11-10", createdAt: "2026-11-09" },
  { id: "pat-003", mrn: "GHMS-000003", firstName: "Hanna", lastName: "Girma", gender: "female", dateOfBirth: "1998-01-22", phone: "+251 913 456 789", department: "Gynecology & Obstetrics", status: "stable", lastVisit: "2026-11-09", createdAt: "2026-11-09" },
  { id: "pat-004", mrn: "GHMS-000004", firstName: "Yohannes", lastName: "Kebede", gender: "male", dateOfBirth: "1958-07-05", phone: "+251 914 567 890", department: "Cardiology", status: "critical", lastVisit: "2026-11-09", createdAt: "2026-11-08" },
  { id: "pat-005", mrn: "GHMS-000005", firstName: "Sara", lastName: "Alemu", gender: "female", dateOfBirth: "2016-03-18", phone: "+251 915 678 901", department: "Pediatrics", status: "recovering", lastVisit: "2026-11-08", createdAt: "2026-11-08" },
  { id: "pat-006", mrn: "GHMS-000006", firstName: "Dawit", lastName: "Haile", gender: "male", dateOfBirth: "1994-11-11", phone: "+251 916 789 012", department: "Orthopedics", status: "stable", lastVisit: "2026-11-07", createdAt: "2026-11-07" },
  { id: "pat-007", mrn: "GHMS-000007", firstName: "Meron", lastName: "Assefa", gender: "female", dateOfBirth: "2001-06-02", phone: "+251 917 890 123", department: "Dermatology", status: "discharged", lastVisit: "2026-11-06", createdAt: "2026-11-06" },
  { id: "pat-008", mrn: "GHMS-000008", firstName: "Tesfaye", lastName: "Bekele", gender: "male", dateOfBirth: "1966-12-14", phone: "+251 918 901 234", department: "Internal Medicine", status: "stable", lastVisit: "2026-11-06", createdAt: "2026-11-06" },
  { id: "pat-009", mrn: "GHMS-000009", firstName: "Lensa", lastName: "Abera", gender: "female", dateOfBirth: "1990-08-27", phone: "+251 919 012 345", department: "Ophthalmology", status: "discharged", lastVisit: "2026-11-05", createdAt: "2026-11-05" },
  { id: "pat-010", mrn: "GHMS-000010", firstName: "Biruk", lastName: "Tesfaye", gender: "male", dateOfBirth: "2011-02-09", phone: "+251 910 123 456", department: "Pediatrics", status: "stable", lastVisit: "2026-11-05", createdAt: "2026-11-05" },
  { id: "pat-011", mrn: "GHMS-000011", firstName: "Fatuma", lastName: "Nur", gender: "female", dateOfBirth: "1988-05-16", phone: "+251 921 234 567", department: "Psychiatry", status: "recovering", lastVisit: "2026-11-04", createdAt: "2026-11-04" },
  { id: "pat-012", mrn: "GHMS-000012", firstName: "Solomon", lastName: "Gebre", gender: "male", dateOfBirth: "1979-10-03", phone: "+251 922 345 678", department: "Surgery", status: "discharged", lastVisit: "2026-11-04", createdAt: "2026-11-03" },
];

export const mockAppointments: Appointment[] = [
  { id: "apt-001", patientName: "Almaz Tadesse", patientId: "GHMS-000001", time: "08:30", doctor: "Dr. Selam Girma", department: "Internal Medicine", type: "follow-up", status: "completed" },
  { id: "apt-002", patientName: "Getachew Molla", patientId: "GHMS-000002", time: "09:00", doctor: "Dr. Mulu Alemu", department: "Surgery", type: "consultation", status: "completed" },
  { id: "apt-003", patientName: "Hanna Girma", patientId: "GHMS-000003", time: "09:45", doctor: "Dr. Kidist Haile", department: "Gynecology & Obstetrics", type: "consultation", status: "in-progress" },
  { id: "apt-004", patientName: "Yohannes Kebede", patientId: "GHMS-000004", time: "10:15", doctor: "Dr. Selam Girma", department: "Internal Medicine", type: "follow-up", status: "scheduled" },
  { id: "apt-005", patientName: "Sara Alemu", patientId: "GHMS-000005", time: "10:45", doctor: "Dr. Bereket Assefa", department: "Pediatrics", type: "consultation", status: "scheduled" },
  { id: "apt-006", patientName: "Dawit Haile", patientId: "GHMS-000006", time: "11:30", doctor: "Dr. Mulu Alemu", department: "Orthopedics", type: "procedure", status: "scheduled" },
  { id: "apt-007", patientName: "Meron Assefa", patientId: "GHMS-000007", time: "13:00", doctor: "Dr. Kidist Haile", department: "Dermatology", type: "follow-up", status: "scheduled" },
  { id: "apt-008", patientName: "Tesfaye Bekele", patientId: "GHMS-000008", time: "14:15", doctor: "Dr. Selam Girma", department: "Internal Medicine", type: "consultation", status: "cancelled" },
];

export const mockNotifications: AppNotification[] = [
  { id: "ntf-001", title: "Critical lab result", body: "Yohannes Kebede — hemoglobin 6.1 g/dL flagged as critical.", time: "5 min ago", category: "lab", read: false },
  { id: "ntf-002", title: "Bed capacity warning", body: "Internal Medicine ward occupancy reached 92%.", time: "22 min ago", category: "system", read: false },
  { id: "ntf-003", title: "New appointment booked", body: "Hanna Girma scheduled with Dr. Kidist Haile at 09:45.", time: "1 hr ago", category: "appointment", read: false },
  { id: "ntf-004", title: "Low stock alert", body: "Paracetamol 500mg below reorder level (42 boxes left).", time: "3 hrs ago", category: "pharmacy", read: true },
  { id: "ntf-005", title: "Invoice settled", body: "Invoice INV-2026-0891 paid at cashier 3 — ETB 1,250.", time: "5 hrs ago", category: "billing", read: true },
];

export const mockHospitalDashboardData: DashboardApiBundle = {
  summaryMetrics: [
    { id: "registered-patients", label: "Total registered patients", value: "12,847", change: { value: 8.2 }, tone: "primary", href: "/patients" },
    { id: "today-visits", label: "Today's patient visits", value: "1,365", change: { value: 6.4 }, tone: "success", href: "/opd" },
    { id: "appointments", label: "Today's appointments", value: "348", change: { value: 4.6 }, tone: "warning", href: "/appointments" },
    { id: "emergency", label: "Emergency patients", value: "26", change: { value: 3.1 }, tone: "danger", href: "/emergency" },
    { id: "admissions", label: "Current admissions", value: "420", change: { value: 2.8 }, tone: "primary", href: "/admissions" },
    { id: "available-beds", label: "Available beds", value: "214", hint: "214 of 420 beds", tone: "warning", href: "/beds" },
    { id: "occupied-beds", label: "Occupied beds", value: "182", change: { value: 1.4 }, tone: "danger", href: "/inpatient" },
    { id: "doctors", label: "Total doctors", value: "287", change: { value: 5.1 }, tone: "primary", href: "/doctors" },
    { id: "nurses", label: "Total nurses", value: "624", change: { value: 7.3 }, tone: "success", href: "/nurses" },
    { id: "lab-pending", label: "Pending laboratory tests", value: "109", change: { value: -2.4, positiveIsGood: false }, tone: "warning", href: "/laboratory-orders" },
    { id: "lab-completed", label: "Completed laboratory tests", value: "2,418", change: { value: 12.7 }, tone: "success", href: "/laboratory-results" },
    { id: "pharmacy-alerts", label: "Pharmacy low-stock alerts", value: "18", change: { value: -1.2, positiveIsGood: false }, tone: "danger", href: "/medicines" },
    { id: "revenue", label: "Today's revenue", value: "ETB 1,540,000", change: { value: 9.4 }, tone: "success", href: "/billing" },
  ],
  patientTrend: [
    { label: "Mon", visits: 122, admissions: 48, registrations: 31 },
    { label: "Tue", visits: 144, admissions: 52, registrations: 34 },
    { label: "Wed", visits: 151, admissions: 58, registrations: 36 },
    { label: "Thu", visits: 168, admissions: 61, registrations: 39 },
    { label: "Fri", visits: 171, admissions: 65, registrations: 41 },
    { label: "Sat", visits: 186, admissions: 72, registrations: 46 },
    { label: "Sun", visits: 191, admissions: 76, registrations: 50 },
  ],
  departmentMix: [
    { name: "OPD", value: 28 },
    { name: "Emergency", value: 19 },
    { name: "Surgery", value: 15 },
    { name: "Pediatrics", value: 17 },
    { name: "Internal Medicine", value: 14 },
    { name: "Other", value: 7 },
  ],
  appointmentBreakdown: [
    { label: "Mon", scheduled: 124, completed: 89, cancelled: 9, noShow: 7 },
    { label: "Tue", scheduled: 136, completed: 97, cancelled: 8, noShow: 5 },
    { label: "Wed", scheduled: 142, completed: 112, cancelled: 11, noShow: 6 },
    { label: "Thu", scheduled: 150, completed: 118, cancelled: 10, noShow: 8 },
    { label: "Fri", scheduled: 158, completed: 126, cancelled: 13, noShow: 9 },
    { label: "Sat", scheduled: 116, completed: 94, cancelled: 7, noShow: 6 },
  ],
  financialTrend: [
    { label: "Jan", revenue: 520000, target: 480000 },
    { label: "Feb", revenue: 595000, target: 500000 },
    { label: "Mar", revenue: 640000, target: 540000 },
    { label: "Apr", revenue: 690000, target: 590000 },
    { label: "May", revenue: 742000, target: 620000 },
    { label: "Jun", revenue: 805000, target: 700000 },
    { label: "Jul", revenue: 876000, target: 760000 },
  ],
  occupancyTrend: [
    { label: "Mon", available: 220, occupied: 180, reserved: 16, maintenance: 4 },
    { label: "Tue", available: 214, occupied: 186, reserved: 18, maintenance: 5 },
    { label: "Wed", available: 207, occupied: 192, reserved: 18, maintenance: 3 },
    { label: "Thu", available: 210, occupied: 188, reserved: 17, maintenance: 5 },
    { label: "Fri", available: 216, occupied: 183, reserved: 15, maintenance: 6 },
    { label: "Sat", available: 220, occupied: 180, reserved: 14, maintenance: 6 },
  ],
  labTrend: [
    { label: "Mon", pending: 41, processing: 18, completed: 72 },
    { label: "Tue", pending: 47, processing: 20, completed: 89 },
    { label: "Wed", pending: 53, processing: 23, completed: 96 },
    { label: "Thu", pending: 49, processing: 25, completed: 88 },
    { label: "Fri", pending: 59, processing: 27, completed: 104 },
    { label: "Sat", pending: 45, processing: 21, completed: 81 },
  ],
  recentActivities: [
    { id: "act-001", activity: "Critical lab result signed off", user: "Dr. Abebe Bekele", department: "Laboratory", timestamp: "2026-11-12 08:45", status: "danger" },
    { id: "act-002", activity: "New emergency case registered", user: "Sr. Tigist Alemu", department: "Emergency", timestamp: "2026-11-12 08:32", status: "warning" },
    { id: "act-003", activity: "Invoice approved for discharge", user: "Ato Hanif Jemal", department: "Finance", timestamp: "2026-11-12 08:10", status: "success" },
    { id: "act-004", activity: "Low stock alert for Amoxicillin", user: "W/ro Liya Tesfaye", department: "Pharmacy", timestamp: "2026-11-12 07:52", status: "info" },
    { id: "act-005", activity: "Bed assignment updated", user: "Nurse Fasil Bekele", department: "Internal Medicine", timestamp: "2026-11-12 07:38", status: "success" },
  ],
  upcomingAppointments: [
    { id: "apt-101", patient: "Mikiyas Bekele", doctor: "Dr. Selam Girma", department: "Internal Medicine", time: "09:00 AM", status: "scheduled" },
    { id: "apt-102", patient: "Tiruwork Lemma", doctor: "Dr. Kidist Haile", department: "Gynecology & Obstetrics", time: "09:30 AM", status: "in-progress" },
    { id: "apt-103", patient: "Dawit Haile", doctor: "Dr. Mulu Alemu", department: "Orthopedics", time: "10:15 AM", status: "scheduled" },
    { id: "apt-104", patient: "Netsanet Abate", doctor: "Dr. Bereket Assefa", department: "Pediatrics", time: "11:00 AM", status: "completed" },
  ],
  emergencyCases: [
    { id: "ER-1008", patientId: "GHMS-000236", triage: "Immediate", arrivalTime: "08:42 AM", department: "Emergency", status: "critical" },
    { id: "ER-1009", patientId: "GHMS-000241", triage: "Urgent", arrivalTime: "08:26 AM", department: "Trauma", status: "monitoring" },
    { id: "ER-1010", patientId: "GHMS-000249", triage: "Stable", arrivalTime: "08:08 AM", department: "Observation", status: "stable" },
  ],
  pharmacyAlerts: [
    { id: "ph-001", medicine: "Amoxicillin 500mg", batch: "AMX-4021", quantity: 42, expiry: "2026-12-18", alertType: "Low stock" },
    { id: "ph-002", medicine: "Insulin Glargine", batch: "INS-8812", quantity: 18, expiry: "2026-11-30", alertType: "Critical stock" },
    { id: "ph-003", medicine: "Paracetamol 500mg", batch: "PAR-2108", quantity: 75, expiry: "2027-01-15", alertType: "Expiring soon" },
  ],
  quickActions: [
    { id: "register-patient", label: "Register patient", href: "/patient-registration", icon: "Users", tone: "primary" },
    { id: "book-appointment", label: "Book appointment", href: "/appointments", icon: "CalendarCheck", tone: "success" },
    { id: "create-visit", label: "Create visit", href: "/opd", icon: "ClipboardList", tone: "warning" },
    { id: "register-emergency", label: "Register emergency case", href: "/emergency", icon: "HeartPulse", tone: "danger" },
    { id: "add-doctor", label: "Add doctor", href: "/doctors", icon: "Stethoscope", tone: "primary" },
    { id: "add-lab-order", label: "Add laboratory order", href: "/laboratory-orders", icon: "FlaskConical", tone: "warning" },
    { id: "add-medicine", label: "Add medicine", href: "/medicines", icon: "Pill", tone: "success" },
    { id: "generate-invoice", label: "Generate invoice", href: "/billing", icon: "Receipt", tone: "danger" },
  ],
};
