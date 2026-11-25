import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthGate } from "./AuthGate";
import { authService } from "@/services";

const replaceMock = vi.fn();
let currentPathname = "/overview";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
    push: vi.fn(),
  }),
  usePathname: () => currentPathname,
}));

describe("AuthGate Authentication and Authorization Guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    currentPathname = "/overview";
  });

  afterEach(() => {
    cleanup();
  });

  it("permits public routes immediately without checking backend session", async () => {
    currentPathname = "/login";
    const checkSessionSpy = vi.spyOn(authService, "checkSession");

    render(
      <AuthGate>
        <div data-testid="protected-content">Public Content</div>
      </AuthGate>
    );

    expect(screen.getByTestId("protected-content")).toBeInTheDocument();
    expect(checkSessionSpy).not.toHaveBeenCalled();
  });

  it("shows a loading screen while authentication is being checked on protected routes", async () => {
    currentPathname = "/overview";
    let resolveSession: (value: any) => void;
    const sessionPromise = new Promise((resolve) => {
      resolveSession = resolve;
    });
    vi.spyOn(authService, "checkSession").mockReturnValue(sessionPromise as any);

    render(
      <AuthGate>
        <div data-testid="protected-content">Secret Content</div>
      </AuthGate>
    );

    // Content must not be visible
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    // Loading indicator must be displayed
    expect(screen.getByRole("status")).toBeInTheDocument();

    // Resolve as unauthenticated
    resolveSession!(null);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/login?next=%2Foverview");
    });
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
  });

  it("redirects unauthenticated users to login and preserves the requested URL in next param", async () => {
    currentPathname = "/opd";
    vi.spyOn(authService, "checkSession").mockResolvedValue(null);

    render(
      <AuthGate>
        <div data-testid="protected-content">Secret OPD</div>
      </AuthGate>
    );

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/login?next=%2Fopd");
    });
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
  });

  it("never trusts forged localStorage alone when backend rejects session", async () => {
    currentPathname = "/billing";
    // Forged user in localStorage
    localStorage.setItem(
      "ghms-user",
      JSON.stringify({ id: "fake-1", role: "Administrator", name: "Attacker" })
    );

    // Backend /auth/me returns null (unauthenticated / expired)
    vi.spyOn(authService, "checkSession").mockResolvedValue(null);

    render(
      <AuthGate>
        <div data-testid="protected-content">Protected Billing</div>
      </AuthGate>
    );

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/login?next=%2Fbilling");
    });
    // Forged content must never render
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
  });

  it("renders protected content when valid backend session has authorized role", async () => {
    currentPathname = "/overview";
    vi.spyOn(authService, "checkSession").mockResolvedValue({
      id: "usr-admin",
      role: "ADMINISTRATOR",
      name: "Dr. Abebe Bekele",
      email: "admin@gondar-hospital.et",
    } as any);

    render(
      <AuthGate>
        <div data-testid="protected-content">Authorized Overview</div>
      </AuthGate>
    );

    await waitFor(() => {
      expect(screen.getByTestId("protected-content")).toBeInTheDocument();
    });
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("redirects unauthorized roles to /access-denied without rendering content", async () => {
    currentPathname = "/users"; // Admin only
    vi.spyOn(authService, "checkSession").mockResolvedValue({
      id: "usr-nurse",
      role: "NURSE",
      name: "Sr. Tigist",
      email: "nurse@gondar-hospital.et",
    } as any);

    render(
      <AuthGate>
        <div data-testid="protected-content">User Management</div>
      </AuthGate>
    );

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/access-denied");
    });
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
  });

  it("strictly confines PATIENT role to /patient-portal", async () => {
    currentPathname = "/opd"; // Staff clinical page
    vi.spyOn(authService, "checkSession").mockResolvedValue({
      id: "usr-patient",
      role: "PATIENT",
      name: "Almaz Tadesse",
      email: "patient@gondar-hospital.et",
    } as any);

    render(
      <AuthGate>
        <div data-testid="protected-content">OPD Clinical Care</div>
      </AuthGate>
    );

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/patient-portal");
    });
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
  });

  it("strictly bars staff from /patient-portal and redirects to /access-denied", async () => {
    currentPathname = "/patient-portal";
    vi.spyOn(authService, "checkSession").mockResolvedValue({
      id: "usr-doctor",
      role: "DOCTOR",
      name: "Dr. Selam Girma",
      email: "doctor@gondar-hospital.et",
    } as any);

    render(
      <AuthGate>
        <div data-testid="protected-content">Patient Portal Dashboard</div>
      </AuthGate>
    );

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/access-denied");
    });
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
  });
});
