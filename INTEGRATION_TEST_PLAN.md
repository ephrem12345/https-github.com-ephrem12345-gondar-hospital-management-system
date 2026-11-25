# Gondar Hospital Management System (GHMS)
## Stage 5: Full-Stack Integration Test Plan

**Document Version:** 1.0  
**Date:** November 15, 2026  
**Auditor / QA Specialist:** Senior Full-Stack Integration Engineer & QA Specialist  
**System Scope:** Next.js 15 (Port 3002), Node.js / Express API (Port 4000), Prisma ORM, MySQL Database (`ghms`, 85 Tables)  
**Classification:** Confidential — Hospital Integration & System Verification  

---

## 1. System Architecture & Inspection Baseline

A comprehensive inspection of the GHMS codebase was performed across frontend, backend, database, and security layers:

```
+----------------------------------------------------------------------------------------------------+
|                                      FULL-STACK TOPOLOGY                                           |
+----------------------------------------------------------------------------------------------------+
| FRONTEND (Next.js 15, React 19, TypeScript, Tailwind CSS, Lucide Icons, Recharts, i18n EN/AM)      |
|   - Port: 3002                                                                                     |
|   - Entry: Landing Page (/) -> 7 Role Cards (Admin, Doctor, Nurse, Lab, Pharma, Recep, Patient)    |
|   - Auth Routes: /login, /register, /forgot-password, /reset-password                              |
|   - Staff Workspace: /overview, /appointments, /queue, /emergency, /clinical, /diagnostics,        |
|                      /pharmacy, /inpatient, /billing, /hr, /admin                                  |
|   - Patient Portal: /patient-portal/[overview | appointments | records | billing | support]        |
|   - API Client: src/services/api-client.ts (HttpOnly Cookie, Bearer fallback, Token Refresh)       |
+----------------------------------------------------------------------------------------------------+
                                           | HTTP / REST (JSON)
                                           v
+----------------------------------------------------------------------------------------------------+
| BACKEND API (Express 5, TypeScript, tsx, Zod 4, Helmet, Pino, Rate-Limit, JWT, Bcrypt 12)          |
|   - Port: 4000 (Base URL: /api/v1)                                                                 |
|   - Middleware: authenticate (JWT verify), requireRole, requirePermission, rateLimit, errorHandler  |
|   - Modules: /auth, /appointments, /doctors, /queue, /emergency, /departments, /portal             |
+----------------------------------------------------------------------------------------------------+
                                           | Prisma ORM (Parameterized Prepared Statements)
                                           v
+----------------------------------------------------------------------------------------------------+
| DATABASE (MySQL 8.0 / InnoDB Engine, utf8mb4)                                                      |
|   - 85 Normalized Tables covering all clinical, diagnostic, pharmaceutical, financial, and admin   |
|   - Seeded synthetic accounts across all 8 roles (via GHMS_SEED_* environment variables)          |
|   - ACID Transactions, Composite Unique Keys, Foreign Key Restrict & SetNull Integrity             |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. API Endpoints & Frontend Connection Mapping

The table below maps frontend service layers to the real backend API endpoints:

| Domain | Frontend Service / Screen | Backend Endpoint | HTTP Method | Auth Guard | Backend Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Auth** | `src/services/index.ts` (`authService.login`) | `/api/v1/auth/login` | POST | Public + RateLimit | Connected & Verified |
| **Auth** | `src/app/(auth)/register/page.tsx` | `/api/v1/auth/register` | POST | Public + RateLimit | Connected & Verified |
| **Auth** | `src/app/(auth)/forgot-password/page.tsx` | `/api/v1/auth/forgot-password` | POST | Public + RateLimit | Connected & Verified |
| **Auth** | `src/app/(auth)/reset-password/page.tsx` | `/api/v1/auth/reset-password` | POST | Public + RateLimit | Connected & Verified |
| **Auth** | `src/services/index.ts` (`authService.logout`) | `/api/v1/auth/logout` | POST | Authenticated | Connected & Verified |
| **Auth** | `src/services/index.ts` (`authService.me`) | `/api/v1/auth/me` | GET | Authenticated | Connected & Verified |
| **Appointments** | `src/services/backend-services.ts` (`appointmentBackendApi.list`) | `/api/v1/appointments` | GET | `appointments.read.*` | Connected & Verified |
| **Appointments** | `src/services/backend-services.ts` (`appointmentBackendApi.create`) | `/api/v1/appointments` | POST | `appointments.create` | Connected & Verified |
| **Appointments** | `src/services/backend-services.ts` (`appointmentBackendApi.updateStatus`) | `/api/v1/appointments/:id/status` | PATCH | `appointments.update.*` | Connected & Verified |
| **Doctors** | `src/services/backend-services.ts` (`appointmentBackendApi.doctorAvailability`) | `/api/v1/doctors/availability` | GET | `doctors.read` | Connected & Verified |
| **Queue** | `src/services/backend-services.ts` (`appointmentBackendApi.listQueue`) | `/api/v1/queue` | GET | `queue.read.*` | Connected & Verified |
| **Queue** | `src/services/backend-services.ts` (`appointmentBackendApi.callNextPatient`) | `/api/v1/queue/call-next` | POST | `queue.manage.*` | Connected & Verified |
| **Queue Public** | Public Waiting Room Component | `/api/v1/queue/public` | GET | Public (Masked PII) | Connected & Verified |
| **Emergency** | `src/services/backend-services.ts` (`emergencyBackendApi.listCases`) | `/api/v1/emergency/cases` | GET | `emergency.read` | Connected & Verified |
| **Emergency** | `src/services/backend-services.ts` (`emergencyBackendApi.register`) | `/api/v1/emergency/cases` | POST | `emergency.manage` | Connected & Verified |
| **Emergency** | `src/services/backend-services.ts` (`emergencyBackendApi.recordTriage`) | `/api/v1/emergency/cases/:caseNumber/triage` | POST | `emergency.triage` | Connected & Verified |
| **Emergency** | `src/services/backend-services.ts` (`emergencyBackendApi.transition`) | `/api/v1/emergency/cases/:caseNumber/transitions` | POST | `emergency.manage` | Connected & Verified |
| **Patient Portal** | `src/services/patient-portal.ts` (`httpApiInstance.getProfile`) | `/api/v1/portal/profile` | GET | `PATIENT` only | Connected & Verified |
| **Patient Portal** | `src/services/patient-portal.ts` (`httpApiInstance.listAppointments`) | `/api/v1/portal/appointments` | GET | `PATIENT` only | Connected & Verified |
| **Patient Portal** | `src/services/patient-portal.ts` (`httpApiInstance.requestAppointment`) | `/api/v1/portal/appointments` | POST | `PATIENT` only | Connected & Verified |
| **Patient Portal** | `src/services/patient-portal.ts` (`httpApiInstance.listReleasedRecords`) | `/api/v1/portal/medical-records` | GET | `PATIENT` only | Connected & Verified |
| **Patient Portal** | `src/services/patient-portal.ts` (`httpApiInstance.listInvoices`) | `/api/v1/portal/billing` | GET | `PATIENT` only | Connected & Verified |

---

## 3. Workflow Test Specifications

### Workflow 1: Patient Self-Registration & Verification
- **Actors:** Synthetic Patient (`almaz.worku@example.com`).
- **Steps:**
  1. Submit registration form with valid contact and demographics.
  2. Verify database insertion in `User` and `Patient` tables (`GHMS-XXXXXX` generated, status `PENDING`).
  3. Verify Bcrypt password hash created with cost factor 12.
  4. Verify audit log entry `AUTH_PATIENT_REGISTERED`.

### Workflow 2: Staff-Assisted Appointment Scheduling & Doctor Assignment
- **Actors:** Receptionist (`receptionist`), Doctor (`selam.girma`).
- **Steps:**
  1. Authenticate as Receptionist.
  2. Query active doctors and availability schedules (`GET /api/v1/doctors/availability`).
  3. Book appointment for patient with assigned doctor (`POST /api/v1/appointments`).
  4. Verify database row created in `Appointment` with status `SCHEDULED`.
  5. Check-in patient into department queue (`POST /api/v1/queue/check-in`).
  6. Verify `DepartmentQueue` entry created with unique queue token.

### Workflow 3: Clinical Consultation & Diagnosis Workflow
- **Actors:** Doctor (`selam.girma`).
- **Steps:**
  1. Doctor authenticates and accesses department consultation list.
  2. Call next patient from queue (`POST /api/v1/queue/call-next`).
  3. Record clinical consultation encounter (`ClinicalEncounter` and `ConsultationNote`).
  4. Enter ICD-10 diagnosis record (`DiagnosisRecord`).
  5. Verify audit log captures clinician actor and encounter ID.

### Workflow 4: Diagnostic Laboratory Workflow
- **Actors:** Doctor (`selam.girma`), Laboratory Staff (`getu.assefa`).
- **Steps:**
  1. Doctor creates laboratory order for patient (`LaboratoryOrder`).
  2. Lab staff inspects assigned orders and registers specimen collection (`LaboratorySpecimen`).
  3. Lab technician enters test values and reference interval (`LaboratoryResult`).
  4. Lab staff approves and releases results (`status: RELEASED`).
  5. Verify patient can now see released result in Patient Portal (`GET /api/v1/portal/medical-records`).

### Workflow 5: Pharmacy & Medicine Dispensing Workflow
- **Actors:** Doctor (`selam.girma`), Pharmacist (`liya.tesfaye`).
- **Steps:**
  1. Create prescription with medication dosage and duration (`PharmacyPrescription`, `PrescriptionItem`).
  2. Pharmacist inspects active medicine stock and batch expiry dates (`MedicineBatch`).
  3. Dispense prescribed medicine and record batch decrement (`DispensingRecord`).
  4. Verify stock quantity updated atomically in ACID transaction.

### Workflow 6: Inpatient Bed Assignment & Admission Workflow
- **Actors:** Nurse (`tigist.alemu`), Doctor (`selam.girma`).
- **Steps:**
  1. Query available beds across hospital wards (`Ward`, `Bed`).
  2. Reserve and assign bed (`Bed.status: OCCUPIED`).
  3. Record patient inpatient admission (`InpatientAdmission`).
  4. Verify database constraints prevent double-booking bed.

### Workflow 7: Billing, Invoice Generation & Payment Settlement
- **Actors:** Finance Staff, Patient.
- **Steps:**
  1. Generate itemized invoice for consultation, laboratory, and bed stay (`Invoice`, `InvoiceItem`).
  2. Record payment settlement via Cash / Mobile Money (`Payment`).
  3. Verify invoice balance decremented and status transitioned to `PAID`.
  4. Verify patient can review updated invoice in Patient Portal (`GET /api/v1/portal/billing`).

### Workflow 8: Patient Privacy & BOLA / IDOR Verification
- **Actors:** Patient (`patient`), Malicious Client.
- **Steps:**
  1. Patient logs in and fetches dashboard bundle (`GET /api/v1/portal/dashboard`).
  2. Patient attempts to change/cancel an unowned appointment ID.
  3. Verify request is rejected with HTTP 400/403/404.
  4. Verify patient can never view unreleased lab tests or other patients' records.

### Workflow 9: Administration & Role Governance
- **Actors:** Administrator (`admin`).
- **Steps:**
  1. Administrator creates doctor profile (`POST /api/v1/doctors`).
  2. Administrator configures weekly doctor working schedule (`PUT /api/v1/doctors/:id/schedules`).
  3. Verify non-admin roles (Patient, Receptionist) attempting doctor creation receive `HTTP 403 FORBIDDEN`.

---

## 4. Performance & Reliability Evaluation Criteria

- **API Latency Benchmark:** P95 response time $< 100\text{ ms}$ for standard queries; $< 200\text{ ms}$ for complex join aggregations.
- **Database Query Benchmark:** Indexed lookups $< 30\text{ ms}$; relational joins $< 50\text{ ms}$.
- **Data Consistency:** Zero data corruption or orphaned records during multi-step transactions; strict rollback upon unexpected exceptions.
