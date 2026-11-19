/**
 * Typed API boundary for the finance, HR and administration domains.
 * The frontend phase uses in-memory demonstration data only — no real
 * financial transactions are performed. A future backend implements
 * `FinanceHrService` and the UI swaps adapters without further changes.
 */

// ------------------------------------------------------------------- Billing

export type InvoicePaymentStatus =
  | "Unpaid"
  | "Partially paid"
  | "Paid"
  | "Void";

export interface InvoiceLineItem {
  serviceId: string;
  serviceName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  patientId: string;
  patientName: string;
  payer: string;
  items: InvoiceLineItem[];
  /** All monetary amounts are Ethiopian Birr (ETB). */
  subtotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  paymentStatus: InvoicePaymentStatus;
  issuedAt: string;
  dueAt: string;
}

// ------------------------------------------------------------------ Payments

export type PaymentMethod =
  | "Cash"
  | "Bank transfer"
  | "Mobile money"
  | "Card"
  | "Insurance";

export type PaymentRecordStatus = "Pending" | "Validated" | "Reversed";

export interface PaymentRecord {
  id: string;
  receiptNumber: string;
  invoiceNumber: string;
  patientName: string;
  method: PaymentMethod;
  amount: number;
  /** True when the payment settles only part of the invoice total. */
  isPartial: boolean;
  receivedAt: string;
  cashier: string;
  status: PaymentRecordStatus;
}

export type RefundStatus = "Pending" | "Approved" | "Paid out" | "Rejected";

export interface RefundRecord {
  id: string;
  refundNumber: string;
  invoiceNumber: string;
  patientName: string;
  reason: string;
  amount: number;
  requestedAt: string;
  status: RefundStatus;
}

// ----------------------------------------------------------------- Insurance

export interface InsuranceProviderRecord {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  plans: string[];
  defaultCoverageRate: number;
  status: "Active" | "Suspended";
}

export type EligibilityStatus = "Verified" | "Not verified" | "Expired";

export interface InsurancePolicyRecord {
  id: string;
  providerId: string;
  providerName: string;
  patientId: string;
  patientName: string;
  policyNumber: string;
  plan: string;
  validUntil: string;
  eligibility: EligibilityStatus;
}

export type ClaimStatus =
  | "Draft"
  | "Submitted"
  | "Approved"
  | "Rejected"
  | "Reconciled";

export interface InsuranceClaimRecord {
  id: string;
  claimNumber: string;
  policyNumber: string;
  patientName: string;
  providerName: string;
  claimAmount: number;
  approvedAmount: number;
  submittedAt: string;
  status: ClaimStatus;
}

// ---------------------------------------------------------------- Accounting

export interface JournalEntryRecord {
  id: string;
  entryNumber: string;
  entryDate: string;
  account: string;
  description: string;
  debit: number;
  credit: number;
  reference: string;
  status: "Posted" | "Draft";
}

export interface FinancialPeriodRecord {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  status: "Open" | "Closed";
}

export interface LedgerAccountRecord {
  id: string;
  code: string;
  name: string;
  type: "Asset" | "Liability" | "Income" | "Expense" | "Equity";
  balance: number;
}

// --------------------------------------------------------------------- Admin

export type ServicePriceStatus = "Active" | "Inactive";

export interface ServicePriceRecord {
  id: string;
  service: string;
  category: string;
  unitPrice: number;
  insuranceCovered: boolean;
  status: ServicePriceStatus;
}

// ------------------------------------------------------------------------ HR

export type StaffCategory = "Doctor" | "Nurse" | "Administrative" | "Other";

export type EmployeePresenceStatus =
  | "Present"
  | "On shift"
  | "Absent"
  | "On leave"
  | "Off duty";

export interface EmployeeRecord {
  id: string;
  employeeId: string;
  name: string;
  role: string;
  category: StaffCategory;
  department: string;
  hiredAt: string;
  phone: string;
  email: string;
  qualifications: string[];
  documents: string[];
  employmentStatus: "Active" | "Suspended" | "Terminated";
  presenceToday: EmployeePresenceStatus;
}

export interface AttendanceRecord {
  id: string;
  employeeName: string;
  department: string;
  shift: string;
  checkIn: string;
  checkOut: string;
  lateMinutes: number;
  status: "On shift" | "Completed" | "Absent" | "Late";
}

export type ShiftType = "Doctor shift" | "Nurse shift" | "Emergency duty";

export interface ShiftRecord {
  id: string;
  employeeName: string;
  department: string;
  day: string;
  hours: string;
  shiftType: ShiftType;
  status: "Confirmed" | "Tentative" | "Change requested";
}

export interface LeaveRequestRecord {
  id: string;
  employeeName: string;
  leaveType: string;
  from: string;
  to: string;
  days: number;
  status: "Pending" | "Approved" | "Rejected" | "Completed";
}

export interface LeaveBalanceRecord {
  id: string;
  employeeName: string;
  annualDays: number;
  sickDays: number;
  daysTakenThisYear: number;
}

export interface PayslipRecord {
  id: string;
  employeeName: string;
  role: string;
  period: string;
  baseSalary: number;
  allowances: number;
  overtime: number;
  deductions: number;
  netPay: number;
  status: "Approved" | "Pending" | "Paid";
}

// -------------------------------------------------------------- Service API

/** API integration boundary; frontends currently use synthetic demo data. */
export interface FinanceHrService {
  listInvoices(): Promise<InvoiceRecord[]>;
  createInvoice(input: Omit<InvoiceRecord, "id" | "invoiceNumber">): Promise<InvoiceRecord>;
  listPayments(): Promise<PaymentRecord[]>;
  registerPayment(input: Omit<PaymentRecord, "id" | "receiptNumber">): Promise<PaymentRecord>;
  listRefunds(): Promise<RefundRecord[]>;
  listInsuranceProviders(): Promise<InsuranceProviderRecord[]>;
  listInsurancePolicies(): Promise<InsurancePolicyRecord[]>;
  listInsuranceClaims(): Promise<InsuranceClaimRecord[]>;
  listJournalEntries(): Promise<JournalEntryRecord[]>;
  listFinancialPeriods(): Promise<FinancialPeriodRecord[]>;
  listLedgerAccounts(): Promise<LedgerAccountRecord[]>;
  listServicePrices(): Promise<ServicePriceRecord[]>;
  listEmployees(): Promise<EmployeeRecord[]>;
  listAttendance(): Promise<AttendanceRecord[]>;
  listShifts(): Promise<ShiftRecord[]>;
  listLeaveRequests(): Promise<LeaveRequestRecord[]>;
  listLeaveBalances(): Promise<LeaveBalanceRecord[]>;
  listPayslips(): Promise<PayslipRecord[]>;
}
