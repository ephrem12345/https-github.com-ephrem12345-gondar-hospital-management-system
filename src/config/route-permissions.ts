/**
 * Centralized Route Permission Matrix and Access Rules for GHMS
 * Strictly enforces department and role isolation across both Edge Middleware and Client AuthGate.
 */

export const PUBLIC_ROUTES = new Set([
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/session-expired",
  "/maintenance",
  "/access-denied",
  "/unauthorized",
]);

export interface RouteRule {
  /** Prefix or exact path match */
  path: string;
  exact?: boolean;
  /** Allowed roles in uppercase */
  allowedRoles: string[];
}

export const ROUTE_RULES: RouteRule[] = [
  // 1. Patient Portal (Self-Service)
  {
    path: "/patient-portal",
    allowedRoles: ["PATIENT"],
  },

  // 2. Executive & Administrative Management
  {
    path: "/overview",
    exact: true,
    allowedRoles: ["ADMINISTRATOR", "SUPER_ADMIN", "DEPARTMENT_HEAD"],
  },
  {
    path: "/users",
    allowedRoles: ["ADMINISTRATOR", "SUPER_ADMIN"],
  },
  {
    path: "/roles",
    allowedRoles: ["ADMINISTRATOR", "SUPER_ADMIN"],
  },
  {
    path: "/permissions",
    allowedRoles: ["ADMINISTRATOR", "SUPER_ADMIN"],
  },
  {
    path: "/audit-logs",
    allowedRoles: ["ADMINISTRATOR", "SUPER_ADMIN"],
  },
  {
    path: "/hospital-settings",
    allowedRoles: ["ADMINISTRATOR", "SUPER_ADMIN"],
  },
  {
    path: "/platform-admin",
    allowedRoles: ["SUPER_ADMIN"],
  },
  {
    path: "/saas-subscriptions",
    allowedRoles: ["SUPER_ADMIN", "ADMINISTRATOR"],
  },

  // 3. Clinical & Doctor Care
  {
    path: "/opd",
    allowedRoles: ["DOCTOR", "PHYSICIAN", "DEPARTMENT_HEAD", "ADMINISTRATOR"],
  },
  {
    path: "/medical-records",
    allowedRoles: ["DOCTOR", "PHYSICIAN", "DEPARTMENT_HEAD", "ADMINISTRATOR"],
  },
  {
    path: "/referrals",
    allowedRoles: ["DOCTOR", "PHYSICIAN", "DEPARTMENT_HEAD", "ADMINISTRATOR"],
  },
  {
    path: "/diagnoses",
    allowedRoles: ["DOCTOR", "PHYSICIAN", "DEPARTMENT_HEAD", "ADMINISTRATOR"],
  },
  {
    path: "/clinical-overview",
    allowedRoles: ["DOCTOR", "PHYSICIAN", "DEPARTMENT_HEAD", "ADMINISTRATOR"],
  },

  // 4. Nursing & Inpatient Monitoring
  {
    path: "/vital-signs",
    allowedRoles: ["NURSE", "DOCTOR", "PHYSICIAN", "DEPARTMENT_HEAD", "ADMINISTRATOR"],
  },
  {
    path: "/nurses",
    allowedRoles: ["NURSE", "DEPARTMENT_HEAD", "ADMINISTRATOR"],
  },
  {
    path: "/inpatient",
    allowedRoles: ["NURSE", "DOCTOR", "PHYSICIAN", "DEPARTMENT_HEAD", "ADMINISTRATOR"],
  },
  {
    path: "/admissions",
    allowedRoles: ["NURSE", "DOCTOR", "PHYSICIAN", "RECEPTIONIST", "ADMINISTRATOR"],
  },
  {
    path: "/wards",
    allowedRoles: ["NURSE", "DOCTOR", "PHYSICIAN", "DEPARTMENT_HEAD", "ADMINISTRATOR"],
  },
  {
    path: "/beds",
    allowedRoles: ["NURSE", "DOCTOR", "PHYSICIAN", "DEPARTMENT_HEAD", "ADMINISTRATOR"],
  },
  {
    path: "/discharges",
    allowedRoles: ["DOCTOR", "PHYSICIAN", "NURSE", "DEPARTMENT_HEAD", "ADMINISTRATOR"],
  },
  {
    path: "/operating-rooms",
    allowedRoles: ["DOCTOR", "PHYSICIAN", "NURSE", "DEPARTMENT_HEAD", "ADMINISTRATOR"],
  },
  {
    path: "/ambulance",
    allowedRoles: ["NURSE", "DOCTOR", "DEPARTMENT_HEAD", "ADMINISTRATOR", "HOSPITAL_STAFF"],
  },
  {
    path: "/general-inventory",
    allowedRoles: ["ADMINISTRATOR", "DEPARTMENT_HEAD"],
  },
  {
    path: "/assets",
    allowedRoles: ["ADMINISTRATOR", "DEPARTMENT_HEAD"],
  },
  {
    path: "/maintenance",
    allowedRoles: ["ADMINISTRATOR", "DEPARTMENT_HEAD"],
  },

  // 5. Diagnostics, Laboratory & Radiology
  {
    path: "/laboratory",
    allowedRoles: ["LABORATORY_TECHNICIAN", "LAB_TECH", "DOCTOR", "PHYSICIAN", "DEPARTMENT_HEAD", "ADMINISTRATOR"],
  },
  {
    path: "/laboratory-orders",
    allowedRoles: ["LABORATORY_TECHNICIAN", "LAB_TECH", "DOCTOR", "PHYSICIAN", "DEPARTMENT_HEAD", "ADMINISTRATOR"],
  },
  {
    path: "/specimen-management",
    allowedRoles: ["LABORATORY_TECHNICIAN", "LAB_TECH", "DEPARTMENT_HEAD", "ADMINISTRATOR"],
  },
  {
    path: "/laboratory-results",
    allowedRoles: ["LABORATORY_TECHNICIAN", "LAB_TECH", "DOCTOR", "PHYSICIAN", "DEPARTMENT_HEAD", "ADMINISTRATOR"],
  },
  {
    path: "/radiology",
    allowedRoles: ["RADIOLOGY_TECHNICIAN", "DOCTOR", "PHYSICIAN", "DEPARTMENT_HEAD", "ADMINISTRATOR"],
  },
  {
    path: "/imaging-reports",
    allowedRoles: ["RADIOLOGY_TECHNICIAN", "DOCTOR", "PHYSICIAN", "DEPARTMENT_HEAD", "ADMINISTRATOR"],
  },
  {
    path: "/blood-bank",
    allowedRoles: ["LABORATORY_TECHNICIAN", "LAB_TECH", "DOCTOR", "PHYSICIAN", "DEPARTMENT_HEAD", "ADMINISTRATOR"],
  },

  // 6. Pharmacy & Medication Dispensing
  {
    path: "/pharmacy",
    allowedRoles: ["PHARMACIST", "DEPARTMENT_HEAD", "ADMINISTRATOR"],
  },
  {
    path: "/medicines",
    allowedRoles: ["PHARMACIST", "DEPARTMENT_HEAD", "ADMINISTRATOR"],
  },
  {
    path: "/inventory",
    allowedRoles: ["PHARMACIST", "DEPARTMENT_HEAD", "ADMINISTRATOR"],
  },
  {
    path: "/prescriptions",
    allowedRoles: ["PHARMACIST", "DOCTOR", "PHYSICIAN", "DEPARTMENT_HEAD", "ADMINISTRATOR"],
  },
  {
    path: "/dispensing",
    allowedRoles: ["PHARMACIST", "DEPARTMENT_HEAD", "ADMINISTRATOR"],
  },
  {
    path: "/suppliers",
    allowedRoles: ["PHARMACIST", "DEPARTMENT_HEAD", "ADMINISTRATOR"],
  },
  {
    path: "/procurement",
    allowedRoles: ["PHARMACIST", "DEPARTMENT_HEAD", "ADMINISTRATOR"],
  },

  // 7. Finance, Billing & Cashier
  {
    path: "/billing",
    allowedRoles: ["FINANCE_OFFICER", "CASHIER", "ADMINISTRATOR", "SUPER_ADMIN"],
  },
  {
    path: "/invoices",
    allowedRoles: ["FINANCE_OFFICER", "CASHIER", "ADMINISTRATOR", "SUPER_ADMIN"],
  },
  {
    path: "/payments",
    allowedRoles: ["FINANCE_OFFICER", "CASHIER", "ADMINISTRATOR", "SUPER_ADMIN"],
  },
  {
    path: "/service-pricing",
    allowedRoles: ["FINANCE_OFFICER", "CASHIER", "ADMINISTRATOR", "SUPER_ADMIN"],
  },
  {
    path: "/checkout",
    allowedRoles: ["FINANCE_OFFICER", "CASHIER", "ADMINISTRATOR", "SUPER_ADMIN"],
  },

  // 8. Reception, Registration & Queue
  {
    path: "/patients",
    allowedRoles: ["RECEPTIONIST", "DOCTOR", "PHYSICIAN", "NURSE", "DEPARTMENT_HEAD", "ADMINISTRATOR"],
  },
  {
    path: "/patient-registration",
    allowedRoles: ["RECEPTIONIST", "DOCTOR", "PHYSICIAN", "DEPARTMENT_HEAD", "ADMINISTRATOR"],
  },
  {
    path: "/appointments",
    allowedRoles: ["RECEPTIONIST", "DOCTOR", "PHYSICIAN", "NURSE", "DEPARTMENT_HEAD", "ADMINISTRATOR"],
  },
  {
    path: "/queue-management",
    allowedRoles: ["RECEPTIONIST", "DOCTOR", "PHYSICIAN", "NURSE", "DEPARTMENT_HEAD", "ADMINISTRATOR"],
  },
  {
    path: "/triage",
    allowedRoles: ["RECEPTIONIST", "NURSE", "DOCTOR", "PHYSICIAN", "DEPARTMENT_HEAD", "ADMINISTRATOR"],
  },

  // 9. Emergency & Specialized Workspaces
  {
    path: "/emergency",
    allowedRoles: ["DOCTOR", "PHYSICIAN", "NURSE", "DEPARTMENT_HEAD", "ADMINISTRATOR"],
  },
  {
    path: "/departments",
    allowedRoles: ["DOCTOR", "PHYSICIAN", "NURSE", "DEPARTMENT_HEAD", "ADMINISTRATOR"],
  },

  // 10. General Communications & Personal
  {
    path: "/messages",
    allowedRoles: [
      "ADMINISTRATOR",
      "SUPER_ADMIN",
      "DOCTOR",
      "PHYSICIAN",
      "NURSE",
      "LABORATORY_TECHNICIAN",
      "LAB_TECH",
      "RADIOLOGY_TECHNICIAN",
      "PHARMACIST",
      "FINANCE_OFFICER",
      "CASHIER",
      "RECEPTIONIST",
      "HR_OFFICER",
      "DEPARTMENT_HEAD",
      "HOSPITAL_STAFF",
    ],
  },
  {
    path: "/profile",
    allowedRoles: [
      "PATIENT",
      "ADMINISTRATOR",
      "SUPER_ADMIN",
      "DOCTOR",
      "PHYSICIAN",
      "NURSE",
      "LABORATORY_TECHNICIAN",
      "LAB_TECH",
      "RADIOLOGY_TECHNICIAN",
      "PHARMACIST",
      "FINANCE_OFFICER",
      "CASHIER",
      "RECEPTIONIST",
      "HR_OFFICER",
      "DEPARTMENT_HEAD",
      "HOSPITAL_STAFF",
    ],
  },
];

/**
 * Checks whether a given path is completely public (no authentication required).
 */
export function isPublicRoute(pathname: string): boolean {
  if (pathname === "/" || PUBLIC_ROUTES.has(pathname)) return true;
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/session-expired") ||
    pathname.startsWith("/maintenance") ||
    pathname.startsWith("/access-denied") ||
    pathname.startsWith("/unauthorized")
  ) {
    return true;
  }
  return false;
}

/**
 * Verifies if an authenticated user with a specific role has permission to access a route.
 */
export function canAccessRoute(pathname: string, role: string | undefined | null): boolean {
  if (isPublicRoute(pathname)) return true;
  if (!role) return false;

  const normalizedRole = role.toUpperCase().replace(/\s+/g, "_");

  // Patients are strictly confined to patient portal routes and profile
  if (normalizedRole === "PATIENT") {
    return pathname.startsWith("/patient-portal") || pathname === "/profile";
  }

  // Staff members are barred from the patient portal (use dedicated staff dashboards instead)
  if (pathname.startsWith("/patient-portal")) {
    return false;
  }

  // Find most specific rule matching the pathname
  const matchingRule = ROUTE_RULES.find((rule) => {
    if (rule.exact) {
      return pathname === rule.path;
    }
    return pathname === rule.path || pathname.startsWith(`${rule.path}/`);
  });

  if (!matchingRule) {
    // Default-deny policy: Any registered route without an explicit allow rule is restricted to administrators
    return normalizedRole === "ADMINISTRATOR" || normalizedRole === "SUPER_ADMIN";
  }

  return matchingRule.allowedRoles.includes(normalizedRole);
}

/**
 * Returns the default dashboard URL for a given role.
 */
export function getRoleDashboard(role: string | undefined | null): string {
  if (!role) return "/login";
  const normalizedRole = role.toUpperCase().replace(/\s+/g, "_");
  switch (normalizedRole) {
    case "PATIENT":
      return "/patient-portal";
    case "DOCTOR":
    case "PHYSICIAN":
      return "/opd";
    case "NURSE":
      return "/vital-signs";
    case "LABORATORY_TECHNICIAN":
    case "LAB_TECH":
      return "/laboratory";
    case "RADIOLOGY_TECHNICIAN":
      return "/radiology";
    case "PHARMACIST":
      return "/pharmacy";
    case "RECEPTIONIST":
      return "/patient-registration";
    case "FINANCE_OFFICER":
    case "CASHIER":
      return "/billing";
    case "SUPER_ADMIN":
      return "/platform-admin";
    case "ADMINISTRATOR":
    default:
      return "/overview";
  }
}
