import { describe, it, expect } from "vitest";
import {
  ROLE_CARD_LIST,
  ROLE_CONFIGS,
  getRoleConfig,
  getRoleDefaultDashboard,
  formatRoleTitle,
} from "./roles";

describe("GHMS Role Configurations & Landing Page Options", () => {
  it("defines the 8 required role login portals from the design", () => {
    expect(ROLE_CARD_LIST).toHaveLength(8);
    const keys = ROLE_CARD_LIST.map((r) => r.key);
    expect(keys).toEqual([
      "administrator",
      "doctor",
      "nurse",
      "laboratory",
      "pharmacist",
      "receptionist",
      "patient",
      "other",
    ]);
  });

  it("assigns appropriate expected backend roles and dashboard routes", () => {
    expect(ROLE_CONFIGS.administrator.expectedRoles).toContain("ADMINISTRATOR");
    expect(ROLE_CONFIGS.administrator.defaultDashboard).toBe("/overview");

    expect(ROLE_CONFIGS.doctor.expectedRoles).toContain("DOCTOR");
    expect(ROLE_CONFIGS.doctor.defaultDashboard).toBe("/opd");

    expect(ROLE_CONFIGS.nurse.expectedRoles).toContain("NURSE");
    expect(ROLE_CONFIGS.nurse.defaultDashboard).toBe("/vital-signs");

    expect(ROLE_CONFIGS.laboratory.expectedRoles).toContain("LABORATORY_TECHNICIAN");
    expect(ROLE_CONFIGS.laboratory.defaultDashboard).toBe("/laboratory");

    expect(ROLE_CONFIGS.receptionist.expectedRoles).toContain("RECEPTIONIST");
    expect(ROLE_CONFIGS.receptionist.defaultDashboard).toBe("/patient-registration");

    expect(ROLE_CONFIGS.pharmacist.expectedRoles).toContain("PHARMACIST");
    expect(ROLE_CONFIGS.pharmacist.defaultDashboard).toBe("/pharmacy");

    expect(ROLE_CONFIGS.finance.expectedRoles).toContain("FINANCE_OFFICER");
    expect(ROLE_CONFIGS.finance.defaultDashboard).toBe("/billing");

    expect(ROLE_CONFIGS.patient.expectedRoles).toContain("PATIENT");
    expect(ROLE_CONFIGS.patient.defaultDashboard).toBe("/patient-portal");
  });

  it("resolves role configs by key case-insensitively", () => {
    expect(getRoleConfig("Doctor")?.key).toBe("doctor");
    expect(getRoleConfig("ADMINISTRATOR")?.key).toBe("administrator");
    expect(getRoleConfig("patient")?.key).toBe("patient");
    expect(getRoleConfig("unknown")).toBeNull();
    expect(getRoleConfig(null)).toBeNull();
  });

  it("determines correct default dashboards for backend roles", () => {
    expect(getRoleDefaultDashboard("PATIENT")).toBe("/patient-portal");
    expect(getRoleDefaultDashboard("DOCTOR")).toBe("/opd");
    expect(getRoleDefaultDashboard("NURSE")).toBe("/vital-signs");
    expect(getRoleDefaultDashboard("LABORATORY_TECHNICIAN")).toBe("/laboratory");
    expect(getRoleDefaultDashboard("PHARMACIST")).toBe("/pharmacy");
    expect(getRoleDefaultDashboard("RECEPTIONIST")).toBe("/patient-registration");
    expect(getRoleDefaultDashboard("FINANCE_OFFICER")).toBe("/billing");
    expect(getRoleDefaultDashboard("ADMINISTRATOR")).toBe("/overview");
  });

  it("formats role titles cleanly", () => {
    expect(formatRoleTitle("DOCTOR")).toBe("Doctor");
    expect(formatRoleTitle("ADMINISTRATOR")).toBe("Administrator");
    expect(formatRoleTitle("PATIENT")).toBe("Patient");
    expect(formatRoleTitle("FINANCE_OFFICER")).toBe("Finance Officer");
  });
});
