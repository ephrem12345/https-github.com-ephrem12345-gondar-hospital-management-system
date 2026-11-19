"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Archive, ClipboardList, Package, Pill, Plus, Printer, ShoppingCart } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatCard, type StatTone } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DataTable, Field, inputClass } from "./WorkspaceShared";
import type {
  DispensingRecord,
  MedicineBatch,
  MedicineRecord,
  PharmacyPrescription,
  PharmacySupplier,
  PharmacyWorkflowSection,
  ProcurementRecord,
  PrescriptionMedicine,
} from "@/services/hospital-operations";

const pharmacyNavigation: Array<{ id: PharmacyWorkflowSection; label: string }> = [
  { id: "dashboard", label: "Pharmacy dashboard" },
  { id: "medicines", label: "Medicines" },
  { id: "batches", label: "Batch management" },
  { id: "prescriptions", label: "Prescriptions" },
  { id: "dispensing", label: "Dispensing" },
  { id: "suppliers", label: "Suppliers" },
  { id: "procurement", label: "Procurement" },
];

function dateOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

const initialMedicines: MedicineRecord[] = [
  { id: "MED-001", genericName: "Paracetamol", brandName: "Panadol", category: "Analgesic", strength: "500 mg", dosageForm: "Tablet", manufacturer: "Demo Pharma", unit: "tablet", price: 2.5, reorderLevel: 100 },
  { id: "MED-002", genericName: "Amoxicillin", brandName: "Amoxil", category: "Antibiotic", strength: "500 mg", dosageForm: "Capsule", manufacturer: "Demo Pharma", unit: "capsule", price: 5, reorderLevel: 80 },
  { id: "MED-003", genericName: "Metformin", brandName: "Glucophage", category: "Antidiabetic", strength: "500 mg", dosageForm: "Tablet", manufacturer: "Demo Pharma", unit: "tablet", price: 3, reorderLevel: 120 },
  { id: "MED-004", genericName: "Salbutamol", brandName: "Ventolin", category: "Respiratory", strength: "100 mcg", dosageForm: "Inhaler", manufacturer: "Demo Pharma", unit: "inhaler", price: 75, reorderLevel: 20 },
];

const initialBatches: MedicineBatch[] = [
  { id: "BAT-1001", medicineId: "MED-001", medicineName: "Paracetamol 500 mg", batchNumber: "PAR-26-01", quantity: 240, purchaseDate: dateOffset(-90), expiryDate: dateOffset(240), supplier: "Demo Medical Supply", storageLocation: "Pharmacy shelf A1" },
  { id: "BAT-1002", medicineId: "MED-002", medicineName: "Amoxicillin 500 mg", batchNumber: "AMX-26-02", quantity: 54, purchaseDate: dateOffset(-65), expiryDate: dateOffset(14), supplier: "Demo Medical Supply", storageLocation: "Pharmacy shelf B2" },
  { id: "BAT-1003", medicineId: "MED-003", medicineName: "Metformin 500 mg", batchNumber: "MET-25-04", quantity: 3, purchaseDate: dateOffset(-300), expiryDate: dateOffset(-5), supplier: "Demo Health Distributor", storageLocation: "Quarantine cabinet" },
  { id: "BAT-1004", medicineId: "MED-004", medicineName: "Salbutamol 100 mcg", batchNumber: "SAL-26-01", quantity: 15, purchaseDate: dateOffset(-20), expiryDate: dateOffset(300), supplier: "Demo Health Distributor", storageLocation: "Cold storage 1" },
];

const initialPrescriptions: PharmacyPrescription[] = [
  { id: "RX-8101", patientId: "GHMS-01042", patientName: "Synthetic patient A", doctor: "Dr. Hana Bekele", issuedAt: "Today, 08:20", dispensingStatus: "Pending", items: [{ medicineId: "MED-001", medicineName: "Paracetamol 500 mg", dosage: "1 tablet", frequency: "Every 8 hours", duration: "3 days", instructions: "Take after meals", quantity: 9, dispensedQuantity: 0 }] },
  { id: "RX-8102", patientId: "GHMS-01044", patientName: "Synthetic patient B", doctor: "Dr. Dawit Tadesse", issuedAt: "Today, 09:00", dispensingStatus: "Partial", items: [{ medicineId: "MED-002", medicineName: "Amoxicillin 500 mg", dosage: "1 capsule", frequency: "Every 8 hours", duration: "5 days", instructions: "Complete the course", quantity: 15, dispensedQuantity: 5 }] },
  { id: "RX-8103", patientId: "GHMS-01046", patientName: "Synthetic patient C", doctor: "Dr. Selam Worku", issuedAt: "Yesterday", dispensingStatus: "Dispensed", items: [{ medicineId: "MED-003", medicineName: "Metformin 500 mg", dosage: "1 tablet", frequency: "Twice daily", duration: "30 days", instructions: "Take with food", quantity: 60, dispensedQuantity: 60 }] },
];

const initialSuppliers: PharmacySupplier[] = [
  { id: "SUP-010", name: "Demo Medical Supply", contactName: "Demo contact A", phone: "+251-900-000-101", email: "supply@example.invalid", address: "Gondar", status: "Active" },
  { id: "SUP-011", name: "Demo Health Distributor", contactName: "Demo contact B", phone: "+251-900-000-102", email: "distribution@example.invalid", address: "Amhara region", status: "Active" },
];

const initialProcurement: ProcurementRecord[] = [
  { id: "PR-7001", supplierId: "SUP-010", supplierName: "Demo Medical Supply", medicineName: "Paracetamol 500 mg", quantity: 500, requestedAt: "Today", status: "Purchase order" },
];

function Row({ cells }: { cells: ReactNode[] }) {
  return <tr className="align-top text-slate-700 dark:text-slate-200">{cells.map((cell, index) => <td key={index} className="px-4 py-3">{cell}</td>)}</tr>;
}

function Notice({ children }: { children: ReactNode }) {
  return <p role="note" className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-200"><strong>Demonstration data only.</strong> {children}</p>;
}

export function PharmacyManagementScreen({
  title,
  initialSection,
}: {
  title: string;
  initialSection: PharmacyWorkflowSection;
}) {
  const [section, setSection] = useState(initialSection);
  const [medicines, setMedicines] = useState(initialMedicines);
  const [batches, setBatches] = useState(initialBatches);
  const [prescriptions, setPrescriptions] = useState(initialPrescriptions);
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [procurement, setProcurement] = useState(initialProcurement);
  const [dispensing, setDispensing] = useState<DispensingRecord[]>([]);
  const [selectedPrescription, setSelectedPrescription] = useState<PharmacyPrescription | null>(null);
  const [receipt, setReceipt] = useState<DispensingRecord | null>(null);
  const [feedback, setFeedback] = useState("");

  const batchesByMedicine = useMemo(() => batches.reduce<Record<string, number>>((summary, batch) => {
    summary[batch.medicineId] = (summary[batch.medicineId] ?? 0) + batch.quantity;
    return summary;
  }, {}), [batches]);

  function addMedicine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const medicine: MedicineRecord = {
      id: `MED-${Date.now()}`,
      genericName: String(form.get("genericName") ?? "").trim(),
      brandName: String(form.get("brandName") ?? "").trim(),
      category: String(form.get("category") ?? ""),
      strength: String(form.get("strength") ?? ""),
      dosageForm: String(form.get("dosageForm") ?? ""),
      manufacturer: String(form.get("manufacturer") ?? ""),
      unit: String(form.get("unit") ?? ""),
      price: Number(form.get("price") ?? 0),
      reorderLevel: Number(form.get("reorderLevel") ?? 0),
    };
    if (!medicine.genericName || !medicine.category || !medicine.strength || !medicine.dosageForm || !medicine.manufacturer || !medicine.unit || medicine.price < 0 || medicine.reorderLevel < 0) {
      setFeedback("Complete all required medicine fields using non-negative price and reorder values.");
      return;
    }
    setMedicines((current) => [medicine, ...current]);
    setFeedback("Medicine added to the current demonstration session.");
    event.currentTarget.reset();
  }

  function addBatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const medicineId = String(form.get("medicineId") ?? "");
    const medicine = medicines.find((item) => item.id === medicineId);
    const quantity = Number(form.get("quantity") ?? 0);
    const batchNumber = String(form.get("batchNumber") ?? "").trim();
    if (!medicine || !batchNumber || !Number.isInteger(quantity) || quantity < 1) {
      setFeedback("Select a medicine and enter a batch number and positive whole-number quantity.");
      return;
    }
    const batch: MedicineBatch = {
      id: `BAT-${Date.now()}`,
      medicineId: medicine.id,
      medicineName: `${medicine.genericName} ${medicine.strength}`,
      batchNumber,
      quantity,
      purchaseDate: String(form.get("purchaseDate") ?? ""),
      expiryDate: String(form.get("expiryDate") ?? ""),
      supplier: String(form.get("supplier") ?? ""),
      storageLocation: String(form.get("storageLocation") ?? ""),
    };
    setBatches((current) => [batch, ...current]);
    setFeedback(`Batch ${batchNumber} added to demonstration inventory.`);
    event.currentTarget.reset();
  }

  function addPrescription(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const medicineId = String(form.get("medicineId") ?? "");
    const medicine = medicines.find((item) => item.id === medicineId);
    const quantity = Number(form.get("quantity") ?? 0);
    const patientId = String(form.get("patientId") ?? "").trim();
    const dosage = String(form.get("dosage") ?? "").trim();
    const frequency = String(form.get("frequency") ?? "").trim();
    const duration = String(form.get("duration") ?? "").trim();
    if (!medicine || !patientId || !dosage || !frequency || !duration || !Number.isInteger(quantity) || quantity < 1) {
      setFeedback("Complete prescription, patient and medication fields with a positive quantity.");
      return;
    }
    const item: PrescriptionMedicine = {
      medicineId: medicine.id,
      medicineName: `${medicine.genericName} ${medicine.strength}`,
      dosage,
      frequency,
      duration,
      instructions: String(form.get("instructions") ?? ""),
      quantity,
      dispensedQuantity: 0,
    };
    setPrescriptions((current) => [{
      id: `RX-${Date.now()}`,
      patientId,
      patientName: "Synthetic patient",
      doctor: String(form.get("doctor") ?? ""),
      issuedAt: new Date().toLocaleString(),
      items: [item],
      dispensingStatus: "Pending",
    }, ...current]);
    setFeedback("Prescription added to the demonstration session.");
    event.currentTarget.reset();
  }

  function dispensePrescription(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const prescriptionId = String(form.get("prescriptionId") ?? "");
    const patientVerification = String(form.get("patientVerification") ?? "").trim();
    const batchId = String(form.get("batchId") ?? "");
    const quantity = Number(form.get("quantity") ?? 0);
    const confirmed = form.get("confirm") === "on";
    const prescription = prescriptions.find((item) => item.id === prescriptionId);
    const batch = batches.find((item) => item.id === batchId);
    const medicine = prescription?.items[0];
    if (!prescription || !batch || !medicine || patientVerification !== prescription.patientId) {
      setFeedback("Prescription, batch and matching patient verification are required.");
      return;
    }
    const remaining = medicine.quantity - medicine.dispensedQuantity;
    if (!confirmed || !Number.isInteger(quantity) || quantity < 1 || quantity > remaining || quantity > batch.quantity || batch.medicineId !== medicine.medicineId) {
      setFeedback("Confirm dispensing and enter a positive quantity within the prescription balance and selected batch stock.");
      return;
    }
    const record: DispensingRecord = {
      id: `DSP-${Date.now()}`,
      prescriptionId,
      patientId: prescription.patientId,
      batchNumber: batch.batchNumber,
      medicineName: medicine.medicineName,
      quantity,
      dispensedAt: new Date().toLocaleString(),
      receiptNumber: `RCPT-${Date.now()}`,
    };
    setBatches((current) => current.map((item) => item.id === batchId ? { ...item, quantity: item.quantity - quantity } : item));
    setPrescriptions((current) => current.map((item) => {
      if (item.id !== prescriptionId) return item;
      const updatedItems = item.items.map((prescriptionItem) => ({ ...prescriptionItem, dispensedQuantity: prescriptionItem.dispensedQuantity + quantity }));
      const fullyDispensed = updatedItems.every((prescriptionItem) => prescriptionItem.dispensedQuantity >= prescriptionItem.quantity);
      return { ...item, items: updatedItems, dispensingStatus: fullyDispensed ? "Dispensed" : "Partial" };
    }));
    setDispensing((current) => [record, ...current]);
    setReceipt(record);
    setFeedback(`${quantity} unit(s) dispensed in demo data. Receipt ${record.receiptNumber} is ready.`);
    event.currentTarget.reset();
  }

  function addSupplier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const contactName = String(form.get("contactName") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    if (!name || !contactName || !phone) {
      setFeedback("Supplier name, contact person and phone are required.");
      return;
    }
    setSuppliers((current) => [{ id: `SUP-${Date.now()}`, name, contactName, phone, email: String(form.get("email") ?? ""), address: String(form.get("address") ?? ""), status: "Active" }, ...current]);
    setFeedback("Supplier added to the current demonstration session.");
    event.currentTarget.reset();
  }

  function addProcurement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const supplier = suppliers.find((item) => item.id === String(form.get("supplierId") ?? ""));
    const medicine = medicines.find((item) => item.id === String(form.get("medicineId") ?? ""));
    const quantity = Number(form.get("quantity") ?? 0);
    if (!supplier || !medicine || !Number.isInteger(quantity) || quantity < 1) {
      setFeedback("Select a supplier and medicine and enter a positive requested quantity.");
      return;
    }
    setProcurement((current) => [{ id: `PR-${Date.now()}`, supplierId: supplier.id, supplierName: supplier.name, medicineName: `${medicine.genericName} ${medicine.strength}`, quantity, requestedAt: new Date().toLocaleDateString(), status: "Requested" }, ...current]);
    setFeedback("Purchase request created in demonstration data.");
    event.currentTarget.reset();
  }

  function advanceProcurement(record: ProcurementRecord, nextStatus: ProcurementRecord["status"]) {
    if (nextStatus === "Received") {
      const medicine = medicines.find((item) => `${item.genericName} ${item.strength}` === record.medicineName);
      if (!medicine) {
        setFeedback("The requested medicine is no longer available in the catalog.");
        return;
      }
      setBatches((current) => [{
        id: `BAT-${Date.now()}`,
        medicineId: medicine.id,
        medicineName: record.medicineName,
        batchNumber: `RCV-${Date.now()}`,
        quantity: record.quantity,
        purchaseDate: dateOffset(0),
        expiryDate: dateOffset(365),
        supplier: record.supplierName,
        storageLocation: "Receiving (demo)",
      }, ...current]);
    }
    setProcurement((current) => current.map((item) => item.id === record.id
      ? { ...item, status: nextStatus, invoiceNumber: nextStatus === "Invoiced" ? `INV-${Date.now()}` : item.invoiceNumber }
      : item));
    setFeedback(`${record.id} updated to ${nextStatus} in demonstration data.`);
  }

  function renderSection() {
    switch (section) {
      case "dashboard":
        return <PharmacyDashboard medicines={medicines} batches={batches} prescriptions={prescriptions} dispensing={dispensing} />;
      case "medicines":
        return <MedicineSection medicines={medicines} stock={batchesByMedicine} onSubmit={addMedicine} />;
      case "batches":
        return <BatchSection medicines={medicines} batches={batches} suppliers={suppliers} onSubmit={addBatch} />;
      case "prescriptions":
        return <PrescriptionSection medicines={medicines} prescriptions={prescriptions} selected={selectedPrescription} onSelect={setSelectedPrescription} onSubmit={addPrescription} />;
      case "dispensing":
        return <DispensingSection prescriptions={prescriptions} batches={batches} dispensing={dispensing} receipt={receipt} onSubmit={dispensePrescription} onPrint={() => window.print()} />;
      case "suppliers":
        return <SuppliersSection suppliers={suppliers} onSubmit={addSupplier} />;
      case "procurement":
        return <ProcurementSection medicines={medicines} suppliers={suppliers} procurement={procurement} onSubmit={addProcurement} onAdvance={advanceProcurement} />;
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={title} description="Pharmacy stock, prescribing, dispensing and procurement workflows" />
      <Notice>All medicine, prescription, stock and supplier records shown here are synthetic and are not persisted to a pharmacy database.</Notice>
      <div className="flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Pharmacy workflows">
        {pharmacyNavigation.map((item) => <button key={item.id} type="button" role="tab" aria-selected={section === item.id} onClick={() => { setSection(item.id); setFeedback(""); }} className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium ${section === item.id ? "bg-primary-600 text-white" : "border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"}`}>{item.label}</button>)}
      </div>
      {feedback ? <p role="status" className="rounded-lg border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-800 dark:border-primary-900 dark:bg-primary-950/30 dark:text-primary-200">{feedback}</p> : null}
      <div role="tabpanel" className="space-y-6">{renderSection()}</div>
    </div>
  );
}

function PharmacyDashboard({ medicines, batches, prescriptions, dispensing }: { medicines: MedicineRecord[]; batches: MedicineBatch[]; prescriptions: PharmacyPrescription[]; dispensing: DispensingRecord[] }) {
  const now = new Date();
  const expiries = batches.filter((batch) => {
    const days = (new Date(batch.expiryDate).getTime() - now.getTime()) / 86400000;
    return days >= 0 && days <= 30;
  }).length;
  const expired = batches.filter((batch) => new Date(batch.expiryDate).getTime() < now.getTime()).length;
  const lowStock = medicines.filter((medicine) => batches.filter((batch) => batch.medicineId === medicine.id).reduce((sum, batch) => sum + batch.quantity, 0) <= medicine.reorderLevel).length;
  const metrics: Array<{ label: string; value: string; hint: string; icon: ReactNode; tone: StatTone }> = [
    { label: "Total medicines", value: String(medicines.length), hint: "Synthetic formulary", icon: <Pill className="h-5 w-5" />, tone: "primary" },
    { label: "Available stock", value: String(batches.reduce((sum, batch) => sum + batch.quantity, 0)), hint: "Units across demo batches", icon: <Package className="h-5 w-5" />, tone: "success" },
    { label: "Low-stock medicines", value: String(lowStock), hint: "At or below reorder level", icon: <Archive className="h-5 w-5" />, tone: "warning" },
    { label: "Expired medicines", value: String(expired), hint: "Quarantine and review", icon: <Archive className="h-5 w-5" />, tone: "danger" },
    { label: "Near expiry", value: String(expiries), hint: "Within 30 days", icon: <Archive className="h-5 w-5" />, tone: "warning" },
    { label: "Pending prescriptions", value: String(prescriptions.filter((item) => item.dispensingStatus !== "Dispensed").length), hint: "Pending or partial", icon: <ClipboardList className="h-5 w-5" />, tone: "primary" },
    { label: "Dispensing activities", value: String(dispensing.length), hint: "This browser session", icon: <Pill className="h-5 w-5" />, tone: "success" },
  ];
  return <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => <StatCard key={metric.label} {...metric} />)}</div><Card><CardHeader title="Pharmacy operational snapshot" subtitle="Synthetic stock and workflow indicators" /><div className="grid gap-3 p-5 md:grid-cols-3"><p className="rounded-lg bg-slate-50 p-4 text-sm dark:bg-slate-900"><strong>Stock control</strong><br />Batch quantities, reorder levels and expiry dates are tracked in the demonstration session.</p><p className="rounded-lg bg-slate-50 p-4 text-sm dark:bg-slate-900"><strong>Patient safety</strong><br />Dispensing requires prescription and patient verification and checks batch stock.</p><p className="rounded-lg bg-slate-50 p-4 text-sm dark:bg-slate-900"><strong>Procurement</strong><br />Requests advance through purchase order, goods receipt and supplier invoice stages.</p></div></Card></>;
}

function MedicineSection({ medicines, stock, onSubmit }: { medicines: MedicineRecord[]; stock: Record<string, number>; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const [query, setQuery] = useState("");
  const filtered = medicines.filter((medicine) => `${medicine.id} ${medicine.genericName} ${medicine.brandName}`.toLowerCase().includes(query.toLowerCase()));
  return <><Card><CardHeader title="Medicine catalog" subtitle="Formulary, stock and reorder level" /><div className="p-5"><label className="mb-4 block max-w-md text-sm font-medium">Search medicines<input className={inputClass} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ID, generic or brand name" /></label><DataTable label="Medicine catalog" headers={["ID / generic name", "Brand / category", "Strength / dosage form", "Manufacturer / unit", "Price", "Stock / reorder"]}>{filtered.map((medicine) => <Row key={medicine.id} cells={[<><strong>{medicine.id}</strong><br />{medicine.genericName}</>, <>{medicine.brandName}<br />{medicine.category}</>, <>{medicine.strength}<br />{medicine.dosageForm}</>, <>{medicine.manufacturer}<br />{medicine.unit}</>, `${medicine.price.toFixed(2)} ETB`, <>{stock[medicine.id] ?? 0} / {medicine.reorderLevel}</>]} />)}</DataTable></div></Card><Card><CardHeader title="Register medicine" subtitle="Adds synthetic formulary data for this session" /><form className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4" onSubmit={onSubmit}>{[["genericName", "Generic name"], ["brandName", "Brand name"], ["category", "Category"], ["strength", "Strength"], ["dosageForm", "Dosage form"], ["manufacturer", "Manufacturer"], ["unit", "Unit"]].map(([name, label]) => <Field key={name} label={label}><input name={name} className={inputClass} required={name !== "brandName"} /></Field>)}<Field label="Price"><input name="price" type="number" min="0" step="0.01" className={inputClass} required /></Field><Field label="Reorder level"><input name="reorderLevel" type="number" min="0" className={inputClass} required /></Field><div className="sm:col-span-2 xl:col-span-4"><Button type="submit" leftIcon={<Plus className="h-4 w-4" />}>Add demo medicine</Button></div></form></Card></>;
}

function BatchSection({ medicines, batches, suppliers, onSubmit }: { medicines: MedicineRecord[]; batches: MedicineBatch[]; suppliers: PharmacySupplier[]; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <><Card><CardHeader title="Medicine batches" subtitle="Quantity, purchase and expiry tracking by supplier and storage location" /><DataTable label="Medicine batches" headers={["Medicine", "Batch number", "Quantity", "Purchase date", "Expiry date", "Supplier", "Storage"]}>{batches.map((batch) => <Row key={batch.id} cells={[batch.medicineName, batch.batchNumber, batch.quantity, batch.purchaseDate, <>{batch.expiryDate}<br /><StatusBadge status={new Date(batch.expiryDate) < new Date() ? "Expired" : "Active"} variant={new Date(batch.expiryDate) < new Date() ? "danger" : "success"} /></>, batch.supplier, batch.storageLocation]} />)}</DataTable></Card><Card><CardHeader title="Receive batch" subtitle="Use goods receipt to add quantities in the demo stock ledger" /><form className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4" onSubmit={onSubmit}><Field label="Medicine"><select name="medicineId" className={inputClass} required defaultValue=""><option value="" disabled>Select medicine</option>{medicines.map((item) => <option key={item.id} value={item.id}>{item.genericName} {item.strength}</option>)}</select></Field><Field label="Batch number"><input name="batchNumber" className={inputClass} required /></Field><Field label="Quantity"><input name="quantity" type="number" min="1" className={inputClass} required /></Field><Field label="Purchase date"><input name="purchaseDate" type="date" className={inputClass} required /></Field><Field label="Expiry date"><input name="expiryDate" type="date" className={inputClass} required /></Field><Field label="Supplier"><select name="supplier" className={inputClass}><option value="">Select supplier</option>{suppliers.map((supplier) => <option key={supplier.id}>{supplier.name}</option>)}</select></Field><Field label="Storage location"><input name="storageLocation" className={inputClass} required /></Field><div className="self-end"><Button type="submit">Receive demo batch</Button></div></form></Card></>;
}

function PrescriptionSection({ medicines, prescriptions, selected, onSelect, onSubmit }: { medicines: MedicineRecord[]; prescriptions: PharmacyPrescription[]; selected: PharmacyPrescription | null; onSelect: (prescription: PharmacyPrescription | null) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <><Card><CardHeader title="Prescription list" subtitle="Patient identifier, prescriber and dispensing progress" /><DataTable label="Prescriptions" headers={["Prescription / patient", "Doctor / date", "Medicine items", "Dispensing status", "Actions"]}>{prescriptions.map((prescription) => <Row key={prescription.id} cells={[<>{prescription.id}<br />{prescription.patientId}</>, <>{prescription.doctor}<br />{prescription.issuedAt}</>, prescription.items.map((item) => item.medicineName).join(", "), <StatusBadge status={prescription.dispensingStatus} />, <Button size="sm" variant="secondary" onClick={() => onSelect(selected?.id === prescription.id ? null : prescription)}>Details</Button>]} />)}</DataTable></Card>{selected ? <Card><CardHeader title={`Prescription details — ${selected.id}`} subtitle={`${selected.patientId} · ${selected.patientName} · ${selected.doctor}`} actions={<Button size="sm" variant="ghost" onClick={() => onSelect(null)}>Close</Button>} /><DataTable label="Prescription medicine items" headers={["Medicine", "Dosage", "Frequency", "Duration", "Instructions", "Quantity / dispensing"]}>{selected.items.map((item, index) => <Row key={`${item.medicineId}-${index}`} cells={[item.medicineName, item.dosage, item.frequency, item.duration, item.instructions, `${item.dispensedQuantity} / ${item.quantity} (${selected.dispensingStatus})`]} />)}</DataTable></Card>:null}<Card><CardHeader title="Create prescription preview" subtitle="Synthetic prescription only; clinical authorization remains a backend responsibility" /><form className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3" onSubmit={onSubmit}><Field label="Patient identifier"><input name="patientId" className={inputClass} required /></Field><Field label="Doctor"><input name="doctor" className={inputClass} required /></Field><Field label="Medicine"><select name="medicineId" className={inputClass} required defaultValue=""><option value="" disabled>Select medicine</option>{medicines.map((medicine) => <option key={medicine.id} value={medicine.id}>{medicine.genericName} {medicine.strength}</option>)}</select></Field><Field label="Dosage"><input name="dosage" className={inputClass} required placeholder="1 tablet" /></Field><Field label="Frequency"><input name="frequency" className={inputClass} required placeholder="Twice daily" /></Field><Field label="Duration"><input name="duration" className={inputClass} required placeholder="7 days" /></Field><Field label="Quantity"><input name="quantity" type="number" min="1" className={inputClass} required /></Field><Field label="Instructions"><input name="instructions" className={inputClass} /></Field><div className="self-end"><Button type="submit">Create demo prescription</Button></div></form></Card></>;
}

function DispensingSection({ prescriptions, batches, dispensing, receipt, onSubmit, onPrint }: { prescriptions: PharmacyPrescription[]; batches: MedicineBatch[]; dispensing: DispensingRecord[]; receipt: DispensingRecord | null; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onPrint: () => void }) {
  return <><Notice>Demonstration dispensing changes only in-memory stock. Verify the patient identifier, prescription, matching medicine batch, quantity and confirmation before dispensing.</Notice><Card><CardHeader title="Prescription dispensing" subtitle="Supports partial quantities and prevents issuing more than remaining prescription or batch stock" /><form className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3" onSubmit={onSubmit}><Field label="Prescription"><select name="prescriptionId" className={inputClass} required defaultValue=""><option value="" disabled>Select prescription</option>{prescriptions.filter((item) => item.dispensingStatus !== "Dispensed").map((item) => <option key={item.id} value={item.id}>{item.id} — {item.patientId} — {item.items[0]?.medicineName}</option>)}</select></Field><Field label="Verify patient identifier"><input name="patientVerification" className={inputClass} required /></Field><Field label="Medicine batch"><select name="batchId" className={inputClass} required defaultValue=""><option value="" disabled>Select batch</option>{batches.filter((batch) => batch.quantity > 0).map((batch) => <option key={batch.id} value={batch.id}>{batch.medicineName} — {batch.batchNumber} ({batch.quantity} available)</option>)}</select></Field><Field label="Quantity to dispense"><input name="quantity" type="number" min="1" className={inputClass} required /></Field><label className="flex items-center gap-2 self-end text-sm"><input name="confirm" type="checkbox" required />Confirm dispensing for the verified patient</label><div className="self-end"><Button type="submit">Confirm demo dispensing</Button></div></form></Card>{receipt ? <Card><CardHeader title="Dispensing summary / receipt" subtitle="Synthetic transaction" actions={<Button size="sm" variant="secondary" leftIcon={<Printer className="h-4 w-4" />} onClick={onPrint}>Print receipt</Button>} /><div className="grid gap-3 p-5 text-sm sm:grid-cols-2"><p><strong>Receipt:</strong> {receipt.receiptNumber}</p><p><strong>Dispensing ID:</strong> {receipt.id}</p><p><strong>Prescription:</strong> {receipt.prescriptionId}</p><p><strong>Patient:</strong> {receipt.patientId}</p><p><strong>Medicine:</strong> {receipt.medicineName}</p><p><strong>Batch:</strong> {receipt.batchNumber}</p><p><strong>Quantity:</strong> {receipt.quantity}</p><p><strong>Date:</strong> {receipt.dispensedAt}</p></div></Card>:null}<Card><CardHeader title="Dispensing activity" subtitle="Current demonstration session" /><DataTable label="Dispensing activities" headers={["Receipt / prescription", "Patient", "Medicine", "Batch", "Quantity", "Date"]}>{dispensing.map((record) => <Row key={record.id} cells={[<>{record.receiptNumber}<br />{record.prescriptionId}</>, record.patientId, record.medicineName, record.batchNumber, record.quantity, record.dispensedAt]} />)}</DataTable>{dispensing.length===0?<p className="p-5 text-sm text-slate-500">No dispensing activity in this session.</p>:null}</Card></>;
}

function SuppliersSection({ suppliers, onSubmit }: { suppliers: PharmacySupplier[]; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <><Card><CardHeader title="Supplier directory" subtitle="Supplier contacts and status" /><DataTable label="Suppliers" headers={["Supplier", "Contact", "Phone", "Email", "Address", "Status"]}>{suppliers.map((supplier) => <Row key={supplier.id} cells={[<>{supplier.name}<br />{supplier.id}</>, supplier.contactName, supplier.phone, supplier.email, supplier.address, <StatusBadge status={supplier.status} />]} />)}</DataTable></Card><Card><CardHeader title="Register supplier" subtitle="Synthetic supplier record" /><form className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3" onSubmit={onSubmit}>{[["name","Supplier name"],["contactName","Contact person"],["phone","Phone"],["email","Email"],["address","Address"]].map(([name,label])=><Field key={name} label={label}><input name={name} className={inputClass} required={name==="name"||name==="contactName"||name==="phone"} /></Field>)}<div className="self-end"><Button type="submit" leftIcon={<Plus className="h-4 w-4" />}>Add demo supplier</Button></div></form></Card></>;
}

function ProcurementSection({ medicines, suppliers, procurement, onSubmit, onAdvance }: { medicines: MedicineRecord[]; suppliers: PharmacySupplier[]; procurement: ProcurementRecord[]; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onAdvance: (record: ProcurementRecord, status: ProcurementRecord["status"]) => void }) {
  return <><Card><CardHeader title="Purchase requests, purchase orders and receiving" subtitle="Track procurement through supplier invoice entry" /><DataTable label="Purchase orders" headers={["Request / supplier", "Medicine", "Quantity", "Requested", "Status / invoice", "Next action"]}>{procurement.map((record) => <Row key={record.id} cells={[<>{record.id}<br />{record.supplierName}</>, record.medicineName, record.quantity, record.requestedAt, <>{record.status}<br />{record.invoiceNumber ?? "No invoice recorded"}</>, record.status==="Requested"?<Button size="sm" onClick={()=>onAdvance(record,"Purchase order")}>Create purchase order</Button>:record.status==="Purchase order"?<Button size="sm" onClick={()=>onAdvance(record,"Received")}>Record goods received</Button>:record.status==="Received"?<Button size="sm" onClick={()=>onAdvance(record,"Invoiced")}>Record supplier invoice</Button>:<StatusBadge status="Invoiced" />]} />)}</DataTable></Card><Card><CardHeader title="Create purchase request" subtitle="Synthetic procurement workflow" /><form className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3" onSubmit={onSubmit}><Field label="Supplier"><select name="supplierId" className={inputClass} required defaultValue=""><option value="" disabled>Select supplier</option>{suppliers.map((supplier)=><option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></Field><Field label="Medicine"><select name="medicineId" className={inputClass} required defaultValue=""><option value="" disabled>Select medicine</option>{medicines.map((medicine)=><option key={medicine.id} value={medicine.id}>{medicine.genericName} {medicine.strength}</option>)}</select></Field><Field label="Quantity"><input name="quantity" type="number" min="1" className={inputClass} required /></Field><div className="self-end"><Button type="submit" leftIcon={<ShoppingCart className="h-4 w-4" />}>Create request</Button></div></form></Card></>;
}
