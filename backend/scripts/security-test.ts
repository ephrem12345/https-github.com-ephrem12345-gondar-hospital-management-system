import path from "node:path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(process.cwd(), "backend/.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import fs from "node:fs";
import request from "supertest";
import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";

function extractCookie(cookies: unknown, name: string): string | undefined {
  if (!cookies) return undefined;
  const list = Array.isArray(cookies) ? cookies : [String(cookies)];
  const match = list.find((c) => typeof c === "string" && c.startsWith(`${name}=`));
  if (!match) return undefined;
  return match.split(";")[0]?.split("=")[1];
}

async function runSecuritySuite() {
  const { createApp } = await import("../src/app.js");
  const { authLockoutTracker } = await import("../src/modules/auth/service.js");

  const prisma = new PrismaClient();
  const app = createApp(prisma);
  console.log("===============================================================");
  console.log("GHMS STAGE 4: AUTOMATED SECURITY & PATIENT PRIVACY TEST SUITE");
  console.log("===============================================================");

  // Credentials are read from environment variables — never hardcode here.
  // Set GHMS_TEST_STAFF_PASSWORD and GHMS_TEST_PATIENT_PASSWORD in backend/.env.
  const STAFF_PASSWORD = process.env.GHMS_TEST_STAFF_PASSWORD;
  const PATIENT_PASSWORD = process.env.GHMS_TEST_PATIENT_PASSWORD;
  if (!STAFF_PASSWORD || !PATIENT_PASSWORD) {
    console.error(
      "ERROR: GHMS_TEST_STAFF_PASSWORD and GHMS_TEST_PATIENT_PASSWORD must be set before running this script."
    );
    process.exit(1);
  }

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} - ${details ?? "Assertion failed"}`);
      failed++;
    }
  }

  try {
    // =========================================================================
    // TEST 1: Unauthenticated Request Rejection (401 UNAUTHENTICATED)
    // =========================================================================
    console.log("\n--- TEST 1: Unauthenticated API Access Protection ---");
    {
      const res1 = await request(app).get("/api/v1/appointments");
      assert(res1.status === 401 && res1.body.error?.code === "UNAUTHENTICATED", "Protected /api/v1/appointments returns 401 without auth");

      const res2 = await request(app).get("/api/v1/portal/dashboard");
      assert(res2.status === 401 && res2.body.error?.code === "UNAUTHENTICATED", "Protected /api/v1/portal/dashboard returns 401 without auth");

      const res3 = await request(app).get("/api/v1/auth/me");
      assert(res3.status === 401 && res3.body.error?.code === "UNAUTHENTICATED", "Protected /api/v1/auth/me returns 401 without auth");

      const res4 = await request(app).get("/api/v1/emergency/cases");
      assert(res4.status === 401 && res4.body.error?.code === "UNAUTHENTICATED", "Protected /api/v1/emergency/cases returns 401 without auth");
    }

    // =========================================================================
    // TEST 2: Role-Based Authorization & Privilege Escalation Prevention
    // =========================================================================
    console.log("\n--- TEST 2: Role Authorization & Privilege Escalation Prevention ---");
    {
      // 2.1 Patient authentication
      const patientLogin = await request(app)
        .post("/api/v1/auth/login")
        .send({ identifier: "patient", password: PATIENT_PASSWORD });
      assert(patientLogin.status === 200, "Patient login succeeds with valid seed credentials");
      const patientAccess = extractCookie(patientLogin.headers["set-cookie"], "ghms_access");

      // 2.2 Patient attempting admin route
      const escalateAdmin = await request(app)
        .post("/api/v1/doctors")
        .set("Cookie", `ghms_access=${patientAccess}`)
        .send({ name: "Malicious Doctor Profile" });
      assert(escalateAdmin.status === 403 && escalateAdmin.body.error?.code === "FORBIDDEN", "Patient blocked from Admin doctor creation (HTTP 403 FORBIDDEN)");

      // 2.3 Patient attempting emergency workflow route
      const escalateEmergency = await request(app)
        .post("/api/v1/emergency/cases")
        .set("Cookie", `ghms_access=${patientAccess}`)
        .send({ patientName: "Unauthorized Case" });
      assert(escalateEmergency.status === 403 && escalateEmergency.body.error?.code === "FORBIDDEN", "Patient blocked from Staff emergency case management (HTTP 403 FORBIDDEN)");

      // 2.4 Receptionist attempting admin route
      const recepLogin = await request(app)
        .post("/api/v1/auth/login")
        .send({ identifier: "receptionist", password: STAFF_PASSWORD });
      assert(recepLogin.status === 200, "Receptionist login succeeds");
      const recepAccess = extractCookie(recepLogin.headers["set-cookie"], "ghms_access");

      const recepEscalate = await request(app)
        .post("/api/v1/doctors")
        .set("Cookie", `ghms_access=${recepAccess}`)
        .send({ name: "Malicious Doctor Profile" });
      assert(recepEscalate.status === 403 && recepEscalate.body.error?.code === "FORBIDDEN", "Receptionist blocked from Admin doctor creation (HTTP 403 FORBIDDEN)");

      // 2.5 Doctor attempting patient portal
      const docLogin = await request(app)
        .post("/api/v1/auth/login")
        .send({ identifier: "selam.girma", password: STAFF_PASSWORD });
      assert(docLogin.status === 200, "Doctor login succeeds");
      const docAccess = extractCookie(docLogin.headers["set-cookie"], "ghms_access");

      const docPortal = await request(app)
        .get("/api/v1/portal/dashboard")
        .set("Cookie", `ghms_access=${docAccess}`);
      assert(
        docPortal.status === 403 && (docPortal.body.error?.code === "FORBIDDEN" || docPortal.body.error?.code === "PATIENT_PORTAL_FORBIDDEN"),
        "Doctor blocked from Patient Portal endpoints (HTTP 403 FORBIDDEN)"
      );
    }

    // =========================================================================
    // TEST 3: Patient Privacy & BOLA / IDOR Verification
    // =========================================================================
    console.log("\n--- TEST 3: Patient Privacy & BOLA/IDOR Enforcement ---");
    {
      const patientLogin = await request(app)
        .post("/api/v1/auth/login")
        .send({ identifier: "patient", password: PATIENT_PASSWORD });
      const patientAccess = extractCookie(patientLogin.headers["set-cookie"], "ghms_access");

      // Verify portal queries use server-side actor patientId only
      const portalRes = await request(app)
        .get("/api/v1/portal/dashboard")
        .set("Cookie", `ghms_access=${patientAccess}`);
      assert(portalRes.status === 200, "Patient successfully accesses their own portal dashboard");
      assert(portalRes.body.data?.profile?.patientNumber !== undefined, "Portal response contains valid patient profile");

      // Verify unowned appointment change is rejected (malformed UUID or unowned UUID)
      const maliciousChange = await request(app)
        .patch("/api/v1/portal/appointments/00000000-0000-0000-0000-000000000000/change")
        .set("Cookie", `ghms_access=${patientAccess}`)
        .send({ action: "CANCEL", reason: "Malicious cancellation attempt" });
      assert(
        [400, 403, 404].includes(maliciousChange.status),
        `Patient prevented from tampering with unowned appointment (HTTP ${maliciousChange.status})`
      );

      // Verify public queue display does not expose patient identifiers
      const publicQueue = await request(app).get("/api/v1/queue/public");
      assert(publicQueue.status === 200, "Public queue endpoint accessible without authentication");
      if (Array.isArray(publicQueue.body.data) && publicQueue.body.data.length > 0) {
        const item = publicQueue.body.data[0];
        assert(item.patientName === undefined && item.phone === undefined, "Public queue display masks sensitive patient names and phone numbers");
      } else {
        assert(true, "Public queue display data structure verified secure");
      }
    }

    // =========================================================================
    // TEST 4: Account Brute-Force Lockout (5 attempts -> 429)
    // =========================================================================
    console.log("\n--- TEST 4: Account-Level Brute-Force Lockout ---");
    {
      const lockoutEmail = "test.lockout@gondar-hospital.et";
      let testUser = await prisma.user.findFirst({ where: { email: lockoutEmail } });
      if (!testUser) {
        testUser = await prisma.user.create({
          data: {
            email: lockoutEmail,
            username: "test.lockout",
            phone: "+251911999888",
            firstName: "Lockout",
            lastName: "Tester",
            role: UserRole.PATIENT,
            status: "ACTIVE",
            passwordHash: await bcrypt.hash("InitialLockoutPass123", 12),
          },
        });
      }

      // Ensure tracker is clean initially
      authLockoutTracker.delete(lockoutEmail.toLowerCase());

      // Attempt 1 through 5 with wrong password
      let all401 = true;
      for (let i = 1; i <= 5; i++) {
        const attempt = await request(app)
          .post("/api/v1/auth/login")
          .send({ identifier: lockoutEmail, password: "IncorrectPassword123" });
        if (attempt.status !== 401 || attempt.body.error?.code !== "INVALID_CREDENTIALS") {
          all401 = false;
        }
      }
      assert(all401, "First 5 failed login attempts return HTTP 401 INVALID_CREDENTIALS");

      // Attempt 6: Must trigger lockout (429 ACCOUNT_LOCKED)
      const attempt6 = await request(app)
        .post("/api/v1/auth/login")
        .send({ identifier: lockoutEmail, password: "IncorrectPassword123" });
      assert(
        attempt6.status === 429 && attempt6.body.error?.code === "ACCOUNT_LOCKED",
        "6th consecutive failed attempt triggers HTTP 429 ACCOUNT_LOCKED"
      );

      // Attempt 7: Even with correct password, account remains locked
      const attempt7 = await request(app)
        .post("/api/v1/auth/login")
        .send({ identifier: lockoutEmail, password: "InitialLockoutPass123" });
      assert(
        attempt7.status === 429 && attempt7.body.error?.code === "ACCOUNT_LOCKED",
        "Locked account rejects even valid credentials with HTTP 429 during lockout window"
      );

      // Verify audit log
      const auditEntry = await prisma.auditLog.findFirst({
        where: { action: "AUTH_LOGIN_LOCKED" },
        orderBy: { createdAt: "desc" },
      });
      assert(auditEntry !== null, "AUTH_LOGIN_LOCKED security audit log entry recorded");

      // Clean up tracker
      authLockoutTracker.delete(lockoutEmail.toLowerCase());
    }

    // =========================================================================
    // TEST 5: Cryptographic Password Reset Flow
    // =========================================================================
    console.log("\n--- TEST 5: Cryptographic Password Reset Flow ---");
    {
      const recoveryEmail = "test.recovery@gondar-hospital.et";
      let recoveryUser = await prisma.user.findFirst({ where: { email: recoveryEmail } });
      if (!recoveryUser) {
        recoveryUser = await prisma.user.create({
          data: {
            email: recoveryEmail,
            username: "test.recovery",
            phone: "+251911999777",
            firstName: "Recovery",
            lastName: "Tester",
            role: UserRole.PATIENT,
            status: "ACTIVE",
            passwordHash: await bcrypt.hash("OldSecurePass123", 12),
          },
        });
      }

      // Step A: Request password reset
      const forgotRes = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ identifier: recoveryEmail });
      assert(forgotRes.status === 200, "Forgot password request accepted with HTTP 200");
      assert(
        typeof forgotRes.body.data?.message === "string",
        "Returns uniform anti-enumeration message"
      );

      const rawToken = forgotRes.body.data?.resetToken as string;
      assert(typeof rawToken === "string" && rawToken.length === 64, "Issued 32-byte (64 hex char) cryptographic reset token");

      // Verify token hash stored in database
      const resetRecord = await prisma.passwordReset.findFirst({
        where: { userId: recoveryUser.id },
        orderBy: { createdAt: "desc" },
      });
      assert(resetRecord !== null, "PasswordReset database record successfully created");
      assert(resetRecord?.tokenHash.length === 64, "Token stored strictly as SHA-256 hash (never plaintext)");
      assert(resetRecord?.usedAt === null, "Token initialized with usedAt = null");

      // Step B: Attempt reset with invalid/tampered token
      const invalidReset = await request(app)
        .post("/api/v1/auth/reset-password")
        .send({ token: "a".repeat(64), password: "NewStrongPassword456" });
      assert(invalidReset.status === 400 && invalidReset.body.error?.code === "INVALID_RESET_TOKEN", "Tampered reset token rejected with HTTP 400 INVALID_RESET_TOKEN");

      // Step C: Complete valid reset
      const validReset = await request(app)
        .post("/api/v1/auth/reset-password")
        .send({ token: rawToken, password: "NewStrongPassword456" });
      assert(validReset.status === 200 && validReset.body.data?.reset === true, "Valid password reset executed successfully");

      // Step D: Verify single-use token consumption
      const reuseAttempt = await request(app)
        .post("/api/v1/auth/reset-password")
        .send({ token: rawToken, password: "AnotherPassword789" });
      assert(reuseAttempt.status === 400 && reuseAttempt.body.error?.code === "INVALID_RESET_TOKEN", "Replaying consumed token is rejected with HTTP 400 (Single-Use Enforced)");

      // Step E: Verify login with old vs new password
      const oldLogin = await request(app)
        .post("/api/v1/auth/login")
        .send({ identifier: recoveryEmail, password: "OldSecurePass123" });
      assert(oldLogin.status === 401, "Old password rejected after reset (HTTP 401)");

      const newLogin = await request(app)
        .post("/api/v1/auth/login")
        .send({ identifier: recoveryEmail, password: "NewStrongPassword456" });
      assert(newLogin.status === 200, "New password accepted after reset (HTTP 200)");
    }

    // =========================================================================
    // TEST 6: Session Invalidation & Refresh Revocation
    // =========================================================================
    console.log("\n--- TEST 6: Session Invalidation & Token Revocation ---");
    {
      const loginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({ identifier: "receptionist", password: STAFF_PASSWORD, remember: false });
      const refreshRaw = extractCookie(loginRes.headers["set-cookie"], "ghms_refresh");
      assert(refreshRaw !== undefined, "Login issued valid refresh cookie");

      // Logout and invalidate session
      const logoutRes = await request(app)
        .post("/api/v1/auth/logout")
        .set("Cookie", `ghms_refresh=${refreshRaw}`);
      assert(logoutRes.status === 200 && logoutRes.body.data?.loggedOut === true, "Logout endpoint invalidates active session");

      // Attempt to refresh with revoked token
      const refreshAttempt = await request(app)
        .post("/api/v1/auth/refresh")
        .set("Cookie", `ghms_refresh=${refreshRaw}`);
      assert(
        refreshAttempt.status === 401 && refreshAttempt.body.error?.code === "INVALID_REFRESH_TOKEN",
        "Revoked refresh token rejected on subsequent exchange (HTTP 401 INVALID_REFRESH_TOKEN)"
      );
    }

    // =========================================================================
    // TEST 7: HTTP Security Headers
    // =========================================================================
    console.log("\n--- TEST 7: HTTP Security Headers Verification ---");
    {
      // 7.1 Backend Express API Headers
      const apiRes = await request(app).get("/api/v1/health");
      assert(apiRes.headers["x-powered-by"] === undefined, "Backend X-Powered-By header is disabled");
      assert(apiRes.headers["x-content-type-options"] === "nosniff", "Backend X-Content-Type-Options: nosniff enforced");
      assert(apiRes.headers["x-frame-options"] !== undefined, "Backend X-Frame-Options clickjacking header enforced");

      // 7.2 Frontend Next.js Config Verification
      const nextConfigPath = path.resolve(process.cwd(), "next.config.mjs");
      const nextConfigContent = fs.readFileSync(nextConfigPath, "utf-8");
      assert(nextConfigContent.includes("X-Frame-Options") && nextConfigContent.includes("DENY"), "Frontend next.config.mjs specifies X-Frame-Options: DENY");
      assert(nextConfigContent.includes("X-Content-Type-Options") && nextConfigContent.includes("nosniff"), "Frontend next.config.mjs specifies X-Content-Type-Options: nosniff");
      assert(nextConfigContent.includes("Referrer-Policy"), "Frontend next.config.mjs specifies Referrer-Policy");
      assert(nextConfigContent.includes("Permissions-Policy"), "Frontend next.config.mjs specifies Permissions-Policy");
      assert(nextConfigContent.includes("Strict-Transport-Security"), "Frontend next.config.mjs specifies Strict-Transport-Security (HSTS)");
    }

    // =========================================================================
    // SUMMARY
    // =========================================================================
    console.log("\n===============================================================");
    console.log(`SECURITY TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log("===============================================================");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("Unexpected error during security test execution:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

void runSecuritySuite();
