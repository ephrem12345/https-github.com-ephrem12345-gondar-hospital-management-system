import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PharmacyManagementScreen } from "./PharmacyManagementScreen";
import { HospitalResourcesScreen } from "./HospitalResourcesScreen";

describe("PharmacyManagementScreen", () => {
  it("shows pharmacy stock indicators and adds a medicine to the synthetic catalog", async () => {
    const user = userEvent.setup();
    render(<PharmacyManagementScreen title="Medicines" initialSection="dashboard" />);

    expect(await screen.findByText("Total medicines")).toBeInTheDocument();
    expect(screen.getByText("Expired medicines")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Medicines" }));
    await user.type(screen.getByLabelText(/Generic name/), "Ibuprofen");
    await user.type(screen.getByLabelText(/Brand name/), "Demo brand");
    await user.type(screen.getByLabelText(/Category/), "Analgesic");
    await user.type(screen.getByLabelText(/Strength/), "200 mg");
    await user.type(screen.getByLabelText(/Dosage form/), "Tablet");
    await user.type(screen.getByLabelText(/Manufacturer/), "Demo manufacturer");
    await user.type(screen.getByLabelText(/Unit/), "tablet");
    await user.type(screen.getByLabelText(/Price/), "3.5");
    await user.type(screen.getByLabelText(/Reorder level/), "20");
    await user.click(screen.getByRole("button", { name: "Add demo medicine" }));

    expect(screen.getByRole("status")).toHaveTextContent("Medicine added");
    expect(screen.getByRole("table", { name: "Medicine catalog" })).toHaveTextContent("Ibuprofen");
  });

  it("verifies the patient and batch, supports partial dispensing, and produces a receipt", async () => {
    const user = userEvent.setup();
    render(<PharmacyManagementScreen title="Dispensing" initialSection="dispensing" />);

    const selects = screen.getAllByRole("combobox");
    await user.selectOptions(selects[0], "RX-8101");
    await user.type(screen.getByLabelText(/Verify patient identifier/), "WRONG-ID");
    await user.selectOptions(selects[1], "BAT-1001");
    await user.type(screen.getByLabelText(/Quantity to dispense/), "3");
    await user.click(screen.getByLabelText(/Confirm dispensing/));
    await user.click(screen.getByRole("button", { name: "Confirm demo dispensing" }));
    expect(screen.getByRole("status")).toHaveTextContent("matching patient verification");

    await user.clear(screen.getByLabelText(/Verify patient identifier/));
    await user.type(screen.getByLabelText(/Verify patient identifier/), "GHMS-01042");
    await user.click(screen.getByRole("button", { name: "Confirm demo dispensing" }));
    expect(screen.getByRole("status")).toHaveTextContent("Receipt");
    expect(screen.getByRole("table", { name: "Dispensing activities" })).toHaveTextContent("Paracetamol");
    expect(screen.getByRole("table", { name: "Dispensing activities" })).toHaveTextContent("RCPT-");

    await user.click(screen.getByRole("tab", { name: "Prescriptions" }));
    const prescriptionRow = screen.getAllByRole("row").find((row) => row.textContent?.includes("RX-8101"));
    expect(prescriptionRow).toHaveTextContent("Partial");
  });

  it("moves purchase requests through orders, receiving, and invoicing", async () => {
    const user = userEvent.setup();
    render(<PharmacyManagementScreen title="Procurement" initialSection="procurement" />);

    await user.selectOptions(screen.getAllByRole("combobox")[0], "SUP-010");
    await user.selectOptions(screen.getAllByRole("combobox")[1], "MED-001");
    await user.type(screen.getByLabelText(/Quantity/), "25");
    await user.click(screen.getByRole("button", { name: "Create request" }));
    expect(screen.getByRole("status")).toHaveTextContent("Purchase request created");

    await user.click(screen.getByRole("button", { name: "Create purchase order" }));
    await user.click(screen.getAllByRole("button", { name: "Record goods received" })[0]);
    await user.click(screen.getByRole("button", { name: "Record supplier invoice" }));
    expect(screen.getByRole("table", { name: "Purchase orders" })).toHaveTextContent("Invoiced");

    await user.click(screen.getByRole("tab", { name: "Batch management" }));
    expect(screen.getByRole("table", { name: "Medicine batches" })).toHaveTextContent("RCV-");
  });
});

describe("HospitalResourcesScreen", () => {
  it("transfers a patient to an available bed and updates the admission record", async () => {
    const user = userEvent.setup();
    render(<HospitalResourcesScreen title="Beds" initialSection="beds" />);

    await user.click(screen.getAllByRole("button", { name: "Transfer" })[0]);
    expect(screen.getByRole("status")).toHaveTextContent("transferred from MED-01 to MED-02");
    await user.click(screen.getByRole("tab", { name: "Admissions" }));
    const admissionRow = screen.getAllByRole("row").find((row) => row.textContent?.includes("ADM-6001"));
    expect(admissionRow).toHaveTextContent("MED-02");
  });

  it("registers an admission and leaves discharge authorization server-controlled", async () => {
    const user = userEvent.setup();
    render(<HospitalResourcesScreen title="Admissions" initialSection="admissions" />);

    await user.type(screen.getByLabelText(/Patient identifier/), "GHMS-01099");
    await user.type(screen.getByLabelText(/Patient name/), "Synthetic admission");
    await user.type(screen.getByLabelText(/Doctor/), "Dr. Demo");
    await user.selectOptions(screen.getByLabelText(/Ward/), "WARD-MED");
    await user.type(screen.getByLabelText(/Admission reason/), "Synthetic observation");
    fireEvent.change(screen.getByLabelText(/Admission date/), { target: { value: "2026-07-12T10:00" } });
    await user.click(screen.getByRole("button", { name: "Register demo admission" }));
    expect(screen.getByRole("status")).toHaveTextContent("registered in demo data");
    expect(screen.getByRole("table", { name: "Admissions" })).toHaveTextContent("GHMS-01099");

    await user.click(screen.getByRole("tab", { name: "Discharges" }));
    expect(screen.getAllByRole("button", { name: "Authorize discharge" })[0]).toBeDisabled();
    expect(screen.getByText(/Discharge authorization is a backend decision/)).toBeInTheDocument();
  });

  it("schedules operating rooms and dispatches ambulances with trip history", async () => {
    const user = userEvent.setup();
    render(<HospitalResourcesScreen title="Operating Rooms" initialSection="operating-rooms" />);

    await user.selectOptions(screen.getAllByRole("combobox")[0], "OR-1");
    await user.type(screen.getByLabelText(/Patient identifier/), "GHMS-01055");
    await user.type(screen.getByLabelText(/Procedure/), "Synthetic procedure");
    fireEvent.change(screen.getByLabelText(/Date and time/), { target: { value: "2026-07-14T09:00" } });
    await user.type(screen.getByLabelText(/Surgical team/), "Demo team");
    await user.click(screen.getByRole("button", { name: "Schedule demo procedure" }));
    expect(screen.getByRole("status")).toHaveTextContent("scheduled in demo data");

    await user.click(screen.getByRole("tab", { name: "Ambulance" }));
    await user.selectOptions(screen.getByLabelText(/Available ambulance/), "AMB-01");
    await user.type(screen.getByLabelText(/Patient identifier/), "GHMS-01055");
    await user.type(screen.getByLabelText(/Destination/), "Demo facility");
    await user.click(screen.getByRole("button", { name: "Dispatch request" }));
    expect(screen.getByRole("table", { name: "Ambulance trips" })).toHaveTextContent("Demo facility");
    const trip = screen.getAllByRole("row").find((row) => row.textContent?.includes("Demo facility"));
    await user.click(within(trip as HTMLElement).getByRole("button", { name: "Complete trip" }));
    expect(screen.getByRole("status")).toHaveTextContent("marked completed");
  });

  it("checks inventory issues and follows equipment maintenance through completion", async () => {
    const user = userEvent.setup();
    render(<HospitalResourcesScreen title="Inventory" initialSection="general-inventory" />);

    await user.selectOptions(screen.getByLabelText(/Inventory item/), "INV-001");
    await user.selectOptions(screen.getByLabelText(/Movement/), "Issue");
    await user.type(screen.getByLabelText(/Quantity/), "5");
    await user.type(screen.getByLabelText(/Source \/ destination/), "Medical Ward");
    await user.click(screen.getByRole("button", { name: "Record stock movement" }));
    expect(screen.getByRole("table", { name: "General inventory" })).toHaveTextContent("235");

    await user.click(screen.getByRole("tab", { name: "Assets" }));
    await user.type(screen.getByLabelText(/Asset name/), "Demo monitor");
    await user.type(screen.getByLabelText(/Category/), "Clinical equipment");
    await user.type(screen.getByLabelText(/Serial number/), "TEST-001");
    await user.type(screen.getByLabelText(/Assigned department/), "ICU");
    await user.type(screen.getByLabelText(/Location/), "ICU Bay 3");
    await user.click(screen.getByRole("button", { name: "Register demo asset" }));
    expect(screen.getByRole("table", { name: "Hospital assets" })).toHaveTextContent("Demo monitor");

    await user.click(screen.getByRole("tab", { name: "Maintenance" }));
    await user.selectOptions(screen.getByLabelText(/Asset/), screen.getAllByRole("option").find((option) => option.textContent?.includes("Demo monitor"))?.getAttribute("value") ?? "");
    await user.type(screen.getByLabelText(/Description/), "Synthetic repair");
    await user.selectOptions(screen.getByLabelText(/Priority/), "Urgent");
    await user.click(screen.getByRole("button", { name: "Create request" }));
    expect(screen.getByRole("table", { name: "Maintenance requests" })).toHaveTextContent("Synthetic repair");
  });
});
