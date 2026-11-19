import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { UserRole } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { env } from "../config/env.js";
import { HttpError } from "../utils/http-error.js";
import { authenticate, requireTenant, setAuthDatabase } from "./authenticate.js";

function requestWithToken(token: string) {
  return { header: (name: string) => name === "authorization" ? `Bearer ${token}` : undefined } as unknown as Request;
}

function captureNext() {
  const next = vi.fn() as unknown as NextFunction;
  return { next, error: () => (next.mock.calls[0]?.[0] as HttpError | undefined) };
}

function token(overrides: Record<string, unknown> = {}, options: jwt.SignOptions = {}) {
  return jwt.sign({
    sub: "u1", role: UserRole.ADMINISTRATOR, hospitalId: "h1",
    ...overrides,
  }, env.JWT_ACCESS_SECRET, {
    algorithm: "HS256", issuer: env.JWT_ISSUER, audience: "ghms-web", ...options,
  });
}

describe("authentication middleware", () => {
  afterEach(() => setAuthDatabase(null));

  it("rejects legacy tokens without issuer/audience", async () => {
    const legacy = jwt.sign({ sub: "u1", role: UserRole.ADMINISTRATOR, hospitalId: "h1" }, env.JWT_ACCESS_SECRET);
    const { next, error } = captureNext();
    await authenticate(requestWithToken(legacy), {} as Response, next);
    expect(error()?.code).toBe("UNAUTHENTICATED");
  });

  it("rejects tokens whose tenant differs from the active database account", async () => {
    setAuthDatabase({
      user: { findUnique: vi.fn().mockResolvedValue({ status: "ACTIVE", hospitalId: "h2", role: UserRole.ADMINISTRATOR }) },
    } as unknown as PrismaClient);
    const { next, error } = captureNext();
    await authenticate(requestWithToken(token()), {} as Response, next);
    expect(error()?.code).toBe("TENANT_MISMATCH");
  });

  it("uses the database role and attaches tenant context", async () => {
    setAuthDatabase({
      user: { findUnique: vi.fn().mockResolvedValue({ status: "ACTIVE", hospitalId: "h1", role: UserRole.FINANCE_OFFICER }) },
    } as unknown as PrismaClient);
    const request = requestWithToken(token({ role: UserRole.ADMINISTRATOR }));
    const { next, error } = captureNext();
    await authenticate(request, {} as Response, next);
    expect(error()).toBeUndefined();
    expect(request.actor).toMatchObject({ userId: "u1", role: UserRole.FINANCE_OFFICER, hospitalId: "h1" });
  });

  it("requireTenant blocks actors without a hospital", () => {
    const { next, error } = captureNext();
    requireTenant({ actor: { userId: "u", role: UserRole.PATIENT } } as Request, {} as Response, next);
    expect(error()?.code).toBe("TENANT_REQUIRED");
  });
});
