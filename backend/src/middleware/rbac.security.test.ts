import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { UserRole } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { env } from "../config/env.js";
import { HttpError } from "../utils/http-error.js";
import {
  authenticate,
  requireAuth,
  requireRole,
  requirePermission,
  requireDepartmentAccess,
  requireTenant,
  requireSuperAdmin,
  setAuthDatabase,
  rolePermissions,
} from "./authenticate.js";

function makeRequest(headers: Record<string, string> = {}, actor?: Request["actor"]) {
  return {
    header: (name: string) => headers[name.toLowerCase()],
    actor,
  } as unknown as Request;
}

function captureNext() {
  const next = vi.fn() as unknown as NextFunction;
  return {
    next,
    error: () => (next as any).mock.calls[0]?.[0] as HttpError | undefined,
    called: () => (next as any).mock.calls.length > 0,
  };
}

function createToken(claims: Record<string, unknown> = {}, options: jwt.SignOptions = {}) {
  return jwt.sign(
    {
      sub: "user-123",
      role: UserRole.DOCTOR,
      hospitalId: "hosp-1",
      department: "Internal Medicine",
      ...claims,
    },
    env.JWT_ACCESS_SECRET,
    {
      algorithm: "HS256",
      issuer: env.JWT_ISSUER,
      audience: "ghms-web",
      expiresIn: "15m",
      ...options,
    }
  );
}

describe("Strict Department RBAC and Security Isolation", () => {
  afterEach(() => setAuthDatabase(null));

  // =========================================================================
  // SECTION A: UNAUTHENTICATED ACCESS TESTS
  // =========================================================================
  describe("A. Unauthenticated Access Tests", () => {
    it("rejects request without any authorization header or cookie", async () => {
      const { next, error } = captureNext();
      await authenticate(makeRequest(), {} as Response, next);
      expect(error()).toBeInstanceOf(HttpError);
      expect(error()?.status).toBe(401);
      expect(error()?.code).toBe("UNAUTHENTICATED");
    });

    it("rejects request with malformed authorization header", async () => {
      const { next, error } = captureNext();
      await authenticate(makeRequest({ authorization: "Basic 12345" }), {} as Response, next);
      expect(error()?.status).toBe(401);
      expect(error()?.code).toBe("UNAUTHENTICATED");
    });

    it("requireRole rejects unauthenticated request without actor", () => {
      const { next, error } = captureNext();
      requireRole(UserRole.DOCTOR)(makeRequest(), {} as Response, next);
      expect(error()?.status).toBe(401);
      expect(error()?.code).toBe("UNAUTHENTICATED");
    });

    it("requirePermission rejects unauthenticated request without actor", () => {
      const { next, error } = captureNext();
      requirePermission("clinical.read")(makeRequest(), {} as Response, next);
      expect(error()?.status).toBe(401);
      expect(error()?.code).toBe("UNAUTHENTICATED");
    });

    it("requireDepartmentAccess rejects unauthenticated request without actor", () => {
      const { next, error } = captureNext();
      requireDepartmentAccess("Internal Medicine")(makeRequest(), {} as Response, next);
      expect(error()?.status).toBe(401);
      expect(error()?.code).toBe("UNAUTHENTICATED");
    });
  });

  // =========================================================================
  // SECTION B: AUTHENTICATED ROLE & DEPARTMENT TESTS
  // =========================================================================
  describe("B. Authenticated Role & Department Tests", () => {
    it("Doctor CAN access authorized clinical consultation permissions", () => {
      const req = makeRequest({}, { userId: "doc1", role: UserRole.DOCTOR, hospitalId: "h1" });
      const { next, error } = captureNext();
      requirePermission("clinical.consultations.write")(req, {} as Response, next);
      expect(error()).toBeUndefined();
    });

    it("Doctor CANNOT access finance billing permissions (DENY)", () => {
      const req = makeRequest({}, { userId: "doc1", role: UserRole.DOCTOR, hospitalId: "h1" });
      const { next, error } = captureNext();
      requirePermission("billing.invoices.create")(req, {} as Response, next);
      expect(error()?.status).toBe(403);
      expect(error()?.code).toBe("FORBIDDEN");
    });

    it("Doctor CANNOT manage pharmacy drug inventory (DENY)", () => {
      const req = makeRequest({}, { userId: "doc1", role: UserRole.DOCTOR, hospitalId: "h1" });
      const { next, error } = captureNext();
      requirePermission("pharmacy.inventory.manage")(req, {} as Response, next);
      expect(error()?.status).toBe(403);
      expect(error()?.code).toBe("FORBIDDEN");
    });

    it("Patient CAN access own portal read permissions", () => {
      const req = makeRequest({}, { userId: "pat1", role: UserRole.PATIENT, hospitalId: "h1" });
      const { next, error } = captureNext();
      requirePermission("appointments.read.own")(req, {} as Response, next);
      expect(error()).toBeUndefined();
    });

    it("Patient CANNOT access doctor clinical permissions (DENY)", () => {
      const req = makeRequest({}, { userId: "pat1", role: UserRole.PATIENT, hospitalId: "h1" });
      const { next, error } = captureNext();
      requirePermission("clinical.consultations.write")(req, {} as Response, next);
      expect(error()?.status).toBe(403);
      expect(error()?.code).toBe("FORBIDDEN");
    });

    it("Patient CANNOT access user management permissions (DENY)", () => {
      const req = makeRequest({}, { userId: "pat1", role: UserRole.PATIENT, hospitalId: "h1" });
      const { next, error } = captureNext();
      requirePermission("users.manage")(req, {} as Response, next);
      expect(error()?.status).toBe(403);
    });

    it("Nurse CAN record vitals and nursing notes", () => {
      const req = makeRequest({}, { userId: "nurse1", role: UserRole.NURSE, hospitalId: "h1" });
      const { next, error } = captureNext();
      requirePermission("clinical.vitals.write")(req, {} as Response, next);
      expect(error()).toBeUndefined();
    });

    it("Nurse CANNOT modify doctor diagnoses (DENY)", () => {
      const req = makeRequest({}, { userId: "nurse1", role: UserRole.NURSE, hospitalId: "h1" });
      const { next, error } = captureNext();
      requirePermission("clinical.diagnoses.write")(req, {} as Response, next);
      expect(error()?.status).toBe(403);
    });

    it("Nurse CANNOT access finance billing (DENY)", () => {
      const req = makeRequest({}, { userId: "nurse1", role: UserRole.NURSE, hospitalId: "h1" });
      const { next, error } = captureNext();
      requirePermission("billing.payments.process")(req, {} as Response, next);
      expect(error()?.status).toBe(403);
    });

    it("Laboratory technician CAN write and release lab results", () => {
      const req = makeRequest({}, { userId: "lab1", role: UserRole.LABORATORY_TECHNICIAN, hospitalId: "h1" });
      const { next, error } = captureNext();
      requirePermission("laboratory.results.write")(req, {} as Response, next);
      expect(error()).toBeUndefined();
    });

    it("Laboratory technician CANNOT dispense pharmacy medications (DENY)", () => {
      const req = makeRequest({}, { userId: "lab1", role: UserRole.LABORATORY_TECHNICIAN, hospitalId: "h1" });
      const { next, error } = captureNext();
      requirePermission("pharmacy.prescriptions.dispense")(req, {} as Response, next);
      expect(error()?.status).toBe(403);
    });

    it("Pharmacist CAN dispense prescriptions and manage pharmacy stock", () => {
      const req = makeRequest({}, { userId: "pharm1", role: UserRole.PHARMACIST, hospitalId: "h1" });
      const { next, error } = captureNext();
      requirePermission("pharmacy.prescriptions.dispense")(req, {} as Response, next);
      expect(error()).toBeUndefined();
    });

    it("Pharmacist CANNOT write clinical diagnoses (DENY)", () => {
      const req = makeRequest({}, { userId: "pharm1", role: UserRole.PHARMACIST, hospitalId: "h1" });
      const { next, error } = captureNext();
      requirePermission("clinical.diagnoses.write")(req, {} as Response, next);
      expect(error()?.status).toBe(403);
    });

    it("Receptionist CAN register patients and manage public queue", () => {
      const req = makeRequest({}, { userId: "rec1", role: UserRole.RECEPTIONIST, hospitalId: "h1" });
      const { next, error } = captureNext();
      requirePermission("appointments.create")(req, {} as Response, next);
      expect(error()).toBeUndefined();
    });

    it("Receptionist CANNOT write clinical diagnoses or view restricted notes (DENY)", () => {
      const req = makeRequest({}, { userId: "rec1", role: UserRole.RECEPTIONIST, hospitalId: "h1" });
      const { next, error } = captureNext();
      requirePermission("clinical.consultations.write")(req, {} as Response, next);
      expect(error()?.status).toBe(403);
    });

    it("Finance officer CAN process billing payments and manage invoices", () => {
      const req = makeRequest({}, { userId: "fin1", role: UserRole.FINANCE_OFFICER, hospitalId: "h1" });
      const { next, error } = captureNext();
      requirePermission("billing.payments.process")(req, {} as Response, next);
      expect(error()).toBeUndefined();
    });

    it("Finance officer CANNOT write clinical diagnoses or approve lab results (DENY)", () => {
      const req = makeRequest({}, { userId: "fin1", role: UserRole.FINANCE_OFFICER, hospitalId: "h1" });
      const { next, error } = captureNext();
      requirePermission("clinical.diagnoses.write")(req, {} as Response, next);
      expect(error()?.status).toBe(403);
    });

    it("Administrator CAN manage hospital users and settings", () => {
      const req = makeRequest({}, { userId: "admin1", role: UserRole.ADMINISTRATOR, hospitalId: "h1" });
      const { next, error } = captureNext();
      requirePermission("users.manage")(req, {} as Response, next);
      expect(error()).toBeUndefined();
    });

    it("Administrator does NOT have wildcard clinical write access (DENY)", () => {
      const req = makeRequest({}, { userId: "admin1", role: UserRole.ADMINISTRATOR, hospitalId: "h1" });
      const { next, error } = captureNext();
      requirePermission("clinical.consultations.write")(req, {} as Response, next);
      expect(error()?.status).toBe(403);
    });
  });

  // =========================================================================
  // SECTION C: SESSION & TOKEN SECURITY TESTS
  // =========================================================================
  describe("C. Session & Token Security Tests", () => {
    it("rejects token with invalid signature", async () => {
      const forged = jwt.sign(
        { sub: "u1", role: UserRole.ADMINISTRATOR, hospitalId: "h1" },
        "wrong-secret-key-12345",
        { algorithm: "HS256", issuer: env.JWT_ISSUER, audience: "ghms-web" }
      );
      const { next, error } = captureNext();
      await authenticate(makeRequest({ authorization: `Bearer ${forged}` }), {} as Response, next);
      expect(error()?.status).toBe(401);
      expect(error()?.code).toBe("UNAUTHENTICATED");
    });

    it("rejects expired token", async () => {
      const expired = createToken({}, { expiresIn: "-1s" });
      const { next, error } = captureNext();
      await authenticate(makeRequest({ authorization: `Bearer ${expired}` }), {} as Response, next);
      expect(error()?.status).toBe(401);
    });

    it("rejects disabled or suspended user from database", async () => {
      setAuthDatabase({
        user: { findUnique: vi.fn().mockResolvedValue({ status: "SUSPENDED", hospitalId: "h1", role: UserRole.DOCTOR }) },
      } as unknown as PrismaClient);
      const { next, error } = captureNext();
      await authenticate(makeRequest({ authorization: `Bearer ${createToken()}` }), {} as Response, next);
      expect(error()?.status).toBe(403);
      expect(error()?.code).toBe("ACCOUNT_NOT_ACTIVE");
    });

    it("rejects token tenant mismatch against database", async () => {
      setAuthDatabase({
        user: { findUnique: vi.fn().mockResolvedValue({ status: "ACTIVE", hospitalId: "different-hospital", role: UserRole.DOCTOR }) },
      } as unknown as PrismaClient);
      const { next, error } = captureNext();
      await authenticate(makeRequest({ authorization: `Bearer ${createToken({ hospitalId: "h1" })}` }), {} as Response, next);
      expect(error()?.status).toBe(401);
      expect(error()?.code).toBe("TENANT_MISMATCH");
    });

    it("accepts valid token delivered via HttpOnly cookie ghms_access", async () => {
      const valid = createToken();
      const req = makeRequest({ cookie: `ghms_access=${valid}; ghms_refresh=something` });
      const { next, error } = captureNext();
      await authenticate(req, {} as Response, next);
      expect(error()).toBeUndefined();
      expect(req.actor?.role).toBe(UserRole.DOCTOR);
    });
  });

  // =========================================================================
  // SECTION D: PRIVILEGE ESCALATION ATTEMPTS
  // =========================================================================
  describe("D. Privilege Escalation Prevention Tests", () => {
    it("overrides forged token role with verified database role", async () => {
      // User created token claiming to be ADMINISTRATOR, but database says PATIENT
      setAuthDatabase({
        user: { findUnique: vi.fn().mockResolvedValue({ status: "ACTIVE", hospitalId: "h1", role: UserRole.PATIENT }) },
      } as unknown as PrismaClient);
      const forgedRoleToken = createToken({ role: UserRole.ADMINISTRATOR, hospitalId: "h1" });
      const req = makeRequest({ authorization: `Bearer ${forgedRoleToken}` });
      const { next, error } = captureNext();
      await authenticate(req, {} as Response, next);
      expect(error()).toBeUndefined();
      // Actor role is safely enforced from database, NOT client token
      expect(req.actor?.role).toBe(UserRole.PATIENT);
    });

    it("requireSuperAdmin blocks non-super-admins even with admin role", () => {
      const req = makeRequest({}, { userId: "admin1", role: UserRole.ADMINISTRATOR, hospitalId: "h1" });
      const { next, error } = captureNext();
      requireSuperAdmin(req, {} as Response, next);
      expect(error()?.status).toBe(403);
      expect(error()?.code).toBe("FORBIDDEN");
    });
  });

  // =========================================================================
  // SECTION E: DEPARTMENT BOUNDARY TESTS
  // =========================================================================
  describe("E. Department Boundary Tests", () => {
    it("allows staff belonging to the exact department", () => {
      const req = makeRequest({}, { userId: "d1", role: UserRole.DOCTOR, hospitalId: "h1", department: "Pediatrics" });
      const { next, error } = captureNext();
      requireDepartmentAccess("Pediatrics")(req, {} as Response, next);
      expect(error()).toBeUndefined();
    });

    it("blocks staff belonging to a different department", () => {
      const req = makeRequest({}, { userId: "d1", role: UserRole.DOCTOR, hospitalId: "h1", department: "Internal Medicine" });
      const { next, error } = captureNext();
      requireDepartmentAccess("Pediatrics")(req, {} as Response, next);
      expect(error()?.status).toBe(403);
      expect(error()?.code).toBe("FORBIDDEN");
    });

    it("allows Administrator across all department boundaries", () => {
      const req = makeRequest({}, { userId: "a1", role: UserRole.ADMINISTRATOR, hospitalId: "h1", department: "Administration" });
      const { next, error } = captureNext();
      requireDepartmentAccess("Pediatrics")(req, {} as Response, next);
      expect(error()).toBeUndefined();
    });
  });
});
