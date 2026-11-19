import { describe, expect, it } from "vitest";
import {
  portalAppointmentChangeSchema,
  portalAppointmentRequestSchema,
  portalProfileUpdateSchema,
  portalSupportRequestSchema,
} from "./schemas.js";

describe("portal schemas", () => {
  it("accepts a valid profile update limited to contact information", () => {
    const result = portalProfileUpdateSchema.safeParse({
      phone: "+251912345678",
      email: "patient@example.test",
      address: "Gondar",
      emergencyContactName: "Contact",
      emergencyContactPhone: "+251912345679",
    });
    expect(result.success).toBe(true);
  });

  it("rejects profile updates that omit required emergency contact fields", () => {
    const result = portalProfileUpdateSchema.safeParse({ phone: "+251912345678" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email addresses in profile updates", () => {
    const result = portalProfileUpdateSchema.safeParse({
      phone: "+251912345678",
      email: "not-an-email",
      emergencyContactName: "Contact",
      emergencyContactPhone: "+251912345679",
    });
    expect(result.success).toBe(false);
  });

  it("accepts appointment requests with an optional doctor", () => {
    const result = portalAppointmentRequestSchema.safeParse({
      department: "Internal Medicine",
      date: "2026-12-01",
      time: "09:30",
      reason: "Follow-up visit",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.doctor).toBeUndefined();
  });

  it("rejects appointment requests with invalid dates or times", () => {
    expect(portalAppointmentRequestSchema.safeParse({ department: "Internal Medicine", date: "2026-02-30", time: "09:30", reason: "Visit" }).success).toBe(false);
    expect(portalAppointmentRequestSchema.safeParse({ department: "Internal Medicine", date: "2026-12-01", time: "24:30", reason: "Visit" }).success).toBe(false);
  });

  it("requires a new date when rescheduling an appointment", () => {
    expect(portalAppointmentChangeSchema.safeParse({ action: "reschedule" }).success).toBe(false);
    expect(portalAppointmentChangeSchema.safeParse({ action: "reschedule", date: "2026-12-02" }).success).toBe(true);
    expect(portalAppointmentChangeSchema.safeParse({ action: "cancel" }).success).toBe(true);
  });

  it("accepts support requests in the frontend categories only", () => {
    expect(portalSupportRequestSchema.safeParse({ category: "Feedback", subject: "Subject", message: "Message" }).success).toBe(true);
    expect(portalSupportRequestSchema.safeParse({ category: "Billing", subject: "Subject", message: "Message" }).success).toBe(false);
  });
});
