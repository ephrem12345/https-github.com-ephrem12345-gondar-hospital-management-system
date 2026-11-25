const http = require("http");

const BASE_URL = "http://localhost:4000/api/v1";

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path.startsWith("http") ? path : `${BASE_URL}${path}`);
    const reqOptions = {
      method: options.method || "GET",
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    };

    const req = http.request(reqOptions, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        let parsed = null;
        try {
          parsed = JSON.parse(body);
        } catch {
          parsed = body;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsed,
          cookies: res.headers["set-cookie"] || [],
        });
      });
    });

    req.on("error", reject);
    if (options.body) {
      req.write(typeof options.body === "string" ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

function extractCookie(cookieArray, name) {
  for (const c of cookieArray) {
    const parts = c.split(";")[0].split("=");
    if (parts[0] === name) return parts[1];
  }
  return null;
}

async function runTests() {
  console.log("================================================================================");
  console.log("GHMS ACCOUNT STATUS, ACTIVATION WORKFLOW, AND SECURITY TEST SUITE");
  console.log("================================================================================\n");

  const ADMIN_PASSWORD = process.env.GHMS_TEST_ADMIN_PASSWORD;
  if (!ADMIN_PASSWORD) {
    console.error("ERROR: GHMS_TEST_ADMIN_PASSWORD is not set.");
    console.error("Set it to the administrator account password before running this script.");
    process.exit(1);
  }

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Authenticate as Administrator
  console.log("--> 1. Authenticating as Administrator (abebe.bekele@gondar-hospital.et)...");
  const adminLogin = await request("/auth/login", {
    method: "POST",
    body: {
      identifier: "abebe.bekele@gondar-hospital.et",
      password: ADMIN_PASSWORD,
      remember: false,
    },
  });

  assert(adminLogin.status === 200, "Administrator login successful (HTTP 200)");
  assert(adminLogin.data?.data?.role === "Administrator", "Administrator role confirmed");
  const adminAccessCookie = extractCookie(adminLogin.cookies, "ghms_access");
  const adminAuthHeader = { Cookie: `ghms_access=${adminAccessCookie}` };

  // 2. Administrator queries user directory via GET /auth/users
  console.log("\n--> 2. Testing Administrator GET /auth/users...");
  const usersList = await request("/auth/users?limit=10", {
    headers: adminAuthHeader,
  });
  assert(usersList.status === 200, "Administrator can list users (HTTP 200)");
  assert(Array.isArray(usersList.data?.data?.items), "User list items returned as array");
  console.log(`     Total users in system: ${usersList.data?.data?.total}`);

  // 3. Test Staff Creation (starts as PENDING, not automatically activated)
  const uniqueId = Date.now();
  const staffEmail = `nurse.test.${uniqueId}@gondar-hospital.et`;
  const staffPhone = `+251911${String(uniqueId).slice(-6)}`;
  console.log(`\n--> 3. Creating new staff account (Nurse: ${staffEmail})...`);

  const createStaffRes = await request("/auth/staff", {
    method: "POST",
    headers: adminAuthHeader,
    body: {
      email: staffEmail,
      phone: staffPhone,
      firstName: "Hiwot",
      lastName: "Tadesse",
      department: "Internal Medicine",
      role: "NURSE",
      password: "StaffNurseSecure123",
    },
  });

  assert(createStaffRes.status === 201, "Staff account created successfully (HTTP 201)");
  assert(createStaffRes.data?.data?.status === "PENDING", "Staff account correctly created with status PENDING");
  const createdStaffId = createStaffRes.data?.data?.id;

  // 4. Verify PENDING staff account cannot log in
  console.log("\n--> 4. Verifying PENDING staff account cannot log in...");
  const pendingStaffLogin = await request("/auth/login", {
    method: "POST",
    body: {
      identifier: staffEmail,
      password: "StaffNurseSecure123",
    },
  });

  assert(pendingStaffLogin.status === 403, "PENDING staff login blocked with HTTP 403");
  assert(
    pendingStaffLogin.data?.error?.code === "ACCOUNT_PENDING_APPROVAL",
    "Error code is ACCOUNT_PENDING_APPROVAL"
  );
  assert(
    pendingStaffLogin.data?.error?.message?.includes("pending administrator approval"),
    `Error message mentions administrator approval: "${pendingStaffLogin.data?.error?.message}"`
  );

  // 5. Administrator activates the staff account
  console.log(`\n--> 5. Administrator activates staff account (${createdStaffId})...`);
  const activateRes = await request(`/auth/users/${createdStaffId}/status`, {
    method: "PATCH",
    headers: adminAuthHeader,
    body: {
      status: "ACTIVE",
      reason: "Credentials verified and onboarding approved by Administration",
    },
  });

  assert(activateRes.status === 200, "Account activation succeeded (HTTP 200)");
  assert(activateRes.data?.data?.status === "ACTIVE", "User status updated to ACTIVE");

  // 6. Verify now-ACTIVE staff account can log in
  console.log("\n--> 6. Verifying activated staff account can now log in...");
  const activeStaffLogin = await request("/auth/login", {
    method: "POST",
    body: {
      identifier: staffEmail,
      password: "StaffNurseSecure123",
    },
  });

  assert(activeStaffLogin.status === 200, "Activated staff member can log in (HTTP 200)");
  assert(activeStaffLogin.data?.data?.role === "Nurse", "Staff member received Nurse role");
  const staffAccessCookie = extractCookie(activeStaffLogin.cookies, "ghms_access");
  const staffAuthHeader = { Cookie: `ghms_access=${staffAccessCookie}` };

  // 7. Verify staff member can access protected endpoints (e.g. /auth/me)
  const staffMe = await request("/auth/me", { headers: staffAuthHeader });
  assert(staffMe.status === 200, "Active staff member can access protected /auth/me (HTTP 200)");

  // 8. Administrator deactivates staff account (DISABLED)
  console.log(`\n--> 8. Administrator deactivates staff account (${createdStaffId})...`);
  const deactivateRes = await request(`/auth/users/${createdStaffId}/status`, {
    method: "PATCH",
    headers: adminAuthHeader,
    body: {
      status: "DISABLED",
      reason: "Account suspended by Administrator for testing",
    },
  });

  assert(deactivateRes.status === 200, "Deactivation succeeded (HTTP 200)");
  assert(deactivateRes.data?.data?.status === "DISABLED", "Account status updated to DISABLED");

  // 9. Verify DISABLED staff account cannot log in
  console.log("\n--> 9. Verifying DISABLED staff account cannot log in...");
  const disabledStaffLogin = await request("/auth/login", {
    method: "POST",
    body: {
      identifier: staffEmail,
      password: "StaffNurseSecure123",
    },
  });

  assert(disabledStaffLogin.status === 403, "DISABLED staff login blocked with HTTP 403");
  assert(disabledStaffLogin.data?.error?.code === "ACCOUNT_DISABLED", "Error code is ACCOUNT_DISABLED");
  assert(
    disabledStaffLogin.data?.error?.message?.includes("This account has been disabled"),
    `Disabled message returned: "${disabledStaffLogin.data?.error?.message}"`
  );

  // 10. Verify deactivated account is immediately blocked on protected requests
  console.log("\n--> 10. Verifying deactivated account cannot access protected endpoints...");
  const blockedMe = await request("/auth/me", { headers: staffAuthHeader });
  assert(
    blockedMe.status === 403,
    `Deactivated user immediately blocked from protected endpoint with HTTP 403 (got ${blockedMe.status})`
  );
  assert(
    blockedMe.data?.error?.code === "ACCOUNT_NOT_ACTIVE",
    `Error code is ACCOUNT_NOT_ACTIVE (got ${blockedMe.data?.error?.code})`
  );

  // 11. Verify self-registration creates ACTIVE patient when verification is false (default)
  console.log("\n--> 11. Testing Patient self-registration default active policy...");
  const patientEmail = `patient.flow.${uniqueId}@example.com`;
  const registerPatientRes = await request("/auth/register", {
    method: "POST",
    body: {
      firstName: "Almaz",
      middleName: "Ayana",
      lastName: "Kassa",
      gender: "female",
      dateOfBirth: "1994-08-20",
      phone: `+251922${String(uniqueId).slice(-6)}`,
      email: patientEmail,
      address: "Kebele 03, Gondar, Ethiopia",
      password: "PatientPass123",
      termsAccepted: true,
    },
  });

  assert(registerPatientRes.status === 201, "Patient self-registration completed (HTTP 201)");
  const patientLogin = await request("/auth/login", {
    method: "POST",
    body: {
      identifier: patientEmail,
      password: "PatientPass123",
    },
  });

  assert(patientLogin.status === 200, "Newly registered patient can log in immediately (HTTP 200)");
  assert(patientLogin.data?.data?.role === "Patient", "Patient role returned");

  // 12. Test PENDING patient error message
  console.log("\n--> 12. Testing PENDING patient login message...");
  // Temporarily set patient status to PENDING
  const regPatientId = registerPatientRes.data?.data?.id;
  await request(`/auth/users/${regPatientId}/status`, {
    method: "PATCH",
    headers: adminAuthHeader,
    body: { status: "PENDING" },
  });

  const pendingPatientLogin = await request("/auth/login", {
    method: "POST",
    body: {
      identifier: patientEmail,
      password: "PatientPass123",
    },
  });

  assert(pendingPatientLogin.status === 403, "PENDING patient login returns HTTP 403");
  assert(
    pendingPatientLogin.data?.error?.code === "ACCOUNT_NOT_ACTIVE",
    "Error code is ACCOUNT_NOT_ACTIVE"
  );
  assert(
    pendingPatientLogin.data?.error?.message === "This account is not active. Contact the hospital registration desk.",
    `Exact message matches: "${pendingPatientLogin.data?.error?.message}"`
  );

  // Restore patient to ACTIVE
  await request(`/auth/users/${regPatientId}/status`, {
    method: "PATCH",
    headers: adminAuthHeader,
    body: { status: "ACTIVE" },
  });

  // 13. Security: Administrator self-lockout prevention
  console.log("\n--> 13. Testing Administrator self-lockout prevention...");
  const adminId = adminLogin.data?.data?.id;
  const selfDeactivateRes = await request(`/auth/users/${adminId}/status`, {
    method: "PATCH",
    headers: adminAuthHeader,
    body: { status: "DISABLED" },
  });

  assert(selfDeactivateRes.status === 400, "Self-deactivation rejected with HTTP 400");
  assert(
    selfDeactivateRes.data?.error?.code === "CANNOT_MODIFY_OWN_STATUS",
    "Error code is CANNOT_MODIFY_OWN_STATUS"
  );

  // 14. Security: Non-admin role cannot access user management endpoints
  console.log("\n--> 14. Testing Non-Administrator access restriction...");
  const nonAdminList = await request("/auth/users", {
    headers: staffAuthHeader,
  });
  assert(nonAdminList.status === 403, "Non-admin blocked from GET /auth/users (HTTP 403)");

  const nonAdminPatch = await request(`/auth/users/${regPatientId}/status`, {
    method: "PATCH",
    headers: staffAuthHeader,
    body: { status: "ACTIVE" },
  });
  assert(nonAdminPatch.status === 403, "Non-admin blocked from PATCH /auth/users/:id/status (HTTP 403)");

  // 15. Reconciliation: Activate any existing legitimate patient in PENDING status
  console.log("\n--> 15. Reconciling existing pending patient accounts...");
  const pendingUsers = await request("/auth/users?status=PENDING&role=PATIENT", {
    headers: adminAuthHeader,
  });

  if (pendingUsers.data?.data?.items?.length > 0) {
    for (const pendingPatient of pendingUsers.data.data.items) {
      console.log(`     Reconciling pending patient: ${pendingPatient.email} (${pendingPatient.id})`);
      const recRes = await request(`/auth/users/${pendingPatient.id}/status`, {
        method: "PATCH",
        headers: adminAuthHeader,
        body: {
          status: "ACTIVE",
          reason: "Administrator activation and reconciliation",
        },
      });
      assert(recRes.status === 200, `Patient ${pendingPatient.email} successfully activated`);
    }
  } else {
    console.log("     No pending patient accounts require reconciliation.");
  }

  console.log("\n================================================================================");
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("================================================================================");

  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error("Test execution failed with error:", err);
  process.exit(1);
});
