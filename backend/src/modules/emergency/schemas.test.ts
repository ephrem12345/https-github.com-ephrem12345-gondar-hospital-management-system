import { describe, expect, it } from "vitest";
import {
  departmentAssignmentSchema,
  departmentWorkflowSchema,
  emergencyRegistrationSchema,
  emergencyTriageSchema,
  emergencyWorkflowSchema,
} from "./schemas.js";

describe("emergency request schemas", () => {
  it("supports existing, newly registered, and unidentified emergency patients", () => {
    const existing = emergencyRegistrationSchema.safeParse({
      patientIdentifier: "GHMS-01042",
      arrivalMode: "Walk-in",
      presentingComplaint: "Patient-reported complaint",
    });
    const newPatient = emergencyRegistrationSchema.safeParse({
      newPatient: {
        firstName: "Example",
        lastName: "Patient",
        sex: "female",
        dateOfBirth: "2000-01-01",
        phone: "0911000000",
      },
      arrivalMode: "Ambulance",
      presentingComplaint: "Reported complaint",
    });
    const unidentified = emergencyRegistrationSchema.safeParse({
      unidentified: true,
      temporaryPatient: { fullName: "Unknown patient" },
      arrivalMode: "Ambulance",
      presentingComplaint: "Reported complaint",
    });

    expect(existing.success).toBe(true);
    expect(newPatient.success).toBe(true);
    expect(unidentified.success).toBe(true);
  });

  it("rejects ambiguous patient identity and leaves triage priority to the clinician", () => {
    expect(emergencyRegistrationSchema.safeParse({
      patientIdentifier: "GHMS-01042",
      unidentified: true,
      arrivalMode: "Walk-in",
      presentingComplaint: "Complaint",
    }).success).toBe(false);

    const triage = emergencyTriageSchema.safeParse({
      category: "Orange",
      priority: "Assigned by triage clinician",
      assignedStaff: "Clinician",
      assessmentNotes: "Assessment supplied by clinician",
      vitalSigns: "BP and pulse supplied by clinician",
    });
    expect(triage.success).toBe(true);
    if (triage.success) expect(triage.data.priority).toBe("Assigned by triage clinician");
  });

  it("validates department assignments, supported workflows, and workflow status inputs", () => {
    expect(departmentAssignmentSchema.safeParse({
      patientId: "GHMS-01042",
      department: "Internal Medicine",
      focus: "Follow-up",
      clinician: "Assigned clinician",
    }).success).toBe(true);
    expect(departmentWorkflowSchema.safeParse({
      patientId: "GHMS-01042",
      department: "Dentistry",
      kind: "dental-examination",
      details: { examination: "Documented" },
      summary: "Dental examination",
    }).success).toBe(true);
    expect(emergencyWorkflowSchema.safeParse({ status: "DISCHARGE" }).success).toBe(true);
    expect(emergencyWorkflowSchema.safeParse({ status: "UNRELATED" }).success).toBe(false);
  });
});
