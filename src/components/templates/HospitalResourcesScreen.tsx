"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Ambulance, BedDouble, CheckCircle2, ClipboardList, LogOut, Plus, Wrench } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatCard, type StatTone } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DataTable, Field } from "./WorkspaceShared";
import type {
  AdmissionRecord,
  AmbulanceMaintenanceRecord,
  AmbulanceRecord,
  AmbulanceTrip,
  BedRecord,
  BedStatus,
  DischargeRecord,
  FacilityWorkflowSection,
  GeneralInventoryItem,
  HospitalAsset,
  MaintenanceRequest,
  OperatingRoomRecord,
  WardRecord,
} from "@/services/hospital-operations";

const facilityNavigation: Array<{ id: FacilityWorkflowSection; label: string }> = [
  { id: "inpatient", label: "Inpatient dashboard" },
  { id: "wards", label: "Wards" },
  { id: "beds", label: "Bed map" },
  { id: "admissions", label: "Admissions" },
  { id: "discharges", label: "Discharges" },
  { id: "operating-rooms", label: "Operating rooms" },
  { id: "ambulance", label: "Ambulance" },
  { id: "general-inventory", label: "General inventory" },
  { id: "assets", label: "Assets" },
  { id: "maintenance", label: "Maintenance" },
];

const initialWards: WardRecord[] = [
  { id: "WARD-MED", name: "Medical Ward", type: "Internal Medicine", capacity: 18, assignedStaff: ["Nurse Demo A", "Nurse Demo B"] },
  { id: "WARD-SURG", name: "Surgical Ward", type: "Surgery", capacity: 12, assignedStaff: ["Nurse Demo C", "Nurse Demo D"] },
  { id: "WARD-PED", name: "Pediatric Ward", type: "Pediatrics", capacity: 10, assignedStaff: ["Nurse Demo E"] },
];

const initialBeds: BedRecord[] = [
  { id: "MED-01", wardId: "WARD-MED", status: "Occupied", patientId: "GHMS-01042", patientName: "Synthetic patient A", history: ["Admitted for synthetic demo care"] },
  { id: "MED-02", wardId: "WARD-MED", status: "Available", history: [] },
  { id: "MED-03", wardId: "WARD-MED", status: "Reserved", history: ["Reserved for pending demo admission"] },
  { id: "MED-04", wardId: "WARD-MED", status: "Cleaning", history: ["Turnover cleaning started"] },
  { id: "MED-05", wardId: "WARD-MED", status: "Maintenance", history: ["Bed frame inspection"] },
  { id: "SUR-01", wardId: "WARD-SURG", status: "Occupied", patientId: "GHMS-01045", patientName: "Synthetic patient D", history: ["Transferred from emergency in demo"] },
  { id: "SUR-02", wardId: "WARD-SURG", status: "Available", history: [] },
  { id: "SUR-03", wardId: "WARD-SURG", status: "Available", history: [] },
  { id: "PED-01", wardId: "WARD-PED", status: "Occupied", patientId: "GHMS-01046", patientName: "Synthetic pediatric patient", history: ["Synthetic pediatric admission"] },
  { id: "PED-02", wardId: "WARD-PED", status: "Available", history: [] },
  { id: "PED-03", wardId: "WARD-PED", status: "Available", history: [] },
];

const initialAdmissions: AdmissionRecord[] = [
  { id: "ADM-6001", patientId: "GHMS-01042", patientName: "Synthetic patient A", doctor: "Dr. Hana Bekele", wardId: "WARD-MED", bedId: "MED-01", reason: "Synthetic demonstration admission", admittedAt: "Today, 07:10", status: "Admitted" },
  { id: "ADM-6002", patientId: "GHMS-01045", patientName: "Synthetic patient D", doctor: "Dr. Dawit Tadesse", wardId: "WARD-SURG", bedId: "SUR-01", reason: "Synthetic demonstration admission", admittedAt: "Today, 08:15", status: "Admitted" },
  { id: "ADM-6003", patientId: "GHMS-01047", patientName: "Synthetic patient E", doctor: "Dr. Selam Worku", wardId: "WARD-MED", bedId: "", reason: "Awaiting a bed assignment", admittedAt: "Today, 09:00", status: "Pending" },
];

const initialDischarges: DischargeRecord[] = [
  { id: "DIS-3001", patientId: "GHMS-01046", admissionId: "ADM-5998", finalDiagnosis: "Synthetic preview diagnosis", medicationInstructions: "See synthetic medication plan", followUpInstructions: "Return for follow-up", requestedAt: "Today, 09:10", authorizationStatus: "Pending authorization" },
];

const initialRooms: OperatingRoomRecord[] = [
  { id: "OR-1", name: "Operating Room 1", status: "Available" },
  { id: "OR-2", name: "Operating Room 2", status: "Scheduled", procedure: "Synthetic demo procedure", patientId: "GHMS-01045", scheduledAt: "Today, 11:00", surgicalTeam: "Demo team A" },
  { id: "OR-3", name: "Operating Room 3", status: "Maintenance" },
];

const initialAmbulances: AmbulanceRecord[] = [
  { id: "AMB-01", vehicleNumber: "GH-AMB-01", driver: "Demo Driver A", phone: "+251-900-100-001", status: "Available" },
  { id: "AMB-02", vehicleNumber: "GH-AMB-02", driver: "Demo Driver B", phone: "+251-900-100-002", status: "Dispatched" },
];

const initialTrips: AmbulanceTrip[] = [
  { id: "TRIP-100", ambulanceId: "AMB-02", destination: "Demo referral facility", patientId: "GHMS-01047", dispatchedAt: "Today, 08:30", status: "Dispatched" },
];

const initialFleetMaintenance: AmbulanceMaintenanceRecord[] = [
  { id: "AMNT-100", ambulanceId: "AMB-01", description: "Synthetic preventive vehicle inspection", requestedAt: "Today", status: "Completed" },
];

const initialInventory: GeneralInventoryItem[] = [
  { id: "INV-001", name: "Examination gloves", category: "Consumable", quantity: 240, unit: "boxes", location: "Central store", reorderLevel: 50 },
  { id: "INV-002", name: "Surgical masks", category: "Consumable", quantity: 18, unit: "boxes", location: "Central store", reorderLevel: 25 },
  { id: "INV-003", name: "Infusion pump", category: "Equipment", quantity: 4, unit: "units", location: "Medical Ward", reorderLevel: 1 },
];

const initialAssets: HospitalAsset[] = [
  { id: "AST-1001", name: "Patient monitor", category: "Clinical equipment", serialNumber: "DEMO-SN-1001", assignedDepartment: "ICU", location: "ICU Bay 1", condition: "Operational" },
  { id: "AST-1002", name: "Infusion pump", category: "Clinical equipment", serialNumber: "DEMO-SN-1002", assignedDepartment: "Medical Ward", location: "Store room", condition: "Needs maintenance" },
  { id: "AST-1003", name: "Wheelchair", category: "Mobility", serialNumber: "DEMO-SN-1003", assignedDepartment: "Outpatient", location: "OPD", condition: "Operational" },
];

const initialMaintenance: MaintenanceRequest[] = [
  { id: "MNT-9001", assetId: "AST-1002", description: "Demo preventive inspection", priority: "Routine", requestedAt: "Today", status: "Open" },
];

const inputClass = "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

function Row({ cells }: { cells: ReactNode[] }) {
  return <tr className="align-top text-slate-700 dark:text-slate-200">{cells.map((cell, index) => <td key={index} className="px-4 py-3">{cell}</td>)}</tr>;
}

function Notice({ children }: { children: ReactNode }) {
  return <p role="note" className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-200"><strong>Demonstration data only.</strong> {children}</p>;
}

export function HospitalResourcesScreen({ title, initialSection }: { title: string; initialSection: FacilityWorkflowSection }) {
  const [section, setSection] = useState(initialSection);
  const [beds, setBeds] = useState(initialBeds);
  const [admissions, setAdmissions] = useState(initialAdmissions);
  const [discharges, setDischarges] = useState(initialDischarges);
  const [rooms, setRooms] = useState(initialRooms);
  const [ambulances, setAmbulances] = useState(initialAmbulances);
  const [trips, setTrips] = useState(initialTrips);
  const [fleetMaintenance, setFleetMaintenance] = useState(initialFleetMaintenance);
  const [inventory, setInventory] = useState(initialInventory);
  const [assets, setAssets] = useState(initialAssets);
  const [maintenance, setMaintenance] = useState(initialMaintenance);
  const [feedback, setFeedback] = useState("");
  const [bedDetailsId, setBedDetailsId] = useState("");
  const [bedHistoryId, setBedHistoryId] = useState("");
  const [inventoryMovement, setInventoryMovement] = useState("");

  const occupiedByWard = useMemo(() => beds.reduce<Record<string, number>>((summary, bed) => {
    if (bed.status === "Occupied") summary[bed.wardId] = (summary[bed.wardId] ?? 0) + 1;
    return summary;
  }, {}), [beds]);

  function updateBedStatus(bed: BedRecord, status: BedStatus, note: string) {
    setBeds((current) => current.map((item) => item.id === bed.id ? {
      ...item,
      status,
      patientId: status === "Occupied" ? item.patientId : undefined,
      patientName: status === "Occupied" ? item.patientName : undefined,
      history: [`${new Date().toLocaleString()}: ${note}`, ...item.history],
    } : item));
  }

  function assignBed(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const bed = beds.find((item) => item.id === String(form.get("bedId")));
    const patientId = String(form.get("patientId") ?? "").trim();
    const patientName = String(form.get("patientName") ?? "").trim();
    if (!bed || bed.status !== "Available" || !patientId || !patientName) {
      setFeedback("Choose an available bed and provide a patient identifier and name.");
      return;
    }
    setBeds((current) => current.map((item) => item.id === bed.id ? { ...item, status: "Occupied", patientId, patientName, history: [`${new Date().toLocaleString()}: Assigned to ${patientId}`, ...item.history] } : item));
    setFeedback(`${bed.id} assigned to ${patientId} in demo data.`);
    event.currentTarget.reset();
  }

  function transferBed(bed: BedRecord) {
    const destination = beds.find((item) => item.status === "Available" && item.id !== bed.id);
    if (!destination || !bed.patientId) {
      setFeedback(destination ? "Only an occupied bed can be transferred." : "No available destination bed exists for this transfer.");
      return;
    }
    setBeds((current) => current.map((item) => {
      if (item.id === bed.id) {
        return { ...item, status: "Available", patientId: undefined, patientName: undefined, history: [`${new Date().toLocaleString()}: Transferred ${bed.patientId} to ${destination.id}`, ...item.history] };
      }
      if (item.id === destination.id) {
        return { ...item, status: "Occupied", patientId: bed.patientId, patientName: bed.patientName, history: [`${new Date().toLocaleString()}: Received transfer ${bed.patientId} from ${bed.id}`, ...item.history] };
      }
      return item;
    }));
    setAdmissions((current) => current.map((admission) => admission.bedId === bed.id ? { ...admission, bedId: destination.id, wardId: destination.wardId } : admission));
    setFeedback(`${bed.patientId} transferred from ${bed.id} to ${destination.id} in demo data.`);
  }

  function createAdmission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const wardId = String(form.get("wardId") ?? "");
    const bedId = String(form.get("bedId") ?? "");
    const status = String(form.get("status") ?? "Pending") as AdmissionRecord["status"];
    const bed = beds.find((item) => item.id === bedId && item.wardId === wardId);
    const patientId = String(form.get("patientId") ?? "").trim();
    const patientName = String(form.get("patientName") ?? "").trim();
    const doctor = String(form.get("doctor") ?? "").trim();
    const reason = String(form.get("reason") ?? "").trim();
    if (!patientId || !patientName || !doctor || !reason || (status === "Admitted" && (!bed || bed.status !== "Available"))) {
      setFeedback("Complete the admission fields and choose an available bed when registering an admitted patient.");
      return;
    }
    const admission: AdmissionRecord = {
      id: `ADM-${Date.now()}`, patientId, patientName, doctor, wardId, bedId: status === "Admitted" ? bedId : "", reason,
      admittedAt: String(form.get("admissionDate") ?? ""), status,
    };
    setAdmissions((current) => [admission, ...current]);
    if (status === "Admitted") {
      setBeds((current) => current.map((item) => item.id === bedId ? { ...item, status: "Occupied", patientId, patientName, history: [`${new Date().toLocaleString()}: Admission ${admission.id}`, ...item.history] } : item));
    }
    setFeedback(`Admission ${admission.id} registered in demo data.`);
    event.currentTarget.reset();
  }

  function requestDischarge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const admission = admissions.find((item) => item.id === String(form.get("admissionId")));
    const finalDiagnosis = String(form.get("finalDiagnosis") ?? "").trim();
    const medicationInstructions = String(form.get("medicationInstructions") ?? "").trim();
    const followUpInstructions = String(form.get("followUpInstructions") ?? "").trim();
    if (!admission || !finalDiagnosis || !medicationInstructions || !followUpInstructions) {
      setFeedback("Select an admission and complete diagnosis, medication and follow-up instructions.");
      return;
    }
    setDischarges((current) => [{
      id: `DIS-${Date.now()}`, patientId: admission.patientId, admissionId: admission.id, finalDiagnosis, medicationInstructions, followUpInstructions, requestedAt: new Date().toLocaleString(), authorizationStatus: "Pending authorization",
    }, ...current]);
    setFeedback("Discharge request saved in demo data and remains pending backend authorization.");
    event.currentTarget.reset();
  }

  function scheduleRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const roomId = String(form.get("roomId") ?? "");
    const room = rooms.find((item) => item.id === roomId);
    const procedure = String(form.get("procedure") ?? "").trim();
    const patientId = String(form.get("patientId") ?? "").trim();
    if (!room || room.status !== "Available" || !procedure || !patientId) {
      setFeedback("Select an available operating room and complete procedure and patient details.");
      return;
    }
    setRooms((current) => current.map((item) => item.id === roomId ? { ...item, status: "Scheduled", procedure, patientId, scheduledAt: String(form.get("scheduledAt") ?? ""), surgicalTeam: String(form.get("surgicalTeam") ?? "") } : item));
    setFeedback(`${room.name} scheduled in demo data.`);
    event.currentTarget.reset();
  }

  function addAmbulance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const vehicleNumber = String(form.get("vehicleNumber") ?? "").trim();
    const driver = String(form.get("driver") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    if (!vehicleNumber || !driver || !phone) {
      setFeedback("Vehicle number, driver and contact phone are required.");
      return;
    }
    setAmbulances((current) => [{ id: `AMB-${Date.now()}`, vehicleNumber, driver, phone, status: "Available" }, ...current]);
    setFeedback("Ambulance added to demonstration fleet.");
    event.currentTarget.reset();
  }

  function logAmbulanceMaintenance(ambulanceId: string) {
    setFleetMaintenance((current) => [{
      id: `AMNT-${Date.now()}`,
      ambulanceId,
      description: "Vehicle maintenance requested from fleet dashboard",
      requestedAt: new Date().toLocaleDateString(),
      status: "Open",
    }, ...current]);
    setAmbulances((current) => current.map((item) => item.id === ambulanceId ? { ...item, status: "Maintenance" } : item));
    setFeedback(`${ambulanceId} maintenance history entry opened.`);
  }

  function completeAmbulanceMaintenance(record: AmbulanceMaintenanceRecord) {
    setFleetMaintenance((current) => current.map((item) => item.id === record.id ? { ...item, status: "Completed" } : item));
    setAmbulances((current) => current.map((item) => item.id === record.ambulanceId ? { ...item, status: "Available" } : item));
    setFeedback(`${record.id} maintenance completed in demo data.`);
  }

  function dispatchAmbulance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const ambulance = ambulances.find((item) => item.id === String(form.get("ambulanceId")));
    const patientId = String(form.get("patientId") ?? "").trim();
    const destination = String(form.get("destination") ?? "").trim();
    if (!ambulance || ambulance.status !== "Available" || !patientId || !destination) {
      setFeedback("Select an available vehicle and provide a patient identifier and destination.");
      return;
    }
    const trip: AmbulanceTrip = { id: `TRIP-${Date.now()}`, ambulanceId: ambulance.id, destination, patientId, dispatchedAt: new Date().toLocaleString(), status: "Dispatched" };
    setTrips((current) => [trip, ...current]);
    setAmbulances((current) => current.map((item) => item.id === ambulance.id ? { ...item, status: "Dispatched" } : item));
    setFeedback(`${ambulance.vehicleNumber} dispatched in demo data.`);
    event.currentTarget.reset();
  }

  function updateTrip(trip: AmbulanceTrip, status: AmbulanceTrip["status"]) {
    setTrips((current) => current.map((item) => item.id === trip.id ? { ...item, status } : item));
    if (status === "Completed") setAmbulances((current) => current.map((item) => item.id === trip.ambulanceId ? { ...item, status: "Available" } : item));
    setFeedback(`${trip.id} marked ${status.toLowerCase()} in demo data.`);
  }

  function changeInventory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const itemId = String(form.get("itemId") ?? "");
    const item = inventory.find((entry) => entry.id === itemId);
    const quantity = Number(form.get("quantity") ?? 0);
    const movement = String(form.get("movement") ?? "");
    const destination = String(form.get("destination") ?? "").trim();
    if (!item || !Number.isInteger(quantity) || quantity < 1 || !destination || !["Receive", "Issue", "Transfer"].includes(movement)) {
      setFeedback("Select an item, movement type, positive quantity and destination or source.");
      return;
    }
    if (movement === "Issue" && item.quantity < quantity) {
      setFeedback("Issue quantity exceeds available stock.");
      return;
    }
    setInventory((current) => current.map((entry) => entry.id === itemId ? {
      ...entry,
      quantity: movement === "Receive" ? entry.quantity + quantity : movement === "Issue" ? entry.quantity - quantity : entry.quantity,
      location: movement === "Transfer" ? destination : entry.location,
    } : entry));
    setInventoryMovement(`${movement}: ${quantity} ${item.unit} of ${item.name} — ${movement === "Transfer" ? `moved to ${destination}` : movement === "Issue" ? `issued to ${destination}` : `received from ${destination}`}.`);
    setFeedback("Inventory movement recorded in demo data.");
    event.currentTarget.reset();
  }

  function addAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const serialNumber = String(form.get("serialNumber") ?? "").trim();
    const category = String(form.get("category") ?? "").trim();
    if (!name || !serialNumber || !category) {
      setFeedback("Asset name, category and serial number are required.");
      return;
    }
    setAssets((current) => [{ id: `AST-${Date.now()}`, name, category, serialNumber, assignedDepartment: String(form.get("department") ?? ""), location: String(form.get("location") ?? ""), condition: "Operational" }, ...current]);
    setFeedback("Asset registered in the current demonstration session.");
    event.currentTarget.reset();
  }

  function createMaintenance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const assetId = String(form.get("assetId") ?? "");
    const description = String(form.get("description") ?? "").trim();
    const asset = assets.find((item) => item.id === assetId);
    if (!asset || !description) {
      setFeedback("Select an asset and describe the maintenance request.");
      return;
    }
    const request: MaintenanceRequest = { id: `MNT-${Date.now()}`, assetId, description, priority: String(form.get("priority") ?? "Routine") as MaintenanceRequest["priority"], requestedAt: new Date().toLocaleDateString(), status: "Open" };
    setMaintenance((current) => [request, ...current]);
    setAssets((current) => current.map((item) => item.id === assetId ? { ...item, condition: "Needs maintenance" } : item));
    setFeedback("Maintenance request opened in demo data.");
    event.currentTarget.reset();
  }

  function renderSection() {
    switch (section) {
      case "inpatient": return <InpatientDashboard beds={beds} wards={initialWards} admissions={admissions} discharges={discharges} />;
      case "wards": return <WardSection wards={initialWards} beds={beds} occupancy={occupiedByWard} admissions={admissions} />;
      case "beds": return <BedMapSection beds={beds} wards={initialWards} detailsId={bedDetailsId} historyId={bedHistoryId} onDetails={setBedDetailsId} onHistory={setBedHistoryId} onUpdate={updateBedStatus} onTransfer={transferBed} onAssign={assignBed} />;
      case "admissions": return <AdmissionsSection admissions={admissions} beds={beds} wards={initialWards} onSubmit={createAdmission} />;
      case "discharges": return <DischargesSection discharges={discharges} admissions={admissions} onSubmit={requestDischarge} />;
      case "operating-rooms": return <OperatingRoomsSection rooms={rooms} onSubmit={scheduleRoom} onStatus={(room, status) => { setRooms((current) => current.map((item) => item.id === room.id ? { ...item, status, ...(status === "Available" ? { procedure: undefined, patientId: undefined, scheduledAt: undefined, surgicalTeam: undefined } : {}) } : item)); setFeedback(`${room.name} changed to ${status.toLowerCase()} in demo data.`); }} />;
      case "ambulance": return <AmbulanceSection ambulances={ambulances} trips={trips} maintenance={fleetMaintenance} onAdd={addAmbulance} onDispatch={dispatchAmbulance} onUpdateTrip={updateTrip} onMaintenance={logAmbulanceMaintenance} onCompleteMaintenance={completeAmbulanceMaintenance} />;
      case "general-inventory": return <GeneralInventorySection inventory={inventory} movement={inventoryMovement} onSubmit={changeInventory} />;
      case "assets": return <AssetsSection assets={assets} onSubmit={addAsset} />;
      case "maintenance": return <MaintenanceSection requests={maintenance} assets={assets} onSubmit={createMaintenance} onUpdate={(request, status) => { setMaintenance((current) => current.map((item) => item.id === request.id ? { ...item, status } : item)); if (status === "Completed") setAssets((current) => current.map((asset) => asset.id === request.assetId ? { ...asset, condition: "Operational" } : asset)); setFeedback(`${request.id} updated to ${status.toLowerCase()}.`); }} />;
    }
  }

  return <div className="space-y-6">
    <PageHeader title={title} description="Inpatient care, hospital facilities, fleet and resource workflows" />
    <Notice>Admissions, bed assignments, discharges, equipment, inventory and fleet actions are synthetic previews only and are not persisted to hospital systems.</Notice>
    <div className="flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Hospital operations">
      {facilityNavigation.map((item) => <button key={item.id} type="button" role="tab" aria-selected={section === item.id} onClick={() => { setSection(item.id); setFeedback(""); }} className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium ${section === item.id ? "bg-primary-600 text-white" : "border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"}`}>{item.label}</button>)}
    </div>
    {feedback ? <p role="status" className="rounded-lg border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-800 dark:border-primary-900 dark:bg-primary-950/30 dark:text-primary-200">{feedback}</p> : null}
    <div role="tabpanel" className="space-y-6">{renderSection()}</div>
  </div>;
}

function InpatientDashboard({ beds, wards, admissions, discharges }: { beds: BedRecord[]; wards: WardRecord[]; admissions: AdmissionRecord[]; discharges: DischargeRecord[] }) {
  const today = new Date().toDateString();
  const stats: Array<{ label: string; value: string; hint: string; icon: ReactNode; tone: StatTone }> = [
    { label: "Current admissions", value: String(admissions.filter((item) => item.status === "Admitted").length), hint: "Synthetic preview", icon: <BedDouble className="h-5 w-5" />, tone: "primary" },
    { label: "New admissions", value: String(admissions.filter((item) => item.admittedAt.startsWith("Today") || new Date(item.admittedAt).toDateString() === today).length), hint: "Demo estimate", icon: <Plus className="h-5 w-5" />, tone: "success" },
    { label: "Pending admissions", value: String(admissions.filter((item) => item.status === "Pending").length), hint: "Awaiting bed assignment", icon: <ClipboardList className="h-5 w-5" />, tone: "warning" },
    { label: "Expected discharges", value: String(discharges.filter((item) => item.authorizationStatus === "Pending authorization").length), hint: "Synthetic estimate", icon: <LogOut className="h-5 w-5" />, tone: "warning" },
    { label: "Occupied beds", value: String(beds.filter((item) => item.status === "Occupied").length), hint: "Across demo wards", icon: <BedDouble className="h-5 w-5" />, tone: "danger" },
    { label: "Available beds", value: String(beds.filter((item) => item.status === "Available").length), hint: `Capacity ${wards.reduce((sum, ward) => sum + ward.capacity, 0)}`, icon: <CheckCircle2 className="h-5 w-5" />, tone: "success" },
  ];
  return <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{stats.map((item) => <StatCard key={item.label} {...item} />)}</div><Card><CardHeader title="Inpatient overview" subtitle="Ward-level occupancy and current admissions" /><div className="grid gap-4 p-5 md:grid-cols-3">{wards.map((ward) => { const occupied = beds.filter((bed) => bed.wardId === ward.id && bed.status === "Occupied").length; return <div key={ward.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><div className="flex justify-between"><h3 className="font-semibold">{ward.name}</h3><span className="text-sm">{occupied}/{ward.capacity}</span></div><div className="mt-3 h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-primary-600" style={{ width: `${Math.min(100, occupied / ward.capacity * 100)}%` }} /></div><p className="mt-2 text-xs text-slate-500">{ward.type} · {ward.assignedStaff.length} assigned staff</p></div>; })}</div></Card></>;
}

function WardSection({ wards, beds, occupancy, admissions }: { wards: WardRecord[]; beds: BedRecord[]; occupancy: Record<string, number>; admissions: AdmissionRecord[] }) {
  const [selected, setSelected] = useState<WardRecord | null>(null);
  return <><Card><CardHeader title="Ward directory" subtitle="Ward capacity, assigned staff and occupancy" /><DataTable label="Hospital wards" headers={["Ward", "Department / type", "Capacity", "Occupied / available", "Assigned staff", "Patients / details"]}>{wards.map((ward) => <Row key={ward.id} cells={[<>{ward.name}<br />{ward.id}</>, ward.type, ward.capacity, `${occupancy[ward.id] ?? 0} / ${Math.max(0, ward.capacity - (occupancy[ward.id] ?? 0))}`, ward.assignedStaff.join(", "), <Button size="sm" variant="secondary" onClick={() => setSelected(selected?.id === ward.id ? null : ward)}>View ward</Button>]} />)}</DataTable></Card>{selected?<Card><CardHeader title={`${selected.name} details`} subtitle={`Assigned staff: ${selected.assignedStaff.join(", ")}`} actions={<Button variant="ghost" size="sm" onClick={()=>setSelected(null)}>Close</Button>} /><DataTable label={`${selected.name} patients`} headers={["Patient", "Bed", "Admission", "Status"]}>{beds.filter((bed)=>bed.wardId===selected.id).map((bed)=><Row key={bed.id} cells={[bed.patientName?`${bed.patientName} (${bed.patientId})`:"No patient assigned",bed.id,admissions.find((admission)=>admission.bedId===bed.id)?.id??"—",<StatusBadge status={bed.status}/>]} />)}</DataTable></Card>:null}</>;
}

function BedMapSection({ beds, wards, detailsId, historyId, onDetails, onHistory, onUpdate, onTransfer, onAssign }: { beds: BedRecord[]; wards: WardRecord[]; detailsId: string; historyId: string; onDetails: (id: string) => void; onHistory: (id: string) => void; onUpdate: (bed: BedRecord, status: BedStatus, note: string) => void; onTransfer: (bed: BedRecord) => void; onAssign: (event: FormEvent<HTMLFormElement>) => void }) {
  const colors: Record<BedStatus, string> = { Available: "border-green-300 bg-green-50 dark:bg-green-950/30", Occupied: "border-red-300 bg-red-50 dark:bg-red-950/30", Reserved: "border-amber-300 bg-amber-50 dark:bg-amber-950/30", Cleaning: "border-sky-300 bg-sky-50 dark:bg-sky-950/30", Maintenance: "border-slate-400 bg-slate-100 dark:bg-slate-900" };
  const selectedBed = beds.find((bed) => bed.id === detailsId);
  const selectedHistory = beds.find((bed) => bed.id === historyId);
  return (
    <>
      <Card>
        <CardHeader title="Visual bed map" subtitle="Status key: available, occupied, reserved, cleaning and maintenance" />
        <div className="space-y-6 p-5">
          {wards.map((ward) => (
            <section key={ward.id} aria-label={ward.name}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">{ward.name}</h3>
                <span className="text-sm text-slate-500">{beds.filter((bed) => bed.wardId === ward.id && bed.status === "Occupied").length}/{ward.capacity} occupied</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {beds.filter((bed) => bed.wardId === ward.id).map((bed) => (
                  <article key={bed.id} className={`rounded-xl border p-4 ${colors[bed.status]}`}>
                    <div className="flex items-center justify-between"><strong>{bed.id}</strong><StatusBadge status={bed.status} /></div>
                    <p className="mt-2 min-h-5 text-sm">{bed.patientId ?? "No assigned patient"}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {bed.status === "Available" ? <Button size="sm" onClick={() => onDetails(bed.id)}>Assign</Button> : null}
                      {bed.status === "Occupied" ? <>
                        <Button size="sm" variant="secondary" onClick={() => onUpdate(bed, "Cleaning", "Released; cleaning required")}>Release</Button>
                        <Button size="sm" variant="secondary" onClick={() => onTransfer(bed)}>Transfer</Button>
                      </> : null}
                      {bed.status === "Cleaning" ? <Button size="sm" variant="success" onClick={() => onUpdate(bed, "Available", "Cleaning completed")}>Finish cleaning</Button> : null}
                      {bed.status === "Maintenance" ? <Button size="sm" variant="secondary" onClick={() => onUpdate(bed, "Available", "Maintenance cleared")}>Complete maintenance</Button> : null}
                      <Button size="sm" variant="ghost" onClick={() => onDetails(bed.id)}>View patient</Button>
                      <Button size="sm" variant="ghost" onClick={() => onHistory(bed.id)}>History</Button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </Card>
      {detailsId ? <Card>
        <CardHeader title={`Bed details — ${detailsId}`} subtitle="Patient assignment and transfer history" actions={<Button size="sm" variant="ghost" onClick={() => onDetails("")}>Close</Button>} />
        <div className="p-5 text-sm">
          {selectedBed ? <>
            <p><strong>Status:</strong> {selectedBed.status}</p>
            <p><strong>Patient:</strong> {selectedBed.patientName ?? "No patient assigned"} {selectedBed.patientId ? `(${selectedBed.patientId})` : ""}</p>
            {selectedBed.status === "Available" ? <form className="mt-4 grid gap-3 sm:grid-cols-3" onSubmit={onAssign}>
              <input type="hidden" name="bedId" value={selectedBed.id} />
              <Field label="Patient identifier"><input name="patientId" className={inputClass} required /></Field>
              <Field label="Patient name"><input name="patientName" className={inputClass} required /></Field>
              <div className="self-end"><Button type="submit">Assign bed</Button></div>
            </form> : null}
          </> : <p>Bed not found.</p>}
        </div>
      </Card> : null}
      {historyId ? <Card>
        <CardHeader title={`Bed history — ${historyId}`} actions={<Button size="sm" variant="ghost" onClick={() => onHistory("")}>Close</Button>} />
        <ul className="list-disc space-y-2 p-6 pl-10 text-sm">{selectedHistory?.history.map((event, index) => <li key={`${event}-${index}`}>{event}</li>)}</ul>
      </Card> : null}
    </>
  );
}

function AdmissionsSection({ admissions, beds, wards, onSubmit }: { admissions: AdmissionRecord[]; beds: BedRecord[]; wards: WardRecord[]; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const [wardId, setWardId] = useState("");
  const [admissionStatus, setAdmissionStatus] = useState<"Pending" | "Admitted">("Pending");
  return <><Card><CardHeader title="Admissions" subtitle="Patient, doctor, ward, bed, reason, date and status" /><DataTable label="Admissions" headers={["Admission / patient", "Doctor", "Ward / bed", "Reason", "Date", "Status"]}>{admissions.map((item)=><Row key={item.id} cells={[<>{item.id}<br />{item.patientId} · {item.patientName}</>,item.doctor,<>{wards.find((ward)=>ward.id===item.wardId)?.name??item.wardId}<br />{item.bedId||"Not assigned"}</>,item.reason,item.admittedAt,<StatusBadge status={item.status}/>]} />)}</DataTable></Card><Card><CardHeader title="Register admission" subtitle="Demo registration; bed assignment is only recorded in local state" /><form className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3" onSubmit={onSubmit}><Field label="Patient identifier"><input name="patientId" className={inputClass} required/></Field><Field label="Patient name"><input name="patientName" className={inputClass} required/></Field><Field label="Doctor"><input name="doctor" className={inputClass} required/></Field><Field label="Ward"><select name="wardId" className={inputClass} required value={wardId} onChange={(event)=>setWardId(event.target.value)}><option value="" disabled>Select ward</option>{wards.map((ward)=><option key={ward.id} value={ward.id}>{ward.name}</option>)}</select></Field><Field label="Available bed"><select name="bedId" className={inputClass} required={admissionStatus==="Admitted"} defaultValue=""><option value="">No bed assignment</option>{beds.filter((bed)=>bed.wardId===wardId&&bed.status==="Available").map((bed)=><option key={bed.id} value={bed.id}>{bed.id}</option>)}</select></Field><Field label="Admission status"><select name="status" className={inputClass} value={admissionStatus} onChange={(event)=>setAdmissionStatus(event.target.value as "Pending"|"Admitted")}><option>Pending</option><option>Admitted</option></select></Field><Field label="Admission reason"><input name="reason" className={inputClass} required/></Field><Field label="Admission date"><input name="admissionDate" type="datetime-local" className={inputClass} required/></Field><div className="self-end"><Button type="submit">Register demo admission</Button></div></form></Card></>;
}

function DischargesSection({ discharges, admissions, onSubmit }: { discharges: DischargeRecord[]; admissions: AdmissionRecord[]; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <><Notice>Discharge authorization is a backend decision. This preview can request discharge and prepare a summary, but cannot authorize or finalize one.</Notice><Card><CardHeader title="Discharge requests and summaries" subtitle="Diagnosis, medication and follow-up instructions" /><DataTable label="Discharges" headers={["Request / admission", "Patient", "Final diagnosis", "Medication instructions", "Follow-up", "Authorization"]}>{discharges.map((item)=><Row key={item.id} cells={[<>{item.id}<br />{item.admissionId}</>,item.patientId,item.finalDiagnosis,item.medicationInstructions,item.followUpInstructions,<div className="space-y-2"><StatusBadge status={item.authorizationStatus}/><br/><Button size="sm" variant="secondary" disabled title="Backend authorization required">Authorize discharge</Button></div>]} />)}</DataTable></Card><Card><CardHeader title="Request discharge" subtitle="Creates a draft discharge summary pending authorized review" /><form className="grid gap-4 p-5 sm:grid-cols-2" onSubmit={onSubmit}><Field label="Admission / patient"><select name="admissionId" className={inputClass} required defaultValue=""><option value="" disabled>Select current admission</option>{admissions.filter((item)=>item.status==="Admitted").map((item)=><option key={item.id} value={item.id}>{item.id} — {item.patientId}</option>)}</select></Field><Field label="Final diagnosis"><textarea name="finalDiagnosis" className={inputClass} rows={2} required/></Field><Field label="Medication instructions"><textarea name="medicationInstructions" className={inputClass} rows={2} required/></Field><Field label="Follow-up instructions"><textarea name="followUpInstructions" className={inputClass} rows={2} required/></Field><div className="self-end"><Button type="submit">Save discharge request</Button></div></form></Card></>;
}

function OperatingRoomsSection({ rooms, onSubmit, onStatus }: { rooms: OperatingRoomRecord[]; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onStatus: (room: OperatingRoomRecord, status: OperatingRoomRecord["status"]) => void }) {
  return <><Card><CardHeader title="Operating rooms and schedule" subtitle="Room status, procedure, schedule and assigned surgical team" /><DataTable label="Operating rooms" headers={["Room", "Status", "Procedure / patient", "Schedule", "Surgical team", "Actions"]}>{rooms.map((room)=><Row key={room.id} cells={[<>{room.name}<br />{room.id}</>,<StatusBadge status={room.status}/>,<>{room.procedure??"No procedure"}<br />{room.patientId??""}</>,room.scheduledAt??"—",room.surgicalTeam??"—",<div className="flex flex-wrap gap-2">{room.status==="Scheduled"?<><Button size="sm" onClick={()=>onStatus(room,"In use")}>Start procedure</Button><Button size="sm" variant="secondary" onClick={()=>onStatus(room,"Cleaning")}>Mark cleaning</Button></>:null}{room.status==="In use"?<Button size="sm" variant="secondary" onClick={()=>onStatus(room,"Cleaning")}>Complete procedure</Button>:null}{room.status==="Cleaning"?<Button size="sm" variant="success" onClick={()=>onStatus(room,"Available")}>Finish cleaning</Button>:null}{room.status==="Available"?<Button size="sm" variant="secondary" onClick={()=>onStatus(room,"Maintenance")}>Maintenance</Button>:null}{room.status==="Maintenance"?<Button size="sm" variant="success" onClick={()=>onStatus(room,"Available")}>Clear maintenance</Button>:null}</div>]} />)}</DataTable></Card><Card><CardHeader title="Schedule procedure" subtitle="Only available rooms may be booked" /><form className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3" onSubmit={onSubmit}><Field label="Operating room"><select name="roomId" className={inputClass} required defaultValue=""><option value="" disabled>Select room</option>{rooms.filter((room)=>room.status==="Available").map((room)=><option key={room.id} value={room.id}>{room.name}</option>)}</select></Field><Field label="Patient identifier"><input name="patientId" className={inputClass} required/></Field><Field label="Procedure"><input name="procedure" className={inputClass} required/></Field><Field label="Date and time"><input name="scheduledAt" type="datetime-local" className={inputClass} required/></Field><Field label="Surgical team"><input name="surgicalTeam" className={inputClass} required/></Field><div className="self-end"><Button type="submit">Schedule demo procedure</Button></div></form></Card></>;
}

function AmbulanceSection({
  ambulances,
  trips,
  maintenance,
  onAdd,
  onDispatch,
  onUpdateTrip,
  onMaintenance,
  onCompleteMaintenance,
}: {
  ambulances: AmbulanceRecord[];
  trips: AmbulanceTrip[];
  maintenance: AmbulanceMaintenanceRecord[];
  onAdd: (event: FormEvent<HTMLFormElement>) => void;
  onDispatch: (event: FormEvent<HTMLFormElement>) => void;
  onUpdateTrip: (trip: AmbulanceTrip, status: AmbulanceTrip["status"]) => void;
  onMaintenance: (id: string) => void;
  onCompleteMaintenance: (record: AmbulanceMaintenanceRecord) => void;
}) {
  return <>
    <Card>
      <CardHeader title="Ambulance fleet" subtitle="Vehicle, driver and availability status" />
      <DataTable label="Ambulance fleet" headers={["Vehicle", "Driver", "Phone", "Availability", "Actions"]}>
        {ambulances.map((vehicle) => <Row key={vehicle.id} cells={[
          <>{vehicle.vehicleNumber}<br />{vehicle.id}</>,
          vehicle.driver,
          vehicle.phone,
          <StatusBadge status={vehicle.status} />,
          vehicle.status !== "Maintenance" ? <Button size="sm" variant="secondary" onClick={() => onMaintenance(vehicle.id)}>Log maintenance</Button> : "Maintenance in progress",
        ]} />)}
      </DataTable>
      <form className="grid gap-4 border-t border-slate-100 p-5 sm:grid-cols-3 dark:border-slate-800" onSubmit={onAdd}>
        <Field label="Vehicle number"><input name="vehicleNumber" className={inputClass} required /></Field>
        <Field label="Driver"><input name="driver" className={inputClass} required /></Field>
        <Field label="Driver phone"><input name="phone" className={inputClass} required /></Field>
        <div className="self-end"><Button type="submit">Register ambulance</Button></div>
      </form>
    </Card>
    <Card>
      <CardHeader title="Dispatch requests and trip records" subtitle="Dispatch available vehicles and close completed trips" />
      <form className="grid gap-4 border-b border-slate-100 p-5 sm:grid-cols-3 dark:border-slate-800" onSubmit={onDispatch}>
        <Field label="Available ambulance"><select name="ambulanceId" className={inputClass} required defaultValue=""><option value="" disabled>Select vehicle</option>{ambulances.filter((item) => item.status === "Available").map((item) => <option key={item.id} value={item.id}>{item.vehicleNumber} — {item.driver}</option>)}</select></Field>
        <Field label="Patient identifier"><input name="patientId" className={inputClass} required /></Field>
        <Field label="Destination"><input name="destination" className={inputClass} required /></Field>
        <div className="self-end"><Button type="submit"><Ambulance className="mr-2 h-4 w-4" />Dispatch request</Button></div>
      </form>
      <DataTable label="Ambulance trips" headers={["Trip", "Vehicle", "Patient", "Destination", "Dispatched", "Status / action"]}>
        {trips.map((trip) => <Row key={trip.id} cells={[
          trip.id,
          ambulances.find((item) => item.id === trip.ambulanceId)?.vehicleNumber ?? trip.ambulanceId,
          trip.patientId,
          trip.destination,
          trip.dispatchedAt,
          <div className="space-y-2"><StatusBadge status={trip.status} />{trip.status === "Dispatched" ? <Button size="sm" variant="success" onClick={() => onUpdateTrip(trip, "Completed")}>Complete trip</Button> : null}</div>,
        ]} />)}
      </DataTable>
    </Card>
    <Card>
      <CardHeader title="Ambulance maintenance history" subtitle="Vehicle inspection, repair status and availability" />
      <DataTable label="Ambulance maintenance history" headers={["Request", "Vehicle", "Description", "Requested", "Status / action"]}>
        {maintenance.map((record) => <Row key={record.id} cells={[
          record.id,
          ambulances.find((item) => item.id === record.ambulanceId)?.vehicleNumber ?? record.ambulanceId,
          record.description,
          record.requestedAt,
          <div className="space-y-2"><StatusBadge status={record.status} />{record.status !== "Completed" ? <Button size="sm" variant="success" onClick={() => onCompleteMaintenance(record)}>Complete maintenance</Button> : null}</div>,
        ]} />)}
      </DataTable>
    </Card>
  </>;
}

function GeneralInventorySection({ inventory, movement, onSubmit }: { inventory: GeneralInventoryItem[]; movement: string; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <><Card><CardHeader title="General inventory" subtitle="Consumables and equipment with locations and reorder levels" /><DataTable label="General inventory" headers={["Item", "Category", "Quantity", "Unit", "Location", "Reorder level"]}>{inventory.map((item)=><Row key={item.id} cells={[<>{item.name}<br />{item.id}</>,item.category,item.quantity,item.unit,item.location,item.reorderLevel]} />)}</DataTable></Card><Card><CardHeader title="Receive, issue or transfer stock" subtitle="Quantity checks are applied to synthetic stock" /><form className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4" onSubmit={onSubmit}><Field label="Inventory item"><select name="itemId" className={inputClass} required defaultValue=""><option value="" disabled>Select item</option>{inventory.map((item)=><option key={item.id} value={item.id}>{item.name} ({item.quantity} {item.unit})</option>)}</select></Field><Field label="Movement"><select name="movement" className={inputClass} required><option>Receive</option><option>Issue</option><option>Transfer</option></select></Field><Field label="Quantity"><input name="quantity" type="number" min="1" className={inputClass} required/></Field><Field label="Source / destination"><input name="destination" className={inputClass} required/></Field><div className="self-end"><Button type="submit">Record stock movement</Button></div></form>{movement?<p role="status" className="mx-5 mb-5 rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950/30 dark:text-green-200">{movement}</p>:null}</Card></>;
}

function AssetsSection({ assets, onSubmit }: { assets: HospitalAsset[]; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <><Card><CardHeader title="Hospital asset register" subtitle="Equipment assignment, location and condition tracking" /><DataTable label="Hospital assets" headers={["Asset / serial", "Category", "Department", "Location", "Condition"]}>{assets.map((asset)=><Row key={asset.id} cells={[<>{asset.name}<br />{asset.id} · {asset.serialNumber}</>,asset.category,asset.assignedDepartment,asset.location,<StatusBadge status={asset.condition} variant={asset.condition==="Operational"?"success":asset.condition==="Needs maintenance"?"warning":"danger"}/>]} />)}</DataTable></Card><Card><CardHeader title="Register asset" subtitle="Synthetic equipment record" /><form className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3" onSubmit={onSubmit}>{[["name","Asset name"],["category","Category"],["serialNumber","Serial number"],["department","Assigned department"],["location","Location"]].map(([name,label])=><Field key={name} label={label}><input name={name} className={inputClass} required/></Field>)}<div className="self-end"><Button type="submit">Register demo asset</Button></div></form></Card></>;
}

function MaintenanceSection({ requests, assets, onSubmit, onUpdate }: { requests: MaintenanceRequest[]; assets: HospitalAsset[]; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onUpdate: (request: MaintenanceRequest, status: MaintenanceRequest["status"]) => void }) {
  return <><Card><CardHeader title="Maintenance requests and history" subtitle="Track equipment service requests from intake through completion" /><DataTable label="Maintenance requests" headers={["Request / asset", "Description", "Priority", "Requested", "Status / action"]}>{requests.map((request)=><Row key={request.id} cells={[<>{request.id}<br />{assets.find((item)=>item.id===request.assetId)?.name??request.assetId}</>,request.description,<StatusBadge status={request.priority} variant={request.priority==="Critical"?"danger":request.priority==="Urgent"?"warning":"neutral"}/>,request.requestedAt,<div className="space-y-2"><StatusBadge status={request.status}/>{request.status==="Open"?<Button size="sm" onClick={()=>onUpdate(request,"In progress")}>Start maintenance</Button>:null}{request.status==="In progress"?<Button size="sm" variant="success" onClick={()=>onUpdate(request,"Completed")}>Complete maintenance</Button>:null}</div>]} />)}</DataTable></Card><Card><CardHeader title="Create maintenance request" subtitle="Creates an open request and marks the asset as needing service" /><form className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4" onSubmit={onSubmit}><Field label="Asset"><select name="assetId" className={inputClass} required defaultValue=""><option value="" disabled>Select asset</option>{assets.map((asset)=><option key={asset.id} value={asset.id}>{asset.name} — {asset.id}</option>)}</select></Field><Field label="Description"><input name="description" className={inputClass} required/></Field><Field label="Priority"><select name="priority" className={inputClass}><option>Routine</option><option>Urgent</option><option>Critical</option></select></Field><div className="self-end"><Button type="submit"><Wrench className="mr-2 h-4 w-4"/>Create request</Button></div></form></Card></>;
}
