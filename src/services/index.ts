import {
  mockAdmissionsTrend,
  mockAppointments,
  mockDepartmentDistribution,
  mockHospitalDashboardData,
  mockNotifications,
  mockPatients,
  mockStats,
} from "@/data/mock";
import { navigation } from "@/data/navigation";
import { apiClient, ApiError } from "./api-client";
import type {
  AppNotification,
  Appointment,
  CurrentUser,
  DashboardApiBundle,
  DashboardStats,
  DepartmentSlice,
  PaginatedResult,
  Patient,
  TrendPoint,
} from "@/types";

/**
 * Frontend service interfaces — the boundary the UI talks to.
 * Implementations are mock-backed for this phase; swapping in real HTTP
 * clients later must not require changes to any component or page.
 */

/** Simulated network latency so loading states are exercised realistically. */
const delay = <T>(data: T, ms = 150): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(data), ms));

// ---------------------------------------------------------------- Dashboard

export interface DashboardService {
  getStats(): Promise<DashboardStats>;
  getAdmissionsTrend(): Promise<TrendPoint[]>;
  getDepartmentDistribution(): Promise<DepartmentSlice[]>;
  getRecentPatients(page?: number, pageSize?: number): Promise<PaginatedResult<Patient>>;
  getTodayAppointments(): Promise<Appointment[]>;
  getDashboardData(): Promise<DashboardDataBundle>;
}

/** Everything the dashboard screen needs, fetched together. */
export interface DashboardDataBundle extends DashboardApiBundle {
  stats: DashboardStats;
  admissionsTrend: TrendPoint[];
  departmentDistribution: DepartmentSlice[];
  recentPatients: PaginatedResult<Patient>;
  todayAppointments: Appointment[];
}

class MockDashboardService implements DashboardService {
  getStats(): Promise<DashboardStats> {
    return delay(mockStats);
  }

  getAdmissionsTrend(): Promise<TrendPoint[]> {
    return delay(mockAdmissionsTrend, 250);
  }

  getDepartmentDistribution(): Promise<DepartmentSlice[]> {
    return delay(mockDepartmentDistribution, 250);
  }

  getRecentPatients(page = 1, pageSize = 10): Promise<PaginatedResult<Patient>> {
    const start = (page - 1) * pageSize;
    return delay({
      data: mockPatients.slice(start, start + pageSize),
      total: mockPatients.length,
      page,
      pageSize,
    });
  }

  getTodayAppointments(): Promise<Appointment[]> {
    return delay(mockAppointments);
  }

  getDashboardData(): Promise<DashboardDataBundle> {
    return delay(
      {
        stats: mockStats,
        admissionsTrend: mockAdmissionsTrend,
        departmentDistribution: mockDepartmentDistribution,
        recentPatients: {
          data: mockPatients,
          total: mockPatients.length,
          page: 1,
          pageSize: mockPatients.length,
        },
        todayAppointments: mockAppointments,
        ...mockHospitalDashboardData,
      },
      300,
    );
  }
}

// ------------------------------------------------------------ Notifications

export interface NotificationService {
  getAll(): Promise<AppNotification[]>;
}

class MockNotificationService implements NotificationService {
  getAll(): Promise<AppNotification[]> {
    return delay(mockNotifications, 120);
  }
}

// ------------------------------------------------------------------- Search

export interface SearchResult {
  label: string;
  href: string;
  group: string;
}

export interface SearchService {
  quickSearch(query: string): Promise<SearchResult[]>;
}

export class MockSearchService implements SearchService {
  /** Resolves against the navigation index; module-scoped search comes with API integration. */
  quickSearch(query: string): Promise<SearchResult[]> {
    const q = query.trim().toLowerCase();
    if (!q) return delay([]);
    const results: SearchResult[] = [];
    for (const group of navigation) {
      for (const item of group.items) {
        if (
          item.label.toLowerCase().includes(q) ||
          group.label.toLowerCase().includes(q)
        ) {
          results.push({ label: item.label, href: item.href, group: group.label });
        }
        if (results.length >= 6) return delay(results, 80);
      }
    }
    return delay(results, 80);
  }
}

// ------------------------------------------------------------------- Auth

/** Data sent to the backend for patient self-registration. The password is
 *  only transmitted over the request boundary — it is never persisted in
 *  frontend storage. */
export interface RegisterPayload {
  firstName: string;
  middleName: string;
  lastName: string;
  gender: "male" | "female" | "other";
  dateOfBirth: string; // ISO date
  phone: string;
  email: string;
  address: string;
  password: string;
  termsAccepted: boolean;
}

export interface MessageResult {
  message: string;
}

export interface AuthService {
  /** Identifier may be an email address or a username. */
  login(identifier: string, password: string, remember?: boolean, expectedRoles?: string[]): Promise<CurrentUser>;
  /** Creates a patient account. The backend must reject staff/admin roles. */
  register(payload: RegisterPayload): Promise<CurrentUser>;
  /** Sends a reset link / code to the email or phone on file. */
  requestPasswordReset(identifier: string): Promise<MessageResult>;
  /** Completes the reset with the token from the reset link. */
  resetPassword(token: string, newPassword: string): Promise<MessageResult>;
  changePassword(currentPassword: string, newPassword: string): Promise<MessageResult>;
  updateProfile(
    patch: Partial<Pick<CurrentUser, "name" | "email" | "phone" | "preferredLanguage">>,
  ): Promise<CurrentUser>;
  logout(): Promise<void>;
  currentUser(): CurrentUser | null;
  checkSession(): Promise<CurrentUser | null>;
  isAuthenticated(): boolean;
}

const USER_KEY = "ghms-user";
const MOCK_REMEMBER_KEY = "ghms-remember";

class BackendAuthService implements AuthService {
  private checkSessionPromise: Promise<CurrentUser | null> | null = null;
  /** In-memory authenticated user strictly verified by backend /auth/me or /auth/login */
  private verifiedUser: CurrentUser | null = null;

  private storeUser(user: CurrentUser) {
    this.verifiedUser = user;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  }

  private clearUser() {
    this.verifiedUser = null;
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(USER_KEY);
      window.sessionStorage.removeItem(USER_KEY);
    }
  }

  async checkSession(): Promise<CurrentUser | null> {
    if (typeof window === "undefined") return null;
    if (this.checkSessionPromise) return this.checkSessionPromise;

    this.checkSessionPromise = (async () => {
      try {
        const user = await apiClient.get<CurrentUser>("/auth/me", { skipCache: true });
        if (user && user.id && user.role) {
          this.storeUser(user);
          return user;
        }
        this.clearUser();
        return null;
      } catch {
        this.clearUser();
        return null;
      } finally {
        this.checkSessionPromise = null;
      }
    })();

    return this.checkSessionPromise;
  }

  async login(identifier: string, password: string, remember = false, expectedRoles?: string[]) {
    const user = await apiClient.post<CurrentUser>("/auth/login", {
      identifier,
      password,
      remember,
      ...(expectedRoles && expectedRoles.length > 0 ? { expectedRoles } : {}),
    });
    this.storeUser(user);
    if (remember) window.localStorage.setItem(MOCK_REMEMBER_KEY, identifier);
    else window.localStorage.removeItem(MOCK_REMEMBER_KEY);
    return user;
  }

  async register(payload: RegisterPayload) {
    return apiClient.post<CurrentUser>("/auth/register", payload);
  }

  requestPasswordReset(identifier: string) {
    return apiClient.post<MessageResult>("/auth/forgot-password", { identifier });
  }

  resetPassword(token: string, newPassword: string) {
    return apiClient.post<MessageResult>("/auth/reset-password", { token, password: newPassword });
  }

  async changePassword(currentPassword: string, newPassword: string) {
    await apiClient.post("/auth/change-password", { currentPassword, password: newPassword });
    return { message: "Password changed successfully. Sign in again to refresh your session." };
  }

  async updateProfile(_patch: Partial<Pick<CurrentUser, "name" | "email" | "phone" | "preferredLanguage">>): Promise<CurrentUser> {
    throw new ApiError("Profile updates are not available until the profile API is implemented", 501, "NOT_IMPLEMENTED");
  }

  async logout() {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      this.clearUser();
      if (typeof window !== "undefined") {
        window.sessionStorage.clear();
      }
    }
  }

  currentUser(): CurrentUser | null {
    if (this.verifiedUser) return this.verifiedUser;
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as CurrentUser;
    } catch {
      window.localStorage.removeItem(USER_KEY);
      return null;
    }
  }

  isAuthenticated(): boolean {
    // Strict Fail-Closed: Never consider the user authenticated unless verified by backend
    return this.verifiedUser !== null;
  }
}

// --------------------------------------------------------------- Exports

export const dashboardService: DashboardService = new MockDashboardService();
export const notificationService: NotificationService =
  new MockNotificationService();
export const searchService: SearchService = new MockSearchService();
export const authService: AuthService = new BackendAuthService();

export type {
  ClinicalAllergyRecord,
  ClinicalEncounterSummary,
  ClinicalRecord,
  ClinicalRecordsService,
  ClinicalReferralRecord,
  ClinicalTimelineEvent,
} from "./clinical-records";
export type {
  DepartmentId,
  DepartmentPatientRecord,
  DepartmentReport,
  DepartmentWorkflowCommand,
  DepartmentWorkflowRecord,
  DepartmentWorkflowService,
  EmergencyCaseRecord,
  EmergencyCaseStatus,
  EmergencyTriageCategory,
} from "./department-workflows";
export type {
  BloodBankUnit,
  BloodDonation,
  BloodDonor,
  BloodRequest,
  DiagnosticAttachment,
  DiagnosticWorkflowSection,
  DiagnosticWorkflowService,
  ImagingModality,
  ImagingReport,
  LaboratoryOrder,
  LaboratoryResult,
  LaboratoryResultKind,
  LaboratoryResultStatus,
  LaboratorySpecimen,
  LaboratoryTestCatalogItem,
  RadiologyRequest,
  TransfusionRecord,
} from "./diagnostic-workflows";
export type {
  AttendanceRecord,
  ClaimStatus,
  EmployeePresenceStatus,
  EmployeeRecord,
  EligibilityStatus,
  FinanceHrService,
  FinancialPeriodRecord,
  InsuranceClaimRecord,
  InsurancePolicyRecord,
  InsuranceProviderRecord,
  InvoiceLineItem,
  InvoicePaymentStatus,
  InvoiceRecord,
  JournalEntryRecord,
  LeaveBalanceRecord,
  LeaveRequestRecord,
  LedgerAccountRecord,
  PaymentMethod,
  PaymentRecord,
  PaymentRecordStatus,
  PayslipRecord,
  RefundRecord,
  RefundStatus,
  ServicePriceRecord,
  ServicePriceStatus,
  ShiftRecord,
  ShiftType,
  StaffCategory,
} from "./finance-hr";
export type {
  AdmissionRecord,
  AmbulanceMaintenanceRecord,
  AmbulanceRecord,
  AmbulanceTrip,
  BedRecord,
  BedStatus,
  DischargeRecord,
  DispensingRecord,
  FacilityWorkflowSection,
  GeneralInventoryItem,
  HospitalAsset,
  HospitalOperationsService,
  MaintenanceRequest,
  MedicineBatch,
  MedicineRecord,
  PharmacyPrescription,
  PharmacySupplier,
  PharmacyWorkflowSection,
  PharmacyWorkflowService,
  ProcurementRecord,
  PrescriptionMedicine,
  OperatingRoomRecord,
  WardRecord,
} from "./hospital-operations";
export type {
  PatientPortalApi,
  PatientPortalAnnouncement,
  PatientPortalAppointment,
  PatientPortalInvoice,
  PatientPortalMedicalRecord,
  PatientPortalNotification,
  PatientPortalPayment,
  PatientPortalProfile,
  PatientPortalSection,
  PatientPortalSupportRequest,
  PatientPortalVisit,
  PortalAppointmentStatus,
} from "./patient-portal";

export { apiClient, apiQuery, apiRequest, ApiError } from "./api-client";
export { appointmentBackendApi, emergencyBackendApi } from "./backend-services";
