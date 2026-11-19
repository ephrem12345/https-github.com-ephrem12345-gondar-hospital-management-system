const assert = require("assert");

const API_BASE = "http://localhost:4000/api/v1";

async function runTests() {
  console.log("=================================================");
  console.log("GHMS PATIENT REGISTRATION VERIFICATION SUITE");
  console.log("=================================================\n");

  const ts = Date.now();
  const testEmail = `synthetic.patient.${ts}@example.com`;
  const testPhone = `+25191${String(ts).slice(-7)}`;

  // Test 1: Duplicate Email validation message
  console.log("[Test 1] Testing Duplicate Email Detection...");
  const dupEmailRes = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName: "Duplicate",
      middleName: "Email",
      lastName: "Test",
      gender: "female",
      dateOfBirth: "1994-06-15",
      phone: `+25192${String(ts + 1).slice(-7)}`,
      email: "fresh.patient.test@example.com", // Existing email from earlier
      address: "Gondar, Kebele 10",
      password: "Password123!",
      termsAccepted: true,
    }),
  });
  const dupEmailData = await dupEmailRes.json();
  console.log("Status:", dupEmailRes.status);
  console.log("Response:", JSON.stringify(dupEmailData));
  assert.strictEqual(dupEmailRes.status, 409, "Should return 409 for duplicate email");
  assert.strictEqual(dupEmailData.error?.code, "EMAIL_ALREADY_EXISTS");
  assert.strictEqual(dupEmailData.error?.message, "An account with this email address already exists");
  console.log("✓ Duplicate Email correctly returned 409 with clear message.\n");

  // Test 2: Duplicate Phone validation message
  console.log("[Test 2] Testing Duplicate Phone Detection...");
  const dupPhoneRes = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName: "Duplicate",
      middleName: "Phone",
      lastName: "Test",
      gender: "male",
      dateOfBirth: "1991-08-20",
      phone: "+251911333444", // Existing phone from earlier
      email: `diff.email.${ts}@example.com`,
      address: "Gondar, Kebele 11",
      password: "Password123!",
      termsAccepted: true,
    }),
  });
  const dupPhoneData = await dupPhoneRes.json();
  console.log("Status:", dupPhoneRes.status);
  console.log("Response:", JSON.stringify(dupPhoneData));
  assert.strictEqual(dupPhoneRes.status, 409, "Should return 409 for duplicate phone");
  assert.strictEqual(dupPhoneData.error?.code, "PHONE_ALREADY_EXISTS");
  assert.strictEqual(dupPhoneData.error?.message, "An account with this phone number already exists");
  console.log("✓ Duplicate Phone correctly returned 409 with clear message.\n");

  // Test 3: Date of Birth in the future validation
  console.log("[Test 3] Testing Future Date-of-Birth Validation...");
  const futureDobRes = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName: "Future",
      middleName: "Date",
      lastName: "Test",
      gender: "male",
      dateOfBirth: "2099-01-01",
      phone: `+25193${String(ts).slice(-7)}`,
      email: `future.${ts}@example.com`,
      address: "Gondar, Kebele 12",
      password: "Password123!",
      termsAccepted: true,
    }),
  });
  const futureDobData = await futureDobRes.json();
  console.log("Status:", futureDobRes.status);
  console.log("Response:", JSON.stringify(futureDobData));
  assert.strictEqual(futureDobRes.status, 400, "Should return 400 for future date of birth");
  assert.strictEqual(futureDobData.error?.code, "VALIDATION_ERROR");
  assert.ok(futureDobData.error?.message.includes("future"), "Should mention future date error");
  console.log("✓ Future Date of Birth rejected with 400 VALIDATION_ERROR.\n");

  // Test 4: Invalid short phone number validation
  console.log("[Test 4] Testing Invalid Short Phone Number Validation...");
  const invalidPhoneRes = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName: "Short",
      middleName: "Phone",
      lastName: "Test",
      gender: "female",
      dateOfBirth: "1998-05-10",
      phone: "123", // Too short
      email: `shortphone.${ts}@example.com`,
      address: "Gondar, Kebele 08",
      password: "Password123!",
      termsAccepted: true,
    }),
  });
  const invalidPhoneData = await invalidPhoneRes.json();
  console.log("Status:", invalidPhoneRes.status);
  console.log("Response:", JSON.stringify(invalidPhoneData));
  assert.strictEqual(invalidPhoneRes.status, 400, "Should return 400 for short phone");
  assert.strictEqual(invalidPhoneData.error?.code, "VALIDATION_ERROR");
  console.log("✓ Invalid Phone rejected with 400 VALIDATION_ERROR.\n");

  // Test 5: Successful Registration of a new synthetic test patient
  console.log("[Test 5] Registering New Synthetic Test Patient...");
  console.log("Identifier:", testEmail, "Phone:", testPhone);
  const regRes = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName: "Abebe",
      middleName: "Chala",
      lastName: "Bekele",
      gender: "male",
      dateOfBirth: "1988-11-23",
      phone: testPhone,
      email: testEmail,
      address: "Gondar, Arada Subcity, Kebele 04",
      password: "PatientPassword123!",
      termsAccepted: true,
    }),
  });
  const regData = await regRes.json();
  console.log("Status:", regRes.status);
  console.log("Response:", JSON.stringify(regData));
  assert.strictEqual(regRes.status, 201, "Should return 201 Created");
  assert.strictEqual(regData.success, true);
  assert.strictEqual(regData.data?.email, testEmail);
  assert.strictEqual(regData.data?.role, "Patient");
  assert.strictEqual(regData.data?.name, "Abebe Chala Bekele");
  console.log("✓ Synthetic patient successfully created with role Patient.\n");

  // Test 6: Login with newly registered patient account
  console.log("[Test 6] Logging in with the newly registered patient...");
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: testEmail,
      password: "PatientPassword123!",
    }),
  });
  const loginData = await loginRes.json();
  console.log("Login Status:", loginRes.status);
  console.log("Login Response:", JSON.stringify(loginData));
  assert.strictEqual(loginRes.status, 200, "Should allow login with status 200");
  assert.strictEqual(loginData.success, true);
  assert.strictEqual(loginData.data?.role, "Patient");
  assert.strictEqual(loginData.data?.email, testEmail);
  console.log("✓ Patient successfully logged in immediately after registration!\n");

  console.log("=================================================");
  console.log("ALL TESTS PASSED SUCCESSFULLY (6/6)");
  console.log("=================================================");
}

runTests().catch((err) => {
  console.error("Test suite failed:", err);
  process.exit(1);
});
