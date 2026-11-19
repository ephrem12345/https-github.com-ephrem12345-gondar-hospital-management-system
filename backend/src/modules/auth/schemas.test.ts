import { describe, expect, it } from "vitest";
import {
  createStaffSchema,
  listUsersQuerySchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateUserStatusSchema,
} from "./schemas.js";

describe("authentication request schemas", () => {
  it("accepts the frontend login fields and defaults remember to false", () => {
    expect(loginSchema.parse({ identifier: "staff@example.org", password: "pass", extra: "ignored" })).toEqual({
      identifier: "staff@example.org",
      password: "pass",
      remember: false,
    });
  });

  it("accepts patient self-registration without a caller-controlled role", () => {
    const result = registerSchema.parse({
      firstName: "Aster",
      middleName: "",
      lastName: "Bekele",
      gender: "female",
      dateOfBirth: "1998-06-15",
      phone: "+251 911 234 567",
      email: "aster@example.org",
      address: "Gondar, Amhara",
      password: "Password123",
      termsAccepted: true,
      role: "ADMINISTRATOR",
    });
    expect(result).not.toHaveProperty("role");
    expect(result.termsAccepted).toBe(true);
  });

  it("rejects registration unless terms are accepted and password policy is met", () => {
    const result = registerSchema.safeParse({
      firstName: "Aster",
      middleName: "",
      lastName: "Bekele",
      gender: "female",
      dateOfBirth: "1998-06-15",
      phone: "+251 911 234 567",
      email: "aster@example.org",
      address: "Gondar, Amhara",
      password: "short",
      termsAccepted: false,
    });
    expect(result.success).toBe(false);
  });

  it("requires a sufficiently long password-reset token", () => {
    expect(resetPasswordSchema.safeParse({ token: "short", password: "Password123" }).success).toBe(false);
  });

  it("validates account status updates correctly", () => {
    expect(updateUserStatusSchema.parse({ status: "ACTIVE" })).toEqual({ status: "ACTIVE" });
    expect(updateUserStatusSchema.parse({ status: "PENDING", reason: "Pending background check" })).toEqual({
      status: "PENDING",
      reason: "Pending background check",
    });
    expect(updateUserStatusSchema.parse({ status: "DISABLED" })).toEqual({ status: "DISABLED" });
    expect(updateUserStatusSchema.safeParse({ status: "INVALID_STATUS" }).success).toBe(false);
  });

  it("validates list users query parameters and sets safe defaults", () => {
    const parsed = listUsersQuerySchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(20);

    const withFilters = listUsersQuerySchema.parse({
      role: "DOCTOR",
      status: "ACTIVE",
      search: "Selam",
      page: "2",
      limit: "50",
    });
    expect(withFilters.role).toBe("DOCTOR");
    expect(withFilters.status).toBe("ACTIVE");
    expect(withFilters.search).toBe("Selam");
    expect(withFilters.page).toBe(2);
    expect(withFilters.limit).toBe(50);
  });

  it("validates staff creation schema and enforces role and password constraints", () => {
    const validStaff = createStaffSchema.parse({
      email: "new.doctor@gondar-hospital.et",
      phone: "+251911999888",
      firstName: "Tewodros",
      lastName: "Kassa",
      department: "Internal Medicine",
      role: "DOCTOR",
      password: "DoctorSecure123",
    });
    expect(validStaff.email).toBe("new.doctor@gondar-hospital.et");
    expect(validStaff.role).toBe("DOCTOR");

    // Rejects weak password
    expect(
      createStaffSchema.safeParse({
        email: "new.doctor@gondar-hospital.et",
        firstName: "Tewodros",
        lastName: "Kassa",
        department: "Internal Medicine",
        role: "DOCTOR",
        password: "weak",
      }).success
    ).toBe(false);

    // Rejects patient role for staff creation
    expect(
      createStaffSchema.safeParse({
        email: "invalid.staff@gondar-hospital.et",
        firstName: "Tewodros",
        lastName: "Kassa",
        department: "Internal Medicine",
        role: "PATIENT",
        password: "DoctorSecure123",
      }).success
    ).toBe(false);
  });
});
