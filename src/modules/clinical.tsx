import { Activity, ClipboardList, FileText, Repeat, Stethoscope, UsersRound } from "lucide-react";
import type { ModuleScreen, AnyRow } from "@/modules/types";
import type { Column } from "@/components/ui/DataTable";

// --------------------------------------------------------- Medical records

interface RecordRow {
  id: string;
  mrn: string;
  patient: string;
  recordType: string;
  lastUpdated: string;
  author: string;
  status: string;
}

const records: RecordRow[] = [
  { id: "rec-001", mrn: "GHMS-000001", patient: "Almaz Tadesse", recordType: "Consultation note", lastUpdated: "2026-11-10", author: "Dr. Selam Girma", status: "validated" },
  { id: "rec-002", mrn: "GHMS-000002", patient: "Getachew Molla", recordType: "Operative report", lastUpdated: "2026-11-10", author: "Dr. Mulu Alemu", status: "validated" },
  { id: "rec-003", mrn: "GHMS-000003", patient: "Hanna Girma", recordType: "Antenatal visit", lastUpdated: "2026-11-09", author: "Dr. Kidist Haile", status: "validated" },
  { id: "rec-004", mrn: "GHMS-000004", patient: "Yohannes Kebede", recordType: "Progress note", lastUpdated: "2026-11-09", author: "Dr. Selam Girma", status: "pending" },
  { id: "rec-005", mrn: "GHMS-000005", patient: "Sara Alemu", recordType: "Discharge summary", lastUpdated: "2026-11-08", author: "Dr. Bereket Assefa", status: "pending" },
  { id: "rec-006", mrn: "GHMS-000006", patient: "Dawit Haile", recordType: "Referral letter", lastUpdated: "2026-11-07", author: "Dr. Dawit Mengistu", status: "validated" },
];

const recordColumns: Column<AnyRow>[] = [
  { key: "patient", header: "Patient", sortValue: (row) => String(row.patient) },
  { key: "mrn", header: "MRN", sortValue: (row) => String(row.mrn), hideOnMobile: true, render: (row) => <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{String(row.mrn)}</span> },
  { key: "recordType", header: "Record type", sortValue: (row) => String(row.recordType) },
  { key: "author", header: "Author", sortValue: (row) => String(row.author), hideOnTablet: true },
  { key: "lastUpdated", header: "Last updated", align: "right", sortValue: (row) => String(row.lastUpdated) },
  { key: "status", header: "Status", sortValue: (row) => String(row.status), render: (row) => <span className="capitalize">{String(row.status)}</span> },
];

// -------------------------------------------------------------- Diagnoses

interface DiagnosisRow {
  id: string;
  patient: string;
  code: string;
  diagnosis: string;
  department: string;
  recordedBy: string;
  date: string;
  status: string;
}

const diagnoses: DiagnosisRow[] = [
  { id: "dx-001", patient: "Almaz Tadesse", code: "I10", diagnosis: "Essential hypertension", department: "Internal Medicine", recordedBy: "Dr. Selam Girma", date: "2026-11-10", status: "validated" },
  { id: "dx-002", patient: "Getachew Molla", code: "K35.8", diagnosis: "Acute appendicitis", department: "Surgery", recordedBy: "Dr. Mulu Alemu", date: "2026-11-10", status: "validated" },
  { id: "dx-003", patient: "Yohannes Kebede", code: "E11.9", diagnosis: "Type 2 diabetes mellitus", department: "Internal Medicine", recordedBy: "Dr. Selam Girma", date: "2026-11-09", status: "pending" },
  { id: "dx-004", patient: "Sara Alemu", code: "J05.0", diagnosis: "Acute obstructive laryngitis", department: "Pediatrics", recordedBy: "Dr. Bereket Assefa", date: "2026-11-08", status: "validated" },
  { id: "dx-005", patient: "Dawit Haile", code: "S82.5", diagnosis: "Fracture of distal tibia", department: "Orthopedics", recordedBy: "Dr. Dawit Mengistu", date: "2026-11-07", status: "validated" },
  { id: "dx-006", patient: "Fatuma Nur", code: "F32.1", diagnosis: "Major depressive disorder, moderate", department: "Psychiatry", recordedBy: "Dr. Rahel Wolde", date: "2026-11-04", status: "pending" },
];

const diagnosisColumns: Column<AnyRow>[] = [
  { key: "patient", header: "Patient", sortValue: (row) => String(row.patient) },
  { key: "code", header: "ICD code", sortValue: (row) => String(row.code), render: (row) => <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">{String(row.code)}</span> },
  { key: "diagnosis", header: "Diagnosis", sortValue: (row) => String(row.diagnosis) },
  { key: "department", header: "Department", sortValue: (row) => String(row.department), hideOnTablet: true },
  { key: "date", header: "Recorded", align: "right", sortValue: (row) => String(row.date) },
  { key: "status", header: "Status", sortValue: (row) => String(row.status), render: (row) => <span className="capitalize">{String(row.status)}</span> },
];

// ------------------------------------------------------------ Vital signs

interface VitalRow {
  id: string;
  patient: string;
  temperature: string;
  pulse: string;
  bp: string;
  spo2: string;
  recordedBy: string;
  time: string;
  flag: string;
}

const vitals: VitalRow[] = [
  { id: "vs-001", patient: "Yohannes Kebede", temperature: "38.2 °C", pulse: "102 bpm", bp: "148/95 mmHg", spo2: "94%", recordedBy: "Sr. Tigist Alemu", time: "09:40", flag: "critical" },
  { id: "vs-002", patient: "Almaz Tadesse", temperature: "36.8 °C", pulse: "78 bpm", bp: "132/84 mmHg", spo2: "98%", recordedBy: "Sr. Tigist Alemu", time: "09:12", flag: "stable" },
  { id: "vs-003", patient: "Getachew Molla", temperature: "37.1 °C", pulse: "84 bpm", bp: "120/78 mmHg", spo2: "97%", recordedBy: "Sr. Bontu Kebede", time: "08:55", flag: "stable" },
  { id: "vs-004", patient: "Sara Alemu", temperature: "38.9 °C", pulse: "118 bpm", bp: "100/62 mmHg", spo2: "95%", recordedBy: "Sr. Hiwot Adane", time: "08:30", flag: "recovering" },
  { id: "vs-005", patient: "Abebe Kebede", temperature: "36.5 °C", pulse: "96 bpm", bp: "110/70 mmHg", spo2: "92%", recordedBy: "Sr. Tigist Alemu", time: "10:05", flag: "critical" },
];

const vitalColumns: Column<AnyRow>[] = [
  { key: "patient", header: "Patient", sortValue: (row) => String(row.patient) },
  { key: "temperature", header: "Temp", sortValue: (row) => parseFloat(String(row.temperature)), hideOnTablet: true },
  { key: "pulse", header: "Pulse", sortValue: (row) => parseInt(String(row.pulse), 10) },
  { key: "bp", header: "Blood pressure", sortValue: (row) => String(row.bp), hideOnTablet: true },
  { key: "spo2", header: "SpO₂", align: "right", sortValue: (row) => parseInt(String(row.spo2), 10) },
  { key: "flag", header: "Flag", sortValue: (row) => String(row.flag), render: (row) => <span className="capitalize">{String(row.flag)}</span> },
  { key: "time", header: "Recorded", align: "right", sortValue: (row) => String(row.time), render: (row) => <span className="font-mono text-xs">{String(row.time)}</span> },
];

// -------------------------------------------------------------- Referrals

interface ReferralRow {
  id: string;
  patient: string;
  from: string;
  to: string;
  reason: string;
  priority: string;
  status: string;
  date: string;
}

const referrals: ReferralRow[] = [
  { id: "ref-001", patient: "Yohannes Kebede", from: "Internal Medicine", to: "Cardiology — Tikur Anbessa", reason: "Suspected cardiomyopathy", priority: "urgent", status: "pending", date: "2026-11-10" },
  { id: "ref-002", patient: "Dawit Haile", from: "Emergency", to: "Orthopedics", reason: "Complex tibial fracture", priority: "emergency", status: "validated", date: "2026-11-10" },
  { id: "ref-003", patient: "Meron Assefa", from: "Dermatology", to: "Psychiatry", reason: "Psychosomatic evaluation", priority: "routine", status: "pending", date: "2026-11-09" },
  { id: "ref-004", patient: "Lensa Abera", from: "Gynecology & Obstetrics", to: "Ophthalmology", reason: "Pregnancy-related visual changes", priority: "urgent", status: "validated", date: "2026-11-08" },
  { id: "ref-005", patient: "Biruk Tesfaye", from: "Pediatrics", to: "Physiotherapy", reason: "Post-fracture rehabilitation", priority: "routine", status: "completed", date: "2026-11-07" },
];

const referralColumns: Column<AnyRow>[] = [
  { key: "patient", header: "Patient", sortValue: (row) => String(row.patient) },
  { key: "from", header: "From", sortValue: (row) => String(row.from), hideOnTablet: true },
  { key: "to", header: "To", sortValue: (row) => String(row.to) },
  { key: "reason", header: "Reason", sortValue: (row) => String(row.reason), hideOnMobile: true },
  { key: "priority", header: "Priority", sortValue: (row) => String(row.priority), render: (row) => <span className="capitalize">{String(row.priority)}</span> },
  { key: "status", header: "Status", sortValue: (row) => String(row.status), render: (row) => <span className="capitalize">{String(row.status)}</span> },
];

// ---------------------------------------------------------------- Doctors

interface DoctorRow {
  id: string;
  name: string;
  specialty: string;
  department: string;
  patientsToday: number;
  status: string;
}

const doctors: DoctorRow[] = [
  { id: "doc-001", name: "Dr. Selam Girma", specialty: "Internist", department: "Internal Medicine", patientsToday: 18, status: "in-progress" },
  { id: "doc-002", name: "Dr. Mulu Alemu", specialty: "General surgeon", department: "Surgery", patientsToday: 9, status: "in-progress" },
  { id: "doc-003", name: "Dr. Kidist Haile", specialty: "Obstetrician", department: "Gynecology & Obstetrics", patientsToday: 14, status: "scheduled" },
  { id: "doc-004", name: "Dr. Bereket Assefa", specialty: "Pediatrician", department: "Pediatrics", patientsToday: 21, status: "in-progress" },
  { id: "doc-005", name: "Dr. Dawit Mengistu", specialty: "Orthopedic surgeon", department: "Orthopedics", patientsToday: 11, status: "scheduled" },
  { id: "doc-006", name: "Dr. Rahel Wolde", specialty: "Psychiatrist", department: "Psychiatry", patientsToday: 6, status: "completed" },
];

const doctorColumns: Column<AnyRow>[] = [
  { key: "name", header: "Doctor", sortValue: (row) => String(row.name) },
  { key: "specialty", header: "Specialty", sortValue: (row) => String(row.specialty), hideOnTablet: true },
  { key: "department", header: "Department", sortValue: (row) => String(row.department), hideOnMobile: true },
  { key: "patientsToday", header: "Patients today", align: "right", sortValue: (row) => Number(row.patientsToday) },
  { key: "status", header: "Status", sortValue: (row) => String(row.status), render: (row) => <span className="capitalize">{String(row.status)}</span> },
];

// ----------------------------------------------------------------- Nurses

interface NurseRow {
  id: string;
  name: string;
  unit: string;
  shift: string;
  patientsAssigned: number;
  status: string;
}

const nurses: NurseRow[] = [
  { id: "nur-001", name: "Sr. Tigist Alemu", unit: "Internal Medicine", shift: "08:00–16:00", patientsAssigned: 12, status: "in-progress" },
  { id: "nur-002", name: "Sr. Bontu Kebede", unit: "Surgery", shift: "08:00–16:00", patientsAssigned: 9, status: "in-progress" },
  { id: "nur-003", name: "Sr. Hiwot Adane", unit: "Pediatrics", shift: "16:00–00:00", patientsAssigned: 14, status: "scheduled" },
  { id: "nur-004", name: "Sr. Meseret Tadesse", unit: "ICU", shift: "00:00–08:00", patientsAssigned: 6, status: "completed" },
  { id: "nur-005", name: "Sr. Rahel Getachew", unit: "Gynecology & Obstetrics", shift: "08:00–16:00", patientsAssigned: 11, status: "in-progress" },
  { id: "nur-006", name: "Sr. AlmazWorku", unit: "Emergency", shift: "08:00–16:00", patientsAssigned: 10, status: "scheduled" },
];

const nurseColumns: Column<AnyRow>[] = [
  { key: "name", header: "Nurse", sortValue: (row) => String(row.name) },
  { key: "unit", header: "Unit", sortValue: (row) => String(row.unit), hideOnTablet: true },
  { key: "shift", header: "Shift", sortValue: (row) => String(row.shift), render: (row) => <span className="font-mono text-xs">{String(row.shift)}</span> },
  { key: "patientsAssigned", header: "Patients assigned", align: "right", sortValue: (row) => Number(row.patientsAssigned) },
  { key: "status", header: "Status", sortValue: (row) => String(row.status), render: (row) => <span className="capitalize">{String(row.status)}</span> },
];

export const clinicalScreens: Record<string, ModuleScreen> = {
  "/medical-records": {
    kind: "list",
    screen: {
      description: "Central index of patient charts, notes and clinical documents.",
      columns: recordColumns,
      data: records,
      keyExtractor: (row) => String(row.id),
      searchKeys: ["patient", "mrn", "recordType", "author"],
      searchPlaceholder: "Search patient, MRN or record type…",
      filters: [
        {
          label: "Status",
          options: [
            { label: "All", value: "" },
            { label: "Validated", value: "validated" },
            { label: "Pending", value: "pending" },
          ],
          matches: (row, value) => row.status === value,
        },
      ],
      stats: [
        { label: "Records (recent)", value: String(records.length), icon: <FileText className="h-5 w-5" />, tone: "primary" },
        { label: "Validated", value: String(records.filter((r) => r.status === "validated").length), icon: <FileText className="h-5 w-5" />, tone: "success" },
        { label: "Pending sign-off", value: String(records.filter((r) => r.status === "pending").length), icon: <FileText className="h-5 w-5" />, tone: "warning" },
        { label: "Patients covered", value: String(new Set(records.map((r) => r.patient)).size), icon: <UsersRound className="h-5 w-5" />, tone: "danger" },
      ],
      emptyIcon: FileText,
    },
  },
  "/diagnoses": {
    kind: "list",
    screen: {
      description: "Coded diagnoses (ICD-10) recorded during patient encounters.",
      columns: diagnosisColumns,
      data: diagnoses,
      keyExtractor: (row) => String(row.id),
      searchKeys: ["patient", "code", "diagnosis", "department"],
      searchPlaceholder: "Search patient, code or diagnosis…",
      filters: [
        {
          label: "Department",
          options: [
            { label: "All departments", value: "" },
            ...[...new Set(diagnoses.map((d) => d.department))].sort().map((d) => ({ label: d, value: d })),
          ],
          matches: (row, value) => row.department === value,
        },
      ],
      emptyIcon: ClipboardList,
    },
  },
  "/vital-signs": {
    kind: "list",
    screen: {
      description: "Latest recorded vital signs across admitted and monitored patients.",
      columns: vitalColumns,
      data: vitals,
      keyExtractor: (row) => String(row.id),
      searchKeys: ["patient", "recordedBy"],
      searchPlaceholder: "Search patient or recorder…",
      filters: [
        {
          label: "Flag",
          options: [
            { label: "All", value: "" },
            { label: "Stable", value: "stable" },
            { label: "Recovering", value: "recovering" },
            { label: "Critical", value: "critical" },
          ],
          matches: (row, value) => row.flag === value,
        },
      ],
      stats: [
        { label: "Readings today", value: String(vitals.length), icon: <Activity className="h-5 w-5" />, tone: "primary" },
        { label: "Critical flags", value: String(vitals.filter((v) => v.flag === "critical").length), icon: <Activity className="h-5 w-5" />, tone: "danger" },
        { label: "Patients monitored", value: String(new Set(vitals.map((v) => v.patient)).size), icon: <UsersRound className="h-5 w-5" />, tone: "success" },
        { label: "Recorders on shift", value: String(new Set(vitals.map((v) => v.recordedBy)).size), icon: <UsersRound className="h-5 w-5" />, tone: "warning" },
      ],
      emptyIcon: Activity,
    },
  },
  "/referrals": {
    kind: "list",
    screen: {
      description: "Internal and external referral requests with priority tracking.",
      columns: referralColumns,
      data: referrals,
      keyExtractor: (row) => String(row.id),
      searchKeys: ["patient", "from", "to", "reason"],
      searchPlaceholder: "Search patient or facility…",
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
      emptyIcon: Repeat,
    },
  },
  "/doctors": {
    kind: "list",
    screen: {
      description: "Physician directory with today's workload and availability.",
      columns: doctorColumns,
      data: doctors,
      keyExtractor: (row) => String(row.id),
      searchKeys: ["name", "specialty", "department"],
      searchPlaceholder: "Search doctor, specialty or department…",
      filters: [
        {
          label: "Department",
          options: [
            { label: "All departments", value: "" },
            ...[...new Set(doctors.map((d) => d.department))].sort().map((d) => ({ label: d, value: d })),
          ],
          matches: (row, value) => row.department === value,
        },
      ],
      emptyIcon: Stethoscope,
    },
  },
  "/nurses": {
    kind: "list",
    screen: {
      description: "Nursing staff on duty with unit assignments and patient load.",
      columns: nurseColumns,
      data: nurses,
      keyExtractor: (row) => String(row.id),
      searchKeys: ["name", "unit"],
      searchPlaceholder: "Search nurse or unit…",
      filters: [
        {
          label: "Shift",
          options: [
            { label: "All shifts", value: "" },
            { label: "08:00–16:00", value: "08:00–16:00" },
            { label: "16:00–00:00", value: "16:00–00:00" },
            { label: "00:00–08:00", value: "00:00–08:00" },
          ],
          matches: (row, value) => row.shift === value,
        },
      ],
      emptyIcon: UsersRound,
    },
  },
  "/messages": {
    kind: "custom",
    screen: "clinical-messages",
  },
};
