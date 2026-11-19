import { ClipboardList, HandCoins, Package, Pill, ShoppingCart, Truck, Boxes } from "lucide-react";
import type { ModuleScreen, AnyRow } from "@/modules/types";
import type { Column } from "@/components/ui/DataTable";

// ----------------------------------------------------------------- Medicines

interface MedicineRow {
  id: string;
  name: string;
  form: string;
  strength: string;
  stock: number;
  reorder: number;
  status: string;
}

const medicines: MedicineRow[] = [
  { id: "med-001", name: "Paracetamol", form: "Tablet", strength: "500 mg", stock: 42, reorder: 50, status: "low" },
  { id: "med-002", name: "Amoxicillin", form: "Capsule", strength: "250 mg", stock: 128, reorder: 60, status: "available" },
  { id: "med-003", name: "Metformin", form: "Tablet", strength: "850 mg", stock: 96, reorder: 40, status: "available" },
  { id: "med-004", name: "Salbutamol inhaler", form: "Inhaler", strength: "100 µg", stock: 18, reorder: 20, status: "low" },
  { id: "med-005", name: "Ceftriaxone", form: "Injection", strength: "1 g", stock: 64, reorder: 30, status: "available" },
  { id: "med-006", name: "Insulin (regular)", form: "Injection", strength: "100 IU/mL", stock: 12, reorder: 25, status: "critical" },
];

const medicineColumns: Column<AnyRow>[] = [
  { key: "name", header: "Medicine", sortValue: (row) => String(row.name) },
  { key: "form", header: "Form", sortValue: (row) => String(row.form), hideOnTablet: true },
  { key: "strength", header: "Strength", sortValue: (row) => String(row.strength) },
  { key: "stock", header: "Stock", align: "right", sortValue: (row) => Number(row.stock), render: (row) => <span className="font-medium text-slate-700 dark:text-slate-200">{String(row.stock)}</span> },
  { key: "reorder", header: "Reorder level", align: "right", sortValue: (row) => Number(row.reorder), hideOnMobile: true },
  { key: "status", header: "Status", sortValue: (row) => String(row.status), render: (row) => <span className="capitalize">{String(row.status)}</span> },
];

// ------------------------------------------------------------------ Inventory

interface BatchRow {
  id: string;
  batch: string;
  medicine: string;
  quantity: number;
  expiry: string;
  supplier: string;
  status: string;
}

const batches: BatchRow[] = [
  { id: "bat-001", batch: "B-2451", medicine: "Paracetamol 500mg", quantity: 4200, expiry: "2027-03", supplier: "Ethio Pharma PLC", status: "available" },
  { id: "bat-002", batch: "B-2452", medicine: "Amoxicillin 250mg", quantity: 2600, expiry: "2026-12", supplier: "Addis Pharmaceuticals", status: "low" },
  { id: "bat-003", batch: "B-2453", medicine: "Ceftriaxone 1g", quantity: 900, expiry: "2027-08", supplier: "Ethio Pharma PLC", status: "available" },
  { id: "bat-004", batch: "B-2454", medicine: "Insulin regular", quantity: 240, expiry: "2026-11", supplier: "Med Tech Trading", status: "critical" },
  { id: "bat-005", batch: "B-2455", medicine: "Salbutamol inhaler", quantity: 180, expiry: "2027-01", supplier: "Med Tech Trading", status: "available" },
];

const batchColumns: Column<AnyRow>[] = [
  { key: "batch", header: "Batch", sortValue: (row) => String(row.batch), render: (row) => <span className="font-mono text-xs font-semibold text-primary-700 dark:text-primary-300">{String(row.batch)}</span> },
  { key: "medicine", header: "Medicine", sortValue: (row) => String(row.medicine) },
  { key: "quantity", header: "Quantity", align: "right", sortValue: (row) => Number(row.quantity) },
  { key: "expiry", header: "Expiry", sortValue: (row) => String(row.expiry), hideOnTablet: true },
  { key: "supplier", header: "Supplier", sortValue: (row) => String(row.supplier), hideOnMobile: true },
  { key: "status", header: "Status", sortValue: (row) => String(row.status), render: (row) => <span className="capitalize">{String(row.status)}</span> },
];

// ------------------------------------------------------------------ Dispensing

interface DispenseRow {
  id: string;
  rx: string;
  patient: string;
  dispensedBy: string;
  time: string;
  total: number;
  status: string;
}

const dispenses: DispenseRow[] = [
  { id: "dis-001", rx: "RX-7712", patient: "Almaz Tadesse", dispensedBy: "Pharmacist Henok", time: "09:20", total: 145, status: "completed" },
  { id: "dis-002", rx: "RX-7713", patient: "Getachew Molla", dispensedBy: "Pharmacist Henok", time: "09:48", total: 320, status: "completed" },
  { id: "dis-003", rx: "RX-7714", patient: "Sara Alemu", dispensedBy: "Pharmacist Liya", time: "10:10", total: 95, status: "validated" },
  { id: "dis-004", rx: "RX-7715", patient: "Fatuma Nur", dispensedBy: "Pharmacist Liya", time: "10:35", total: 210, status: "pending" },
];

const dispenseColumns: Column<AnyRow>[] = [
  { key: "rx", header: "Rx", sortValue: (row) => String(row.rx), render: (row) => <span className="font-mono text-xs font-semibold text-primary-700 dark:text-primary-300">{String(row.rx)}</span> },
  { key: "patient", header: "Patient", sortValue: (row) => String(row.patient) },
  { key: "dispensedBy", header: "Dispensed by", sortValue: (row) => String(row.dispensedBy), hideOnTablet: true },
  { key: "time", header: "Time", sortValue: (row) => String(row.time), render: (row) => <span className="font-mono text-xs">{String(row.time)}</span> },
  { key: "total", header: "Total (ETB)", align: "right", sortValue: (row) => Number(row.total), render: (row) => <span className="font-medium">{Number(row.total).toLocaleString("en-US")}</span> },
  { key: "status", header: "Status", sortValue: (row) => String(row.status), render: (row) => <span className="capitalize">{String(row.status)}</span> },
];

// ------------------------------------------------------------------ Suppliers

interface SupplierRow {
  id: string;
  name: string;
  contact: string;
  phone: string;
  categories: string;
  orders: number;
  status: string;
}

const suppliers: SupplierRow[] = [
  { id: "sup-001", name: "Ethio Pharma PLC", contact: "Ato Tesfaye Girma", phone: "+251 911 100 200", categories: "Antibiotics, analgesics", orders: 24, status: "active" },
  { id: "sup-002", name: "Addis Pharmaceuticals", contact: "W/ro Sara Bekele", phone: "+251 911 300 400", categories: "Oral solids", orders: 18, status: "active" },
  { id: "sup-003", name: "Med Tech Trading", contact: "Ato Yonas Haile", phone: "+251 911 500 600", categories: "Medical devices", orders: 11, status: "active" },
  { id: "sup-004", name: "Highland Supplies", contact: "Ato Gebre Mariam", phone: "+251 911 700 800", categories: "Consumables", orders: 9, status: "pending" },
];

const supplierColumns: Column<AnyRow>[] = [
  { key: "name", header: "Supplier", sortValue: (row) => String(row.name) },
  { key: "contact", header: "Contact person", sortValue: (row) => String(row.contact), hideOnTablet: true },
  { key: "phone", header: "Phone", sortValue: (row) => String(row.phone), hideOnMobile: true, render: (row) => <span className="font-mono text-xs">{String(row.phone)}</span> },
  { key: "categories", header: "Categories", sortValue: (row) => String(row.categories) },
  { key: "orders", header: "Orders (YTD)", align: "right", sortValue: (row) => Number(row.orders) },
  { key: "status", header: "Status", sortValue: (row) => String(row.status), render: (row) => <span className="capitalize">{String(row.status)}</span> },
];

// ---------------------------------------------------------------- Procurement

interface PurchaseOrderRow {
  id: string;
  po: string;
  supplier: string;
  items: number;
  amount: number;
  ordered: string;
  status: string;
}

const purchaseOrders: PurchaseOrderRow[] = [
  { id: "po-001", po: "PO-1180", supplier: "Ethio Pharma PLC", items: 12, amount: 384000, ordered: "2026-11-08", status: "validated" },
  { id: "po-002", po: "PO-1181", supplier: "Addis Pharmaceuticals", items: 8, amount: 121500, ordered: "2026-11-09", status: "pending" },
  { id: "po-003", po: "PO-1182", supplier: "Med Tech Trading", items: 5, amount: 96800, ordered: "2026-11-09", status: "pending" },
  { id: "po-004", po: "PO-1183", supplier: "Highland Supplies", items: 20, amount: 54300, ordered: "2026-11-10", status: "pending" },
  { id: "po-005", po: "PO-1179", supplier: "Ethio Pharma PLC", items: 15, amount: 265000, ordered: "2026-11-05", status: "completed" },
];

const poColumns: Column<AnyRow>[] = [
  { key: "po", header: "PO", sortValue: (row) => String(row.po), render: (row) => <span className="font-mono text-xs font-semibold text-primary-700 dark:text-primary-300">{String(row.po)}</span> },
  { key: "supplier", header: "Supplier", sortValue: (row) => String(row.supplier) },
  { key: "items", header: "Line items", align: "right", sortValue: (row) => Number(row.items), hideOnTablet: true },
  { key: "amount", header: "Amount (ETB)", align: "right", sortValue: (row) => Number(row.amount), render: (row) => <span className="font-medium">{Number(row.amount).toLocaleString("en-US")}</span> },
  { key: "ordered", header: "Ordered", sortValue: (row) => String(row.ordered), hideOnMobile: true },
  { key: "status", header: "Status", sortValue: (row) => String(row.status), render: (row) => <span className="capitalize">{String(row.status)}</span> },
];

export const pharmacyScreens: Record<string, ModuleScreen> = {
  "/medicines": {
    kind: "list",
    screen: {
      description: "Formulary catalog with stock levels and reorder thresholds.",
      columns: medicineColumns,
      data: medicines,
      keyExtractor: (row) => String(row.id),
      searchKeys: ["name", "form", "strength"],
      searchPlaceholder: "Search medicine, form or strength…",
      filters: [
        {
          label: "Status",
          options: [
            { label: "All", value: "" },
            { label: "Available", value: "available" },
            { label: "Low", value: "low" },
            { label: "Critical", value: "critical" },
          ],
          matches: (row, value) => row.status === value,
        },
      ],
      stats: [
        { label: "Catalog items", value: String(medicines.length), icon: <Pill className="h-5 w-5" />, tone: "primary" },
        { label: "In stock", value: String(medicines.filter((m) => m.status === "available").length), icon: <Pill className="h-5 w-5" />, tone: "success" },
        { label: "Low stock", value: String(medicines.filter((m) => m.status === "low").length), icon: <Pill className="h-5 w-5" />, tone: "warning" },
        { label: "Critical", value: String(medicines.filter((m) => m.status === "critical").length), icon: <Pill className="h-5 w-5" />, tone: "danger" },
      ],
      emptyIcon: Pill,
    },
  },
  "/inventory": {
    kind: "list",
    screen: {
      description: "Pharmacy stock by batch with expiry monitoring.",
      columns: batchColumns,
      data: batches,
      keyExtractor: (row) => String(row.id),
      searchKeys: ["batch", "medicine", "supplier"],
      searchPlaceholder: "Search batch, medicine or supplier…",
      emptyIcon: Package,
    },
  },
  "/prescriptions": {
    kind: "board",
    screen: {
      description: "Prescription pipeline from prescriber to counter hand-off.",
      columns: [
        {
          id: "received",
          title: "Received",
          tone: "primary",
          items: [
            { id: "rx1", title: "RX-7718 — Almaz Tadesse", subtitle: "Dr. Selam Girma · 2 items", meta: "Waiting 6 min" },
            { id: "rx2", title: "RX-7719 — Biruk Tesfaye", subtitle: "Dr. Bereket Assefa · 1 item", meta: "Waiting 3 min", urgent: true },
          ],
        },
        {
          id: "preparing",
          title: "Preparing",
          tone: "info",
          items: [{ id: "rx3", title: "RX-7715 — Fatuma Nur", subtitle: "Pharmacist Liya · 3 items", meta: "Started 4 min ago" }],
        },
        {
          id: "ready",
          title: "Ready",
          tone: "warning",
          items: [{ id: "rx4", title: "RX-7716 — Dawit Haile", subtitle: "2 items · ETB 210", meta: "Ready for pickup" }],
        },
        {
          id: "dispensed",
          title: "Dispensed",
          tone: "success",
          items: [
            { id: "rx5", title: "RX-7712 — Almaz Tadesse", subtitle: "Pharmacist Henok", meta: "09:20" },
            { id: "rx6", title: "RX-7713 — Getachew Molla", subtitle: "Pharmacist Henok", meta: "09:48" },
          ],
        },
      ],
      stats: [
        { label: "In pipeline", value: "6", icon: <ClipboardList className="h-5 w-5" />, tone: "primary" },
        { label: "Ready for pickup", value: "1", icon: <ClipboardList className="h-5 w-5" />, tone: "warning" },
        { label: "Dispensed today", value: "34", icon: <HandCoins className="h-5 w-5" />, tone: "success" },
        { label: "Avg wait at counter", value: "7 min", icon: <HandCoins className="h-5 w-5" />, tone: "danger" },
      ],
    },
  },
  "/dispensing": {
    kind: "list",
    screen: {
      description: "Counter dispensing log with verification and payment totals.",
      columns: dispenseColumns,
      data: dispenses,
      keyExtractor: (row) => String(row.id),
      searchKeys: ["rx", "patient", "dispensedBy"],
      searchPlaceholder: "Search Rx, patient or pharmacist…",
      emptyIcon: HandCoins,
    },
  },
  "/suppliers": {
    kind: "list",
    screen: {
      description: "Approved suppliers, contacts and order history.",
      columns: supplierColumns,
      data: suppliers,
      keyExtractor: (row) => String(row.id),
      searchKeys: ["name", "contact", "categories"],
      searchPlaceholder: "Search supplier or category…",
      emptyIcon: Truck,
    },
  },
  "/procurement": {
    kind: "list",
    screen: {
      description: "Purchase orders, approvals and delivery status.",
      columns: poColumns,
      data: purchaseOrders,
      keyExtractor: (row) => String(row.id),
      searchKeys: ["po", "supplier"],
      searchPlaceholder: "Search PO or supplier…",
      filters: [
        {
          label: "Status",
          options: [
            { label: "All", value: "" },
            { label: "Pending", value: "pending" },
            { label: "Approved", value: "validated" },
            { label: "Delivered", value: "completed" },
          ],
          matches: (row, value) => row.status === value,
        },
      ],
      stats: [
        { label: "Open POs", value: String(purchaseOrders.filter((p) => p.status === "pending").length), icon: <ShoppingCart className="h-5 w-5" />, tone: "warning" },
        { label: "Pending value", icon: <ShoppingCart className="h-5 w-5" />, value: `ETB ${purchaseOrders.filter((p) => p.status === "pending").reduce((sum, p) => sum + p.amount, 0).toLocaleString("en-US")}`, tone: "primary" },
        { label: "Approved", value: String(purchaseOrders.filter((p) => p.status === "validated").length), icon: <ShoppingCart className="h-5 w-5" />, tone: "success" },
        { label: "Delivered (30d)", value: String(purchaseOrders.filter((p) => p.status === "completed").length), icon: <Boxes className="h-5 w-5" />, tone: "danger" },
      ],
      emptyIcon: ShoppingCart,
    },
  },
};
