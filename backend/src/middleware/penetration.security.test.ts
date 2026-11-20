import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { UserRole, InvoiceStatus, PaymentStatus } from "@prisma/client";
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
} from "./authenticate.js";
import { ChapaPaymentService } from "../modules/payments/chapa.service.js";

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
      sub: "user-test-id",
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

describe("GHMS Comprehensive Security Penetration Test Suite", () => {
  afterEach(() => setAuthDatabase(null));

  // =========================================================================
  // TEST 2: PROTECTED BACKEND APIS WITHOUT AUTHENTICATION
  // =========================================================================
  describe("Test 2: Backend API Access Without Authentication", () => {
    const protectedPermissions = [
      "appointments.read.all",
      "appointments.create",
      "clinical.read",
      "clinical.diagnoses.write",
      "laboratory.orders.read",
      "laboratory.results.write",
      "pharmacy.prescriptions.dispense",
      "billing.invoices.create",
      "users.manage",
      "roles.manage",
    ];

    it.each(protectedPermissions)("rejects unauthenticated call requiring permission: %s", (perm) => {
      const { next, error } = captureNext();
      requirePermission(perm)(makeRequest(), {} as Response, next);
      expect(error()).toBeInstanceOf(HttpError);
      expect(error()?.status).toBe(401);
      expect(error()?.code).toBe("UNAUTHENTICATED");
    });

    const protectedRoles = [
      UserRole.ADMINISTRATOR,
      UserRole.SUPER_ADMIN,
      UserRole.DOCTOR,
      UserRole.NURSE,
      UserRole.LABORATORY_TECHNICIAN,
      UserRole.PHARMACIST,
      UserRole.FINANCE_OFFICER,
      UserRole.RECEPTIONIST,
    ];

    it.each(protectedRoles)("rejects unauthenticated call requiring role: %s", (role) => {
      const { next, error } = captureNext();
      requireRole(role)(makeRequest(), {} as Response, next);
      expect(error()?.status).toBe(401);
      expect(error()?.code).toBe("UNAUTHENTICATED");
    });
  });

  // =========================================================================
  // TEST 4 & 5: PRIVILEGE ESCALATION & CROSS-DEPARTMENT ACCESS
  // =========================================================================
  describe("Test 4 & 5: Privilege Escalation & Cross-Department Segregation", () => {
    it("DOCTOR cannot access finance billing (DENY 403)", () => {
      const req = makeRequest({}, { userId: "d1", role: UserRole.DOCTOR, hospitalId: "h1" });
      const { next, error } = captureNext();
      requirePermission("billing.manage")(req, {} as Response, next);
      expect(error()?.status).toBe(403);
      expect(error()?.code).toBe("FORBIDDEN");
    });

    it("DOCTOR cannot access user management administration (DENY 403)", () => {
      const req = makeRequest({}, { userId: "d1", role: UserRole.DOCTOR, hospitalId: "h1" });
      const { next, error } = captureNext();
      requireRole(UserRole.ADMINISTRATOR)(req, {} as Response, next);
      expect(error()?.status).toBe(403);
      expect(error()?.code).toBe("FORBIDDEN");
    });

    it("NURSE cannot access finance billing or payments (DENY 403)", () => {
      const req = makeRequest({}, { userId: "n1", role: UserRole.NURSE, hospitalId: "h1" });
      const { next, error } = captureNext();
      requirePermission("billing.payments.process")(req, {} as Response, next);
      expect(error()?.status).toBe(403);
    });

    it("NURSE cannot create or alter medical diagnoses (DENY 403)", () => {
      const req = makeRequest({}, { userId: "n1", role: UserRole.NURSE, hospitalId: "h1" });
      const { next, error } = captureNext();
      requirePermission("clinical.diagnoses.write")(req, {} as Response, next);
      expect(error()?.status).toBe(403);
    });

    it("LABORATORY_TECHNICIAN cannot access pharmacy dispensing (DENY 403)", () => {
      const req = makeRequest({}, { userId: "l1", role: UserRole.LABORATORY_TECHNICIAN, hospitalId: "h1" });
      const { next, error } = captureNext();
      requirePermission("pharmacy.prescriptions.dispense")(req, {} as Response, next);
      expect(error()?.status).toBe(403);
    });

    it("PHARMACIST cannot access clinical diagnoses (DENY 403)", () => {
      const req = makeRequest({}, { userId: "p1", role: UserRole.PHARMACIST, hospitalId: "h1" });
      const { next, error } = captureNext();
      requirePermission("clinical.diagnoses.write")(req, {} as Response, next);
      expect(error()?.status).toBe(403);
    });

    it("FINANCE_OFFICER cannot access clinical diagnoses (DENY 403)", () => {
      const req = makeRequest({}, { userId: "f1", role: UserRole.FINANCE_OFFICER, hospitalId: "h1" });
      const { next, error } = captureNext();
      requirePermission("clinical.diagnoses.write")(req, {} as Response, next);
      expect(error()?.status).toBe(403);
    });

    it("FINANCE_OFFICER cannot approve laboratory results (DENY 403)", () => {
      const req = makeRequest({}, { userId: "f1", role: UserRole.FINANCE_OFFICER, hospitalId: "h1" });
      const { next, error } = captureNext();
      requirePermission("laboratory.results.approve")(req, {} as Response, next);
      expect(error()?.status).toBe(403);
    });

    it("RECEPTIONIST cannot write clinical consultations (DENY 403)", () => {
      const req = makeRequest({}, { userId: "r1", role: UserRole.RECEPTIONIST, hospitalId: "h1" });
      const { next, error } = captureNext();
      requirePermission("clinical.consultations.write")(req, {} as Response, next);
      expect(error()?.status).toBe(403);
    });

    it("PATIENT cannot access staff clinical APIs (DENY 403)", () => {
      const req = makeRequest({}, { userId: "pat1", role: UserRole.PATIENT, hospitalId: "h1" });
      const { next, error } = captureNext();
      requirePermission("clinical.read")(req, {} as Response, next);
      expect(error()?.status).toBe(403);
    });
  });

  // =========================================================================
  // TEST 7: EXPIRED, REVOKED OR INVALID TOKENS
  // =========================================================================
  describe("Test 7: Expired, Revoked, and Invalid Tokens", () => {
    it("rejects token with invalid signature (DENY 401)", async () => {
      const forged = jwt.sign(
        { sub: "u1", role: UserRole.DOCTOR, hospitalId: "h1" },
        "attacker-compromised-secret",
        { issuer: env.JWT_ISSUER, audience: "ghms-web" }
      );
      const { next, error } = captureNext();
      await authenticate(makeRequest({ authorization: `Bearer ${forged}` }), {} as Response, next);
      expect(error()?.status).toBe(401);
      expect(error()?.code).toBe("UNAUTHENTICATED");
    });

    it("rejects expired token (DENY 401)", async () => {
      const expired = createToken({}, { expiresIn: "-10s" });
      const { next, error } = captureNext();
      await authenticate(makeRequest({ authorization: `Bearer ${expired}` }), {} as Response, next);
      expect(error()?.status).toBe(401);
    });

    it("rejects suspended or inactive account (DENY 403)", async () => {
      setAuthDatabase({
        user: { findUnique: vi.fn().mockResolvedValue({ status: "SUSPENDED", hospitalId: "h1", role: UserRole.DOCTOR }) },
      } as unknown as PrismaClient);
      const { next, error } = captureNext();
      await authenticate(makeRequest({ authorization: `Bearer ${createToken()}` }), {} as Response, next);
      expect(error()?.status).toBe(403);
      expect(error()?.code).toBe("ACCOUNT_NOT_ACTIVE");
    });
  });

  // =========================================================================
  // TEST 10: PAYMENT AND INVOICE SECURITY ISOLATION
  // =========================================================================
  describe("Test 10: Payment & Invoice Access Isolation", () => {
    const mockDb = {
      invoice: {
        findUnique: vi.fn().mockResolvedValue({
          id: "inv-1",
          hospitalId: "h1",
          patientId: "patient-1",
          status: InvoiceStatus.PENDING,
          total: 1500,
          paidAmount: 0,
          patient: { user: { email: "p@gh.et", firstName: "A", lastName: "B" } },
        }),
      },
      payment: {
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn(),
        create: vi.fn().mockResolvedValue({ id: "pay-1" }),
        update: vi.fn().mockResolvedValue({ id: "pay-1" }),
      },
      paymentAudit: { create: vi.fn().mockResolvedValue({}) },
    } as unknown as PrismaClient;

    const mockGateway = {
      initialize: vi.fn(),
      verify: vi.fn(),
    };

    const paymentService = new ChapaPaymentService(mockDb, mockGateway as any);

    it("DOCTOR cannot initialize invoice payment (DENY 403)", async () => {
      const doctorActor = { userId: "d1", role: UserRole.DOCTOR, hospitalId: "h1" };
      await expect(
        paymentService.initializePayment({ invoiceId: "inv-1", actor: doctorActor })
      ).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
    });

    it("NURSE cannot initialize invoice payment (DENY 403)", async () => {
      const nurseActor = { userId: "n1", role: UserRole.NURSE, hospitalId: "h1" };
      await expect(
        paymentService.initializePayment({ invoiceId: "inv-1", actor: nurseActor })
      ).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
    });

    it("LABORATORY_TECHNICIAN cannot initialize invoice payment (DENY 403)", async () => {
      const labActor = { userId: "l1", role: UserRole.LABORATORY_TECHNICIAN, hospitalId: "h1" };
      await expect(
        paymentService.initializePayment({ invoiceId: "inv-1", actor: labActor })
      ).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
    });

    it("PATIENT cannot initialize payment on another patient's invoice (DENY 403)", async () => {
      // Invoice belongs to patient-1, but actor is patient-2
      const patientActor = { userId: "pat2", role: UserRole.PATIENT, hospitalId: "h1", patientId: "patient-2" };
      await expect(
        paymentService.initializePayment({ invoiceId: "inv-1", actor: patientActor })
      ).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
    });

    it("FINANCE_OFFICER CAN initialize invoice payment (ALLOW)", async () => {
      mockGateway.initialize.mockResolvedValueOnce({
        checkoutUrl: "https://checkout.chapa.co/pay",
        rawReference: "tx-123",
      });
      const financeActor = { userId: "f1", role: UserRole.FINANCE_OFFICER, hospitalId: "h1" };
      (mockDb.payment as any).create = vi.fn().mockResolvedValueOnce({ id: "pay-1" });
      const result = await paymentService.initializePayment({ invoiceId: "inv-1", actor: financeActor });
      expect(result.checkoutUrl).toBe("https://checkout.chapa.co/pay");
    });
  });

  // =========================================================================
  // TEST 11: ADMINISTRATOR CLINICAL PERMISSION RESTRICTION
  // =========================================================================
  describe("Test 11: Administrator Clinical Permission Boundary", () => {
    it("ADMINISTRATOR cannot write clinical consultation notes (DENY 403)", () => {
      const req = makeRequest({}, { userId: "admin1", role: UserRole.ADMINISTRATOR, hospitalId: "h1" });
      const { next, error } = captureNext();
      requirePermission("clinical.consultations.write")(req, {} as Response, next);
      expect(error()?.status).toBe(403);
      expect(error()?.code).toBe("FORBIDDEN");
    });

    it("ADMINISTRATOR cannot write medical diagnoses (DENY 403)", () => {
      const req = makeRequest({}, { userId: "admin1", role: UserRole.ADMINISTRATOR, hospitalId: "h1" });
      const { next, error } = captureNext();
      requirePermission("clinical.diagnoses.write")(req, {} as Response, next);
      expect(error()?.status).toBe(403);
      expect(error()?.code).toBe("FORBIDDEN");
    });

    it("ADMINISTRATOR cannot dispense pharmacy medications (DENY 403)", () => {
      const req = makeRequest({}, { userId: "admin1", role: UserRole.ADMINISTRATOR, hospitalId: "h1" });
      const { next, error } = captureNext();
      requirePermission("pharmacy.prescriptions.dispense")(req, {} as Response, next);
      expect(error()?.status).toBe(403);
    });

    it("ADMINISTRATOR CAN manage hospital users, roles, and settings (ALLOW 200)", () => {
      const req = makeRequest({}, { userId: "admin1", role: UserRole.ADMINISTRATOR, hospitalId: "h1" });
      const { next, error } = captureNext();
      requirePermission("users.manage")(req, {} as Response, next);
      expect(error()).toBeUndefined();
    });
  });
});
