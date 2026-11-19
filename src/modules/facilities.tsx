import { BedDouble, Building2, LogIn, LogOut, Syringe, Ambulance, MonitorSmartphone, HeartPulse } from "lucide-react";
import type { ModuleScreen, AnyRow } from "@/modules/types";
import type { Column } from "@/components/ui/DataTable";

// ------------------------------------------------------------------ Inpatient

interface InpatientRow {
  id: string;
  patient: string;
  ward: string;
  bed: string;
  admitted: string;
  attending: string;
  condition: string;
  day: number;
}

const inpatients: InpatientRow[] = [
  { id: "ip-001", patient: "Getachew Molla", ward: "Surgical Ward A", bed: "A-12", admitted: "2026-11-07", attending: "Dr. Mulu Alemu", condition: "recovering", day: 4 },
  { id: "ip-002", patient: "Yohannes Kebede", ward: "Internal Medicine", bed: "M-04", admitted: "2026-11-09", attending: "Dr. Selam Girma", condition: "critical", day: 2 },
  { id: "ip-003", patient: "Sara Alemu", ward: "Pediatrics", bed: "P-21", admitted: "2026-11-08", attending: "Dr. Bereket Assefa", condition: "recovering", day: 3 },
  { id: "ip-004", patient: "Tigist Ayele", ward: "ICU", bed: "ICU-03", admitted: "2026-11-10", attending: "Dr. Samuel Ayele", condition: "critical", day: 1 },
  { id: "ip-005", patient: "Fatuma Nur", ward: "Psychiatry", bed: "PS-07", admitted: "2026-11-05", attending: "Dr. Rahel Wolde", condition: "stable", day: 6 },
  { id: "ip-006", patient: "Marta Girma", ward: "Maternity", bed: "GO-15", admitted: "2026-11-10", attending: "Dr. Kidist Haile", condition: "stable", day: 1 },
];

const inpatientColumns: Column<AnyRow>[] = [
  { key: "patient", header: "Patient", sortValue: (row) => String(row.patient) },
  { key: "ward", header: "Ward", sortValue: (row) => String(row.ward), hideOnTablet: true },
  { key: "bed", header: "Bed", sortValue: (row) => String(row.bed), render: (row) => <span className="font-mono text-xs font-semibold text-primary-700 dark:text-primary-300">{String(row.bed)}</span> },
  { key: "admitted", header: "Admitted", sortValue: (row) => String(row.admitted), hideOnMobile: true },
  { key: "attending", header: "Attending", sortValue: (row) => String(row.attending), hideOnTablet: true },
  { key: "day", header: "Day", align: "right", sortValue: (row) => Number(row.day), render: (row) => <span className="text-xs">{String(row.day)}</span> },
  { key: "condition", header: "Condition", sortValue: (row) => String(row.condition), render: (row) => <span className="capitalize">{String(row.condition)}</span> },
];

// ------------------------------------------------------------------ Admissions

interface AdmissionRow {
  id: string;
  patient: string;
  requestedBy: string;
  ward: string;
  reason: string;
  priority: string;
  status: string;
}

const admissions: AdmissionRow[] = [
  { id: "adm-001", patient: "Kebede Alemu", requestedBy: "Emergency", ward: "Internal Medicine", reason: "Suspected MI — monitoring", priority: "emergency", status: "pending" },
  { id: "adm-002", patient: "Dawit Haile", requestedBy: "Dr. Dawit Mengistu", ward: "Orthopedics", reason: "Post-op observation", priority: "urgent", status: "validated" },
  { id: "adm-003", patient: "Meron Assefa", requestedBy: "Dr. Meron Bekele", ward: "Dermatology", reason: "Severe drug reaction", priority: "urgent", status: "pending" },
  { id: "adm-004", patient: "Bereket Haile", requestedBy: "Emergency", ward: "Pediatrics", reason: "Dehydration, IV fluids", priority: "routine", status: "validated" },
  { id: "adm-005", patient: "Selamawit Bekele", requestedBy: "Emergency", ward: "ICU", reason: "Respiratory failure", priority: "emergency", status: "validated" },
];

const admissionColumns: Column<AnyRow>[] = [
  { key: "patient", header: "Patient", sortValue: (row) => String(row.patient) },
  { key: "requestedBy", header: "Requested by", sortValue: (row) => String(row.requestedBy), hideOnTablet: true },
  { key: "ward", header: "Target ward", sortValue: (row) => String(row.ward) },
  { key: "reason", header: "Reason", sortValue: (row) => String(row.reason), hideOnMobile: true },
  { key: "priority", header: "Priority", sortValue: (row) => String(row.priority), render: (row) => <span className="capitalize">{String(row.priority)}</span> },
  { key: "status", header: "Status", sortValue: (row) => String(row.status), render: (row) => <span className="capitalize">{String(row.status)}</span> },
];

// ------------------------------------------------------------------- Discharges

interface DischargeRow {
  id: string;
  patient: string;
  ward: string;
  admitted: string;
  discharge: string;
  type: string;
  status: string;
}

const discharges: DischargeRow[] = [
  { id: "dc-001", patient: "Solomon Gebre", ward: "Surgical Ward A", admitted: "2026-11-03", discharge: "2026-11-10", type: "discharged", status: "completed" },
  { id: "dc-002", patient: "Lensa Abera", ward: "Ophthalmology", admitted: "2026-11-04", discharge: "2026-11-10", type: "discharged", status: "validated" },
  { id: "dc-003", patient: "Meron Assefa", ward: "Dermatology", admitted: "2026-11-06", discharge: "2026-11-09", type: "discharged", status: "completed" },
  { id: "dc-004", patient: "Hanna Girma", ward: "Maternity", admitted: "2026-11-09", discharge: "2026-11-11", type: "planned", status: "pending" },
  { id: "dc-005", patient: "Fatuma Nur", ward: "Psychiatry", admitted: "2026-11-05", discharge: "2026-11-12", type: "planned", status: "pending" },
];

const dischargeColumns: Column<AnyRow>[] = [
  { key: "patient", header: "Patient", sortValue: (row) => String(row.patient) },
  { key: "ward", header: "Ward", sortValue: (row) => String(row.ward), hideOnTablet: true },
  { key: "admitted", header: "Admitted", sortValue: (row) => String(row.admitted), hideOnMobile: true },
  { key: "discharge", header: "Discharge", sortValue: (row) => String(row.discharge) },
  { key: "type", header: "Type", sortValue: (row) => String(row.type), render: (row) => <span className="capitalize">{String(row.type)}</span> },
  { key: "status", header: "Status", sortValue: (row) => String(row.status), render: (row) => <span className="capitalize">{String(row.status)}</span> },
];

export const facilityScreens: Record<string, ModuleScreen> = {
  "/inpatient": {
    kind: "list",
    screen: {
      description: "All admitted patients with ward, bed and attending physician.",
      columns: inpatientColumns,
      data: inpatients,
      keyExtractor: (row) => String(row.id),
      searchKeys: ["patient", "ward", "attending", "bed"],
      searchPlaceholder: "Search patient, ward or bed…",
      filters: [
        {
          label: "Condition",
          options: [
            { label: "All", value: "" },
            { label: "Stable", value: "stable" },
            { label: "Recovering", value: "recovering" },
            { label: "Critical", value: "critical" },
          ],
          matches: (row, value) => row.condition === value,
        },
      ],
      stats: [
        { label: "Admitted", value: String(inpatients.length), icon: <BedDouble className="h-5 w-5" />, tone: "primary" },
        { label: "Critical", value: String(inpatients.filter((p) => p.condition === "critical").length), icon: <HeartPulse className="h-5 w-5" />, tone: "danger" },
        { label: "Recovering", value: String(inpatients.filter((p) => p.condition === "recovering").length), icon: <BedDouble className="h-5 w-5" />, tone: "success" },
        { label: "Longest stay", value: `${Math.max(...inpatients.map((p) => p.day))} days`, icon: <BedDouble className="h-5 w-5" />, tone: "warning" },
      ],
      emptyIcon: BedDouble,
    },
  },
  "/admissions": {
    kind: "list",
    screen: {
      description: "Admission requests awaiting bed assignment and approval.",
      columns: admissionColumns,
      data: admissions,
      keyExtractor: (row) => String(row.id),
      searchKeys: ["patient", "ward", "requestedBy", "reason"],
      searchPlaceholder: "Search patient, ward or reason…",
      filters: [
        {
          label: "Priority",
          options: [
            { label: "All", value: "" },
            { label: "Emergency", value: "emergency" },
            { label: "Urgent", value: "urgent" },
            { label: "Routine", value: "routine" },
          ],
          matches: (row, value) => row.priority === value,
        },
      ],
      emptyIcon: LogIn,
    },
  },
  "/wards": {
    kind: "grid",
    screen: {
      description: "Ward configuration and live occupancy across the hospital.",
      items: [
        { id: "w1", title: "Internal Medicine", subtitle: "Block B · floor 1", status: "active", category: "Medical", details: [{ label: "Occupancy", value: "83 / 90" }, { label: "Charge nurse", value: "Sr. Tigist Alemu" }] },
        { id: "w2", title: "Surgical Ward A", subtitle: "Block B · floor 2", status: "active", category: "Surgical", details: [{ label: "Occupancy", value: "47 / 60" }, { label: "Charge nurse", value: "Sr. Bontu Kebede" }] },
        { id: "w3", title: "Pediatrics", subtitle: "Block C · floor 1", status: "active", category: "Medical", details: [{ label: "Occupancy", value: "55 / 70" }, { label: "Charge nurse", value: "Sr. Hiwot Adane" }] },
        { id: "w4", title: "Maternity", subtitle: "Block C · floor 2", status: "active", category: "Obstetric", details: [{ label: "Occupancy", value: "51 / 65" }, { label: "Charge nurse", value: "Sr. Rahel Getachew" }] },
        { id: "w5", title: "Orthopedics", subtitle: "Block B · floor 3", status: "active", category: "Surgical", details: [{ label: "Occupancy", value: "29 / 40" }, { label: "Charge nurse", value: "Sr. Almaz Worku" }] },
        { id: "w6", title: "Psychiatry", subtitle: "Block D · floor 1", status: "active", category: "Medical", details: [{ label: "Occupancy", value: "17 / 25" }, { label: "Charge nurse", value: "Sr. Meseret Tadesse" }] },
        { id: "w7", title: "ICU", subtitle: "Block A · floor 2", status: "active", category: "Critical", details: [{ label: "Occupancy", value: "18 / 20" }, { label: "Charge nurse", value: "Sr. Meseret Tadesse" }] },
        { id: "w8", title: "Ophthalmology", subtitle: "Block D · floor 2", status: "low", category: "Specialty", details: [{ label: "Occupancy", value: "8 / 15" }, { label: "Charge nurse", value: "Sr. Almaz Worku" }] },
      ],
      stats: [
        { label: "Wards", value: "8", icon: <Building2 className="h-5 w-5" />, tone: "primary" },
        { label: "Total beds", value: "385", icon: <BedDouble className="h-5 w-5" />, tone: "primary" },
        { label: "Occupied", value: "308", icon: <BedDouble className="h-5 w-5" />, tone: "warning" },
        { label: "Free", value: "77", icon: <BedDouble className="h-5 w-5" />, tone: "success" },
      ],
      filterLabel: "Type",
      filterOptions: [
        { label: "All wards", value: "" },
        { label: "Medical", value: "Medical" },
        { label: "Surgical", value: "Surgical" },
        { label: "Critical", value: "Critical" },
        { label: "Obstetric", value: "Obstetric" },
        { label: "Specialty", value: "Specialty" },
      ],
    },
  },
  "/beds": {
    kind: "grid",
    screen: {
      description: "Bed-level map with patient assignment and maintenance status.",
      items: [
        { id: "b1", title: "Bed M-04", subtitle: "Internal Medicine", status: "critical", category: "Occupied", details: [{ label: "Patient", value: "Yohannes Kebede" }, { label: "Since", value: "Nov 9" }] },
        { id: "b2", title: "Bed A-12", subtitle: "Surgical Ward A", status: "recovering", category: "Occupied", details: [{ label: "Patient", value: "Getachew Molla" }, { label: "Since", value: "Nov 7" }] },
        { id: "b3", title: "Bed A-13", subtitle: "Surgical Ward A", status: "available", category: "Free", details: [{ label: "Last cleaned", value: "09:40" }, { label: "Condition", value: "Ready" }] },
        { id: "b4", title: "Bed ICU-03", subtitle: "ICU", status: "critical", category: "Occupied", details: [{ label: "Patient", value: "Tigist Ayele" }, { label: "Since", value: "Nov 10" }] },
        { id: "b5", title: "Bed P-21", subtitle: "Pediatrics", status: "recovering", category: "Occupied", details: [{ label: "Patient", value: "Sara Alemu" }, { label: "Since", value: "Nov 8" }] },
        { id: "b6", title: "Bed M-05", subtitle: "Internal Medicine", status: "pending", category: "Maintenance", details: [{ label: "Issue", value: "Rail repair" }, { label: "Reported", value: "Nov 9" }] },
        { id: "b7", title: "Bed GO-16", subtitle: "Maternity", status: "available", category: "Free", details: [{ label: "Last cleaned", value: "10:05" }, { label: "Condition", value: "Ready" }] },
        { id: "b8", title: "Bed PS-07", subtitle: "Psychiatry", status: "stable", category: "Occupied", details: [{ label: "Patient", value: "Fatuma Nur" }, { label: "Since", value: "Nov 5" }] },
      ],
      stats: [
        { label: "Total beds (sample)", value: "8", icon: <BedDouble className="h-5 w-5" />, tone: "primary" },
        { label: "Occupied", value: "5", icon: <BedDouble className="h-5 w-5" />, tone: "danger" },
        { label: "Free", value: "2", icon: <BedDouble className="h-5 w-5" />, tone: "success" },
        { label: "Maintenance", value: "1", icon: <Building2 className="h-5 w-5" />, tone: "warning" },
      ],
      filterLabel: "State",
      filterOptions: [
        { label: "All beds", value: "" },
        { label: "Occupied", value: "Occupied" },
        { label: "Free", value: "Free" },
        { label: "Maintenance", value: "Maintenance" },
      ],
    },
  },
  "/discharges": {
    kind: "list",
    screen: {
      description: "Discharge planning, summaries and completion tracking.",
      columns: dischargeColumns,
      data: discharges,
      keyExtractor: (row) => String(row.id),
      searchKeys: ["patient", "ward"],
      searchPlaceholder: "Search patient or ward…",
      filters: [
        {
          label: "Status",
          options: [
            { label: "All", value: "" },
            { label: "Pending", value: "pending" },
            { label: "Approved", value: "validated" },
            { label: "Completed", value: "completed" },
          ],
          matches: (row, value) => row.status === value,
        },
      ],
      emptyIcon: LogOut,
    },
  },
  "/operating-rooms": {
    kind: "grid",
    screen: {
      description: "Operating room schedules, utilization and turnover status.",
      items: [
        { id: "or1", title: "OR-1", subtitle: "General surgery", status: "in-progress", category: "In use", details: [{ label: "Case", value: "Appendectomy — Getachew Molla" }, { label: "Team", value: "Dr. Mulu Alemu" }] },
        { id: "or2", title: "OR-2", subtitle: "Orthopedics", status: "scheduled", category: "Scheduled", details: [{ label: "Next case", value: "ORIF tibia — Dawit Haile" }, { label: "Start", value: "13:30" }] },
        { id: "or3", title: "OR-3", subtitle: "Obstetrics", status: "completed", category: "Turnover", details: [{ label: "Last case", value: "C-section — Hanna Girma" }, { label: "Cleaning", value: "In progress" }] },
        { id: "or4", title: "OR-4", subtitle: "Ophthalmology", status: "available", category: "Free", details: [{ label: "Next case", value: "None scheduled" }, { label: "Ready", value: "Yes" }] },
        { id: "or5", title: "OR-5", subtitle: "Emergency", status: "in-progress", category: "In use", details: [{ label: "Case", value: "Laparotomy — RTA patient" }, { label: "Team", value: "Emergency surgical team" }], },
        { id: "or6", title: "Minor OR", subtitle: "Day procedures", status: "scheduled", category: "Scheduled", details: [{ label: "Next case", value: "Carpal tunnel release" }, { label: "Start", value: "14:00" }] },
      ],
      stats: [
        { label: "Rooms", value: "6", icon: <Syringe className="h-5 w-5" />, tone: "primary" },
        { label: "In use", value: "2", icon: <Syringe className="h-5 w-5" />, tone: "danger" },
        { label: "Scheduled today", value: "5", icon: <Syringe className="h-5 w-5" />, tone: "warning" },
        { label: "Utilization (week)", value: "78%", icon: <Syringe className="h-5 w-5" />, tone: "success" },
      ],
      filterLabel: "State",
      filterOptions: [
        { label: "All rooms", value: "" },
        { label: "In use", value: "In use" },
        { label: "Scheduled", value: "Scheduled" },
        { label: "Turnover", value: "Turnover" },
        { label: "Free", value: "Free" },
      ],
    },
  },
  "/ambulance": {
    kind: "grid",
    screen: {
      description: "Ambulance fleet status, crew assignment and dispatch log.",
      items: [
        { id: "am1", title: "AM-01", subtitle: "Type B — advanced life support", status: "in-progress", category: "On mission", details: [{ label: "Crew", value: "Driver Tewodros + 2 medics" }, { label: "Destination", value: "Gondar Airport Road" }] },
        { id: "am2", title: "AM-02", subtitle: "Type B — basic life support", status: "available", category: "Available", details: [{ label: "Crew", value: "Driver Bereket + 2 medics" }, { label: "Base", value: "Main gate" }] },
        { id: "am3", title: "AM-03", subtitle: "Type A — patient transport", status: "pending", category: "Maintenance", details: [{ label: "Issue", value: "Brake system check" }, { label: "Garage", value: "Since Nov 9" }] },
        { id: "am4", title: "AM-04", subtitle: "Type B — advanced life support", status: "available", category: "Available", details: [{ label: "Crew", value: "Driver Hanif + 2 medics" }, { label: "Base", value: "Emergency bay" }] },
      ],
      stats: [
        { label: "Fleet", value: "4", icon: <Ambulance className="h-5 w-5" />, tone: "primary" },
        { label: "On mission", value: "1", icon: <Ambulance className="h-5 w-5" />, tone: "danger" },
        { label: "Available", value: "2", icon: <Ambulance className="h-5 w-5" />, tone: "success" },
        { label: "In maintenance", value: "1", icon: <Ambulance className="h-5 w-5" />, tone: "warning" },
      ],
      filterLabel: "State",
      filterOptions: [
        { label: "All vehicles", value: "" },
        { label: "On mission", value: "On mission" },
        { label: "Available", value: "Available" },
        { label: "Maintenance", value: "Maintenance" },
      ],
    },
  },
};
