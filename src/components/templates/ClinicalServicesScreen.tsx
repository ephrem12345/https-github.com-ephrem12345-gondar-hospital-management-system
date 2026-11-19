"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  ClipboardList,
  FileCheck2,
  FilePlus2,
  HeartPulse,
  History,
  MessageSquare,
  Pill,
  Printer,
  Save,
  Search,
  ShieldAlert,
  Stethoscope,
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
import { Card, CardHeader } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import {
  clinicalAllergySchema,
  clinicalConsultationDraftSchema,
  clinicalDiagnosisSchema,
  clinicalReferralSchema,
  clinicalTreatmentPlanSchema,
  clinicalVitalSignsSchema,
  finalizedConsultationSchema,
  nursingNoteSchema,
} from "@/validation/schemas";
import type { ClinicalRecordStatus } from "@/services/clinical-records";

type ClinicalSection =
  | "overview"
  | "consultation"
  | "nursing"
  | "vitals"
  | "diagnoses"
  | "allergies"
  | "treatment"
  | "referrals"
  | "timeline";

interface PatientOption {
  id: string;
  name: string;
  department: string;
}

interface ClinicalTimelineItem {
  id: string;
  patientId: string;
  patient: string;
  type: string;
  date: string;
  clinician: string;
  summary: string;
  status: "Draft" | "Finalized" | "Recorded";
}

interface AllergyRecord {
  patientId: string;
  patient: string;
  allergy: string;
  reaction: string;
  severity: "Mild" | "Moderate" | "Severe";
  verification: "Verified" | "Unverified";
  date: string;
}

const patients: PatientOption[] = [
  { id: "GHMS-01042", name: "Selam Bekele", department: "Internal Medicine" },
  { id: "GHMS-01043", name: "Kebede Assefa", department: "Surgery" },
  { id: "GHMS-01044", name: "Meron Ayele", department: "Internal Medicine" },
  { id: "GHMS-01045", name: "Tesfaye Tadesse", department: "Pediatrics" },
  { id: "GHMS-01046", name: "Hanna Girma", department: "Gynecology & Obstetrics" },
];

const nurses = [
  { name: "Sr. Tigist Alemu", unit: "Internal Medicine", shift: "08:00-16:00", assigned: 12 },
  { name: "Sr. Bontu Kebede", unit: "Surgery", shift: "08:00-16:00", assigned: 9 },
  { name: "Sr. Hiwot Adane", unit: "Pediatrics", shift: "16:00-00:00", assigned: 14 },
];

const nursingAssignments = [
  { patientId: "GHMS-01042", patient: "Selam Bekele", ward: "Internal Medicine", nurse: "Sr. Tigist Alemu", status: "Observation due" },
  { patientId: "GHMS-01043", patient: "Kebede Assefa", ward: "Surgery", nurse: "Sr. Bontu Kebede", status: "Stable" },
  { patientId: "GHMS-01044", patient: "Meron Ayele", ward: "Internal Medicine", nurse: "Sr. Tigist Alemu", status: "Monitoring" },
  { patientId: "GHMS-01045", patient: "Tesfaye Tadesse", ward: "Pediatrics", nurse: "Sr. Hiwot Adane", status: "Follow-up due" },
];

const initialAllergies: AllergyRecord[] = [
  { patientId: "GHMS-01042", patient: "Selam Bekele", allergy: "Penicillin", reaction: "Urticaria", severity: "Severe", verification: "Verified", date: "2026-11-08" },
  { patientId: "GHMS-01044", patient: "Meron Ayele", allergy: "Latex", reaction: "Contact dermatitis", severity: "Moderate", verification: "Verified", date: "2026-11-05" },
  { patientId: "GHMS-01045", patient: "Tesfaye Tadesse", allergy: "Peanuts", reaction: "Rash", severity: "Mild", verification: "Unverified", date: "2026-11-03" },
];

const initialTimeline: ClinicalTimelineItem[] = [
  { id: "tl-1", patientId: "GHMS-01042", patient: "Selam Bekele", type: "Consultation", date: "2026-11-12 09:20", clinician: "Dr. Selam Girma", summary: "Blood pressure follow-up; stable on current plan.", status: "Finalized" },
  { id: "tl-2", patientId: "GHMS-01042", patient: "Selam Bekele", type: "Diagnosis", date: "2026-11-12 09:18", clinician: "Dr. Selam Girma", summary: "Essential hypertension (I10).", status: "Recorded" },
  { id: "tl-3", patientId: "GHMS-01043", patient: "Kebede Assefa", type: "Laboratory result", date: "2026-11-11 14:05", clinician: "Laboratory", summary: "Complete blood count reviewed.", status: "Finalized" },
  { id: "tl-4", patientId: "GHMS-01044", patient: "Meron Ayele", type: "Admission", date: "2026-11-10 18:30", clinician: "Internal Medicine", summary: "Ward admission; discharge summary pending.", status: "Recorded" },
  { id: "tl-5", patientId: "GHMS-01045", patient: "Tesfaye Tadesse", type: "Prescription", date: "2026-11-09 11:10", clinician: "Dr. Bereket Assefa", summary: "Medication plan issued; review in one week.", status: "Finalized" },
  { id: "tl-6", patientId: "GHMS-01043", patient: "Kebede Assefa", type: "Discharge summary", date: "2026-11-08 10:25", clinician: "Dr. Mulu Alemu", summary: "Discharged with follow-up instructions and return precautions.", status: "Finalized" },
];

const trend = [
  { day: "Nov 06", heartRate: 82, temperature: 36.8, oxygen: 97 },
  { day: "Nov 07", heartRate: 80, temperature: 36.7, oxygen: 98 },
  { day: "Nov 08", heartRate: 84, temperature: 37.0, oxygen: 97 },
  { day: "Nov 09", heartRate: 79, temperature: 36.9, oxygen: 98 },
  { day: "Nov 10", heartRate: 81, temperature: 36.8, oxygen: 97 },
  { day: "Nov 11", heartRate: 78, temperature: 36.7, oxygen: 98 },
  { day: "Nov 12", heartRate: 78, temperature: 36.8, oxygen: 98 },
];

const sections: Array<{ id: ClinicalSection; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "consultation", label: "Consultation" },
  { id: "nursing", label: "Nursing" },
  { id: "vitals", label: "Vital signs" },
  { id: "diagnoses", label: "Diagnoses" },
  { id: "allergies", label: "Allergies" },
  { id: "treatment", label: "Treatment plan" },
  { id: "referrals", label: "Referrals" },
  { id: "timeline", label: "Patient timeline" },
];

const departments = [
  "Internal Medicine",
  "Emergency",
  "Surgery",
  "Pediatrics",
  "Gynecology & Obstetrics",
  "Orthopedics",
  "Radiology",
  "Cardiology",
];

function localDate(): string {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
}

function patientName(patientId: string): string {
  return patients.find((patient) => patient.id === patientId)?.name ?? "Selected patient";
}

function fieldErrors(error: { issues: Array<{ message: string }> }): string {
  return error.issues.map((issue) => issue.message).join(" ");
}

function ClinicalField({
  name,
  label,
  type = "text",
  required = false,
  placeholder,
  options,
  rows = 3,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  rows?: number;
}) {
  const id = `clinical-${name}`;
  let control: ReactNode;
  if (options) {
    control = (
      <select id={id} name={name} aria-label={label} defaultValue="" className="ghms-input" required={required}>
        <option value="">Select...</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    );
  } else if (type === "textarea") {
    control = <textarea id={id} name={name} aria-label={label} rows={rows} className="ghms-input" placeholder={placeholder} required={required} />;
  } else {
    control = <input id={id} name={name} aria-label={label} type={type} step={type === "number" ? "any" : undefined} className="ghms-input" placeholder={placeholder} required={required} />;
  }
  return <FormField label={label} htmlFor={id} required={required}>{control}</FormField>;
}

function PatientField() {
  const id = "clinical-patient-id";
  return (
    <FormField label="Patient" htmlFor={id} required>
      <select id={id} name="patientId" aria-label="Select patient" defaultValue="" className="ghms-input" required>
        <option value="">Select a patient</option>
        {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name} ({patient.id})</option>)}
      </select>
    </FormField>
  );
}

function FormNotice({ message }: { message: string }) {
  return message ? <p role="alert" className="rounded-lg bg-light-blue px-3 py-2 text-sm text-primary-800 dark:bg-primary/15 dark:text-primary-200">{message}</p> : null;
}

function SectionTitle({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

function DemoDataNotice() {
  return (
    <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p><strong>Demonstration data only.</strong> Role-based controls are interface guidance, not authorization. A production backend must enforce permissions, access logging, and patient consent rules.</p>
    </div>
  );
}

export function ClinicalServicesScreen({
  title,
  initialSection = "overview",
}: {
  title: string;
  initialSection?: ClinicalSection;
}) {
  const [activeSection, setActiveSection] = useState<ClinicalSection>(initialSection);
  const [role, setRole] = useState("checking");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [timeline, setTimeline] = useState(initialTimeline);
  const [allergies, setAllergies] = useState(initialAllergies);
  const [selectedPatient, setSelectedPatient] = useState("GHMS-01042");
  const [errors, setErrors] = useState("");

  useEffect(() => {
    setRole(authService.currentUser()?.role ?? "Physician");
  }, []);

  const normalizedRole = role.toLowerCase();
  const canViewClinical = /physician|doctor|nurse|admin|clinician/.test(normalizedRole);
  const canWriteClinical = /physician|doctor|admin|clinician/.test(normalizedRole);
  const canWriteNursing = /nurse|admin/.test(normalizedRole);
  const canRecordVitals = canViewClinical;
  const visiblePatients = useMemo(
    () => patients.filter((patient) => `${patient.name} ${patient.id} ${patient.department}`.toLowerCase().includes(query.toLowerCase())),
    [query],
  );
  const visibleTimeline = useMemo(
    () => timeline.filter((item) => !selectedPatient || item.patientId === selectedPatient).slice().sort((a, b) => b.date.localeCompare(a.date)),
    [timeline, selectedPatient],
  );

  const addTimeline = (type: string, patientId: string, summary: string, status: ClinicalRecordStatus | "Recorded" = "Recorded") => {
    const now = new Date();
    const timestamp = `${localDate()} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const timelineStatus = status === "draft" ? "Draft" : status === "finalized" ? "Finalized" : status;
    setTimeline((current) => [{
      id: `tl-${Date.now()}`,
      patientId,
      patient: patientName(patientId),
      type,
      date: timestamp,
      clinician: authService.currentUser()?.name ?? "Clinical staff",
      summary,
      status: timelineStatus,
    }, ...current]);
  };

  const validateForm = <T,>(
    form: HTMLFormElement,
    schema: { safeParse: (data: unknown) => { success: true; data: T } | { success: false; error: { issues: Array<{ message: string }> } } },
  ): T | null => {
    setNotice("");
    const result = schema.safeParse(Object.fromEntries(new FormData(form).entries()));
    if (!result.success) {
      setErrors(fieldErrors(result.error));
      return null;
    }
    setErrors("");
    return result.data;
  };

  const validate = <T,>(
    event: FormEvent<HTMLFormElement>,
    schema: { safeParse: (data: unknown) => { success: true; data: T } | { success: false; error: { issues: Array<{ message: string }> } } },
  ): T | null => {
    event.preventDefault();
    return validateForm(event.currentTarget, schema);
  };

  const addNotice = (message: string) => {
    setErrors("");
    setNotice(message);
  };

  const submitConsultation = (form: HTMLFormElement, status: ClinicalRecordStatus) => {
    const schema = status === "finalized" ? finalizedConsultationSchema : clinicalConsultationDraftSchema;
    const data = validateForm(form, schema);
    if (!data) return;
    const patientId = data.patientId;
    setSelectedPatient(patientId);
    addTimeline("Consultation", patientId, data.diagnosis || data.presentingComplaint || "Consultation note saved.", status);
    addNotice(status === "draft" ? "Consultation saved as a draft in this demo session." : "Consultation finalized in this demo session.");
  };

  const submitNursing = (event: FormEvent<HTMLFormElement>) => {
    if (!canWriteNursing) return;
    const data = validate(event, nursingNoteSchema);
    if (!data) return;
    setSelectedPatient(data.patientId);
    addTimeline("Nursing note", data.patientId, data.nursingAssessment);
    addNotice("Nursing assessment and handover saved in this demo session.");
  };

  const submitVitals = (event: FormEvent<HTMLFormElement>) => {
    if (!canRecordVitals) return;
    const data = validate(event, clinicalVitalSignsSchema);
    if (!data) return;
    setSelectedPatient(data.patientId);
    addTimeline("Vital signs", data.patientId, `BP ${data.bloodPressure}; HR ${data.heartRate} bpm; SpO2 ${data.oxygenSaturation}%.`);
    addNotice("Vital signs recorded in this demo session.");
  };

  const submitDiagnosis = (event: FormEvent<HTMLFormElement>) => {
    if (!canWriteClinical) return;
    const data = validate(event, clinicalDiagnosisSchema);
    if (!data) return;
    setSelectedPatient(data.patientId);
    addTimeline("Diagnosis", data.patientId, `${data.primary === "yes" ? "Primary: " : ""}${data.diagnosis}${data.diagnosisCode ? ` (${data.diagnosisCode})` : ""}.`);
    addNotice("Diagnosis recorded in this demo session.");
  };

  const submitAllergy = (event: FormEvent<HTMLFormElement>) => {
    if (!canWriteClinical) return;
    const data = validate(event, clinicalAllergySchema);
    if (!data) return;
    setAllergies((current) => [{
      patientId: data.patientId,
      patient: patientName(data.patientId),
      allergy: data.allergyName,
      reaction: data.reaction,
      severity: data.severity[0].toUpperCase() + data.severity.slice(1) as AllergyRecord["severity"],
      verification: data.verificationStatus === "verified" ? "Verified" : "Unverified",
      date: localDate(),
    }, ...current]);
    setSelectedPatient(data.patientId);
    addTimeline("Allergy", data.patientId, `${data.allergyName}: ${data.reaction} (${data.severity}).`);
    addNotice("Allergy added to the demonstration record.");
  };

  const submitTreatment = (event: FormEvent<HTMLFormElement>) => {
    if (!canWriteClinical) return;
    const data = validate(event, clinicalTreatmentPlanSchema);
    if (!data) return;
    setSelectedPatient(data.patientId);
    addTimeline("Treatment plan", data.patientId, data.treatmentInstructions);
    addNotice("Treatment plan saved in this demo session.");
  };

  const submitReferral = (event: FormEvent<HTMLFormElement>) => {
    if (!canWriteClinical) return;
    const data = validate(event, clinicalReferralSchema);
    if (!data) return;
    setSelectedPatient(data.patientId);
    addTimeline("Referral", data.patientId, `${data.referralType} referral to ${data.receivingDepartment}: ${data.referralReason}.`);
    addNotice(`${data.priority[0].toUpperCase() + data.priority.slice(1)} referral created in this demo session.`);
  };

  const renderPermission = (allowed: boolean, text: string) =>
    !allowed ? <p className="text-xs text-slate-500 dark:text-slate-400">Read-only for your current role ({role}). {text}</p> : null;

  if (role === "checking") {
    return (
      <>
        <PageHeader title={title} description="Verifying access to clinical records." />
        <Card role="status"><p className="text-sm text-slate-500">Checking clinical permissions...</p></Card>
      </>
    );
  }

  if (!canViewClinical) {
    return (
      <>
        <PageHeader title={title} description="Clinical records are available only to authorized care-team roles." />
        <DemoDataNotice />
        <Card role="status">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-600" aria-hidden />
            <p className="text-sm text-slate-700 dark:text-slate-200">Clinical access is restricted for your current role. If you need access, contact a system administrator. Backend authorization must enforce this restriction in production.</p>
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader title={title} description="Clinical workspace for encounters, nursing documentation, vital signs, diagnoses, allergies, care plans, referrals and patient history." />
      <DemoDataNotice />
      <div role="tablist" aria-label="Clinical services" className="mb-5 flex gap-2 overflow-x-auto border-b border-slate-200 pb-2 dark:border-slate-800">
        {sections.map((section) => (
          <button
            key={section.id}
            id={`clinical-tab-${section.id}`}
            type="button"
            role="tab"
            aria-selected={activeSection === section.id}
            aria-controls="clinical-panel"
            onClick={() => { setActiveSection(section.id); setNotice(""); setErrors(""); }}
            className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium ${activeSection === section.id ? "bg-primary-600 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}
          >
            {section.label}
          </button>
        ))}
      </div>
      <div id="clinical-panel" role="tabpanel" aria-labelledby={`clinical-tab-${activeSection}`} className="space-y-5">
        <FormNotice message={notice || errors} />

        {activeSection === "overview" && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Recent consultations" value="18" hint="Demonstration count" icon={<Stethoscope className="h-5 w-5" />} tone="primary" />
              <StatCard label="Active encounters" value="7" hint="Across clinical departments" icon={<Activity className="h-5 w-5" />} tone="success" />
              <StatCard label="Pending clinical notes" value="4" hint="Awaiting completion" icon={<ClipboardList className="h-5 w-5" />} tone="warning" />
              <StatCard label="Follow-up patients" value="9" hint="Scheduled for review" icon={<History className="h-5 w-5" />} tone="danger" />
            </div>
            <Card>
              <SectionTitle title="Patient search" description="Search the demonstration patient index to open a clinical record." />
              <div className="relative mb-4 max-w-xl">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                <input aria-label="Search patients" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search patient or medical record number" className="ghms-input pl-10" />
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead><tr className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800"><th className="px-3 py-2">Patient</th><th className="px-3 py-2">Record number</th><th className="px-3 py-2">Department</th><th className="px-3 py-2">Action</th></tr></thead>
                  <tbody>{visiblePatients.map((patient) => (
                    <tr key={patient.id} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-3 font-medium text-slate-800 dark:text-slate-100">{patient.name}</td>
                      <td className="px-3 py-3 font-mono text-xs text-slate-500">{patient.id}</td>
                      <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{patient.department}</td>
                      <td className="px-3 py-3"><Button size="sm" variant="secondary" onClick={() => { setSelectedPatient(patient.id); setActiveSection("timeline"); }}>Open timeline</Button></td>
                    </tr>
                  ))}</tbody>
                </table>
                {visiblePatients.length === 0 ? <p className="py-5 text-center text-sm text-slate-500">No demonstration patients match this search.</p> : null}
              </div>
            </Card>
            <div className="grid gap-5 xl:grid-cols-2">
              <Card>
                <CardHeader title="Recent consultations" subtitle="Latest sample encounter notes" />
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {initialTimeline.filter((item) => item.type === "Consultation").map((item) => <TimelineRow key={item.id} item={item} />)}
                  <div className="flex items-center justify-between gap-3 py-3"><span className="text-sm text-slate-600 dark:text-slate-300">Meron Ayele - follow-up review</span><Button size="sm" variant="secondary" onClick={() => setActiveSection("consultation")}>Open</Button></div>
                </div>
              </Card>
              <Card>
                <CardHeader title="Active encounters and follow-ups" subtitle="Demo queue - verify permissions in backend integration" />
                <div className="space-y-3 pt-4">
                  {patients.slice(0, 4).map((patient, index) => (
                    <div key={patient.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-900">
                      <div><p className="text-sm font-medium text-slate-800 dark:text-slate-100">{patient.name}</p><p className="text-xs text-slate-500">{patient.id} - {patient.department}</p></div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${index === 0 ? "bg-warning-soft text-amber-800" : "bg-light-blue text-primary-800"}`}>{index === 0 ? "Pending note" : index === 1 ? "Active" : "Follow-up"}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </>
        )}

        {activeSection === "consultation" && (
          <Card>
            <SectionTitle title="Doctor consultation" description="Draft and finalize encounter documentation. Finalization requires the core clinical sections." />
            {renderPermission(canWriteClinical, "Only authorized clinicians should finalize this record.")}
            <form noValidate className="mt-4 space-y-5" onSubmit={(event) => { event.preventDefault(); submitConsultation(event.currentTarget, "draft"); }}>
              <div className="grid gap-4 sm:grid-cols-2"><PatientField /><ClinicalField name="presentingComplaint" label="Presenting complaint" required placeholder="Reason for today's visit" /></div>
              <div className="grid gap-4 md:grid-cols-2">
                <ClinicalField name="historyOfPresentIllness" label="History of present illness" type="textarea" required />
                <ClinicalField name="pastMedicalHistory" label="Past medical history" type="textarea" />
                <ClinicalField name="surgicalHistory" label="Surgical history" type="textarea" />
                <ClinicalField name="familyHistory" label="Family history" type="textarea" />
                <ClinicalField name="socialHistory" label="Social history" type="textarea" />
                <ClinicalField name="currentMedications" label="Current medications" type="textarea" />
                <ClinicalField name="allergies" label="Allergies" type="textarea" />
                <ClinicalField name="examination" label="Clinical examination" type="textarea" required />
              </div>
              <fieldset className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <legend className="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Vital signs</legend>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <ClinicalField name="bloodPressure" label="Blood pressure" placeholder="120/80" />
                  <ClinicalField name="heartRate" label="Heart rate" type="number" placeholder="bpm" />
                  <ClinicalField name="respiratoryRate" label="Respiratory rate" type="number" placeholder="breaths/min" />
                  <ClinicalField name="temperature" label="Temperature" type="number" placeholder="Celsius" />
                  <ClinicalField name="oxygenSaturation" label="Oxygen saturation" type="number" placeholder="%" />
                </div>
              </fieldset>
              <div className="grid gap-4 md:grid-cols-2">
                <ClinicalField name="diagnosis" label="Diagnosis" type="textarea" required />
                <ClinicalField name="investigationRequests" label="Investigation requests" type="textarea" />
                <ClinicalField name="treatmentPlan" label="Treatment plan" type="textarea" required />
                <ClinicalField name="followUpInstructions" label="Follow-up instructions" type="textarea" />
              </div>
              <div className="flex flex-wrap gap-2">
                {canWriteClinical ? <>
                  <Button type="submit" variant="secondary" leftIcon={<Save className="h-4 w-4" />}>Save draft</Button>
                  <Button type="button" leftIcon={<FileCheck2 className="h-4 w-4" />} onClick={(event) => {
                    const form = event.currentTarget.form;
                    if (form) submitConsultation(form, "finalized");
                  }}>Finalize consultation</Button>
                  <Button type="button" variant="secondary" leftIcon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>Print summary</Button>
                  <Button href="/prescriptions" variant="secondary" leftIcon={<Pill className="h-4 w-4" />}>Create prescription</Button>
                  <Button href="/laboratory-orders" variant="secondary" leftIcon={<FilePlus2 className="h-4 w-4" />}>Request laboratory test</Button>
                  <Button href="/radiology" variant="secondary">Request imaging</Button>
                  <Button type="button" variant="secondary" onClick={() => setActiveSection("referrals")}>Create referral</Button>
                  <Button href={`/messages?patientId=${selectedPatient}`} variant="secondary" leftIcon={<MessageSquare className="h-4 w-4" />}>Send clinical message</Button>
                </> : null}
              </div>
            </form>
          </Card>
        )}

        {activeSection === "nursing" && (
          <div className="space-y-5">
            <Card>
              <SectionTitle title="Nursing team and assigned patients" description="Care-team assignments and current shift overview; all entries are demonstration data." />
              <div className="grid gap-3 md:grid-cols-3">
                {nurses.map((nurse) => (
                  <div key={nurse.name} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{nurse.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{nurse.unit} - {nurse.shift}</p>
                    <p className="mt-3 text-sm">{nurse.assigned} assigned patients</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 overflow-x-auto">
                <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Assigned patient list</h3>
                <table className="min-w-full text-left text-sm">
                  <thead><tr className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800"><th className="px-3 py-2">Patient</th><th className="px-3 py-2">Ward</th><th className="px-3 py-2">Assigned nurse</th><th className="px-3 py-2">Observation status</th><th className="px-3 py-2 text-right">Actions</th></tr></thead>
                  <tbody>{nursingAssignments.map((assignment) => (
                    <tr key={assignment.patientId} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-3"><span className="font-medium">{assignment.patient}</span><span className="ml-2 font-mono text-xs text-slate-500">{assignment.patientId}</span></td>
                      <td className="px-3 py-3">{assignment.ward}</td>
                      <td className="px-3 py-3">{assignment.nurse}</td>
                      <td className="px-3 py-3">{assignment.status}</td>
                      <td className="px-3 py-3 text-right">
                        <Button href={`/messages?patientId=${assignment.patientId}`} size="sm" variant="ghost" leftIcon={<MessageSquare className="h-3.5 w-3.5" />}>
                          Message Nurse
                        </Button>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </Card>
            <Card>
              <SectionTitle title="Nursing assessment and handover" description="Assessment, vital signs, care plan, medication administration record, observations and shift handover." />
              {renderPermission(canWriteNursing, "Nursing documentation is limited to nursing staff and administrators.")}
              <form noValidate className="mt-4 space-y-4" onSubmit={submitNursing}>
                <div className="grid gap-4 sm:grid-cols-2"><PatientField /><ClinicalField name="nursingAssessment" label="Nursing assessment" type="textarea" required /></div>
                <div className="grid gap-4 md:grid-cols-2">
                  <ClinicalField name="nursingNotes" label="Nursing notes" type="textarea" />
                  <ClinicalField name="carePlan" label="Care plan" type="textarea" />
                  <ClinicalField name="medicationAdministration" label="Medication administration record" type="textarea" placeholder="Medication, dose, route, time, initials" />
                  <ClinicalField name="observations" label="Patient observations" type="textarea" />
                  <ClinicalField name="shiftHandover" label="Shift handover" type="textarea" />
                </div>
                {canWriteNursing ? <Button type="submit" leftIcon={<Save className="h-4 w-4" />}>Save nursing note</Button> : null}
              </form>
            </Card>
          </div>
        )}

        {activeSection === "vitals" && (
          <div className="space-y-5">
            <Card>
              <SectionTitle title="Vital signs history" description="Historical measurements represented with a demonstration trend chart." />
              <div className="grid gap-4 md:grid-cols-3">
                <VitalTrendChart dataKey="heartRate" label="Heart rate" unit="bpm" color="#2563eb" domain={[60, 110]} />
                <VitalTrendChart dataKey="temperature" label="Temperature" unit="C" color="#ea580c" domain={[35, 40]} />
                <VitalTrendChart dataKey="oxygen" label="Oxygen saturation" unit="%" color="#16a34a" domain={[90, 100]} />
              </div>
              <p className="mt-2 text-xs text-slate-500">Example series only; no real patient measurements are being plotted.</p>
            </Card>
            <Card>
              <SectionTitle title="Record vital signs" description="Use a complete, unit-labeled set of measurements." />
              <form noValidate className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" onSubmit={submitVitals}>
                <PatientField />
                <ClinicalField name="bloodPressure" label="Blood pressure (mmHg)" required placeholder="120/80" />
                <ClinicalField name="heartRate" label="Heart rate (bpm)" type="number" required />
                <ClinicalField name="respiratoryRate" label="Respiratory rate (breaths/min)" type="number" required />
                <ClinicalField name="temperature" label="Temperature (C)" type="number" required />
                <ClinicalField name="oxygenSaturation" label="Oxygen saturation (%)" type="number" required />
                <ClinicalField name="weight" label="Weight (kg)" type="number" required />
                <ClinicalField name="height" label="Height (cm)" type="number" required />
                <ClinicalField name="painScore" label="Pain score (0-10)" type="number" required />
                {canRecordVitals ? <Button type="submit" className="sm:col-span-2 lg:col-span-3" leftIcon={<HeartPulse className="h-4 w-4" />}>Record measurements</Button> : null}
              </form>
              {renderPermission(canRecordVitals, "Only authorized care staff can record measurements.")}
            </Card>
          </div>
        )}

        {activeSection === "diagnoses" && (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
            <Card>
              <SectionTitle title="Diagnosis register" description="Primary and secondary diagnoses with code, responsible clinician and date." />
              <div className="space-y-3">
                {initialTimeline.filter((item) => item.type === "Diagnosis").map((item) => (
                  <div key={item.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm">{item.summary}</strong><span className="text-xs text-slate-500">{item.date}</span></div><p className="mt-1 text-xs text-slate-500">{item.patient} - {item.clinician}</p></div>
                ))}
                <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"><strong className="text-sm">Type 2 diabetes mellitus (E11.9)</strong><p className="mt-1 text-xs text-slate-500">Meron Ayele - Dr. Selam Girma - 2026-11-10</p></div>
              </div>
            </Card>
            <Card>
              <SectionTitle title="Add diagnosis" />
              {renderPermission(canWriteClinical, "Diagnosis entry is restricted by clinical role.")}
              <form noValidate className="space-y-4" onSubmit={submitDiagnosis}>
                <PatientField />
                <ClinicalField name="diagnosis" label="Diagnosis" required />
                <ClinicalField name="diagnosisCode" label="Diagnosis code" placeholder="ICD code" />
                <ClinicalField name="diagnosisDate" label="Diagnosis date" type="date" required />
                <ClinicalField name="clinician" label="Responsible clinician" required />
                <ClinicalField name="clinicalNotes" label="Clinical notes" type="textarea" />
                <ClinicalField name="primary" label="Diagnosis type" options={["yes", "no"]} required />
                {canWriteClinical ? <Button type="submit">Save diagnosis</Button> : null}
              </form>
            </Card>
          </div>
        )}

        {activeSection === "allergies" && (
          <div className="space-y-5">
            <Card>
              <SectionTitle title="Allergy warnings" description="Verify allergies before prescribing or administering medication." />
              <div className="mb-4 max-w-sm">
                <FormField label="Allergy patient" htmlFor="allergy-patient">
                  <select id="allergy-patient" aria-label="Allergy patient" value={selectedPatient} onChange={(event) => setSelectedPatient(event.target.value)} className="ghms-input">
                    <option value="">All demonstration patients</option>
                    {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name} ({patient.id})</option>)}
                  </select>
                </FormField>
              </div>
              <div className="space-y-3">
                {allergies.filter((allergy) => !selectedPatient || allergy.patientId === selectedPatient).map((allergy) => (
                  <div key={`${allergy.patientId}-${allergy.allergy}`} className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${allergy.severity === "Severe" ? "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30" : "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20"}`}>
                    <div className="flex items-start gap-3"><AlertTriangle className={`mt-0.5 h-5 w-5 shrink-0 ${allergy.severity === "Severe" ? "text-red-600" : "text-amber-600"}`} aria-hidden /><div><p className="font-semibold">{allergy.allergy} - {allergy.severity}</p><p className="text-sm">{allergy.patient} ({allergy.patientId}) - reaction: {allergy.reaction}</p><p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{allergy.verification} - recorded {allergy.date}</p></div></div>
                    <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold dark:bg-slate-900/70">{allergy.verification}</span>
                  </div>
                ))}
                {allergies.filter((allergy) => !selectedPatient || allergy.patientId === selectedPatient).length === 0 ? <p className="text-sm text-slate-500">No known allergies recorded for this demonstration patient.</p> : null}
              </div>
            </Card>
            <Card>
              <SectionTitle title="Record allergy" />
              {renderPermission(canWriteClinical, "Only authorized staff should verify and amend allergy records.")}
              <form noValidate className="grid gap-4 sm:grid-cols-2" onSubmit={submitAllergy}>
                <PatientField />
                <ClinicalField name="allergyName" label="Allergy name" required />
                <ClinicalField name="reaction" label="Reaction" required />
                <ClinicalField name="severity" label="Severity" options={["mild", "moderate", "severe"]} required />
                <ClinicalField name="verificationStatus" label="Verification status" options={["unverified", "verified"]} required />
                {canWriteClinical ? <Button type="submit" className="sm:col-span-2">Save allergy</Button> : null}
              </form>
            </Card>
          </div>
        )}

        {activeSection === "treatment" && (
          <Card>
            <SectionTitle title="Treatment plan" description="Document instructions, medication plan, follow-up, investigations and referrals." />
            {renderPermission(canWriteClinical, "Only authorized clinicians may create or modify a treatment plan.")}
            <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Current plan - demonstration</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Selam Bekele (GHMS-01042): continue the documented medication plan, monitor blood pressure, and review in two weeks.</p>
              <p className="mt-2 text-xs text-slate-500">The sample plan is not a clinical recommendation.</p>
            </div>
            <form noValidate className="grid gap-4 md:grid-cols-2" onSubmit={submitTreatment}>
              <PatientField />
              <ClinicalField name="treatmentInstructions" label="Treatment instructions" type="textarea" required />
              <ClinicalField name="medicationPlan" label="Medication plan" type="textarea" />
              <ClinicalField name="followUpPlan" label="Follow-up plan" type="textarea" />
              <ClinicalField name="requestedInvestigations" label="Requested investigations" type="textarea" />
              <ClinicalField name="referrals" label="Referrals" type="textarea" />
              {canWriteClinical ? <Button type="submit" className="md:col-span-2" leftIcon={<Save className="h-4 w-4" />}>Save treatment plan</Button> : null}
            </form>
          </Card>
        )}

        {activeSection === "referrals" && (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
            <Card>
              <SectionTitle title="Referral overview" description="Track internal and external referrals; attachments are represented by demo text only." />
              <div className="space-y-3">
                <ReferralRow patient="Yohannes Kebede" destination="Cardiology - external" reason="Specialist assessment" priority="Urgent" status="Pending" />
                <ReferralRow patient="Dawit Haile" destination="Orthopedics - internal" reason="Fracture review" priority="Emergency" status="Accepted" />
                <ReferralRow patient="Meron Ayele" destination="Psychiatry - internal" reason="Clinical assessment" priority="Routine" status="Completed" />
              </div>
            </Card>
            <Card>
              <SectionTitle title="Create referral" />
              {renderPermission(canWriteClinical, "Referral actions require an authorized clinician.")}
              <form noValidate className="space-y-4" onSubmit={submitReferral}>
                <PatientField />
                <ClinicalField name="referralType" label="Referral type" options={["internal", "external"]} required />
                <ClinicalField name="receivingDepartment" label="Receiving department / facility" options={departments} required />
                <ClinicalField name="referralReason" label="Referral reason" type="textarea" required />
                <ClinicalField name="referringDoctor" label="Referring doctor" required />
                <ClinicalField name="priority" label="Priority" options={["routine", "urgent", "emergency"]} required />
                <ClinicalField name="documents" label="Referral documents" type="textarea" placeholder="Document names or notes (demo only)" />
                {canWriteClinical ? <Button type="submit" leftIcon={<FilePlus2 className="h-4 w-4" />}>Create referral</Button> : null}
              </form>
            </Card>
          </div>
        )}

        {activeSection === "timeline" && (
          <Card>
            <SectionTitle title="Clinical history timeline" description="Chronological consultations, diagnoses, prescriptions, laboratory results, admissions and discharge summaries." />
            <div className="mb-4 max-w-sm">
              <FormField label="Patient record" htmlFor="timeline-patient">
                <select id="timeline-patient" aria-label="Timeline patient" value={selectedPatient} onChange={(event) => setSelectedPatient(event.target.value)} className="ghms-input">
                  <option value="">All demonstration patients</option>
                  {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name} ({patient.id})</option>)}
                </select>
              </FormField>
            </div>
            <ol className="relative space-y-4 border-l border-slate-200 pl-5 dark:border-slate-700">
              {visibleTimeline.map((item) => <li key={item.id} className="relative"><span className="absolute -left-[1.65rem] top-1.5 h-3 w-3 rounded-full border-2 border-primary-600 bg-white dark:bg-slate-900" /><div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-slate-800 dark:text-slate-100">{item.type}</p><time className="text-xs text-slate-500">{item.date}</time></div><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.summary}</p><p className="mt-2 text-xs text-slate-500">{item.patient} ({item.patientId}) - {item.clinician} - {item.status}</p></div></li>)}
              {visibleTimeline.length === 0 ? <li className="text-sm text-slate-500">No timeline events for this patient.</li> : null}
            </ol>
          </Card>
        )}
      </div>
    </>
  );
}

function TimelineRow({ item }: { item: ClinicalTimelineItem }) {
  return <div className="flex items-start justify-between gap-3 py-3"><div><p className="text-sm font-medium text-slate-800 dark:text-slate-100">{item.patient}</p><p className="text-xs text-slate-500">{item.summary}</p></div><time className="shrink-0 text-xs text-slate-500">{item.date}</time></div>;
}

function ReferralRow({ patient, destination, reason, priority, status }: { patient: string; destination: string; reason: string; priority: string; status: string }) {
  return <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm">{patient}</strong><span className={`rounded-full px-2 py-1 text-xs font-semibold ${priority === "Emergency" ? "bg-red-100 text-red-800" : priority === "Urgent" ? "bg-amber-100 text-amber-800" : "bg-light-blue text-primary-800"}`}>{priority}</span></div><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{destination} - {reason}</p><p className="mt-1 text-xs text-slate-500">Status: {status}</p></div>;
}

function VitalTrendChart({
  dataKey,
  label,
  unit,
  color,
  domain,
}: {
  dataKey: "heartRate" | "temperature" | "oxygen";
  label: string;
  unit: string;
  color: string;
  domain: [number, number];
}) {
  return (
    <figure className="min-w-0 rounded-lg border border-slate-100 p-3 dark:border-slate-800" aria-label={`${label} history chart`}>
      <figcaption className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">{label} ({unit})</figcaption>
      <div className="h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="day" tick={{ fontSize: 10 }} />
            <YAxis domain={domain} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Line type="monotone" dataKey={dataKey} name={`${label} (${unit})`} stroke={color} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
