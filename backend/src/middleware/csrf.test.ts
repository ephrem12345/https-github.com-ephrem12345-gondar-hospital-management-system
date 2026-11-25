import type { Request, Response, NextFunction } from "express";
import { describe, expect, it, vi } from "vitest";
import { csrfProtection } from "./csrf.js";
import { HttpError } from "../utils/http-error.js";

function makeReq(options: {
  method?: string;
  path?: string;
  headers?: Record<string, string>;
}): Request {
  const headers = options.headers || {};
  return {
    method: options.method || "POST",
    path: options.path || "/api/v1/appointments",
    header: (name: string) => headers[name.toLowerCase()],
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

describe("CSRF and Cross-Origin Request Defense Middleware", () => {
  it("allows safe read methods (GET, HEAD, OPTIONS) without checking origin", () => {
    for (const method of ["GET", "HEAD", "OPTIONS"]) {
      const { next, error } = captureNext();
      const req = makeReq({ method, headers: { origin: "https://untrusted-site.com" } });
      csrfProtection(req, {} as Response, next);
      expect(error()).toBeUndefined();
    }
  });

  it("allows Chapa webhook requests that use cryptographic signature verification", () => {
    const { next, error } = captureNext();
    const req = makeReq({ method: "POST", path: "/api/v1/payments/chapa/webhook" });
    csrfProtection(req, {} as Response, next);
    expect(error()).toBeUndefined();
  });

  it("allows state-changing requests from configured allowed origins (localhost:3002)", () => {
    const { next, error } = captureNext();
    const req = makeReq({
      method: "POST",
      headers: { origin: "http://localhost:3002", "x-requested-with": "XMLHttpRequest" },
    });
    csrfProtection(req, {} as Response, next);
    expect(error()).toBeUndefined();
  });

  it("allows state-changing requests with valid referer from allowed origins", () => {
    const { next, error } = captureNext();
    const req = makeReq({
      method: "POST",
      headers: { referer: "http://localhost:3002/appointments/new" },
    });
    csrfProtection(req, {} as Response, next);
    expect(error()).toBeUndefined();
  });

  it("rejects unauthorized cross-origin requests from untrusted origins, even if x-requested-with is sent", () => {
    const { next, error } = captureNext();
    const req = makeReq({
      method: "POST",
      headers: {
        origin: "https://evil-attacker.example",
        "x-requested-with": "XMLHttpRequest",
      },
    });
    csrfProtection(req, {} as Response, next);
    expect(error()).toBeInstanceOf(HttpError);
    expect(error()?.status).toBe(403);
    expect(error()?.code).toBe("CSRF_DETECTED");
  });

  it("rejects unauthorized requests with untrusted referer", () => {
    const { next, error } = captureNext();
    const req = makeReq({
      method: "POST",
      headers: { referer: "https://malicious-site.example/attack" },
    });
    csrfProtection(req, {} as Response, next);
    expect(error()).toBeInstanceOf(HttpError);
    expect(error()?.status).toBe(403);
    expect(error()?.code).toBe("CSRF_DETECTED");
  });

  it("rejects unauthorized requests with malformed referer", () => {
    const { next, error } = captureNext();
    const req = makeReq({
      method: "POST",
      headers: { referer: "not-a-valid-url" },
    });
    csrfProtection(req, {} as Response, next);
    expect(error()).toBeInstanceOf(HttpError);
    expect(error()?.status).toBe(403);
    expect(error()?.code).toBe("CSRF_DETECTED");
  });

  it("allows legitimate non-browser/internal requests with X-Requested-With header when origin and referer are omitted", () => {
    const { next, error } = captureNext();
    const req = makeReq({
      method: "POST",
      headers: { "x-requested-with": "XMLHttpRequest" },
    });
    csrfProtection(req, {} as Response, next);
    expect(error()).toBeUndefined();
  });
});
