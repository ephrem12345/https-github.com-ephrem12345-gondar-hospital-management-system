import { Clock, HeartPulse, Stethoscope, UserRoundCog } from "lucide-react";
import type { ModuleScreen, AnyRow } from "@/modules/types";
import type { Column } from "@/components/ui/DataTable";

interface OpdRow {
  id: string;
  token: number;
  patient: string;
  department: string;
  arrived: string;
  seen: string;
  status: string;
}

const opdVisits: OpdRow[] = [
  { id: "opd-001", token: 42, patient: "Almaz Tadesse", department: "Internal Medicine", arrived: "08:10", seen: "08:35", status: "completed" },
  { id: "opd-002", token: 43, patient: "Getachew Molla", department: "Surgery", arrived: "08:25", seen: "08:58", status: "completed" },
  { id: "opd-003", token: 44, patient: "Hanna Girma", department: "Gynecology & Obstetrics", arrived: "08:40", seen: "", status: "in-progress" },
  { id: "opd-004", token: 45, patient: "Yohannes Kebede", department: "Internal Medicine", arrived: "08:55", seen: "", status: "scheduled" },
  { id: "opd-005", token: 46, patient: "Sara Alemu", department: "Pediatrics", arrived: "09:05", seen: "", status: "scheduled" },
  { id: "opd-006", token: 47, patient: "Dawit Haile", department: "Orthopedics", arrived: "09:20", seen: "", status: "pending" },
];

const opdColumns: Column<AnyRow>[] = [
  { key: "token", header: "Token", align: "right", sortValue: (row) => Number(row.token), render: (row) => <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">#{String(row.token)}</span> },
  { key: "patient", header: "Patient", sortValue: (row) => String(row.patient) },
  { key: "department", header: "Department", sortValue: (row) => String(row.department), hideOnTablet: true },
  { key: "arrived", header: "Arrived", sortValue: (row) => String(row.arrived) },
  { key: "seen", header: "Seen", sortValue: (row) => String(row.seen), hideOnMobile: true, render: (row) => String(row.seen) || "—" },
  { key: "status", header: "Status", sortValue: (row) => String(row.status), render: (row) => <span className="capitalize">{String(row.status)}</span> },
];

export const patientServicesScreens: Record<string, ModuleScreen> = {
  "/patients": { kind: "custom", screen: "patient-management" },

  "/patient-registration": {
    kind: "custom",
    screen: "patient-registration",
  },

  "/appointments": {
    kind: "custom",
    screen: "appointment-management",
  },
  "/opd": {
    kind: "list",
    screen: {
      description: "Outpatient department flow — tokens, arrivals and consultation status.",
      columns: opdColumns,
      data: opdVisits,
      keyExtractor: (row) => String(row.id),
      searchKeys: ["patient", "department"],
      searchPlaceholder: "Search patient or department…",
      filters: [
        {
          label: "Status",
          options: [
            { label: "All", value: "" },
            { label: "Waiting", value: "scheduled" },
            { label: "With doctor", value: "in-progress" },
            { label: "Done", value: "completed" },
          ],
          matches: (row, value) => row.status === value,
        },
      ],
      stats: [
        { label: "Visits today", value: String(opdVisits.length), icon: <Stethoscope className="h-5 w-5" />, tone: "primary" },
        { label: "Currently with doctor", value: String(opdVisits.filter((v) => v.status === "in-progress").length), icon: <Stethoscope className="h-5 w-5" />, tone: "success" },
        { label: "Waiting", value: String(opdVisits.filter((v) => v.status === "scheduled" || v.status === "pending").length), icon: <Clock className="h-5 w-5" />, tone: "warning" },
        { label: "Completed", value: String(opdVisits.filter((v) => v.status === "completed").length), icon: <Stethoscope className="h-5 w-5" />, tone: "danger" },
      ],
      emptyIcon: Stethoscope,
    },
  },
  "/queue-management": {
    kind: "custom",
    screen: "queue-management",
  },
  "/waiting-room": {
    kind: "custom",
    screen: "waiting-room",
  },
  "/emergency": {
    kind: "board",
    screen: {
      description: "Emergency triage board — patients sorted by severity and arrival time.",
      columns: [
        {
          id: "red",
          title: "Red · Immediate",
          tone: "danger",
          items: [
            { id: "e1", title: "Abebe Kebede", subtitle: "RTA — head trauma", badge: "critical", meta: "Bay 1 · 10:02", urgent: true },
            { id: "e2", title: "Selamawit Bekele", subtitle: "Severe respiratory distress", badge: "critical", meta: "Bay 2 · 10:11", urgent: true },
          ],
        },
        {
          id: "orange",
          title: "Orange · Very urgent",
          tone: "warning",
          items: [
            { id: "e3", title: "Kebede Alemu", subtitle: "Chest pain, suspected MI", badge: "pending", meta: "Bay 3 · 10:05" },
          ],
        },
        {
          id: "yellow",
          title: "Yellow · Urgent",
          tone: "info",
          items: [
            { id: "e4", title: "Marta Girma", subtitle: "Deep laceration, left forearm", badge: "pending", meta: "Bay 4 · 10:14" },
            { id: "e5", title: "Yared Mekonnen", subtitle: "Suspected fracture, right ankle", badge: "pending", meta: "Bay 5 · 10:20" },
          ],
        },
        {
          id: "green",
          title: "Green · Standard",
          tone: "success",
          items: [
            { id: "e6", title: "Bereket Haile", subtitle: "Fever, 3 days", badge: "stable", meta: "Bay 6 · 10:22" },
          ],
        },
        {
          id: "admitted",
          title: "Admitted / Discharged",
          tone: "neutral",
          items: [
            { id: "e7", title: "Tigist Ayele", subtitle: "Admitted to ICU", badge: "in-progress", meta: "10:02" },
          ],
        },
      ],
      stats: [
        { label: "Active cases", value: "7", icon: <HeartPulse className="h-5 w-5" />, tone: "danger" },
        { label: "Immediate (red)", value: "2", icon: <HeartPulse className="h-5 w-5" />, tone: "danger" },
        { label: "Avg door-to-doctor", value: "6 min", icon: <Clock className="h-5 w-5" />, tone: "success" },
        { label: "Arrivals today", value: "23", icon: <UserRoundCog className="h-5 w-5" />, tone: "primary" },
      ],
    },
  },
};
