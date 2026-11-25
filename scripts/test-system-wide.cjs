const assert = require("assert");

const API_BASE = "http://localhost:4000/api/v1";

async function runSystemWideTests() {
  console.log("=================================================");
  console.log("GHMS SYSTEM-WIDE INTEGRATION & HEALTH VERIFICATION");
  console.log("=================================================\n");

  // 1. Health check
  console.log("[Test 1] Verifying /health endpoint...");
  const healthRes = await fetch(`${API_BASE}/health`);
  const healthData = await healthRes.json();
  assert.strictEqual(healthRes.status, 200);
  assert.strictEqual(healthData.data?.status, "ok");
  console.log("✓ Health endpoint OK: 200\n");

  // 2. Readiness check (Database check)
  console.log("[Test 2] Verifying /ready database check...");
  const readyRes = await fetch(`${API_BASE}/ready`);
  const readyData = await readyRes.json();
  assert.strictEqual(readyRes.status, 200);
  assert.strictEqual(readyData.data?.database, "connected");
  console.log("✓ Database readiness OK: 200\n");

  // 3. Public queue
  console.log("[Test 3] Verifying /queue/public endpoint...");
  const queueRes = await fetch(`${API_BASE}/queue/public`);
  const queueData = await queueRes.json();
  assert.strictEqual(queueRes.status, 200);
  assert.strictEqual(queueData.success, true);
  console.log(`✓ Public queue responded with ${queueData.data?.length ?? 0} entries.\n`);

  // 4. Staff Login & RBAC Check
  console.log("[Test 4] Testing Doctor Login (RBAC & Auth)...");
  const DOCTOR_PASSWORD = process.env.GHMS_TEST_DOCTOR_PASSWORD;
  if (!DOCTOR_PASSWORD) {
    console.error("ERROR: GHMS_TEST_DOCTOR_PASSWORD is not set. Set it and re-run.");
    process.exit(1);
  }
  const doctorLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: "selam.girma@gondar-hospital.et",
      password: DOCTOR_PASSWORD,
    }),
  });
  const doctorLoginData = await doctorLoginRes.json();
  console.log("Doctor login status:", doctorLoginRes.status);
  assert.strictEqual(doctorLoginRes.status, 200);
  assert.strictEqual(doctorLoginData.data?.role, "Doctor");
  const cookies = doctorLoginRes.headers.get("set-cookie") || "";
  console.log("✓ Doctor authenticated successfully with role Doctor.\n");

  // 5. Patient Registration & Login Flow
  console.log("[Test 5] Testing Full Patient Registration Lifecycle...");
  const ts = Date.now();
  const testEmail = `synthetic.flow.${ts}@example.com`;
  const testPhone = `+25197${String(ts).slice(-7)}`;

  const regRes = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName: "Mulugeta",
      middleName: "Desta",
      lastName: "Alemu",
      gender: "male",
      dateOfBirth: "1985-09-18",
      phone: testPhone,
      email: testEmail,
      address: "Gondar, Maraki, Kebele 07",
      password: "SecurePatient123!",
      termsAccepted: true,
    }),
  });
  const regData = await regRes.json();
  assert.strictEqual(regRes.status, 201);
  assert.strictEqual(regData.data?.role, "Patient");
  assert.strictEqual(regData.data?.email, testEmail);
  console.log("✓ Patient registration succeeded (HTTP 201).");

  // 6. Immediate Patient Login
  console.log("[Test 6] Testing Immediate Patient Sign-in...");
  const patientLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: testEmail,
      password: "SecurePatient123!",
    }),
  });
  const patientLoginData = await patientLoginRes.json();
  assert.strictEqual(patientLoginRes.status, 200);
  assert.strictEqual(patientLoginData.data?.role, "Patient");
  assert.strictEqual(patientLoginData.data?.email, testEmail);
  const patientCookies = patientLoginRes.headers.get("set-cookie") || "";
  console.log("✓ Patient logged in immediately with HTTP 200 and issued auth cookies.\n");

  // 7. Protected /auth/me call with Session Cookies
  console.log("[Test 7] Accessing /auth/me with Patient session...");
  const meRes = await fetch(`${API_BASE}/auth/me`, {
    headers: { Cookie: patientCookies },
  });
  const meData = await meRes.json();
  assert.strictEqual(meRes.status, 200);
  assert.strictEqual(meData.data?.email, testEmail);
  assert.strictEqual(meData.data?.role, "Patient");
  console.log("✓ Protected session verified: /auth/me identified patient account correctly.\n");

  // 8. Logout
  console.log("[Test 8] Testing Logout and Session Invalidation...");
  const logoutRes = await fetch(`${API_BASE}/auth/logout`, {
    method: "POST",
    headers: { Cookie: patientCookies },
  });
  assert.strictEqual(logoutRes.status, 200);
  console.log("✓ Logout succeeded with 200.\n");

  console.log("=================================================");
  console.log("ALL 8 SYSTEM-WIDE TESTS PASSED (8/8)!");
  console.log("=================================================");
}

runSystemWideTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
