"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  FileImage,
  FlaskConical,
  HeartPulse,
  LockKeyhole,
  MessageSquare,
  Plus,
  Printer,
  ScanHeart,
  ShieldAlert,
  TestTube2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard, type StatTone } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type {
  BloodBankUnit,
  BloodDonation,
  BloodDonor,
  BloodRequest,
  DiagnosticWorkflowSection,
  ImagingReport,
  LaboratoryOrder,
  LaboratoryResult,
  LaboratorySpecimen,
  LaboratoryTestCatalogItem,
  RadiologyRequest,
  TransfusionRecord,
} from "@/services/diagnostic-workflows";
import { laboratoryResultSchema, type LaboratoryResultInput } from "@/validation/schemas";

const navigation: Array<{ id: DiagnosticWorkflowSection; label: string }> = [
  { id: "laboratory", label: "Lab dashboard" },
  { id: "catalog", label: "Test catalog" },
  { id: "orders", label: "Orders" },
  { id: "specimens", label: "Specimens" },
  { id: "results", label: "Results & reports" },
  { id: "radiology", label: "Radiology" },
  { id: "imaging-reports", label: "Imaging reports" },
  { id: "attachments", label: "Imaging attachments" },
  { id: "blood-bank", label: "Blood bank" },
];

const initialCatalog: LaboratoryTestCatalogItem[] = [
  { code: "CBC-001", name: "Complete blood count", category: "Hematology", specimenType: "EDTA whole blood", instructions: "Collect in lavender-top tube", unit: "10^9/L", referenceInterval: "4.0-11.0", servicePrice: 250, status: "Active" },
  { code: "CHEM-014", name: "Fasting blood glucose", category: "Chemistry", specimenType: "Serum", instructions: "Fast for 8 hours", unit: "mg/dL", referenceInterval: "70-100", servicePrice: 180, status: "Active" },
  { code: "MIC-022", name: "Urine culture", category: "Microbiology", specimenType: "Midstream urine", instructions: "Sterile container; deliver promptly", unit: "CFU/mL", referenceInterval: "No growth", servicePrice: 400, status: "Active" },
  { code: "SERO-008", name: "C-reactive protein", category: "Serology", specimenType: "Serum", instructions: "No special preparation", unit: "mg/L", referenceInterval: "< 5", servicePrice: 320, status: "Active" },
];

const initialOrders: LaboratoryOrder[] = [
  { id: "LAB-24018", patientId: "GHMS-01042", doctor: "Dr. Hana Bekele", department: "Internal Medicine", tests: ["Complete blood count", "C-reactive protein"], requestedAt: "Today, 08:15", priority: "Routine", status: "Pending" },
  { id: "LAB-24019", patientId: "GHMS-01044", doctor: "Dr. Dawit Tadesse", department: "Emergency", tests: ["Fasting blood glucose"], requestedAt: "Today, 08:42", priority: "STAT", status: "Processing" },
  { id: "LAB-24020", patientId: "GHMS-01046", doctor: "Dr. Selam Worku", department: "Pediatrics", tests: ["Urine culture"], requestedAt: "Today, 09:05", priority: "Urgent", status: "Pending" },
];

const initialSpecimens: LaboratorySpecimen[] = [
  { id: "SP-7810", orderId: "LAB-24019", patientId: "GHMS-01044", specimenType: "Serum", collectedAt: "Today, 08:52", collectedBy: "Demo technician", processingStatus: "Processing", storageDetails: "Analyzer rack 2" },
  { id: "SP-7811", orderId: "LAB-24018", patientId: "GHMS-01042", specimenType: "EDTA whole blood", collectedAt: "Today, 09:10", collectedBy: "Demo technician", processingStatus: "Awaiting processing", storageDetails: "Refrigerated tray A" },
];

const initialResults: LaboratoryResult[] = [
  { id: "RES-5101", orderId: "LAB-24019", patientId: "GHMS-01044", testName: "Fasting blood glucose", kind: "numeric", value: "92", unit: "mg/dL", referenceInterval: "70-100", abnormalIndicator: "Normal", technicianComments: "Synthetic preview result", authorizedReviewer: "Pending assignment", reportDate: "Today", status: "Draft" },
];

const initialRequests: RadiologyRequest[] = [
  { id: "IMG-3201", patientId: "GHMS-01042", doctor: "Dr. Hana Bekele", department: "Internal Medicine", modality: "X-ray", procedure: "Chest, two views", clinicalIndication: "Synthetic demo request", scheduledAt: "Today, 10:30", status: "Scheduled" },
  { id: "IMG-3202", patientId: "GHMS-01046", doctor: "Dr. Selam Worku", department: "Pediatrics", modality: "Ultrasound", procedure: "Abdominal ultrasound", clinicalIndication: "Synthetic demo request", scheduledAt: "Today, 11:15", status: "Pending" },
];

const initialImagingReports: ImagingReport[] = [
  { id: "IR-1090", patientId: "GHMS-01042", procedure: "Chest, two views", examinationDate: "Today", clinicalIndication: "Synthetic demonstration only", findings: "Preview findings are not clinical data.", impression: "No real diagnostic interpretation.", radiologist: "Demo radiologist", approvalStatus: "Draft" },
];

const initialDonors: BloodDonor[] = [
  { id: "DON-8001", name: "Demo donor A", bloodGroup: "O+", lastDonation: "2025-11-18", eligibility: "Eligible" },
  { id: "DON-8002", name: "Demo donor B", bloodGroup: "A-", lastDonation: "2026-02-02", eligibility: "Deferred" },
];

const initialDonations: BloodDonation[] = [
  { id: "BD-1001", donorId: "DON-8001", bloodGroup: "O+", donatedAt: "Today, 08:00", units: 1, screeningStatus: "Passed", status: "Available" },
  { id: "BD-1002", donorId: "DON-8002", bloodGroup: "A-", donatedAt: "Today, 08:30", units: 1, screeningStatus: "Pending", status: "Quarantined" },
];

const initialBloodInventory: BloodBankUnit[] = [
  { id: "BU-2001", bloodGroup: "O+", component: "Packed red cells", quantity: 12, expiresOn: "2026-07-14", screeningStatus: "Passed", status: "Available" },
  { id: "BU-2002", bloodGroup: "O-", component: "Packed red cells", quantity: 2, expiresOn: "2026-06-29", screeningStatus: "Passed", status: "Low stock" },
  { id: "BU-2003", bloodGroup: "AB+", component: "Plasma", quantity: 4, expiresOn: "2026-07-02", screeningStatus: "Pending", status: "Quarantined" },
];

const initialBloodRequests: BloodRequest[] = [
  { id: "BR-4101", patientId: "GHMS-01045", bloodGroup: "O+", component: "Packed red cells", unitsRequested: 2, requestedBy: "Surgery", priority: "Urgent", status: "Pending" },
];

type TableColumn = { label: string; value: ReactNode };

function DataTable({ headers, children, label }: { headers: string[]; children: ReactNode; label: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm" aria-label={label}>
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900/50 dark:text-slate-400">
          <tr>{headers.map((header) => <th key={header} className="px-4 py-3 font-semibold">{header}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{children}</tbody>
      </table>
    </div>
  );
}

function TableRow({ cells }: { cells: TableColumn[] }) {
  return <tr className="align-top text-slate-700 dark:text-slate-200">{cells.map((cell, index) => <td key={index} className="px-4 py-3">{cell.value}</td>)}</tr>;
}

function Field({
  label,
  children,
  required = false,
}: {
  label: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
      {label}{required ? <span className="ml-1 text-danger" aria-hidden="true">*</span> : null}
      {children}
    </label>
  );
}

const inputClass = "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warning" }) {
  const isWarning = tone === "warning";
  return (
    <div className={`flex gap-3 rounded-xl border p-4 text-sm ${isWarning ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200" : "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-200"}`} role="note">
      {isWarning ? <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden /> : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />}
      <div>{children}</div>
    </div>
  );
}

function MetricGrid({ metrics }: { metrics: Array<{ label: string; value: string; hint: string; icon: ReactNode; tone: StatTone }> }) {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => <StatCard key={metric.label} {...metric} />)}</div>;
}

export function DiagnosticServicesScreen({
  title,
  initialSection,
}: {
  title: string;
  initialSection: DiagnosticWorkflowSection;
}) {
  const [section, setSection] = useState(initialSection);
  const [catalog, setCatalog] = useState(initialCatalog);
  const [orders, setOrders] = useState(initialOrders);
  const [specimens, setSpecimens] = useState(initialSpecimens);
  const [results, setResults] = useState(initialResults);
  const [radiologyRequests, setRadiologyRequests] = useState(initialRequests);
  const [imagingReports, setImagingReports] = useState(initialImagingReports);
  const [donors, setDonors] = useState(initialDonors);
  const [donations, setDonations] = useState(initialDonations);
  const [bloodInventory, setBloodInventory] = useState(initialBloodInventory);
  const [bloodRequests, setBloodRequests] = useState(initialBloodRequests);
  const [transfusions, setTransfusions] = useState<TransfusionRecord[]>([]);
  const [resultOrderId, setResultOrderId] = useState("");
  const [feedback, setFeedback] = useState("");

  const activeSection = navigation.find((item) => item.id === section)?.label ?? title;

  function updateOrder(id: string, updates: Partial<LaboratoryOrder>) {
    setOrders((current) => current.map((order) => order.id === id ? { ...order, ...updates } : order));
  }

  function addSpecimen(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const orderId = String(form.get("orderId"));
    const order = orders.find((item) => item.id === orderId);
    if (!order) {
      setFeedback("Choose a valid laboratory order before recording a specimen.");
      return;
    }
    const specimen: LaboratorySpecimen = {
      id: `SP-${Date.now()}`,
      orderId,
      patientId: order.patientId,
      specimenType: String(form.get("specimenType")),
      collectedAt: String(form.get("collectedAt")),
      collectedBy: String(form.get("collectedBy")),
      processingStatus: "Awaiting processing",
      rejectionReason: "",
      storageDetails: String(form.get("storageDetails") ?? ""),
    };
    setSpecimens((current) => [specimen, ...current]);
    updateOrder(orderId, { status: "Specimen collected" });
    setFeedback(`Specimen ${specimen.id} recorded in this demonstration session.`);
    event.currentTarget.reset();
  }

  function saveResult(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = {
      orderId: String(form.get("orderId") ?? ""),
      patientId: String(form.get("patientId") ?? ""),
      testName: String(form.get("testName") ?? ""),
      kind: String(form.get("kind") ?? "") as LaboratoryResultInput["kind"],
      value: String(form.get("value") ?? ""),
      unit: String(form.get("unit") ?? ""),
      referenceInterval: String(form.get("referenceInterval") ?? ""),
      abnormalIndicator: String(form.get("abnormalIndicator") ?? "") as LaboratoryResultInput["abnormalIndicator"],
      technicianComments: String(form.get("technicianComments") ?? ""),
    };
    const validated = laboratoryResultSchema.safeParse(input);
    if (!validated.success) {
      setFeedback(validated.error.issues[0]?.message ?? "Check the result fields and try again.");
      return;
    }
    const result: LaboratoryResult = {
      ...validated.data,
      unit: validated.data.unit ?? "",
      referenceInterval: validated.data.referenceInterval ?? "",
      technicianComments: validated.data.technicianComments ?? "",
      id: `RES-${Date.now()}`,
      authorizedReviewer: "Pending assignment",
      reportDate: new Date().toLocaleDateString(),
      status: "Draft",
    };
    setResults((current) => [result, ...current]);
    setFeedback("Synthetic result saved as a draft in this demonstration session.");
    event.currentTarget.reset();
  }

  function submitResultForApproval(id: string) {
    setResults((current) => current.map((result) => result.id === id ? { ...result, status: "Awaiting approval" } : result));
    setFeedback("Synthetic result submitted to the approval queue. Server-side authorization is required to approve or release it.");
  }

  function createRadiologyRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const request: RadiologyRequest = {
      id: `IMG-${Date.now()}`,
      patientId: String(form.get("patientId")),
      doctor: String(form.get("doctor")),
      department: String(form.get("department")),
      modality: String(form.get("modality")) as RadiologyRequest["modality"],
      procedure: String(form.get("procedure")),
      clinicalIndication: String(form.get("clinicalIndication")),
      scheduledAt: String(form.get("scheduledAt")),
      status: "Pending",
    };
    if (!request.patientId || !request.procedure || !request.clinicalIndication) {
      setFeedback("Patient identifier, procedure and clinical indication are required.");
      return;
    }
    setRadiologyRequests((current) => [request, ...current]);
    setFeedback(`Imaging request ${request.id} added to this demonstration session.`);
    event.currentTarget.reset();
  }

  function saveImagingReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const report: ImagingReport = {
      id: `IR-${Date.now()}`,
      patientId: String(form.get("patientId")),
      procedure: String(form.get("procedure")),
      examinationDate: String(form.get("examinationDate")),
      clinicalIndication: String(form.get("clinicalIndication")),
      findings: String(form.get("findings")),
      impression: String(form.get("impression")),
      radiologist: String(form.get("radiologist")),
      approvalStatus: "Draft",
    };
    if (Object.values(report).some((value) => !value)) {
      setFeedback("Complete all required imaging report fields before saving.");
      return;
    }
    setImagingReports((current) => [report, ...current]);
    setFeedback("Synthetic imaging report saved as a draft. Approval and release require backend authorization.");
    event.currentTarget.reset();
  }

  function addDonor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const bloodGroup = String(form.get("bloodGroup") ?? "");
    if (!name || !bloodGroup) {
      setFeedback("Donor name and blood group are required.");
      return;
    }
    setDonors((current) => [{ id: `DON-${Date.now()}`, name, bloodGroup, lastDonation: "Not recorded", eligibility: "Eligible" }, ...current]);
    setFeedback("Synthetic donor added to this demonstration session.");
    event.currentTarget.reset();
  }

  function recordDonation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const donorId = String(form.get("donorId") ?? "");
    const donor = donors.find((item) => item.id === donorId);
    if (!donor) {
      setFeedback("Select a valid donor.");
      return;
    }
    const donation: BloodDonation = {
      id: `BD-${Date.now()}`,
      donorId,
      bloodGroup: donor.bloodGroup,
      donatedAt: new Date().toLocaleString(),
      units: Number(form.get("units") ?? 1),
      screeningStatus: "Pending",
      status: "Quarantined",
    };
    if (!Number.isInteger(donation.units) || donation.units < 1 || donation.units > 2) {
      setFeedback("Donation volume must be one or two units.");
      return;
    }
    setDonations((current) => [donation, ...current]);
    setFeedback("Donation recorded and quarantined pending screening in this demonstration.");
    event.currentTarget.reset();
  }

  function screenDonation(donationId: string, passed: boolean) {
    const donation = donations.find((item) => item.id === donationId);
    if (!donation) return;
    setDonations((current) => current.map((item) => item.id === donationId
      ? { ...item, screeningStatus: passed ? "Passed" : "Failed", status: passed ? "Available" : "Rejected" }
      : item));
    if (passed) {
      setBloodInventory((current) => [{
        id: `BU-${Date.now()}`,
        bloodGroup: donation.bloodGroup,
        component: "Whole blood",
        quantity: donation.units,
        expiresOn: "Not configured",
        screeningStatus: "Passed",
        status: "Available",
      }, ...current]);
    }
    setFeedback(`Donation ${donationId} marked ${passed ? "screening passed" : "screening failed"} in demo data.`);
  }

  function createBloodRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const request: BloodRequest = {
      id: `BR-${Date.now()}`,
      patientId: String(form.get("patientId") ?? ""),
      bloodGroup: String(form.get("bloodGroup") ?? ""),
      component: String(form.get("component") ?? ""),
      unitsRequested: Number(form.get("unitsRequested") ?? 0),
      requestedBy: String(form.get("requestedBy") ?? ""),
      priority: String(form.get("priority") ?? "Routine") as BloodRequest["priority"],
      status: "Pending",
    };
    if (!request.patientId || !request.bloodGroup || !request.component || !request.requestedBy || !Number.isInteger(request.unitsRequested) || request.unitsRequested < 1) {
      setFeedback("Complete the blood request fields with at least one unit.");
      return;
    }
    setBloodRequests((current) => [request, ...current]);
    setFeedback("Synthetic blood request added to this demonstration session.");
    event.currentTarget.reset();
  }

  function issueBloodRequest(requestId: string) {
    const request = bloodRequests.find((item) => item.id === requestId);
    if (!request) return;
    const availableUnit = bloodInventory.find((unit) => unit.bloodGroup === request.bloodGroup && unit.component === request.component && unit.screeningStatus === "Passed" && unit.quantity >= request.unitsRequested);
    if (!availableUnit) {
      setFeedback(`No screened inventory matches ${request.bloodGroup} ${request.component} for ${request.unitsRequested} unit(s).`);
      return;
    }
    setBloodInventory((current) => current.map((unit) => unit.id === availableUnit.id
      ? { ...unit, quantity: unit.quantity - request.unitsRequested, status: unit.quantity - request.unitsRequested > 0 ? "Available" : "Issued" }
      : unit));
    setBloodRequests((current) => current.map((item) => item.id === requestId ? { ...item, status: "Issued (demo)" } : item));
    setFeedback(`Request ${requestId} issued in demonstration data only.`);
  }

  function recordTransfusion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const patientId = String(form.get("patientId") ?? "");
    const bloodUnitId = String(form.get("bloodUnitId") ?? "");
    const administeredBy = String(form.get("administeredBy") ?? "");
    if (!patientId || !bloodUnitId || !administeredBy) {
      setFeedback("Patient identifier, blood unit and administering staff are required.");
      return;
    }
    setTransfusions((current) => [{
      id: `TR-${Date.now()}`,
      patientId,
      bloodUnitId,
      startedAt: new Date().toLocaleString(),
      administeredBy,
      status: "Recorded (demo)",
    }, ...current]);
    setFeedback("Synthetic transfusion record added to this demonstration session.");
    event.currentTarget.reset();
  }

  function renderSection() {
    switch (section) {
      case "laboratory":
        return <LaboratoryDashboard orders={orders} specimens={specimens} results={results} catalog={catalog} />;
      case "catalog":
        return <CatalogSection catalog={catalog} onAdd={(item) => { setCatalog((current) => [item, ...current]); setFeedback("Test catalog entry added in demo data."); }} />;
      case "orders":
        return <OrdersSection orders={orders} onAssign={(id) => { updateOrder(id, { assignedTo: "Demo technician", status: "Assigned" }); setFeedback(`${id} assigned to the demo technician.`); }} onCollect={(order) => { updateOrder(order.id, { status: "Specimen collected" }); setSpecimens((current) => [{ id: `SP-${Date.now()}`, orderId: order.id, patientId: order.patientId, specimenType: "Demo specimen", collectedAt: new Date().toLocaleString(), collectedBy: "Demo technician", processingStatus: "Awaiting processing", storageDetails: "Demo storage" }, ...current]); setFeedback(`Specimen collection recorded for ${order.id} in demo data.`); }} onProgress={(order) => { const next = order.status === "Pending" || order.status === "Assigned" ? "Specimen collected" : order.status === "Specimen collected" ? "Processing" : "Awaiting result"; updateOrder(order.id, { status: next }); setFeedback(`${order.id} updated to ${next} in demo data.`); }} onEnterResult={(order) => { setResultOrderId(order.id); setSection("results"); setFeedback(`Result entry opened for ${order.id}.`); }} />;
      case "specimens":
        return <SpecimensSection specimens={specimens} orders={orders} onSubmit={addSpecimen} onUpdate={(id, status, rejectionReason) => {
          const specimen = specimens.find((item) => item.id === id);
          if (!specimen) return;
          setSpecimens((current) => current.map((item) => item.id === id ? { ...item, processingStatus: status, rejectionReason } : item));
          if (status === "Rejected") updateOrder(specimen.orderId, { status: "Specimen rejected" });
          setFeedback(`${id} marked ${status.toLowerCase()} in demonstration data.`);
        }} />;
      case "results":
        return <ResultsSection orders={orders} catalog={catalog} results={results} selectedOrderId={resultOrderId} onSelectOrder={setResultOrderId} onSave={saveResult} onSubmitApproval={submitResultForApproval} onPrint={() => window.print()} />;
      case "radiology":
        return <RadiologySection requests={radiologyRequests} onSubmit={createRadiologyRequest} />;
      case "imaging-reports":
        return <ImagingReportsSection reports={imagingReports} onSubmit={saveImagingReport} onSubmitApproval={(id) => { setImagingReports((current) => current.map((report) => report.id === id ? { ...report, approvalStatus: "Awaiting approval" } : report)); setFeedback("Synthetic report submitted for approval. Release requires backend authorization."); }} />;
      case "attachments":
        return <ImagingAttachmentsSection />;
      case "blood-bank":
        return <BloodBankSection donors={donors} donations={donations} inventory={bloodInventory} requests={bloodRequests} transfusions={transfusions} onAddDonor={addDonor} onRecordDonation={recordDonation} onScreenDonation={screenDonation} onCreateRequest={createBloodRequest} onIssueRequest={issueBloodRequest} onRecordTransfusion={recordTransfusion} />;
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={title} description="Laboratory, imaging and blood bank operations" />
      <Notice>
        <strong>Demonstration data only.</strong> All patients, orders, results, imaging reports, donor details and inventory are synthetic and are not hospital records. No entries are saved to the backend.
      </Notice>
      <div className="flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Diagnostic services">
        {navigation.map((item) => (
          <button key={item.id} type="button" role="tab" aria-selected={section === item.id} onClick={() => { setSection(item.id); setFeedback(""); }} className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition ${section === item.id ? "bg-primary-600 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"}`}>
            {item.label}
          </button>
        ))}
      </div>
      {feedback ? <p role="status" className="rounded-lg border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-800 dark:border-primary-900 dark:bg-primary-950/30 dark:text-primary-200">{feedback}</p> : null}
      <div role="tabpanel" aria-label={activeSection} className="space-y-6">{renderSection()}</div>
    </div>
  );
}

function LaboratoryDashboard({
  orders,
  specimens,
  results,
  catalog,
}: {
  orders: LaboratoryOrder[];
  specimens: LaboratorySpecimen[];
  results: LaboratoryResult[];
  catalog: LaboratoryTestCatalogItem[];
}) {
  const metrics = [
    { label: "Total test requests", value: String(orders.length), hint: "Synthetic preview", icon: <ClipboardList className="h-5 w-5" />, tone: "primary" as StatTone },
    { label: "Pending tests", value: String(orders.filter((order) => order.status === "Pending").length), hint: "Awaiting assignment", icon: <FlaskConical className="h-5 w-5" />, tone: "warning" as StatTone },
    { label: "Samples awaiting collection", value: String(Math.max(0, orders.filter((order) => order.status === "Pending").length)), hint: "Demo estimate", icon: <TestTube2 className="h-5 w-5" />, tone: "warning" as StatTone },
    { label: "Samples processing", value: String(specimens.filter((specimen) => specimen.processingStatus === "Processing").length), hint: "Synthetic preview", icon: <HeartPulse className="h-5 w-5" />, tone: "primary" as StatTone },
    { label: "Results awaiting approval", value: String(results.filter((result) => result.status === "Awaiting approval").length), hint: "No result is released", icon: <FileCheck2 className="h-5 w-5" />, tone: "warning" as StatTone },
    { label: "Completed tests", value: String(orders.filter((order) => order.status === "Completed").length), hint: "Synthetic preview", icon: <CheckCircle2 className="h-5 w-5" />, tone: "success" as StatTone },
    { label: "Rejected specimens", value: String(specimens.filter((specimen) => specimen.processingStatus === "Rejected").length), hint: "Synthetic preview", icon: <AlertTriangle className="h-5 w-5" />, tone: "danger" as StatTone },
    { label: "Active catalog tests", value: String(catalog.filter((item) => item.status === "Active").length), hint: "Configurable catalog", icon: <Archive className="h-5 w-5" />, tone: "primary" as StatTone },
  ];
  return (
    <>
      <MetricGrid metrics={metrics} />
      <Card>
        <CardHeader title="Laboratory workflow" subtitle="From clinician request through specimen processing and result review" />
        <div className="grid gap-4 p-5 md:grid-cols-3">
          {[
            ["1", "Order & collect", "Review the request, assign staff and track specimen collection."],
            ["2", "Process & document", "Record structured numeric, text or qualitative results."],
            ["3", "Review & release", "Send results for review; approval and release require backend authorization."],
          ].map(([step, heading, body]) => <div key={step} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><span className="text-xs font-bold uppercase text-primary-700">Step {step}</span><h3 className="mt-2 font-semibold">{heading}</h3><p className="mt-1 text-sm text-slate-500">{body}</p></div>)}
        </div>
      </Card>
    </>
  );
}

function CatalogSection({ catalog, onAdd }: { catalog: LaboratoryTestCatalogItem[]; onAdd: (item: LaboratoryTestCatalogItem) => void }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => catalog.filter((item) => `${item.code} ${item.name} ${item.category}`.toLowerCase().includes(query.toLowerCase())), [catalog, query]);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const item: LaboratoryTestCatalogItem = {
      code: String(form.get("code") ?? "").trim(),
      name: String(form.get("name") ?? "").trim(),
      category: String(form.get("category") ?? ""),
      specimenType: String(form.get("specimenType") ?? ""),
      instructions: String(form.get("instructions") ?? ""),
      unit: String(form.get("unit") ?? ""),
      referenceInterval: String(form.get("referenceInterval") ?? ""),
      servicePrice: Number(form.get("servicePrice") ?? 0),
      status: "Active",
    };
    if (!item.code || !item.name || !item.category || !item.specimenType || !Number.isFinite(item.servicePrice) || item.servicePrice < 0) return;
    onAdd(item);
    event.currentTarget.reset();
  }
  return (
    <>
      <Card>
        <CardHeader title="Laboratory test catalog" subtitle="Codes, specimen requirements, reference intervals and service prices" />
        <div className="p-5">
          <label className="mb-4 block max-w-md text-sm font-medium">Search test catalog<input className={inputClass} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Code, test or category" /></label>
          <DataTable label="Laboratory test catalog" headers={["Code / test", "Category", "Specimen / instructions", "Unit / reference interval", "Price", "Status"]}>
            {filtered.map((item) => <TableRow key={item.code} cells={[
              { label: "Test", value: <><strong>{item.code}</strong><br />{item.name}</> },
              { label: "Category", value: item.category },
              { label: "Specimen", value: <>{item.specimenType}<br /><span className="text-xs text-slate-500">{item.instructions}</span></> },
              { label: "Reference", value: <>{item.unit}<br /><span className="text-xs text-slate-500">{item.referenceInterval}</span></> },
              { label: "Price", value: `${item.servicePrice.toLocaleString()} ETB` },
              { label: "Status", value: <StatusBadge status={item.status} /> },
            ]} />)}
          </DataTable>
          {filtered.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">No catalog tests match your search.</p> : null}
        </div>
      </Card>
      <Card>
        <CardHeader title="Add catalog test" subtitle="Preview-only catalog entry; backend integration is not connected" />
        <form className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4" onSubmit={submit}>
          <Field label="Test code" required><input name="code" className={inputClass} required /></Field>
          <Field label="Test name" required><input name="name" className={inputClass} required /></Field>
          <Field label="Category" required><input name="category" className={inputClass} required /></Field>
          <Field label="Specimen type" required><input name="specimenType" className={inputClass} required /></Field>
          <Field label="Collection instructions"><input name="instructions" className={inputClass} /></Field>
          <Field label="Unit"><input name="unit" className={inputClass} /></Field>
          <Field label="Reference interval"><input name="referenceInterval" className={inputClass} /></Field>
          <Field label="Service price (ETB)" required><input name="servicePrice" type="number" min="0" step="0.01" className={inputClass} required /></Field>
          <div className="sm:col-span-2 xl:col-span-4"><Button type="submit" leftIcon={<Plus className="h-4 w-4" />}>Add demo catalog test</Button></div>
        </form>
      </Card>
    </>
  );
}

function OrdersSection({
  orders,
  onAssign,
  onCollect,
  onProgress,
  onEnterResult,
}: {
  orders: LaboratoryOrder[];
  onAssign: (id: string) => void;
  onCollect: (order: LaboratoryOrder) => void;
  onProgress: (order: LaboratoryOrder) => void;
  onEnterResult: (order: LaboratoryOrder) => void;
}) {
  const [selected, setSelected] = useState<LaboratoryOrder | null>(null);
  return (
    <>
      <Card>
        <CardHeader title="Laboratory orders" subtitle="Requested tests, clinical owner, priority and processing status" />
        <DataTable label="Laboratory orders" headers={["Order / patient", "Doctor / department", "Requested tests", "Date / priority", "Status", "Actions"]}>
          {orders.map((order) => <TableRow key={order.id} cells={[
            { label: "Order", value: <><strong>{order.id}</strong><br /><span className="text-xs text-slate-500">{order.patientId}</span></> },
            { label: "Clinician", value: <>{order.doctor}<br /><span className="text-xs text-slate-500">{order.department}</span></> },
            { label: "Tests", value: order.tests.join(", ") },
            { label: "Priority", value: <>{order.requestedAt}<br /><StatusBadge status={order.priority} variant={order.priority === "STAT" ? "danger" : order.priority === "Urgent" ? "warning" : "neutral"} /></> },
            { label: "Status", value: <>{order.status}<br /><span className="text-xs text-slate-500">{order.assignedTo ? `Assigned: ${order.assignedTo}` : "Unassigned"}</span></> },
            { label: "Actions", value: <div className="flex max-w-[320px] flex-wrap gap-1.5"><Button size="sm" variant="secondary" onClick={() => setSelected(order)}>View</Button><Button size="sm" variant="secondary" onClick={() => onAssign(order.id)}>Assign</Button><Button size="sm" variant="secondary" onClick={() => onCollect(order)}>Collect specimen</Button><Button size="sm" variant="secondary" onClick={() => onProgress(order)}>Update progress</Button><Button size="sm" onClick={() => onEnterResult(order)}>Enter result</Button><Button href={`/messages?patientId=${order.patientId}&orderId=${order.id}`} size="sm" variant="ghost" leftIcon={<MessageSquare className="h-3.5 w-3.5" />}>Alert clinician</Button></div> },
          ]} />)}
        </DataTable>
      </Card>
      {selected ? <Card aria-label="Laboratory order details"><CardHeader title={`Order ${selected.id}`} subtitle="Synthetic order details" actions={<Button variant="ghost" size="sm" onClick={() => setSelected(null)}>Close</Button>} /><div className="grid gap-3 p-5 text-sm sm:grid-cols-2"><p><strong>Patient identifier:</strong> {selected.patientId}</p><p><strong>Doctor:</strong> {selected.doctor}</p><p><strong>Department:</strong> {selected.department}</p><p><strong>Requested tests:</strong> {selected.tests.join(", ")}</p><p><strong>Priority:</strong> {selected.priority}</p><p><strong>Status:</strong> {selected.status}</p></div></Card> : null}
    </>
  );
}

function SpecimensSection({
  specimens,
  orders,
  onSubmit,
  onUpdate,
}: {
  specimens: LaboratorySpecimen[];
  orders: LaboratoryOrder[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUpdate: (id: string, status: string, rejectionReason: string) => void;
}) {
  return (
    <>
      <Card>
        <CardHeader title="Specimen tracking" subtitle="Collection, processing, rejection and storage details" />
        <DataTable label="Laboratory specimens" headers={["Specimen / order", "Patient", "Specimen type", "Collection", "Collection staff", "Processing", "Rejection / storage", "Actions"]}>
          {specimens.map((specimen) => <TableRow key={specimen.id} cells={[
            { label: "Specimen", value: <><strong>{specimen.id}</strong><br />{specimen.orderId}</> },
            { label: "Patient", value: specimen.patientId },
            { label: "Type", value: specimen.specimenType },
            { label: "Collected", value: specimen.collectedAt },
            { label: "Staff", value: specimen.collectedBy },
            { label: "Processing", value: <StatusBadge status={specimen.processingStatus} /> },
            { label: "Storage", value: <>{specimen.rejectionReason || "No rejection recorded"}<br /><span className="text-xs text-slate-500">{specimen.storageDetails || "Storage not recorded"}</span></> },
            { label: "Actions", value: <div className="flex min-w-[160px] flex-wrap gap-2"><Button size="sm" variant="secondary" onClick={() => onUpdate(specimen.id, "Processing", "")} disabled={specimen.processingStatus === "Rejected"}>Mark processing</Button><Button size="sm" variant="danger" onClick={() => onUpdate(specimen.id, "Rejected", "Rejected by lab staff (demo)")} disabled={specimen.processingStatus === "Rejected"}>Reject specimen</Button></div> },
          ]} />)}
        </DataTable>
      </Card>
      <Card>
        <CardHeader title="Record specimen collection" subtitle="Recording here updates only this browser demonstration state" />
        <form className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3" onSubmit={onSubmit}>
          <Field label="Laboratory order" required><select name="orderId" className={inputClass} required defaultValue=""><option value="" disabled>Select order</option>{orders.map((order) => <option key={order.id} value={order.id}>{order.id} — {order.patientId}</option>)}</select></Field>
          <Field label="Specimen type" required><input name="specimenType" className={inputClass} required /></Field>
          <Field label="Collection date and time" required><input name="collectedAt" type="datetime-local" className={inputClass} required /></Field>
          <Field label="Collection staff" required><input name="collectedBy" className={inputClass} required defaultValue="Demo technician" /></Field>
          <Field label="Storage details"><input name="storageDetails" className={inputClass} /></Field>
          <div className="self-end"><Button type="submit">Record specimen</Button></div>
        </form>
      </Card>
    </>
  );
}

function ResultsSection({
  orders,
  catalog,
  results,
  selectedOrderId,
  onSelectOrder,
  onSave,
  onSubmitApproval,
  onPrint,
}: {
  orders: LaboratoryOrder[];
  catalog: LaboratoryTestCatalogItem[];
  results: LaboratoryResult[];
  selectedOrderId: string;
  onSelectOrder: (id: string) => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onSubmitApproval: (id: string) => void;
  onPrint: () => void;
}) {
  const [selectedReport, setSelectedReport] = useState<LaboratoryResult | null>(null);
  const selectedOrder = orders.find((order) => order.id === selectedOrderId);
  return (
    <>
      <Card>
        <CardHeader title="Structured laboratory result entry" subtitle="Supports numeric, free-text and positive/negative result types" />
        <form className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3" onSubmit={onSave}>
          <Field label="Laboratory order" required><select name="orderId" className={inputClass} required value={selectedOrderId} onChange={(event) => onSelectOrder(event.target.value)}><option value="" disabled>Select order</option>{orders.map((order) => <option key={order.id} value={order.id}>{order.id} — {order.patientId}</option>)}</select></Field>
          <Field label="Patient identifier" required><input name="patientId" className={inputClass} required readOnly value={selectedOrder?.patientId ?? ""} placeholder="Select an order" /></Field>
          <Field label="Test" required><select name="testName" className={inputClass} required defaultValue=""><option value="" disabled>Select test</option>{catalog.map((test) => <option key={test.code} value={test.name}>{test.name}</option>)}</select></Field>
          <Field label="Result type" required><select name="kind" className={inputClass} required defaultValue="numeric"><option value="numeric">Numeric</option><option value="text">Text</option><option value="qualitative">Positive / negative</option></select></Field>
          <Field label="Result value" required><input name="value" className={inputClass} required /></Field>
          <Field label="Unit"><input name="unit" className={inputClass} placeholder="e.g. mg/dL" /></Field>
          <Field label="Reference interval"><input name="referenceInterval" className={inputClass} placeholder="e.g. 70-100" /></Field>
          <Field label="Abnormal indicator" required><select name="abnormalIndicator" className={inputClass} required defaultValue="Normal">{["Normal", "Low", "High", "Abnormal", "Critical"].map((item) => <option key={item}>{item}</option>)}</select></Field>
          <Field label="Technician comments"><input name="technicianComments" className={inputClass} /></Field>
          <div className="sm:col-span-2 xl:col-span-3"><Button type="submit">Save result draft</Button></div>
        </form>
      </Card>
      <Card>
        <CardHeader title="Result review and approval queue" subtitle="Only backend-authorized reviewers may approve or release clinical results" />
        <Notice tone="warning">Result approval and release are deliberately unavailable in this frontend preview. The disabled control is not a substitute for server-side authorization.</Notice>
        <DataTable label="Laboratory result review" headers={["Result / order", "Patient / test", "Result", "Reference / flag", "Reviewer / date", "Status / actions"]}>
          {results.map((result) => <TableRow key={result.id} cells={[
            { label: "Result", value: <><strong>{result.id}</strong><br />{result.orderId}</> },
            { label: "Patient", value: <>{result.patientId}<br />{result.testName}</> },
            { label: "Value", value: <>{result.value} {result.unit}</> },
            { label: "Reference", value: <>{result.referenceInterval || "Not provided"}<br /><StatusBadge status={result.abnormalIndicator} variant={result.abnormalIndicator === "Critical" ? "danger" : result.abnormalIndicator === "Normal" ? "success" : "warning"} /></> },
            { label: "Reviewer", value: <>{result.authorizedReviewer}<br />{result.reportDate}</> },
            { label: "Status", value: <div className="flex min-w-[280px] flex-wrap items-center gap-2"><StatusBadge status={result.status} /><Button size="sm" variant="secondary" onClick={() => onSubmitApproval(result.id)} disabled={result.status === "Awaiting approval"}>Submit for approval</Button><Button size="sm" variant="secondary" disabled title="Backend authorization required">Approve / release</Button><Button size="sm" variant="ghost" onClick={() => setSelectedReport(result)}>Preview report</Button><Button href={`/messages?patientId=${result.patientId}&orderId=${result.orderId}`} size="sm" variant={result.abnormalIndicator === "Critical" ? "danger" : "ghost"} leftIcon={<MessageSquare className="h-3.5 w-3.5" />}>Alert clinician</Button></div> },
          ]} />)}
        </DataTable>
      </Card>
      {selectedReport ? <Card aria-label="Printable laboratory report">
        <CardHeader title="Laboratory result report" subtitle="Synthetic report preview" actions={<div className="flex gap-2"><Button size="sm" leftIcon={<Printer className="h-4 w-4" />} onClick={onPrint}>Print report</Button><Button size="sm" variant="ghost" onClick={() => setSelectedReport(null)}>Close preview</Button></div>} />
        <div className="space-y-3 p-6 text-sm">
          <p className="text-lg font-bold">Gondar Hospital</p><p>Laboratory Report — DEMONSTRATION ONLY</p><hr />
          <p><strong>Patient identifier:</strong> {selectedReport.patientId}</p><p><strong>Order / test:</strong> {selectedReport.orderId} / {selectedReport.testName}</p>
          <p><strong>Result:</strong> {selectedReport.value} {selectedReport.unit}</p><p><strong>Reference interval:</strong> {selectedReport.referenceInterval || "Not provided"}</p>
          <p><strong>Indicator:</strong> {selectedReport.abnormalIndicator}</p><p><strong>Authorized reviewer:</strong> {selectedReport.authorizedReviewer}</p><p><strong>Report date:</strong> {selectedReport.reportDate}</p>
          <p className="text-xs text-slate-500">Synthetic preview, not a released clinical result.</p>
        </div>
      </Card> : null}
    </>
  );
}

function RadiologySection({
  requests,
  onSubmit,
}: {
  requests: RadiologyRequest[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const metrics = [
    { label: "Pending requests", value: String(requests.filter((request) => request.status === "Pending").length), hint: "Synthetic preview", icon: <ScanHeart className="h-5 w-5" />, tone: "warning" as StatTone },
    { label: "Scheduled procedures", value: String(requests.filter((request) => request.status === "Scheduled").length), hint: "Synthetic preview", icon: <FileImage className="h-5 w-5" />, tone: "primary" as StatTone },
    { label: "Procedures in progress", value: String(requests.filter((request) => request.status === "In progress").length), hint: "Synthetic preview", icon: <HeartPulse className="h-5 w-5" />, tone: "primary" as StatTone },
    { label: "Reports pending", value: "1", hint: "Demo estimate", icon: <FileCheck2 className="h-5 w-5" />, tone: "warning" as StatTone },
    { label: "Completed reports", value: String(requests.filter((request) => request.status === "Completed").length), hint: "Synthetic preview", icon: <CheckCircle2 className="h-5 w-5" />, tone: "success" as StatTone },
  ];
  return (
    <>
      <MetricGrid metrics={metrics} />
      <Card>
        <CardHeader title="Radiology requests" subtitle="X-ray, ultrasound, CT, MRI and other configured imaging" />
        <DataTable label="Radiology requests" headers={["Request", "Patient", "Procedure / modality", "Doctor / department", "Clinical indication", "Scheduled / status"]}>
          {requests.map((request) => <TableRow key={request.id} cells={[
            { label: "Request", value: request.id },
            { label: "Patient", value: request.patientId },
            { label: "Procedure", value: <>{request.procedure}<br /><StatusBadge status={request.modality} /></> },
            { label: "Doctor", value: <>{request.doctor}<br />{request.department}</> },
            { label: "Indication", value: request.clinicalIndication },
            { label: "Schedule", value: <>{request.scheduledAt}<br /><StatusBadge status={request.status} /></> },
          ]} />)}
        </DataTable>
      </Card>
      <Card>
        <CardHeader title="Create imaging request" subtitle="Future DICOM/PACS connectivity is represented by API interfaces only" />
        <form className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3" onSubmit={onSubmit}>
          <Field label="Patient identifier" required><input name="patientId" className={inputClass} required /></Field>
          <Field label="Modality" required><select name="modality" className={inputClass} required>{["X-ray", "Ultrasound", "CT", "MRI", "Other"].map((item) => <option key={item}>{item}</option>)}</select></Field>
          <Field label="Procedure" required><input name="procedure" className={inputClass} required /></Field>
          <Field label="Doctor" required><input name="doctor" className={inputClass} required /></Field>
          <Field label="Department" required><input name="department" className={inputClass} required /></Field>
          <Field label="Scheduled date and time" required><input name="scheduledAt" type="datetime-local" className={inputClass} required /></Field>
          <Field label="Clinical indication" required><input name="clinicalIndication" className={inputClass} required /></Field>
          <div className="self-end"><Button type="submit">Create demo request</Button></div>
        </form>
      </Card>
    </>
  );
}

function ImagingReportsSection({
  reports,
  onSubmit,
  onSubmitApproval,
}: {
  reports: ImagingReport[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSubmitApproval: (id: string) => void;
}) {
  return (
    <>
      <Card>
        <CardHeader title="Imaging reports" subtitle="Findings and impressions remain drafts until authorized backend approval" />
        <DataTable label="Imaging reports" headers={["Report / patient", "Procedure / examination", "Clinical indication", "Findings", "Impression", "Radiologist / approval"]}>
          {reports.map((report) => <TableRow key={report.id} cells={[
            { label: "Report", value: <>{report.id}<br />{report.patientId}</> },
            { label: "Procedure", value: <>{report.procedure}<br />{report.examinationDate}</> },
            { label: "Indication", value: report.clinicalIndication },
            { label: "Findings", value: report.findings },
            { label: "Impression", value: report.impression },
            { label: "Approval", value: <div className="min-w-[180px] space-y-2"><p>{report.radiologist}</p><StatusBadge status={report.approvalStatus} /><br /><Button size="sm" variant="secondary" onClick={() => onSubmitApproval(report.id)} disabled={report.approvalStatus === "Awaiting approval"}>Submit for approval</Button></div> },
          ]} />)}
        </DataTable>
      </Card>
      <Card>
        <CardHeader title="Write imaging report" subtitle="Patient identifier, study details and interpretation" />
        <form className="grid gap-4 p-5 sm:grid-cols-2" onSubmit={onSubmit}>
          <Field label="Patient identifier" required><input name="patientId" className={inputClass} required /></Field>
          <Field label="Imaging procedure" required><input name="procedure" className={inputClass} required /></Field>
          <Field label="Examination date" required><input name="examinationDate" type="date" className={inputClass} required /></Field>
          <Field label="Radiologist" required><input name="radiologist" className={inputClass} required /></Field>
          <Field label="Clinical indication" required><textarea name="clinicalIndication" className={inputClass} required rows={2} /></Field>
          <Field label="Findings" required><textarea name="findings" className={inputClass} required rows={3} /></Field>
          <Field label="Impression" required><textarea name="impression" className={inputClass} required rows={3} /></Field>
          <div className="self-end"><Button type="submit">Save report draft</Button></div>
        </form>
      </Card>
    </>
  );
}

function ImagingAttachmentsSection() {
  const [allowed, setAllowed] = useState(false);
  const [accessMessage, setAccessMessage] = useState("Checking local role for restricted preview...");
  useEffect(() => {
    const storedUser = window.localStorage.getItem("ghms-user");
    if (!storedUser) {
      setAccessMessage("Preview restricted. Sign in with an authorized clinical demo role to view synthetic attachments.");
      return;
    }
    try {
      const user = JSON.parse(storedUser) as { role?: string };
      const normalizedRole = user.role?.toLowerCase();
      const hasRole = ["admin", "physician", "doctor", "radiologist"].includes(normalizedRole ?? "");
      setAllowed(hasRole);
      setAccessMessage(hasRole ? "Authorized demo role detected. Server-side authorization is still required in production." : "This role cannot view restricted imaging previews.");
    } catch {
      setAllowed(false);
      setAccessMessage("Role information could not be verified; restricted preview remains locked.");
    }
  }, []);
  return (
    <>
      <Notice tone="warning"><strong>Restricted medical media.</strong> This synthetic preview is role-gated in the interface only. Production access must be enforced by the backend and secure storage; no actual images or DICOM files are connected.</Notice>
      <Card>
        <CardHeader title="Imaging attachment preview" subtitle="Future DICOM/PACS integration boundary" />
        <div className="space-y-4 p-5">
          <p role="status" className="text-sm text-slate-600 dark:text-slate-300">{accessMessage}</p>
          {allowed ? <div className="grid gap-4 md:grid-cols-2">
            {[["ATT-2201", "Chest radiograph preview", "X-ray", "2026-05-01"], ["ATT-2202", "Abdominal ultrasound preview", "Ultrasound", "2026-05-02"]].map(([id, name, modality, date]) => <div key={id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><div className="flex items-start gap-3"><FileImage className="h-5 w-5 text-primary-600" aria-hidden /><div><h3 className="font-semibold">{name}</h3><p className="mt-1 text-sm text-slate-500">{id} · {modality} · {date}</p><div className="mt-4 flex h-28 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">Restricted synthetic preview placeholder</div></div></div></div>)}
          </div> : <div className="flex min-h-32 items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 text-slate-500 dark:border-slate-700"><LockKeyhole className="h-5 w-5" />No attachment content is exposed.</div>}
        </div>
      </Card>
    </>
  );
}

function BloodBankSection({
  donors,
  donations,
  inventory,
  requests,
  transfusions,
  onAddDonor,
  onRecordDonation,
  onScreenDonation,
  onCreateRequest,
  onIssueRequest,
  onRecordTransfusion,
}: {
  donors: BloodDonor[];
  donations: BloodDonation[];
  inventory: BloodBankUnit[];
  requests: BloodRequest[];
  transfusions: TransfusionRecord[];
  onAddDonor: (event: FormEvent<HTMLFormElement>) => void;
  onRecordDonation: (event: FormEvent<HTMLFormElement>) => void;
  onScreenDonation: (id: string, passed: boolean) => void;
  onCreateRequest: (event: FormEvent<HTMLFormElement>) => void;
  onIssueRequest: (id: string) => void;
  onRecordTransfusion: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const donorRows = donors.map((donor) => <TableRow key={donor.id} cells={[
    { label: "Donor", value: <>{donor.name}<br /><span className="text-xs text-slate-500">{donor.id}</span></> },
    { label: "Blood group", value: donor.bloodGroup },
    { label: "Last donation", value: donor.lastDonation },
    { label: "Eligibility", value: <StatusBadge status={donor.eligibility} /> },
  ]} />);
  const inventoryRows = inventory.map((unit) => <TableRow key={unit.id} cells={[
    { label: "Unit", value: unit.id },
    { label: "Blood group", value: unit.bloodGroup },
    { label: "Component", value: unit.component },
    { label: "Quantity", value: unit.quantity },
    { label: "Expiry", value: unit.expiresOn },
    { label: "Screening", value: <>{unit.screeningStatus}<br /><StatusBadge status={unit.status} /></> },
  ]} />);
  return (
    <>
      <MetricGrid metrics={[
        { label: "Donors", value: String(donors.length), hint: "Synthetic preview", icon: <Users className="h-5 w-5" />, tone: "primary" },
        { label: "Donation records", value: String(donations.length), hint: "Screening tracked", icon: <TestTube2 className="h-5 w-5" />, tone: "primary" },
        { label: "Available screened units", value: String(inventory.filter((unit) => unit.screeningStatus === "Passed").reduce((total, unit) => total + unit.quantity, 0)), hint: "Demo inventory", icon: <Archive className="h-5 w-5" />, tone: "success" },
        { label: "Pending blood requests", value: String(requests.filter((request) => request.status === "Pending").length), hint: "Synthetic preview", icon: <ClipboardList className="h-5 w-5" />, tone: "warning" },
      ]} />
      <Card>
        <CardHeader title="Blood donor list" subtitle="Synthetic donor details and eligibility status" />
        <DataTable label="Blood donors" headers={["Donor", "Blood group", "Last donation", "Eligibility"]}>{donorRows}</DataTable>
        <form className="grid gap-4 border-t border-slate-100 p-5 sm:grid-cols-3 dark:border-slate-800" onSubmit={onAddDonor}>
          <Field label="Donor name" required><input name="name" className={inputClass} required /></Field>
          <Field label="Blood group" required><select name="bloodGroup" className={inputClass} required>{["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"].map((group) => <option key={group}>{group}</option>)}</select></Field>
          <div className="self-end"><Button type="submit">Add demo donor</Button></div>
        </form>
      </Card>
      <Card>
        <CardHeader title="Donations and screening" subtitle="New donations remain quarantined until screening is recorded" />
        <form className="grid gap-4 border-b border-slate-100 p-5 sm:grid-cols-3 dark:border-slate-800" onSubmit={onRecordDonation}>
          <Field label="Donor" required><select name="donorId" className={inputClass} required defaultValue=""><option value="" disabled>Select donor</option>{donors.map((donor) => <option key={donor.id} value={donor.id}>{donor.id} — {donor.name}</option>)}</select></Field>
          <Field label="Donation units" required><input name="units" type="number" min="1" max="2" defaultValue="1" className={inputClass} required /></Field>
          <div className="self-end"><Button type="submit">Record donation</Button></div>
        </form>
        <DataTable label="Blood donations" headers={["Donation", "Donor / blood group", "Date / units", "Screening", "Status / action"]}>
          {donations.map((donation) => <TableRow key={donation.id} cells={[
            { label: "Donation", value: donation.id },
            { label: "Donor", value: <>{donors.find((donor) => donor.id === donation.donorId)?.name ?? donation.donorId}<br />{donation.bloodGroup}</> },
            { label: "Date", value: <>{donation.donatedAt}<br />{donation.units} unit(s)</> },
            { label: "Screening", value: <StatusBadge status={donation.screeningStatus} /> },
            { label: "Action", value: donation.screeningStatus === "Pending" ? <div className="flex gap-2"><Button size="sm" variant="success" onClick={() => onScreenDonation(donation.id, true)}>Pass screening</Button><Button size="sm" variant="danger" onClick={() => onScreenDonation(donation.id, false)}>Fail</Button></div> : donation.status },
          ]} />)}
        </DataTable>
      </Card>
      <Card>
        <CardHeader title="Blood group inventory" subtitle="Only screened units are eligible for a demonstration issue" />
        <DataTable label="Blood bank inventory" headers={["Unit", "Blood group", "Component", "Quantity", "Expiry", "Screening / status"]}>{inventoryRows}</DataTable>
      </Card>
      <Card>
        <CardHeader title="Blood requests and issue" subtitle="Demo issuing decrements local synthetic inventory only" />
        <form className="grid gap-4 border-b border-slate-100 p-5 sm:grid-cols-2 xl:grid-cols-4 dark:border-slate-800" onSubmit={onCreateRequest}>
          <Field label="Patient identifier" required><input name="patientId" className={inputClass} required /></Field>
          <Field label="Blood group" required><select name="bloodGroup" className={inputClass} required>{["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"].map((group) => <option key={group}>{group}</option>)}</select></Field>
          <Field label="Component" required><select name="component" className={inputClass} required><option>Packed red cells</option><option>Whole blood</option><option>Plasma</option><option>Platelets</option></select></Field>
          <Field label="Units requested" required><input name="unitsRequested" type="number" min="1" max="10" className={inputClass} required /></Field>
          <Field label="Requesting department" required><input name="requestedBy" className={inputClass} required /></Field>
          <Field label="Priority" required><select name="priority" className={inputClass} required><option>Routine</option><option>Urgent</option><option>Emergency</option></select></Field>
          <div className="self-end"><Button type="submit">Create blood request</Button></div>
        </form>
        <DataTable label="Blood requests" headers={["Request / patient", "Blood group / component", "Units / department", "Priority", "Status / action"]}>
          {requests.map((request) => <TableRow key={request.id} cells={[
            { label: "Request", value: <>{request.id}<br />{request.patientId}</> },
            { label: "Blood group", value: <>{request.bloodGroup}<br />{request.component}</> },
            { label: "Units", value: <>{request.unitsRequested}<br />{request.requestedBy}</> },
            { label: "Priority", value: request.priority },
            { label: "Status", value: <div className="space-y-2"><StatusBadge status={request.status} />{request.status === "Pending" ? <Button size="sm" onClick={() => onIssueRequest(request.id)}>Issue demo units</Button> : null}</div> },
          ]} />)}
        </DataTable>
      </Card>
      <Card>
        <CardHeader title="Transfusion records" subtitle="Recording is a synthetic workflow preview, not a clinical administration record" />
        <form className="grid gap-4 border-b border-slate-100 p-5 sm:grid-cols-3 dark:border-slate-800" onSubmit={onRecordTransfusion}>
          <Field label="Patient identifier" required><input name="patientId" className={inputClass} required /></Field>
          <Field label="Blood unit" required><select name="bloodUnitId" className={inputClass} required defaultValue=""><option value="" disabled>Select unit</option>{inventory.filter((unit) => unit.screeningStatus === "Passed").map((unit) => <option key={unit.id} value={unit.id}>{unit.id} — {unit.bloodGroup} ({unit.quantity})</option>)}</select></Field>
          <Field label="Administered by" required><input name="administeredBy" className={inputClass} required /></Field>
          <div className="self-end"><Button type="submit">Record demo transfusion</Button></div>
        </form>
        <DataTable label="Transfusion records" headers={["Record", "Patient", "Blood unit", "Started", "Administered by", "Status"]}>
          {transfusions.map((record) => <TableRow key={record.id} cells={[
            { label: "Record", value: record.id }, { label: "Patient", value: record.patientId }, { label: "Unit", value: record.bloodUnitId }, { label: "Started", value: record.startedAt }, { label: "Staff", value: record.administeredBy }, { label: "Status", value: <StatusBadge status={record.status} /> },
          ]} />)}
        </DataTable>
        {transfusions.length === 0 ? <p className="p-5 text-sm text-slate-500">No synthetic transfusion records in this session.</p> : null}
      </Card>
    </>
  );
}
