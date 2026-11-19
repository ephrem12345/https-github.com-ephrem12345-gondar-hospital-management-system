import { Archive, Boxes, CalendarCheck, Droplets, FolderHeart, Package, Sparkles, Wrench } from "lucide-react";
import type { ModuleScreen, AnyRow } from "@/modules/types";
import type { Column } from "@/components/ui/DataTable";

// ------------------------------------------------------------ General inventory

interface ItemRow {
  id: string;
  item: string;
  category: string;
  stock: number;
  reorder: number;
  status: string;
}

const generalItems: ItemRow[] = [
  { id: "gi-001", item: "Disposable gloves (M)", category: "Consumables", stock: 320, reorder: 150, status: "available" },
  { id: "gi-002", item: "IV giving sets", category: "Consumables", stock: 96, reorder: 100, status: "low" },
  { id: "gi-003", item: "Face masks N95", category: "PPE", stock: 210, reorder: 80, status: "available" },
  { id: "gi-004", item: "Suture kits", category: "Surgical", stock: 44, reorder: 30, status: "available" },
  { id: "gi-005", item: "Oxygen cylinders (full)", category: "Gases", stock: 12, reorder: 15, status: "low" },
  { id: "gi-006", item: "Wheelchairs", category: "Equipment", stock: 9, reorder: 5, status: "available" },
  { id: "gi-007", item: "Bed sheets", category: "Linen", stock: 480, reorder: 200, status: "available" },
];

const itemColumns: Column<AnyRow>[] = [
  { key: "item", header: "Item", sortValue: (row) => String(row.item) },
  { key: "category", header: "Category", sortValue: (row) => String(row.category), hideOnTablet: true },
  { key: "stock", header: "Stock", align: "right", sortValue: (row) => Number(row.stock) },
  { key: "reorder", header: "Reorder at", align: "right", sortValue: (row) => Number(row.reorder), hideOnMobile: true },
  { key: "status", header: "Status", sortValue: (row) => String(row.status), render: (row) => <span className="capitalize">{String(row.status)}</span> },
];

// ------------------------------------------------------------------- Assets

interface AssetRow {
  id: string;
  asset: string;
  tag: string;
  location: string;
  assignedTo: string;
  condition: string;
}

const assets: AssetRow[] = [
  { id: "as-001", asset: "Ultrasound machine", tag: "AST-0412", location: "Radiology", assignedTo: "Dr. Fikru Bekele", condition: "stable" },
  { id: "as-002", asset: "X-ray unit (digital)", tag: "AST-0415", location: "Radiology", assignedTo: "Dr. Fikru Bekele", condition: "stable" },
  { id: "as-003", asset: "Ventilator V-300", tag: "AST-0421", location: "ICU", assignedTo: "ICU Unit", condition: "critical" },
  { id: "as-004", asset: "Autoclave sterilizer", tag: "AST-0433", location: "Sterilization", assignedTo: "Central Supply", condition: "stable" },
  { id: "as-005", asset: "Anesthesia machine", tag: "AST-0440", location: "OR-2", assignedTo: "Anesthesia Team", condition: "stable" },
];

const assetColumns: Column<AnyRow>[] = [
  { key: "asset", header: "Asset", sortValue: (row) => String(row.asset) },
  { key: "tag", header: "Asset tag", sortValue: (row) => String(row.tag), render: (row) => <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{String(row.tag)}</span> },
  { key: "location", header: "Location", sortValue: (row) => String(row.location), hideOnTablet: true },
  { key: "assignedTo", header: "Assigned to", sortValue: (row) => String(row.assignedTo), hideOnMobile: true },
  { key: "condition", header: "Condition", sortValue: (row) => String(row.condition), render: (row) => <span className="capitalize">{String(row.condition)}</span> },
];

// --------------------------------------------------------------- Maintenance

interface WorkOrderRow {
  id: string;
  order: string;
  asset: string;
  type: string;
  reported: string;
  technician: string;
  status: string;
}

const workOrders: WorkOrderRow[] = [
  { id: "wo-001", order: "WO-3311", asset: "Ventilator V-300", type: "Repair", reported: "2026-11-09", technician: "Biomed — Ato Samuel", status: "in-progress" },
  { id: "wo-002", order: "WO-3312", asset: "Bed M-05 rail", type: "Repair", reported: "2026-11-09", technician: "Facilities — Ato Kebede", status: "pending" },
  { id: "wo-003", order: "WO-3313", asset: "Generator (backup)", type: "Preventive", reported: "2026-11-10", technician: "Facilities — Ato Mulugeta", status: "pending" },
  { id: "wo-004", order: "WO-3309", asset: "X-ray unit", type: "Calibration", reported: "2026-11-06", technician: "Biomed — Ato Samuel", status: "completed" },
];

const workOrderColumns: Column<AnyRow>[] = [
  { key: "order", header: "Work order", sortValue: (row) => String(row.order), render: (row) => <span className="font-mono text-xs font-semibold text-primary-700 dark:text-primary-300">{String(row.order)}</span> },
  { key: "asset", header: "Asset", sortValue: (row) => String(row.asset) },
  { key: "type", header: "Type", sortValue: (row) => String(row.type), hideOnTablet: true },
  { key: "technician", header: "Technician", sortValue: (row) => String(row.technician), hideOnMobile: true },
  { key: "reported", header: "Reported", sortValue: (row) => String(row.reported), align: "right" },
  { key: "status", header: "Status", sortValue: (row) => String(row.status), render: (row) => <span className="capitalize">{String(row.status)}</span> },
];

// -------------------------------------------------------------- Sterilization

interface SterileCycleRow {
  id: string;
  cycle: string;
  load: string;
  operator: string;
  started: string;
  status: string;
}

const cycles: SterileCycleRow[] = [
  { id: "st-001", cycle: "CYC-0912", load: "Surgical instrument trays (12)", operator: "W/ro Meseret", started: "09:30", status: "validated" },
  { id: "st-002", cycle: "CYC-0913", load: "OR linens", operator: "W/ro Meseret", started: "10:05", status: "in-progress" },
  { id: "st-003", cycle: "CYC-0914", load: "Dental handpieces", operator: "W/ro Tigist", started: "10:20", status: "pending" },
  { id: "st-004", cycle: "CYC-0911", load: "ICU reusable equipment", operator: "W/ro Tigist", started: "08:40", status: "completed" },
];

const cycleColumns: Column<AnyRow>[] = [
  { key: "cycle", header: "Cycle", sortValue: (row) => String(row.cycle), render: (row) => <span className="font-mono text-xs font-semibold text-primary-700 dark:text-primary-300">{String(row.cycle)}</span> },
  { key: "load", header: "Load", sortValue: (row) => String(row.load) },
  { key: "operator", header: "Operator", sortValue: (row) => String(row.operator), hideOnTablet: true },
  { key: "started", header: "Started", align: "right", sortValue: (row) => String(row.started), render: (row) => <span className="font-mono text-xs">{String(row.started)}</span> },
  { key: "status", header: "Status", sortValue: (row) => String(row.status), render: (row) => <span className="capitalize">{String(row.status)}</span> },
];

// ---------------------------------------------------------------- Mortuary

interface MortuaryRow {
  id: string;
  caseRef: string;
  deceased: string;
  admitted: string;
  released: string;
  status: string;
}

const mortuaryCases: MortuaryRow[] = [
  { id: "mo-001", caseRef: "MOR-118", deceased: "Unnamed male (RTA)", admitted: "2026-11-10 07:40", released: "", status: "pending" },
  { id: "mo-002", caseRef: "MOR-117", deceased: "Ato Kebede Wolde", admitted: "2026-11-09 21:15", released: "", status: "in-progress" },
  { id: "mo-003", caseRef: "MOR-116", deceased: "W/ro Genet Ayele", admitted: "2026-11-08 14:30", released: "2026-11-10 10:00", status: "completed" },
];

const mortuaryColumns: Column<AnyRow>[] = [
  { key: "caseRef", header: "Case", sortValue: (row) => String(row.caseRef), render: (row) => <span className="font-mono text-xs font-semibold text-primary-700 dark:text-primary-300">{String(row.caseRef)}</span> },
  { key: "deceased", header: "Deceased", sortValue: (row) => String(row.deceased) },
  { key: "admitted", header: "Admitted", sortValue: (row) => String(row.admitted), hideOnTablet: true },
  { key: "released", header: "Released", sortValue: (row) => String(row.released), render: (row) => String(row.released) || "—" },
  { key: "status", header: "Status", sortValue: (row) => String(row.status), render: (row) => <span className="capitalize">{String(row.status)}</span> },
];

export const resourceScreens: Record<string, ModuleScreen> = {
  "/general-inventory": {
    kind: "list",
    screen: {
      description: "Consumables, PPE, equipment and linen stock.",
      columns: itemColumns,
      data: generalItems,
      keyExtractor: (row) => String(row.id),
      searchKeys: ["item", "category"],
      searchPlaceholder: "Search item or category…",
      filters: [
        {
          label: "Category",
          options: [
            { label: "All categories", value: "" },
            ...[...new Set(generalItems.map((i) => i.category))].sort().map((c) => ({ label: c, value: c })),
          ],
          matches: (row, value) => row.category === value,
        },
      ],
      stats: [
        { label: "Item types", value: String(generalItems.length), icon: <Boxes className="h-5 w-5" />, tone: "primary" },
        { label: "Below reorder", value: String(generalItems.filter((i) => i.stock < i.reorder).length), icon: <Boxes className="h-5 w-5" />, tone: "warning" },
        { label: "Categories", value: String(new Set(generalItems.map((i) => i.category)).size), icon: <Package className="h-5 w-5" />, tone: "success" },
        { label: "Critical items", value: "1", icon: <Boxes className="h-5 w-5" />, tone: "danger" },
      ],
      emptyIcon: Boxes,
    },
  },
  "/assets": {
    kind: "list",
    screen: {
      description: "Fixed asset register with location and assignment.",
      columns: assetColumns,
      data: assets,
      keyExtractor: (row) => String(row.id),
      searchKeys: ["asset", "tag", "location", "assignedTo"],
      searchPlaceholder: "Search asset, tag or location…",
      emptyIcon: Archive,
    },
  },
  "/maintenance": {
    kind: "list",
    screen: {
      description: "Work orders for repairs, calibration and preventive maintenance.",
      columns: workOrderColumns,
      data: workOrders,
      keyExtractor: (row) => String(row.id),
      searchKeys: ["order", "asset", "technician"],
      searchPlaceholder: "Search order, asset or technician…",
      filters: [
        {
          label: "Status",
          options: [
            { label: "All", value: "" },
            { label: "Pending", value: "pending" },
            { label: "In progress", value: "in-progress" },
            { label: "Completed", value: "completed" },
          ],
          matches: (row, value) => row.status === value,
        },
      ],
      emptyIcon: Wrench,
    },
  },
  "/housekeeping": {
    kind: "board",
    screen: {
      description: "Cleaning and room-readiness tasks across clinical areas.",
      columns: [
        {
          id: "todo",
          title: "To do",
          tone: "warning",
          items: [
            { id: "hk1", title: "OR-3 turnover clean", subtitle: "After C-section", meta: "Assigned: Marta team" },
            { id: "hk2", title: "Bed M-05 deep clean", subtitle: "Discharge clean", meta: "Assigned: Tigist" },
          ],
        },
        {
          id: "in-progress",
          title: "In progress",
          tone: "info",
          items: [{ id: "hk3", title: "Ward B corridor mopping", subtitle: "Routine (2× daily)", meta: "Started 10:15" }],
        },
        {
          id: "inspection",
          title: "Inspection",
          tone: "primary",
          items: [{ id: "hk4", title: "Isolation room B-14", subtitle: "Awaiting nurse sign-off", meta: "Cleaned 09:50" }],
        },
        {
          id: "done",
          title: "Completed",
          tone: "success",
          items: [
            { id: "hk5", title: "Bed A-13 turnover", subtitle: "Ready for admission", meta: "Signed off 09:40" },
            { id: "hk6", title: "Emergency bay cleaning", subtitle: "Routine", meta: "Signed off 08:20" },
          ],
        },
      ],
    },
  },
  "/sterilization": {
    kind: "list",
    screen: {
      description: "Sterilization cycles for instruments and reusable equipment.",
      columns: cycleColumns,
      data: cycles,
      keyExtractor: (row) => String(row.id),
      searchKeys: ["cycle", "load", "operator"],
      searchPlaceholder: "Search cycle, load or operator…",
      emptyIcon: Droplets,
    },
  },
  "/dietary": {
    kind: "list",
    screen: {
      description: "Patient meal planning, diets and kitchen schedules.",
      columns: [
        { key: "patient", header: "Patient", sortValue: (row) => String(row.patient) },
        { key: "ward", header: "Ward", sortValue: (row) => String(row.ward), hideOnTablet: true },
        { key: "diet", header: "Diet", sortValue: (row) => String(row.diet) },
        { key: "meals", header: "Meals today", align: "center", sortValue: (row) => Number(row.meals), hideOnMobile: true },
        { key: "status", header: "Status", sortValue: (row) => String(row.status), render: (row) => <span className="capitalize">{String(row.status)}</span> },
      ],
      data: [
        { id: "dt-001", patient: "Getachew Molla", ward: "Surgical Ward A", diet: "Soft, high protein", meals: 3, status: "validated" },
        { id: "dt-002", patient: "Yohannes Kebede", ward: "Internal Medicine", diet: "Diabetic", meals: 3, status: "validated" },
        { id: "dt-003", patient: "Sara Alemu", ward: "Pediatrics", diet: "Regular", meals: 3, status: "pending" },
        { id: "dt-004", patient: "Tigist Ayele", ward: "ICU", diet: "Enteral feeding", meals: 6, status: "in-progress" },
        { id: "dt-005", patient: "Fatuma Nur", ward: "Psychiatry", diet: "Regular", meals: 3, status: "completed" },
      ],
      keyExtractor: (row) => String(row.id),
      searchKeys: ["patient", "ward", "diet"],
      searchPlaceholder: "Search patient, ward or diet…",
      emptyIcon: CalendarCheck,
    },
  },
  "/mortuary": {
    kind: "list",
    screen: {
      description: "Deceased care, documentation and release to families.",
      columns: mortuaryColumns,
      data: mortuaryCases,
      keyExtractor: (row) => String(row.id),
      searchKeys: ["caseRef", "deceased"],
      searchPlaceholder: "Search case or name…",
      filters: [
        {
          label: "Status",
          options: [
            { label: "All", value: "" },
            { label: "Admitted", value: "pending" },
            { label: "In process", value: "in-progress" },
            { label: "Released", value: "completed" },
          ],
          matches: (row, value) => row.status === value,
        },
      ],
      emptyIcon: FolderHeart,
    },
  },
};
