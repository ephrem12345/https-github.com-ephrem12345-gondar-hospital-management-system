import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClinicalServicesScreen } from "./ClinicalServicesScreen";
import {
  clinicalAllergySchema,
  clinicalVitalSignsSchema,
  finalizedConsultationSchema,
} from "@/validation/schemas";

describe("clinical validation schemas", () => {
  it("requires complete clinical content before finalizing a consultation", () => {
    const partial = { patientId: "GHMS-01042" };
    expect(finalizedConsultationSchema.safeParse(partial).success).toBe(false);
    expect(finalizedConsultationSchema.safeParse({
      ...partial,
      presentingComplaint: "Headache",
      historyOfPresentIllness: "Three days of intermittent headache",
      examination: "Alert and oriented",
      diagnosis: "Tension headache",
      treatmentPlan: "Hydration and follow-up",
    }).success).toBe(true);
  });

  it("rejects out-of-range observations and incomplete allergy records", () => {
    expect(clinicalVitalSignsSchema.safeParse({
      patientId: "GHMS-01042",
      bloodPressure: "120/80",
      heartRate: 900,
      respiratoryRate: 18,
      temperature: 36.8,
      oxygenSaturation: 98,
      weight: 60,
      height: 165,
      painScore: 2,
    }).success).toBe(false);
    expect(clinicalAllergySchema.safeParse({
      patientId: "GHMS-01042",
      allergyName: "Penicillin",
      reaction: "",
      severity: "severe",
      verificationStatus: "verified",
    }).success).toBe(false);
  });
});

describe("ClinicalServicesScreen", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("searches patients and saves a consultation draft to the selected patient's timeline", async () => {
    const user = userEvent.setup();
    render(<ClinicalServicesScreen title="Medical Records" />);

    await screen.findByRole("tablist", { name: "Clinical services" });
    await user.type(screen.getByRole("textbox", { name: "Search patients" }), "Meron");
    const patientRows = within(screen.getByRole("table")).getAllByRole("row");
    expect(patientRows).toHaveLength(2);
    expect(patientRows[1]).toHaveTextContent("Meron Ayele");
    expect(patientRows[1]).not.toHaveTextContent("Kebede Assefa");

    await user.click(screen.getByRole("tab", { name: "Consultation" }));
    await user.selectOptions(screen.getByLabelText("Select patient"), "GHMS-01044");
    await user.type(screen.getByLabelText("Presenting complaint"), "Headache");
    await user.click(screen.getByRole("button", { name: "Save draft" }));
    expect(screen.getByRole("alert")).toHaveTextContent("saved as a draft");

    await user.click(screen.getByRole("tab", { name: "Patient timeline" }));
    expect(screen.getByRole("tab", { name: "Consultation" })).toBeInTheDocument();
    expect(screen.getByText(/Headache/)).toBeInTheDocument();
    expect(screen.getByText(/Meron Ayele \(GHMS-01044\).*Draft/)).toBeInTheDocument();
  });

  it("requires all key consultation sections to finalize", async () => {
    const user = userEvent.setup();
    render(<ClinicalServicesScreen title="Consultation" initialSection="consultation" />);

    await screen.findByRole("tablist", { name: "Clinical services" });
    await user.click(screen.getByRole("button", { name: "Finalize consultation" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/presenting complaint/i);

    await user.selectOptions(screen.getByLabelText("Select patient"), "GHMS-01043");
    await user.type(screen.getByLabelText("Presenting complaint"), "Abdominal pain");
    await user.type(screen.getByLabelText("History of present illness"), "Pain began this morning");
    await user.type(screen.getByLabelText("Clinical examination"), "Patient stable");
    await user.type(screen.getByLabelText("Diagnosis"), "Abdominal pain");
    await user.type(screen.getByLabelText("Treatment plan"), "Review after investigation");
    await user.click(screen.getByRole("button", { name: "Finalize consultation" }));

    expect(screen.getByRole("alert")).toHaveTextContent("finalized");
  });

  it("allows nursing and vital-sign documentation for a nurse role", async () => {
    window.localStorage.setItem("ghms-user", JSON.stringify({ name: "Sr. Example", role: "Nurse" }));
    const user = userEvent.setup();
    render(<ClinicalServicesScreen title="Nursing" initialSection="nursing" />);

    await screen.findByRole("button", { name: "Save nursing note" });
    await user.selectOptions(screen.getByLabelText("Select patient"), "GHMS-01042");
    await user.type(screen.getByLabelText("Nursing assessment"), "Patient alert, comfortable");
    await user.click(screen.getByRole("button", { name: "Save nursing note" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Nursing assessment");

    await user.click(screen.getByRole("tab", { name: "Vital signs" }));
    await user.selectOptions(screen.getByLabelText("Select patient"), "GHMS-01042");
    await user.type(screen.getByLabelText("Blood pressure (mmHg)"), "120/80");
    await user.type(screen.getByLabelText("Heart rate (bpm)"), "78");
    await user.type(screen.getByLabelText("Respiratory rate (breaths/min)"), "16");
    await user.type(screen.getByLabelText("Temperature (C)"), "36.8");
    await user.type(screen.getByLabelText("Oxygen saturation (%)"), "98");
    await user.type(screen.getByLabelText("Weight (kg)"), "60");
    await user.type(screen.getByLabelText("Height (cm)"), "165");
    await user.type(screen.getByLabelText("Pain score (0-10)"), "1");
    await user.click(screen.getByRole("button", { name: "Record measurements" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Vital signs recorded");
  });

  it("adds a verified allergy and creates a referral", async () => {
    const user = userEvent.setup();
    render(<ClinicalServicesScreen title="Clinical Services" initialSection="allergies" />);

    await screen.findByRole("tablist", { name: "Clinical services" });
    await user.selectOptions(screen.getByLabelText("Select patient"), "GHMS-01043");
    await user.type(screen.getByLabelText("Allergy name"), "Sulfa");
    await user.type(screen.getByLabelText("Reaction"), "Rash");
    await user.selectOptions(screen.getByLabelText("Severity"), "moderate");
    await user.selectOptions(screen.getByLabelText("Verification status"), "verified");
    await user.click(screen.getByRole("button", { name: "Save allergy" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Allergy added");
    expect(screen.getByText(/Sulfa - Moderate/)).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Referrals" }));
    await user.selectOptions(screen.getByLabelText("Select patient"), "GHMS-01043");
    await user.selectOptions(screen.getByLabelText("Referral type"), "external");
    await user.selectOptions(screen.getByLabelText("Receiving department / facility"), "Cardiology");
    await user.type(screen.getByLabelText("Referral reason"), "Specialist assessment");
    await user.type(screen.getByLabelText("Referring doctor"), "Dr. Example");
    await user.selectOptions(screen.getByLabelText("Priority"), "urgent");
    await user.click(screen.getByRole("button", { name: "Create referral" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Urgent referral created");
  });

  it("does not render clinical records for a patient role", async () => {
    window.localStorage.setItem("ghms-user", JSON.stringify({ name: "Patient Example", role: "Patient" }));
    render(<ClinicalServicesScreen title="Medical Records" />);

    expect(await screen.findByText(/Clinical access is restricted/)).toBeInTheDocument();
    expect(screen.queryByRole("tablist", { name: "Clinical services" })).not.toBeInTheDocument();
  });
});
