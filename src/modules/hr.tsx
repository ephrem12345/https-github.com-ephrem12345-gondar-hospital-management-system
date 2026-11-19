import {
  AlertCircle,
  CalendarCheck,
  HandCoins,
  LayoutList,
  LogIn,
  Repeat,
  Stethoscope,
  UserPlus,
  UserRound,
  UsersRound,
} from "lucide-react";
import { z } from "zod";
import type { ModuleScreen, AnyRow } from "@/modules/types";
import type { Column } from "@/components/ui/DataTable";
import type {
  AttendanceRecord,
  EmployeeRecord,
  LeaveRequestRecord,
  PayslipRecord,
  ShiftRecord,
  StaffCategory,
} from "@/services/finance-hr";

// ------------------------------------------------------------------ Employees

const employees: EmployeeRecord[] = [
  { id: "emp-001", employeeId: "EMP-0101", name: "Dr. Abebe Bekele", role: "Chief Administrator", category: "Administrative", department: "Administration", hiredAt: "2015-02", phone: "+251 911 010 101", email: "abebe.bekele@gondar-hospital.et", qualifications: ["MD", "MPH"], documents: ["Employment contract", "License"], employmentStatus: "Active", presenceToday: "Present" },
  { id: "emp-002", employeeId: "EMP-0102", name: "Dr. Selam Girma", role: "Internist", category: "Doctor", department: "Internal Medicine", hiredAt: "2018-09", phone: "+251 911 010 102", email: "selam.girma@gondar-hospital.et", qualifications: ["MD", "Internal Medicine residency"], documents: ["License", "CV"], employmentStatus: "Active", presenceToday: "On shift" },
  { id: "emp-003", employeeId: "EMP-0103", name: "Sr. Tigist Alemu", role: "Charge Nurse", category: "Nurse", department: "Internal Medicine", hiredAt: "2019-06", phone: "+251 911 010 103", email: "tigist.alemu@gondar-hospital.et", qualifications: ["BSc Nursing"], documents: ["License"], employmentStatus: "Active", presenceToday: "On shift" },
  { id: "emp-004", employeeId: "EMP-0104", name: "Ato Getu Assefa", role: "Lab Technologist", category: "Other", department: "Laboratory", hiredAt: "2020-11", phone: "+251 911 010 104", email: "getu.assefa@gondar-hospital.et", qualifications: ["BSc Medical Lab"], documents: ["License"], employmentStatus: "Active", presenceToday: "Present" },
  { id: "emp-005", employeeId: "EMP-0105", name: "W/ro Liya Tesfaye", role: "Pharmacist", category: "Other", department: "Pharmacy", hiredAt: "2021-03", phone: "+251 911 010 105", email: "liya.tesfaye@gondar-hospital.et", qualifications: ["BPharm"], documents: ["License"], employmentStatus: "Active", presenceToday: "Present" },
  { id: "emp-006", employeeId: "EMP-0106", name: "Ato Hanif Jemal", role: "Accountant", category: "Administrative", department: "Finance", hiredAt: "2022-08", phone: "+251 911 010 106", email: "hanif.jemal@gondar-hospital.et", qualifications: ["BA Accounting"], documents: ["Employment contract"], employmentStatus: "Active", presenceToday: "Present" },
  { id: "emp-007", employeeId: "EMP-0107", name: "W/ro Marta Abebe", role: "Housekeeping Lead", category: "Other", department: "Housekeeping", hiredAt: "2017-01", phone: "+251 911 010 107", email: "marta.abebe@gondar-hospital.et", qualifications: ["Certificate"], documents: ["Employment contract"], employmentStatus: "Active", presenceToday: "Off duty" },
  { id: "emp-008", employeeId: "EMP-0108", name: "Dr. Fikru Bekele", role: "Radiologist", category: "Doctor", department: "Radiology", hiredAt: "2016-05", phone: "+251 911 010 108", email: "fikru.bekele@gondar-hospital.et", qualifications: ["MD", "Radiology residency"], documents: ["License", "CV"], employmentStatus: "Active", presenceToday: "Present" },
  { id: "emp-009", employeeId: "EMP-0109", name: "Sr. Meseret Tadesse", role: "ICU Nurse", category: "Nurse", department: "ICU", hiredAt: "2020-01", phone: "+251 911 010 109", email: "meseret.tadesse@gondar-hospital.et", qualifications: ["BSc Nursing", "ICU certificate"], documents: ["License"], employmentStatus: "Active", presenceToday: "Off duty" },
  { id: "emp-010", employeeId: "EMP-0110", name: "Dr. Mulu Alemu", role: "Surgeon", category: "Doctor", department: "Surgery", hiredAt: "2017-07", phone: "+251 911 010 110", email: "mulu.alemu@gondar-hospital.et", qualifications: ["MD", "General surgery residency"], documents: ["License", "CV"], employmentStatus: "Active", presenceToday: "On leave" },
  { id: "emp-011", employeeId: "EMP-0111", name: "Ato Tewodros Kebede", role: "HR Officer", category: "Administrative", department: "Human Resources", hiredAt: "2021-10", phone: "+251 911 010 111", email: "tewodros.kebede@gondar-hospital.et", qualifications: ["BA Management"], documents: ["Employment contract"], employmentStatus: "Active", presenceToday: "Absent" },
  { id: "emp-012", employeeId: "EMP-0112", name: "W/ro Bontu Kebede", role: "Ward Nurse", category: "Nurse", department: "Surgery", hiredAt: "2019-11", phone: "+251 911 010 112", email: "bontu.kebede@gondar-hospital.et", qualifications: ["BSc Nursing"], documents: ["License"], employmentStatus: "Active", presenceToday: "On shift" },
];

const employeeColumns: Column<AnyRow>[] = [
  { key: "name", header: "Employee", sortValue: (row) => String(row.name), render: (row) => <span><span className="block font-medium text-slate-700 dark:text-slate-200">{String(row.name)}</span><span className="text-xs text-slate-500 dark:text-slate-400">{String(row.employeeId)}</span></span> },
  { key: "role", header: "Role", sortValue: (row) => String(row.role) },
  { key: "category", header: "Category", sortValue: (row) => String(row.category), hideOnTablet: true },
  { key: "department", header: "Department", sortValue: (row) => String(row.department), hideOnTablet: true },
  { key: "hiredAt", header: "Hired", sortValue: (row) => String(row.hiredAt), hideOnMobile: true, render: (row) => <span className="text-xs text-slate-500 dark:text-slate-400">{String(row.hiredAt)}</span> },
  { key: "presenceToday", header: "Today", sortValue: (row) => String(row.presenceToday), render: (row) => <span className="capitalize">{String(row.presenceToday).toLowerCase()}</span> },
];

const doctorsCount = employees.filter((e) => e.category === "Doctor").length;
const nursesCount = employees.filter((e) => e.category === "Nurse").length;
const adminStaffCount = employees.filter((e) => e.category === "Administrative").length;
const presentCount = employees.filter((e) => e.presenceToday === "Present" || e.presenceToday === "On shift").length;
const absentCount = employees.filter((e) => e.presenceToday === "Absent").length;
const onLeaveCount = employees.filter((e) => e.presenceToday === "On leave").length;

// ----------------------------------------------------------------- Attendance

const attendance: AttendanceRecord[] = [
  { id: "att-001", employeeName: "Dr. Selam Girma", department: "Internal Medicine", shift: "08:00–16:00", checkIn: "07:52", checkOut: "", lateMinutes: 0, status: "On shift" },
  { id: "att-002", employeeName: "Sr. Tigist Alemu", department: "Internal Medicine", shift: "08:00–16:00", checkIn: "07:58", checkOut: "", lateMinutes: 0, status: "On shift" },
  { id: "att-003", employeeName: "Sr. Meseret Tadesse", department: "ICU", shift: "00:00–08:00", checkIn: "23:55", checkOut: "08:04", lateMinutes: 0, status: "Completed" },
  { id: "att-004", employeeName: "Ato Getu Assefa", department: "Laboratory", shift: "08:30–17:00", checkIn: "08:36", checkOut: "", lateMinutes: 6, status: "Late" },
  { id: "att-005", employeeName: "Ato Hanif Jemal", department: "Finance", shift: "08:00–17:00", checkIn: "08:21", checkOut: "", lateMinutes: 21, status: "Late" },
  { id: "att-006", employeeName: "Dr. Rahel Wolde", department: "Psychiatry", shift: "08:00–16:00", checkIn: "", checkOut: "", lateMinutes: 0, status: "Absent" },
  { id: "att-007", employeeName: "W/ro Bontu Kebede", department: "Surgery", shift: "16:00–00:00", checkIn: "", checkOut: "", lateMinutes: 0, status: "On shift" },
];

const attendanceColumns: Column<AnyRow>[] = [
  { key: "employeeName", header: "Employee", sortValue: (row) => String(row.employeeName) },
  { key: "department", header: "Department", sortValue: (row) => String(row.department), hideOnTablet: true },
  { key: "shift", header: "Shift", sortValue: (row) => String(row.shift), hideOnMobile: true, render: (row) => <span className="font-mono text-xs">{String(row.shift)}</span> },
  { key: "checkIn", header: "Check-in", sortValue: (row) => String(row.checkIn), render: (row) => <span className="font-mono text-xs">{String(row.checkIn) || "—"}</span> },
  { key: "checkOut", header: "Check-out", sortValue: (row) => String(row.checkOut), render: (row) => <span className="font-mono text-xs">{String(row.checkOut) || "—"}</span> },
  { key: "lateMinutes", header: "Late (min)", align: "right", sortValue: (row) => Number(row.lateMinutes), render: (row) => (Number(row.lateMinutes) ? <span className="text-warning-600 dark:text-warning-400">{String(row.lateMinutes)}</span> : "—") },
  { key: "status", header: "Status", sortValue: (row) => String(row.status), render: (row) => <span className="capitalize">{String(row.status).toLowerCase()}</span> },
];

// --------------------------------------------------------------------- Shifts

const shifts: ShiftRecord[] = [
  { id: "sh-001", employeeName: "Sr. Tigist Alemu", department: "Internal Medicine", day: "Mon 16 Nov", hours: "08:00–16:00", shiftType: "Nurse shift", status: "Confirmed" },
  { id: "sh-002", employeeName: "Sr. Bontu Kebede", department: "Surgery", day: "Mon 16 Nov", hours: "16:00–00:00", shiftType: "Nurse shift", status: "Confirmed" },
  { id: "sh-003", employeeName: "Dr. Selam Girma", department: "Internal Medicine", day: "Tue 17 Nov", hours: "08:00–16:00", shiftType: "Doctor shift", status: "Confirmed" },
  { id: "sh-004", employeeName: "Dr. Bereket Assefa", department: "Pediatrics", day: "Tue 17 Nov", hours: "16:00–00:00", shiftType: "Emergency duty", status: "Tentative" },
  { id: "sh-005", employeeName: "Sr. Meseret Tadesse", department: "ICU", day: "Wed 18 Nov", hours: "00:00–08:00", shiftType: "Nurse shift", status: "Confirmed" },
  { id: "sh-006", employeeName: "Dr. Mulu Alemu", department: "Surgery", day: "Wed 18 Nov", hours: "08:00–20:00", shiftType: "Doctor shift", status: "Change requested" },
  { id: "sh-007", employeeName: "Sr. Hiwot Adane", department: "Pediatrics", day: "Thu 19 Nov", hours: "16:00–00:00", shiftType: "Nurse shift", status: "Tentative" },
  { id: "sh-008", employeeName: "Dr. Samuel Ayele", department: "ICU", day: "Fri 20 Nov", hours: "18:00–08:00", shiftType: "Emergency duty", status: "Confirmed" },
];

const shiftColumns: Column<AnyRow>[] = [
  { key: "employeeName", header: "Employee", sortValue: (row) => String(row.employeeName) },
  { key: "department", header: "Department", sortValue: (row) => String(row.department), hideOnTablet: true },
  { key: "day", header: "Day", sortValue: (row) => String(row.day) },
  { key: "hours", header: "Hours", sortValue: (row) => String(row.hours), render: (row) => <span className="font-mono text-xs">{String(row.hours)}</span> },
  { key: "shiftType", header: "Shift type", sortValue: (row) => String(row.shiftType) },
  { key: "status", header: "Status", sortValue: (row) => String(row.status), render: (row) => <span className="capitalize">{String(row.status).toLowerCase()}</span> },
];

// ---------------------------------------------------------------------- Leave

const leaves: LeaveRequestRecord[] = [
  { id: "lv-001", employeeName: "Dr. Mulu Alemu", leaveType: "Annual leave", from: "2026-11-09", to: "2026-11-20", days: 9, status: "Approved" },
  { id: "lv-002", employeeName: "Sr. Rahel Getachew", leaveType: "Sick leave", from: "2026-11-12", to: "2026-11-14", days: 3, status: "Approved" },
  { id: "lv-003", employeeName: "Ato Yonas Haile", leaveType: "Annual leave", from: "2026-12-01", to: "2026-12-10", days: 8, status: "Pending" },
  { id: "lv-004", employeeName: "W/ro Sara Bekele", leaveType: "Maternity leave", from: "2026-11-01", to: "2027-01-15", days: 75, status: "Approved" },
  { id: "lv-005", employeeName: "Ato Tewodros Kebede", leaveType: "Compassionate leave", from: "2026-11-12", to: "2026-11-13", days: 2, status: "Completed" },
  { id: "lv-006", employeeName: "Sr. Hiwot Adane", leaveType: "Study leave", from: "2026-11-16", to: "2026-11-25", days: 8, status: "Pending" },
  { id: "lv-007", employeeName: "Ato Getu Assefa", leaveType: "Annual leave", from: "2026-10-20", to: "2026-10-24", days: 5, status: "Rejected" },
];

const leaveColumns: Column<AnyRow>[] = [
  { key: "employeeName", header: "Employee", sortValue: (row) => String(row.employeeName) },
  { key: "leaveType", header: "Leave type", sortValue: (row) => String(row.leaveType) },
  { key: "from", header: "From", sortValue: (row) => String(row.from), hideOnTablet: true },
  { key: "to", header: "To", sortValue: (row) => String(row.to), hideOnMobile: true },
  { key: "days", header: "Days", align: "right", sortValue: (row) => Number(row.days) },
  { key: "status", header: "Status", sortValue: (row) => String(row.status), render: (row) => <span className="capitalize">{String(row.status).toLowerCase()}</span> },
];

// -------------------------------------------------------------------- Payroll

const payslips: PayslipRecord[] = [
  { id: "pr-001", employeeName: "Dr. Selam Girma", role: "Internist", period: "Nov 2026", baseSalary: 28000, allowances: 6500, overtime: 0, deductions: 4200, netPay: 30300, status: "Approved" },
  { id: "pr-002", employeeName: "Sr. Tigist Alemu", role: "Charge Nurse", period: "Nov 2026", baseSalary: 14000, allowances: 3100, overtime: 900, deductions: 2100, netPay: 15900, status: "Approved" },
  { id: "pr-003", employeeName: "Ato Getu Assefa", role: "Lab Technologist", period: "Nov 2026", baseSalary: 11500, allowances: 2200, overtime: 450, deductions: 1700, netPay: 12450, status: "Pending" },
  { id: "pr-004", employeeName: "W/ro Liya Tesfaye", role: "Pharmacist", period: "Nov 2026", baseSalary: 15500, allowances: 2800, overtime: 0, deductions: 2300, netPay: 16000, status: "Pending" },
  { id: "pr-005", employeeName: "Ato Hanif Jemal", role: "Accountant", period: "Nov 2026", baseSalary: 13000, allowances: 2000, overtime: 600, deductions: 1950, netPay: 13650, status: "Pending" },
];

const payrollColumns: Column<AnyRow>[] = [
  { key: "employeeName", header: "Employee", sortValue: (row) => String(row.employeeName), render: (row) => <span><span className="block font-medium text-slate-700 dark:text-slate-200">{String(row.employeeName)}</span><span className="text-xs text-slate-500 dark:text-slate-400">{String(row.role)}</span></span> },
  { key: "period", header: "Period", sortValue: (row) => String(row.period), hideOnMobile: true },
  { key: "baseSalary", header: "Base (ETB)", align: "right", sortValue: (row) => Number(row.baseSalary) },
  { key: "allowances", header: "Allowances", align: "right", sortValue: (row) => Number(row.allowances), hideOnTablet: true },
  { key: "overtime", header: "Overtime", align: "right", sortValue: (row) => Number(row.overtime), hideOnMobile: true, render: (row) => (Number(row.overtime) ? Number(row.overtime).toLocaleString("en-US") : "—") },
  { key: "deductions", header: "Deductions", align: "right", sortValue: (row) => Number(row.deductions), hideOnMobile: true },
  { key: "netPay", header: "Net pay (ETB)", align: "right", sortValue: (row) => Number(row.netPay), render: (row) => <span className="font-semibold text-slate-700 dark:text-slate-200">{Number(row.netPay).toLocaleString("en-US")}</span> },
  { key: "status", header: "Status", sortValue: (row) => String(row.status), render: (row) => <span className="capitalize">{String(row.status).toLowerCase()}</span> },
];

// ------------------------------------------------------------ Form schemas

const employeeFormSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  employeeId: z.string().min(3, "Employee ID is required"),
  phone: z
    .string()
    .min(9, "Enter a valid phone number")
    .regex(/^[+\d\s()-]+$/, "Phone number contains invalid characters"),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  role: z.string().min(2, "Job title is required"),
  category: z.enum(["Doctor", "Nurse", "Administrative", "Other"], {
    message: "Select a staff category",
  }),
  department: z.string().min(1, "Select a department"),
  hiredAt: z.string().min(1, "Select the hire date"),
  qualifications: z.string().min(2, "List at least one qualification"),
  documents: z.string().max(400).optional().or(z.literal("")),
});

// ------------------------------------------------------------------- Screens

export const hrScreens: Record<string, ModuleScreen> = {
  "/employees": {
    kind: "list",
    screen: {
      description: "Human resources dashboard — headcount by category and today's presence.",
      columns: employeeColumns,
      data: employees,
      keyExtractor: (row) => String(row.id),
      searchKeys: ["name", "employeeId", "role", "department"],
      searchPlaceholder: "Search employee, role or department…",
      filters: [
        {
          label: "Category",
          options: [
            { label: "All categories", value: "" },
            { label: "Doctors", value: "Doctor" },
            { label: "Nurses", value: "Nurse" },
            { label: "Administrative", value: "Administrative" },
            { label: "Other", value: "Other" },
          ],
          matches: (row, value) => row.category === value,
        },
        {
          label: "Presence",
          options: [
            { label: "All", value: "" },
            { label: "Present", value: "Present" },
            { label: "On shift", value: "On shift" },
            { label: "Absent", value: "Absent" },
            { label: "On leave", value: "On leave" },
            { label: "Off duty", value: "Off duty" },
          ],
          matches: (row, value) => row.presenceToday === value,
        },
      ],
      stats: [
        { label: "Total employees", value: String(employees.length), icon: <UsersRound className="h-5 w-5" />, tone: "primary" },
        { label: "Doctors", value: String(doctorsCount), icon: <Stethoscope className="h-5 w-5" />, tone: "primary" },
        { label: "Nurses", value: String(nursesCount), icon: <UsersRound className="h-5 w-5" />, tone: "success" },
        { label: "Administrative staff", value: String(adminStaffCount), icon: <UserRound className="h-5 w-5" />, tone: "success" },
        { label: "Present today", value: String(presentCount), icon: <CalendarCheck className="h-5 w-5" />, tone: "success" },
        { label: "Absent today", value: String(absentCount), icon: <AlertCircle className="h-5 w-5" />, tone: "danger" },
        { label: "On leave", value: String(onLeaveCount), icon: <Repeat className="h-5 w-5" />, tone: "warning" },
      ],
      emptyIcon: UserRound,
    },
  },
  "/employees/new": {
    kind: "form",
    screen: {
      description: "Register a new employee with department assignment, qualifications and document references.",
      schema: employeeFormSchema,
      sections: [
        {
          title: "Personal details",
          fields: [
            { name: "fullName", label: "Full name", type: "text", required: true, span: 2, placeholder: "W/ro Liya Tesfaye" },
            { name: "employeeId", label: "Employee ID", type: "text", required: true, placeholder: "EMP-0113" },
            { name: "phone", label: "Phone number", type: "tel", required: true },
            { name: "email", label: "Work email", type: "email", hint: "Used for system notifications." },
          ],
        },
        {
          title: "Employment record",
          fields: [
            { name: "role", label: "Job title", type: "text", required: true, placeholder: "Pharmacist" },
            {
              name: "category",
              label: "Staff category",
              type: "select",
              required: true,
              options: [
                { label: "Doctor", value: "Doctor" },
                { label: "Nurse", value: "Nurse" },
                { label: "Administrative", value: "Administrative" },
                { label: "Other", value: "Other" },
              ],
            },
            {
              name: "department",
              label: "Department assignment",
              type: "select",
              required: true,
              options: [
                { label: "Internal Medicine", value: "Internal Medicine" },
                { label: "Surgery", value: "Surgery" },
                { label: "Pediatrics", value: "Pediatrics" },
                { label: "ICU", value: "ICU" },
                { label: "Laboratory", value: "Laboratory" },
                { label: "Pharmacy", value: "Pharmacy" },
                { label: "Radiology", value: "Radiology" },
                { label: "Finance", value: "Finance" },
                { label: "Human Resources", value: "Human Resources" },
                { label: "Administration", value: "Administration" },
                { label: "Housekeeping", value: "Housekeeping" },
              ],
            },
            { name: "hiredAt", label: "Hire date", type: "date", required: true },
          ],
        },
        {
          title: "Qualifications and documents",
          description: "Documents are referenced by name only in this preview; files are uploaded once storage is connected.",
          fields: [
            { name: "qualifications", label: "Qualifications", type: "textarea", required: true, span: 2, placeholder: "BPharm, professional license" },
            { name: "documents", label: "Employee documents", type: "textarea", span: 2, placeholder: "Employment contract, license, CV" },
          ],
        },
      ],
      submitLabel: "Register employee",
      confirmTitle: "Confirm registration",
      confirmMessage: "The employee record will be added to the directory. This frontend preview stores nothing permanently.",
      successTitle: "Employee registered",
      successDescription: "The profile is queued for provisioning with system access once the backend is connected.",
      backHref: "/employees",
    },
  },
  "/attendance": {
    kind: "list",
    screen: {
      description: "Daily attendance with check-in, check-out, late arrivals and absences.",
      columns: attendanceColumns,
      data: attendance,
      keyExtractor: (row) => String(row.id),
      searchKeys: ["employeeName", "department"],
      searchPlaceholder: "Search employee or department…",
      filters: [
        {
          label: "Status",
          options: [
            { label: "All", value: "" },
            { label: "On shift", value: "On shift" },
            { label: "Completed", value: "Completed" },
            { label: "Late", value: "Late" },
            { label: "Absent", value: "Absent" },
          ],
          matches: (row, value) => row.status === value,
        },
      ],
      stats: [
        { label: "On shift now", value: String(attendance.filter((a) => a.status === "On shift").length), icon: <CalendarCheck className="h-5 w-5" />, tone: "primary" },
        { label: "Shifts completed", value: String(attendance.filter((a) => a.status === "Completed").length), icon: <CalendarCheck className="h-5 w-5" />, tone: "success" },
        { label: "Late arrivals", value: String(attendance.filter((a) => a.status === "Late").length), icon: <CalendarCheck className="h-5 w-5" />, tone: "warning" },
        { label: "Absent", value: String(attendance.filter((a) => a.status === "Absent").length), icon: <AlertCircle className="h-5 w-5" />, tone: "danger" },
      ],
      emptyIcon: CalendarCheck,
    },
  },
  "/shifts": {
    kind: "list",
    screen: {
      description: "Weekly roster with doctor shifts, nurse shifts, emergency duty and change requests.",
      columns: shiftColumns,
      data: shifts,
      keyExtractor: (row) => String(row.id),
      searchKeys: ["employeeName", "department", "day", "shiftType"],
      searchPlaceholder: "Search employee, day or shift type…",
      filters: [
        {
          label: "Shift type",
          options: [
            { label: "All shifts", value: "" },
            { label: "Doctor shift", value: "Doctor shift" },
            { label: "Nurse shift", value: "Nurse shift" },
            { label: "Emergency duty", value: "Emergency duty" },
          ],
          matches: (row, value) => row.shiftType === value,
        },
        {
          label: "Status",
          options: [
            { label: "All", value: "" },
            { label: "Confirmed", value: "Confirmed" },
            { label: "Tentative", value: "Tentative" },
            { label: "Change requested", value: "Change requested" },
          ],
          matches: (row, value) => row.status === value,
        },
      ],
      stats: [
        { label: "Confirmed shifts", value: String(shifts.filter((s) => s.status === "Confirmed").length), icon: <LayoutList className="h-5 w-5" />, tone: "success" },
        { label: "Doctor shifts", value: String(shifts.filter((s) => s.shiftType === "Doctor shift").length), icon: <Stethoscope className="h-5 w-5" />, tone: "primary" },
        { label: "Nurse shifts", value: String(shifts.filter((s) => s.shiftType === "Nurse shift").length), icon: <UsersRound className="h-5 w-5" />, tone: "primary" },
        { label: "Change requests", value: String(shifts.filter((s) => s.status === "Change requested").length), icon: <AlertCircle className="h-5 w-5" />, tone: "warning" },
      ],
      emptyIcon: LayoutList,
    },
  },
  "/leave": {
    kind: "list",
    screen: {
      description: "Leave requests, types, balances and approval history.",
      columns: leaveColumns,
      data: leaves,
      keyExtractor: (row) => String(row.id),
      searchKeys: ["employeeName", "leaveType"],
      searchPlaceholder: "Search employee or leave type…",
      filters: [
        {
          label: "Status",
          options: [
            { label: "All", value: "" },
            { label: "Pending", value: "Pending" },
            { label: "Approved", value: "Approved" },
            { label: "Completed", value: "Completed" },
            { label: "Rejected", value: "Rejected" },
          ],
          matches: (row, value) => row.status === value,
        },
        {
          label: "Leave type",
          options: [
            { label: "All types", value: "" },
            ...[...new Set(leaves.map((l) => l.leaveType))].map((t) => ({ label: t, value: t })),
          ],
          matches: (row, value) => row.leaveType === value,
        },
      ],
      stats: [
        { label: "Pending approvals", value: String(leaves.filter((l) => l.status === "Pending").length), icon: <LogIn className="h-5 w-5" />, tone: "warning" },
        { label: "On leave now", value: String(leaves.filter((l) => l.status === "Approved" && l.from <= "2026-11-13" && l.to >= "2026-11-13").length), icon: <Repeat className="h-5 w-5" />, tone: "primary" },
        { label: "Approved (30d)", value: String(leaves.filter((l) => l.status === "Approved").length), icon: <LogIn className="h-5 w-5" />, tone: "success" },
        { label: "Annual balance (avg)", value: "14 days", hint: "Per employee allowance 21 days", icon: <Repeat className="h-5 w-5" />, tone: "primary" },
      ],
      emptyIcon: Repeat,
    },
  },
  "/payroll": {
    kind: "list",
    screen: {
      description: "November 2026 payroll run — salary structure, allowances, overtime and deductions (ETB).",
      columns: payrollColumns,
      data: payslips,
      keyExtractor: (row) => String(row.id),
      searchKeys: ["employeeName", "role", "period"],
      searchPlaceholder: "Search employee or role…",
      filters: [
        {
          label: "Status",
          options: [
            { label: "All", value: "" },
            { label: "Approved", value: "Approved" },
            { label: "Pending", value: "Pending" },
            { label: "Paid", value: "Paid" },
          ],
          matches: (row, value) => row.status === value,
        },
      ],
      stats: [
        { label: "Payroll period", value: "Nov 2026", hint: "Payslip cut-off Nov 25", icon: <HandCoins className="h-5 w-5" />, tone: "primary" },
        { label: "Employees in run", value: String(payslips.length), icon: <HandCoins className="h-5 w-5" />, tone: "success" },
        { label: "Net payable", value: `ETB ${payslips.reduce((s, p) => s + p.netPay, 0).toLocaleString("en-US")}`, icon: <HandCoins className="h-5 w-5" />, tone: "warning" },
        { label: "Overtime cost", value: `ETB ${payslips.reduce((s, p) => s + p.overtime, 0).toLocaleString("en-US")}`, icon: <HandCoins className="h-5 w-5" />, tone: "danger" },
      ],
      emptyIcon: HandCoins,
    },
  },
};

/** Exported for tests and typed-API integration. */
export { employees, payslips, employeeFormSchema, doctorsCount, nursesCount };
