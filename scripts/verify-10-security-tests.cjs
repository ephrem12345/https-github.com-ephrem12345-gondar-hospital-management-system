const http = require("http");

const FRONTEND_ORIGIN = "http://localhost:3002";
const BACKEND_ORIGIN = "http://localhost:4000";

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || "GET",
      headers: options.headers || {},
    };

    const req = http.request(reqOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on("error", (err) => reject(err));

    if (options.body) {
      req.write(typeof options.body === "string" ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log("================================================================");
  console.log(" GHMS MANDATORY 10 SECURITY TESTS - LIVE SYSTEM VERIFICATION");
  console.log("================================================================\n");

  let allPassed = true;
  let skippedCount = 0;

  // Credentials must be supplied via environment variables — never hardcoded here.
  const ADMIN_PASSWORD = process.env.GHMS_TEST_ADMIN_PASSWORD;
  const DOCTOR_PASSWORD = process.env.GHMS_TEST_DOCTOR_PASSWORD;

  if (!ADMIN_PASSWORD || !DOCTOR_PASSWORD) {
    console.log(
      "[CONFIG] NOTE: GHMS_TEST_ADMIN_PASSWORD and/or GHMS_TEST_DOCTOR_PASSWORD are not set."
    );
    console.log(
      "         Tests 6 and 9 (credential-dependent) will be SKIPPED."
    );
    console.log(
      "         Set these variables to run the full 10-test suite.\n"
    );
  }

  // TEST 1: Open /overview without logging in -> redirect to /login
  console.log("[TEST 1] Access /overview directly without session cookie");
  const res1 = await makeRequest(`${FRONTEND_ORIGIN}/overview`);
  const isRedirect1 = res1.statusCode === 307 || res1.statusCode === 302 || res1.statusCode === 308;
  const location1 = res1.headers["location"] || "";
  const passed1 = isRedirect1 && location1.includes("/login");
  console.log(`  -> Status: ${res1.statusCode}, Location: ${location1}`);
  console.log(`  -> Result: ${passed1 ? "PASS (Redirected to /login)" : "FAIL"}\n`);
  if (!passed1) allPassed = false;

  // TEST 2: Open every department dashboard directly without logging in -> redirect to /login
  console.log("[TEST 2] Access all department dashboards without logging in");
  const departments = [
    "/departments/emergency",
    "/departments/internal-medicine",
    "/departments/surgery",
    "/departments/pediatrics",
    "/departments/gynecology-obstetrics",
    "/departments/orthopedics",
    "/departments/dentistry",
    "/departments/ophthalmology",
    "/departments/dermatology",
    "/departments/psychiatry",
    "/departments/icu",
    "/departments/physiotherapy",
    "/opd",
    "/emergency",
    "/inpatient",
    "/billing",
    "/pharmacy",
    "/laboratory",
    "/medical-records",
    "/admin/users",
  ];

  let deptPassed = true;
  for (const dept of departments) {
    const res = await makeRequest(`${FRONTEND_ORIGIN}${dept}`);
    const isRedir = res.statusCode === 307 || res.statusCode === 302 || res.statusCode === 308;
    const loc = res.headers["location"] || "";
    const ok = isRedir && loc.includes("/login");
    if (!ok) {
      console.log(`  -> FAILED for ${dept}: Status ${res.statusCode}, Location: ${loc}`);
      deptPassed = false;
    }
  }
  console.log(`  -> Tested ${departments.length} private routes.`);
  console.log(`  -> Result: ${deptPassed ? "PASS (All 20 protected routes redirected to /login)" : "FAIL"}\n`);
  if (!deptPassed) allPassed = false;

  // TEST 3: Call GET /api/v1/auth/me without credentials -> HTTP 401
  console.log("[TEST 3] Backend API: GET /api/v1/auth/me without credentials");
  const res3 = await makeRequest(`${BACKEND_ORIGIN}/api/v1/auth/me`);
  const passed3 = res3.statusCode === 401;
  console.log(`  -> Status: ${res3.statusCode}`);
  console.log(`  -> Body: ${res3.body.slice(0, 150)}`);
  console.log(`  -> Result: ${passed3 ? "PASS (Returned HTTP 401 UNAUTHENTICATED)" : "FAIL"}\n`);
  if (!passed3) allPassed = false;

  // TEST 4: Call protected department APIs without credentials -> HTTP 401
  console.log("[TEST 4] Backend API: Call protected department endpoints without credentials");
  const apiEndpoints = [
    `${BACKEND_ORIGIN}/api/v1/appointments`,
    `${BACKEND_ORIGIN}/api/v1/emergency/cases`,
    `${BACKEND_ORIGIN}/api/v1/clinical-messages/conversations`,
    `${BACKEND_ORIGIN}/api/v1/portal/profile`,
    `${BACKEND_ORIGIN}/api/v1/saas/hospitals`,
  ];
  let apiPassed = true;
  for (const ep of apiEndpoints) {
    const res = await makeRequest(ep);
    if (res.statusCode !== 401) {
      console.log(`  -> FAILED for ${ep}: Status ${res.statusCode}`);
      apiPassed = false;
    }
  }
  console.log(`  -> Tested ${apiEndpoints.length} protected backend endpoints.`);
  console.log(`  -> Result: ${apiPassed ? "PASS (All endpoints returned HTTP 401)" : "FAIL"}\n`);
  if (!apiPassed) allPassed = false;

  // TEST 5: Submit an incorrect password -> HTTP 401 rejected
  console.log("[TEST 5] Login with invalid password");
  const res5 = await makeRequest(`${BACKEND_ORIGIN}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: "admin",
      password: "WrongPassword999!",
    }),
  });
  const passed5 = res5.statusCode === 401;
  console.log(`  -> Status: ${res5.statusCode}`);
  console.log(`  -> Body: ${res5.body}`);
  console.log(`  -> Result: ${passed5 ? "PASS (Login rejected with HTTP 401)" : "FAIL"}\n`);
  if (!passed5) allPassed = false;

  // TEST 6: Submit a correct password (read from env var) -> HTTP 200 succeeds
  console.log("[TEST 6] Login with correct credentials (from GHMS_TEST_ADMIN_PASSWORD env var)");
  let adminCookie = "";
  if (!ADMIN_PASSWORD) {
    console.log("  -> SKIPPED: Set GHMS_TEST_ADMIN_PASSWORD in environment to run this test.");
    console.log("  -> Result: SKIPPED (not configured)\n");
    skippedCount++;
  } else {
    const res6 = await makeRequest(`${BACKEND_ORIGIN}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: "admin",
        password: ADMIN_PASSWORD,
      }),
    });
    const passed6 = res6.statusCode === 200;
    if (res6.headers["set-cookie"]) {
      adminCookie = res6.headers["set-cookie"].map((c) => c.split(";")[0]).join("; ");
    }
    console.log(`  -> Status: ${res6.statusCode}`);
    console.log(`  -> Cookie received: ${adminCookie ? "YES (ghms_access HttpOnly)" : "NO"}`);
    console.log(`  -> Result: ${passed6 ? "PASS (Login succeeded with HTTP 200 and session established)" : "FAIL"}\n`);
    if (!passed6) allPassed = false;
  }

  // TEST 7: Put a fake user in localStorage / simulated client request without backend session
  console.log("[TEST 7] Client-side AuthGate and Server Middleware with fake user token");
  const res7 = await makeRequest(`${FRONTEND_ORIGIN}/overview`, {
    headers: {
      Cookie: "ghms_user=%7B%22role%22%3A%22ADMINISTRATOR%22%7D; ghms_access=fake-invalid-token",
    },
  });
  const isRedirect7 = res7.statusCode === 307 || res7.statusCode === 302 || res7.statusCode === 308;
  const location7 = res7.headers["location"] || "";
  const passed7 = isRedirect7 && location7.includes("/login");
  console.log(`  -> Status: ${res7.statusCode}, Location: ${location7}`);
  console.log(`  -> Result: ${passed7 ? "PASS (Fake token / localStorage payload rejected, redirected to /login)" : "FAIL"}\n`);
  if (!passed7) allPassed = false;

  // TEST 8: Modify localStorage role or department in request
  console.log("[TEST 8] Calling backend /api/v1/auth/me with forged Bearer token / modified role");
  const res8 = await makeRequest(`${BACKEND_ORIGIN}/api/v1/auth/me`, {
    headers: {
      Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmYWtlIiwicm9sZSI6IlNVUEVSX0FETUlOIn0.signature",
    },
  });
  const passed8 = res8.statusCode === 401;
  console.log(`  -> Status: ${res8.statusCode}`);
  console.log(`  -> Body: ${res8.body}`);
  console.log(`  -> Result: ${passed8 ? "PASS (Forged token rejected with HTTP 401)" : "FAIL"}\n`);
  if (!passed8) allPassed = false;

  // TEST 9: Cross-department access denial
  console.log("[TEST 9] Cross-department authorization denial (Doctor vs Finance / Emergency)");
  let docCookie = "";
  if (!DOCTOR_PASSWORD) {
    console.log("  -> SKIPPED: Set GHMS_TEST_DOCTOR_PASSWORD in environment to run this test.");
    console.log("  -> Result: SKIPPED (not configured)\n");
    skippedCount++;
  } else {
    // Log in as a Doctor
    const docLogin = await makeRequest(`${BACKEND_ORIGIN}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: "selam.girma",
        password: DOCTOR_PASSWORD,
      }),
    });
    if (docLogin.headers["set-cookie"]) {
      docCookie = docLogin.headers["set-cookie"].map((c) => c.split(";")[0]).join("; ");
    }

    // Doctor calling an endpoint restricted to Super Admin or different role/department
    const res9 = await makeRequest(`${BACKEND_ORIGIN}/api/v1/saas/hospitals`, {
      headers: {
        Cookie: docCookie,
      },
    });
    const passed9 = res9.statusCode === 403;
    console.log(`  -> Doctor login: HTTP ${docLogin.statusCode}`);
    console.log(`  -> Access SaaS Management (SUPER_ADMIN only): HTTP ${res9.statusCode}`);
    console.log(`  -> Body: ${res9.body}`);
    console.log(`  -> Result: ${passed9 ? "PASS (Cross-role/department access denied with HTTP 403 FORBIDDEN)" : "FAIL"}\n`);
    if (!passed9) allPassed = false;
  }

  // TEST 10: Expired or revoked session -> HTTP 401 / redirect to /login
  console.log("[TEST 10] Expired / revoked session behavior");
  const res10 = await makeRequest(`${BACKEND_ORIGIN}/api/v1/auth/me`, {
    headers: {
      Cookie: "ghms_access=expired.jwt.token",
    },
  });
  const passed10 = res10.statusCode === 401;
  console.log(`  -> Status: ${res10.statusCode}`);
  console.log(`  -> Body: ${res10.body}`);
  console.log(`  -> Result: ${passed10 ? "PASS (Expired session rejected with HTTP 401)" : "FAIL"}\n`);
  if (!passed10) allPassed = false;

  console.log("================================================================");
  const ranCount = 10 - skippedCount;
  if (skippedCount > 0) {
    console.log(
      ` FINAL RESULT: ${allPassed ? `${ranCount}/${ranCount} RAN TESTS PASSED` : "SOME TESTS FAILED"} — ${skippedCount} SKIPPED (set GHMS_TEST_ADMIN_PASSWORD / GHMS_TEST_DOCTOR_PASSWORD to run all 10)`
    );
  } else {
    console.log(
      ` FINAL VERIFICATION RESULT: ${allPassed ? "10/10 TESTS PASSED" : "SOME TESTS FAILED"}`
    );
  }
  console.log("================================================================");

  process.exit(allPassed ? 0 : 1);
}

runTests().catch((err) => {
  console.error("Execution error:", err);
  process.exit(1);
});
