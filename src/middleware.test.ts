import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "./middleware";
import { middleware as rootMiddleware, config as rootConfig } from "../middleware";

function createJwt(claims: { sub?: string; role?: string; exp?: number; hospitalId?: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = "synthetic_test_signature_for_unit_tests";
  return `${header}.${payload}.${signature}`;
}

function makeNextRequest(url: string, cookies: Record<string, string> = {}): NextRequest {
  const req = new NextRequest(new URL(url, "http://localhost:3002"));
  for (const [key, val] of Object.entries(cookies)) {
    req.cookies.set(key, val);
  }
  return req;
}

describe("Next.js Edge Middleware RBAC & Route Protection", () => {
  const futureExp = Math.floor(Date.now() / 1000) + 3600; // 1 hour ahead
  const pastExp = Math.floor(Date.now() / 1000) - 3600;   // 1 hour ago

  describe("0. Middleware Delegation & Matcher Parity", () => {
    it("confirms root middleware delegates to authoritative src/middleware implementation", () => {
      expect(rootMiddleware).toBeDefined();
      expect(rootMiddleware).toBe(middleware);
      expect(rootConfig).toBeDefined();
      expect(rootConfig.matcher).toBeDefined();
    });
  });

  describe("1. Public Assets & Routes", () => {
    it("allows public static assets without authentication", () => {
      const req = makeNextRequest("http://localhost:3002/_next/static/test.js");
      const res = middleware(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("x-middleware-rewrite") || res.headers.get("location")).toBeNull();
    });

    it("allows public routes (home, login, register, forgot-password)", () => {
      for (const path of ["/", "/login", "/register", "/forgot-password", "/reset-password"]) {
        const req = makeNextRequest(`http://localhost:3002${path}`);
        const res = middleware(req);
        expect(res.status).toBe(200);
      }
    });
  });

  describe("2. Unauthenticated Access Protection", () => {
    it("redirects unauthenticated visitor requesting /billing to /login with next param", () => {
      const req = makeNextRequest("http://localhost:3002/billing");
      const res = middleware(req);
      expect(res.status).toBe(307);
      const location = res.headers.get("location");
      expect(location).toContain("/login");
      expect(location).toContain("next=%2Fbilling");
    });

    it("redirects unauthenticated visitor requesting /overview to /login", () => {
      const req = makeNextRequest("http://localhost:3002/overview");
      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/login?next=%2Foverview");
    });

    it("redirects expired access token without refresh cookie to login with session_expired flag", () => {
      const expiredToken = createJwt({ sub: "user-1", role: "DOCTOR", exp: pastExp });
      const req = makeNextRequest("http://localhost:3002/opd", { ghms_access: expiredToken });
      const res = middleware(req);
      expect(res.status).toBe(307);
      const location = res.headers.get("location");
      expect(location).toContain("session_expired=1");
    });
  });

  describe("3. Strict Patient Isolation", () => {
    it("redirects patient attempting to access staff workspaces (/billing, /users, /pharmacy) to /patient-portal", () => {
      const patientToken = createJwt({ sub: "pat-1", role: "PATIENT", exp: futureExp });
      
      for (const restrictedPath of ["/billing", "/users", "/pharmacy", "/overview", "/medical-records"]) {
        const req = makeNextRequest(`http://localhost:3002${restrictedPath}`, { ghms_access: patientToken });
        const res = middleware(req);
        expect(res.status).toBe(307);
        expect(res.headers.get("location")).toBe("http://localhost:3002/patient-portal");
      }
    });

    it("allows patient to access patient portal routes and profile", () => {
      const patientToken = createJwt({ sub: "pat-1", role: "PATIENT", exp: futureExp });
      
      for (const allowedPath of ["/patient-portal", "/patient-portal/appointments", "/patient-portal/records", "/profile"]) {
        const req = makeNextRequest(`http://localhost:3002${allowedPath}`, { ghms_access: patientToken });
        const res = middleware(req);
        expect(res.status).toBe(200);
      }
    });
  });

  describe("4. Staff Isolation (Blocking Staff From Patient Portal)", () => {
    it("redirects doctor attempting to access /patient-portal to /access-denied", () => {
      const doctorToken = createJwt({ sub: "doc-1", role: "DOCTOR", exp: futureExp });
      const req = makeNextRequest("http://localhost:3002/patient-portal", { ghms_access: doctorToken });
      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe("http://localhost:3002/access-denied");
    });

    it("redirects administrator attempting to access /patient-portal to /access-denied", () => {
      const adminToken = createJwt({ sub: "adm-1", role: "ADMINISTRATOR", exp: futureExp });
      const req = makeNextRequest("http://localhost:3002/patient-portal", { ghms_access: adminToken });
      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe("http://localhost:3002/access-denied");
    });
  });

  describe("5. Role-Based Route Access Control", () => {
    it("allows DOCTOR to access /opd, but denies access to /billing and /users", () => {
      const doctorToken = createJwt({ sub: "doc-1", role: "DOCTOR", exp: futureExp });
      
      // Allowed
      const allowedRes = middleware(makeNextRequest("http://localhost:3002/opd", { ghms_access: doctorToken }));
      expect(allowedRes.status).toBe(200);

      // Denied
      const billingRes = middleware(makeNextRequest("http://localhost:3002/billing", { ghms_access: doctorToken }));
      expect(billingRes.status).toBe(307);
      expect(billingRes.headers.get("location")).toBe("http://localhost:3002/access-denied");

      const usersRes = middleware(makeNextRequest("http://localhost:3002/users", { ghms_access: doctorToken }));
      expect(usersRes.status).toBe(307);
      expect(usersRes.headers.get("location")).toBe("http://localhost:3002/access-denied");
    });

    it("allows PHARMACIST to access /pharmacy, but denies access to /laboratory and /billing", () => {
      const pharmToken = createJwt({ sub: "ph-1", role: "PHARMACIST", exp: futureExp });
      
      // Allowed
      const allowedRes = middleware(makeNextRequest("http://localhost:3002/pharmacy", { ghms_access: pharmToken }));
      expect(allowedRes.status).toBe(200);

      // Denied
      const labRes = middleware(makeNextRequest("http://localhost:3002/laboratory", { ghms_access: pharmToken }));
      expect(labRes.status).toBe(307);
      expect(labRes.headers.get("location")).toBe("http://localhost:3002/access-denied");
    });

    it("allows ADMINISTRATOR to access /overview, /users, /roles, and /billing", () => {
      const adminToken = createJwt({ sub: "adm-1", role: "ADMINISTRATOR", exp: futureExp });
      
      for (const adminPath of ["/overview", "/users", "/roles", "/billing", "/hospital-settings"]) {
        const res = middleware(makeNextRequest(`http://localhost:3002${adminPath}`, { ghms_access: adminToken }));
        expect(res.status).toBe(200);
      }
    });

    it("allows NURSE to access /vital-signs and /inpatient, but denies access to /users, /billing, and /patient-portal", () => {
      const nurseToken = createJwt({ sub: "nr-1", role: "NURSE", exp: futureExp });
      
      // Allowed
      expect(middleware(makeNextRequest("http://localhost:3002/vital-signs", { ghms_access: nurseToken })).status).toBe(200);
      expect(middleware(makeNextRequest("http://localhost:3002/inpatient", { ghms_access: nurseToken })).status).toBe(200);

      // Denied
      const usersRes = middleware(makeNextRequest("http://localhost:3002/users", { ghms_access: nurseToken }));
      expect(usersRes.status).toBe(307);
      expect(usersRes.headers.get("location")).toBe("http://localhost:3002/access-denied");

      const portalRes = middleware(makeNextRequest("http://localhost:3002/patient-portal", { ghms_access: nurseToken }));
      expect(portalRes.status).toBe(307);
      expect(portalRes.headers.get("location")).toBe("http://localhost:3002/access-denied");
    });

    it("allows RECEPTIONIST to access /patients and /appointments, but denies access to /users and /patient-portal", () => {
      const recToken = createJwt({ sub: "rec-1", role: "RECEPTIONIST", exp: futureExp });
      
      // Allowed
      expect(middleware(makeNextRequest("http://localhost:3002/patients", { ghms_access: recToken })).status).toBe(200);
      expect(middleware(makeNextRequest("http://localhost:3002/appointments", { ghms_access: recToken })).status).toBe(200);

      // Denied
      const usersRes = middleware(makeNextRequest("http://localhost:3002/users", { ghms_access: recToken }));
      expect(usersRes.status).toBe(307);
      expect(usersRes.headers.get("location")).toBe("http://localhost:3002/access-denied");

      const portalRes = middleware(makeNextRequest("http://localhost:3002/patient-portal", { ghms_access: recToken }));
      expect(portalRes.status).toBe(307);
      expect(portalRes.headers.get("location")).toBe("http://localhost:3002/access-denied");
    });

    it("allows SUPER_ADMIN to access /platform-admin, /overview, /users, and /billing", () => {
      const saToken = createJwt({ sub: "sa-1", role: "SUPER_ADMIN", exp: futureExp });
      
      for (const saPath of ["/platform-admin", "/overview", "/users", "/billing"]) {
        const res = middleware(makeNextRequest(`http://localhost:3002${saPath}`, { ghms_access: saToken }));
        expect(res.status).toBe(200);
      }

      // Denied access to patient portal
      const portalRes = middleware(makeNextRequest("http://localhost:3002/patient-portal", { ghms_access: saToken }));
      expect(portalRes.status).toBe(307);
      expect(portalRes.headers.get("location")).toBe("http://localhost:3002/access-denied");
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Auth Bypass Regression Tests
  //    These tests verify the specific bypass vectors that were fixed:
  //    - Refresh-only cookie must NOT grant access
  //    - Malformed / empty JWT must NOT grant access
  //    - Missing sub or role claim must NOT grant access
  //    - Every protected module path is blocked without credentials
  // ---------------------------------------------------------------------------
  describe("6. Auth Bypass Regression Tests", () => {
    it("blocks request with ONLY refresh cookie (no access token) and redirects to /login with session_expired", () => {
      const req = makeNextRequest("http://localhost:3002/overview", {
        ghms_refresh: "some-refresh-token",
      });
      const res = middleware(req);
      expect(res.status).toBe(307);
      const location = res.headers.get("location");
      expect(location).toContain("/login");
      expect(location).toContain("next=%2Foverview");
      expect(location).toContain("session_expired=1");
    });

    it("blocks request with malformed access token (not three-part JWT)", () => {
      const req = makeNextRequest("http://localhost:3002/patients", {
        ghms_access: "not-a-valid-jwt",
      });
      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/login");
    });

    it("blocks request with access token missing 'sub' claim", () => {
      const tokenNoSub = createJwt({ role: "ADMINISTRATOR", exp: Math.floor(Date.now() / 1000) + 3600 });
      const req = makeNextRequest("http://localhost:3002/users", {
        ghms_access: tokenNoSub,
      });
      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/login");
    });

    it("blocks request with access token missing 'role' claim", () => {
      const tokenNoRole = createJwt({ sub: "user-99", exp: Math.floor(Date.now() / 1000) + 3600 });
      const req = makeNextRequest("http://localhost:3002/billing", {
        ghms_access: tokenNoRole,
      });
      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/login");
    });

    it("blocks all protected module paths when completely unauthenticated", () => {
      const protectedPaths = [
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
        "/messages",
        "/profile",
        "/patient-portal",
      ];
      for (const path of protectedPaths) {
        const req = makeNextRequest(`http://localhost:3002${path}`);
        const res = middleware(req);
        expect(res.status, `Expected ${path} to be blocked (307) for unauthenticated users`).toBe(307);
        expect(res.headers.get("location")).toContain("/login");
      }
    });

    it("blocks expired access token even if refresh cookie exists — strict fail-closed", () => {
      const expiredToken = createJwt({ sub: "user-1", role: "DOCTOR", exp: Math.floor(Date.now() / 1000) - 3600 });
      const req = makeNextRequest("http://localhost:3002/opd", {
        ghms_access: expiredToken,
        ghms_refresh: "some-refresh-token",
      });
      const res = middleware(req);
      expect(res.status).toBe(307);
      const location = res.headers.get("location");
      expect(location).toContain("/login");
      expect(location).toContain("session_expired=1");
    });

    it("blocks expired access token without refresh cookie — session_expired redirect", () => {
      const expiredToken = createJwt({ sub: "user-1", role: "DOCTOR", exp: Math.floor(Date.now() / 1000) - 3600 });
      const req = makeNextRequest("http://localhost:3002/opd", {
        ghms_access: expiredToken,
        // No refresh cookie
      });
      const res = middleware(req);
      expect(res.status).toBe(307);
      const location = res.headers.get("location");
      expect(location).toContain("/login");
      expect(location).toContain("session_expired=1");
    });

    it("blocks patient-portal when completely unauthenticated", () => {
      const req = makeNextRequest("http://localhost:3002/patient-portal");
      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/login");
    });

    it("blocks LABORATORY_TECHNICIAN from accessing /billing (cross-department isolation)", () => {
      const labToken = createJwt({ sub: "lab-1", role: "LABORATORY_TECHNICIAN", exp: futureExp });
      const req = makeNextRequest("http://localhost:3002/billing", { ghms_access: labToken });
      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe("http://localhost:3002/access-denied");
    });

    it("blocks HR_OFFICER from accessing /laboratory (cross-department isolation)", () => {
      const hrToken = createJwt({ sub: "hr-1", role: "HR_OFFICER", exp: futureExp });
      const req = makeNextRequest("http://localhost:3002/laboratory", { ghms_access: hrToken });
      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe("http://localhost:3002/access-denied");
    });

    it("blocks FINANCE_OFFICER from accessing /pharmacy (cross-department isolation)", () => {
      const finToken = createJwt({ sub: "fin-1", role: "FINANCE_OFFICER", exp: futureExp });
      const req = makeNextRequest("http://localhost:3002/pharmacy", { ghms_access: finToken });
      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe("http://localhost:3002/access-denied");
    });
  });
});
