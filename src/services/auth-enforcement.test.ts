import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authService, apiClient } from "./index";
import { canAccessRoute, isPublicRoute } from "@/config/route-permissions";

describe("Fail-Closed Authentication & Identity Enforcement", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  describe("1. Fake localStorage Role Cannot Establish Authentication", () => {
    it("confirms isAuthenticated() is false when fake admin exists in localStorage without backend session", () => {
      // Attacker injects fake administrator role in localStorage
      localStorage.setItem(
        "ghms-user",
        JSON.stringify({
          id: "fake-admin-id",
          name: "Attacker",
          role: "ADMINISTRATOR",
          email: "hacker@evil.com",
        })
      );

      // System must never consider user authenticated without backend verification
      expect(authService.isAuthenticated()).toBe(false);
    });

    it("confirms isAuthenticated() is false when fake doctor exists in localStorage", () => {
      localStorage.setItem(
        "ghms-user",
        JSON.stringify({
          id: "fake-doc-id",
          name: "Fake Doctor",
          role: "DOCTOR",
        })
      );

      expect(authService.isAuthenticated()).toBe(false);
    });

    it("clears localStorage when backend checkSession() fails", async () => {
      localStorage.setItem(
        "ghms-user",
        JSON.stringify({
          id: "stale-user",
          name: "Stale",
          role: "ADMINISTRATOR",
        })
      );

      // Backend /auth/me throws 401 unauthenticated
      vi.spyOn(apiClient, "get").mockRejectedValue(new Error("401 Unauthenticated"));

      const user = await authService.checkSession();
      expect(user).toBeNull();
      expect(authService.currentUser()).toBeNull();
      expect(authService.isAuthenticated()).toBe(false);
      expect(localStorage.getItem("ghms-user")).toBeNull();
    });

    it("establishes identity only when backend checkSession() returns verified user", async () => {
      const verifiedUser = {
        id: "usr-real-admin",
        name: "Verified Administrator",
        role: "ADMINISTRATOR",
        department: "Executive",
        email: "admin@gondar-hospital.et",
        phone: "+251911000000",
        initials: "VA",
      };

      vi.spyOn(apiClient, "get").mockResolvedValue(verifiedUser);

      const user = await authService.checkSession();
      expect(user).toEqual(verifiedUser);
      expect(authService.currentUser()).toEqual(verifiedUser);
      expect(authService.isAuthenticated()).toBe(true);
    });
  });

  describe("2. Public vs Private Route Enforcements", () => {
    it("identifies public routes that require no credentials", () => {
      expect(isPublicRoute("/")).toBe(true);
      expect(isPublicRoute("/login")).toBe(true);
      expect(isPublicRoute("/register")).toBe(true);
      expect(isPublicRoute("/forgot-password")).toBe(true);
      expect(isPublicRoute("/reset-password")).toBe(true);
      expect(isPublicRoute("/session-expired")).toBe(true);
      expect(isPublicRoute("/access-denied")).toBe(true);
    });

    it("identifies protected hospital modules as non-public", () => {
      const privateRoutes = [
        "/overview",
        "/patients",
        "/appointments",
        "/billing",
        "/pharmacy",
        "/laboratory",
        "/medical-records",
        "/users",
        "/roles",
        "/opd",
        "/emergency",
        "/inpatient",
        "/vital-signs",
        "/audit-logs",
        "/hospital-settings",
        "/platform-admin",
        "/patient-portal",
      ];
      for (const route of privateRoutes) {
        expect(isPublicRoute(route)).toBe(false);
      }
    });
  });

  describe("3. Role-Based Access Isolation", () => {
    it("prevents patients from accessing staff dashboards", () => {
      expect(canAccessRoute("/overview", "PATIENT")).toBe(false);
      expect(canAccessRoute("/billing", "PATIENT")).toBe(false);
      expect(canAccessRoute("/pharmacy", "PATIENT")).toBe(false);
      expect(canAccessRoute("/laboratory", "PATIENT")).toBe(false);
      expect(canAccessRoute("/users", "PATIENT")).toBe(false);
      expect(canAccessRoute("/opd", "PATIENT")).toBe(false);
      expect(canAccessRoute("/inpatient", "PATIENT")).toBe(false);

      // Only patient-portal and profile permitted
      expect(canAccessRoute("/patient-portal", "PATIENT")).toBe(true);
      expect(canAccessRoute("/patient-portal/appointments", "PATIENT")).toBe(true);
      expect(canAccessRoute("/profile", "PATIENT")).toBe(true);
    });

    it("prevents hospital staff from accessing patient portal", () => {
      const staffRoles = [
        "ADMINISTRATOR",
        "SUPER_ADMIN",
        "DOCTOR",
        "NURSE",
        "LABORATORY_TECHNICIAN",
        "PHARMACIST",
        "FINANCE_OFFICER",
        "RECEPTIONIST",
        "HR_OFFICER",
      ];
      for (const role of staffRoles) {
        expect(canAccessRoute("/patient-portal", role)).toBe(false);
        expect(canAccessRoute("/patient-portal/records", role)).toBe(false);
      }
    });

    it("restricts unauthorized roles from administrative modules", () => {
      expect(canAccessRoute("/users", "DOCTOR")).toBe(false);
      expect(canAccessRoute("/users", "NURSE")).toBe(false);
      expect(canAccessRoute("/users", "PHARMACIST")).toBe(false);
      expect(canAccessRoute("/hospital-settings", "DOCTOR")).toBe(false);
      expect(canAccessRoute("/platform-admin", "ADMINISTRATOR")).toBe(false); // Only SUPER_ADMIN
      expect(canAccessRoute("/platform-admin", "SUPER_ADMIN")).toBe(true);
    });

    it("enforces cross-department isolation", () => {
      // Pharmacist cannot access laboratory or billing
      expect(canAccessRoute("/laboratory", "PHARMACIST")).toBe(false);
      expect(canAccessRoute("/billing", "PHARMACIST")).toBe(false);

      // Lab tech cannot access pharmacy or billing
      expect(canAccessRoute("/pharmacy", "LABORATORY_TECHNICIAN")).toBe(false);
      expect(canAccessRoute("/billing", "LABORATORY_TECHNICIAN")).toBe(false);

      // Finance officer cannot access pharmacy or clinical records
      expect(canAccessRoute("/pharmacy", "FINANCE_OFFICER")).toBe(false);
      expect(canAccessRoute("/medical-records", "FINANCE_OFFICER")).toBe(false);
    });
  });
});
