import { Droplets, Files, FlaskConical, ScanHeart, TestTube2 } from "lucide-react";
import type { ModuleScreen, AnyRow, ChartConfig } from "@/modules/types";
import type { Column } from "@/components/ui/DataTable";

// -------------------------------------------------------- Laboratory orders

interface LabOrderRow {
  id: string;
  order: string;
  patient: string;
  doctor: string;
  tests: string;
  priority: string;
  status: string;
  date: string;
}

const labOrders: LabOrderRow[] = [
  { id: "lo-001", order: "LAB-2341", patient: "Almaz Tadesse", doctor: "Dr. Selam Girma", tests: "CBC, urinalysis", priority: "routine", status: "completed", date: "2026-11-10" },
  { id: "lo-002", order: "LAB-2342", patient: "Yohannes Kebede", doctor: "Dr. Selam Girma", tests: "Hemoglobin, RBS", priority: "emergency", status: "in-progress", date: "2026-11-10" },
  { id: "lo-003", order: "LAB-2343", patient: "Sara Alemu", doctor: "Dr. Bereket Assefa", tests: "Blood smear (malaria)", priority: "urgent", status: "pending", date: "2026-11-10" },
  { id: "lo-004", order: "LAB-2344", patient: "Getachew Molla", doctor: "Dr. Mulu Alemu", tests: "Crossmatch, group & Rh", priority: "emergency", status: "in-progress", date: "2026-11-09" },
  { id: "lo-005", order: "LAB-2345", patient: "Fatuma Nur", doctor: "Dr. Rahel Wolde", tests: "TSH, urine test", priority: "routine", status: "pending", date: "2026-11-09" },
  { id: "lo-006", order: "LAB-2346", patient: "Dawit Haile", doctor: "Dr. Dawit Mengistu", tests: "Pre-op panel", priority: "urgent", status: "pending", date: "2026-11-08" },
];

const labOrderColumns: Column<AnyRow>[] = [
  { key: "order", header: "Order", sortValue: (row) => String(row.order), render: (row) => <span className="font-mono text-xs font-semibold text-primary-700 dark:text-primary-300">{String(row.order)}</span> },
  { key: "patient", header: "Patient", sortValue: (row) => String(row.patient) },
  { key: "doctor", header: "Requested by", sortValue: (row) => String(row.doctor), hideOnTablet: true },
  { key: "tests", header: "Tests", sortValue: (row) => String(row.tests) },
  { key: "priority", header: "Priority", sortValue: (row) => String(row.priority), render: (row) => <span className="capitalize">{String(row.priority)}</span> },
  { key: "status", header: "Status", sortValue: (row) => String(row.status), render: (row) => <span className="capitalize">{String(row.status)}</span> },
];

// ------------------------------------------------------- Specimen management

interface SpecimenRow {
  id: string;
  specimenId: string;
  patient: string;
  type: string;
  collectedBy: string;
  collectedAt: string;
  status: string;
}

const specimens: SpecimenRow[] = [
  { id: "sp-001", specimenId: "SPC-8841", patient: "Almaz Tadesse", type: "Blood (EDTA)", collectedBy: "Lab tech Dawit", collectedAt: "09:05", status: "validated" },
  { id: "sp-002", specimenId: "SPC-8842", patient: "Yohannes Kebede", type: "Blood (fluoride)", collectedBy: "Lab tech Hiwot", collectedAt: "09:22", status: "in-progress" },
  { id: "sp-003", specimenId: "SPC-8843", patient: "Sara Alemu", type: "Blood (thin smear)", collectedBy: "Lab tech Dawit", collectedAt: "09:40", status: "pending" },
  { id: "sp-004", specimenId: "SPC-8844", patient: "Getachew Molla", type: "Blood (clot)", collectedBy: "Lab tech Tigist", collectedAt: "10:02", status: "in-progress" },
  { id: "sp-005", specimenId: "SPC-8845", patient: "Fatuma Nur", type: "Urine (midstream)", collectedBy: "Patient self", collectedAt: "10:15", status: "pending" },
];

const specimenColumns: Column<AnyRow>[] = [
  { key: "specimenId", header: "Specimen", sortValue: (row) => String(row.specimenId), render: (row) => <span className="font-mono text-xs font-semibold text-primary-700 dark:text-primary-300">{String(row.specimenId)}</span> },
  { key: "patient", header: "Patient", sortValue: (row) => String(row.patient) },
  { key: "type", header: "Type", sortValue: (row) => String(row.type), hideOnTablet: true },
  { key: "collectedBy", header: "Collected by", sortValue: (row) => String(row.collectedBy), hideOnMobile: true },
  { key: "collectedAt", header: "Collected at", align: "right", sortValue: (row) => String(row.collectedAt), render: (row) => <span className="font-mono text-xs">{String(row.collectedAt)}</span> },
  { key: "status", header: "Status", sortValue: (row) => String(row.status), render: (row) => <span className="capitalize">{String(row.status)}</span> },
];

// --------------------------------------------------------- Laboratory results

interface ResultRow {
  id: string;
  order: string;
  patient: string;
  test: string;
  result: string;
  reference: string;
  flag: string;
  validatedBy: string;
}

const labResults: ResultRow[] = [
  { id: "lr-001", order: "LAB-2341", patient: "Almaz Tadesse", test: "Hemoglobin", result: "13.2 g/dL", reference: "12–16 g/dL", flag: "stable", validatedBy: "Mr. Getu Assefa" },
  { id: "lr-002", order: "LAB-2341", patient: "Almaz Tadesse", test: "WBC", result: "7.4 ×10³/µL", reference: "4–11 ×10³/µL", flag: "stable", validatedBy: "Mr. Getu Assefa" },
  { id: "lr-003", order: "LAB-2342", patient: "Yohannes Kebede", test: "Hemoglobin", result: "6.1 g/dL", reference: "13–17 g/dL", flag: "critical", validatedBy: "Mr. Getu Assefa" },
  { id: "lr-004", order: "LAB-2342", patient: "Yohannes Kebede", test: "Fasting glucose", result: "186 mg/dL", reference: "70–100 mg/dL", flag: "recovering", validatedBy: "Mr. Getu Assefa" },
  { id: "lr-005", order: "LAB-2344", patient: "Getachew Molla", test: "Group & Rh", result: "O Rh positive", reference: "—", flag: "stable", validatedBy: "Sr. Meseret" },
];

const resultColumns: Column<AnyRow>[] = [
  { key: "order", header: "Order", sortValue: (row) => String(row.order), render: (row) => <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{String(row.order)}</span> },
  { key: "patient", header: "Patient", sortValue: (row) => String(row.patient) },
  { key: "test", header: "Test", sortValue: (row) => String(row.test) },
  { key: "result", header: "Result", sortValue: (row) => String(row.result), render: (row) => <span className="font-medium text-slate-700 dark:text-slate-200">{String(row.result)}</span> },
  { key: "reference", header: "Reference", sortValue: (row) => String(row.reference), hideOnMobile: true, render: (row) => <span className="text-xs text-slate-400">{String(row.reference)}</span> },
  { key: "flag", header: "Flag", sortValue: (row) => String(row.flag), render: (row) => <span className="capitalize">{String(row.flag)}</span> },
];

// ------------------------------------------------------------------ Radiology

interface ImagingRow {
  id: string;
  study: string;
  patient: string;
  modality: string;
  requestedBy: string;
  scheduled: string;
  status: string;
}

const imaging: ImagingRow[] = [
  { id: "img-001", study: "Chest X-ray", patient: "Abebe Kebede", modality: "X-ray", requestedBy: "Emergency", scheduled: "10:30", status: "in-progress" },
  { id: "img-002", study: "Abdominal ultrasound", patient: "Hanna Girma", modality: "Ultrasound", requestedBy: "Dr. Kidist Haile", scheduled: "11:00", status: "pending" },
  { id: "img-003", study: "Tibia X-ray", patient: "Dawit Haile", modality: "X-ray", requestedBy: "Dr. Dawit Mengistu", scheduled: "11:45", status: "pending" },
  { id: "img-004", study: "Brain CT", patient: "Abebe Kebede", modality: "CT", requestedBy: "Emergency", scheduled: "12:30", status: "scheduled" },
  { id: "img-005", study: "Pelvis X-ray", patient: "Kebede Alemu", modality: "X-ray", requestedBy: "Dr. Mulu Alemu", scheduled: "13:15", status: "scheduled" },
];

const imagingColumns: Column<AnyRow>[] = [
  { key: "study", header: "Study", sortValue: (row) => String(row.study) },
  { key: "patient", header: "Patient", sortValue: (row) => String(row.patient) },
  { key: "modality", header: "Modality", sortValue: (row) => String(row.modality), render: (row) => <span className="rounded bg-light-blue px-1.5 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary/15 dark:text-primary-300">{String(row.modality)}</span> },
  { key: "requestedBy", header: "Requested by", sortValue: (row) => String(row.requestedBy), hideOnTablet: true },
  { key: "scheduled", header: "Scheduled", align: "right", sortValue: (row) => String(row.scheduled), render: (row) => <span className="font-mono text-xs">{String(row.scheduled)}</span> },
  { key: "status", header: "Status", sortValue: (row) => String(row.status), render: (row) => <span className="capitalize">{String(row.status)}</span> },
];

// ------------------------------------------------------------ Imaging reports

interface ReportRow {
  id: string;
  study: string;
  patient: string;
  radiologist: string;
  impression: string;
  date: string;
  status: string;
}

const imagingReports: ReportRow[] = [
  { id: "rep-001", study: "Chest X-ray — Solomon Gebre", patient: "Solomon Gebre", radiologist: "Dr. Fikru Bekele", impression: "No acute cardiopulmonary abnormality", date: "2026-11-10", status: "validated" },
  { id: "rep-002", study: "Brain CT — Tigist Ayele", patient: "Tigist Ayele", radiologist: "Dr. Fikru Bekele", impression: "Small subdural collection, recommend follow-up", date: "2026-11-09", status: "validated" },
  { id: "rep-003", study: "Knee MRI — Dawit Haile", patient: "Dawit Haile", radiologist: "Dr. Genet Wolde", impression: "Grade II medial meniscus tear", date: "2026-11-08", status: "pending" },
  { id: "rep-004", study: "Abdominal US — Marta Girma", patient: "Marta Girma", radiologist: "Dr. Genet Wolde", impression: "Normal hepatobiliary view", date: "2026-11-07", status: "validated" },
];

const reportColumns: Column<AnyRow>[] = [
  { key: "study", header: "Study", sortValue: (row) => String(row.study) },
  { key: "patient", header: "Patient", sortValue: (row) => String(row.patient), hideOnTablet: true },
  { key: "radiologist", header: "Radiologist", sortValue: (row) => String(row.radiologist), hideOnMobile: true },
  { key: "impression", header: "Impression", sortValue: (row) => String(row.impression) },
  { key: "date", header: "Date", align: "right", sortValue: (row) => String(row.date) },
  { key: "status", header: "Status", sortValue: (row) => String(row.status), render: (row) => <span className="capitalize">{String(row.status)}</span> },
];

const labVolumeSeries: Record<string, string | number>[] = [
  { week: "Mon", ordered: 210, completed: 195 },
  { week: "Tue", ordered: 224, completed: 210 },
  { week: "Wed", ordered: 208, completed: 201 },
  { week: "Thu", ordered: 236, completed: 218 },
  { week: "Fri", ordered: 245, completed: 226 },
  { week: "Sat", ordered: 150, completed: 141 },
  { week: "Sun", ordered: 98, completed: 95 },
];

const testMix: { name: string; value: number }[] = [
  { name: "Hematology", value: 34 },
  { name: "Chemistry", value: 28 },
  { name: "Microbiology", value: 14 },
  { name: "Serology", value: 12 },
  { name: "Urinalysis", value: 12 },
];

export const diagnosticsScreens: Record<string, ModuleScreen> = {
  "/laboratory": {
    kind: "analytics",
    screen: {
      description: "Laboratory operations overview — workload, turnaround and test mix.",
      kpis: [
        { label: "Tests ordered (today)", value: "96", hint: "+12% vs yesterday", icon: <FlaskConical className="h-5 w-5" />, tone: "primary" },
        { label: "Completed", value: "88", hint: "92% completion", icon: <FlaskConical className="h-5 w-5" />, tone: "success" },
        { label: "Avg turnaround", value: "42 min", hint: "Target 60 min", icon: <Droplets className="h-5 w-5" />, tone: "warning" },
        { label: "Critical flags", value: "3", hint: "Escalated to clinicians", icon: <FlaskConical className="h-5 w-5" />, tone: "danger" },
      ],
      charts: [
        {
          type: "area",
          title: "Weekly test volume",
          subtitle: "Orders received vs results completed",
          data: labVolumeSeries,
          xKey: "week",
          series: [
            { key: "ordered", label: "Ordered", color: "#1565C0" },
            { key: "completed", label: "Completed", color: "#16A34A" },
          ],
        } as ChartConfig,
        {
          type: "pie",
          title: "Test mix (this month)",
          data: testMix,
        } as ChartConfig,
      ],
    },
  },
  "/laboratory-orders": {
    kind: "list",
    screen: {
      description: "Test orders requested by clinicians across departments.",
      columns: labOrderColumns,
      data: labOrders,
      keyExtractor: (row) => String(row.id),
      searchKeys: ["order", "patient", "doctor", "tests"],
      searchPlaceholder: "Search order, patient or test…",
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
      emptyIcon: FlaskConical,
    },
  },
  "/specimen-management": {
    kind: "list",
    screen: {
      description: "Collection, labeling and chain-of-custody tracking for specimens.",
      columns: specimenColumns,
      data: specimens,
      keyExtractor: (row) => String(row.id),
      searchKeys: ["specimenId", "patient", "type", "collectedBy"],
      searchPlaceholder: "Search specimen, patient or type…",
      emptyIcon: Droplets,
    },
  },
  "/laboratory-results": {
    kind: "list",
    screen: {
      description: "Validated results with reference ranges and critical flags.",
      columns: resultColumns,
      data: labResults,
      keyExtractor: (row) => String(row.id),
      searchKeys: ["order", "patient", "test"],
      searchPlaceholder: "Search order, patient or test…",
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
      emptyIcon: FlaskConical,
    },
  },
  "/radiology": {
    kind: "list",
    screen: {
      description: "Imaging requests, modality scheduling and machine utilization.",
      columns: imagingColumns,
      data: imaging,
      keyExtractor: (row) => String(row.id),
      searchKeys: ["study", "patient", "modality", "requestedBy"],
      searchPlaceholder: "Search study, patient or modality…",
      filters: [
        {
          label: "Modality",
          options: [
            { label: "All modalities", value: "" },
            { label: "X-ray", value: "X-ray" },
            { label: "Ultrasound", value: "Ultrasound" },
            { label: "CT", value: "CT" },
          ],
          matches: (row, value) => row.modality === value,
        },
      ],
      emptyIcon: ScanHeart,
    },
  },
  "/imaging-reports": {
    kind: "list",
    screen: {
      description: "Radiologist reports and archived imaging impressions.",
      columns: reportColumns,
      data: imagingReports,
      keyExtractor: (row) => String(row.id),
      searchKeys: ["study", "patient", "radiologist"],
      searchPlaceholder: "Search study, patient or radiologist…",
      emptyIcon: Files,
    },
  },
  "/blood-bank": {
    kind: "grid",
    screen: {
      description: "Blood unit inventory by group and Rh with expiry tracking.",
      items: [
        { id: "bb-o+", title: "O positive", subtitle: "Whole blood + packed cells", status: "available", category: "O+", details: [{ label: "Units", value: "34" }, { label: "Nearest expiry", value: "12 days" }] },
        { id: "bb-o-", title: "O negative", subtitle: "Universal donor", status: "low", category: "O−", details: [{ label: "Units", value: "6" }, { label: "Nearest expiry", value: "9 days" }] },
        { id: "bb-a+", title: "A positive", subtitle: "Whole blood", status: "available", category: "A+", details: [{ label: "Units", value: "21" }, { label: "Nearest expiry", value: "15 days" }] },
        { id: "bb-a-", title: "A negative", subtitle: "Whole blood", status: "available", category: "A−", details: [{ label: "Units", value: "9" }, { label: "Nearest expiry", value: "11 days" }] },
        { id: "bb-b+", title: "B positive", subtitle: "Whole blood", status: "available", category: "B+", details: [{ label: "Units", value: "17" }, { label: "Nearest expiry", value: "18 days" }] },
        { id: "bb-ab+", title: "AB positive", subtitle: "Plasma + packed cells", status: "low", category: "AB+", details: [{ label: "Units", value: "4" }, { label: "Nearest expiry", value: "7 days" }] },
      ],
      stats: [
        { label: "Total units", value: "91", icon: <TestTube2 className="h-5 w-5" />, tone: "primary" },
        { label: "Low-stock groups", value: "2", icon: <TestTube2 className="h-5 w-5" />, tone: "warning" },
        { label: "Reserved (surgery)", value: "8", icon: <TestTube2 className="h-5 w-5" />, tone: "danger" },
        { label: "Discarded (expired)", value: "1", icon: <TestTube2 className="h-5 w-5" />, tone: "warning" },
      ],
      filterLabel: "Group",
      filterOptions: [
        { label: "All groups", value: "" },
        { label: "O+", value: "O+" },
        { label: "O−", value: "O−" },
        { label: "A+", value: "A+" },
        { label: "A−", value: "A−" },
        { label: "B+", value: "B+" },
        { label: "AB+", value: "AB+" },
      ],
    },
  },
};
