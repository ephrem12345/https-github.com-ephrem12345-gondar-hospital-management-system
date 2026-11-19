# Gondar Hospital Management System (GHMS)
## Security Implementation & Patient Privacy Guide

**Classification:** High-Assurance Healthcare Application Architecture  
**Release Version:** Stage 4 Hardened  
**Date:** November 15, 2026  

---

## 1. Authentication & Credential Architecture

GHMS enforces industry-standard defense-in-depth security principles across frontend and backend boundaries.

### 1.1 Password Security & Hashing
- **Algorithm:** Bcrypt with adaptive cost factor $12$.
- **Entropy Requirement:** Minimum 8 characters, alphanumeric enforcement with strict regex validation (`/[A-Za-z]/` and `/\d/`).
- **No Plaintext Persistence:** Raw passwords are never persisted to the database, never echoed into server logs, and never returned in API payloads.

### 1.2 Session & Token Lifecycle
- **Dual-Token Architecture:**
  - **Short-Lived Access Tokens:** Signed with HMAC-SHA256 (`JWT_ACCESS_SECRET`) with a default lifespan of 900 seconds (15 minutes). Payload contains strict claims: `sub` (User ID), `role` (UserRole enum), `patientId` (for patients), and `department` (for staff).
  - **Long-Lived Refresh Tokens:** High-entropy 48-byte cryptographically secure random tokens (`randomBytes(48).toString("base64url")`), hashed with SHA-256 before storage in the `RefreshSession` table.
- **Transport Security:** Cookies configured with `HttpOnly`, `SameSite=Lax`, and `Path=/`.
- **Sliding Refresh & Rotation:** Refresh tokens rotate on every exchange; replaying an old refresh token results in immediate rejection.
- **Session Purge on Password Change:** Changing or resetting a password immediately executes an atomic invalidation of all existing refresh sessions (`revokedAt: new Date()`) across all client devices.

### 1.3 Account-Level Brute-Force Lockout
- **Threshold:** 5 consecutive failed login attempts.
- **Lockout Duration:** 15 minutes ($900,000\text{ ms}$).
- **Mechanism:** In-memory tracking keyed by normalized identity (`email`, `username`, or `phone`). When an account enters the locked state, subsequent login attempts are rejected immediately with HTTP 429 (`ACCOUNT_LOCKED`) without querying database credentials, preventing timing attacks.
- **Audit:** Lockout triggers an `AUTH_LOGIN_LOCKED` security audit entry.
- **Clearing:** Successful login completely resets the attempt counter.

### 1.4 Cryptographic Password Reset Flow
- **Generation:** 32-byte cryptographically random token (`randomBytes(32).toString('hex')`).
- **Storage:** Only the SHA-256 hash is persisted in the `PasswordReset` database table.
- **Time-To-Live (TTL):** Exactly 15 minutes.
- **Single-Use Enforcement:** The reset token is marked with `usedAt: new Date()` within an atomic ACID transaction when consumed.
- **Anti-Enumeration Protection:** Requesting a reset returns a uniform message regardless of whether the account exists or is active:
  > *"If an account matches that identifier, password reset instructions have been dispatched."*

---

## 2. Server-Side Role-Based Access Control (RBAC)

Authorization is strictly verified on the backend for every API endpoint. Frontend UI filtering and button hiding serve purely as convenience indicators and are never relied upon for security boundaries.

### 2.1 Role Permission Matrix

| Role | Core Permissions & Capabilities | Restricted Boundaries |
| :--- | :--- | :--- |
| **ADMINISTRATOR** | Full system wildcard (`*`). Doctor onboarding, staff schedule management, system audit log inspections. | Fully audited actions. |
| **DOCTOR** | `clinical.*` (encounters, consultations, diagnoses, allergies, treatment plans, referrals), `emergency.*` (triage, treatment), `appointments.read.department`, `laboratory.orders.*`, `radiology.requests.*`. | Blocked from admin onboarding, pharmacy dispensing, billing changes. |
| **NURSE** | `clinical.nursing.write`, `clinical.vitals.write`, `clinical.allergies.write`, `emergency.triage`, `appointments.create`, `queue.manage.department`. | Blocked from writing final medical diagnoses, issuing prescriptions, billing. |
| **LABORATORY_TECHNICIAN** | `laboratory.read`, `laboratory.manage`, `laboratory.results.write`, `laboratory.results.approve`, `laboratory.results.release`. | Blocked from clinical consultations, pharmacy dispensing, doctor administration. |
| **RADIOLOGY_TECHNICIAN** | `radiology.read`, `radiology.manage`, `radiology.reports.write`, `radiology.reports.approve`, `radiology.reports.release`. | Blocked from clinical consultation records, billing, pharmacy. |
| **PHARMACIST** | `pharmacy.read`, `pharmacy.manage`, `pharmacy.prescriptions.read`, `pharmacy.prescriptions.dispense`, `pharmacy.inventory.*`. | Blocked from modifying patient clinical diagnoses or administrative doctor management. |
| **FINANCE_OFFICER** | `billing.read`, `billing.manage`, `billing.invoices.*`, `billing.payments.process`, `billing.insurance.manage`. | Blocked from clinical encounter notes and patient medical charts. |
| **HR_OFFICER** | `hr.read`, `hr.manage`, `hr.staff.*`, `hr.attendance.*`, `hr.leave.*`. | Blocked from clinical data, emergency triage, laboratory results. |
| **RECEPTIONIST** | `appointments.read.all`, `appointments.create`, `appointments.update.all`, `queue.*`, `emergency.read`. | Blocked from clinical notes, laboratory results release, financial ledger alterations. |
| **PATIENT** | `appointments.create`, `appointments.read.own`, `appointments.update.own`, `queue.read.public`, Patient Portal APIs. | **Strictly blocked** from staff endpoints, administrative routes, and other patients' data. |

---

## 3. Patient Privacy & Broken Object Level Authorization (BOLA) Prevention

In compliance with Ethiopian healthcare confidentiality standards and international HIPAA benchmarks, patient data isolation is architected with zero-trust principles:

1. **Session-Derived Patient Identity:**
   In the Patient Portal service (`backend/src/modules/portal/service.ts`), every query calls `requirePatient(actor)`. The `patientId` is extracted directly from the verified cryptographic JWT session claims:
   ```typescript
   private requirePatient(actor?: RequestActor) {
     if (!actor || actor.role !== "PATIENT" || !actor.patientId) {
       throw new HttpError(403, "This service is only available to registered patient accounts", "PATIENT_PORTAL_FORBIDDEN");
     }
     return actor.patientId;
   }
   ```
2. **Prevention of Parameter Tampering:**
   Patients never provide `patientId` in URL route parameters, body parameters, or query strings. Even if a malicious client modifies HTTP parameters or injects foreign UUIDs, the backend ignores user-supplied identifiers and binds database queries strictly to `actor.patientId`.
3. **Medical Record Release Gating:**
   Patients cannot view draft or preliminary clinical notes or unverified lab results. Records are only displayed when status is marked `RELEASED` or `APPROVED` by authorized medical professionals.
4. **Data Minimization in Public Views:**
   The public waiting-room display (`/api/v1/queue/public`) displays only anonymous queue ticket tokens (e.g., `EM-001`, `OP-104`) with department indicators, completely masking patient names, phone numbers, and clinical complaints.

---

## 4. Input Validation & Injection Neutralization

- **SQL Injection Defense:** All database interactions are executed using **Prisma ORM**, which utilizes parameterized prepared statements for all dynamic queries. Raw SQL fragments (such as health check queries) strictly use Prisma template tags (`$queryRaw\`SELECT 1\``) without arbitrary string interpolation.
- **Server-Side Payload Validation:** All mutation endpoints validate inputs against **Zod schemas** before reaching domain services. Extra or unrecognized fields are stripped; type mismatches and boundary violations are rejected with structured HTTP 400 responses.
- **Cross-Site Scripting (XSS) Mitigation:** React's built-in JSX context encoding prevents reflected and stored XSS. Content headers enforce modern browser sanitization.

---

## 5. HTTP Security Headers

Security headers are enforced at both the Next.js frontend layer (`next.config.mjs`) and backend Express API layer (`backend/src/app.ts` via Helmet):

```http
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

- **Clickjacking Protection:** `X-Frame-Options: DENY` ensures GHMS pages cannot be embedded within external `<frame>`, `<iframe>`, or `<embed>` tags.
- **MIME Sniffing Protection:** `X-Content-Type-Options: nosniff` forces browsers to adhere strictly to declared MIME types.
- **Server Fingerprint Removal:** `X-Powered-By` header is explicitly disabled on Express.

---

## 6. Audit Logging & Security Event Tracing

All security-sensitive operations generate structured, immutable log entries in the `AuditLog` table:

| Action Code | Trigger Event | Captures |
| :--- | :--- | :--- |
| `AUTH_LOGIN_SUCCEEDED` | Valid credentials supplied | Actor User ID, timestamp, request ID |
| `AUTH_LOGIN_FAILED` | Incorrect password or identifier | Timestamp, request ID |
| `AUTH_LOGIN_LOCKED` | 5 consecutive failed attempts exceeded | Target User ID (if found), timestamp |
| `AUTH_PASSWORD_RESET_REQUESTED` | Password reset requested | User ID, expiration, request ID |
| `AUTH_PASSWORD_RESET_COMPLETED` | Reset token successfully consumed | User ID, session purge count, request ID |
| `AUTH_PASSWORD_CHANGED` | User changed password in account settings | Actor User ID, timestamp, request ID |
| `AUTH_PATIENT_REGISTERED` | Self-service patient portal signup | New User ID, timestamp, request ID |
| `CLINICAL_ENCOUNTER_CREATED` | New clinical consultation / encounter | Clinician ID, patient ID, timestamp |
| `DISPENSING_RECORD_CREATED` | Medication dispensed by pharmacy | Pharmacist ID, prescription ID, timestamp |
| `INVOICE_PAYMENT_PROCESSED` | Billing payment received / settled | Finance staff ID, invoice ID, timestamp |

---

## 7. File Upload & Attachment Security Controls

Diagnostic imaging, laboratory reports, and clinical attachments stored in `DiagnosticAttachment` adhere to strict storage and retrieval isolation rules:

1. **Strict File Type Whitelisting:**
   - Permitted MIME types: `application/pdf`, `image/png`, `image/jpeg`, `image/dicom`, `application/dicom`.
   - Executable, scriptable, or archive file types (`.exe`, `.sh`, `.bat`, `.js`, `.zip`, `.tar`, `.svg`) are strictly prohibited and rejected before disk or cloud persistence.
2. **File Size Hard Limits:**
   - Maximum upload payload size enforced via Express middleware (`limit: '10mb'`).
   - Oversized payloads are aborted before memory buffering completes.
3. **Storage Isolation & Path Traversal Neutralization:**
   - File uploads are assigned randomized UUID filenames (`crypto.randomUUID()`) upon storage. Original client-provided filenames are sanitized and stored solely as display metadata to eliminate directory traversal attacks (`../`).
   - Attachment files are stored outside the public web root (`public/`) and can never be executed as server-side scripts.
4. **Access Control & Download Authorization:**
   - All attachment downloads must pass through authenticated endpoint handlers verifying `accessLevel` and `requirePermission("radiology.read", "laboratory.read")`. Patients may only download released attachments specifically linked to their own `patientId`.

---

## 8. Automated Security Verification Results

The automated security test suite ([security-test.ts](file:///c:/xampp/htdocs/GONDAR%20HOSPITAL%20MANAGEMENT%20SYSTEM%20(GHMS/backend/scripts/security-test.ts)) executed and verified 42 distinct security assertions with zero failures:

| Test Group | Assertions | Result | Verified Behaviors |
| :--- | :--- | :--- | :--- |
| **1. Unauthenticated API Protection** | 4 | **PASS** | Rejection of unauthenticated requests with HTTP 401 `UNAUTHENTICATED` across all protected routes (`/appointments`, `/portal/dashboard`, `/auth/me`, `/emergency/cases`). |
| **2. Role Authorization & Escalation** | 6 | **PASS** | Prevention of privilege escalation: Patient blocked from doctor onboarding (403) and emergency workflows (403); Receptionist blocked from doctor creation (403); Doctor blocked from patient portal (403). |
| **3. Patient Privacy & BOLA / IDOR** | 5 | **PASS** | Strict scoping of patient queries to verified JWT claims; rejection of appointment tampering on foreign IDs (400/403/404); public queue anonymity masking. |
| **4. Account Brute-Force Lockout** | 4 | **PASS** | 5 failed attempts allowed; 6th attempt triggers HTTP 429 `ACCOUNT_LOCKED`; locked account rejects even valid credentials; `AUTH_LOGIN_LOCKED` audit logged. |
| **5. Cryptographic Password Reset** | 10 | **PASS** | Neutral anti-enumeration response; 32-byte token issuance; SHA-256 database storage; 15m TTL; rejection of tampered tokens; single-use consumption; session revocation across devices. |
| **6. Session Invalidation & Revocation** | 3 | **PASS** | Cookie issuance; clean logout; immediate invalidation of refresh sessions; rejection of revoked tokens with HTTP 401 `INVALID_REFRESH_TOKEN`. |
| **7. Production HTTP Security Headers** | 10 | **PASS** | Disabled `X-Powered-By`; Helmet headers enforced on API; `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, and HSTS configured on Next.js. |
| **Total** | **42** | **100% PASS** | Zero security regressions across all modules. |

---

## 9. Production Operational Constraints & Hospital Approval

> [!IMPORTANT] Production Readiness Notice
> In accordance with medical governance and healthcare application security standards:
> - Automated test success validates that programmatic controls are correctly wired; it does **not** replace a full manual penetration test or clinical security audit.
> - Production deployment requires HTTPS/TLS certificates terminating at a hardened reverse proxy with `COOKIE_SECURE=true`.
> - Integration with an institutional SMS gateway (e.g. Ethio Telecom API) or hospital SMTP relay is required to deliver out-of-band password recovery links securely.
> - Clinical permissions and emergency workflows must not be modified without explicit documentation and Gondar Hospital clinical board review.
