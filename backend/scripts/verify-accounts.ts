import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Passwords for verification are read from environment variables.
// Set GHMS_TEST_STAFF_PASSWORD and GHMS_TEST_PATIENT_PASSWORD in backend/.env
// (or the shell environment) before running this script.
const STAFF_PASSWORD = process.env.GHMS_TEST_STAFF_PASSWORD ?? "";
const PATIENT_PASSWORD = process.env.GHMS_TEST_PATIENT_PASSWORD ?? "";

if (!STAFF_PASSWORD || !PATIENT_PASSWORD) {
  console.error(
    "ERROR: GHMS_TEST_STAFF_PASSWORD and GHMS_TEST_PATIENT_PASSWORD must be set before running this script."
  );
  process.exit(1);
}

const EXPECTED_ACCOUNTS = [
  {
    roleName: "Administrator",
    username: "admin",
    email: "abebe.bekele@gondar-hospital.et",
    expectedRole: "ADMINISTRATOR",
    testPassword: STAFF_PASSWORD,
    expectedDestination: "/overview",
  },
  {
    roleName: "Doctor",
    username: "selam.girma",
    email: "selam.girma@gondar-hospital.et",
    expectedRole: "DOCTOR",
    testPassword: STAFF_PASSWORD,
    expectedDestination: "/opd",
  },
  {
    roleName: "Nurse",
    username: "tigist.alemu",
    email: "tigist.alemu@gondar-hospital.et",
    expectedRole: "NURSE",
    testPassword: STAFF_PASSWORD,
    expectedDestination: "/vital-signs",
  },
  {
    roleName: "Laboratory Staff",
    username: "getu.assefa",
    email: "getu.assefa@gondar-hospital.et",
    expectedRole: "LABORATORY_TECHNICIAN",
    testPassword: STAFF_PASSWORD,
    expectedDestination: "/laboratory",
  },
  {
    roleName: "Pharmacist",
    username: "liya.tesfaye",
    email: "liya.tesfaye@gondar-hospital.et",
    expectedRole: "PHARMACIST",
    testPassword: STAFF_PASSWORD,
    expectedDestination: "/pharmacy",
  },
  {
    roleName: "Receptionist",
    username: "receptionist",
    email: "receptionist@gondar-hospital.et",
    expectedRole: "RECEPTIONIST",
    testPassword: STAFF_PASSWORD,
    expectedDestination: "/patient-registration",
  },
  {
    roleName: "Patient",
    username: "patient",
    email: "patient@gondar-hospital.et",
    expectedRole: "PATIENT",
    testPassword: PATIENT_PASSWORD,
    expectedDestination: "/patient-portal",
  },
];

async function main() {
  console.log("=== GHMS DATABASE & ACCOUNT VERIFICATION ===");
  const results = [];

  for (const target of EXPECTED_ACCOUNTS) {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: target.username },
          { email: target.email },
        ],
      },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        passwordHash: true,
      },
    });

    if (!user) {
      results.push({
        roleName: target.roleName,
        username: target.username,
        email: target.email,
        exists: false,
        status: "NOT_FOUND",
        roleMatch: false,
        passwordValid: false,
        overall: "FAIL",
      });
      continue;
    }

    const isBcryptValid = await bcrypt.compare(target.testPassword, user.passwordHash);
    const roleMatches = user.role === target.expectedRole;
    const isActive = user.status === "ACTIVE";
    const usernameMatches = user.username === target.username;
    const emailMatches = user.email.toLowerCase() === target.email.toLowerCase();
    const phonePresent = Boolean(user.phone && user.phone.length > 5);

    const isPass = isBcryptValid && roleMatches && isActive && usernameMatches && emailMatches;

    results.push({
      roleName: target.roleName,
      username: user.username,
      email: user.email,
      phone: user.phone ? user.phone.replace(/(\+\d{4})\d+(\d{2})/, "$1****$2") : "None",
      role: user.role,
      status: user.status,
      passwordValid: isBcryptValid,
      roleMatch: roleMatches,
      accountActive: isActive,
      expectedDestination: target.expectedDestination,
      overall: isPass ? "PASS" : "FAIL",
    });
  }

  console.log(JSON.stringify(results, null, 2));

  // Also test direct API authentication for each account
  console.log("\n=== AUTHENTICATION API VERIFICATION (http://localhost:4000/api/v1/auth/login) ===");
  const apiResults = [];
  for (const target of EXPECTED_ACCOUNTS) {
    try {
      const res = await fetch("http://localhost:4000/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: target.username,
          password: target.testPassword,
          remember: true,
        }),
      });

      const body = await res.json();
      const cookies = res.headers.get("set-cookie") || "";
      const hasSessionCookie = cookies.includes("ghms_access") || cookies.includes("ghms_refresh");

      const returnedRole = body?.data?.role;
      const normalizedReturnedRole = (returnedRole || "").toUpperCase().replace(/\s+/g, "_");
      const isRoleMatch = normalizedReturnedRole === target.expectedRole;

      apiResults.push({
        roleName: target.roleName,
        identifierUsed: target.username,
        httpStatus: res.status,
        loginSuccess: res.ok && isRoleMatch,
        returnedRole: returnedRole,
        sessionCookieIssued: Boolean(cookies),
        destination: target.expectedDestination,
        overall: res.ok && isRoleMatch ? "PASS" : "FAIL",
      });
    } catch (err) {
      apiResults.push({
        roleName: target.roleName,
        identifierUsed: target.username,
        error: (err as Error).message,
        overall: "FAIL",
      });
    }
  }

  console.log(JSON.stringify(apiResults, null, 2));
}

main()
  .catch((e) => {
    console.error("Verification failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
