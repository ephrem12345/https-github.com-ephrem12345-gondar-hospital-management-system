import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DiagnosticServicesScreen } from "./DiagnosticServicesScreen";
import { laboratoryResultSchema } from "@/validation/schemas";

describe("laboratory result validation", () => {
  const validResult = {
    orderId: "LAB-24018",
    patientId: "GHMS-01042",
    testName: "Complete blood count",
    kind: "numeric" as const,
    value: "4.8",
    unit: "10^9/L",
    referenceInterval: "4.0-11.0",
    abnormalIndicator: "Normal" as const,
    technicianComments: "",
  };

  it("accepts numeric and text results, and limits qualitative values", () => {
    expect(laboratoryResultSchema.safeParse(validResult).success).toBe(true);
    expect(laboratoryResultSchema.safeParse({ ...validResult, kind: "text", value: "Within expected range" }).success).toBe(true);
    expect(laboratoryResultSchema.safeParse({ ...validResult, kind: "qualitative", value: "Positive" }).success).toBe(true);
    expect(laboratoryResultSchema.safeParse({ ...validResult, kind: "qualitative", value: "Unclear" }).success).toBe(false);
    expect(laboratoryResultSchema.safeParse({ ...validResult, value: "not numeric" }).success).toBe(false);
  });
});

describe("DiagnosticServicesScreen", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("tracks order assignment and specimen collection in the demo workflow", async () => {
    const user = userEvent.setup();
    render(<DiagnosticServicesScreen title="Laboratory" initialSection="laboratory" />);

    expect(await screen.findByText(/Demonstration data only/)).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Orders" }));
    await user.click(screen.getAllByRole("button", { name: "Assign" })[0]);
    expect(screen.getByRole("status")).toHaveTextContent("assigned to the demo technician");

    await user.click(screen.getAllByRole("button", { name: "Collect specimen" })[0]);
    expect(screen.getByRole("status")).toHaveTextContent("Specimen collection recorded");
    const ordersTable = screen.getByRole("table", { name: "Laboratory orders" });
    expect(within(ordersTable).getAllByText("Specimen collected").length).toBeGreaterThan(0);
    await user.click(screen.getByRole("tab", { name: "Specimens" }));
    const specimenTable = screen.getByRole("table", { name: "Laboratory specimens" });
    expect(within(specimenTable).getByText("Demo specimen")).toBeInTheDocument();
  });

  it("validates result data and requires backend authorization for approval and release", async () => {
    const user = userEvent.setup();
    render(<DiagnosticServicesScreen title="Laboratory Results" initialSection="results" />);

    await user.selectOptions(screen.getAllByRole("combobox")[0], "LAB-24018");
    expect(screen.getByLabelText(/Patient identifier/)).toHaveValue("GHMS-01042");
    await user.selectOptions(screen.getByLabelText(/Test/), "Complete blood count");
    await user.selectOptions(screen.getByLabelText(/Result type/), "numeric");
    await user.type(screen.getByLabelText(/Result value/), "not numeric");
    await user.type(screen.getByLabelText("Unit"), "10^9/L");
    await user.type(screen.getByLabelText("Reference interval"), "4.0-11.0");
    await user.click(screen.getByRole("button", { name: "Save result draft" }));
    expect(screen.getByRole("status")).toHaveTextContent("valid numeric result");

    await user.clear(screen.getByLabelText(/Result value/));
    await user.type(screen.getByLabelText(/Result value/), "5.2");
    await user.click(screen.getByRole("button", { name: "Save result draft" }));
    expect(screen.getByRole("status")).toHaveTextContent("saved as a draft");

    const resultRow = screen.getAllByRole("row").find((row) => row.textContent?.includes("5.2"));
    expect(resultRow).toBeDefined();
    await user.click(within(resultRow as HTMLElement).getByRole("button", { name: "Submit for approval" }));
    expect(screen.getByRole("status")).toHaveTextContent("Server-side authorization is required");
    const submittedResultRow = screen.getAllByRole("row").find((row) => row.textContent?.includes("5.2"));
    expect(within(submittedResultRow as HTMLElement).getByRole("button", { name: "Approve / release" })).toBeDisabled();
  });

  it("creates radiology requests and report drafts with explicit review status", async () => {
    const user = userEvent.setup();
    render(<DiagnosticServicesScreen title="Radiology" initialSection="radiology" />);

    await user.type(screen.getByLabelText(/Patient identifier/), "GHMS-01047");
    await user.selectOptions(screen.getByLabelText(/Modality/), "MRI");
    await user.type(screen.getByLabelText(/Procedure/), "Knee MRI");
    await user.type(screen.getByLabelText(/Doctor/), "Dr. Demo");
    await user.type(screen.getByLabelText(/Department/), "Orthopedics");
    fireEvent.change(screen.getByLabelText(/Scheduled date and time/), { target: { value: "2026-07-08T10:30" } });
    await user.type(screen.getByLabelText(/Clinical indication/), "Synthetic demo request");
    await user.click(screen.getByRole("button", { name: "Create demo request" }));
    expect(screen.getByRole("status")).toHaveTextContent("added to this demonstration session");
    expect(screen.getByRole("table", { name: "Radiology requests" })).toHaveTextContent("Knee MRI");

    await user.click(screen.getByRole("tab", { name: "Imaging reports" }));
    await user.type(screen.getByLabelText(/Patient identifier/), "GHMS-01047");
    await user.type(screen.getByLabelText(/Imaging procedure/), "Knee MRI");
    fireEvent.change(screen.getByLabelText(/Examination date/), { target: { value: "2026-07-08" } });
    await user.type(screen.getByLabelText(/Radiologist/), "Dr. Demo Radiologist");
    await user.type(screen.getByLabelText(/Clinical indication/), "Synthetic indication");
    await user.type(screen.getByLabelText(/Findings/), "Synthetic findings");
    await user.type(screen.getByLabelText(/Impression/), "Synthetic impression");
    await user.click(screen.getByRole("button", { name: "Save report draft" }));
    expect(screen.getByRole("status")).toHaveTextContent("saved as a draft");
    expect(screen.getByRole("table", { name: "Imaging reports" })).toHaveTextContent("Synthetic impression");
  });

  it("keeps attachments restricted by role and requires a backend permission check", async () => {
    window.localStorage.setItem("ghms-user", JSON.stringify({ role: "Patient" }));
    render(<DiagnosticServicesScreen title="Imaging attachments" initialSection="attachments" />);

    expect(await screen.findByText("This role cannot view restricted imaging previews.")).toBeInTheDocument();
    expect(screen.queryByText("Chest radiograph preview")).not.toBeInTheDocument();
    expect(screen.getByText(/Production access must be enforced by the backend/)).toBeInTheDocument();
  });

  it("screens donations before adding eligible units and issues only matching screened inventory", async () => {
    const user = userEvent.setup();
    render(<DiagnosticServicesScreen title="Blood Bank" initialSection="blood-bank" />);

    await user.click(screen.getByRole("button", { name: "Pass screening" }));
    expect(screen.getByRole("status")).toHaveTextContent("screening passed");
    expect(screen.getByRole("table", { name: "Blood bank inventory" })).toHaveTextContent("Whole blood");

    const requestRow = screen.getAllByRole("row").find((row) => row.textContent?.includes("BR-4101"));
    expect(requestRow).toBeDefined();
    await user.click(within(requestRow as HTMLElement).getByRole("button", { name: "Issue demo units" }));
    expect(screen.getByRole("status")).toHaveTextContent("issued in demonstration data only");
    const issuedRequestRow = screen.getAllByRole("row").find((row) => row.textContent?.includes("BR-4101"));
    expect(issuedRequestRow).toHaveTextContent("Issued (Demo)");
    expect(screen.getByRole("table", { name: "Blood bank inventory" })).toHaveTextContent("10");
  });

  it("prints a clearly labeled synthetic laboratory report preview", async () => {
    const user = userEvent.setup();
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    render(<DiagnosticServicesScreen title="Laboratory Results" initialSection="results" />);

    await user.click(screen.getByRole("button", { name: "Preview report" }));
    expect(screen.getByText("Laboratory Report — DEMONSTRATION ONLY")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Print report" }));
    expect(print).toHaveBeenCalledOnce();
    print.mockRestore();
  });
});
