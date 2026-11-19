"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  Ambulance,
  Baby,
  BedDouble,
  Brain,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Eye,
  FileCheck2,
  HeartPulse,
  ImageOff,
  LockKeyhole,
  MonitorSmartphone,
  ScanEye,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  Syringe,
  Users,
  UsersRound,
  Wrench,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { authService } from "@/services";
import { emergencyBackendApi } from "@/services/backend-services";
import type {
  DepartmentId,
  EmergencyCaseRecord,
  EmergencyCaseStatus,
  EmergencyTriageCategory,
} from "@/services/department-workflows";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard, type StatTone } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface DepartmentMetric {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
  tone?: StatTone;
}

interface DepartmentTab {
  id: string;
  label: string;
  content: ReactNode;
}

interface WorkflowField {
  name: string;
  label: string;
  type?: "text" | "date" | "time" | "datetime-local" | "tel" | "number" | "select" | "textarea";
  required?: boolean;
  placeholder?: string;
  options?: string[];
  min?: number;
  max?: number;
}

interface DepartmentTableColumn {
  key: string;
  label: string;
}

interface DepartmentPatientRow {
  patientId: string;
  patient: string;
  focus: string;
  owner: string;
  status: string;
}

const departmentLinks: Array<{ id: DepartmentId; label: string }> = [
  { id: "emergency", label: "Emergency" },
  { id: "internal-medicine", label: "Internal Medicine" },
  { id: "surgery", label: "Surgery" },
  { id: "pediatrics", label: "Pediatrics" },
  { id: "gynecology-obstetrics", label: "Gynecology & Obstetrics" },
  { id: "orthopedics", label: "Orthopedics" },
  { id: "dentistry", label: "Dentistry" },
  { id: "ophthalmology", label: "Ophthalmology" },
  { id: "dermatology", label: "Dermatology" },
  { id: "psychiatry", label: "Psychiatry" },
  { id: "icu", label: "ICU" },
  { id: "physiotherapy", label: "Physiotherapy" },
];

const demoPatients = [
  { id: "GHMS-01042", name: "Selam Bekele" },
  { id: "GHMS-01043", name: "Kebede Assefa" },
  { id: "GHMS-01044", name: "Meron Ayele" },
  { id: "GHMS-01045", name: "Tesfaye Tadesse" },
  { id: "GHMS-01046", name: "Hanna Girma" },
  { id: "GHMS-01047", name: "Dawit Haile" },
];

function departmentHref(id: DepartmentId): string {
  return id === "emergency" ? "/emergency" : `/departments/${id}`;
}

function DepartmentNavigation({ activeId }: { activeId: DepartmentId }) {
  return (
    <nav aria-label="Department navigation" className="mb-5 flex gap-2 overflow-x-auto pb-2">
      {departmentLinks.map((department) => (
        <Button
          key={department.id}
          href={departmentHref(department.id)}
          size="sm"
          variant={department.id === activeId ? "primary" : "secondary"}
          aria-current={department.id === activeId ? "page" : undefined}
          className="shrink-0"
        >
          {department.label}
        </Button>
      ))}
    </nav>
  );
}

function SyntheticDataNotice({ children }: { children?: ReactNode }) {
  return (
    <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p><strong>Synthetic demonstration data only.</strong> Department screens do not save to a hospital database. Role visibility is not backend authorization.{children ? <> {children}</> : null}</p>
    </div>
  );
}

function DepartmentFrame({
  departmentId,
  title,
  description,
  lead,
  metrics,
  tabs,
}: {
  departmentId: DepartmentId;
  title: string;
  description: string;
  lead: string;
  metrics: DepartmentMetric[];
  tabs: DepartmentTab[];
}) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id ?? "overview");
  const active = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];
  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={<span className="inline-flex items-center gap-2 rounded-lg bg-light-blue px-3 py-2 text-sm font-medium text-primary-700 dark:bg-primary/15 dark:text-primary-300"><Stethoscope className="h-4 w-4" aria-hidden />Clinical lead: {lead}</span>}
      />
      <DepartmentNavigation activeId={departmentId} />
      <SyntheticDataNotice />
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <StatCard key={metric.label} label={metric.label} value={metric.value} hint={metric.hint} icon={metric.icon} tone={metric.tone} />
        ))}
      </div>
      <div role="tablist" aria-label={`${title} workflows`} className="mb-5 flex gap-2 overflow-x-auto border-b border-slate-200 pb-2 dark:border-slate-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`${departmentId}-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={active?.id === tab.id}
            aria-controls={`${departmentId}-panel`}
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium ${active?.id === tab.id ? "bg-primary-600 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <section id={`${departmentId}-panel`} role="tabpanel" aria-labelledby={`${departmentId}-tab-${active?.id}`} className="space-y-5">
        {active?.content}
      </section>
    </>
  );
}

function WorkflowForm({
  title,
  description,
  fields,
  submitLabel,
  onSave,
}: {
  title: string;
  description?: string;
  fields: WorkflowField[];
  submitLabel: string;
  onSave?: (values: Record<string, string>) => void;
}) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const missing = fields.filter((field) => field.required !== false && !String(values[field.name] ?? "").trim());
    const invalidNumber = fields.filter((field) => field.type === "number" && String(values[field.name] ?? "").trim())
      .filter((field) => {
        const value = Number(values[field.name]);
        return !Number.isFinite(value) || (field.min !== undefined && value < field.min) || (field.max !== undefined && value > field.max);
      });
    if (missing.length || invalidNumber.length) {
      const missingNames = missing.map((field) => field.label);
      const invalidNames = invalidNumber.map((field) => field.label);
      setError([
        missingNames.length ? `Complete required fields: ${missingNames.join(", ")}.` : "",
        invalidNames.length ? `Check numeric ranges for: ${invalidNames.join(", ")}.` : "",
      ].filter(Boolean).join(" "));
      return;
    }
    const normalized = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, String(value)]));
    onSave?.(normalized);
    setError("");
    setMessage(`${title} saved in this demonstration session.`);
    event.currentTarget.reset();
  };
  return (
    <Card>
      <CardHeader title={title} subtitle={description} />
      <form noValidate onSubmit={submit} className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
        {fields.map((field) => {
          const id = `dept-${field.name}`;
          let control: ReactNode;
          if (field.type === "select") {
            control = (
              <select id={id} name={field.name} aria-label={field.label} className="ghms-input" defaultValue="">
                <option value="">Select...</option>
                {(field.options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            );
          } else if (field.type === "textarea") {
            control = <textarea id={id} name={field.name} aria-label={field.label} rows={3} className="ghms-input" placeholder={field.placeholder} />;
          } else {
            control = <input id={id} name={field.name} aria-label={field.label} type={field.type ?? "text"} step={field.type === "number" ? "any" : undefined} min={field.min} max={field.max} className="ghms-input" placeholder={field.placeholder} />;
          }
          return <FormField key={field.name} label={field.label} htmlFor={id} required={field.required !== false}>{control}</FormField>;
        })}
        <div className="flex flex-col gap-2 sm:col-span-2 xl:col-span-3">
          {error ? <p role="alert" className="text-sm font-medium text-danger">{error}</p> : null}
          {message ? <p role="status" className="text-sm font-medium text-success">{message}</p> : null}
          <div><Button type="submit" leftIcon={<FileCheck2 className="h-4 w-4" />}>{submitLabel}</Button></div>
        </div>
      </form>
    </Card>
  );
}

function DepartmentTable({
  title,
  subtitle,
  columns,
  rows,
}: {
  title: string;
  subtitle?: string;
  columns: DepartmentTableColumn[];
  rows: Array<Record<string, string>>;
}) {
  return (
    <Card flush>
      <CardHeader title={title} subtitle={subtitle} />
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead><tr className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800">{columns.map((column) => <th key={column.key} className="whitespace-nowrap px-4 py-3">{column.label}</th>)}</tr></thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id ?? `${title}-${index}`} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                {columns.map((column) => (
                  <td key={column.key} className="whitespace-nowrap px-4 py-3 text-slate-700 dark:text-slate-200">
                    {column.key === "status" ? <StatusBadge status={row[column.key] ?? "pending"} size="sm" /> : row[column.key] ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 ? <tr><td className="px-4 py-6 text-center text-slate-500" colSpan={columns.length}>No demonstration records.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ReportPanel({ department, rows }: { department: string; rows: DepartmentPatientRow[] }) {
  const active = rows.filter((row) => !/completed|discharged/i.test(row.status)).length;
  const completed = rows.length - active;
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Demo records" value={String(rows.length)} icon={<ClipboardList className="h-5 w-5" />} tone="primary" />
        <StatCard label="Active cases" value={String(active)} icon={<Activity className="h-5 w-5" />} tone="warning" />
        <StatCard label="Completed" value={String(completed)} icon={<CheckCircle2 className="h-5 w-5" />} tone="success" />
      </div>
      <DepartmentTable title={`${department} activity report`} subtitle="Synthetic preview; totals are illustrative only." columns={[{ key: "patient", label: "Patient" }, { key: "focus", label: "Clinical focus" }, { key: "owner", label: "Assigned clinician" }, { key: "status", label: "Status" }]} rows={patientTableRows(rows)} />
    </div>
  );
}

function PatientOptions() {
  return demoPatients.map((patient) => `${patient.name} (${patient.id})`);
}

function patientRows(rows: Array<[string, string, string, string, string]>): DepartmentPatientRow[] {
  return rows.map(([patientId, patient, focus, owner, status]) => ({ patientId, patient, focus, owner, status }));
}

function patientTableRows(rows: DepartmentPatientRow[]): Array<Record<string, string>> {
  return rows.map((row) => ({ id: row.patientId, patient: `${row.patient} (${row.patientId})`, focus: row.focus, owner: row.owner, status: row.status }));
}

function PatientList({ title, rows, columns = [{ key: "patient", label: "Patient / identifier" }, { key: "focus", label: "Current care focus" }, { key: "owner", label: "Assigned clinician" }, { key: "status", label: "Status" }] }: { title: string; rows: DepartmentPatientRow[]; columns?: DepartmentTableColumn[] }) {
  return <DepartmentTable title={title} subtitle="Synthetic patient entries for the department preview." columns={columns} rows={patientTableRows(rows)} />;
}

const triageClasses: Record<EmergencyTriageCategory, string> = {
  Red: "border-red-300 bg-red-100 text-red-900 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200",
  Orange: "border-orange-300 bg-orange-100 text-orange-900 dark:border-orange-800 dark:bg-orange-950/50 dark:text-orange-200",
  Yellow: "border-yellow-300 bg-yellow-100 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-200",
  Green: "border-green-300 bg-green-100 text-green-900 dark:border-green-800 dark:bg-green-950/50 dark:text-green-200",
  Blue: "border-blue-300 bg-blue-100 text-blue-900 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-200",
};

function TriageBadge({ category }: { category: EmergencyCaseRecord["triageCategory"] }) {
  if (category === "Untriaged") return <span className="rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">Untriaged</span>;
  return <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${triageClasses[category]}`} aria-label={`Triage category ${category}`}>{category}</span>;
}

const initialEmergencyCases: EmergencyCaseRecord[] = [
  { caseNumber: "ER-2026-041", patientIdentifier: "GHMS-•••42", arrivalTime: "08:14", triageCategory: "Red", presentingComplaint: "Road traffic injury", assignedDoctor: "Dr. Fikru Tsegaye", currentStatus: "In treatment" },
  { caseNumber: "ER-2026-042", patientIdentifier: "GHMS-•••43", arrivalTime: "08:26", triageCategory: "Orange", presentingComplaint: "Acute chest pain", assignedDoctor: "Dr. Fikru Tsegaye", currentStatus: "Waiting" },
  { caseNumber: "ER-2026-043", patientIdentifier: "GHMS-•••44", arrivalTime: "08:39", triageCategory: "Yellow", presentingComplaint: "Deep forearm laceration", assignedDoctor: "Dr. Hana Bekele", currentStatus: "Waiting" },
  { caseNumber: "ER-2026-044", patientIdentifier: "GHMS-•••45", arrivalTime: "08:45", triageCategory: "Green", presentingComplaint: "Fever and cough", assignedDoctor: "Dr. Hana Bekele", currentStatus: "Admission requested", destination: "Pediatrics" },
  { caseNumber: "ER-2026-045", patientIdentifier: "GHMS-•••46", arrivalTime: "08:53", triageCategory: "Blue", presentingComplaint: "Minor ankle sprain", assignedDoctor: "Unassigned", currentStatus: "Waiting" },
];

const emergencyStatuses: EmergencyCaseStatus[] = ["Awaiting triage", "Waiting", "In treatment", "Admission requested", "Transferred", "Discharged"];

function emergencyCaseOptions(cases: EmergencyCaseRecord[]): string[] {
  return cases.map((item) => item.caseNumber);
}

function EmergencyCaseTable({ cases }: { cases: EmergencyCaseRecord[] }) {
  return (
    <Card flush>
      <CardHeader title="Emergency queue" subtitle="Use the triage color and case identifier to coordinate care." />
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead><tr className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800"><th className="px-3 py-3">Case</th><th className="px-3 py-3">Patient ID</th><th className="px-3 py-3">Arrival</th><th className="px-3 py-3">Triage</th><th className="px-3 py-3">Assigned doctor</th><th className="px-3 py-3">Current status</th></tr></thead>
          <tbody>{cases.map((item) => (
            <tr key={item.caseNumber} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
              <td className="whitespace-nowrap px-3 py-3 font-mono text-xs font-semibold">{item.caseNumber}</td>
              <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{item.patientIdentifier}</td>
              <td className="whitespace-nowrap px-3 py-3">{item.arrivalTime}</td>
              <td className="px-3 py-3"><TriageBadge category={item.triageCategory} /></td>
              <td className="whitespace-nowrap px-3 py-3">{item.assignedDoctor}</td>
              <td className="px-3 py-3"><StatusBadge status={item.currentStatus} size="sm" /></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </Card>
  );
}

export function EmergencyDepartmentScreen() {
  const [cases, setCases] = useState(initialEmergencyCases);
  const [consultations, setConsultations] = useState<Array<Record<string, string>>>([]);

  useEffect(() => {
    let mounted = true;
    emergencyBackendApi.listCases()
      .then((res) => {
        if (mounted && res?.data?.length) {
          setCases(res.data);
        }
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const updateCase = (caseNumber: string, patch: Partial<EmergencyCaseRecord>) => {
    setCases((current) => current.map((item) => item.caseNumber === caseNumber ? { ...item, ...patch } : item));
  };

  const register = (values: Record<string, string>) => {
    const sequence = String(46 + cases.filter((item) => item.caseNumber.startsWith("ER-2026-")).length).padStart(3, "0");
    const patientIdentifier = values.patientIdentifier.trim();
    const masked = patientIdentifier.length > 2 ? `GHMS-•••${patientIdentifier.slice(-2)}` : "GHMS-•••";

    void emergencyBackendApi.register({
      patientIdentifier: patientIdentifier || undefined,
      arrivalMode: values.arrivalMode || "Walk-in",
      presentingComplaint: values.presentingComplaint || "Emergency assessment",
    }).catch(() => {});

    setCases((current) => [{
      caseNumber: `ER-${new Date().getFullYear()}-${sequence}`,
      patientIdentifier: masked,
      arrivalTime: values.arrivalTime,
      triageCategory: "Untriaged",
      presentingComplaint: values.presentingComplaint,
      assignedDoctor: "Unassigned",
      currentStatus: "Awaiting triage",
    }, ...current]);
  };

  const triage = (values: Record<string, string>) => {
    void emergencyBackendApi.recordTriage(values.caseNumber, {
      category: values.triageCategory as EmergencyTriageCategory,
      priority: values.triageCategory === "Red" ? "Immediate" : "Urgent",
      assignedStaff: values.assignedDoctor,
      assessmentNotes: "Triage assessment completed",
      vitalSigns: { bp: "120/80", hr: 80 },
    }).catch(() => {});

    updateCase(values.caseNumber, {
      triageCategory: values.triageCategory as EmergencyTriageCategory,
      assignedDoctor: values.assignedDoctor,
      currentStatus: "Waiting",
    });
  };

  const disposition = (values: Record<string, string>, mode: "admit" | "transfer" | "discharge") => {
    const status: EmergencyCaseStatus = mode === "admit" ? "Admission requested" : mode === "transfer" ? "Transferred" : "Discharged";
    void emergencyBackendApi.transition(values.caseNumber, status, { destination: values.destination }).catch(() => {});
    updateCase(values.caseNumber, { currentStatus: status, destination: values.destination });
  };

  const metrics: DepartmentMetric[] = [
    { label: "Active emergency cases", value: String(cases.filter((item) => item.currentStatus !== "Discharged").length), hint: "All current triage levels", icon: <Ambulance className="h-5 w-5" />, tone: "danger" },
    { label: "Red / immediate", value: String(cases.filter((item) => item.triageCategory === "Red").length), hint: "Immediate resuscitation", icon: <HeartPulse className="h-5 w-5" />, tone: "danger" },
    { label: "Awaiting triage", value: String(cases.filter((item) => item.currentStatus === "Awaiting triage").length), hint: "Priority assessment required", icon: <AlertTriangle className="h-5 w-5" />, tone: "warning" },
    { label: "Arrivals today", value: String(cases.length), hint: "Synthetic activity count", icon: <Users className="h-5 w-5" />, tone: "primary" },
  ];

  const sections: DepartmentTab[] = [
    { id: "overview", label: "Dashboard", content: <div className="space-y-5"><TriageLegend /><EmergencyCaseTable cases={cases} /></div> },
    { id: "registration", label: "Emergency registration", content: <WorkflowForm title="Register emergency case" description="Capture arrival and presenting complaint before triage. The patient identifier is masked in queue views." submitLabel="Register case" fields={[
      { name: "patientIdentifier", label: "Patient identifier", placeholder: "GHMS-01042" },
      { name: "arrivalTime", label: "Arrival time", type: "time" },
      { name: "arrivalMode", label: "Arrival mode", type: "select", options: ["Walk-in", "Ambulance", "Referral", "Police / other"] },
      { name: "presentingComplaint", label: "Presenting complaint", type: "textarea" },
    ]} onSave={register} /> },
    { id: "triage", label: "Patient triage", content: <div className="space-y-5"><WorkflowForm title="Triage assessment" description="Assign a category, clinician and initial observations." submitLabel="Save triage" fields={[
      { name: "caseNumber", label: "Emergency case", type: "select", options: emergencyCaseOptions(cases) },
      { name: "triageCategory", label: "Triage category", type: "select", options: ["Red", "Orange", "Yellow", "Green", "Blue"] },
      { name: "assignedDoctor", label: "Assigned doctor", type: "select", options: ["Dr. Fikru Tsegaye", "Dr. Hana Bekele", "Dr. Samuel Ayele"] },
      { name: "assessment", label: "Triage assessment", type: "textarea" },
      { name: "vitalSigns", label: "Initial vital signs", placeholder: "BP, pulse, respiratory rate, SpO2" },
    ]} onSave={triage} /><EmergencyCaseTable cases={cases} /></div> },
    { id: "queue", label: "Emergency queue", content: <EmergencyQueue cases={cases} updateCase={updateCase} /> },
    { id: "consultation", label: "Consultation & treatment", content: <div className="space-y-5"><WorkflowForm title="Emergency consultation" description="Document assessment, diagnosis, immediate treatment and requested investigations." submitLabel="Save emergency consultation" fields={[
      { name: "caseNumber", label: "Emergency case", type: "select", options: emergencyCaseOptions(cases) },
      { name: "consultation", label: "Clinical assessment", type: "textarea" },
      { name: "diagnosis", label: "Working diagnosis", type: "text" },
      { name: "treatment", label: "Treatment documentation", type: "textarea" },
      { name: "investigations", label: "Investigation requests", type: "textarea", required: false },
    ]} onSave={(values) => setConsultations((current) => [values, ...current])} />
    <DepartmentTable title="Recent emergency consultations" columns={[{ key: "caseNumber", label: "Case" }, { key: "diagnosis", label: "Working diagnosis" }, { key: "treatment", label: "Treatment" }]} rows={consultations} /></div> },
    { id: "admission", label: "Admission & transfer", content: <WorkflowForm title="Emergency disposition" description="Request admission, transfer to another department, or continue care in the emergency unit." submitLabel="Save disposition" fields={[
      { name: "caseNumber", label: "Emergency case", type: "select", options: emergencyCaseOptions(cases) },
      { name: "disposition", label: "Disposition", type: "select", options: ["admit", "transfer"] },
      { name: "destination", label: "Receiving ward / department" },
      { name: "reason", label: "Reason and handover notes", type: "textarea" },
    ]} onSave={(values) => disposition(values, values.disposition === "transfer" ? "transfer" : "admit")} /> },
    { id: "discharge", label: "Emergency discharge", content: <WorkflowForm title="Emergency discharge" description="Record discharge outcome, instructions and follow-up." submitLabel="Complete discharge" fields={[
      { name: "caseNumber", label: "Emergency case", type: "select", options: emergencyCaseOptions(cases) },
      { name: "destination", label: "Discharge destination", type: "select", options: ["Home", "Referred clinic", "Other"] },
      { name: "instructions", label: "Discharge instructions", type: "textarea" },
      { name: "followUp", label: "Follow-up plan", type: "textarea" },
    ]} onSave={(values) => disposition(values, "discharge")} /> },
  ];

  return (
    <DepartmentFrame
      departmentId="emergency"
      title="Emergency Department"
      description="Triage-led emergency care from registration through treatment, admission, transfer and discharge."
      lead="Dr. Fikru Tsegaye"
      metrics={metrics}
      tabs={sections}
    />
  );
}

function TriageLegend() {
  return (
    <Card>
      <CardHeader title="Triage priority guide" subtitle="Colors indicate urgency; always follow local clinical triage policy." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {(["Red", "Orange", "Yellow", "Green", "Blue"] as const).map((category, index) => (
          <div key={category} className={`rounded-lg border p-3 ${triageClasses[category]}`}>
            <div className="flex items-center justify-between"><strong>{category}</strong><span className="text-xs font-medium">{["Immediate", "Very urgent", "Urgent", "Standard", "Non-urgent"][index]}</span></div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function EmergencyQueue({
  cases,
  updateCase,
}: {
  cases: EmergencyCaseRecord[];
  updateCase: (caseNumber: string, patch: Partial<EmergencyCaseRecord>) => void;
}) {
  return (
    <Card flush>
      <CardHeader title="Live-style emergency queue" subtitle="Update case flow locally for demonstration; no dispatch or paging integration is active." />
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead><tr className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800"><th className="px-3 py-3">Case</th><th className="px-3 py-3">Patient ID</th><th className="px-3 py-3">Arrival</th><th className="px-3 py-3">Triage</th><th className="px-3 py-3">Doctor</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Update</th></tr></thead>
          <tbody>{cases.map((item) => (
            <tr key={item.caseNumber} className="border-b border-slate-100 dark:border-slate-800">
              <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{item.caseNumber}</td>
              <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{item.patientIdentifier}</td>
              <td className="whitespace-nowrap px-3 py-3">{item.arrivalTime}</td>
              <td className="px-3 py-3"><TriageBadge category={item.triageCategory} /></td>
              <td className="whitespace-nowrap px-3 py-3">{item.assignedDoctor}</td>
              <td className="px-3 py-3"><StatusBadge status={item.currentStatus} size="sm" /></td>
              <td className="px-3 py-3">
                <select aria-label={`Update status ${item.caseNumber}`} className="ghms-input min-w-40" value={item.currentStatus} onChange={(event) => updateCase(item.caseNumber, { currentStatus: event.target.value as EmergencyCaseStatus })}>
                  {emergencyStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </Card>
  );
}

const medicineRows = patientRows([
  ["GHMS-02011", "Almaz Tadesse", "Hypertension review", "Dr. Selam Girma", "Follow-up"],
  ["GHMS-02012", "Yohannes Kebede", "Type 2 diabetes", "Dr. Selam Girma", "Active"],
  ["GHMS-02013", "Meron Assefa", "Asthma control", "Dr. Hana Bekele", "Investigation"],
]);

function InternalMedicineWorkspace() {
  const metrics: DepartmentMetric[] = [
    { label: "Consultations today", value: "64", hint: "Synthetic daily count", icon: <Stethoscope className="h-5 w-5" />, tone: "primary" },
    { label: "Chronic follow-ups", value: "18", hint: "Due this week", icon: <HeartPulse className="h-5 w-5" />, tone: "warning" },
    { label: "Investigation pending", value: "11", hint: "Laboratory and imaging", icon: <ClipboardList className="h-5 w-5" />, tone: "danger" },
    { label: "Clinicians on duty", value: "8", hint: "Internal Medicine", icon: <UsersRound className="h-5 w-5" />, tone: "success" },
  ];
  const tabs: DepartmentTab[] = [
    { id: "overview", label: "Dashboard", content: <div className="grid gap-5 xl:grid-cols-2"><PatientList title="Today's medicine activity" rows={medicineRows.slice(0, 2)} /><DepartmentTable title="Chronic disease watchlist" columns={[{ key: "patient", label: "Patient" }, { key: "condition", label: "Chronic condition" }, { key: "lastReview", label: "Last review" }, { key: "status", label: "Status" }]} rows={[
      { patient: "Almaz Tadesse (GHMS-02011)", condition: "Hypertension", lastReview: "2026-11-06", status: "Follow-up" },
      { patient: "Yohannes Kebede (GHMS-02012)", condition: "Type 2 diabetes", lastReview: "2026-10-28", status: "Review due" },
      { patient: "Meron Assefa (GHMS-02013)", condition: "Asthma", lastReview: "2026-11-02", status: "Stable" },
    ]} /></div> },
    { id: "patients", label: "Patient list", content: <PatientList title="Internal Medicine patients" rows={medicineRows} /> },
    { id: "consultation", label: "Consultation", content: <WorkflowForm title="Internal medicine consultation" description="Clinical history, examination, working diagnosis, investigations, treatment and follow-up." submitLabel="Save consultation" fields={[
      { name: "patient", label: "Patient", type: "select", options: PatientOptions() },
      { name: "complaint", label: "Presenting complaint", type: "textarea" },
      { name: "history", label: "History of present illness", type: "textarea" },
      { name: "examination", label: "Clinical examination", type: "textarea" },
      { name: "diagnosis", label: "Diagnosis" },
      { name: "investigations", label: "Investigation requests", type: "textarea", required: false },
      { name: "treatment", label: "Treatment plan", type: "textarea" },
      { name: "followUp", label: "Follow-up instructions", type: "textarea", required: false },
    ]} /> },
    { id: "chronic", label: "Chronic disease follow-up", content: <div className="space-y-5"><PatientList title="Chronic care registry" rows={medicineRows} /><WorkflowForm title="Chronic disease review" submitLabel="Save chronic care review" fields={[
      { name: "patient", label: "Patient", type: "select", options: PatientOptions() },
      { name: "condition", label: "Chronic condition", type: "select", options: ["Hypertension", "Type 2 diabetes", "Asthma", "Heart failure", "Chronic kidney disease"] },
      { name: "measurements", label: "Key measurements / control status", type: "textarea" },
      { name: "medicationReview", label: "Medication review", type: "textarea" },
      { name: "nextReview", label: "Next review date", type: "date" },
    ]} /></div> },
    { id: "investigations", label: "Investigations & treatment", content: <WorkflowForm title="Investigation and treatment plan" description="Coordinate laboratory and imaging requests with an actionable care plan." submitLabel="Save plan" fields={[
      { name: "patient", label: "Patient", type: "select", options: PatientOptions() },
      { name: "testType", label: "Investigation type", type: "select", options: ["Laboratory", "Radiology", "Cardiac test", "Other"] },
      { name: "testDetails", label: "Requested investigation", type: "textarea" },
      { name: "priority", label: "Priority", type: "select", options: ["Routine", "Urgent", "Emergency"] },
      { name: "treatment", label: "Treatment plan", type: "textarea" },
    ]} /> },
    { id: "follow-up", label: "Follow-up", content: <DepartmentTable title="Follow-up management" subtitle="Next actions due from the synthetic outpatient panel." columns={[{ key: "patient", label: "Patient" }, { key: "condition", label: "Reason" }, { key: "due", label: "Due date" }, { key: "status", label: "Status" }]} rows={[
      { patient: "Yohannes Kebede (GHMS-02012)", condition: "Diabetes review", due: "2026-11-14", status: "Scheduled" },
      { patient: "Almaz Tadesse (GHMS-02011)", condition: "Blood pressure review", due: "2026-11-16", status: "Pending" },
    ]} /> },
    { id: "reports", label: "Reports", content: <ReportPanel department="Internal Medicine" rows={medicineRows} /> },
  ];
  return <DepartmentFrame departmentId="internal-medicine" title="Internal Medicine" description="Adult medical consultation, clinical examination, chronic disease follow-up, investigations and longitudinal treatment." lead="Dr. Selam Girma" metrics={metrics} tabs={tabs} />;
}

const surgeryRows = patientRows([
  ["GHMS-03011", "Getachew Molla", "Laparoscopic appendectomy", "Dr. Mulu Alemu", "Scheduled"],
  ["GHMS-03012", "Dawit Haile", "Tibial fixation review", "Dr. Dawit Mengistu", "Pre-op"],
  ["GHMS-03013", "Hanna Girma", "Hernia repair assessment", "Dr. Mulu Alemu", "Pending"],
]);

function SurgeryWorkspace() {
  const metrics: DepartmentMetric[] = [
    { label: "Cases on schedule", value: "18", hint: "Illustrative weekly count", icon: <CalendarDays className="h-5 w-5" />, tone: "primary" },
    { label: "Operating rooms ready", value: "4 / 5", hint: "One room in maintenance", icon: <Syringe className="h-5 w-5" />, tone: "success" },
    { label: "Pre-op assessment due", value: "6", hint: "Before next scheduled case", icon: <ClipboardList className="h-5 w-5" />, tone: "warning" },
    { label: "Post-op monitoring", value: "9", hint: "Recovery ward", icon: <HeartPulse className="h-5 w-5" />, tone: "danger" },
  ];
  const tabs: DepartmentTab[] = [
    { id: "overview", label: "Dashboard", content: <div className="grid gap-5 xl:grid-cols-2"><PatientList title="Surgical patients and requests" rows={surgeryRows} /><DepartmentTable title="Next operating room cases" columns={[{ key: "time", label: "Time" }, { key: "room", label: "Operating room" }, { key: "procedure", label: "Procedure" }, { key: "team", label: "Lead surgeon / team" }, { key: "status", label: "Status" }]} rows={[
      { time: "09:00", room: "OR-1", procedure: "Appendectomy", team: "Dr. Mulu Alemu / Team A", status: "Ready" },
      { time: "11:30", room: "OR-2", procedure: "Tibial fixation", team: "Dr. Dawit Mengistu / Team B", status: "Pre-op" },
    ]} /></div> },
    { id: "patients", label: "Patients & requests", content: <div className="space-y-5"><PatientList title="Surgery patient list" rows={surgeryRows} /><WorkflowForm title="Surgery request" description="Specify proposed procedure, priority, operating room and surgical team." submitLabel="Submit surgery request" fields={[
      { name: "patient", label: "Patient", type: "select", options: PatientOptions() },
      { name: "procedure", label: "Proposed procedure" },
      { name: "priority", label: "Priority", type: "select", options: ["Elective", "Urgent", "Emergency"] },
      { name: "date", label: "Requested date", type: "date" },
      { name: "operatingRoom", label: "Operating room", type: "select", options: ["OR-1", "OR-2", "OR-3", "OR-4"] },
      { name: "surgicalTeam", label: "Surgical team assignment" },
    ]} /></div> },
    { id: "pre-op", label: "Pre-op & anesthesia", content: <WorkflowForm title="Preoperative assessment" description="Review consent, readiness, risk, surgical team and anesthesia plan." submitLabel="Save pre-op assessment" fields={[
      { name: "patient", label: "Patient", type: "select", options: PatientOptions() },
      { name: "procedure", label: "Planned procedure" },
      { name: "asa", label: "ASA class", type: "select", options: ["I", "II", "III", "IV", "V"] },
      { name: "consent", label: "Consent status", type: "select", options: ["Confirmed", "Pending review"] },
      { name: "fasting", label: "Fasting / preparation status" },
      { name: "anesthesia", label: "Anesthesia assessment and plan", type: "textarea" },
      { name: "team", label: "Assigned surgical team" },
    ]} /> },
    { id: "calendar", label: "Surgery calendar", content: <DepartmentTable title="Operating room schedule" subtitle="Synthetic schedule for planning preview." columns={[{ key: "date", label: "Date" }, { key: "time", label: "Time" }, { key: "room", label: "Room" }, { key: "patient", label: "Patient" }, { key: "procedure", label: "Procedure" }, { key: "status", label: "Status" }]} rows={[
      { date: "2026-11-13", time: "09:00", room: "OR-1", patient: "Getachew Molla", procedure: "Appendectomy", status: "Scheduled" },
      { date: "2026-11-13", time: "11:30", room: "OR-2", patient: "Dawit Haile", procedure: "Tibial fixation", status: "Pre-op" },
      { date: "2026-11-14", time: "08:00", room: "OR-3", patient: "Hanna Girma", procedure: "Hernia repair", status: "Pending" },
    ]} /> },
    { id: "operation-notes", label: "Operation notes", content: <WorkflowForm title="Operation note and anesthesia record" submitLabel="Save operation note" fields={[
      { name: "patient", label: "Patient", type: "select", options: PatientOptions() },
      { name: "procedure", label: "Procedure performed" },
      { name: "team", label: "Surgical team" },
      { name: "anesthesiaType", label: "Anesthesia type", type: "select", options: ["General", "Regional", "Local", "Sedation"] },
      { name: "findings", label: "Operative findings and notes", type: "textarea" },
      { name: "bloodLoss", label: "Estimated blood loss" },
      { name: "postOpPlan", label: "Immediate post-operative plan", type: "textarea" },
    ]} /> },
    { id: "post-op", label: "Post-op monitoring", content: <div className="space-y-5"><DepartmentTable title="Recovery and postoperative monitoring" columns={[{ key: "patient", label: "Patient" }, { key: "procedure", label: "Procedure" }, { key: "observations", label: "Latest observations" }, { key: "recovery", label: "Recovery" }, { key: "status", label: "Status" }]} rows={[
      { patient: "Getachew Molla", procedure: "Appendectomy", observations: "BP 118/76; SpO2 98%", recovery: "Pain 2/10", status: "Stable" },
      { patient: "Dawit Haile", procedure: "Tibial fixation", observations: "BP 122/80; SpO2 97%", recovery: "Neurovascular checks", status: "Monitoring" },
    ]} /><WorkflowForm title="Postoperative monitoring note" submitLabel="Record monitoring" fields={[
      { name: "patient", label: "Patient", type: "select", options: PatientOptions() },
      { name: "observations", label: "Post-op observations", type: "textarea" },
      { name: "painScore", label: "Pain score (0-10)", type: "number", min: 0, max: 10 },
      { name: "wound", label: "Wound and drain assessment", type: "textarea" },
      { name: "plan", label: "Escalation / ongoing care plan", type: "textarea" },
    ]} /></div> },
    { id: "reports", label: "Reports", content: <ReportPanel department="Surgery" rows={surgeryRows} /> },
  ];
  return <DepartmentFrame departmentId="surgery" title="Surgery" description="Surgical case management from request and preoperative assessment through operation notes and recovery." lead="Dr. Mulu Alemu" metrics={metrics} tabs={tabs} />;
}

const pediatricRows = patientRows([
  ["GHMS-04021", "Sara Alemu", "Guardian: Hana Alemu · growth review", "Dr. Bereket Assefa", "Follow-up"],
  ["GHMS-04022", "Yared Mekonnen", "Guardian: Mulu Mekonnen · immunization", "Dr. Tsion Getachew", "Due"],
  ["GHMS-04023", "Marta Girma", "Guardian: Alemu Girma · fever", "Dr. Bereket Assefa", "Active"],
]);

const growthData = [
  { month: "Jun", weight: 12.1, height: 86.2 },
  { month: "Jul", weight: 12.3, height: 86.7 },
  { month: "Aug", weight: 12.6, height: 87.1 },
  { month: "Sep", weight: 12.7, height: 87.5 },
  { month: "Oct", weight: 13.0, height: 88.0 },
  { month: "Nov", weight: 13.2, height: 88.4 },
];

function PediatricsWorkspace() {
  const metrics: DepartmentMetric[] = [
    { label: "Children seen today", value: "72", hint: "Synthetic daily count", icon: <Baby className="h-5 w-5" />, tone: "primary" },
    { label: "Growth checks due", value: "14", hint: "Next scheduled reviews", icon: <Activity className="h-5 w-5" />, tone: "warning" },
    { label: "Immunizations due", value: "9", hint: "Review card before administration", icon: <ShieldAlert className="h-5 w-5" />, tone: "danger" },
    { label: "Pediatric beds", value: "55 / 70", hint: "Demonstration occupancy", icon: <BedDouble className="h-5 w-5" />, tone: "success" },
  ];
  const tabs: DepartmentTab[] = [
    { id: "overview", label: "Dashboard", content: <div className="grid gap-5 xl:grid-cols-2"><PatientList title="Pediatric care list" rows={pediatricRows} columns={[{ key: "patient", label: "Child / identifier" }, { key: "focus", label: "Guardian / care focus" }, { key: "owner", label: "Pediatrician" }, { key: "status", label: "Status" }]} /><DepartmentTable title="Immunization and growth reminders" columns={[{ key: "child", label: "Child" }, { key: "reminder", label: "Due item" }, { key: "due", label: "Due date" }, { key: "status", label: "Status" }]} rows={[
      { child: "Yared Mekonnen", reminder: "Routine immunization review", due: "2026-11-13", status: "Due" },
      { child: "Sara Alemu", reminder: "Growth measurement", due: "2026-11-15", status: "Scheduled" },
    ]} /></div> },
    { id: "profiles", label: "Child profiles", content: <div className="space-y-5"><PatientList title="Child patient profiles with guardian details" rows={pediatricRows} columns={[{ key: "patient", label: "Child / record number" }, { key: "focus", label: "Guardian details / concern" }, { key: "owner", label: "Responsible pediatrician" }, { key: "status", label: "Status" }]} /><div className="grid gap-4 md:grid-cols-2"><Card><CardHeader title="Child profile - sample" /><dl className="grid grid-cols-2 gap-3 p-5 text-sm"><dt className="text-slate-500">Child</dt><dd>Sara Alemu</dd><dt className="text-slate-500">Guardian</dt><dd>Hana Alemu (parent)</dd><dt className="text-slate-500">Guardian contact</dt><dd>+251 9XX XXX XXX (masked)</dd><dt className="text-slate-500">Age group</dt><dd>Infant / toddler</dd></dl></Card><WorkflowForm title="Guardian contact update" submitLabel="Save guardian details" fields={[
      { name: "child", label: "Child", type: "select", options: PatientOptions() },
      { name: "guardian", label: "Guardian name" },
      { name: "relationship", label: "Relationship" },
      { name: "contact", label: "Guardian contact (demo only)", type: "tel" },
    ]} /></div></div> },
    { id: "consultation", label: "Pediatric consultation", content: <WorkflowForm title="Pediatric consultation" description="Document child history, examination, guardian input, diagnosis and plan." submitLabel="Save pediatric consultation" fields={[
      { name: "child", label: "Child", type: "select", options: PatientOptions() },
      { name: "guardian", label: "Guardian / accompanying adult" },
      { name: "complaint", label: "Presenting complaint", type: "textarea" },
      { name: "history", label: "Pediatric history and feeding", type: "textarea" },
      { name: "examination", label: "Clinical examination", type: "textarea" },
      { name: "diagnosis", label: "Diagnosis" },
      { name: "plan", label: "Treatment and safety-net plan", type: "textarea" },
    ]} /> },
    { id: "growth", label: "Growth & immunization", content: <div className="space-y-5"><div className="grid gap-5 md:grid-cols-2"><Card><CardHeader title="Weight tracking" subtitle="Synthetic longitudinal values; not a growth reference chart." /><SimpleTrendChart data={growthData} dataKey="weight" label="Weight (kg)" color="#2563eb" domain={[10, 15]} /></Card><Card><CardHeader title="Height tracking" subtitle="Synthetic longitudinal values; interpret with approved pediatric standards." /><SimpleTrendChart data={growthData} dataKey="height" label="Height (cm)" color="#16a34a" domain={[80, 95]} /></Card></div><DepartmentTable title="Immunization history" columns={[{ key: "child", label: "Child" }, { key: "vaccine", label: "Vaccine / dose" }, { key: "date", label: "Recorded date" }, { key: "next", label: "Next due" }, { key: "status", label: "Status" }]} rows={[
      { child: "Sara Alemu", vaccine: "Routine schedule - dose review", date: "2026-08-13", next: "2026-11-13", status: "Due" },
      { child: "Yared Mekonnen", vaccine: "Routine schedule - prior dose", date: "2026-07-22", next: "2026-12-22", status: "Complete" },
    ]} /><WorkflowForm title="Record growth measurement or immunization" submitLabel="Save child health record" fields={[
      { name: "child", label: "Child", type: "select", options: PatientOptions() },
      { name: "recordType", label: "Record type", type: "select", options: ["Weight and height", "Immunization"] },
      { name: "weight", label: "Weight (kg)", type: "number", min: 0.5, max: 250 },
      { name: "height", label: "Height (cm)", type: "number", min: 20, max: 250 },
      { name: "vaccine", label: "Vaccine and dose", required: false },
      { name: "date", label: "Measurement / administration date", type: "date" },
    ]} /></div> },
    { id: "follow-up", label: "Pediatric follow-up", content: <DepartmentTable title="Pediatric follow-up management" columns={[{ key: "child", label: "Child" }, { key: "guardian", label: "Guardian" }, { key: "reason", label: "Follow-up reason" }, { key: "due", label: "Due" }, { key: "status", label: "Status" }]} rows={[
      { child: "Sara Alemu", guardian: "Hana Alemu", reason: "Growth review", due: "2026-11-15", status: "Scheduled" },
      { child: "Marta Girma", guardian: "Alemu Girma", reason: "Fever reassessment", due: "2026-11-14", status: "Pending" },
    ]} /> },
    { id: "reports", label: "Reports", content: <ReportPanel department="Pediatrics" rows={pediatricRows} /> },
  ];
  return <DepartmentFrame departmentId="pediatrics" title="Pediatrics" description="Child-centered profiles, guardian details, consultations, growth monitoring, immunization history and follow-up." lead="Dr. Bereket Assefa" metrics={metrics} tabs={tabs} />;
}

const maternityRows = patientRows([
  ["GHMS-05031", "Hanna Girma", "Antenatal · 28 weeks · EDD 2027-02-05", "Dr. Kidist Haile", "Scheduled"],
  ["GHMS-05032", "Lensa Abera", "Antenatal · 34 weeks · EDD 2026-12-27", "Dr. Kidist Haile", "Monitoring"],
  ["GHMS-05033", "Marta Girma", "Postnatal review", "Sr. Rahel Getachew", "Follow-up"],
]);

function gestationDetails(lmp: string): { weeks: number; days: number; dueDate: string } | null {
  if (!lmp) return null;
  const lastPeriod = new Date(`${lmp}T00:00:00`);
  if (Number.isNaN(lastPeriod.getTime())) return null;
  const today = new Date();
  const elapsedDays = Math.floor((new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() - lastPeriod.getTime()) / 86400000);
  if (elapsedDays < 0 || elapsedDays > 315) return null;
  const due = new Date(lastPeriod);
  due.setDate(due.getDate() + 280);
  return {
    weeks: Math.floor(elapsedDays / 7),
    days: elapsedDays % 7,
    dueDate: due.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }),
  };
}

function PregnancyCalculator() {
  const [lmp, setLmp] = useState("");
  const gestation = useMemo(() => gestationDetails(lmp), [lmp]);
  return (
    <Card>
      <CardHeader title="Gestational age and expected delivery date" subtitle="Estimated from last menstrual period for demonstration; clinician must confirm dating." />
      <div className="grid gap-4 p-5 sm:grid-cols-3">
        <FormField label="Last menstrual period" htmlFor="pregnancy-lmp" required><input id="pregnancy-lmp" type="date" value={lmp} onChange={(event) => setLmp(event.target.value)} className="ghms-input" /></FormField>
        <div className="rounded-lg bg-light-blue p-3 dark:bg-primary/15"><p className="text-xs text-slate-500">Gestational age</p><p className="mt-1 text-lg font-semibold">{gestation ? `${gestation.weeks} weeks ${gestation.days} days` : "Enter a valid LMP"}</p></div>
        <div className="rounded-lg bg-light-blue p-3 dark:bg-primary/15"><p className="text-xs text-slate-500">Estimated due date</p><p className="mt-1 text-lg font-semibold">{gestation?.dueDate ?? "—"}</p></div>
      </div>
    </Card>
  );
}

function GynecologyObstetricsWorkspace() {
  const metrics: DepartmentMetric[] = [
    { label: "Antenatal visits today", value: "39", hint: "Synthetic clinic count", icon: <HeartPulse className="h-5 w-5" />, tone: "primary" },
    { label: "Labor monitoring", value: "5", hint: "Active labor records", icon: <Activity className="h-5 w-5" />, tone: "warning" },
    { label: "Expected deliveries", value: "12", hint: "Next 30 days (demo)", icon: <Baby className="h-5 w-5" />, tone: "danger" },
    { label: "Maternity beds", value: "51 / 65", hint: "Demonstration occupancy", icon: <BedDouble className="h-5 w-5" />, tone: "success" },
  ];
  const tabs: DepartmentTab[] = [
    { id: "overview", label: "Dashboard", content: <div className="grid gap-5 xl:grid-cols-2"><PatientList title="Maternal care list" rows={maternityRows} /><DepartmentTable title="Maternal health report" columns={[{ key: "patient", label: "Patient" }, { key: "gestation", label: "Gestation / care stage" }, { key: "risk", label: "Risk review" }, { key: "status", label: "Status" }]} rows={[
      { patient: "Hanna Girma", gestation: "28 weeks", risk: "Routine review", status: "Scheduled" },
      { patient: "Lensa Abera", gestation: "34 weeks", risk: "Blood pressure monitoring", status: "Monitoring" },
    ]} /></div> },
    { id: "pregnancy", label: "Pregnancy registration", content: <div className="space-y-5"><PregnancyCalculator /><WorkflowForm title="Register pregnancy" description="Create a synthetic pregnancy record with maternal health and obstetric history." submitLabel="Register pregnancy" fields={[
      { name: "patient", label: "Patient", type: "select", options: PatientOptions() },
      { name: "lmp", label: "Last menstrual period", type: "date" },
      { name: "gravida", label: "Gravida", type: "number", min: 1, max: 20 },
      { name: "parity", label: "Parity", type: "number", min: 0, max: 20 },
      { name: "risk", label: "Pregnancy risk review", type: "select", options: ["Routine", "High risk", "Needs clinician review"] },
      { name: "maternalHistory", label: "Maternal health history", type: "textarea" },
    ]} /></div> },
    { id: "antenatal", label: "Antenatal visits", content: <div className="space-y-5"><DepartmentTable title="Antenatal visit history" columns={[{ key: "patient", label: "Patient" }, { key: "date", label: "Visit date" }, { key: "gestation", label: "Gestational age" }, { key: "observations", label: "Maternal observations" }, { key: "status", label: "Status" }]} rows={[
      { patient: "Hanna Girma", date: "2026-11-12", gestation: "28w 0d", observations: "BP 116/72; fetal heart recorded", status: "Reviewed" },
      { patient: "Lensa Abera", date: "2026-11-10", gestation: "34w 2d", observations: "BP follow-up requested", status: "Follow-up" },
    ]} /><WorkflowForm title="Antenatal visit" submitLabel="Save antenatal visit" fields={[
      { name: "patient", label: "Pregnancy record", type: "select", options: PatientOptions() },
      { name: "visitDate", label: "Visit date", type: "date" },
      { name: "gestationalAge", label: "Gestational age (weeks + days)" },
      { name: "bloodPressure", label: "Blood pressure" },
      { name: "fetalHeart", label: "Fetal heart rate (bpm)", type: "number", min: 60, max: 240 },
      { name: "maternalNotes", label: "Maternal health notes", type: "textarea" },
      { name: "plan", label: "Antenatal plan and next visit", type: "textarea" },
    ]} /></div> },
    { id: "labor", label: "Labor monitoring", content: <div className="space-y-5"><DepartmentTable title="Labor monitoring board" columns={[{ key: "patient", label: "Patient" }, { key: "ward", label: "Location" }, { key: "stage", label: "Labor stage" }, { key: "lastCheck", label: "Last monitoring" }, { key: "status", label: "Status" }]} rows={[
      { patient: "Lensa Abera", ward: "Labor Suite 2", stage: "Active labor", lastCheck: "08:40", status: "Monitoring" },
      { patient: "Hanna Girma", ward: "Maternity Triage", stage: "Assessment", lastCheck: "08:25", status: "Review" },
    ]} /><WorkflowForm title="Labor monitoring entry" submitLabel="Record labor observation" fields={[
      { name: "patient", label: "Maternal record", type: "select", options: PatientOptions() },
      { name: "time", label: "Observation time", type: "time" },
      { name: "contractions", label: "Contraction pattern" },
      { name: "fetalHeart", label: "Fetal heart rate (bpm)", type: "number", min: 60, max: 240 },
      { name: "maternalObservations", label: "Maternal observations", type: "textarea" },
      { name: "escalation", label: "Escalation / clinical note", type: "textarea", required: false },
    ]} /></div> },
    { id: "delivery", label: "Delivery & newborn", content: <div className="space-y-5"><WorkflowForm title="Delivery documentation" submitLabel="Save delivery record" fields={[
      { name: "patient", label: "Maternal record", type: "select", options: PatientOptions() },
      { name: "deliveryDate", label: "Delivery date and time", type: "datetime-local" },
      { name: "deliveryMode", label: "Delivery mode", type: "select", options: ["Vaginal", "Cesarean", "Assisted", "Other"] },
      { name: "outcome", label: "Maternal and delivery outcome", type: "textarea" },
      { name: "complications", label: "Complications / interventions", type: "textarea", required: false },
    ]} /><WorkflowForm title="Newborn registration" submitLabel="Register newborn" fields={[
      { name: "maternalRecord", label: "Maternal record", type: "select", options: PatientOptions() },
      { name: "newbornIdentifier", label: "Newborn medical record number" },
      { name: "birthTime", label: "Birth date and time", type: "datetime-local" },
      { name: "sex", label: "Sex recorded at birth", type: "select", options: ["Female", "Male", "Unrecorded"] },
      { name: "birthWeight", label: "Birth weight (kg)", type: "number", min: 0.3, max: 8 },
      { name: "newbornNotes", label: "Newborn notes", type: "textarea", required: false },
    ]} /></div> },
    { id: "postnatal", label: "Postnatal follow-up", content: <div className="space-y-5"><PatientList title="Postnatal follow-up list" rows={maternityRows.filter((row) => row.focus.toLowerCase().includes("postnatal"))} /><WorkflowForm title="Postnatal follow-up" submitLabel="Save postnatal review" fields={[
      { name: "mother", label: "Maternal record", type: "select", options: PatientOptions() },
      { name: "newborn", label: "Newborn identifier" },
      { name: "reviewDate", label: "Follow-up date", type: "date" },
      { name: "maternalReview", label: "Maternal health review", type: "textarea" },
      { name: "newbornReview", label: "Newborn feeding / health review", type: "textarea" },
      { name: "nextAction", label: "Next follow-up / referral", type: "textarea" },
    ]} /></div> },
    { id: "reports", label: "Reports", content: <ReportPanel department="Gynecology & Obstetrics" rows={maternityRows} /> },
  ];
  return <DepartmentFrame departmentId="gynecology-obstetrics" title="Gynecology & Obstetrics" description="Pregnancy registration, antenatal and maternal care, labor monitoring, delivery documentation, newborn records and postnatal follow-up." lead="Dr. Kidist Haile" metrics={metrics} tabs={tabs} />;
}

const orthopedicRows = patientRows([
  ["GHMS-06011", "Dawit Haile", "Distal tibia fracture · follow-up imaging", "Dr. Dawit Mengistu", "Monitoring"],
  ["GHMS-06012", "Marta Girma", "Ankle sprain · mobility review", "Dr. Yonas Bekele", "Rehabilitation"],
  ["GHMS-06013", "Kebede Assefa", "Post-operative review", "Dr. Dawit Mengistu", "Follow-up"],
]);

function OrthopedicsWorkspace() {
  const metrics: DepartmentMetric[] = [
    { label: "Orthopedic cases", value: "21", hint: "Synthetic daily count", icon: <Wrench className="h-5 w-5" />, tone: "primary" },
    { label: "Fracture follow-ups", value: "8", hint: "Imaging review due", icon: <ScanEye className="h-5 w-5" />, tone: "warning" },
    { label: "Rehabilitation plans", value: "13", hint: "Active plans", icon: <Activity className="h-5 w-5" />, tone: "success" },
    { label: "Injury review", value: "5", hint: "Awaiting clinician", icon: <AlertTriangle className="h-5 w-5" />, tone: "danger" },
  ];
  const tabs: DepartmentTab[] = [
    { id: "overview", label: "Dashboard", content: <div className="grid gap-5 xl:grid-cols-2"><PatientList title="Orthopedic patients" rows={orthopedicRows} /><DepartmentTable title="Fracture and injury review" columns={[{ key: "patient", label: "Patient" }, { key: "injury", label: "Injury / fracture" }, { key: "imaging", label: "Imaging status" }, { key: "status", label: "Status" }]} rows={[
      { patient: "Dawit Haile", injury: "Distal tibia fracture", imaging: "X-ray review due", status: "Review" },
      { patient: "Marta Girma", injury: "Ankle sprain", imaging: "No new imaging", status: "Rehabilitation" },
    ]} /></div> },
    { id: "patients", label: "Patient list", content: <PatientList title="Orthopedic patient list" rows={orthopedicRows} /> },
    { id: "consultation", label: "Consultation & injury", content: <WorkflowForm title="Orthopedic consultation and injury record" submitLabel="Save orthopedic note" fields={[
      { name: "patient", label: "Patient", type: "select", options: PatientOptions() },
      { name: "injuryDate", label: "Injury date", type: "date" },
      { name: "mechanism", label: "Mechanism of injury" },
      { name: "site", label: "Anatomical site and laterality" },
      { name: "examination", label: "Orthopedic examination", type: "textarea" },
      { name: "fracture", label: "Fracture classification / notes", type: "textarea", required: false },
      { name: "diagnosis", label: "Diagnosis" },
      { name: "plan", label: "Initial treatment plan", type: "textarea" },
    ]} /> },
    { id: "imaging", label: "Imaging review", content: <div className="space-y-5"><DepartmentTable title="Orthopedic imaging review" columns={[{ key: "patient", label: "Patient" }, { key: "study", label: "Study" }, { key: "date", label: "Study date" }, { key: "review", label: "Review note" }, { key: "status", label: "Status" }]} rows={[
      { patient: "Dawit Haile", study: "Tibia / ankle X-ray", date: "2026-11-12", review: "Alignment review pending", status: "Pending" },
      { patient: "Marta Girma", study: "Ankle X-ray", date: "2026-11-10", review: "No displaced fracture on demo report", status: "Reviewed" },
    ]} /><WorkflowForm title="Imaging interpretation note" submitLabel="Save imaging review" fields={[
      { name: "patient", label: "Patient", type: "select", options: PatientOptions() },
      { name: "study", label: "Study / modality", type: "select", options: ["X-ray", "CT", "MRI", "Ultrasound"] },
      { name: "findings", label: "Imaging findings", type: "textarea" },
      { name: "reviewer", label: "Reviewing clinician" },
      { name: "nextStep", label: "Recommended next step", type: "textarea", required: false },
    ]} /></div> },
    { id: "treatment", label: "Treatment & rehabilitation", content: <div className="space-y-5"><WorkflowForm title="Orthopedic treatment plan" submitLabel="Save treatment plan" fields={[
      { name: "patient", label: "Patient", type: "select", options: PatientOptions() },
      { name: "treatment", label: "Immobilization / treatment instructions", type: "textarea" },
      { name: "weightBearing", label: "Weight-bearing status", type: "select", options: ["Full", "Partial", "Non-weight-bearing"] },
      { name: "rehab", label: "Rehabilitation plan", type: "textarea" },
      { name: "reviewDate", label: "Follow-up date", type: "date" },
    ]} /><DepartmentTable title="Rehabilitation follow-up" columns={[{ key: "patient", label: "Patient" }, { key: "goal", label: "Mobility goal" }, { key: "session", label: "Next session" }, { key: "status", label: "Status" }]} rows={[
      { patient: "Marta Girma", goal: "Restore ankle range of motion", session: "2026-11-14", status: "Scheduled" },
      { patient: "Dawit Haile", goal: "Progress weight bearing after review", session: "2026-11-16", status: "Pending" },
    ]} /></div> },
    { id: "reports", label: "Reports", content: <ReportPanel department="Orthopedics" rows={orthopedicRows} /> },
  ];
  return <DepartmentFrame departmentId="orthopedics" title="Orthopedics" description="Orthopedic consultations, injuries and fractures, imaging reviews, treatment plans and rehabilitation follow-up." lead="Dr. Dawit Mengistu" metrics={metrics} tabs={tabs} />;
}

const teeth = [11, 12, 13, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25, 26, 27, 28, 31, 32, 33, 34, 35, 36, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48];
const dentalRows = patientRows([
  ["GHMS-07011", "Biruk Tesfaye", "Dental pain · tooth chart review", "Dr. Hana Tesfaye", "Active"],
  ["GHMS-07012", "Lensa Abera", "Preventive examination", "Dr. Hana Tesfaye", "Scheduled"],
  ["GHMS-07013", "Abebe Tessema", "Restoration follow-up", "Dr. Yonas Bekele", "Follow-up"],
]);

function DentistryWorkspace() {
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
  const [markedTeeth, setMarkedTeeth] = useState<number[]>([]);
  const metrics: DepartmentMetric[] = [
    { label: "Dental visits", value: "26", hint: "Synthetic daily count", icon: <Sparkles className="h-5 w-5" />, tone: "primary" },
    { label: "Procedures today", value: "11", hint: "Preview schedule", icon: <ClipboardList className="h-5 w-5" />, tone: "warning" },
    { label: "Urgent dental cases", value: "3", hint: "Triage for clinician review", icon: <AlertTriangle className="h-5 w-5" />, tone: "danger" },
    { label: "Chair utilization", value: "6 / 8", hint: "Demonstration rooms", icon: <Activity className="h-5 w-5" />, tone: "success" },
  ];
  const toggleTooth = (tooth: number) => setSelectedTeeth((current) => current.includes(tooth) ? current.filter((value) => value !== tooth) : [...current, tooth]);
  const saveToothStatus = () => {
    setMarkedTeeth((current) => [...new Set([...current, ...selectedTeeth])]);
    setSelectedTeeth([]);
  };
  const tabs: DepartmentTab[] = [
    { id: "overview", label: "Dashboard", content: <div className="grid gap-5 xl:grid-cols-2"><PatientList title="Dental patients" rows={dentalRows} /><DepartmentTable title="Procedure history" columns={[{ key: "patient", label: "Patient" }, { key: "procedure", label: "Procedure" }, { key: "date", label: "Date" }, { key: "clinician", label: "Clinician" }, { key: "status", label: "Status" }]} rows={[
      { patient: "Abebe Tessema", procedure: "Restoration", date: "2026-11-11", clinician: "Dr. Yonas Bekele", status: "Completed" },
      { patient: "Biruk Tesfaye", procedure: "Oral examination", date: "2026-11-12", clinician: "Dr. Hana Tesfaye", status: "Follow-up" },
    ]} /></div> },
    { id: "patients", label: "Dental records", content: <PatientList title="Dental patient records" rows={dentalRows} /> },
    { id: "examination", label: "Oral examination", content: <WorkflowForm title="Dental oral examination and diagnosis" submitLabel="Save examination" fields={[
      { name: "patient", label: "Dental patient", type: "select", options: PatientOptions() },
      { name: "complaint", label: "Dental complaint" },
      { name: "oralExam", label: "Oral examination findings", type: "textarea" },
      { name: "diagnosis", label: "Dental diagnosis" },
      { name: "tooth", label: "Tooth number (FDI)", type: "select", options: teeth.map(String) },
      { name: "plan", label: "Proposed dental treatment", type: "textarea" },
    ]} /> },
    { id: "tooth-chart", label: "Interactive tooth chart", content: <Card><CardHeader title="Adult dentition chart" subtitle="Select one or more teeth to attach to a synthetic examination; chart is not a substitute for clinical examination." /><div className="space-y-5 p-5"><div className="grid grid-cols-4 gap-2 sm:grid-cols-8">{teeth.map((tooth) => <button key={tooth} type="button" aria-pressed={selectedTeeth.includes(tooth)} aria-label={`Tooth ${tooth}${markedTeeth.includes(tooth) ? " marked" : ""}`} onClick={() => toggleTooth(tooth)} className={`min-h-12 rounded-lg border text-sm font-semibold ${selectedTeeth.includes(tooth) ? "border-primary-600 bg-primary-600 text-white" : markedTeeth.includes(tooth) ? "border-amber-400 bg-amber-100 text-amber-900" : "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"}`}>{tooth}</button>)}</div><p className="text-sm text-slate-600 dark:text-slate-300">Selected teeth: {selectedTeeth.length ? selectedTeeth.join(", ") : "none"}</p><Button type="button" onClick={saveToothStatus} disabled={!selectedTeeth.length}>Mark selected teeth for examination</Button>{markedTeeth.length ? <p role="status" className="text-sm text-success">Marked for examination: {markedTeeth.join(", ")}</p> : null}</div></Card> },
    { id: "treatment", label: "Dental treatment", content: <div className="space-y-5"><WorkflowForm title="Dental treatment / procedure record" submitLabel="Save dental treatment" fields={[
      { name: "patient", label: "Dental patient", type: "select", options: PatientOptions() },
      { name: "tooth", label: "Tooth / teeth", placeholder: selectedTeeth.length ? selectedTeeth.join(", ") : "FDI number(s)" },
      { name: "procedure", label: "Procedure", type: "select", options: ["Restoration", "Extraction", "Cleaning", "Root canal", "Other"] },
      { name: "anesthesia", label: "Anesthesia / materials", required: false },
      { name: "notes", label: "Procedure notes", type: "textarea" },
      { name: "followUp", label: "Follow-up date", type: "date", required: false },
    ]} /><DepartmentTable title="Dental procedure history" columns={[{ key: "patient", label: "Patient" }, { key: "tooth", label: "Tooth" }, { key: "procedure", label: "Procedure" }, { key: "date", label: "Date" }, { key: "status", label: "Status" }]} rows={[
      { patient: "Abebe Tessema", tooth: "36", procedure: "Restoration", date: "2026-11-11", status: "Completed" },
      { patient: "Biruk Tesfaye", tooth: "11", procedure: "Oral examination", date: "2026-11-12", status: "Reviewed" },
    ]} /></div> },
    { id: "reports", label: "Reports", content: <ReportPanel department="Dentistry" rows={dentalRows} /> },
  ];
  return <DepartmentFrame departmentId="dentistry" title="Dentistry" description="Dental records, oral examination, FDI tooth charting, diagnosis, treatment and procedure history." lead="Dr. Hana Tesfaye" metrics={metrics} tabs={tabs} />;
}

function SimpleTrendChart({
  data,
  dataKey,
  label,
  color,
  domain,
}: {
  data: Array<Record<string, string | number>>;
  dataKey: string;
  label: string;
  color: string;
  domain: [number, number];
}) {
  return (
    <div role="img" aria-label={`${label} trend chart`} className="h-56 w-full p-3">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis domain={domain} width={36} />
          <Tooltip />
          <Line type="monotone" dataKey={dataKey} name={label} stroke={color} strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

const eyeRows = patientRows([
  ["GHMS-08011", "Selam Bekele", "Reduced right-eye acuity · refraction", "Dr. Rahel Alemu", "Review"],
  ["GHMS-08012", "Abebe Tessema", "Pressure follow-up", "Dr. Rahel Alemu", "Scheduled"],
  ["GHMS-08013", "Marta Girma", "Post-procedure review", "Dr. Yonas Bekele", "Follow-up"],
]);

function OphthalmologyWorkspace() {
  const metrics: DepartmentMetric[] = [
    { label: "Eye examinations", value: "35", hint: "Synthetic daily count", icon: <Eye className="h-5 w-5" />, tone: "primary" },
    { label: "Imaging reviews", value: "7", hint: "Awaiting clinician review", icon: <ScanEye className="h-5 w-5" />, tone: "warning" },
    { label: "Pressure follow-ups", value: "5", hint: "Due this week", icon: <HeartPulse className="h-5 w-5" />, tone: "danger" },
    { label: "Clinicians available", value: "4", hint: "Demonstration roster", icon: <UsersRound className="h-5 w-5" />, tone: "success" },
  ];
  const tabs: DepartmentTab[] = [
    { id: "overview", label: "Dashboard", content: <div className="grid gap-5 xl:grid-cols-2"><PatientList title="Ophthalmology patients" rows={eyeRows} /><DepartmentTable title="Imaging reports" columns={[{ key: "patient", label: "Patient" }, { key: "study", label: "Imaging / report" }, { key: "date", label: "Date" }, { key: "status", label: "Status" }]} rows={[
      { patient: "Selam Bekele", study: "Retinal imaging report", date: "2026-11-12", status: "Review" },
      { patient: "Abebe Tessema", study: "Optic nerve assessment", date: "2026-11-10", status: "Reviewed" },
    ]} /></div> },
    { id: "patients", label: "Patient list", content: <PatientList title="Ophthalmology patient list" rows={eyeRows} /> },
    { id: "examination", label: "Eye examination", content: <WorkflowForm title="Eye examination and visual acuity" submitLabel="Save eye examination" fields={[
      { name: "patient", label: "Patient", type: "select", options: PatientOptions() },
      { name: "rightAcuity", label: "Visual acuity - right eye" },
      { name: "leftAcuity", label: "Visual acuity - left eye" },
      { name: "pressureRight", label: "Intraocular pressure - right (mmHg)", type: "number", min: 0, max: 80 },
      { name: "pressureLeft", label: "Intraocular pressure - left (mmHg)", type: "number", min: 0, max: 80 },
      { name: "anterior", label: "Anterior segment examination", type: "textarea" },
      { name: "fundus", label: "Fundus / clinical findings", type: "textarea" },
      { name: "diagnosis", label: "Assessment and diagnosis" },
      { name: "plan", label: "Treatment and follow-up plan", type: "textarea" },
    ]} /> },
    { id: "imaging", label: "Imaging reports", content: <div className="space-y-5"><DepartmentTable title="Ophthalmology imaging" columns={[{ key: "patient", label: "Patient" }, { key: "study", label: "Study" }, { key: "requestedBy", label: "Requested by" }, { key: "date", label: "Date" }, { key: "status", label: "Status" }]} rows={[
      { patient: "Selam Bekele", study: "Fundus photography", requestedBy: "Dr. Rahel Alemu", date: "2026-11-12", status: "Pending review" },
      { patient: "Abebe Tessema", study: "OCT report", requestedBy: "Dr. Rahel Alemu", date: "2026-11-10", status: "Reviewed" },
    ]} /><WorkflowForm title="Imaging report review" submitLabel="Save imaging report" fields={[
      { name: "patient", label: "Patient", type: "select", options: PatientOptions() },
      { name: "modality", label: "Imaging / report type", type: "select", options: ["Fundus photography", "OCT", "Visual field", "Ultrasound", "Other"] },
      { name: "findings", label: "Report findings", type: "textarea" },
      { name: "reviewer", label: "Reviewing clinician" },
      { name: "plan", label: "Recommended next step", type: "textarea" },
    ]} /></div> },
    { id: "treatment", label: "Treatment records", content: <div className="space-y-5"><WorkflowForm title="Ophthalmology treatment record" submitLabel="Save treatment record" fields={[
      { name: "patient", label: "Patient", type: "select", options: PatientOptions() },
      { name: "diagnosis", label: "Eye diagnosis" },
      { name: "treatment", label: "Treatment / medication instructions", type: "textarea" },
      { name: "procedure", label: "Procedure or intervention", required: false },
      { name: "followUp", label: "Follow-up date", type: "date" },
    ]} /><DepartmentTable title="Recent treatment history" columns={[{ key: "patient", label: "Patient" }, { key: "treatment", label: "Treatment" }, { key: "clinician", label: "Clinician" }, { key: "review", label: "Next review" }, { key: "status", label: "Status" }]} rows={[
      { patient: "Marta Girma", treatment: "Post-procedure care", clinician: "Dr. Yonas Bekele", review: "2026-11-15", status: "Follow-up" },
      { patient: "Abebe Tessema", treatment: "Pressure monitoring", clinician: "Dr. Rahel Alemu", review: "2026-11-18", status: "Scheduled" },
    ]} /></div> },
    { id: "reports", label: "Reports", content: <ReportPanel department="Ophthalmology" rows={eyeRows} /> },
  ];
  return <DepartmentFrame departmentId="ophthalmology" title="Ophthalmology" description="Eye examinations, visual acuity, intraocular pressure, imaging reports, treatment and follow-up." lead="Dr. Rahel Alemu" metrics={metrics} tabs={tabs} />;
}

const skinRows = patientRows([
  ["GHMS-09011", "Hana Alemu", "Eczema review · restricted image record", "Dr. Senait Fikre", "Follow-up"],
  ["GHMS-09012", "Yohannes Kebede", "Rash assessment", "Dr. Senait Fikre", "Active"],
  ["GHMS-09013", "Sara Alemu", "Dermatitis treatment review", "Dr. Tsion Getachew", "Scheduled"],
]);

function RestrictedDermImagePreview() {
  const [role, setRole] = useState("checking");
  const [showPreview, setShowPreview] = useState(false);
  useEffect(() => {
    setRole(authService.currentUser()?.role ?? "Physician");
  }, []);
  const canView = /dermat|physician|doctor|admin|clinician/i.test(role);
  if (role === "checking") return <Card role="status"><p className="p-5 text-sm text-slate-500">Checking access to restricted image preview...</p></Card>;
  if (!canView) return <Card role="status"><div className="flex items-start gap-3 p-5"><LockKeyhole className="h-5 w-5 text-amber-600" aria-hidden /><p className="text-sm">Restricted dermatology images are not available to your current role. Backend authorization is required in production.</p></div></Card>;
  return (
    <Card>
      <CardHeader title="Restricted clinical image preview" subtitle="Synthetic placeholder only; no real patient image is stored or displayed." />
      <div className="space-y-4 p-5">
        <Button type="button" variant="secondary" onClick={() => setShowPreview((visible) => !visible)} aria-expanded={showPreview}>{showPreview ? "Hide preview" : "Show synthetic preview"}</Button>
        {showPreview ? <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900"><ImageOff className="h-8 w-8" aria-hidden /><p className="text-sm">Restricted image placeholder - synthetic preview only</p></div> : <p className="text-sm text-slate-500">Preview is hidden until explicitly opened.</p>}
      </div>
    </Card>
  );
}

function DermatologyWorkspace() {
  const metrics: DepartmentMetric[] = [
    { label: "Dermatology visits", value: "31", hint: "Synthetic daily count", icon: <ScanEye className="h-5 w-5" />, tone: "primary" },
    { label: "Image reviews", value: "8", hint: "Access-controlled preview", icon: <LockKeyhole className="h-5 w-5" />, tone: "warning" },
    { label: "Treatment follow-ups", value: "12", hint: "Review due", icon: <CalendarDays className="h-5 w-5" />, tone: "success" },
    { label: "Cases requiring review", value: "4", hint: "Illustrative workload", icon: <AlertTriangle className="h-5 w-5" />, tone: "danger" },
  ];
  const tabs: DepartmentTab[] = [
    { id: "overview", label: "Dashboard", content: <div className="grid gap-5 xl:grid-cols-2"><PatientList title="Dermatology patient list" rows={skinRows} /><DepartmentTable title="Treatment and follow-up" columns={[{ key: "patient", label: "Patient" }, { key: "diagnosis", label: "Diagnosis" }, { key: "treatment", label: "Treatment plan" }, { key: "review", label: "Follow-up" }, { key: "status", label: "Status" }]} rows={[
      { patient: "Hana Alemu", diagnosis: "Eczema", treatment: "Skin care plan review", review: "2026-11-15", status: "Follow-up" },
      { patient: "Yohannes Kebede", diagnosis: "Rash under assessment", treatment: "Await clinician review", review: "2026-11-13", status: "Active" },
    ]} /></div> },
    { id: "patients", label: "Patient list", content: <PatientList title="Dermatology patients" rows={skinRows} /> },
    { id: "consultation", label: "Consultation", content: <WorkflowForm title="Dermatology consultation" submitLabel="Save dermatology consultation" fields={[
      { name: "patient", label: "Patient", type: "select", options: PatientOptions() },
      { name: "complaint", label: "Presenting skin concern", type: "textarea" },
      { name: "onset", label: "Onset / progression" },
      { name: "observations", label: "Clinical observations", type: "textarea" },
      { name: "distribution", label: "Site / distribution" },
      { name: "diagnosis", label: "Assessment / diagnosis" },
      { name: "plan", label: "Treatment and follow-up", type: "textarea" },
    ]} /> },
    { id: "images", label: "Restricted image preview", content: <div className="space-y-5"><RestrictedDermImagePreview /><DepartmentTable title="Restricted image index (metadata only)" subtitle="No sensitive image content is exposed in this synthetic list." columns={[{ key: "record", label: "Record" }, { key: "patient", label: "Patient identifier" }, { key: "type", label: "Image type" }, { key: "access", label: "Access" }, { key: "status", label: "Status" }]} rows={[
      { record: "IMG-D-102", patient: "GHMS-•••11", type: "Clinical image", access: "Role-restricted", status: "Available" },
      { record: "IMG-D-103", patient: "GHMS-•••12", type: "Clinical image", access: "Role-restricted", status: "Pending review" },
    ]} /></div> },
    { id: "treatment", label: "Treatment & follow-up", content: <div className="space-y-5"><WorkflowForm title="Dermatology treatment plan" submitLabel="Save dermatology treatment" fields={[
      { name: "patient", label: "Patient", type: "select", options: PatientOptions() },
      { name: "treatment", label: "Treatment instructions", type: "textarea" },
      { name: "response", label: "Response / observations", type: "textarea", required: false },
      { name: "reviewDate", label: "Follow-up date", type: "date" },
    ]} /><DepartmentTable title="Dermatology follow-up list" columns={[{ key: "patient", label: "Patient" }, { key: "reason", label: "Review reason" }, { key: "due", label: "Due date" }, { key: "clinician", label: "Clinician" }, { key: "status", label: "Status" }]} rows={[
      { patient: "Hana Alemu", reason: "Eczema response review", due: "2026-11-15", clinician: "Dr. Senait Fikre", status: "Scheduled" },
      { patient: "Sara Alemu", reason: "Dermatitis review", due: "2026-11-17", clinician: "Dr. Tsion Getachew", status: "Pending" },
    ]} /></div> },
    { id: "reports", label: "Reports", content: <ReportPanel department="Dermatology" rows={skinRows} /> },
  ];
  return <DepartmentFrame departmentId="dermatology" title="Dermatology" description="Dermatology consultations, restricted clinical image previews, diagnosis, treatment and follow-up." lead="Dr. Senait Fikre" metrics={metrics} tabs={tabs} />;
}

const mentalHealthRows = patientRows([
  ["GHMS-10011", "Confidential record • 011", "Follow-up assessment due", "Mental health team", "Follow-up"],
  ["GHMS-10012", "Confidential record • 012", "Treatment plan review", "Mental health team", "Scheduled"],
  ["GHMS-10013", "Confidential record • 013", "Initial assessment", "Mental health team", "Active"],
]);

function PsychiatryWorkspace() {
  const [role, setRole] = useState("checking");
  useEffect(() => {
    setRole(authService.currentUser()?.role ?? "Physician");
  }, []);
  const canView = /psychiat|mental.health|admin/i.test(role);
  const metrics: DepartmentMetric[] = [
    { label: "Scheduled reviews", value: "16", hint: "Synthetic clinic count", icon: <Brain className="h-5 w-5" />, tone: "primary" },
    { label: "Follow-ups due", value: "7", hint: "Confidential workload", icon: <CalendarDays className="h-5 w-5" />, tone: "warning" },
    { label: "Care plans", value: "22", hint: "Synthetic active plans", icon: <ClipboardList className="h-5 w-5" />, tone: "success" },
    { label: "Team availability", value: "5", hint: "Demonstration roster", icon: <UsersRound className="h-5 w-5" />, tone: "primary" },
  ];
  const restrictedMessage = role === "checking"
    ? "Checking confidential mental health access..."
    : `Confidential mental health records are restricted for your current role (${role}). Contact an authorized mental health team member. Backend authorization must enforce access in production.`;
  const tabs: DepartmentTab[] = [
    { id: "overview", label: "Confidential dashboard", content: canView ? <div className="grid gap-5 xl:grid-cols-2"><PatientList title="Confidential patient list" rows={mentalHealthRows} /><DepartmentTable title="Follow-up worklist" columns={[{ key: "record", label: "Confidential identifier" }, { key: "review", label: "Review type" }, { key: "team", label: "Care team" }, { key: "status", label: "Status" }]} rows={[
      { record: "Confidential record • 011", review: "Clinical review", team: "Mental health team", status: "Follow-up" },
      { record: "Confidential record • 012", review: "Plan review", team: "Mental health team", status: "Scheduled" },
    ]} />{!canView ? <Card role="status"><div className="flex items-start gap-3 p-5"><LockKeyhole className="h-5 w-5 text-amber-600" aria-hidden /><p className="text-sm">{restrictedMessage}</p></div></Card> : null}</div> : <Card role="status"><div className="flex items-start gap-3 p-5"><LockKeyhole className="h-5 w-5 text-amber-600" aria-hidden /><p className="text-sm">{restrictedMessage}</p></div></Card> },
    { id: "patients", label: "Confidential patient list", content: canView ? <PatientList title="Restricted mental health patient list" rows={mentalHealthRows} /> : <Card role="status"><p className="p-5 text-sm">{restrictedMessage}</p></Card> },
    { id: "assessment", label: "Assessment", content: canView ? <WorkflowForm title="Mental health assessment" description="Capture only necessary clinical information; follow local privacy and safety procedures." submitLabel="Save mental health assessment" fields={[
      { name: "patient", label: "Confidential patient record", type: "select", options: PatientOptions() },
      { name: "reason", label: "Reason for assessment", type: "textarea" },
      { name: "history", label: "Relevant history", type: "textarea" },
      { name: "mentalState", label: "Mental state examination", type: "textarea" },
      { name: "riskReview", label: "Risk and safety review", type: "textarea" },
      { name: "assessment", label: "Clinical assessment", type: "textarea" },
    ]} /> : <Card role="status"><p className="p-5 text-sm">{restrictedMessage}</p></Card> },
    { id: "treatment", label: "Treatment plan", content: canView ? <div className="space-y-5"><WorkflowForm title="Confidential mental health treatment plan" submitLabel="Save mental health plan" fields={[
      { name: "patient", label: "Confidential patient record", type: "select", options: PatientOptions() },
      { name: "goals", label: "Care goals", type: "textarea" },
      { name: "interventions", label: "Treatment / support plan", type: "textarea" },
      { name: "medicationReview", label: "Medication review", type: "textarea", required: false },
      { name: "safetyPlan", label: "Safety and crisis plan", type: "textarea" },
      { name: "followUp", label: "Follow-up date", type: "date" },
    ]} /><DepartmentTable title="Confidential follow-up schedule" columns={[{ key: "record", label: "Confidential identifier" }, { key: "review", label: "Review" }, { key: "date", label: "Date" }, { key: "status", label: "Status" }]} rows={[
      { record: "Confidential record • 011", review: "Care plan review", date: "2026-11-16", status: "Scheduled" },
      { record: "Confidential record • 013", review: "Initial follow-up", date: "2026-11-18", status: "Pending" },
    ]} /></div> : <Card role="status"><p className="p-5 text-sm">{restrictedMessage}</p></Card> },
    { id: "reports", label: "Restricted reports", content: canView ? <ReportPanel department="Psychiatry" rows={mentalHealthRows} /> : <Card role="status"><p className="p-5 text-sm">{restrictedMessage}</p></Card> },
  ];
  if (!canView) {
    return (
      <>
        <PageHeader title="Psychiatry & Mental Health" description="Confidential specialist department." />
        <DepartmentNavigation activeId="psychiatry" />
        <SyntheticDataNotice><span> Confidential patient lists and workflows are hidden until an authorized mental health role is confirmed.</span></SyntheticDataNotice>
        <Card role="status"><div className="flex items-start gap-3 p-5"><LockKeyhole className="h-5 w-5 text-amber-600" aria-hidden /><p className="text-sm">{restrictedMessage}</p></div></Card>
      </>
    );
  }
  return <DepartmentFrame departmentId="psychiatry" title="Psychiatry & Mental Health" description="Restricted mental health assessments, confidential care plans and follow-up." lead="Mental Health Clinical Team" metrics={metrics} tabs={tabs} />;
}

const icuRows = patientRows([
  ["GHMS-11011", "ICU bed A-01 · masked", "Ventilatory support · monitoring", "ICU team", "Critical"],
  ["GHMS-11012", "ICU bed A-02 · masked", "Post-operative observation", "ICU team", "Monitoring"],
  ["GHMS-11013", "ICU bed B-01 · masked", "Sepsis care plan", "ICU team", "Active"],
]);

const icuTrend = [
  { time: "06:00", heartRate: 92, oxygen: 95 },
  { time: "07:00", heartRate: 88, oxygen: 96 },
  { time: "08:00", heartRate: 84, oxygen: 97 },
  { time: "09:00", heartRate: 86, oxygen: 96 },
  { time: "10:00", heartRate: 82, oxygen: 97 },
];

function IcuWorkspace() {
  const metrics: DepartmentMetric[] = [
    { label: "Occupied beds", value: "18 / 22", hint: "Synthetic occupancy", icon: <BedDouble className="h-5 w-5" />, tone: "danger" },
    { label: "High-priority monitoring", value: "4", hint: "Clinical review as indicated", icon: <HeartPulse className="h-5 w-5" />, tone: "warning" },
    { label: "Nursing observations due", value: "9", hint: "Demonstration task list", icon: <Activity className="h-5 w-5" />, tone: "primary" },
    { label: "Available equipment", value: "7", hint: "Illustrative inventory", icon: <MonitorSmartphone className="h-5 w-5" />, tone: "success" },
  ];
  const tabs: DepartmentTab[] = [
    { id: "overview", label: "ICU dashboard", content: <div className="space-y-5"><div className="grid gap-5 md:grid-cols-2"><Card><CardHeader title="Heart rate monitoring" subtitle="Synthetic values; not connected to bedside devices." /><SimpleTrendChart data={icuTrend} dataKey="heartRate" label="Heart rate (bpm)" color="#dc2626" domain={[50, 140]} /></Card><Card><CardHeader title="Oxygen saturation" subtitle="Synthetic observations for interface preview only." /><SimpleTrendChart data={icuTrend} dataKey="oxygen" label="SpO2 (%)" color="#2563eb" domain={[80, 100]} /></Card></div><div className="grid gap-5 xl:grid-cols-2"><PatientList title="Masked ICU bed list" rows={icuRows} /><DepartmentTable title="Equipment assignment" columns={[{ key: "bed", label: "Bed" }, { key: "equipment", label: "Equipment" }, { key: "checked", label: "Last check" }, { key: "status", label: "Status" }]} rows={[
      { bed: "A-01", equipment: "Ventilator V-04", checked: "09:00", status: "Assigned" },
      { bed: "A-02", equipment: "Monitor M-11", checked: "08:50", status: "Assigned" },
      { bed: "B-03", equipment: "Infusion pump P-02", checked: "08:30", status: "Available" },
    ]} /></div></div> },
    { id: "patients", label: "Patient monitoring", content: <div className="space-y-5"><PatientList title="Masked ICU patient monitoring list" rows={icuRows} /><DepartmentTable title="Recent vital observations" columns={[{ key: "bed", label: "Bed / identifier" }, { key: "time", label: "Time" }, { key: "heartRate", label: "Heart rate" }, { key: "bloodPressure", label: "Blood pressure" }, { key: "oxygen", label: "SpO2" }, { key: "status", label: "Status" }]} rows={[
      { bed: "A-01", time: "09:00", heartRate: "86 bpm", bloodPressure: "118/76", oxygen: "96%", status: "Reviewed" },
      { bed: "A-02", time: "08:50", heartRate: "78 bpm", bloodPressure: "122/80", oxygen: "98%", status: "Stable" },
    ]} /><WorkflowForm title="ICU patient observation" submitLabel="Record observation" fields={[
      { name: "bed", label: "Bed / masked record", type: "select", options: ["A-01", "A-02", "B-01"] },
      { name: "time", label: "Observation time", type: "time" },
      { name: "vitals", label: "Vital signs", placeholder: "BP, HR, RR, temperature, SpO2" },
      { name: "nursingNotes", label: "Nursing observations", type: "textarea" },
      { name: "escalation", label: "Escalation / response", type: "textarea", required: false },
    ]} /></div> },
    { id: "nursing", label: "Nursing & medication", content: <div className="space-y-5"><WorkflowForm title="ICU nursing observation" submitLabel="Save nursing observation" fields={[
      { name: "bed", label: "Bed / masked record", type: "select", options: ["A-01", "A-02", "B-01"] },
      { name: "observation", label: "Nursing observations", type: "textarea" },
      { name: "care", label: "Care plan update", type: "textarea" },
      { name: "handover", label: "Shift handover notes", type: "textarea" },
    ]} /><WorkflowForm title="Medication administration record" submitLabel="Record medication administration" fields={[
      { name: "bed", label: "Bed / masked record", type: "select", options: ["A-01", "A-02", "B-01"] },
      { name: "medication", label: "Medication" },
      { name: "dose", label: "Dose" },
      { name: "route", label: "Route", type: "select", options: ["Oral", "IV", "IM", "Other"] },
      { name: "time", label: "Administration time", type: "datetime-local" },
      { name: "administeredBy", label: "Administered by" },
    ]} /></div> },
    { id: "equipment", label: "Equipment", content: <div className="space-y-5"><DepartmentTable title="ICU equipment inventory" columns={[{ key: "equipment", label: "Equipment" }, { key: "asset", label: "Asset ID" }, { key: "location", label: "Location" }, { key: "checked", label: "Last safety check" }, { key: "status", label: "Status" }]} rows={[
      { equipment: "Ventilator", asset: "V-04", location: "Bed A-01", checked: "2026-11-12 09:00", status: "Assigned" },
      { equipment: "Patient monitor", asset: "M-11", location: "Bed A-02", checked: "2026-11-12 08:50", status: "Assigned" },
      { equipment: "Infusion pump", asset: "P-02", location: "Equipment bay", checked: "2026-11-12 08:30", status: "Available" },
    ]} /><WorkflowForm title="Equipment assignment" submitLabel="Save equipment assignment" fields={[
      { name: "equipment", label: "Equipment", type: "select", options: ["Ventilator V-04", "Monitor M-11", "Infusion pump P-02"] },
      { name: "bed", label: "Assign to bed", type: "select", options: ["A-01", "A-02", "B-01", "Available"] },
      { name: "safetyCheck", label: "Safety check / notes", type: "textarea" },
    ]} /></div> },
    { id: "admission", label: "Admission & transfer", content: <div className="space-y-5"><DepartmentTable title="ICU admissions and transfers" columns={[{ key: "record", label: "Masked identifier" }, { key: "source", label: "Source" }, { key: "destination", label: "Destination" }, { key: "date", label: "Date" }, { key: "status", label: "Status" }]} rows={[
      { record: "GHMS-•••11", source: "Emergency", destination: "ICU A-01", date: "2026-11-12", status: "Admitted" },
      { record: "GHMS-•••12", source: "Recovery", destination: "ICU A-02", date: "2026-11-12", status: "Monitoring" },
    ]} /><WorkflowForm title="ICU admission / transfer" submitLabel="Record ICU disposition" fields={[
      { name: "record", label: "Masked patient identifier" },
      { name: "action", label: "Disposition", type: "select", options: ["Admission", "Transfer to ICU", "Transfer from ICU"] },
      { name: "source", label: "Sending department / ward" },
      { name: "destination", label: "Receiving bed / department" },
      { name: "handover", label: "Clinical handover", type: "textarea" },
    ]} /></div> },
    { id: "reports", label: "Reports", content: <ReportPanel department="ICU" rows={icuRows} /> },
  ];
  return <DepartmentFrame departmentId="icu" title="Intensive Care Unit" description="Masked patient monitoring, vital sign trends, nursing observations, medication administration, equipment and transfer workflows." lead="ICU Clinical Team" metrics={metrics} tabs={tabs} />;
}

const physioRows = patientRows([
  ["GHMS-12011", "Marta Girma", "Post-injury mobility · gait training", "Sr. Rahel Getachew", "Active"],
  ["GHMS-12012", "Dawit Haile", "Post-operative rehabilitation", "Sr. Rahel Getachew", "Scheduled"],
  ["GHMS-12013", "Hana Alemu", "Shoulder range-of-motion plan", "Sr. Yonas Bekele", "Follow-up"],
]);

function PhysiotherapyWorkspace() {
  const metrics: DepartmentMetric[] = [
    { label: "Active rehabilitation plans", value: "28", hint: "Synthetic department count", icon: <Activity className="h-5 w-5" />, tone: "primary" },
    { label: "Therapy sessions today", value: "19", hint: "Demonstration schedule", icon: <CalendarDays className="h-5 w-5" />, tone: "success" },
    { label: "Progress reviews due", value: "6", hint: "Next review window", icon: <ClipboardList className="h-5 w-5" />, tone: "warning" },
    { label: "Referral queue", value: "4", hint: "Awaiting assessment", icon: <UsersRound className="h-5 w-5" />, tone: "danger" },
  ];
  const tabs: DepartmentTab[] = [
    { id: "overview", label: "Dashboard", content: <div className="grid gap-5 xl:grid-cols-2"><PatientList title="Rehabilitation patients" rows={physioRows} /><DepartmentTable title="Therapy session schedule" columns={[{ key: "time", label: "Time" }, { key: "patient", label: "Patient" }, { key: "therapy", label: "Therapy focus" }, { key: "therapist", label: "Therapist" }, { key: "status", label: "Status" }]} rows={[
      { time: "09:00", patient: "Marta Girma", therapy: "Gait training", therapist: "Sr. Rahel Getachew", status: "Scheduled" },
      { time: "10:30", patient: "Dawit Haile", therapy: "Post-op mobility", therapist: "Sr. Rahel Getachew", status: "Scheduled" },
    ]} /></div> },
    { id: "patients", label: "Rehabilitation patients", content: <PatientList title="Physiotherapy patient list" rows={physioRows} /> },
    { id: "assessment", label: "Initial assessment", content: <WorkflowForm title="Physiotherapy initial assessment" submitLabel="Save initial assessment" fields={[
      { name: "patient", label: "Patient", type: "select", options: PatientOptions() },
      { name: "referral", label: "Referral diagnosis / reason" },
      { name: "history", label: "Relevant history", type: "textarea" },
      { name: "function", label: "Functional and mobility assessment", type: "textarea" },
      { name: "pain", label: "Pain score (0-10)", type: "number", min: 0, max: 10 },
      { name: "goals", label: "Patient-centered goals", type: "textarea" },
      { name: "plan", label: "Initial therapy plan", type: "textarea" },
    ]} /> },
    { id: "plan", label: "Treatment plans", content: <div className="space-y-5"><WorkflowForm title="Rehabilitation treatment plan" submitLabel="Save therapy plan" fields={[
      { name: "patient", label: "Patient", type: "select", options: PatientOptions() },
      { name: "goals", label: "Functional goals", type: "textarea" },
      { name: "interventions", label: "Therapy interventions and frequency", type: "textarea" },
      { name: "precautions", label: "Precautions / restrictions", type: "textarea", required: false },
      { name: "review", label: "Progress review date", type: "date" },
    ]} /><DepartmentTable title="Active rehabilitation plans" columns={[{ key: "patient", label: "Patient" }, { key: "goal", label: "Functional goal" }, { key: "intervention", label: "Intervention" }, { key: "review", label: "Next review" }, { key: "status", label: "Status" }]} rows={[
      { patient: "Marta Girma", goal: "Independent gait", intervention: "Gait and balance training", review: "2026-11-16", status: "Active" },
      { patient: "Dawit Haile", goal: "Safe mobility post-op", intervention: "Strength and mobility", review: "2026-11-17", status: "Active" },
    ]} /></div> },
    { id: "sessions", label: "Therapy sessions", content: <div className="space-y-5"><DepartmentTable title="Therapy session records" columns={[{ key: "patient", label: "Patient" }, { key: "date", label: "Session date" }, { key: "focus", label: "Session focus" }, { key: "response", label: "Response" }, { key: "status", label: "Status" }]} rows={[
      { patient: "Marta Girma", date: "2026-11-12", focus: "Gait training", response: "Session completed", status: "Completed" },
      { patient: "Dawit Haile", date: "2026-11-13", focus: "Mobility review", response: "Scheduled", status: "Scheduled" },
    ]} /><WorkflowForm title="Record therapy session" submitLabel="Save therapy session" fields={[
      { name: "patient", label: "Patient", type: "select", options: PatientOptions() },
      { name: "date", label: "Session date", type: "date" },
      { name: "intervention", label: "Therapy delivered", type: "textarea" },
      { name: "response", label: "Patient response / progress", type: "textarea" },
      { name: "nextSession", label: "Next session date", type: "date" },
    ]} /></div> },
    { id: "progress", label: "Progress & follow-up", content: <div className="space-y-5"><DepartmentTable title="Progress and follow-up records" columns={[{ key: "patient", label: "Patient" }, { key: "goal", label: "Goal progress" }, { key: "barrier", label: "Barrier / support" }, { key: "due", label: "Follow-up" }, { key: "status", label: "Status" }]} rows={[
      { patient: "Marta Girma", goal: "Improved assisted gait", barrier: "Continue supervised sessions", due: "2026-11-16", status: "Progressing" },
      { patient: "Hana Alemu", goal: "Shoulder ROM review", barrier: "Home exercise plan", due: "2026-11-18", status: "Review" },
    ]} /><WorkflowForm title="Therapy progress review" submitLabel="Save progress review" fields={[
      { name: "patient", label: "Patient", type: "select", options: PatientOptions() },
      { name: "progress", label: "Progress toward goals", type: "textarea" },
      { name: "measurements", label: "Functional measurements", type: "textarea" },
      { name: "barriers", label: "Barriers and supports", type: "textarea", required: false },
      { name: "nextPlan", label: "Updated plan / follow-up", type: "textarea" },
    ]} /></div> },
    { id: "reports", label: "Reports", content: <ReportPanel department="Physiotherapy" rows={physioRows} /> },
  ];
  return <DepartmentFrame departmentId="physiotherapy" title="Physiotherapy" description="Rehabilitation assessment, individualized therapy plans, treatment sessions, progress notes and follow-up." lead="Sr. Rahel Getachew" metrics={metrics} tabs={tabs} />;
}

export function DepartmentWorkflowWorkspaceScreen({ departmentId }: { departmentId: DepartmentId }) {
  switch (departmentId) {
    case "emergency":
      return <EmergencyDepartmentScreen />;
    case "internal-medicine":
      return <InternalMedicineWorkspace />;
    case "surgery":
      return <SurgeryWorkspace />;
    case "pediatrics":
      return <PediatricsWorkspace />;
    case "gynecology-obstetrics":
      return <GynecologyObstetricsWorkspace />;
    case "orthopedics":
      return <OrthopedicsWorkspace />;
    case "dentistry":
      return <DentistryWorkspace />;
    case "ophthalmology":
      return <OphthalmologyWorkspace />;
    case "dermatology":
      return <DermatologyWorkspace />;
    case "psychiatry":
      return <PsychiatryWorkspace />;
    case "icu":
      return <IcuWorkspace />;
    case "physiotherapy":
      return <PhysiotherapyWorkspace />;
  }
}

