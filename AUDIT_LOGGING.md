# Gondar Hospital Management System (GHMS)
## Security Audit Logging Specification & Compliance Guide

**Classification:** High-Assurance Healthcare Compliance  
**Audience:** Security Auditors, Compliance Officers, Database Administrators  
**Standard:** HIPAA Security Rule (§ 164.312(b)), OWASP ASVS v4.0, Ethiopian Health Data Guidelines  
**Status:** Implemented & Verified in MySQL  

---

## 1. Audit Logging Architecture

GHMS maintains an immutable, tamper-resistant audit trail in the `AuditLog` database table. The audit subsystem is decoupled from domain logic to ensure that audit failures do not disrupt primary care delivery, while guaranteeing that all security-sensitive events are recorded with sub-second timestamps and correlation identifiers.

```
+------------------------------------------------------------------------------------+
|                                    EVENT SOURCE                                    |
|   (Authentication, Clinical Service, Emergency Service, Pharmacy, Billing, Admin)  |
+------------------------------------------------------------------------------------+
                                           |
                                           v
+------------------------------------------------------------------------------------+
|                            AUDIT RECORDER SUBSYSTEM                                |
|   - Actor Identity Binding (from verified JWT session claims)                      |
|   - Request ID Correlation Header ('x-request-id')                                 |
|   - PII Sanitization & Credential Stripping                                        |
+------------------------------------------------------------------------------------+
                                           |
                                           v
+------------------------------------------------------------------------------------+
|                         DATABASE STORAGE ('AuditLog' Table)                         |
|   - MySQL Row Storage (InnoDB Engine, utf8mb4)                                     |
|   - Indexed by Actor, Action, Entity, and Timestamp                                |
|   - Referential Integrity: Foreign Key onDelete = SetNull                          |
+------------------------------------------------------------------------------------+
```

---

## 2. AuditLog Database Schema

```prisma
model AuditLog {
  id         String   @id @default(uuid()) @db.Char(36)
  actorId    String?  @db.Char(36)
  action     String   @db.VarChar(100)
  entityType String   @db.VarChar(50)
  entityId   String?  @db.Char(36)
  requestId  String?  @db.VarChar(64)
  createdAt  DateTime @default(now())
  actor      User?    @relation("AuditActor", fields: [actorId], references: [id], onDelete: SetNull)

  @@index([actorId, createdAt])
  @@index([action, createdAt])
  @@index([entityType, entityId])
}
```

### Schema Attributes & Security Properties:
- **`id` (UUID):** Globally unique, non-sequential identifier eliminating sequence enumeration.
- **`actorId`:** The verified user identifier (`User.id`) extracted directly from cryptographic JWT claims. If an account is deleted, `onDelete: SetNull` retains the audit event with a null actor reference while preserving the timestamp and entity trail.
- **`action`:** A standardized, uppercase categorical action identifier (e.g., `AUTH_LOGIN_SUCCEEDED`).
- **`entityType` & `entityId`:** Strongly references the domain entity altered or inspected (e.g., `User`, `ClinicalEncounter`, `Invoice`).
- **`requestId`:** Correlates the database audit entry with server application logs (`x-request-id` header).
- **`createdAt`:** Tamper-resistant UTC timestamp assigned automatically by the database engine at the exact moment of insertion (`@default(now())`).

---

## 3. Audited Activities Taxonomy

The system explicitly records all critical operational events:

| Category | Action Code | Entity Type | Trigger Event & Logged Metadata |
| :--- | :--- | :--- | :--- |
| **Authentication** | `AUTH_LOGIN_SUCCEEDED` | `User` | Successful credential verification; captures user ID and request ID. |
| **Authentication** | `AUTH_LOGIN_FAILED` | `User` | Invalid password or identifier attempt; actorId is null to avoid linking unverified identities. |
| **Authentication** | `AUTH_LOGIN_LOCKED` | `User` | Account locked out after 5 consecutive failed attempts; captures target user ID and duration. |
| **Authentication** | `AUTH_LOGIN_BLOCKED` | `User` | Login attempted on an account marked `INACTIVE` or `SUSPENDED`. |
| **Authentication** | `AUTH_PASSWORD_RESET_REQUESTED` | `User` | User requested password recovery; captures user ID and token expiration. |
| **Authentication** | `AUTH_PASSWORD_RESET_COMPLETED` | `User` | Reset token successfully redeemed; captures user ID, token invalidation, and session purge. |
| **Authentication** | `AUTH_PASSWORD_CHANGED` | `User` | User changed password within account settings; invalidates all active device sessions. |
| **Authentication** | `AUTH_PATIENT_REGISTERED` | `User` | Self-service registration through patient portal; captures newly generated patient ID. |
| **Clinical** | `CLINICAL_ENCOUNTER_CREATED` | `ClinicalEncounter` | Doctor opened a consultation or emergency encounter. |
| **Clinical** | `CLINICAL_DIAGNOSIS_RECORDED` | `DiagnosisRecord` | Official ICD-10 medical diagnosis entered by attending physician. |
| **Clinical** | `CLINICAL_NOTE_AMENDED` | `ClinicalAmendment` | Retroactive alteration to clinical notes; records reason and original note reference. |
| **Pharmacy** | `PRESCRIPTION_DISPENSED` | `DispensingRecord` | Pharmacist dispensed medicine; captures prescription ID, medicine batch, and quantity. |
| **Billing** | `INVOICE_GENERATED` | `Invoice` | Patient billed for consultation, procedures, or bed days. |
| **Billing** | `PAYMENT_PROCESSED` | `Payment` | Cashier or payment gateway processed payment; captures amount, method, and invoice ID. |
| **Emergency** | `EMERGENCY_TRIAGE_RECORDED` | `EmergencyTriage` | Triage nurse assigned urgency level (Resuscitation, Emergent, Urgent). |

---

## 4. Privacy & Data Sanitization Rules

To comply with HIPAA and privacy guidelines, audit logs are subject to strict data sanitization rules:

1. **Zero Credential Persistence:**
   - **Never** store plaintext passwords, Bcrypt password hashes, reset tokens, or JWT tokens in audit log payloads or application log streams.
2. **PII Masking:**
   - Raw patient medical chart text, clinical consultation narratives, and sensitive test values are **never** duplicated in audit logs. Audit logs reference the immutable `entityId` only.
3. **Log Immutability & Modification Protection:**
   - The application database user (`ghms_app`) is granted `INSERT` and `SELECT` privileges on the `AuditLog` table.
   - `UPDATE` and `DELETE` operations on `AuditLog` are strictly forbidden by database-level privilege isolation.
   - Any attempt to truncate or delete audit rows requires elevated `root` database credentials and generates an alert.

---

## 5. Retention & Inspection Policy

- **Active Retention:** Audit logs remain indexed in the primary MySQL database for a minimum of **24 months** for real-time compliance inspections and security incident analysis.
- **Cold Storage Archive:** Logs older than 24 months are exported to encrypted cold storage (`gzip` + AES-256) and retained for **7 years** in accordance with healthcare legal compliance requirements.
- **Inspection Access:** Only users possessing the `ADMINISTRATOR` role can query the audit inspection API routes. All audit inspection queries are themselves audited.
