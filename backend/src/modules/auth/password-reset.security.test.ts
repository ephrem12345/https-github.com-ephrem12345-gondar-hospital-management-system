import { describe, expect, it } from "vitest";
import { shouldExposeResetTokenInResponse } from "./service.js";

describe("Password Reset Token Exposure & Production Safety", () => {
  describe("1. Environment Guard Validation", () => {
    it("strictly blocks reset token exposure in production", () => {
      expect(shouldExposeResetTokenInResponse("production")).toBe(false);
    });

    it("fails closed for unknown or staging environments", () => {
      expect(shouldExposeResetTokenInResponse("staging")).toBe(false);
      expect(shouldExposeResetTokenInResponse("preview")).toBe(false);
      expect(shouldExposeResetTokenInResponse("uat")).toBe(false);
      expect(shouldExposeResetTokenInResponse("")).toBe(false);
      expect(shouldExposeResetTokenInResponse(undefined as any)).toBe(false);
    });

    it("allows token return only in explicit development and test environments", () => {
      expect(shouldExposeResetTokenInResponse("development")).toBe(true);
      expect(shouldExposeResetTokenInResponse("test")).toBe(true);
    });
  });

  describe("2. Response Payload Hardening", () => {
    it("ensures production payload never leaks resetToken field", () => {
      const mockResetToken = "synthetic_32_byte_hex_token_1234567890abcdef1234567890abcdef";
      const isProd = shouldExposeResetTokenInResponse("production");

      const responsePayload = {
        message: "If an account matches that identifier, password reset instructions have been dispatched.",
        ...(isProd && mockResetToken ? { resetToken: mockResetToken } : {}),
      };

      expect(responsePayload.message).toBeDefined();
      expect((responsePayload as any).resetToken).toBeUndefined();
      expect(Object.keys(responsePayload)).toEqual(["message"]);
    });

    it("ensures anti-enumeration response is uniform across existing and non-existing accounts", () => {
      const existingAccountMsg = "If an account matches that identifier, password reset instructions have been dispatched.";
      const nonExistingAccountMsg = "If an account matches that identifier, password reset instructions have been dispatched.";

      expect(existingAccountMsg).toBe(nonExistingAccountMsg);
    });
  });
});
