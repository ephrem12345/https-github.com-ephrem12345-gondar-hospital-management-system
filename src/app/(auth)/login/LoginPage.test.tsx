import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "./page";
import LandingPage from "@/app/page";
import { authService } from "@/services";
import { I18nProvider } from "@/lib/i18n/I18nProvider";

const pushMock = vi.fn();
const replaceMock = vi.fn();
let currentSearchRole: string | null = null;

function renderWithI18n(ui: React.ReactElement) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
  }),
  useSearchParams: () => ({
    get: (key: string) => (key === "role" ? currentSearchRole : null),
  }),
  usePathname: () => "/login",
}));

describe("Landing Page & Role Selection Portals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentSearchRole = null;
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the welcome page with subtitle and exactly the 7 required role login options", () => {
    renderWithI18n(<LandingPage />);

    expect(
      screen.getByRole("heading", { name: "Gondar Hospital Management System" })
    ).toBeInTheDocument();

    expect(
      screen.getByText("Welcome to Gondar Hospital. Select your account type to continue.")
    ).toBeInTheDocument();

    const expectedRoles = [
      "Administrator Login",
      "Doctor Login",
      "Nurse Login",
      "Laboratory Staff Login",
      "Pharmacist Login",
      "Receptionist Login",
      "Patient Login",
    ];

    for (const title of expectedRoles) {
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    }

    // Verify card links point to the respective ?role=... query parameter
    expect(screen.getByRole("link", { name: /Administrator Login/i })).toHaveAttribute(
      "href",
      "/login?role=administrator"
    );
    expect(screen.getByRole("link", { name: /Doctor Login/i })).toHaveAttribute(
      "href",
      "/login?role=doctor"
    );
    expect(screen.getByRole("link", { name: /Nurse Login/i })).toHaveAttribute(
      "href",
      "/login?role=nurse"
    );
    expect(screen.getByRole("link", { name: /Laboratory Staff Login/i })).toHaveAttribute(
      "href",
      "/login?role=laboratory"
    );
    expect(screen.getByRole("link", { name: /Pharmacist Login/i })).toHaveAttribute(
      "href",
      "/login?role=pharmacist"
    );
    expect(screen.getByRole("link", { name: /Receptionist Login/i })).toHaveAttribute(
      "href",
      "/login?role=receptionist"
    );
    expect(screen.getByRole("link", { name: /Patient Login/i })).toHaveAttribute(
      "href",
      "/login?role=patient"
    );
  });
});

describe("Role-Based Login Page & Security Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    currentSearchRole = null;
  });

  afterEach(() => {
    cleanup();
  });

  it("displays the selected role portal name on the login page", () => {
    currentSearchRole = "doctor";
    renderWithI18n(<LoginPage />);

    expect(screen.getByRole("heading", { name: "Doctor Login" })).toBeInTheDocument();
    expect(screen.getByText("Doctor Portal")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in as Doctor" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /All Role Portals/i })).toHaveAttribute("href", "/");
  });

  it("permits login and redirects to doctor dashboard when backend role matches", async () => {
    currentSearchRole = "doctor";
    const user = userEvent.setup();

    vi.spyOn(authService, "login").mockResolvedValueOnce({
      id: "usr-doc",
      email: "selam.girma@gondar-hospital.et",
      username: "selam.girma",
      role: "DOCTOR",
      firstName: "Selam",
      lastName: "Girma",
    } as any);

    renderWithI18n(<LoginPage />);

    await user.type(screen.getByLabelText(/Email, username or phone/i), "selam.girma");
    await user.type(screen.getByPlaceholderText("••••••••"), "SyntheticTestPass123!");
    await user.click(screen.getByRole("button", { name: "Sign in as Doctor" }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/opd");
    });
  });

  it("rejects login and revokes session when selected role does not match backend role", async () => {
    currentSearchRole = "administrator";
    const user = userEvent.setup();

    const logoutSpy = vi.spyOn(authService, "logout").mockResolvedValueOnce({} as any);

    // User is actually a NURSE, but tried to log in through Administrator Login
    vi.spyOn(authService, "login").mockResolvedValueOnce({
      id: "usr-nurse",
      email: "tigist.alemu@gondar-hospital.et",
      username: "tigist.alemu",
      role: "NURSE",
      firstName: "Tigist",
      lastName: "Alemu",
    } as any);

    renderWithI18n(<LoginPage />);

    await user.type(screen.getByLabelText(/Email, username or phone/i), "tigist.alemu");
    await user.type(screen.getByPlaceholderText("••••••••"), "SyntheticTestPass123!");
    await user.click(screen.getByRole("button", { name: "Sign in as Administrator" }));

    await waitFor(() => {
      expect(logoutSpy).toHaveBeenCalled();
      expect(screen.getByRole("alert")).toHaveTextContent(
        /Access Denied: You selected "Administrator Login", but your account has the role "Nurse"/i
      );
      expect(pushMock).not.toHaveBeenCalledWith("/overview");
    });
  });

  it("redirects patients to /patient-portal upon successful patient login", async () => {
    currentSearchRole = "patient";
    const user = userEvent.setup();

    vi.spyOn(authService, "login").mockResolvedValueOnce({
      id: "usr-patient",
      email: "patient@gondar-hospital.et",
      username: "patient",
      role: "PATIENT",
      firstName: "Almaz",
      lastName: "Tadesse",
    } as any);

    renderWithI18n(<LoginPage />);

    await user.type(screen.getByLabelText(/Email, username or phone/i), "patient");
    await user.type(screen.getByPlaceholderText("••••••••"), "SyntheticTestPass123!");
    await user.click(screen.getByRole("button", { name: "Sign in as Patient" }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/patient-portal");
    });
  });

  it("authenticates and redirects all seven accounts to their authorized dashboards", async () => {
    const testMatrix = [
      {
        roleQuery: "administrator",
        username: "admin",
        password: "SyntheticTestPass123!",
        userRole: "ADMINISTRATOR",
        expectedDashboard: "/overview",
        buttonName: "Sign in as Administrator",
      },
      {
        roleQuery: "doctor",
        username: "selam.girma",
        password: "SyntheticTestPass123!",
        userRole: "DOCTOR",
        expectedDashboard: "/opd",
        buttonName: "Sign in as Doctor",
      },
      {
        roleQuery: "nurse",
        username: "tigist.alemu",
        password: "SyntheticTestPass123!",
        userRole: "NURSE",
        expectedDashboard: "/vital-signs",
        buttonName: "Sign in as Nurse",
      },
      {
        roleQuery: "laboratory",
        username: "getu.assefa",
        password: "SyntheticTestPass123!",
        userRole: "LABORATORY_TECHNICIAN",
        expectedDashboard: "/laboratory",
        buttonName: "Sign in as Laboratory Technologist",
      },
      {
        roleQuery: "pharmacist",
        username: "liya.tesfaye",
        password: "SyntheticTestPass123!",
        userRole: "PHARMACIST",
        expectedDashboard: "/pharmacy",
        buttonName: "Sign in as Pharmacist",
      },
      {
        roleQuery: "receptionist",
        username: "receptionist",
        password: "SyntheticTestPass123!",
        userRole: "RECEPTIONIST",
        expectedDashboard: "/patient-registration",
        buttonName: "Sign in as Receptionist",
      },
      {
        roleQuery: "patient",
        username: "patient",
        password: "SyntheticTestPass123!",
        userRole: "PATIENT",
        expectedDashboard: "/patient-portal",
        buttonName: "Sign in as Patient",
      },
    ];

    for (const testCase of testMatrix) {
      cleanup();
      pushMock.mockClear();
      currentSearchRole = testCase.roleQuery;
      const user = userEvent.setup();

      vi.spyOn(authService, "login").mockResolvedValueOnce({
        id: `usr-${testCase.roleQuery}`,
        email: `${testCase.username}@gondar-hospital.et`,
        username: testCase.username,
        role: testCase.userRole,
        firstName: testCase.username,
        lastName: "GHMS",
      } as any);

      renderWithI18n(<LoginPage />);

      await user.type(screen.getByLabelText(/Email, username or phone/i), testCase.username);
      await user.type(screen.getByPlaceholderText("••••••••"), testCase.password);
      await user.click(screen.getByRole("button", { name: testCase.buttonName }));

      await waitFor(() => {
        expect(pushMock).toHaveBeenCalledWith(testCase.expectedDashboard);
      });
    }
  }, 35000);
});
