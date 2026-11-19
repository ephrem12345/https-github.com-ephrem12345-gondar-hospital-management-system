import { Activity, ClipboardList, FileText, FileWarning, MessageSquareWarning } from "lucide-react";
import type { ModuleScreen, AnyRow, ChartConfig } from "@/modules/types";
import type { Column } from "@/components/ui/DataTable";

// ---------------------------------------------------------------- Reports

interface ReportRow {
  id: string;
  report: string;
  category: string;
  frequency: string;
  lastRun: string;
  status: string;
}

const reports: ReportRow[] = [
  { id: "rp-001", report: "Daily operations summary", category: "Operations", frequency: "Daily", lastRun: "2026-11-13 08:00", status: "completed" },
  { id: "rp-002", report: "Monthly revenue statement", category: "Finance", frequency: "Monthly", lastRun: "2026-11-01 06:00", status: "completed" },
  { id: "rp-003", report: "Bed occupancy report", category: "Facilities", frequency: "Weekly", lastRun: "2026-11-09 07:00", status: "completed" },
  { id: "rp-004", report: "Laboratory turnaround analysis", category: "Diagnostics", frequency: "Weekly", lastRun: "2026-11-09 07:30", status: "pending" },
  { id: "rp-005", report: "Stock reorder forecast", category: "Pharmacy", frequency: "Monthly", lastRun: "2026-11-13 06:30", status: "pending" },
  { id: "rp-006", report: "Staff attendance summary", category: "Staff attendance", frequency: "Weekly", lastRun: "2026-11-09 17:00", status: "completed" },
  { id: "rp-007", report: "Clinical performance — OPD quality indicators", category: "Clinical performance", frequency: "Monthly", lastRun: "2026-11-01 07:00", status: "completed" },
  { id: "rp-008", report: "Department performance scorecards", category: "Department performance", frequency: "Monthly", lastRun: "2026-11-02 06:30", status: "completed" },
  { id: "rp-009", report: "Patient statistics — visits, admissions, demographics", category: "Patient statistics", frequency: "Weekly", lastRun: "2026-11-09 08:00", status: "completed" },
  { id: "rp-010", report: "Inventory valuation and movement", category: "Inventory", frequency: "Monthly", lastRun: "2026-11-05 06:00", status: "completed" },
  { id: "rp-011", report: "Payroll cost analysis", category: "Payroll", frequency: "Monthly", lastRun: "2026-11-01 05:30", status: "completed" },
  { id: "rp-012", report: "Procurement spend and delivery performance", category: "Procurement", frequency: "Monthly", lastRun: "2026-11-03 06:15", status: "pending" },
];

const reportColumns: Column<AnyRow>[] = [
  { key: "report", header: "Report", sortValue: (row) => String(row.report) },
  { key: "category", header: "Category", sortValue: (row) => String(row.category), hideOnTablet: true },
  { key: "frequency", header: "Frequency", sortValue: (row) => String(row.frequency) },
  { key: "lastRun", header: "Last run", sortValue: (row) => String(row.lastRun), hideOnMobile: true },
  { key: "status", header: "Status", sortValue: (row) => String(row.status), render: (row) => <span className="capitalize">{String(row.status)}</span> },
];

// -------------------------------------------------------------- Analytics data

const occupancySeries: Record<string, string | number>[] = [
  { month: "Jun", occupancy: 76, waitMinutes: 26 },
  { month: "Jul", occupancy: 78, waitMinutes: 24 },
  { month: "Aug", occupancy: 79, waitMinutes: 25 },
  { month: "Sep", occupancy: 82, waitMinutes: 22 },
  { month: "Oct", occupancy: 85, waitMinutes: 21 },
  { month: "Nov", occupancy: 87, waitMinutes: 19 },
];

const visitsByDept: { name: string; value: number }[] = [
  { name: "Internal Medicine", value: 28 },
  { name: "Pediatrics", value: 22 },
  { name: "Obstetrics", value: 16 },
  { name: "Surgery", value: 14 },
  { name: "Specialties", value: 20 },
];

const admissionsBars: Record<string, string | number>[] = [
  { ward: "Internal Med", admissions: 96 },
  { ward: "Pediatrics", admissions: 74 },
  { ward: "Surgery", admissions: 58 },
  { ward: "Maternity", admissions: 52 },
  { ward: "Orthopedics", admissions: 31 },
  { ward: "ICU", admissions: 22 },
];

const departmentScores: Record<string, string | number>[] = [
  { department: "Internal Med", score: 84 },
  { department: "Surgery", score: 81 },
  { department: "Pediatrics", score: 88 },
  { department: "Maternity", score: 86 },
  { department: "ICU", score: 74 },
  { department: "OPD", score: 65 },
];

const attendanceTrend: Record<string, string | number>[] = [
  { week: "W1", attendance: 93 },
  { week: "W2", attendance: 91 },
  { week: "W3", attendance: 94 },
  { week: "W4", attendance: 90 },
  { week: "W5", attendance: 92 },
  { week: "W6", attendance: 95 },
];

const payrollByDept: Record<string, string | number>[] = [
  { department: "Internal Med", cost: 486 },
  { department: "Surgery", cost: 452 },
  { department: "Pediatrics", cost: 398 },
  { department: "ICU", cost: 341 },
  { department: "Admin", cost: 289 },
  { department: "Diagnostics", cost: 244 },
];

const procurementSpend: { name: string; value: number }[] = [
  { name: "Ethio Pharma PLC", value: 38 },
  { name: "Addis Pharmaceuticals", value: 25 },
  { name: "Med Tech Trading", value: 22 },
  { name: "Highland Supplies", value: 15 },
];

const inventoryHealth: Record<string, string | number>[] = [
  { state: "Healthy", items: 148 },
  { state: "Low stock", items: 23 },
  { state: "Expiring", items: 11 },
  { state: "Expired", items: 4 },
];

const patientAgeMix: { name: string; value: number }[] = [
  { name: "0–14", value: 26 },
  { name: "15–44", value: 41 },
  { name: "45–64", value: 21 },
  { name: "65+", value: 12 },
];

// ------------------------------------------------------------ Notifications center

interface NotificationRow {
  id: string;
  title: string;
  category: string;
  audience: string;
  time: string;
  status: string;
}

const notifications: NotificationRow[] = [
  { id: "n1", title: "Critical lab result — Yohannes Kebede", category: "Lab", audience: "Internal Medicine", time: "5 min ago", status: "pending" },
  { id: "n2", title: "Bed capacity warning — Internal Medicine ward", category: "Facilities", audience: "Administration", time: "22 min ago", status: "pending" },
  { id: "n3", title: "Low stock — Paracetamol 500mg", category: "Pharmacy", audience: "Pharmacy", time: "3 hrs ago", status: "validated" },
  { id: "n4", title: "Invoice settled — INV-2026-0891", category: "Finance", audience: "Finance", time: "5 hrs ago", status: "completed" },
  { id: "n5", title: "Ambulance AM-01 dispatched", category: "Fleet", audience: "Emergency", time: "6 hrs ago", status: "completed" },
];

const notificationColumns: Column<AnyRow>[] = [
  { key: "title", header: "Notification", sortValue: (row) => String(row.title) },
  { key: "category", header: "Category", sortValue: (row) => String(row.category), hideOnTablet: true },
  { key: "audience", header: "Audience", sortValue: (row) => String(row.audience), hideOnMobile: true },
  { key: "time", header: "When", sortValue: (row) => String(row.time) },
  { key: "status", header: "State", sortValue: (row) => String(row.status), render: (row) => <span className="capitalize">{String(row.status)}</span> },
];

// ---------------------------------------------------------------- Feedback

interface FeedbackRow {
  id: string;
  source: string;
  person: string;
  subject: string;
  rating: string;
  received: string;
  status: string;
}

const feedback: FeedbackRow[] = [
  { id: "fb-001", source: "Patient survey", person: "Anonymous", subject: "Excellent nursing care in Pediatrics", rating: "5/5", received: "2026-11-10", status: "completed" },
  { id: "fb-002", source: "Suggestion box", person: "Anonymous", subject: "Long waiting time at pharmacy counter", rating: "3/5", received: "2026-11-10", status: "pending" },
  { id: "fb-003", source: "Online form", person: "Getachew M.", subject: "Appreciation for surgical team", rating: "5/5", received: "2026-11-09", status: "completed" },
  { id: "fb-004", source: "Staff survey", person: "Nurse, Ward B", subject: "Request for additional gloves stock", rating: "—", received: "2026-11-08", status: "validated" },
];

const feedbackColumns: Column<AnyRow>[] = [
  { key: "source", header: "Source", sortValue: (row) => String(row.source), hideOnTablet: true },
  { key: "person", header: "From", sortValue: (row) => String(row.person) },
  { key: "subject", header: "Subject", sortValue: (row) => String(row.subject) },
  { key: "rating", header: "Rating", sortValue: (row) => String(row.rating), hideOnMobile: true },
  { key: "received", header: "Received", align: "right", sortValue: (row) => String(row.received) },
  { key: "status", header: "Status", sortValue: (row) => String(row.status), render: (row) => <span className="capitalize">{String(row.status)}</span> },
];

// --------------------------------------------------------------- Complaints

interface ComplaintRow {
  id: string;
  ticket: string;
  person: string;
  category: string;
  summary: string;
  opened: string;
  status: string;
}

const complaints: ComplaintRow[] = [
  { id: "cm-001", ticket: "CMP-0441", person: "Anonymous", category: "Service quality", summary: "Rude response at billing desk", opened: "2026-11-10", status: "pending" },
  { id: "cm-002", ticket: "CMP-0440", person: "W/ro Almaz T.", category: "Waiting time", summary: "Over 2 hours wait at OPD", opened: "2026-11-10", status: "in-progress" },
  { id: "cm-003", ticket: "CMP-0439", person: "Ato Dawit H.", category: "Cleanliness", summary: "Ward B restroom issue", opened: "2026-11-09", status: "validated" },
  { id: "cm-004", ticket: "CMP-0437", person: "Anonymous", category: "Billing", summary: "Unclear itemized invoice", opened: "2026-11-07", status: "completed" },
];

const complaintColumns: Column<AnyRow>[] = [
  { key: "ticket", header: "Ticket", sortValue: (row) => String(row.ticket), render: (row) => <span className="font-mono text-xs font-semibold text-primary-700 dark:text-primary-300">{String(row.ticket)}</span> },
  { key: "person", header: "Complainant", sortValue: (row) => String(row.person), hideOnTablet: true },
  { key: "category", header: "Category", sortValue: (row) => String(row.category) },
  { key: "summary", header: "Summary", sortValue: (row) => String(row.summary), hideOnMobile: true },
  { key: "opened", header: "Opened", align: "right", sortValue: (row) => String(row.opened) },
  { key: "status", header: "Status", sortValue: (row) => String(row.status), render: (row) => <span className="capitalize">{String(row.status)}</span> },
];

export const managementScreens: Record<string, ModuleScreen> = {
  "/reports": {
    kind: "list",
    screen: {
      description: "Scheduled and on-demand reports across hospital operations.",
      columns: reportColumns,
      data: reports,
      keyExtractor: (row) => String(row.id),
      searchKeys: ["report", "category"],
      searchPlaceholder: "Search report or category…",
      filters: [
        {
          label: "Category",
          options: [
            { label: "All categories", value: "" },
            ...[...new Set(reports.map((r) => r.category))].sort().map((c) => ({ label: c, value: c })),
          ],
          matches: (row, value) => row.category === value,
        },
      ],
      stats: [
        { label: "Report pages", value: String(reports.length), icon: <FileText className="h-5 w-5" />, tone: "primary" },
        { label: "Categories", value: String(new Set(reports.map((r) => r.category)).size), icon: <FileText className="h-5 w-5" />, tone: "success" },
        { label: "Completed (30d)", value: String(reports.filter((r) => r.status === "completed").length), icon: <FileText className="h-5 w-5" />, tone: "success" },
        { label: "Pending run", value: String(reports.filter((r) => r.status === "pending").length), icon: <FileText className="h-5 w-5" />, tone: "warning" },
      ],
      emptyIcon: FileText,
    },
  },
  "/analytics": {
    kind: "analytics",
    screen: {
      description: "Hospital-wide trends, KPIs and performance indicators.",
      kpis: [
        { label: "Bed occupancy", value: "87%", change: { value: 2.4 }, icon: <Activity className="h-5 w-5" />, tone: "primary" },
        { label: "Avg OPD wait", value: "19 min", change: { value: -9.5 }, icon: <Activity className="h-5 w-5" />, tone: "success" },
        { label: "Patient satisfaction", value: "4.4/5", change: { value: 3.1 }, icon: <Activity className="h-5 w-5" />, tone: "success" },
        { label: "Readmission rate", value: "6.2%", change: { value: 0.4, positiveIsGood: false }, icon: <Activity className="h-5 w-5" />, tone: "warning" },
      ],
      charts: [
        {
          type: "area",
          title: "Occupancy & waiting time",
          subtitle: "Monthly, last 6 months",
          data: occupancySeries,
          xKey: "month",
          series: [
            { key: "occupancy", label: "Occupancy %", color: "#1565C0" },
            { key: "waitMinutes", label: "Wait (min)", color: "#F59E0B" },
          ],
        } as ChartConfig,
        {
          type: "pie",
          title: "Visits by department",
          data: visitsByDept,
        } as ChartConfig,
        {
          type: "bar",
          title: "Admissions by ward (30 days)",
          data: admissionsBars,
          xKey: "ward",
          series: [{ key: "admissions", label: "Admissions", color: "#16A34A" }],
        } as ChartConfig,
      ],
    },
  },
  "/performance-reports": {
    kind: "analytics",
    screen: {
      description: "Performance dashboards — clinical, department, patient, inventory, attendance, payroll and procurement.",
      kpis: [
        { label: "Clinical performance", value: "92%", hint: "Guideline adherence", icon: <Activity className="h-5 w-5" />, tone: "success" },
        { label: "Financial performance", value: "ETB 970K", hint: "Operating surplus (Nov)", icon: <Activity className="h-5 w-5" />, tone: "primary" },
        { label: "Department performance", value: "78%", hint: "Average scorecard", icon: <Activity className="h-5 w-5" />, tone: "success" },
        { label: "Patient statistics", value: "1,842", hint: "Visits this week", icon: <Activity className="h-5 w-5" />, tone: "primary" },
      ],
      charts: [
        {
          type: "bar",
          title: "Department performance scorecard",
          subtitle: "Composite score (%)",
          data: departmentScores,
          xKey: "department",
          series: [{ key: "score", label: "Score", color: "#1565C0" }],
        } as ChartConfig,
        {
          type: "area",
          title: "Staff attendance rate",
          subtitle: "Weekly average (%)",
          data: attendanceTrend,
          xKey: "week",
          series: [{ key: "attendance", label: "Attendance", color: "#16A34A" }],
        } as ChartConfig,
        {
          type: "bar",
          title: "Payroll cost by department",
          subtitle: "November (thousands ETB)",
          data: payrollByDept,
          xKey: "department",
          series: [{ key: "cost", label: "Cost", color: "#F59E0B" }],
        } as ChartConfig,
        {
          type: "pie",
          title: "Procurement spend by supplier",
          subtitle: "November share (%)",
          data: procurementSpend,
        } as ChartConfig,
        {
          type: "bar",
          title: "Inventory stock health",
          subtitle: "Items by state",
          data: inventoryHealth,
          xKey: "state",
          series: [{ key: "items", label: "Items", color: "#7C3AED" }],
        } as ChartConfig,
        {
          type: "pie",
          title: "Patient statistics by age group",
          data: patientAgeMix,
        } as ChartConfig,
      ],
    },
  },
  "/notifications": {
    kind: "list",
    screen: {
      description: "System-wide notification center and delivery log.",
      columns: notificationColumns,
      data: notifications,
      keyExtractor: (row) => String(row.id),
      searchKeys: ["title", "category", "audience"],
      searchPlaceholder: "Search notification…",
      emptyIcon: ClipboardList,
    },
  },
  "/feedback": {
    kind: "list",
    screen: {
      description: "Patient and staff feedback with ratings and follow-up state.",
      columns: feedbackColumns,
      data: feedback,
      keyExtractor: (row) => String(row.id),
      searchKeys: ["source", "person", "subject"],
      searchPlaceholder: "Search feedback…",
      filters: [
        {
          label: "Status",
          options: [
            { label: "All", value: "" },
            { label: "New", value: "pending" },
            { label: "In review", value: "validated" },
            { label: "Closed", value: "completed" },
          ],
          matches: (row, value) => row.status === value,
        },
      ],
      emptyIcon: MessageSquareWarning,
    },
  },
  "/complaints": {
    kind: "list",
    screen: {
      description: "Complaint intake, categorization and resolution tracking.",
      columns: complaintColumns,
      data: complaints,
      keyExtractor: (row) => String(row.id),
      searchKeys: ["ticket", "person", "category", "summary"],
      searchPlaceholder: "Search ticket, person or category…",
      filters: [
        {
          label: "Status",
          options: [
            { label: "All", value: "" },
            { label: "Open", value: "pending" },
            { label: "In progress", value: "in-progress" },
            { label: "Resolved", value: "completed" },
          ],
          matches: (row, value) => row.status === value,
        },
      ],
      stats: [
        { label: "Open", value: String(complaints.filter((c) => c.status === "pending").length), icon: <FileWarning className="h-5 w-5" />, tone: "danger" },
        { label: "In progress", value: String(complaints.filter((c) => c.status === "in-progress").length), icon: <FileWarning className="h-5 w-5" />, tone: "warning" },
        { label: "Resolved (30d)", value: String(complaints.filter((c) => c.status === "completed").length), icon: <FileWarning className="h-5 w-5" />, tone: "success" },
        { label: "Avg resolution", value: "2.4 days", icon: <FileWarning className="h-5 w-5" />, tone: "primary" },
      ],
      emptyIcon: FileWarning,
    },
  },
};
