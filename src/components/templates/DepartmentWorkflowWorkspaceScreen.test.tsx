import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DepartmentWorkflowWorkspaceScreen } from "./DepartmentWorkflowWorkspaceScreen";
import type { DepartmentId } from "@/services/department-workflows";

const departmentCases: Array<[DepartmentId, string, string]> = [
  ["emergency", "Emergency Department", "Emergency registration"],
  ["internal-medicine", "Internal Medicine", "Chronic disease follow-up"],
  ["surgery", "Surgery", "Operation notes"],
  ["pediatrics", "Pediatrics", "Growth & immunization"],
  ["gynecology-obstetrics", "Gynecology & Obstetrics", "Labor monitoring"],
  ["orthopedics", "Orthopedics", "Imaging review"],
  ["dentistry", "Dentistry", "Interactive tooth chart"],
  ["ophthalmology", "Ophthalmology", "Eye examination"],
  ["dermatology", "Dermatology", "Restricted image preview"],
  ["psychiatry", "Psychiatry & Mental Health", "Confidential patient list"],
  ["icu", "Intensive Care Unit", "Patient monitoring"],
  ["physiotherapy", "Physiotherapy", "Therapy sessions"],
];

describe("department workflow workspaces", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it.each(departmentCases)("renders %s with its dedicated workflow navigation", async (departmentId, title, tab) => {
    window.localStorage.setItem("ghms-user", JSON.stringify({ name: "Dr. Example", role: departmentId === "psychiatry" ? "Psychiatrist" : "Physician" }));
    render(<DepartmentWorkflowWorkspaceScreen departmentId={departmentId} />);

    expect(await screen.findByRole("heading", { name: title })).toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: `${title} workflows` })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: tab })).toBeInTheDocument();
    expect(screen.getByText(/Synthetic demonstration data only/)).toBeInTheDocument();
  });

  it("masks emergency patient identifiers and updates triage and queue status", async () => {
    const user = userEvent.setup();
    render(<DepartmentWorkflowWorkspaceScreen departmentId="emergency" />);

    expect(await screen.findByText("GHMS-•••42")).toBeInTheDocument();
    expect(screen.queryByText("GHMS-01042")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Patient triage" }));
    await user.selectOptions(screen.getByLabelText("Emergency case"), "ER-2026-042");
    await user.selectOptions(screen.getByLabelText("Triage category"), "Yellow");
    await user.selectOptions(screen.getByLabelText("Assigned doctor"), "Dr. Hana Bekele");
    await user.type(screen.getByLabelText("Triage assessment"), "Stable for urgent review");
    await user.type(screen.getByLabelText("Initial vital signs"), "BP 120/80");
    await user.click(screen.getByRole("button", { name: "Save triage" }));
    expect(screen.getByRole("status")).toHaveTextContent("Triage assessment saved");
    expect(screen.getAllByLabelText("Triage category Yellow").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("tab", { name: "Emergency queue" }));
    await user.selectOptions(screen.getByLabelText("Update status ER-2026-042"), "In treatment");
    expect(withinTableRow(screen, "ER-2026-042")).toHaveTextContent("In treatment");
  });

  it("keeps psychiatry records hidden unless the role is authorized", async () => {
    window.localStorage.setItem("ghms-user", JSON.stringify({ name: "Example patient", role: "Patient" }));
    render(<DepartmentWorkflowWorkspaceScreen departmentId="psychiatry" />);

    expect(await screen.findByText(/Confidential mental health records are restricted/)).toBeInTheDocument();
    expect(screen.queryByText("Confidential record • 011")).not.toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("allows explicit restricted dermatology preview only to an authorized role", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem("ghms-user", JSON.stringify({ name: "Example patient", role: "Patient" }));
    render(<DepartmentWorkflowWorkspaceScreen departmentId="dermatology" />);

    await user.click(screen.getByRole("tab", { name: "Restricted image preview" }));
    expect(await screen.findByText(/Restricted dermatology images are not available/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Show synthetic preview" })).not.toBeInTheDocument();
  });

  it("supports selecting and marking teeth on the interactive dental chart", async () => {
    const user = userEvent.setup();
    render(<DepartmentWorkflowWorkspaceScreen departmentId="dentistry" />);

    await user.click(screen.getByRole("tab", { name: "Interactive tooth chart" }));
    await user.click(screen.getByRole("button", { name: "Tooth 11" }));
    expect(screen.getByText("Selected teeth: 11")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Mark selected teeth for examination" }));
    expect(screen.getByRole("status")).toHaveTextContent("Marked for examination: 11");
    expect(screen.getByRole("button", { name: "Tooth 11 marked" })).toHaveAttribute("aria-pressed", "false");
  });
});

function withinTableRow(container: typeof screen, text: string) {
  const row = container.getByText(text).closest("tr");
  expect(row).not.toBeNull();
  return row as HTMLTableRowElement;
}
