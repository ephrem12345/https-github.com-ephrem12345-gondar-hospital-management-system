import { describe, expect, it } from "vitest";
import {
  isPublicRoute,
  canAccessRoute,
  getRoleDashboard,
  PUBLIC_ROUTES,
} from "./route-permissions";

describe("Frontend Centralized Route Protection & RBAC Matrix", () => {
  // =========================================================================
  // 1. PUBLIC ROUTES
  // =========================================================================
  describe("1. Public Routes", () => {
    it("recognizes public landing and authentication routes", () => {
      expect(isPublicRoute("/")).toBe(true);
      expect(isPublicRoute("/login")).toBe(true);
      expect(isPublicRoute("/login?role=doctor")).toBe(true);
      expect(isPublicRoute("/register")).toBe(true);
      expect(isPublicRoute("/forgot-password")).toBe(true);
      expect(isPublicRoute("/reset-password")).toBe(true);
      expect(isPublicRoute("/session-expired")).toBe(true);
      expect(isPublicRoute("/maintenance")).toBe(true);
      expect(isPublicRoute("/access-denied")).toBe(true);
    });

    it("rejects protected department dashboards as not public", () => {
      expect(isPublicRoute("/overview")).toBe(false);
      expect(isPublicRoute("/opd")).toBe(false);
      expect(isPublicRoute("/vital-signs")).toBe(false);
      expect(isPublicRoute("/laboratory")).toBe(false);
      expect(isPublicRoute("/pharmacy")).toBe(false);
      expect(isPublicRoute("/billing")).toBe(false);
      expect(isPublicRoute("/patient-registration")).toBe(false);
      expect(isPublicRoute("/patient-portal")).toBe(false);
      expect(isPublicRoute("/users")).toBe(false);
    });
  });

  // =========================================================================
  // 2. ROLE ISOLATION: UNAUTHENTICATED USERS
  // =========================================================================
  describe("2. Unauthenticated Visitors (No Role)", () => {
    it("denies unauthenticated visitors access to all department routes", () => {
      expect(canAccessRoute("/overview", undefined)).toBe(false);
      expect(canAccessRoute("/opd", undefined)).toBe(false);
      expect(canAccessRoute("/vital-signs", undefined)).toBe(false);
      expect(canAccessRoute("/laboratory", undefined)).toBe(false);
      expect(canAccessRoute("/pharmacy", undefined)).toBe(false);
      expect(canAccessRoute("/billing", undefined)).toBe(false);
      expect(canAccessRoute("/patient-registration", undefined)).toBe(false);
      expect(canAccessRoute("/patient-portal", undefined)).toBe(false);
    });

    it("allows unauthenticated visitors to view genuinely public routes", () => {
      expect(canAccessRoute("/", undefined)).toBe(true);
      expect(canAccessRoute("/login", undefined)).toBe(true);
      expect(canAccessRoute("/access-denied", undefined)).toBe(true);
    });
  });

  // =========================================================================
  // 3. ROLE ISOLATION: DOCTOR
  // =========================================================================
  describe("3. Doctor Role Isolation", () => {
    it("allows doctor access to clinical dashboards", () => {
      expect(canAccessRoute("/opd", "DOCTOR")).toBe(true);
      expect(canAccessRoute("/medical-records", "DOCTOR")).toBe(true);
      expect(canAccessRoute("/diagnoses", "DOCTOR")).toBe(true);
      expect(canAccessRoute("/emergency", "DOCTOR")).toBe(true);
    });

    it("denies doctor access to cashier & billing dashboards", () => {
      expect(canAccessRoute("/billing", "DOCTOR")).toBe(false);
      expect(canAccessRoute("/invoices", "DOCTOR")).toBe(false);
      expect(canAccessRoute("/payments", "DOCTOR")).toBe(false);
      expect(canAccessRoute("/checkout", "DOCTOR")).toBe(false);
    });

    it("denies doctor access to user administration", () => {
      expect(canAccessRoute("/users", "DOCTOR")).toBe(false);
      expect(canAccessRoute("/roles", "DOCTOR")).toBe(false);
      expect(canAccessRoute("/permissions", "DOCTOR")).toBe(false);
      expect(canAccessRoute("/platform-admin", "DOCTOR")).toBe(false);
    });

    it("denies doctor access to pharmacy dispensing & batch inventory", () => {
      expect(canAccessRoute("/inventory", "DOCTOR")).toBe(false);
      expect(canAccessRoute("/dispensing", "DOCTOR")).toBe(false);
      expect(canAccessRoute("/procurement", "DOCTOR")).toBe(false);
    });
  });

  // =========================================================================
  // 4. ROLE ISOLATION: PATIENT
  // =========================================================================
  describe("4. Patient Role Isolation", () => {
    it("allows patient access to patient portal and personal profile", () => {
      expect(canAccessRoute("/patient-portal", "PATIENT")).toBe(true);
      expect(canAccessRoute("/patient-portal/appointments", "PATIENT")).toBe(true);
      expect(canAccessRoute("/patient-portal/billing", "PATIENT")).toBe(true);
      expect(canAccessRoute("/patient-portal/records", "PATIENT")).toBe(true);
      expect(canAccessRoute("/profile", "PATIENT")).toBe(true);
    });

    it("denies patient access to doctor clinical dashboards", () => {
      expect(canAccessRoute("/opd", "PATIENT")).toBe(false);
      expect(canAccessRoute("/diagnoses", "PATIENT")).toBe(false);
      expect(canAccessRoute("/emergency", "PATIENT")).toBe(false);
    });

    it("denies patient access to staff administrative and finance dashboards", () => {
      expect(canAccessRoute("/overview", "PATIENT")).toBe(false);
      expect(canAccessRoute("/users", "PATIENT")).toBe(false);
      expect(canAccessRoute("/billing", "PATIENT")).toBe(false);
      expect(canAccessRoute("/laboratory", "PATIENT")).toBe(false);
      expect(canAccessRoute("/pharmacy", "PATIENT")).toBe(false);
    });
  });

  // =========================================================================
  // 5. ROLE ISOLATION: NURSE
  // =========================================================================
  describe("5. Nurse Role Isolation", () => {
    it("allows nurse access to vital signs and inpatient care", () => {
      expect(canAccessRoute("/vital-signs", "NURSE")).toBe(true);
      expect(canAccessRoute("/inpatient", "NURSE")).toBe(true);
      expect(canAccessRoute("/wards", "NURSE")).toBe(true);
      expect(canAccessRoute("/beds", "NURSE")).toBe(true);
    });

    it("denies nurse access to finance & billing administration", () => {
      expect(canAccessRoute("/billing", "NURSE")).toBe(false);
      expect(canAccessRoute("/invoices", "NURSE")).toBe(false);
      expect(canAccessRoute("/service-pricing", "NURSE")).toBe(false);
    });

    it("denies nurse access to user management", () => {
      expect(canAccessRoute("/users", "NURSE")).toBe(false);
      expect(canAccessRoute("/roles", "NURSE")).toBe(false);
    });
  });

  // =========================================================================
  // 6. ROLE ISOLATION: FINANCE OFFICER / CASHIER
  // =========================================================================
  describe("6. Finance Officer / Cashier Role Isolation", () => {
    it("allows finance officer access to billing and cashier services", () => {
      expect(canAccessRoute("/billing", "FINANCE_OFFICER")).toBe(true);
      expect(canAccessRoute("/invoices", "FINANCE_OFFICER")).toBe(true);
      expect(canAccessRoute("/payments", "FINANCE_OFFICER")).toBe(true);
    });

    it("denies finance officer access to clinical diagnoses and consultations", () => {
      expect(canAccessRoute("/opd", "FINANCE_OFFICER")).toBe(false);
      expect(canAccessRoute("/diagnoses", "FINANCE_OFFICER")).toBe(false);
      expect(canAccessRoute("/medical-records", "FINANCE_OFFICER")).toBe(false);
    });

    it("denies finance officer access to laboratory testing and pharmacy dispensing", () => {
      expect(canAccessRoute("/laboratory", "FINANCE_OFFICER")).toBe(false);
      expect(canAccessRoute("/specimen-management", "FINANCE_OFFICER")).toBe(false);
      expect(canAccessRoute("/pharmacy", "FINANCE_OFFICER")).toBe(false);
    });
  });

  // =========================================================================
  // 7. DEFAULT DASHBOARDS
  // =========================================================================
  describe("7. Default Role Dashboards", () => {
    it("maps each role to its dedicated department dashboard", () => {
      expect(getRoleDashboard("DOCTOR")).toBe("/opd");
      expect(getRoleDashboard("NURSE")).toBe("/vital-signs");
      expect(getRoleDashboard("LABORATORY_TECHNICIAN")).toBe("/laboratory");
      expect(getRoleDashboard("PHARMACIST")).toBe("/pharmacy");
      expect(getRoleDashboard("RECEPTIONIST")).toBe("/patient-registration");
      expect(getRoleDashboard("FINANCE_OFFICER")).toBe("/billing");
      expect(getRoleDashboard("PATIENT")).toBe("/patient-portal");
      expect(getRoleDashboard("SUPER_ADMIN")).toBe("/platform-admin");
      expect(getRoleDashboard("ADMINISTRATOR")).toBe("/overview");
    });
  });
});
