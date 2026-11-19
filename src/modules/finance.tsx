import {
  AlertCircle,
  Banknote,
  BookOpen,
  CreditCard,
  FileText,
  Files,
  HandCoins,
  Receipt,
  RefreshCcw,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { z } from "zod";
import type { ModuleScreen, AnyRow, ChartConfig } from "@/modules/types";
import type { Column } from "@/components/ui/DataTable";
import type {
  InvoiceRecord,
  InsurancePolicyRecord,
  InsuranceProviderRecord,
  FinancialPeriodRecord,
  LedgerAccountRecord,
  JournalEntryRecord,
  PaymentRecord,
  RefundRecord,
  ServicePriceRecord,
} from "@/services/finance-hr";

// ----------------------------------------------------------------- Catalog

/** Service price list used for invoice line selection (ETB). */
const servicePrices: ServicePriceRecord[] = [
  { id: "svc-001", service: "General consultation", category: "Outpatient", unitPrice: 250, insuranceCovered: true, status: "Active" },
  { id: "svc-002", service: "Complete blood count (CBC)", category: "Laboratory", unitPrice: 180, insuranceCovered: true, status: "Active" },
  { id: "svc-003", service: "Chest X-ray", category: "Radiology", unitPrice: 550, insuranceCovered: true, status: "Active" },
  { id: "svc-004", service: "Inpatient bed (per day)", category: "Ward", unitPrice: 450, insuranceCovered: true, status: "Active" },
  { id: "svc-005", service: "Minor surgery", category: "Theater", unitPrice: 4800, insuranceCovered: false, status: "Active" },
  { id: "svc-006", service: "Physiotherapy session", category: "Therapy", unitPrice: 300, insuranceCovered: false, status: "Active" },
];

// ---------------------------------------------------------------- Invoices

interface InvoiceRow extends InvoiceRecord {
  status: string;
}

const invoices: InvoiceRow[] = [
  { id: "inv-0912", invoiceNumber: "INV-2026-0912", patientId: "MRN-10442", patientName: "Almaz Tadesse", payer: "Self-pay", items: [], subtotal: 1250, discount: 0, total: 1250, paidAmount: 1250, paymentStatus: "Paid", issuedAt: "2026-11-13", dueAt: "2026-11-13", status: "paid" },
  { id: "inv-0913", invoiceNumber: "INV-2026-0913", patientId: "MRN-10443", patientName: "Getachew Molla", payer: "Nyala Insurance", items: [], subtotal: 18600, discount: 900, total: 17700, paidAmount: 7000, paymentStatus: "Partially paid", issuedAt: "2026-11-13", dueAt: "2026-11-20", status: "partial" },
  { id: "inv-0914", invoiceNumber: "INV-2026-0914", patientId: "MRN-10444", patientName: "Sara Alemu", payer: "Ethio Life", items: [], subtotal: 820, discount: 0, total: 820, paidAmount: 820, paymentStatus: "Paid", issuedAt: "2026-11-13", dueAt: "2026-11-13", status: "paid" },
  { id: "inv-0911", invoiceNumber: "INV-2026-0911", patientId: "MRN-10440", patientName: "Yohannes Kebede", payer: "Nyala Insurance", items: [], subtotal: 4250, discount: 0, total: 4250, paidAmount: 0, paymentStatus: "Unpaid", issuedAt: "2026-11-12", dueAt: "2026-11-19", status: "unpaid" },
  { id: "inv-0910", invoiceNumber: "INV-2026-0910", patientId: "MRN-10439", patientName: "Dawit Haile", payer: "Self-pay", items: [], subtotal: 1100, discount: 100, total: 1000, paidAmount: 0, paymentStatus: "Unpaid", issuedAt: "2026-11-12", dueAt: "2026-11-19", status: "unpaid" },
  { id: "inv-0909", invoiceNumber: "INV-2026-0909", patientId: "MRN-10438", patientName: "Meron Assefa", payer: "Self-pay", items: [], subtotal: 640, discount: 0, total: 640, paidAmount: 640, paymentStatus: "Paid", issuedAt: "2026-11-12", dueAt: "2026-11-12", status: "paid" },
  { id: "inv-0905", invoiceNumber: "INV-2026-0905", patientId: "MRN-10435", patientName: "Hanna Girma", payer: "Ethio Life", items: [], subtotal: 3200, discount: 0, total: 3200, paidAmount: 1600, paymentStatus: "Partially paid", issuedAt: "2026-11-10", dueAt: "2026-11-17", status: "partial" },
  { id: "inv-0899", invoiceNumber: "INV-2026-0899", patientId: "MRN-10431", patientName: "Biruk Tesfaye", payer: "Self-pay", items: [], subtotal: 900, discount: 0, total: 900, paidAmount: 900, paymentStatus: "Void", issuedAt: "2026-11-08", dueAt: "2026-11-08", status: "void" },
];

const invoiceColumns: Column<AnyRow>[] = [
  { key: "invoiceNumber", header: "Invoice", sortValue: (row) => String(row.invoiceNumber), render: (row) => <span className="font-mono text-xs font-semibold text-primary-700 dark:text-primary-300">{String(row.invoiceNumber)}</span> },
  { key: "patientName", header: "Patient", sortValue: (row) => String(row.patientName) },
  { key: "payer", header: "Payer", sortValue: (row) => String(row.payer), hideOnTablet: true },
  { key: "total", header: "Total (ETB)", align: "right", sortValue: (row) => Number(row.total), render: (row) => <span className="font-medium">{Number(row.total).toLocaleString("en-US")}</span> },
  { key: "paidAmount", header: "Paid (ETB)", align: "right", sortValue: (row) => Number(row.paidAmount), hideOnMobile: true, render: (row) => <span>{Number(row.paidAmount).toLocaleString("en-US")}</span> },
  { key: "paymentStatus", header: "Payment status", sortValue: (row) => String(row.paymentStatus), render: (row) => <span className="capitalize">{String(row.paymentStatus).toLowerCase()}</span> },
];

const todayInvoices = invoices.filter((i) => i.issuedAt === "2026-11-13");
const unpaidInvoices = invoices.filter((i) => i.paymentStatus === "Unpaid");
const partialInvoices = invoices.filter((i) => i.paymentStatus === "Partially paid");
const outstandingTotal = invoices
  .filter((i) => i.paymentStatus !== "Paid" && i.paymentStatus !== "Void")
  .reduce((sum, i) => sum + (i.total - i.paidAmount), 0);

// ----------------------------------------------------------------- Payments

const payments: PaymentRecord[] = [
  { id: "pay-55130", receiptNumber: "RCP-55130", invoiceNumber: "INV-2026-0912", patientName: "Almaz Tadesse", method: "Mobile money", amount: 1250, isPartial: false, receivedAt: "2026-11-13 09:15", cashier: "Cashier 3", status: "Validated" },
  { id: "pay-55131", receiptNumber: "RCP-55131", invoiceNumber: "INV-2026-0914", patientName: "Sara Alemu", method: "Cash", amount: 820, isPartial: false, receivedAt: "2026-11-13 09:52", cashier: "Cashier 1", status: "Validated" },
  { id: "pay-55132", receiptNumber: "RCP-55132", invoiceNumber: "INV-2026-0913", patientName: "Getachew Molla", method: "Insurance", amount: 7000, isPartial: true, receivedAt: "2026-11-13 10:08", cashier: "Cashier 2", status: "Validated" },
  { id: "pay-55133", receiptNumber: "RCP-55133", invoiceNumber: "INV-2026-0910", patientName: "Dawit Haile", method: "Bank transfer", amount: 1000, isPartial: false, receivedAt: "2026-11-13 10:31", cashier: "Cashier 1", status: "Pending" },
  { id: "pay-55127", receiptNumber: "RCP-55127", invoiceNumber: "INV-2026-0905", patientName: "Hanna Girma", method: "Card", amount: 1600, isPartial: true, receivedAt: "2026-11-12 15:44", cashier: "Cashier 2", status: "Validated" },
  { id: "pay-55124", receiptNumber: "RCP-55124", invoiceNumber: "INV-2026-0909", patientName: "Meron Assefa", method: "Cash", amount: 640, isPartial: false, receivedAt: "2026-11-12 11:10", cashier: "Cashier 1", status: "Reversed" },
];

const paymentColumns: Column<AnyRow>[] = [
  { key: "receiptNumber", header: "Receipt", sortValue: (row) => String(row.receiptNumber), render: (row) => <span className="font-mono text-xs font-semibold text-primary-700 dark:text-primary-300">{String(row.receiptNumber)}</span> },
  { key: "invoiceNumber", header: "Invoice", sortValue: (row) => String(row.invoiceNumber), hideOnTablet: true, render: (row) => <span className="font-mono text-xs">{String(row.invoiceNumber)}</span> },
  { key: "patientName", header: "Patient", sortValue: (row) => String(row.patientName) },
  { key: "method", header: "Method", sortValue: (row) => String(row.method) },
  { key: "amount", header: "Amount (ETB)", align: "right", sortValue: (row) => Number(row.amount), render: (row) => <span className="font-medium">{Number(row.amount).toLocaleString("en-US")}</span> },
  { key: "isPartial", header: "Partial", align: "center", sortValue: (row) => (row.isPartial ? 1 : 0), hideOnMobile: true, render: (row) => (row.isPartial ? <span className="text-warning-600 dark:text-warning-400">Partial</span> : "—") },
  { key: "status", header: "Status", sortValue: (row) => String(row.status), render: (row) => <span className="capitalize">{String(row.status).toLowerCase()}</span> },
];

const validatedPayments = payments.filter((p) => p.status === "Validated");
const todaysCollections = validatedPayments
  .filter((p) => p.receivedAt.startsWith("2026-11-13"))
  .reduce((sum, p) => sum + p.amount, 0);

// ------------------------------------------------------------------ Refunds

const refunds: RefundRecord[] = [
  { id: "rfd-0212", refundNumber: "RFD-0212", invoiceNumber: "INV-2026-0909", patientName: "Biruk Tesfaye", reason: "Duplicate lab charge", amount: 300, requestedAt: "2026-11-13", status: "Pending" },
  { id: "rfd-0211", refundNumber: "RFD-0211", invoiceNumber: "INV-2026-0899", patientName: "Lensa Abera", reason: "Cancelled procedure", amount: 1400, requestedAt: "2026-11-12", status: "Approved" },
  { id: "rfd-0210", refundNumber: "RFD-0210", invoiceNumber: "INV-2026-0884", patientName: "Tesfaye Bekele", reason: "Overpaid deposit", amount: 750, requestedAt: "2026-11-10", status: "Paid out" },
  { id: "rfd-0209", refundNumber: "RFD-0209", invoiceNumber: "INV-2026-0880", patientName: "Genet Ayele", reason: "Service not rendered", amount: 450, requestedAt: "2026-11-08", status: "Rejected" },
];

const refundColumns: Column<AnyRow>[] = [
  { key: "refundNumber", header: "Refund", sortValue: (row) => String(row.refundNumber), render: (row) => <span className="font-mono text-xs font-semibold text-primary-700 dark:text-primary-300">{String(row.refundNumber)}</span> },
  { key: "patientName", header: "Patient", sortValue: (row) => String(row.patientName) },
  { key: "reason", header: "Reason", sortValue: (row) => String(row.reason), hideOnMobile: true },
  { key: "amount", header: "Amount (ETB)", align: "right", sortValue: (row) => Number(row.amount), render: (row) => <span className="font-medium">{Number(row.amount).toLocaleString("en-US")}</span> },
  { key: "requestedAt", header: "Requested", sortValue: (row) => String(row.requestedAt), hideOnTablet: true },
  { key: "status", header: "Status", sortValue: (row) => String(row.status), render: (row) => <span className="capitalize">{String(row.status).toLowerCase()}</span> },
];

// ---------------------------------------------------------------- Insurance

interface ClaimRow {
  id: string;
  claimNumber: string;
  policyNumber: string;
  patientName: string;
  providerName: string;
  eligibility: string;
  claimAmount: number;
  approvedAmount: number;
  status: string;
}

const claims: ClaimRow[] = [
  { id: "clm-7741", claimNumber: "CLM-7741", policyNumber: "NYL-88231", patientName: "Getachew Molla", providerName: "Nyala Insurance", eligibility: "Verified", claimAmount: 14880, approvedAmount: 11904, status: "Approved" },
  { id: "clm-7742", claimNumber: "CLM-7742", policyNumber: "NYL-88190", patientName: "Yohannes Kebede", providerName: "Nyala Insurance", eligibility: "Verified", claimAmount: 2975, approvedAmount: 0, status: "Submitted" },
  { id: "clm-7743", claimNumber: "CLM-7743", policyNumber: "ETHL-12045", patientName: "Sara Alemu", providerName: "Ethio Life", eligibility: "Verified", claimAmount: 738, approvedAmount: 664, status: "Reconciled" },
  { id: "clm-7744", claimNumber: "CLM-7744", policyNumber: "ETHL-12012", patientName: "Solomon Gebre", providerName: "Ethio Life", eligibility: "Not verified", claimAmount: 2100, approvedAmount: 0, status: "Draft" },
  { id: "clm-7745", claimNumber: "CLM-7745", policyNumber: "NYL-88021", patientName: "Meron Assefa", providerName: "Nyala Insurance", eligibility: "Expired", claimAmount: 640, approvedAmount: 0, status: "Rejected" },
];

const insuranceProviders: InsuranceProviderRecord[] = [
  { id: "ins-001", name: "Nyala Insurance", contactPerson: "Demo claims desk", phone: "+251-900-200-001", plans: ["Standard", "Premium"], defaultCoverageRate: 80, status: "Active" },
  { id: "ins-002", name: "Ethio Life", contactPerson: "Demo provider desk", phone: "+251-900-200-002", plans: ["Essential", "Family"], defaultCoverageRate: 70, status: "Active" },
];

const insurancePolicies: InsurancePolicyRecord[] = [
  { id: "pol-001", providerId: "ins-001", providerName: "Nyala Insurance", patientId: "MRN-10443", patientName: "Synthetic patient A", policyNumber: "NYL-88231", plan: "Premium", validUntil: "2027-06-30", eligibility: "Verified" },
  { id: "pol-002", providerId: "ins-001", providerName: "Nyala Insurance", patientId: "MRN-10440", patientName: "Synthetic patient B", policyNumber: "NYL-88190", plan: "Standard", validUntil: "2027-02-28", eligibility: "Verified" },
  { id: "pol-003", providerId: "ins-002", providerName: "Ethio Life", patientId: "MRN-10444", patientName: "Synthetic patient C", policyNumber: "ETHL-12045", plan: "Essential", validUntil: "2026-12-31", eligibility: "Verified" },
  { id: "pol-004", providerId: "ins-002", providerName: "Ethio Life", patientId: "MRN-10438", patientName: "Synthetic patient D", policyNumber: "ETHL-12012", plan: "Family", validUntil: "2026-01-31", eligibility: "Expired" },
];

const ledgerAccounts: LedgerAccountRecord[] = [
  { id: "acc-001", code: "1000", name: "Cash on hand", type: "Asset", balance: 124500 },
  { id: "acc-002", code: "1100", name: "Accounts receivable", type: "Asset", balance: 228400 },
  { id: "acc-003", code: "4000", name: "Patient service income", type: "Income", balance: 4210000 },
  { id: "acc-004", code: "5000", name: "Medical supplies expense", type: "Expense", balance: 1380000 },
  { id: "acc-005", code: "5100", name: "Payroll expense", type: "Expense", balance: 1840000 },
];

const financialPeriods: FinancialPeriodRecord[] = [
  { id: "period-2026-11", name: "November 2026", startsAt: "2026-11-01", endsAt: "2026-11-30", status: "Open" },
  { id: "period-2026-10", name: "October 2026", startsAt: "2026-10-01", endsAt: "2026-10-31", status: "Closed" },
];

const claimColumns: Column<AnyRow>[] = [
  { key: "claimNumber", header: "Claim", sortValue: (row) => String(row.claimNumber), render: (row) => <span className="font-mono text-xs font-semibold text-primary-700 dark:text-primary-300">{String(row.claimNumber)}</span> },
  { key: "policyNumber", header: "Policy", sortValue: (row) => String(row.policyNumber), hideOnMobile: true, render: (row) => <span className="font-mono text-xs">{String(row.policyNumber)}</span> },
  { key: "patientName", header: "Patient", sortValue: (row) => String(row.patientName) },
  { key: "providerName", header: "Provider", sortValue: (row) => String(row.providerName), hideOnTablet: true },
  { key: "eligibility", header: "Eligibility", sortValue: (row) => String(row.eligibility) },
  { key: "claimAmount", header: "Claim (ETB)", align: "right", sortValue: (row) => Number(row.claimAmount), render: (row) => <span className="font-medium">{Number(row.claimAmount).toLocaleString("en-US")}</span> },
  { key: "status", header: "Status", sortValue: (row) => String(row.status), render: (row) => <span className="capitalize">{String(row.status).toLowerCase()}</span> },
];

// ---------------------------------------------------------------- Journal

const journalEntries: JournalEntryRecord[] = [
  { id: "je-4011", entryNumber: "JE-4011", entryDate: "2026-11-13", account: "Cash on hand", description: "Morning OPD collections", debit: 12450, credit: 0, reference: "RCP-55131", status: "Posted" },
  { id: "je-4012", entryNumber: "JE-4012", entryDate: "2026-11-13", account: "Accounts receivable — insurance", description: "Nyala claim CLM-7742", debit: 2975, credit: 0, reference: "CLM-7742", status: "Posted" },
  { id: "je-4010", entryNumber: "JE-4010", entryDate: "2026-11-12", account: "Pharmacy purchases", description: "PO-1180 goods received", debit: 0, credit: 384000, reference: "PO-1180", status: "Posted" },
  { id: "je-4009", entryNumber: "JE-4009", entryDate: "2026-11-12", account: "Salaries payable", description: "November payroll accrual", debit: 0, credit: 86350, reference: "PAY-2026-11", status: "Posted" },
  { id: "je-4008", entryNumber: "JE-4008", entryDate: "2026-11-11", account: "Utilities expense", description: "Electricity — October meter", debit: 21000, credit: 0, reference: "UTL-10-26", status: "Draft" },
];

const journalColumns: Column<AnyRow>[] = [
  { key: "entryNumber", header: "Entry", sortValue: (row) => String(row.entryNumber), render: (row) => <span className="font-mono text-xs font-semibold text-primary-700 dark:text-primary-300">{String(row.entryNumber)}</span> },
  { key: "entryDate", header: "Date", sortValue: (row) => String(row.entryDate), hideOnMobile: true },
  { key: "account", header: "Account", sortValue: (row) => String(row.account) },
  { key: "description", header: "Description", sortValue: (row) => String(row.description), hideOnMobile: true },
  { key: "debit", header: "Debit (ETB)", align: "right", sortValue: (row) => Number(row.debit), render: (row) => (Number(row.debit) ? Number(row.debit).toLocaleString("en-US") : "—") },
  { key: "credit", header: "Credit (ETB)", align: "right", sortValue: (row) => Number(row.credit), render: (row) => (Number(row.credit) ? Number(row.credit).toLocaleString("en-US") : "—") },
  { key: "status", header: "Status", sortValue: (row) => String(row.status), render: (row) => <span className="capitalize">{String(row.status).toLowerCase()}</span> },
];

// ------------------------------------------------------------ Report charts

const revenueSeries: Record<string, string | number>[] = [
  { month: "Jun", revenue: 3620000, expense: 2750000 },
  { month: "Jul", revenue: 3850000, expense: 2880000 },
  { month: "Aug", revenue: 3710000, expense: 2950000 },
  { month: "Sep", revenue: 3980000, expense: 3020000 },
  { month: "Oct", revenue: 4180000, expense: 3180000 },
  { month: "Nov", revenue: 4210000, expense: 3240000 },
];

const revenueMix: { name: string; value: number }[] = [
  { name: "Self-pay", value: 46 },
  { name: "Insurance", value: 34 },
  { name: "Government programs", value: 14 },
  { name: "Donors / NGOs", value: 6 },
];

const expenseBars: Record<string, string | number>[] = [
  { category: "Salaries", amount: 1650 },
  { category: "Supplies", amount: 620 },
  { category: "Medicines", amount: 540 },
  { category: "Utilities", amount: 210 },
  { category: "Maintenance", amount: 140 },
  { category: "Other", amount: 180 },
];

const collectionBars: Record<string, string | number>[] = [
  { method: "Cash", amount: 38 },
  { method: "Mobile", amount: 29 },
  { method: "Insurance", amount: 21 },
  { method: "Card", amount: 9 },
  { method: "Bank", amount: 3 },
];

// ------------------------------------------------------------ Form schemas

const invoiceFormSchema = z
  .object({
    patientId: z.string().min(1, "Enter the patient record number"),
    patientName: z.string().min(2, "Patient name is required"),
    payer: z.string().min(1, "Select a payer"),
    service: z.string().min(1, "Select a billable service"),
    quantity: z.coerce.number().int("Quantity must be a whole number").min(1, "Quantity must be at least 1").max(999, "Quantity is too large"),
    unitPrice: z.coerce.number().min(1, "Enter the unit price in ETB"),
    discount: z.coerce.number().min(0, "Discount cannot be negative"),
    total: z.coerce.number().min(1, "Enter the invoice total"),
    issuedAt: z.string().min(1, "Select the issue date"),
    dueAt: z.string().min(1, "Select the payment due date"),
  })
  .refine((data) => data.total === data.quantity * data.unitPrice - data.discount, {
    message: "Total must equal (quantity × unit price) − discount",
    path: ["total"],
  });

const paymentFormSchema = z.object({
  invoiceNumber: z.string().min(1, "Enter the invoice number"),
  patientName: z.string().min(2, "Patient name is required"),
  method: z.enum(["Cash", "Bank transfer", "Mobile money", "Card", "Insurance"], {
    message: "Select a payment method",
  }),
  amount: z.coerce.number().min(1, "Enter the payment amount in ETB"),
  isPartial: z.boolean().optional(),
  notes: z.string().max(300, "Notes are too long").optional().or(z.literal("")),
});

const refundFormSchema = z.object({
  invoiceNumber: z.string().min(1, "Enter the invoice number"),
  patientName: z.string().min(2, "Patient name is required"),
  reason: z.string().min(3, "Enter a refund reason").max(300, "Reason is too long"),
  amount: z.coerce.number().positive("Refund amount must be greater than zero"),
});

// ------------------------------------------------------------------ Screens

export const financeScreens: Record<string, ModuleScreen> = {
  "/billing": {
    kind: "list",
    screen: {
      description: "Billing dashboard — today's invoicing, collections and outstanding balances.",
      columns: invoiceColumns,
      data: invoices,
      keyExtractor: (row) => String(row.id),
      searchKeys: ["invoiceNumber", "patientName", "payer"],
      searchPlaceholder: "Search invoice, patient or payer…",
      filters: [
        {
          label: "Payment status",
          options: [
            { label: "All", value: "" },
            { label: "Paid", value: "Paid" },
            { label: "Partially paid", value: "Partially paid" },
            { label: "Unpaid", value: "Unpaid" },
            { label: "Void", value: "Void" },
          ],
          matches: (row, value) => row.paymentStatus === value,
        },
      ],
      stats: [
        { label: "Today's invoices", value: String(todayInvoices.length), icon: <Receipt className="h-5 w-5" />, tone: "primary" },
        { label: "Today's collections", value: `ETB ${todaysCollections.toLocaleString("en-US")}`, icon: <HandCoins className="h-5 w-5" />, tone: "success" },
        { label: "Unpaid invoices", value: String(unpaidInvoices.length), icon: <AlertCircle className="h-5 w-5" />, tone: "danger" },
        { label: "Partially paid", value: String(partialInvoices.length), icon: <Wallet className="h-5 w-5" />, tone: "warning" },
        { label: "Outstanding balance", value: `ETB ${outstandingTotal.toLocaleString("en-US")}`, icon: <Banknote className="h-5 w-5" />, tone: "warning" },
        { label: "Refunds pending", value: String(refunds.filter((r) => r.status === "Pending").length), icon: <RefreshCcw className="h-5 w-5" />, tone: "danger" },
      ],
      emptyIcon: Receipt,
    },
  },
  "/invoices": {
    kind: "list",
    screen: {
      description: "All issued invoices with settlement progress. Open “New Invoice” to bill services.",
      columns: invoiceColumns,
      data: invoices,
      keyExtractor: (row) => String(row.id),
      searchKeys: ["invoiceNumber", "patientName"],
      searchPlaceholder: "Search invoice number or patient…",
      filters: [
        {
          label: "Payment status",
          options: [
            { label: "All", value: "" },
            { label: "Paid", value: "Paid" },
            { label: "Partially paid", value: "Partially paid" },
            { label: "Unpaid", value: "Unpaid" },
            { label: "Void", value: "Void" },
          ],
          matches: (row, value) => row.paymentStatus === value,
        },
      ],
      stats: [
        { label: "Invoices (30 days)", value: String(invoices.length), icon: <FileText className="h-5 w-5" />, tone: "primary" },
        { label: "Total billed", value: `ETB ${invoices.reduce((s, i) => s + i.total, 0).toLocaleString("en-US")}`, icon: <FileText className="h-5 w-5" />, tone: "success" },
        { label: "Collected", value: `ETB ${invoices.reduce((s, i) => s + i.paidAmount, 0).toLocaleString("en-US")}`, icon: <FileText className="h-5 w-5" />, tone: "success" },
        { label: "Outstanding", value: `ETB ${outstandingTotal.toLocaleString("en-US")}`, icon: <FileText className="h-5 w-5" />, tone: "warning" },
      ],
      emptyIcon: FileText,
    },
  },
  "/invoices/new": {
    kind: "form",
    screen: {
      description: "Create an invoice by selecting billable services with quantity, unit price, discount and total (ETB).",
      schema: invoiceFormSchema,
      sections: [
        {
          title: "Patient and payer",
          fields: [
            { name: "patientId", label: "Patient record number", type: "text", required: true, placeholder: "MRN-10444", hint: "Patient must be registered before billing." },
            { name: "patientName", label: "Patient name", type: "text", required: true, span: 2 },
            {
              name: "payer",
              label: "Payer",
              type: "select",
              required: true,
              options: [
                { label: "Self-pay", value: "Self-pay" },
                { label: "Nyala Insurance", value: "Nyala Insurance" },
                { label: "Ethio Life", value: "Ethio Life" },
                { label: "Government program", value: "Government program" },
              ],
            },
          ],
        },
        {
          title: "Service line",
          description: "Prices are taken from the service catalog; totals are validated automatically.",
          fields: [
            {
              name: "service",
              label: "Service",
              type: "select",
              required: true,
              span: 2,
              options: servicePrices.map((s) => ({ label: `${s.service} — ETB ${s.unitPrice}`, value: s.service })),
            },
            { name: "quantity", label: "Quantity", type: "number", required: true, defaultValue: "1" },
            { name: "unitPrice", label: "Unit price (ETB)", type: "number", required: true },
            { name: "discount", label: "Discount (ETB)", type: "number", defaultValue: "0" },
            { name: "total", label: "Total (ETB)", type: "number", required: true, hint: "Quantity × unit price − discount" },
          ],
        },
        {
          title: "Billing terms",
          fields: [
            { name: "issuedAt", label: "Issue date", type: "date", required: true },
            { name: "dueAt", label: "Payment due date", type: "date", required: true },
          ],
        },
      ],
      submitLabel: "Create invoice",
      confirmTitle: "Confirm invoice",
      confirmMessage: "The invoice will be issued for the selected patient and services. No real transaction is performed in this frontend preview.",
      successTitle: "Invoice created",
      successDescription: "The invoice draft was validated. Printing and payment posting become available once the backend is connected.",
      backHref: "/invoices",
    },
  },
  "/payments": {
    kind: "list",
    screen: {
      description: "Payment history — cash, bank transfer, mobile money, card and insurance receipts (ETB).",
      columns: paymentColumns,
      data: payments,
      keyExtractor: (row) => String(row.id),
      searchKeys: ["receiptNumber", "invoiceNumber", "patientName", "method"],
      searchPlaceholder: "Search receipt, invoice or method…",
      filters: [
        {
          label: "Method",
          options: [
            { label: "All methods", value: "" },
            { label: "Cash", value: "Cash" },
            { label: "Bank transfer", value: "Bank transfer" },
            { label: "Mobile money", value: "Mobile money" },
            { label: "Card", value: "Card" },
            { label: "Insurance", value: "Insurance" },
          ],
          matches: (row, value) => row.method === value,
        },
        {
          label: "Status",
          options: [
            { label: "All", value: "" },
            { label: "Validated", value: "Validated" },
            { label: "Pending", value: "Pending" },
            { label: "Reversed", value: "Reversed" },
          ],
          matches: (row, value) => row.status === value,
        },
      ],
      stats: [
        { label: "Collected today", value: `ETB ${todaysCollections.toLocaleString("en-US")}`, icon: <CreditCard className="h-5 w-5" />, tone: "success" },
        { label: "Partial payments", value: String(payments.filter((p) => p.isPartial).length), icon: <Wallet className="h-5 w-5" />, tone: "warning" },
        { label: "Insurance receipts", value: String(payments.filter((p) => p.method === "Insurance").length), icon: <ShieldCheck className="h-5 w-5" />, tone: "primary" },
        { label: "Pending validation", value: String(payments.filter((p) => p.status === "Pending").length), icon: <AlertCircle className="h-5 w-5" />, tone: "danger" },
      ],
      emptyIcon: CreditCard,
    },
  },
  "/payments/register": {
    kind: "form",
    screen: {
      description: "Register a payment against an invoice — cash, bank transfer, mobile money, card or insurance (ETB).",
      schema: paymentFormSchema,
      sections: [
        {
          title: "Invoice reference",
          fields: [
            { name: "invoiceNumber", label: "Invoice number", type: "text", required: true, placeholder: "INV-2026-0913" },
            { name: "patientName", label: "Patient name", type: "text", required: true },
          ],
        },
        {
          title: "Payment details",
          description: "Partial payments record only part of the invoice total; the balance remains outstanding.",
          fields: [
            {
              name: "method",
              label: "Payment method",
              type: "select",
              required: true,
              options: [
                { label: "Cash", value: "Cash" },
                { label: "Bank transfer", value: "Bank transfer" },
                { label: "Mobile money", value: "Mobile money" },
                { label: "Card", value: "Card" },
                { label: "Insurance", value: "Insurance" },
              ],
            },
            { name: "amount", label: "Amount (ETB)", type: "number", required: true },
            { name: "isPartial", label: "This is a partial payment", type: "checkbox" },
            { name: "notes", label: "Notes", type: "textarea", span: 2, hint: "Optional remark printed on the receipt." },
          ],
        },
      ],
      submitLabel: "Register payment",
      confirmTitle: "Confirm payment",
      confirmMessage: "A receipt will be generated for this payment. This is a frontend preview — no real money movement occurs.",
      successTitle: "Payment registered",
      successDescription: "The receipt is queued for printing in the demonstration session.",
      backHref: "/payments",
    },
  },
  "/refunds": {
    kind: "list",
    screen: {
      description: "Refund requests with approval and payout tracking.",
      columns: refundColumns,
      data: refunds,
      keyExtractor: (row) => String(row.id),
      searchKeys: ["refundNumber", "patientName", "reason"],
      searchPlaceholder: "Search refund, patient or reason…",
      filters: [
        {
          label: "Status",
          options: [
            { label: "All", value: "" },
            { label: "Pending", value: "Pending" },
            { label: "Approved", value: "Approved" },
            { label: "Paid out", value: "Paid out" },
            { label: "Rejected", value: "Rejected" },
          ],
          matches: (row, value) => row.status === value,
        },
      ],
      stats: [
        { label: "Pending", value: String(refunds.filter((r) => r.status === "Pending").length), icon: <RefreshCcw className="h-5 w-5" />, tone: "warning" },
        { label: "Approved", value: String(refunds.filter((r) => r.status === "Approved").length), icon: <RefreshCcw className="h-5 w-5" />, tone: "primary" },
        { label: "Paid out (30d)", value: String(refunds.filter((r) => r.status === "Paid out").length), icon: <RefreshCcw className="h-5 w-5" />, tone: "success" },
        { label: "Total refunded", value: `ETB ${refunds.filter((r) => r.status === "Paid out").reduce((s, r) => s + r.amount, 0).toLocaleString("en-US")}`, icon: <RefreshCcw className="h-5 w-5" />, tone: "danger" },
      ],
      emptyIcon: RefreshCcw,
    },
  },
  "/refunds/request": {
    kind: "form",
    screen: {
      description: "Submit a refund request for authorized review. This preview does not move money or issue payouts.",
      schema: refundFormSchema,
      sections: [{
        title: "Refund request",
        fields: [
          { name: "invoiceNumber", label: "Invoice number", type: "text", required: true, placeholder: "INV-2026-0913" },
          { name: "patientName", label: "Patient name", type: "text", required: true },
          { name: "amount", label: "Requested amount (ETB)", type: "number", required: true },
          { name: "reason", label: "Reason", type: "textarea", required: true, span: 2 },
        ],
      }],
      submitLabel: "Submit refund request",
      confirmTitle: "Submit refund for review",
      confirmMessage: "The refund request will be staged for authorized review only. No refund or payout is performed in this frontend.",
      successTitle: "Refund request submitted",
      successDescription: "The request is a demonstration draft; backend review and payment processing are required.",
      backHref: "/refunds",
    },
  },
  "/insurance": {
    kind: "list",
    screen: {
      description: "Insurance claims with policy numbers, eligibility checks and reconciliation status.",
      columns: claimColumns,
      data: claims,
      keyExtractor: (row) => String(row.id),
      searchKeys: ["claimNumber", "policyNumber", "patientName", "providerName"],
      searchPlaceholder: "Search claim, policy, patient or provider…",
      filters: [
        {
          label: "Provider",
          options: [
            { label: "All providers", value: "" },
            ...[...new Set(claims.map((c) => c.providerName))].map((p) => ({ label: p, value: p })),
          ],
          matches: (row, value) => row.providerName === value,
        },
        {
          label: "Status",
          options: [
            { label: "All", value: "" },
            { label: "Draft", value: "Draft" },
            { label: "Submitted", value: "Submitted" },
            { label: "Approved", value: "Approved" },
            { label: "Reconciled", value: "Reconciled" },
            { label: "Rejected", value: "Rejected" },
          ],
          matches: (row, value) => row.status === value,
        },
      ],
      stats: [
        { label: "Providers", value: "2", hint: "Nyala Insurance, Ethio Life", icon: <ShieldCheck className="h-5 w-5" />, tone: "primary" },
        { label: "Open claims", value: String(claims.filter((c) => c.status === "Submitted" || c.status === "Draft").length), icon: <ShieldCheck className="h-5 w-5" />, tone: "warning" },
        { label: "Approved value", value: `ETB ${claims.reduce((s, c) => s + c.approvedAmount, 0).toLocaleString("en-US")}`, icon: <ShieldCheck className="h-5 w-5" />, tone: "success" },
        { label: "Pending reconciliation", value: String(claims.filter((c) => c.status === "Approved").length), icon: <ShieldCheck className="h-5 w-5" />, tone: "danger" },
      ],
      emptyIcon: ShieldCheck,
    },
  },
  "/insurance/providers": {
    kind: "list",
    screen: {
      description: "Synthetic insurance provider directory, plan coverage and contact details.",
      columns: [
        { key: "name", header: "Provider", sortValue: (row) => String(row.name) },
        { key: "contactPerson", header: "Contact", sortValue: (row) => String(row.contactPerson) },
        { key: "phone", header: "Phone", sortValue: (row) => String(row.phone) },
        { key: "plans", header: "Plans", sortValue: (row) => (row.plans as string[]).join(", "), render: (row) => (row.plans as string[]).join(", ") },
        { key: "defaultCoverageRate", header: "Coverage", sortValue: (row) => Number(row.defaultCoverageRate), render: (row) => `${String(row.defaultCoverageRate)}%` },
        { key: "status", header: "Status", sortValue: (row) => String(row.status) },
      ],
      data: insuranceProviders,
      keyExtractor: (row) => String(row.id),
      searchKeys: ["name", "contactPerson", "phone"],
      searchPlaceholder: "Search insurance provider…",
      emptyIcon: ShieldCheck,
    },
  },
  "/insurance/policies": {
    kind: "list",
    screen: {
      description: "Patient insurance policies and synthetic eligibility status; eligibility must be verified by the payer backend.",
      columns: [
        { key: "patientName", header: "Patient", sortValue: (row) => String(row.patientName), render: (row) => <>{String(row.patientName)}<br /><span className="text-xs text-slate-500">{String(row.patientId)}</span></> },
        { key: "providerName", header: "Provider", sortValue: (row) => String(row.providerName) },
        { key: "policyNumber", header: "Policy", sortValue: (row) => String(row.policyNumber) },
        { key: "plan", header: "Plan", sortValue: (row) => String(row.plan) },
        { key: "validUntil", header: "Valid until", sortValue: (row) => String(row.validUntil) },
        { key: "eligibility", header: "Eligibility", sortValue: (row) => String(row.eligibility) },
      ],
      data: insurancePolicies,
      keyExtractor: (row) => String(row.id),
      searchKeys: ["patientName", "patientId", "providerName", "policyNumber"],
      searchPlaceholder: "Search patient, provider or policy…",
      filters: [{
        label: "Eligibility",
        options: [{ label: "All", value: "" }, { label: "Verified", value: "Verified" }, { label: "Not verified", value: "Not verified" }, { label: "Expired", value: "Expired" }],
        matches: (row, value) => row.eligibility === value,
      }],
      emptyIcon: ShieldCheck,
    },
  },
  "/accounting": {
    kind: "analytics",
    screen: {
      description: "Hospital accounts — income, expenses, payer mix and the open financial period (Nov 2026).",
      kpis: [
        { label: "Income (Nov)", value: "ETB 4.21M", change: { value: 1.4 }, icon: <Banknote className="h-5 w-5" />, tone: "success" },
        { label: "Expenses (Nov)", value: "ETB 3.24M", change: { value: 2.1, positiveIsGood: false }, icon: <Banknote className="h-5 w-5" />, tone: "warning" },
        { label: "Open period", value: "Nov 2026", hint: "Closes Nov 30", icon: <BookOpen className="h-5 w-5" />, tone: "primary" },
        { label: "Journal entries", value: String(journalEntries.length), hint: "1 draft pending posting", icon: <BookOpen className="h-5 w-5" />, tone: "primary" },
      ],
      charts: [
        {
          type: "area",
          title: "Income vs expenses",
          subtitle: "Last 6 months (ETB millions)",
          data: revenueSeries,
          xKey: "month",
          series: [
            { key: "revenue", label: "Income", color: "#16A34A" },
            { key: "expense", label: "Expenses", color: "#DC2626" },
          ],
        } as ChartConfig,
        {
          type: "pie",
          title: "Payer mix (Nov)",
          data: revenueMix,
        } as ChartConfig,
        {
          type: "bar",
          title: "Expenses by category",
          subtitle: "November (thousands ETB)",
          data: expenseBars,
          xKey: "category",
          series: [{ key: "amount", label: "Amount", color: "#1565C0" }],
        } as ChartConfig,
      ],
    },
  },
  "/journal-entries": {
    kind: "list",
    screen: {
      description: "Journal entries posted to the ledger for the open financial period.",
      columns: journalColumns,
      data: journalEntries,
      keyExtractor: (row) => String(row.id),
      searchKeys: ["entryNumber", "account", "description", "reference"],
      searchPlaceholder: "Search entry, account or reference…",
      filters: [
        {
          label: "Status",
          options: [
            { label: "All", value: "" },
            { label: "Posted", value: "Posted" },
            { label: "Draft", value: "Draft" },
          ],
          matches: (row, value) => row.status === value,
        },
      ],
      stats: [
        { label: "Entries (period)", value: String(journalEntries.length), icon: <BookOpen className="h-5 w-5" />, tone: "primary" },
        { label: "Total debit", value: `ETB ${journalEntries.reduce((s, e) => s + e.debit, 0).toLocaleString("en-US")}`, icon: <BookOpen className="h-5 w-5" />, tone: "success" },
        { label: "Total credit", value: `ETB ${journalEntries.reduce((s, e) => s + e.credit, 0).toLocaleString("en-US")}`, icon: <BookOpen className="h-5 w-5" />, tone: "warning" },
        { label: "Drafts", value: String(journalEntries.filter((e) => e.status === "Draft").length), icon: <AlertCircle className="h-5 w-5" />, tone: "danger" },
      ],
      emptyIcon: BookOpen,
    },
  },
  "/accounts": {
    kind: "list",
    screen: {
      description: "Synthetic general ledger accounts with balances in ETB.",
      columns: [
        { key: "code", header: "Code", sortValue: (row) => String(row.code) },
        { key: "name", header: "Account", sortValue: (row) => String(row.name) },
        { key: "type", header: "Type", sortValue: (row) => String(row.type) },
        { key: "balance", header: "Balance (ETB)", align: "right", sortValue: (row) => Number(row.balance), render: (row) => Number(row.balance).toLocaleString("en-US") },
      ],
      data: ledgerAccounts,
      keyExtractor: (row) => String(row.id),
      searchKeys: ["code", "name", "type"],
      searchPlaceholder: "Search account code, name or type…",
      emptyIcon: BookOpen,
    },
  },
  "/financial-periods": {
    kind: "list",
    screen: {
      description: "Financial reporting periods and close status. Posting and closing require backend authorization.",
      columns: [
        { key: "name", header: "Period", sortValue: (row) => String(row.name) },
        { key: "startsAt", header: "Start date", sortValue: (row) => String(row.startsAt) },
        { key: "endsAt", header: "End date", sortValue: (row) => String(row.endsAt) },
        { key: "status", header: "Status", sortValue: (row) => String(row.status) },
      ],
      data: financialPeriods,
      keyExtractor: (row) => String(row.id),
      searchKeys: ["name", "status"],
      searchPlaceholder: "Search financial periods…",
      emptyIcon: BookOpen,
    },
  },
  "/financial-reports": {
    kind: "analytics",
    screen: {
      description: "Standard financial reports for finance and hospital management.",
      kpis: [
        { label: "Reports this month", value: "12", icon: <Files className="h-5 w-5" />, tone: "primary" },
        { label: "Pending review", value: "2", icon: <Files className="h-5 w-5" />, tone: "warning" },
        { label: "Next deadline", value: "Nov 30", hint: "Monthly statement", icon: <Files className="h-5 w-5" />, tone: "danger" },
        { label: "Audit status", value: "On track", icon: <Files className="h-5 w-5" />, tone: "success" },
      ],
      charts: [
        {
          type: "area",
          title: "Revenue trend",
          subtitle: "Monthly revenue (ETB millions)",
          data: revenueSeries,
          xKey: "month",
          series: [{ key: "revenue", label: "Revenue", color: "#1565C0" }],
        } as ChartConfig,
        {
          type: "bar",
          title: "Collections by method",
          subtitle: "Share of monthly collections (%)",
          data: collectionBars,
          xKey: "method",
          series: [{ key: "amount", label: "Share", color: "#7C3AED" }],
        } as ChartConfig,
        {
          type: "pie",
          title: "Revenue by payer",
          data: revenueMix,
        } as ChartConfig,
      ],
    },
  },
};

/** Services available for invoice line selection (exported for tests/integration). */
export { servicePrices, invoiceFormSchema, paymentFormSchema, refundFormSchema };
