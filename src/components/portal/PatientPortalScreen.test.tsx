import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PatientPortalLayout } from "./PatientPortalLayout";
import { PatientPortalScreen } from "./PatientPortalScreen";

vi.mock("next/navigation", () => ({
  usePathname: () => "/patient-portal",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

describe("patient portal", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubEnv("NEXT_PUBLIC_API_MODE", "demo");
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllEnvs();
    cleanup();
  });

  it("keeps a separate patient navigation and shows the dashboard", async () => {
    localStorage.setItem(
      "ghms-user",
      JSON.stringify({ id: "patient-1", name: "Aster Mekonnen", role: "PATIENT", email: "patient@example.test" }),
    );

    render(
      <PatientPortalLayout>
        <PatientPortalScreen section="overview" />
      </PatientPortalLayout>,
    );

    expect(screen.getByRole("navigation", { name: "Patient portal" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
    expect(await screen.findByRole("heading", { name: /Welcome, Aster Mekonnen/ })).toBeInTheDocument();
    expect(screen.getByText(/all displayed data is synthetic/i)).toBeInTheDocument();
  });

  it("updates only permitted contact details", async () => {
    const user = userEvent.setup();
    render(<PatientPortalScreen section="profile" />);

    const phone = await screen.findByLabelText("Phone");
    await user.clear(phone);
    await user.type(phone, "+251 900 123 456");
    await user.click(screen.getByRole("button", { name: "Save contact information" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Contact information saved");
    expect(phone).toHaveValue("+251 900 123 456");
    expect(screen.getByLabelText("Patient number")).toHaveAttribute("readonly");
  });

  it("creates appointment requests and submits cancellation requests", async () => {
    const user = userEvent.setup();
    render(<PatientPortalScreen section="appointments" />);

    await screen.findByRole("table");
    await user.selectOptions(screen.getByLabelText("Department *"), "Pediatrics");
    fireEvent.change(screen.getByLabelText("Preferred date *"), { target: { value: "2026-12-01" } });
    await user.type(screen.getByLabelText("Reason for appointment *"), "Synthetic follow-up");
    await user.click(screen.getByRole("button", { name: "Submit appointment request" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Appointment request saved");

    const table = screen.getByRole("table");
    await waitFor(() => expect(within(table).getByText("Synthetic follow-up")).toBeInTheDocument());
    expect(within(table).getByText("Requested")).toBeInTheDocument();
    const cancellationButtons = within(table).getAllByRole("button", { name: "Request cancellation" });
    await user.click(cancellationButtons.find((button) => !button.hasAttribute("disabled"))!);
    expect(await screen.findByRole("status")).toHaveTextContent("Cancellation request submitted");
    await waitFor(() => expect(within(table).getByText("Cancellation requested")).toBeInTheDocument());
  });

  it("filters notification categories without losing items and marks them read", async () => {
    const user = userEvent.setup();
    render(<PatientPortalScreen section="notifications" />);

    await screen.findByText("Appointment reminder");
    await user.selectOptions(screen.getByRole("combobox", { name: "Notification category" }), "Results");
    expect(screen.getByText("Result available")).toBeInTheDocument();
    expect(screen.queryByText("Appointment reminder")).not.toBeInTheDocument();
    await user.selectOptions(screen.getByRole("combobox", { name: "Notification category" }), "");
    expect(screen.getByText("Appointment reminder")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Mark all as read" }));
    expect(await screen.findByRole("status")).toHaveTextContent("All notifications marked as read");
    await waitFor(() => expect(screen.queryByText("Unread")).not.toBeInTheDocument());
  });

  it("shows patient-authorized records and allows support requests", async () => {
    const user = userEvent.setup();
    render(<PatientPortalScreen section="records" />);

    expect(screen.getByText(/Restricted internal clinical notes are not included/)).toBeInTheDocument();
    expect((await screen.findAllByRole("link", { name: "Download demo document" }))[0]).toHaveAttribute("download", "demo-visit-summary.txt");

    cleanup();
    render(<PatientPortalScreen section="support" />);
    await screen.findByRole("button", { name: "Submit request" });
    await user.type(screen.getByLabelText("Subject *"), "Portal feedback");
    await user.type(screen.getByLabelText("Message *"), "Synthetic support request");
    await user.click(screen.getByRole("button", { name: "Submit request" }));
    expect(await screen.findByRole("status")).toHaveTextContent("recorded in demonstration data");
    expect(screen.getByText("Portal feedback: Synthetic support request")).toBeInTheDocument();
  });
});

