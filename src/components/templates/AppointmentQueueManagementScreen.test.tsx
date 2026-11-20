import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import { AppointmentQueueManagementScreen } from "./AppointmentQueueManagementScreen";
import { appointmentSchema } from "@/validation/schemas";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: ComponentProps<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/services/backend-services", () => ({
  appointmentBackendApi: {
    list: vi.fn().mockResolvedValue([]),
    listQueue: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue(null),
    updateStatus: vi.fn().mockResolvedValue(null),
    callNextPatient: vi.fn().mockResolvedValue(null),
    updateQueueStatus: vi.fn().mockResolvedValue(null),
    transferQueuePatient: vi.fn().mockResolvedValue(null),
  },
}));

describe("appointmentSchema", () => {
  const validAppointment = {
    patientId: "GHMS-01042",
    doctor: "Dr. Selam Girma",
    department: "Internal Medicine",
    date: "2026-11-12",
    time: "09:00",
    type: "consultation",
    reason: "Follow-up consultation",
    notes: "",
  };

  it("accepts a complete appointment and rejects missing booking details", () => {
    expect(appointmentSchema.safeParse(validAppointment).success).toBe(true);
    const result = appointmentSchema.safeParse({
      ...validAppointment,
      patientId: "",
      date: "2026-02-31",
      time: "25:90",
      reason: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path[0])).toEqual(
        expect.arrayContaining(["patientId", "date", "time", "reason"]),
      );
    }
  });
});

describe("AppointmentQueueManagementScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an appointment from a selected patient and shows validation errors", async () => {
    const user = userEvent.setup();
    render(<AppointmentQueueManagementScreen title="Appointments" />);

    await user.click(screen.getByRole("button", { name: "Create appointment" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/patient/i);

    await user.type(screen.getByLabelText(/Patient search/), "Selam");
    await user.click(screen.getByRole("button", { name: /Selam Bekele.*GHMS-01042/ }));
    await user.selectOptions(screen.getByLabelText(/Department/), "Internal Medicine");
    await user.selectOptions(screen.getByLabelText(/Doctor/), "Dr. Selam Girma");
    await user.selectOptions(screen.getByLabelText(/Available time slot/), "09:30");
    await user.type(screen.getByLabelText(/Reason for appointment/), "Routine review");
    await user.click(screen.getByRole("button", { name: "Create appointment" }));

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.getAllByText("Selam Bekele").length).toBeGreaterThan(1);
    });
    expect(screen.getByText(/APT-\d{6}/)).toBeInTheDocument();
    expect(screen.getAllByText("Scheduled").length).toBeGreaterThan(0);
  });

  it("supports calendar views, appointment status updates, and appointment details", async () => {
    const user = userEvent.setup();
    render(<AppointmentQueueManagementScreen title="Appointments" />);

    await user.click(screen.getByRole("button", { name: "Calendar weekly" }));
    expect(screen.getByText(/Week of/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Calendar monthly" }));
    expect(screen.getByText(new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" }))).toBeInTheDocument();

    const appointmentRow = screen.getByText(/APT-1044/).closest("tr");
    expect(appointmentRow).not.toBeNull();
    const row = within(appointmentRow as HTMLTableRowElement);
    await user.selectOptions(row.getByLabelText("Update status for APT-1044"), "Confirmed");
    expect(row.getByLabelText("Update status for APT-1044")).toHaveValue("Confirmed");
    await user.click(row.getByRole("button", { name: "View" }));
    expect(screen.getByRole("dialog", { name: "Appointment details" })).toHaveTextContent("Meron Ayele");
  });

  it("supports every appointment status and reschedules an existing appointment", async () => {
    const user = userEvent.setup();
    render(<AppointmentQueueManagementScreen title="Appointments" />);
    const appointmentRow = screen.getByText(/APT-1044/).closest("tr");
    expect(appointmentRow).not.toBeNull();
    const row = within(appointmentRow as HTMLTableRowElement);
    const statusControl = row.getByLabelText("Update status for APT-1044");
    const statuses = ["Scheduled", "Confirmed", "Checked In", "Completed", "Cancelled", "No Show"];

    for (const status of statuses) {
      await user.selectOptions(statusControl, status);
      expect(statusControl).toHaveValue(status);
    }

    await user.click(row.getByRole("button", { name: "Edit / reschedule" }));
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + 2);
    const dateValue = [
      newDate.getFullYear(),
      String(newDate.getMonth() + 1).padStart(2, "0"),
      String(newDate.getDate()).padStart(2, "0"),
    ].join("-");
    fireEvent.change(screen.getByLabelText(/Appointment date/), { target: { value: dateValue } });
    await user.selectOptions(screen.getByLabelText(/Available time slot/), "13:30");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      const updatedRow = screen.getByText(/APT-1044/).closest("tr");
      expect(updatedRow).not.toBeNull();
      expect(within(updatedRow as HTMLTableRowElement).getByText("13:30")).toBeInTheDocument();
      expect(updatedRow?.textContent).toContain(
        new Date(`${dateValue}T00:00:00`).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      );
    });
  });

  it("calls the next queue patient and transfers a patient to the selected department", async () => {
    const user = userEvent.setup();
    render(<AppointmentQueueManagementScreen title="Queue Management" view="queue" />);

    const queueRow = screen.getByText("GHMS-000627").closest("tr");
    expect(queueRow).not.toBeNull();
    const row = within(queueRow as HTMLTableRowElement);
    await user.click(screen.getByRole("button", { name: "Call next patient" }));
    expect(row.getByLabelText("Update queue status 27")).toHaveValue("Consulting");

    await user.selectOptions(row.getByLabelText("Transfer queue 27"), "Surgery");
    await user.click(row.getByRole("button", { name: "Transfer" }));
    expect(row.getByLabelText("Update queue status 27")).toHaveValue("Transferred");
    expect(row.getByLabelText("Transfer queue 27")).toHaveValue("Surgery");
    await user.selectOptions(row.getByLabelText("Update queue status 27"), "Absent");
    expect(row.getByLabelText("Update queue status 27")).toHaveValue("Absent");
    await user.selectOptions(row.getByLabelText("Update queue status 27"), "Completed");
    expect(row.getByLabelText("Update queue status 27")).toHaveValue("Completed");
  });

  it("keeps personal identifiers off the public waiting-room display", () => {
    render(<AppointmentQueueManagementScreen title="Waiting Room Display" view="waiting-room" />);
    const content = screen.getByRole("region", { name: "Public waiting room display" }).textContent ?? "";

    expect(content).toContain("Now serving");
    expect(content).toContain("Waiting numbers");
    expect(content).not.toContain("Abebe Tekle");
    expect(content).not.toContain("GHMS-000627");
  });
});
