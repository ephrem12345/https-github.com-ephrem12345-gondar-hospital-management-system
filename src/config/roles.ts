import {
  UserCog,
  Stethoscope,
  HeartPulse,
  FlaskConical,
  ClipboardList,
  Pill,
  Banknote,
  UserCheck,
  Users,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface RoleConfig {
  key: string;
  title: string;
  portalName: string;
  shortRole: string;
  category: string;
  categoryAm: string;
  description: string;
  descriptionAm: string;
  expectedRoles: string[];
  defaultDashboard: string;
  icon: LucideIcon;
  badgeClass: string;
  borderHoverClass: string;
  gradientClass: string;
  colorHex?: string;
  buttonClass?: string;
}

export const ROLE_CONFIGS: Record<string, RoleConfig> = {
  administrator: {
    key: "administrator",
    title: "Administrator Login",
    portalName: "Administrator Portal",
    shortRole: "Administrator",
    category: "Hospital Administration & IT",
    categoryAm: "የሆስፒታል አስተዳደር እና አይቲ",
    description: "System Management and Configuration",
    descriptionAm: "የስርዓት አስተዳደር እና ማዋቀር",
    expectedRoles: ["ADMINISTRATOR"],
    defaultDashboard: "/overview",
    icon: Settings,
    badgeClass: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
    borderHoverClass: "hover:border-blue-500 hover:shadow-blue-500/10",
    gradientClass: "from-blue-600 to-indigo-700",
    colorHex: "#2563eb",
    buttonClass: "bg-[#1d4ed8] hover:bg-[#1e40af] text-white",
  },
  doctor: {
    key: "doctor",
    title: "Doctor Login",
    portalName: "Doctor & Physician Portal",
    shortRole: "Doctor",
    category: "Clinical Care & Consultations",
    categoryAm: "ክሊኒካል ሕክምና እና ምርመራ",
    description: "Access Patient Records and Services",
    descriptionAm: "የታካሚ መዝገቦችን እና አገልግሎቶችን ማግኘት",
    expectedRoles: ["DOCTOR", "PHYSICIAN"],
    defaultDashboard: "/opd",
    icon: Stethoscope,
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
    borderHoverClass: "hover:border-emerald-500 hover:shadow-emerald-500/10",
    gradientClass: "from-emerald-600 to-teal-700",
    colorHex: "#059669",
    buttonClass: "bg-[#059669] hover:bg-[#047857] text-white",
  },
  nurse: {
    key: "nurse",
    title: "Nurse Login",
    portalName: "Nursing & Inpatient Care Portal",
    shortRole: "Nurse",
    category: "Nursing, Triage & Ward Care",
    categoryAm: "የነርሲንግ እና የዎርድ ክብካቤ",
    description: "Manage Patient Care and Nursing Services",
    descriptionAm: "የታካሚ ክብካቤ እና የነርሲንግ አገልግሎቶች",
    expectedRoles: ["NURSE"],
    defaultDashboard: "/vital-signs",
    icon: HeartPulse,
    badgeClass: "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800",
    borderHoverClass: "hover:border-sky-500 hover:shadow-sky-500/10",
    gradientClass: "from-sky-500 to-cyan-600",
    colorHex: "#0284c7",
    buttonClass: "bg-[#0284c7] hover:bg-[#0369a1] text-white",
  },
  laboratory: {
    key: "laboratory",
    title: "Laboratory Staff Login",
    portalName: "Laboratory & Diagnostics Portal",
    shortRole: "Laboratory Technologist",
    category: "Diagnostic Testing & Pathology",
    categoryAm: "የላቦራቶሪ እና የምርመራ አገልግሎት",
    description: "Manage Lab Tests and Results",
    descriptionAm: "የላብራቶሪ ምርመራዎችን እና ውጤቶችን ማስተዳደር",
    expectedRoles: ["LABORATORY_TECHNICIAN", "LAB_TECH", "RADIOLOGY_TECHNICIAN"],
    defaultDashboard: "/laboratory",
    icon: FlaskConical,
    badgeClass: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800",
    borderHoverClass: "hover:border-purple-500 hover:shadow-purple-500/10",
    gradientClass: "from-purple-600 to-indigo-700",
    colorHex: "#7c3aed",
    buttonClass: "bg-[#7c3aed] hover:bg-[#6d28d9] text-white",
  },
  pharmacist: {
    key: "pharmacist",
    title: "Pharmacist Login",
    portalName: "Pharmacy & Dispensing Portal",
    shortRole: "Pharmacist",
    category: "Medication Dispensing & Stock",
    categoryAm: "የመድኃኒት ማደያ እና ክምችት",
    description: "Manage Medications and Pharmacy",
    descriptionAm: "መድኃኒቶችን እና ፋርማሲን ማስተዳደር",
    expectedRoles: ["PHARMACIST"],
    defaultDashboard: "/pharmacy",
    icon: Pill,
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
    borderHoverClass: "hover:border-emerald-500 hover:shadow-emerald-500/10",
    gradientClass: "from-emerald-600 to-teal-700",
    colorHex: "#10b981",
    buttonClass: "bg-[#10b981] hover:bg-[#059669] text-white",
  },
  receptionist: {
    key: "receptionist",
    title: "Receptionist Login",
    portalName: "Reception & Front Desk Portal",
    shortRole: "Receptionist",
    category: "Patient Registration & Front Desk",
    categoryAm: "የታካሚ ምዝገባ እና መስተንግዶ",
    description: "Handle Patient Registration & Queue.",
    descriptionAm: "የታካሚ ምዝገባ እና የተራ ቁጥር ማስተናገድ",
    expectedRoles: ["RECEPTIONIST"],
    defaultDashboard: "/patient-registration",
    icon: ClipboardList,
    badgeClass: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800",
    borderHoverClass: "hover:border-orange-500 hover:shadow-orange-500/10",
    gradientClass: "from-orange-500 to-amber-600",
    colorHex: "#ea580c",
    buttonClass: "bg-[#ea580c] hover:bg-[#c2410c] text-white",
  },
  patient: {
    key: "patient",
    title: "Patient Login",
    portalName: "Patient Health Portal",
    shortRole: "Patient",
    category: "Patient Self-Service Portal",
    categoryAm: "የታካሚ የግል ፖርታል",
    description: "Book Appointment and View Records",
    descriptionAm: "ቀጠሮ መያዝ እና የሕክምና መዝገቦችን ማየት",
    expectedRoles: ["PATIENT"],
    defaultDashboard: "/patient-portal",
    icon: UserCheck,
    badgeClass: "bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-950/50 dark:text-pink-300 dark:border-pink-800",
    borderHoverClass: "hover:border-pink-500 hover:shadow-pink-500/10",
    gradientClass: "from-pink-600 to-rose-700",
    colorHex: "#e11d48",
    buttonClass: "bg-[#e11d48] hover:bg-[#be123c] text-white",
  },
  other: {
    key: "other",
    title: "Other Staff Login",
    portalName: "Hospital Staff Portal",
    shortRole: "Other Staff",
    category: "General Hospital Services",
    categoryAm: "አጠቃላይ የሆስፒታል አገልግሎቶች",
    description: "Access General Services",
    descriptionAm: "አጠቃላይ አገልግሎቶችን ማግኘት",
    expectedRoles: [
      "STAFF",
      "OTHER_STAFF",
      "HOSPITAL_STAFF",
      "DEPARTMENT_HEAD",
      "HR_OFFICER",
      "RADIOLOGY_TECHNICIAN",
      "CLINICAL_SUPPORT",
    ],
    defaultDashboard: "/overview",
    icon: Users,
    badgeClass: "bg-blue-900 text-white border-blue-900 dark:bg-blue-950 dark:text-blue-200",
    borderHoverClass: "hover:border-blue-900 hover:shadow-blue-900/10",
    gradientClass: "from-blue-900 to-slate-900",
    colorHex: "#1e3a8a",
    buttonClass: "bg-[#1e3a8a] hover:bg-[#172554] text-white",
  },
  finance: {
    key: "finance",
    title: "Finance Staff Login",
    portalName: "Finance & Cashier Portal",
    shortRole: "Finance Officer",
    category: "Billing, Cashier & Insurance",
    categoryAm: "የክፍያ፣ የሂሳብ እና ኢንሹራንስ",
    description: "Generate patient bills, collect medical service payments, and manage insurance.",
    descriptionAm: "የታካሚ የክፍያ ደረሰኞች ማዘጋጀት፣ ክፍያ መቀበል እና የኢንሹራንስ ጥያቄዎችን ማስተናገድ።",
    expectedRoles: ["FINANCE_OFFICER", "CASHIER"],
    defaultDashboard: "/billing",
    icon: Banknote,
    badgeClass: "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950/50 dark:text-cyan-300 dark:border-cyan-800",
    borderHoverClass: "hover:border-cyan-500 hover:shadow-cyan-500/10",
    gradientClass: "from-cyan-600 to-blue-700",
    colorHex: "#0284c7",
    buttonClass: "bg-[#0284c7] hover:bg-[#0369a1] text-white",
  },
};

export const ROLE_CARD_LIST: RoleConfig[] = [
  ROLE_CONFIGS.administrator,
  ROLE_CONFIGS.doctor,
  ROLE_CONFIGS.nurse,
  ROLE_CONFIGS.laboratory,
  ROLE_CONFIGS.pharmacist,
  ROLE_CONFIGS.receptionist,
  ROLE_CONFIGS.patient,
  ROLE_CONFIGS.other,
];

export function getRoleConfig(key?: string | null): RoleConfig | null {
  if (!key) return null;
  const normalized = key.trim().toLowerCase();
  if (normalized === "other_staff" || normalized === "other-staff" || normalized === "staff") {
    return ROLE_CONFIGS.other;
  }
  return ROLE_CONFIGS[normalized] || null;
}

export function getRoleDefaultDashboard(userRole?: string | null): string {
  if (!userRole) return "/overview";
  const upper = userRole.toUpperCase();
  if (upper === "PATIENT") return "/patient-portal";
  if (upper === "DOCTOR" || upper === "PHYSICIAN") return "/opd";
  if (upper === "NURSE") return "/vital-signs";
  if (
    upper === "LABORATORY_TECHNICIAN" ||
    upper === "LAB_TECH" ||
    upper === "RADIOLOGY_TECHNICIAN"
  ) {
    return "/laboratory";
  }
  if (upper === "PHARMACIST") return "/pharmacy";
  if (upper === "RECEPTIONIST") return "/patient-registration";
  if (upper === "FINANCE_OFFICER" || upper === "CASHIER") return "/billing";
  return "/overview";
}

export function formatRoleTitle(role?: string | null): string {
  if (!role) return "Staff";
  const upper = role.toUpperCase();
  for (const config of Object.values(ROLE_CONFIGS)) {
    if (config.expectedRoles.includes(upper)) {
      return config.shortRole;
    }
  }
  return role
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
