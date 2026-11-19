import { Building2, Cog, Files, ShieldCheck, Tags, UserCog, Users } from "lucide-react";
import type { ModuleScreen, AnyRow, FormFieldConfig } from "@/modules/types";
import type { Column } from "@/components/ui/DataTable";
import type { PermissionRow } from "@/components/templates/PermissionsMatrix";
import type { ServicePriceRecord } from "@/services/finance-hr";

// -------------------------------------------------------------- Service pricing

const servicePrices: ServicePriceRecord[] = [
  { id: "svc-001", service: "General consultation", category: "Outpatient", unitPrice: 250, insuranceCovered: true, status: "Active" },
  { id: "svc-002", service: "Specialist consultation", category: "Outpatient", unitPrice: 450, insuranceCovered: true, status: "Active" },
  { id: "svc-003", service: "Complete blood count (CBC)", category: "Laboratory", unitPrice: 180, insuranceCovered: true, status: "Active" },
  { id: "svc-004", service: "Chest X-ray", category: "Radiology", unitPrice: 550, insuranceCovered: true, status: "Active" },
  { id: "svc-005", service: "Abdominal ultrasound", category: "Radiology", unitPrice: 480, insuranceCovered: true, status: "Active" },
  { id: "svc-006", service: "Inpatient bed (per day)", category: "Ward", unitPrice: 450, insuranceCovered: true, status: "Active" },
  { id: "svc-007", service: "ICU bed (per day)", category: "Ward", unitPrice: 1800, insuranceCovered: true, status: "Active" },
  { id: "svc-008", service: "Minor surgery", category: "Theater", unitPrice: 4800, insuranceCovered: false, status: "Active" },
  { id: "svc-009", service: "Major surgery", category: "Theater", unitPrice: 12500, insuranceCovered: false, status: "Active" },
  { id: "svc-010", service: "Physiotherapy session", category: "Therapy", unitPrice: 300, insuranceCovered: false, status: "Active" },
  { id: "svc-011", service: "Ambulance transport (within city)", category: "Emergency", unitPrice: 350, insuranceCovered: false, status: "Active" },
  { id: "svc-012", service: "Dental extraction", category: "Dentistry", unitPrice: 400, insuranceCovered: false, status: "Inactive" },
];

const servicePriceColumns: Column<AnyRow>[] = [
  { key: "service", header: "Service", sortValue: (row) => String(row.service) },
  { key: "category", header: "Category", sortValue: (row) => String(row.category), hideOnTablet: true },
  { key: "unitPrice", header: "Price (ETB)", align: "right", sortValue: (row) => Number(row.unitPrice), render: (row) => <span className="font-medium">{Number(row.unitPrice).toLocaleString("en-US")}</span> },
  { key: "insuranceCovered", header: "Insurance", align: "center", sortValue: (row) => (row.insuranceCovered ? 1 : 0), hideOnMobile: true, render: (row) => (row.insuranceCovered ? <span className="text-success-600 dark:text-success-400">Covered</span> : <span className="text-slate-400">—</span>) },
  { key: "status", header: "Status", sortValue: (row) => String(row.status), render: (row) => <span className="capitalize">{String(row.status).toLowerCase()}</span> },
];

// -------------------------------------------------------------------- Users

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  status: string;
}

const users: UserRow[] = [
  { id: "usr-001", name: "Dr. Abebe Bekele", email: "abebe.bekele@gondar-hospital.et", role: "Administrator", department: "Administration", status: "active" },
  { id: "usr-002", name: "Dr. Selam Girma", email: "selam.girma@gondar-hospital.et", role: "Physician", department: "Internal Medicine", status: "active" },
  { id: "usr-003", name: "Sr. Tigist Alemu", email: "tigist.alemu@gondar-hospital.et", role: "Nurse", department: "Internal Medicine", status: "active" },
  { id: "usr-004", name: "Ato Getu Assefa", email: "getu.assefa@gondar-hospital.et", role: "Lab Technologist", department: "Laboratory", status: "active" },
  { id: "usr-005", name: "W/ro Liya Tesfaye", email: "liya.tesfaye@gondar-hospital.et", role: "Pharmacist", department: "Pharmacy", status: "active" },
  { id: "usr-006", name: "Ato Hanif Jemal", email: "hanif.jemal@gondar-hospital.et", role: "Cashier", department: "Finance", status: "pending" },
];

const userColumns: Column<AnyRow>[] = [
  { key: "name", header: "User", sortValue: (row) => String(row.name) },
  { key: "email", header: "Email", sortValue: (row) => String(row.email), hideOnMobile: true, render: (row) => <span className="text-xs text-slate-500 dark:text-slate-400">{String(row.email)}</span> },
  { key: "role", header: "Role", sortValue: (row) => String(row.role) },
  { key: "department", header: "Department", sortValue: (row) => String(row.department), hideOnTablet: true },
  { key: "status", header: "Status", sortValue: (row) => String(row.status), render: (row) => <span className="capitalize">{String(row.status)}</span> },
];

// -------------------------------------------------------------------- Roles

interface RoleRow {
  id: string;
  role: string;
  description: string;
  users: number;
  permissions: number;
  status: string;
}

const roles: RoleRow[] = [
  { id: "role-001", role: "Administrator", description: "Full system access and configuration", users: 3, permissions: 42, status: "active" },
  { id: "role-002", role: "Physician", description: "Clinical records, orders and prescriptions", users: 38, permissions: 21, status: "active" },
  { id: "role-003", role: "Nurse", description: "Vitals, ward management and care tasks", users: 64, permissions: 17, status: "active" },
  { id: "role-004", role: "Lab Technologist", description: "Lab orders, specimens and results", users: 12, permissions: 11, status: "active" },
  { id: "role-005", role: "Cashier", description: "Billing, payments and invoices", users: 6, permissions: 9, status: "active" },
  { id: "role-006", role: "Auditor", description: "Read-only access to logs and reports", users: 2, permissions: 7, status: "pending" },
];

const roleColumns: Column<AnyRow>[] = [
  { key: "role", header: "Role", sortValue: (row) => String(row.role) },
  { key: "description", header: "Description", sortValue: (row) => String(row.description), hideOnMobile: true },
  { key: "users", header: "Users", align: "right", sortValue: (row) => Number(row.users) },
  { key: "permissions", header: "Permissions", align: "right", sortValue: (row) => Number(row.permissions), hideOnTablet: true },
  { key: "status", header: "Status", sortValue: (row) => String(row.status), render: (row) => <span className="capitalize">{String(row.status)}</span> },
];

// --------------------------------------------------------------- Departments (admin)

interface DeptAdminRow {
  id: string;
  name: string;
  head: string;
  staff: number;
  beds: number;
  status: string;
}

const deptsAdmin: DeptAdminRow[] = [
  { id: "dpt-001", name: "Internal Medicine", head: "Dr. Selam Girma", staff: 48, beds: 90, status: "active" },
  { id: "dpt-002", name: "Surgery", head: "Dr. Mulu Alemu", staff: 40, beds: 60, status: "active" },
  { id: "dpt-003", name: "Pediatrics", head: "Dr. Bereket Assefa", staff: 44, beds: 70, status: "active" },
  { id: "dpt-004", name: "Gynecology & Obstetrics", head: "Dr. Kidist Haile", staff: 46, beds: 65, status: "active" },
  { id: "dpt-005", name: "Orthopedics", head: "Dr. Dawit Mengistu", staff: 28, beds: 40, status: "active" },
  { id: "dpt-006", name: "Psychiatry", head: "Dr. Rahel Wolde", staff: 18, beds: 25, status: "active" },
  { id: "dpt-007", name: "ICU", head: "Dr. Samuel Ayele", staff: 32, beds: 20, status: "active" },
];

const deptAdminColumns: Column<AnyRow>[] = [
  { key: "name", header: "Department", sortValue: (row) => String(row.name) },
  { key: "head", header: "Department head", sortValue: (row) => String(row.head), hideOnTablet: true },
  { key: "staff", header: "Staff", align: "right", sortValue: (row) => Number(row.staff) },
  { key: "beds", header: "Beds", align: "right", sortValue: (row) => Number(row.beds), hideOnMobile: true },
  { key: "status", header: "Status", sortValue: (row) => String(row.status), render: (row) => <span className="capitalize">{String(row.status)}</span> },
];

// ----------------------------------------------------------------- Audit logs

interface AuditRow {
  id: string;
  time: string;
  user: string;
  action: string;
  module: string;
  detail: string;
  status: string;
}

const auditLogs: AuditRow[] = [
  { id: "au-001", time: "2026-11-10 10:34", user: "Dr. Abebe Bekele", action: "Updated", module: "Hospital Settings", detail: "Changed visitor policy text", status: "completed" },
  { id: "au-002", time: "2026-11-10 10:12", user: "W/ro Liya Tesfaye", action: "Dispensed", module: "Pharmacy", detail: "RX-7716 — Dawit Haile", status: "completed" },
  { id: "au-003", time: "2026-11-10 09:58", user: "Sr. Tigist Alemu", action: "Recorded", module: "Vital Signs", detail: "Yohannes Kebede — critical flag", status: "completed" },
  { id: "au-004", time: "2026-11-10 09:40", user: "Ato Getu Assefa", action: "Validated", module: "Lab Results", detail: "LAB-2342 — hemoglobin 6.1", status: "completed" },
  { id: "au-005", time: "2026-11-10 09:02", user: "Dr. Abebe Bekele", action: "Login", module: "Authentication", detail: "Success from 10.4.22.17", status: "completed" },
  { id: "au-006", time: "2026-11-10 08:47", user: "Unknown", action: "Login failed", module: "Authentication", detail: "3 attempts from 196.188.x.x", status: "failed" },
];

const auditColumns: Column<AnyRow>[] = [
  { key: "time", header: "Time", sortValue: (row) => String(row.time), render: (row) => <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{String(row.time)}</span> },
  { key: "user", header: "User", sortValue: (row) => String(row.user) },
  { key: "action", header: "Action", sortValue: (row) => String(row.action) },
  { key: "module", header: "Module", sortValue: (row) => String(row.module), hideOnTablet: true },
  { key: "detail", header: "Detail", sortValue: (row) => String(row.detail), hideOnMobile: true },
  { key: "status", header: "Result", sortValue: (row) => String(row.status), render: (row) => <span className="capitalize">{String(row.status)}</span> },
];

// ---------------------------------------------------------------- Permissions

const ROLES = ["Administrator", "Physician", "Nurse", "Cashier", "Lab Tech"];

const permissionRows: PermissionRow[] = [
  { key: "patients.view", group: "Patients", label: "View patients", description: "See patient list and summaries", defaultRoles: ["Administrator", "Physician", "Nurse", "Cashier", "Lab Tech"] },
  { key: "patients.create", group: "Patients", label: "Register patients", defaultRoles: ["Administrator", "Nurse"] },
  { key: "patients.edit", group: "Patients", label: "Edit patient records", defaultRoles: ["Administrator", "Physician"] },
  { key: "appointments.manage", group: "Scheduling", label: "Manage appointments", description: "Create, move and cancel bookings", defaultRoles: ["Administrator", "Physician", "Nurse"] },
  { key: "lab.orders", group: "Diagnostics", label: "Order lab tests", defaultRoles: ["Administrator", "Physician"] },
  { key: "lab.results", group: "Diagnostics", label: "Validate lab results", defaultRoles: ["Administrator", "Lab Tech"] },
  { key: "pharmacy.dispense", group: "Pharmacy", label: "Dispense medicines", defaultRoles: ["Administrator"] },
  { key: "finance.billing", group: "Finance", label: "Manage billing", description: "Invoices, payments and refunds", defaultRoles: ["Administrator", "Cashier"] },
  { key: "hr.payroll", group: "HR", label: "Process payroll", defaultRoles: ["Administrator"] },
  { key: "admin.users", group: "Administration", label: "Manage users & roles", defaultRoles: ["Administrator"] },
  { key: "admin.settings", group: "Administration", label: "Change hospital settings", defaultRoles: ["Administrator"] },
];

// ------------------------------------------------------------ Hospital settings

const SETTINGS_FIELDS: FormFieldConfig[] = [
  { name: "hospitalName", label: "Hospital name", type: "text", span: 2, defaultValue: "Gondar Hospital" },
  { name: "region", label: "Region", type: "text", defaultValue: "Amhara" },
  { name: "city", label: "City", type: "text", defaultValue: "Gondar" },
  { name: "phone", label: "Main phone", type: "tel", defaultValue: "+251 58 111 0000" },
  { name: "email", label: "Contact email", type: "email", defaultValue: "info@gondar-hospital.et" },
];

export const adminScreens: Record<string, ModuleScreen> = {
  "/users": {
    kind: "list",
    screen: {
      description: "User accounts with roles, departments and access status.",
      columns: userColumns,
      data: users,
      keyExtractor: (row) => String(row.id),
      searchKeys: ["name", "email", "role", "department"],
      searchPlaceholder: "Search user, email or role…",
      filters: [
        {
          label: "Role",
          options: [
            { label: "All roles", value: "" },
            ...[...new Set(users.map((u) => u.role))].sort().map((r) => ({ label: r, value: r })),
          ],
          matches: (row, value) => row.role === value,
        },
      ],
      stats: [
        { label: "Users", value: String(users.length), icon: <Users className="h-5 w-5" />, tone: "primary" },
        { label: "Active", value: String(users.filter((u) => u.status === "active").length), icon: <Users className="h-5 w-5" />, tone: "success" },
        { label: "Pending activation", value: String(users.filter((u) => u.status === "pending").length), icon: <Users className="h-5 w-5" />, tone: "warning" },
        { label: "Administrators", value: String(users.filter((u) => u.role === "Administrator").length), icon: <UserCog className="h-5 w-5" />, tone: "danger" },
      ],
      emptyIcon: Users,
    },
  },
  "/roles": {
    kind: "list",
    screen: {
      description: "Role definitions that group permissions across the system.",
      columns: roleColumns,
      data: roles,
      keyExtractor: (row) => String(row.id),
      searchKeys: ["role", "description"],
      searchPlaceholder: "Search role…",
      emptyIcon: UserCog,
    },
  },
  "/permissions": { kind: "custom", screen: "permissions" },
  "/departments": {
    kind: "list",
    screen: {
      description: "Department configuration, heads and capacity.",
      columns: deptAdminColumns,
      data: deptsAdmin,
      keyExtractor: (row) => String(row.id),
      searchKeys: ["name", "head"],
      searchPlaceholder: "Search department or head…",
      emptyIcon: Building2,
    },
  },
  "/audit-logs": {
    kind: "list",
    screen: {
      description: "Chronological action history for accountability and review.",
      columns: auditColumns,
      data: auditLogs,
      keyExtractor: (row) => String(row.id),
      searchKeys: ["user", "action", "module", "detail"],
      searchPlaceholder: "Search user, action or module…",
      filters: [
        {
          label: "Result",
          options: [
            { label: "All", value: "" },
            { label: "Success", value: "completed" },
            { label: "Failed", value: "failed" },
          ],
          matches: (row, value) => row.status === value,
        },
      ],
      emptyIcon: Files,
    },
  },
  "/service-pricing": {
    kind: "list",
    screen: {
      description: "Hospital service price list (ETB) with insurance coverage flags.",
      columns: servicePriceColumns,
      data: servicePrices,
      keyExtractor: (row) => String(row.id),
      searchKeys: ["service", "category"],
      searchPlaceholder: "Search service or category…",
      filters: [
        {
          label: "Category",
          options: [
            { label: "All categories", value: "" },
            ...[...new Set(servicePrices.map((s) => s.category))].sort().map((c) => ({ label: c, value: c })),
          ],
          matches: (row, value) => row.category === value,
        },
        {
          label: "Status",
          options: [
            { label: "All", value: "" },
            { label: "Active", value: "Active" },
            { label: "Inactive", value: "Inactive" },
          ],
          matches: (row, value) => row.status === value,
        },
      ],
      stats: [
        { label: "Priced services", value: String(servicePrices.length), icon: <Tags className="h-5 w-5" />, tone: "primary" },
        { label: "Insurance covered", value: String(servicePrices.filter((s) => s.insuranceCovered).length), icon: <ShieldCheck className="h-5 w-5" />, tone: "success" },
        { label: "Inactive", value: String(servicePrices.filter((s) => s.status === "Inactive").length), icon: <Tags className="h-5 w-5" />, tone: "warning" },
        { label: "Categories", value: String(new Set(servicePrices.map((s) => s.category)).size), icon: <Building2 className="h-5 w-5" />, tone: "danger" },
      ],
      emptyIcon: Tags,
    },
  },
  "/hospital-settings": {
    kind: "settings",
    screen: {
      description: "Global configuration applied across the hospital system.",
      sections: [
        {
          title: "Hospital identity",
          description: "Shown in the interface, on printed reports and receipts.",
          fields: SETTINGS_FIELDS,
        },
        {
          title: "Operations",
          fields: [
            { name: "opdStart", label: "OPD opening time", type: "time", defaultValue: "08:00" },
            { name: "opdEnd", label: "OPD closing time", type: "time", defaultValue: "17:00" },
            { name: "currency", label: "Currency", type: "select", defaultValue: "ETB", options: [{ label: "ETB — Ethiopian Birr", value: "ETB" }, { label: "USD — US Dollar", value: "USD" }] },
            { name: "vat", label: "VAT on private services (%)", type: "number", defaultValue: "15" },
          ],
        },
        {
          title: "Preferences",
          fields: [
            { name: "defaultLanguage", label: "Default interface language", type: "select", defaultValue: "en", options: [{ label: "English", value: "en" }, { label: "አማርኛ (Amharic)", value: "am" }] },
            { name: "insuranceRequired", label: "Require insurance claim reference for insured patients", type: "checkbox" },
            { name: "auditAlerts", label: "Email administrators on failed login attempts", type: "checkbox" },
          ],
        },
      ],
    },
  },
};

export { ROLES, permissionRows };
