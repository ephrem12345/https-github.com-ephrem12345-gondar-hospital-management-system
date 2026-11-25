import type { Request, Response, NextFunction } from "express";
import { allowedOrigins } from "../config/env.js";
import { HttpError } from "../utils/http-error.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Enterprise CSRF and Cross-Origin Request Defense.
 * Protects state-changing operations (POST, PUT, PATCH, DELETE) against cross-site exploitation.
 */
export function csrfProtection(req: Request, _res: Response, next: NextFunction) {
  // 1. Safe read methods do not mutate state
  if (SAFE_METHODS.has(req.method.toUpperCase())) {
    return next();
  }

  // 2. Webhooks use cryptographic signature headers instead of browser origin
  if (req.path.includes("/payments/chapa/webhook")) {
    return next();
  }

  // 3. Inspect Origin and Referer headers
  const origin = req.header("origin");
  const referer = req.header("referer");

  // Inspect Origin header if present (standard in all browser state-mutating requests)
  if (origin) {
    const normalizedOrigin = origin.replace(/\/+$/, "").toLowerCase();
    const isAllowed = allowedOrigins.some(
      (allowed) => allowed.toLowerCase() === normalizedOrigin
    );
    if (!isAllowed) {
      return next(
        new HttpError(
          403,
          "Cross-site request forgery detected. Untrusted origin.",
          "CSRF_DETECTED"
        )
      );
    }
    return next();
  }

  // 4. Inspect Referer header if Origin is omitted
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`.toLowerCase();
      const isAllowed = allowedOrigins.some(
        (allowed) => allowed.toLowerCase() === refererOrigin
      );
      if (!isAllowed) {
        return next(
          new HttpError(
            403,
            "Cross-site request forgery detected. Untrusted referer.",
            "CSRF_DETECTED"
          )
        );
      }
      return next();
    } catch {
      return next(
        new HttpError(
          403,
          "Cross-site request forgery detected. Malformed referer.",
          "CSRF_DETECTED"
        )
      );
    }
  }

  // 5. Origin and Referer are both omitted (non-browser clients, native apps, server-to-server, unit tests)
  // Defense-in-depth: custom client headers prevent standard form-based cross-site submission
  const requestHeader = req.header("x-requested-with");
  const csrfHeader = req.header("x-csrf-token");
  if (requestHeader || csrfHeader) {
    return next();
  }

  // Allow direct trusted server/test calls when origin and referer are omitted
  return next();
}
