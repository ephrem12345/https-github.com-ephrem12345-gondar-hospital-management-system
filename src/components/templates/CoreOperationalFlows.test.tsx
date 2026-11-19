import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AnalyticsTemplate } from "./AnalyticsTemplate";
import { BoardTemplate } from "./BoardTemplate";
import { FormTemplate } from "./FormTemplate";
import { GenericListScreen, PatientManagementScreen } from "./PatientManagementScreen";
import { PatientRegistrationScreen } from "./PatientRegistrationScreen";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import { diagnosticsScreens } from "@/modules/diagnostics";
import { financeScreens } from "@/modules/finance";
import { hrScreens } from "@/modules/hr";
import { managementScreens } from "@/modules/management";
import { pharmacyScreens } from "@/modules/pharmacy";
import type { BoardScreen, ListScreen, ModuleScreen, AnalyticsScreen, FormScreen } from "@/modules/types";

function listScreen(entry: ModuleScreen): ListScreen {
  if (entry.kind !== "list") throw new Error("Expected a list screen configuration.");
  return entry.screen;
}

function boardScreen(entry: ModuleScreen): BoardScreen {
  if (entry.kind !== "board") throw new Error("Expected a board screen configuration.");
  return entry.screen;
}

function analyticsScreen(entry: ModuleScreen): AnalyticsScreen {
  if (entry.kind !== "analytics") throw new Error("Expected an analytics screen configuration.");
  return entry.screen;
}

function formScreen(entry: ModuleScreen): FormScreen {
  if (entry.kind !== "form") throw new Error("Expected a form screen configuration.");
  return entry.screen;
}

describe("GHMS core operational workflows", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("confirms a patient registration in preview mode", async () => {
    const user = userEvent.setup();
    render(<PatientRegistrationScreen title="Patient Registration" />);

    await user.type(screen.getByLabelText("First name"), "Aster");
    await user.type(screen.getByLabelText("Last name"), "Mekonnen");
    await user.selectOptions(screen.getByLabelText("Gender"), "female");
    await user.type(screen.getByLabelText("Date of birth"), "1994-05-10");
    const patientPhone = screen.getByLabelText("Phone number", { selector: 'input[name="phone"]' });
    expect(patientPhone).toHaveAttribute("name", "phone");
    await user.type(patientPhone, "0911000111");
    await user.selectOptions(screen.getByLabelText("Registering department"), "Internal Medicine");
    expect(screen.getByLabelText("Date of birth")).toHaveValue("1994-05-10");
    expect(patientPhone).toHaveValue("0911000111");
    await user.click(screen.getByRole("button", { name: "Save patient" }));
    await user.click(await screen.findByRole("button", { name: "Confirm registration" }));

    expect(await screen.findByRole("heading", { name: "Patient registered" })).toBeInTheDocument();
    expect(screen.getByText(/frontend preview only; no patient data is persisted/)).toBeInTheDocument();
  });

  it("searches patients and saves editable demographic changes locally", async () => {
    const user = userEvent.setup();
    render(
      <I18nProvider>
        <PatientManagementScreen title="Patient Management" screen={{ description: "", columns: [], data: [], keyExtractor: () => "" }} />
      </I18nProvider>,
    );

    await user.type(screen.getByRole("textbox", { name: "Search patient records" }), "Almaz");
    const table = screen.getByRole("table");
    expect(within(table).getByText("Almaz Tadesse")).toBeInTheDocument();
    expect(within(table).queryByText("Getachew Molla")).not.toBeInTheDocument();

    await user.click(within(table).getByRole("button", { name: "Edit" }));
    const nameField = screen.getByRole("textbox", { name: "Full name" });
    await user.clear(nameField);
    await user.type(nameField, "Almaz Tadesse Updated");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(screen.getByRole("status")).toHaveTextContent("Patient details updated");
    expect(within(table).getByText("Almaz Tadesse Updated")).toBeInTheDocument();
  });

  it("searches pharmacy inventory and displays prescription workflow stages", async () => {
    const user = userEvent.setup();
    render(<GenericListScreen title="Medicines" screen={listScreen(pharmacyScreens["/medicines"])} />);

    await user.type(screen.getByRole("textbox", { name: /Search medicine/ }), "Paracetamol");
    const table = screen.getByRole("table");
    expect(within(table).getByText("Paracetamol")).toBeInTheDocument();
    expect(within(table).queryByText("Amoxicillin")).not.toBeInTheDocument();

    cleanup();
    render(<BoardTemplate title="Prescriptions" screen={boardScreen(pharmacyScreens["/prescriptions"])} />);
    expect(screen.getByRole("heading", { name: "Received" })).toBeInTheDocument();
    expect(screen.getByText(/RX-7718/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ready" })).toBeInTheDocument();
  });

  it("filters laboratory orders and searches validated results", async () => {
    const user = userEvent.setup();
    render(<GenericListScreen title="Laboratory Orders" screen={listScreen(diagnosticsScreens["/laboratory-orders"])} />);

    await user.type(screen.getByRole("textbox", { name: /Search order/ }), "LAB-2342");
    expect(screen.getByText("Yohannes Kebede")).toBeInTheDocument();
    expect(screen.queryByText("Sara Alemu")).not.toBeInTheDocument();

    cleanup();
    render(<GenericListScreen title="Laboratory Results" screen={listScreen(diagnosticsScreens["/laboratory-results"])} />);
    await user.type(screen.getByRole("textbox", { name: /Search order/ }), "Hemoglobin");
    expect(screen.getAllByText(/13\.2 g\/dL/).length).toBeGreaterThan(0);
  });

  it("searches invoices and payment receipts", async () => {
    const user = userEvent.setup();
    render(<GenericListScreen title="Billing" screen={listScreen(financeScreens["/billing"])} />);

    await user.type(screen.getByRole("textbox", { name: /Search invoice/ }), "INV-2026-0913");
    expect(screen.getByText("Getachew Molla")).toBeInTheDocument();
    expect(screen.queryByText("Almaz Tadesse")).not.toBeInTheDocument();

    cleanup();
    render(<GenericListScreen title="Payments" screen={listScreen(financeScreens["/payments"])} />);
    await user.type(screen.getByRole("textbox", { name: /Search receipt/ }), "RCP-55132");
    expect(screen.getByText("RCP-55132")).toBeInTheDocument();
  });

  it("submits a validated refund request and exposes insurance and ledger lists", async () => {
    const user = userEvent.setup();
    render(<FormTemplate title="Request Refund" screen={formScreen(financeScreens["/refunds/request"])} />);

    await user.click(screen.getByRole("button", { name: "Submit refund request" }));
    expect(await screen.findAllByRole("alert")).toHaveLength(4);

    await user.type(screen.getByLabelText("Invoice number"), "INV-2026-0913");
    await user.type(screen.getByLabelText("Patient name"), "Synthetic patient");
    await user.type(screen.getByLabelText("Requested amount (ETB)"), "120");
    await user.type(screen.getByLabelText("Reason"), "Duplicate demonstration charge");
    await user.click(screen.getByRole("button", { name: "Submit refund request" }));
    const submitButtons = screen.getAllByRole("button", { name: "Submit refund request" });
    await user.click(submitButtons[submitButtons.length - 1]);
    expect(await screen.findByRole("heading", { name: "Refund request submitted" })).toBeInTheDocument();

    cleanup();
    render(<GenericListScreen title="Insurance Providers" screen={listScreen(financeScreens["/insurance/providers"])} />);
    expect(screen.getByRole("table")).toHaveTextContent("Nyala Insurance");

    cleanup();
    render(<GenericListScreen title="Patient Insurance" screen={listScreen(financeScreens["/insurance/policies"])} />);
    expect(screen.getByRole("table")).toHaveTextContent("NYL-88231");

    cleanup();
    render(<GenericListScreen title="Ledger Accounts" screen={listScreen(financeScreens["/accounts"])} />);
    expect(screen.getByRole("table")).toHaveTextContent("Patient service income");

    cleanup();
    render(<GenericListScreen title="Financial Periods" screen={listScreen(financeScreens["/financial-periods"])} />);
    expect(screen.getByRole("table")).toHaveTextContent("November 2026");
  });

  it("filters staff by department and searches reports and dashboard statistics", async () => {
    const user = userEvent.setup();
    render(<GenericListScreen title="Employees" screen={listScreen(hrScreens["/employees"])} />);

    await user.selectOptions(screen.getByRole("combobox", { name: "Category" }), "Other");
    const staffTable = screen.getByRole("table");
    expect(within(staffTable).getByText("Ato Getu Assefa")).toBeInTheDocument();
    expect(within(staffTable).queryByText("Dr. Selam Girma")).not.toBeInTheDocument();

    cleanup();
    render(<GenericListScreen title="Reports" screen={listScreen(managementScreens["/reports"])} />);
    await user.type(screen.getByRole("textbox", { name: /Search report/ }), "Monthly revenue statement");
    expect(screen.getByText("Monthly revenue statement")).toBeInTheDocument();
    expect(screen.queryByText("Bed occupancy report")).not.toBeInTheDocument();

    cleanup();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockImplementation(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
    });
    render(<ThemeProvider><AnalyticsTemplate title="Analytics" screen={analyticsScreen(managementScreens["/analytics"])} /></ThemeProvider>);
    expect(screen.getByText("87%")).toBeInTheDocument();
    expect(screen.getByText("Patient satisfaction")).toBeInTheDocument();
  });
});
