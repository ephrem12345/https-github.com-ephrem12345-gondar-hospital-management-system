import { describe, expect, it } from "vitest";
import {
  isPublicRoute,
  canAccessRoute,
  getRoleDashboard,
  ROUTE_RULES,
} from "./route-permissions";

describe("Frontend Edge & Route Penetration Tests", () => {
  // =========================================================================
  // TEST 1: ACCESS EVERY PROTECTED FRONTEND ROUTE WITHOUT AUTHENTICATION
  // =========================================================================
  describe("Test 1: Unauthenticated Navigation to Protected Routes", () => {
    const protectedRoutes = [
      "/overview",
      "/opd",
      "/medical-records",
      "/referrals",
      "/diagnoses",
      "/clinical-overview",
      "/vital-signs",
      "/inpatient",
      "/admissions",
      "/wards",
      "/beds",
      "/discharges",
      "/operating-rooms",
      "/ambulance",
      "/laboratory",
      "/laboratory-orders",
      "/specimen-management",
      "/laboratory-results",
      "/radiology",
      "/imaging-reports",
      "/blood-bank",
      "/pharmacy",
      "/medicines",
      "/inventory",
      "/prescriptions",
      "/dispensing",
      "/procurement",
      "/billing",
      "/invoices",
      "/payments",
      "/service-pricing",
      "/checkout",
      "/patients",
      "/patient-registration",
      "/appointments",
      "/queue-management",
      "/emergency",
      "/messages",
      "/users",
      "/roles",
      "/permissions",
      "/audit-logs",
      "/hospital-settings",
      "/platform-admin",
      "/patient-portal",
      "/patient-portal/appointments",
      "/patient-portal/records",
      "/patient-portal/billing",
    ];

    it.each(protectedRoutes)("denies unauthenticated visitor to route: %s", (route) => {
      // Must not be considered a public route
      expect(isPublicRoute(route)).toBe(false);
      // Access must be denied
      expect(canAccessRoute(route, undefined)).toBe(false);
      expect(canAccessRoute(route, null)).toBe(false);
      expect(canAccessRoute(route, "")).toBe(false);
    });
  });

  // =========================================================================
  // TEST 3: FAKE AUTHENTICATION VIA FORGED LOCALSTORAGE ROLE
  // =========================================================================
  describe("Test 3: Forged LocalStorage Role Verification", () => {
    it("rejects unauthorized access if role is missing or invalid", () => {
      expect(canAccessRoute("/billing", "INVALID_ROLE")).toBe(false);
      expect(canAccessRoute("/overview", "FAKE_ADMIN_STRING")).toBe(false);
      expect(canAccessRoute("/opd", "ANONYMOUS")).toBe(false);
    });

    it("prevents patient from accessing staff routes even if forged in state", () => {
      const patientRole = "PATIENT";
      expect(canAccessRoute("/overview", patientRole)).toBe(false);
      expect(canAccessRoute("/opd", patientRole)).toBe(false);
      expect(canAccessRoute("/billing", patientRole)).toBe(false);
      expect(canAccessRoute("/users", patientRole)).toBe(false);
    });
  });

  // =========================================================================
  // TEST 4 & 5: ROLE ISOLATION ACROSS ALL 8 HOSPITAL ROLES
  // =========================================================================
  describe("Test 4 & 5: Strict Department Isolation Matrix", () => {
    // 1. DOCTOR
    it("DOCTOR can access clinical OPD, but is strictly DENIED on billing and admin", () => {
      expect(canAccessRoute("/opd", "DOCTOR")).toBe(true);
      expect(canAccessRoute("/medical-records", "DOCTOR")).toBe(true);
      expect(canAccessRoute("/billing", "DOCTOR")).toBe(false);
      expect(canAccessRoute("/invoices", "DOCTOR")).toBe(false);
      expect(canAccessRoute("/users", "DOCTOR")).toBe(false);
      expect(canAccessRoute("/platform-admin", "DOCTOR")).toBe(false);
    });

    // 2. NURSE
    it("NURSE can access vital signs and wards, but is strictly DENIED on billing, admin, and pharmacy", () => {
      expect(canAccessRoute("/vital-signs", "NURSE")).toBe(true);
      expect(canAccessRoute("/wards", "NURSE")).toBe(true);
      expect(canAccessRoute("/billing", "NURSE")).toBe(false);
      expect(canAccessRoute("/pharmacy", "NURSE")).toBe(false);
      expect(canAccessRoute("/users", "NURSE")).toBe(false);
    });

    // 3. LABORATORY TECHNICIAN
    it("LABORATORY_TECHNICIAN can access lab orders and results, but is DENIED on pharmacy and billing", () => {
      expect(canAccessRoute("/laboratory", "LABORATORY_TECHNICIAN")).toBe(true);
      expect(canAccessRoute("/specimen-management", "LABORATORY_TECHNICIAN")).toBe(true);
      expect(canAccessRoute("/pharmacy", "LABORATORY_TECHNICIAN")).toBe(false);
      expect(canAccessRoute("/billing", "LABORATORY_TECHNICIAN")).toBe(false);
      expect(canAccessRoute("/opd", "LABORATORY_TECHNICIAN")).toBe(false);
    });

    // 4. PHARMACIST
    it("PHARMACIST can access medicines and dispensing, but is DENIED on clinical diagnoses and billing", () => {
      expect(canAccessRoute("/pharmacy", "PHARMACIST")).toBe(true);
      expect(canAccessRoute("/dispensing", "PHARMACIST")).toBe(true);
      expect(canAccessRoute("/diagnoses", "PHARMACIST")).toBe(false);
      expect(canAccessRoute("/opd", "PHARMACIST")).toBe(false);
      expect(canAccessRoute("/billing", "PHARMACIST")).toBe(false);
    });

    // 5. FINANCE OFFICER / CASHIER
    it("FINANCE_OFFICER can access billing and cashier, but is DENIED on clinical and lab areas", () => {
      expect(canAccessRoute("/billing", "FINANCE_OFFICER")).toBe(true);
      expect(canAccessRoute("/invoices", "FINANCE_OFFICER")).toBe(true);
      expect(canAccessRoute("/opd", "FINANCE_OFFICER")).toBe(false);
      expect(canAccessRoute("/laboratory", "FINANCE_OFFICER")).toBe(false);
      expect(canAccessRoute("/pharmacy", "FINANCE_OFFICER")).toBe(false);
    });

    // 6. RECEPTIONIST
    it("RECEPTIONIST can access patient registration, but is DENIED on clinical and financial areas", () => {
      expect(canAccessRoute("/patient-registration", "RECEPTIONIST")).toBe(true);
      expect(canAccessRoute("/appointments", "RECEPTIONIST")).toBe(true);
      expect(canAccessRoute("/diagnoses", "RECEPTIONIST")).toBe(false);
      expect(canAccessRoute("/billing", "RECEPTIONIST")).toBe(false);
      expect(canAccessRoute("/users", "RECEPTIONIST")).toBe(false);
    });

    // 7. PATIENT
    it("PATIENT is strictly confined to patient portal, and DENIED on all staff areas", () => {
      expect(canAccessRoute("/patient-portal", "PATIENT")).toBe(true);
      expect(canAccessRoute("/patient-portal/appointments", "PATIENT")).toBe(true);
      expect(canAccessRoute("/overview", "PATIENT")).toBe(false);
      expect(canAccessRoute("/opd", "PATIENT")).toBe(false);
      expect(canAccessRoute("/billing", "PATIENT")).toBe(false);
      expect(canAccessRoute("/laboratory", "PATIENT")).toBe(false);
      expect(canAccessRoute("/pharmacy", "PATIENT")).toBe(false);
    });

    // 8. ADMINISTRATOR
    it("ADMINISTRATOR can access administration, but does not own patient-portal self-service", () => {
      expect(canAccessRoute("/overview", "ADMINISTRATOR")).toBe(true);
      expect(canAccessRoute("/users", "ADMINISTRATOR")).toBe(true);
      expect(canAccessRoute("/patient-portal", "ADMINISTRATOR")).toBe(false);
    });
  });
});
