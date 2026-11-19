# Gondar Hospital Management System (GHMS)
## API Integration & Contract Documentation

**Document Version:** 1.0  
**Date:** November 15, 2026  
**Auditor:** Senior Full-Stack Integration Engineer  
**Base URL:** `http://localhost:4000/api/v1`  
**Transport Security:** HTTP / REST (JSON) with secure cookies and CORS  

---

## 1. Authentication & Security Architecture

The GHMS API utilizes dual-layer token authentication:
1. **Short-Lived Access Tokens (JWT):** Delivered via `ghms_access` HttpOnly cookie or `Authorization: Bearer <token>` header. Lifespan: 15 minutes. Contains `userId`, `role`, `department`, and `patientId` claims.
2. **Long-Lived Refresh Tokens (Opaque):** Delivered via `ghms_refresh` HttpOnly cookie. Stored in MySQL as SHA-256 hashes (`RefreshSession` table) with automatic database revocation upon logout or password reset.
3. **Password Security:** Hashes generated with **Bcrypt (cost factor 12)**.
4. **Rate Limiting:** Protects `/api/v1/auth/*` against automated brute-force attacks.

### Standard Request Headers
```http
Content-Type: application/json
Accept: application/json
Cookie: ghms_access=<jwt>; ghms_refresh=<opaque_token>
```

### Standard Response Envelope
All successful responses return a JSON envelope:
```json
{
  "success": true,
  "data": { ... }
}
```

All error responses return:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "Human-readable description of error",
    "requestId": "uuid"
  }
}
```

---

## 2. API Endpoint Specifications

### 2.1 Authentication Module (`/api/v1/auth`)

| Endpoint | Method | Access | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/auth/login` | `POST` | Public | Authenticates credentials and sets session cookies |
| `/api/v1/auth/register` | `POST` | Public | Onboards new patient account with `GHMS-` identifier |
| `/api/v1/auth/refresh` | `POST` | Public | Exchanges valid refresh cookie for new access token |
| `/api/v1/auth/logout` | `POST` | Authenticated | Revokes refresh session and clears auth cookies |
| `/api/v1/auth/me` | `GET` | Authenticated | Returns current authenticated user profile & permissions |
| `/api/v1/auth/forgot-password` | `POST` | Public | Issues cryptographic reset token |
| `/api/v1/auth/reset-password` | `POST` | Public | Consumes single-use reset token and updates password |

#### `POST /api/v1/auth/login` Request
```json
{
  "identifier": "selam.girma",
  "password": "StaffPassword123",
  "remember": true
}
```

#### `POST /api/v1/auth/register` Request
```json
{
  "firstName": "Dawit",
  "middleName": "Chane",
  "lastName": "Mekonnen",
  "gender": "male",
  "dateOfBirth": "1992-06-14",
  "phone": "+251911998877",
  "email": "dawit.chane@example.com",
  "address": "Kebele 03, Gondar, Ethiopia",
  "password": "SecurePassword123"
}
```

---

### 2.2 Appointments & Queue Module (`/api/v1/appointments`, `/api/v1/queue`)

| Endpoint | Method | Permissions | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/appointments` | `GET` | `appointments.read.*` | Query hospital appointment list with pagination |
| `/api/v1/appointments` | `POST` | `appointments.create` | Schedule new clinical appointment with slot locking |
| `/api/v1/appointments/:id` | `GET` | `appointments.read.*` | Fetch appointment details by ID |
| `/api/v1/appointments/:id/status` | `PATCH` | `appointments.update.*` | Update appointment status (Confirmed, Cancelled, etc.) |
| `/api/v1/queue` | `GET` | `queue.read.*` | List active departmental queues |
| `/api/v1/queue/check-in` | `POST` | `queue.manage.*` | Check in confirmed appointment into live queue |
| `/api/v1/queue/call-next` | `POST` | `queue.manage.*` | Physician calls next waiting patient into consultation |
| `/api/v1/queue/public` | `GET` | Public | Live waiting room queue display (strictly masks PII) |

#### `POST /api/v1/appointments` Request
```json
{
  "patientId": "GHMS-000001",
  "doctor": "Dr. Selam Girma",
  "department": "Internal Medicine",
  "date": "2026-11-16",
  "time": "08:30",
  "type": "consultation",
  "reason": "Routine clinical evaluation",
  "notes": "Booked by outpatient reception"
}
```

#### `POST /api/v1/queue/check-in` Request
```json
{
  "appointmentId": "7552b80f-38b1-49fb-a3b5-7b0f3397b493"
}
```

---

### 2.3 Doctor Directory & Availability (`/api/v1/doctors`)

| Endpoint | Method | Permissions | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/doctors` | `GET` | `doctors.read` | List all active physicians, specialties, and schedules |
| `/api/v1/doctors` | `POST` | `ADMINISTRATOR` | Onboard new physician profile (Admin restricted) |
| `/api/v1/doctors/availability` | `GET` | `doctors.read` | Query available 30-min consultation slots for a date |
| `/api/v1/doctors/:id/schedules` | `PUT` | `ADMINISTRATOR` | Configure physician working hours and break periods |

#### `GET /api/v1/doctors/availability?date=2026-11-16&department=Internal%20Medicine` Response
```json
{
  "success": true,
  "data": [
    {
      "doctorId": "f059dabe-5c82-4999-92bb-e8bb0c2161f1",
      "name": "Dr. Selam Girma",
      "department": "Internal Medicine",
      "availableDays": [1],
      "workingHours": { "start": "08:30", "end": "17:00", "breakStart": "12:30", "breakEnd": "13:30" },
      "bookedSlots": 0,
      "availableSlots": 15,
      "slots": ["08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"]
    }
  ]
}
```

---

### 2.4 Emergency Department Module (`/api/v1/emergency`)

| Endpoint | Method | Permissions | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/emergency/cases` | `GET` | `emergency.read` | List acute emergency cases and tracking board |
| `/api/v1/emergency/cases` | `POST` | `emergency.manage` | Register acute arrival (registered or anonymous trauma) |
| `/api/v1/emergency/cases/:caseNumber/triage` | `POST` | `emergency.triage` | Record clinical triage score (Red, Orange, Yellow, Green) |
| `/api/v1/emergency/cases/:caseNumber/transitions` | `POST` | `emergency.manage` | Advance emergency patient along acute workflow stages |

---

### 2.5 Patient Portal Module (`/api/v1/portal`)

All endpoints under `/api/v1/portal/*` strictly enforce `requireRole(UserRole.PATIENT)`. All data queries are scoped automatically to `request.actor.patientId`, preventing any unauthorized access (BOLA/IDOR safe).

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/v1/portal/dashboard` | `GET` | Returns aggregated overview: profile, upcoming visits, alerts |
| `/api/v1/portal/profile` | `GET` | Returns patient demographics, contact details, emergency contacts |
| `/api/v1/portal/profile` | `PATCH` | Updates patient-managed phone, address, and emergency contact |
| `/api/v1/portal/appointments` | `GET` | List patient's past and upcoming booked appointments |
| `/api/v1/portal/appointments` | `POST` | Patient self-service booking for consultation slots |
| `/api/v1/portal/appointments/:id/change` | `PATCH` | Patient requests cancellation or rescheduling |
| `/api/v1/portal/medical-records` | `GET` | Access released laboratory results and clinical diagnoses |
| `/api/v1/portal/billing` | `GET` | Access hospital invoices, line items, and payment receipts |
| `/api/v1/portal/support` | `POST` | Submit patient inquiry, feedback, or assistance request |

---

## 3. Frontend-to-Backend Integration Code Examples

### Standard API Call Pattern with Auto-Refresh (`src/services/api-client.ts`)
```typescript
import { apiClient } from "@/services/api-client";

// Authenticated query: automatically attaches HttpOnly credentials and handles 401 refresh
export async function getDoctorDirectory() {
  const response = await apiClient.get<DoctorListResponse>("/doctors");
  return response.data;
}

// Authenticated mutation: handles validation errors and returns typed response
export async function bookAppointment(payload: AppointmentPayload) {
  const response = await apiClient.post<AppointmentRecord>("/appointments", payload);
  return response.data;
}
```

### Patient Portal Consumer Pattern (`src/services/patient-portal.ts`)
```typescript
import { patientPortalApi } from "@/services/patient-portal";

// In server or client components
export async function loadPortalDashboard() {
  const dashboard = await patientPortalApi.getDashboard();
  return dashboard;
}
```

---

## 4. Standard Error Codes Reference

| Error Code | HTTP Status | Description |
| :--- | :--- | :--- |
| `UNAUTHENTICATED` | 401 | Missing, invalid, or expired session token |
| `FORBIDDEN` | 403 | Authenticated role lacks required system permission |
| `VALIDATION_ERROR` | 400 | Request body failed Zod schema constraints |
| `ACCOUNT_LOCKED` | 429 | Temporarily locked due to 5 consecutive failed logins |
| `ACCOUNT_ALREADY_EXISTS` | 409 | Email or phone already registered in hospital database |
| `APPOINTMENT_NOT_DUE` | 409 | Attempted queue check-in prior to scheduled appointment day |
| `SLOT_UNAVAILABLE` | 409 | Doctor is not scheduled or time slot is already locked |
| `CONFLICT` | 409 | Relational constraint collision or concurrent lock conflict |
| `NOT_FOUND` | 404 | Targeted resource identifier does not exist |
| `INTERNAL_ERROR` | 500 | Unhandled server exception (safely logged with Request ID) |
