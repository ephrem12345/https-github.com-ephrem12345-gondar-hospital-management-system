import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { canAccessRoute, isPublicRoute, getRoleDashboard } from "@/config/route-permissions";
import { getRoleConfig, ROLE_CONFIGS } from "@/config/roles";
import { loginSchema } from "@/validation/schemas";
import { middleware } from "@/middleware";
import { NextRequest } from "next/server";

describe("Multi-Type Department Authentication & Access Control Verification", () => {
  const futureExp = Math.floor(Date.now() / 1000) + 3600;
  const pastExp = Math.floor(Date.now() / 1000) - 3600;

  function createTestJwt(claims: { sub: string; role: string; exp?: number }): string {
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
    return `${header}.${payload}.mock_sig`;
  }

  function makeRequest(path: string, cookies: Record<string, string> = {}): NextRequest {
    const req = new NextRequest(new URL(path, "http://localhost:3002"));
    for (const [key, value] of Object.entries(cookies)) {
      req.cookies.set(key, value);
    }
    return req;
  }

  describe("1. Department Portal Configuration & Schema Validation", () => {
    const requiredDepartmentPortals = [
      "administrator",
      "doctor",
      "nurse",
      "laboratory",
      "pharmacist",
      "receptionist",
      "finance",
      "patient",
    ];

    it.each(requiredDepartmentPortals)("confirms valid configuration for department portal: %s", (key) => {
      const config = getRoleConfig(key);
      expect(config).toBeDefined();
      expect(config?.key).toBe(key);
      expect(config?.expectedRoles.length).toBeGreaterThan(0);
      expect(config?.defaultDashboard).toMatch(/^\/[a-z0-9_-]+/);
    });

    it("rejects login input when password is empty or under minimum length", () => {
      const missingPass = loginSchema.safeParse({ identifier: "admin@hospital.et", password: "" });
      expect(missingPass.success).toBe(false);

      const emptyId = loginSchema.safeParse({ identifier: "", password: "ValidPassword123!" });
      expect(emptyId.success).toBe(false);

      const valid = loginSchema.safeParse({ identifier: "doctor@hospital.et", password: "SecurePassword123!" });
      expect(valid.success).toBe(true);
    });
  });

  describe("2. Edge Middleware Protection for All 8 Department Workspaces", () => {
    const departmentDashboardRoutes = [
      { dept: "Administrator", path: "/overview", role: "ADMINISTRATOR" },
      { dept: "Doctor", path: "/opd", role: "DOCTOR" },
      { dept: "Nurse", path: "/vital-signs", role: "NURSE" },
      { dept: "Laboratory", path: "/laboratory", role: "LABORATORY_TECHNICIAN" },
      { dept: "Pharmacist", path: "/pharmacy", role: "PHARMACIST" },
      { dept: "Receptionist", path: "/patient-registration", role: "RECEPTIONIST" },
      { dept: "Finance", path: "/billing", role: "FINANCE_OFFICER" },
      { dept: "Patient", path: "/patient-portal", role: "PATIENT" },
    ];

    it.each(departmentDashboardRoutes)(
      "blocks unauthenticated access to $dept dashboard ($path) and redirects to /login",
      ({ path }) => {
        const req = makeRequest(path);
        const res = middleware(req);
        expect(res.status).toBe(307);
        const location = res.headers.get("location");
        expect(location).toContain("/login");
        expect(location).toContain(`next=${encodeURIComponent(path)}`);
      }
    );

    it.each(departmentDashboardRoutes)(
      "allows authorized $role to access their own dashboard ($path)",
      ({ path, role }) => {
        const token = createTestJwt({ sub: "usr-1", role, exp: futureExp });
        const req = makeRequest(path, { ghms_access: token });
        const res = middleware(req);
        expect(res.status).toBe(200);
      }
    );

    it("blocks cross-department access: Doctor attempting to open Billing dashboard is redirected to /access-denied", () => {
      const docToken = createTestJwt({ sub: "usr-doc", role: "DOCTOR", exp: futureExp });
      const req = makeRequest("/billing", { ghms_access: docToken });
      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/access-denied");
    });

    it("blocks cross-department access: Pharmacist attempting to open Doctor OPD is redirected to /access-denied", () => {
      const pharmToken = createTestJwt({ sub: "usr-pharm", role: "PHARMACIST", exp: futureExp });
      const req = makeRequest("/opd", { ghms_access: pharmToken });
      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/access-denied");
    });

    it("blocks cross-department access: Receptionist attempting to open System Users is redirected to /access-denied", () => {
      const recepToken = createTestJwt({ sub: "usr-recep", role: "RECEPTIONIST", exp: futureExp });
      const req = makeRequest("/users", { ghms_access: recepToken });
      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/access-denied");
    });

    it("strictly isolates patient: Patient attempting to open any staff workspace is redirected to /patient-portal", () => {
      const patientToken = createTestJwt({ sub: "pat-1", role: "PATIENT", exp: futureExp });
      for (const staffRoute of ["/overview", "/opd", "/pharmacy", "/billing", "/users", "/laboratory"]) {
        const req = makeRequest(staffRoute, { ghms_access: patientToken });
        const res = middleware(req);
        expect(res.status).toBe(307);
        expect(res.headers.get("location")).toContain("/patient-portal");
      }
    });

    it("strictly isolates staff: Doctor or Nurse attempting to open /patient-portal is redirected to /access-denied", () => {
      for (const staffRole of ["DOCTOR", "NURSE", "ADMINISTRATOR", "PHARMACIST"]) {
        const staffToken = createTestJwt({ sub: "staff-1", role: staffRole, exp: futureExp });
        const req = makeRequest("/patient-portal", { ghms_access: staffToken });
        const res = middleware(req);
        expect(res.status).toBe(307);
        expect(res.headers.get("location")).toContain("/access-denied");
      }
    });

    it("rejects expired session tokens and redirects to /login with session_expired indicator", () => {
      const expiredToken = createTestJwt({ sub: "usr-expired", role: "DOCTOR", exp: pastExp });
      const req = makeRequest("/opd", { ghms_access: expiredToken });
      const res = middleware(req);
      expect(res.status).toBe(307);
      const location = res.headers.get("location");
      expect(location).toContain("/login");
      expect(location).toContain("session_expired=1");
    });
  });

  describe("3. Default Fallbacks and Public Route Whitelist", () => {
    it("ensures public routes never trigger authentication barriers", () => {
      const publicPaths = ["/", "/login", "/register", "/forgot-password", "/reset-password", "/session-expired", "/access-denied"];
      for (const path of publicPaths) {
        expect(isPublicRoute(path)).toBe(true);
        const req = makeRequest(path);
        const res = middleware(req);
        expect(res.status).toBe(200);
      }
    });

    it("resolves role default dashboard correctly for all known roles", () => {
      expect(getRoleDashboard("PATIENT")).toBe("/patient-portal");
      expect(getRoleDashboard("DOCTOR")).toBe("/opd");
      expect(getRoleDashboard("NURSE")).toBe("/vital-signs");
      expect(getRoleDashboard("LABORATORY_TECHNICIAN")).toBe("/laboratory");
      expect(getRoleDashboard("RADIOLOGY_TECHNICIAN")).toBe("/radiology");
      expect(getRoleDashboard("PHARMACIST")).toBe("/pharmacy");
      expect(getRoleDashboard("RECEPTIONIST")).toBe("/patient-registration");
      expect(getRoleDashboard("FINANCE_OFFICER")).toBe("/billing");
      expect(getRoleDashboard("ADMINISTRATOR")).toBe("/overview");
      expect(getRoleDashboard("SUPER_ADMIN")).toBe("/platform-admin");
      expect(getRoleDashboard(null)).toBe("/login");
    });
  });
});
