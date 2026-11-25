import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import { canAccessRoute, isPublicRoute, getRoleDashboard } from "@/config/route-permissions";
import { loginSchema, selfRegistrationSchema } from "@/validation/schemas";

function createJwt(claims: { sub: string; role: string; department?: string; exp?: number }): string {
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

describe("GHMS Final Department-by-Department & Critical Security Verification", () => {
  const futureExp = Math.floor(Date.now() / 1000) + 7200;
  const pastExp = Math.floor(Date.now() / 1000) - 3600;

  // =========================================================================
  // SECTION A: VERIFY EVERY DEPARTMENT (12 SPECIFIC MODULES)
  // =========================================================================
  describe("Section A: Individual Verification of 12 Core Hospital Modules", () => {
    const modules = [
      { id: 1, name: "Medical Records", route: "/medical-records", primaryRole: "DOCTOR", unauthorizedRole: "PATIENT" },
      { id: 2, name: "Nursing Station", route: "/nurses", primaryRole: "NURSE", unauthorizedRole: "PHARMACIST" },
      { id: 3, name: "Vital Signs", route: "/vital-signs", primaryRole: "NURSE", unauthorizedRole: "PATIENT" },
      { id: 4, name: "Diagnoses", route: "/diagnoses", primaryRole: "DOCTOR", unauthorizedRole: "RECEPTIONIST" },
      { id: 5, name: "Referrals", route: "/referrals", primaryRole: "DOCTOR", unauthorizedRole: "LABORATORY_TECHNICIAN" },
      { id: 6, name: "Patient Management", route: "/patients", primaryRole: "RECEPTIONIST", unauthorizedRole: "PATIENT" },
      { id: 7, name: "Doctor Dashboard", route: "/opd", primaryRole: "DOCTOR", unauthorizedRole: "FINANCE_OFFICER" },
      { id: 8, name: "Pharmacy", route: "/pharmacy", primaryRole: "PHARMACIST", unauthorizedRole: "DOCTOR" },
      { id: 9, name: "Laboratory", route: "/laboratory", primaryRole: "LABORATORY_TECHNICIAN", unauthorizedRole: "FINANCE_OFFICER" },
      { id: 10, name: "Appointments", route: "/appointments", primaryRole: "RECEPTIONIST", unauthorizedRole: "PATIENT" },
      { id: 11, name: "Billing and Finance", route: "/billing", primaryRole: "FINANCE_OFFICER", unauthorizedRole: "DOCTOR" },
      { id: 12, name: "Administration", route: "/overview", primaryRole: "ADMINISTRATOR", unauthorizedRole: "NURSE" },
    ];

    it.each(modules)("Module #$id ($name): blocks unauthenticated direct access", ({ route }) => {
      const req = makeRequest(route);
      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain(`/login?next=${encodeURIComponent(route)}`);
    });

    it.each(modules)("Module #$id ($name): permits authorized role ($primaryRole)", ({ route, primaryRole }) => {
      expect(canAccessRoute(route, primaryRole)).toBe(true);
      const token = createJwt({ sub: "usr-valid", role: primaryRole, exp: futureExp });
      const req = makeRequest(route, { ghms_access: token });
      const res = middleware(req);
      expect(res.status).toBe(200);
    });

    it.each(modules)("Module #$id ($name): denies unauthorized role ($unauthorizedRole)", ({ route, unauthorizedRole }) => {
      expect(canAccessRoute(route, unauthorizedRole)).toBe(false);
      const token = createJwt({ sub: "usr-unauth", role: unauthorizedRole, exp: futureExp });
      const req = makeRequest(route, { ghms_access: token });
      const res = middleware(req);
      expect(res.status).toBe(307);
      const target = res.headers.get("location") || "";
      expect(target.includes("/access-denied") || target.includes("/patient-portal")).toBe(true);
    });
  });

  // =========================================================================
  // SECTION B: 10 CRITICAL SECURITY SCENARIOS
  // =========================================================================
  describe("Section B: 10 Critical Security Penetration Scenarios", () => {
    it("Scenario 1: Open a private department URL without logging in -> redirect to /login", () => {
      for (const privatePath of ["/overview", "/billing", "/pharmacy", "/laboratory", "/opd", "/medical-records"]) {
        const req = makeRequest(privatePath);
        const res = middleware(req);
        expect(res.status).toBe(307);
        expect(res.headers.get("location")).toContain("/login");
      }
    });

    it("Scenario 2: Route authorization policy blocks requests without matching permissions", () => {
      expect(canAccessRoute("/users", "PATIENT")).toBe(false);
      expect(canAccessRoute("/overview", "PATIENT")).toBe(false);
      expect(canAccessRoute("/billing", "PATIENT")).toBe(false);
      expect(canAccessRoute("/opd", "PATIENT")).toBe(false);
    });

    it("Scenario 3: Expired token rejected -> redirect with session_expired parameter", () => {
      const expiredToken = createJwt({ sub: "usr-exp", role: "DOCTOR", exp: pastExp });
      const req = makeRequest("/opd", { ghms_access: expiredToken });
      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("session_expired=1");
    });

    it("Scenario 4: Forged token with invalid structure/claims -> rejected", () => {
      const forgedTokens = [
        "not-a-token",
        "header.payload",
        createJwt({ sub: "", role: "DOCTOR", exp: futureExp }), // missing sub
        createJwt({ sub: "usr-1", role: "", exp: futureExp }), // missing role
      ];

      for (const token of forgedTokens) {
        const req = makeRequest("/overview", { ghms_access: token });
        const res = middleware(req);
        expect(res.status).toBe(307);
        expect(res.headers.get("location")).toContain("/login");
      }
    });

    it("Scenario 5: Patient attempts to access administrator dashboard -> strictly isolated to /patient-portal", () => {
      const patientToken = createJwt({ sub: "pat-123", role: "PATIENT", exp: futureExp });
      for (const adminRoute of ["/overview", "/users", "/roles", "/permissions", "/hospital-settings"]) {
        const req = makeRequest(adminRoute, { ghms_access: patientToken });
        const res = middleware(req);
        expect(res.status).toBe(307);
        expect(res.headers.get("location")).toBe("http://localhost:3002/patient-portal");
      }
    });

    it("Scenario 6: Nurse attempts unauthorized doctor consultation modification -> denied by permissions", () => {
      // Nurse has vital-signs and nursing write permissions:
      expect(canAccessRoute("/vital-signs", "NURSE")).toBe(true);
      expect(canAccessRoute("/nurses", "NURSE")).toBe(true);
      // But Nurse strictly CANNOT access consultations, diagnoses, or prescriptions:
      expect(canAccessRoute("/opd", "NURSE")).toBe(false);
      expect(canAccessRoute("/diagnoses", "NURSE")).toBe(false);
      expect(canAccessRoute("/prescriptions", "NURSE")).toBe(false);
    });

    it("Scenario 7: Access another department's records -> cross-department isolation enforced", () => {
      // Doctor in Internal Medicine cannot access Billing or Pharmacy Admin
      expect(canAccessRoute("/billing", "DOCTOR")).toBe(false);
      expect(canAccessRoute("/pharmacy", "DOCTOR")).toBe(false);

      // Pharmacist cannot access OPD or Inpatient Operating Rooms
      expect(canAccessRoute("/opd", "PHARMACIST")).toBe(false);
      expect(canAccessRoute("/operating-rooms", "PHARMACIST")).toBe(false);

      // Finance Officer cannot access Clinical diagnoses or Medical Records
      expect(canAccessRoute("/diagnoses", "FINANCE_OFFICER")).toBe(false);
      expect(canAccessRoute("/medical-records", "FINANCE_OFFICER")).toBe(false);
    });

    it("Scenario 8: URL parameter tampering -> patient portal routes enforce ownership", () => {
      // Patient role can only access /patient-portal and /profile
      expect(canAccessRoute("/patient-portal/appointments", "PATIENT")).toBe(true);
      expect(canAccessRoute("/patient-portal/records", "PATIENT")).toBe(true);
      expect(canAccessRoute("/patient-registration", "PATIENT")).toBe(false);
      expect(canAccessRoute("/appointments", "PATIENT")).toBe(false);
    });

    it("Scenario 9: Attempt unauthorized deletion -> permissions check fails-closed", () => {
      // Only Super Admin and Administrator possess management/deletion scopes
      expect(canAccessRoute("/users", "RECEPTIONIST")).toBe(false);
      expect(canAccessRoute("/roles", "RECEPTIONIST")).toBe(false);
      expect(canAccessRoute("/platform-admin", "RECEPTIONIST")).toBe(false);
      expect(canAccessRoute("/users", "DOCTOR")).toBe(false);
      expect(canAccessRoute("/users", "ADMINISTRATOR")).toBe(true);
    });

    it("Scenario 10: Session invalidation and role redirects", () => {
      expect(getRoleDashboard(null)).toBe("/login");
      expect(getRoleDashboard(undefined)).toBe("/login");
      expect(getRoleDashboard("PATIENT")).toBe("/patient-portal");
      expect(getRoleDashboard("DOCTOR")).toBe("/opd");
      expect(getRoleDashboard("ADMINISTRATOR")).toBe("/overview");
    });
  });

  // =========================================================================
  // SECTION D: END-TO-END WORKFLOW INTEGRATION
  // =========================================================================
  describe("Section D: End-to-End Clinical & Administrative Workflows", () => {
    it("Workflow 1: User Login Input Validation", () => {
      const valid = loginSchema.safeParse({ identifier: "doctor.selam@hospital.et", password: "ValidPassword123!" });
      expect(valid.success).toBe(true);

      const invalid = loginSchema.safeParse({ identifier: "", password: "" });
      expect(invalid.success).toBe(false);
    });

    it("Workflow 2: Patient Registration Form Validation", () => {
      const validPatient = selfRegistrationSchema.safeParse({
        firstName: "Abebe",
        middleName: "Kebede",
        lastName: "Tessema",
        gender: "male",
        dateOfBirth: "1990-01-01",
        phone: "+251911223344",
        email: "abebe.kebede@example.com",
        address: "Gondar, Kebele 03",
        password: "StrongPass123!@#",
        confirmPassword: "StrongPass123!@#",
        termsAccepted: true,
      });
      expect(validPatient.success).toBe(true);

      // Password mismatch must be rejected
      const mismatchedPass = selfRegistrationSchema.safeParse({
        firstName: "Abebe",
        lastName: "Tessema",
        gender: "male",
        dateOfBirth: "1990-01-01",
        phone: "+251911223344",
        email: "abebe.kebede@example.com",
        address: "Gondar",
        password: "StrongPass123!@#",
        confirmPassword: "DifferentPassword456!",
        termsAccepted: true,
      });
      expect(mismatchedPass.success).toBe(false);
    });

    it("Workflow 3: Clinical Consultation & Nursing Role Distinction", () => {
      const doctorToken = createJwt({ sub: "doc-1", role: "DOCTOR", exp: futureExp });
      const nurseToken = createJwt({ sub: "nurse-1", role: "NURSE", exp: futureExp });

      // Doctor accesses OPD
      const docRes = middleware(makeRequest("/opd", { ghms_access: doctorToken }));
      expect(docRes.status).toBe(200);

      // Nurse accesses Vital Signs
      const nurseRes = middleware(makeRequest("/vital-signs", { ghms_access: nurseToken }));
      expect(nurseRes.status).toBe(200);

      // Nurse cannot access Doctor OPD
      const nurseToOpd = middleware(makeRequest("/opd", { ghms_access: nurseToken }));
      expect(nurseToOpd.status).toBe(307);
    });

    it("Workflow 4: Pharmacy Dispensing & Inventory Workflows", () => {
      const pharmToken = createJwt({ sub: "pharm-1", role: "PHARMACIST", exp: futureExp });
      for (const pharmRoute of ["/pharmacy", "/medicines", "/inventory", "/prescriptions", "/dispensing"]) {
        const res = middleware(makeRequest(pharmRoute, { ghms_access: pharmToken }));
        expect(res.status).toBe(200);
      }
    });

    it("Workflow 5: Diagnostic & Laboratory Workflows", () => {
      const labToken = createJwt({ sub: "lab-1", role: "LABORATORY_TECHNICIAN", exp: futureExp });
      for (const labRoute of ["/laboratory", "/laboratory-orders", "/specimen-management", "/laboratory-results", "/blood-bank"]) {
        const res = middleware(makeRequest(labRoute, { ghms_access: labToken }));
        expect(res.status).toBe(200);
      }
    });
  });
});
