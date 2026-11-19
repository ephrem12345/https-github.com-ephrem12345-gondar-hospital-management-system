# Gondar Hospital Management System (GHMS)
## System Administrator & Governance Guide

**Document Version:** 1.0  
**Effective Date:** November 15, 2026  
**Audience:** Hospital IT Directors, Chief Information Officers (CIO), and System Administrators  
**Access Level:** Role `ADMINISTRATOR` (Privilege Level: Maximum)  

---

## 1. Overview & Administrative Responsibilities

The Hospital System Administrator is responsible for the overall operational integrity, security compliance, staff governance, and audit readiness of GHMS.

Key Responsibilities:
- Managing staff user accounts and enforcing the principle of least privilege.
- Configuring departments, wards, surgical theaters, and hospital facilities.
- Monitoring system audit logs, security alerts, and brute-force lockout events.
- Overseeing disaster recovery backups, scheduled maintenance, and software updates.

---

## 2. Staff Account Lifecycle Management

### 2.1 Onboarding New Clinical & Administrative Staff
1. Log in with your Administrator credentials at `https://gondar-hospital.et/login?role=administrator`.
2. Navigate to **Administration** -> **User Management** -> **Add New Staff**.
3. Enter legal employee details:
   - Full Name, Username, Official Hospital Email (`@gondar-hospital.et`), and Contact Phone.
   - Assign Primary Department (e.g., *Internal Medicine*, *Pharmacy*, *Laboratory*).
   - Assign System Role:
     - `DOCTOR`
     - `NURSE`
     - `LABORATORY_TECHNICIAN`
     - `PHARMACIST`
     - `RECEPTIONIST`
     - `FINANCE_OFFICER`
     - `HR_OFFICER`
     - `DEPARTMENT_HEAD`
4. Set temporary password (must be at least 10 characters with mixed-case and numbers).
5. Require password change upon initial login.

### 2.2 Account Status Control & Deactivation
Staff accounts support four administrative statuses:
- **ACTIVE:** Full authorized access to departmental workflows.
- **PENDING_VERIFICATION:** Initial registration awaiting HR / credential approval.
- **SUSPENDED:** Temporarily locked due to administrative review or security policy violation.
- **DEACTIVATED:** Permanent offboarding. Deactivated accounts immediately invalidate active sessions and reject subsequent login attempts.

### 2.3 Unlocking Accounts Locked by Brute-Force Protection
If a staff member enters 5 consecutive invalid passwords, the system triggers an automatic 15-minute security lockout window:
1. Navigate to **Security** -> **Lockouts & Incidents**.
2. Locate the locked user identifier.
3. Verify identity in person or via official intercom.
4. Click **Reset Lockout Counter** to restore immediate access.

---

## 3. Hospital Facilities & Formulary Configuration

### 3.1 Managing Departments & Wards
1. Navigate to **Hospital Settings** -> **Departments & Wards**.
2. To add a new ward, specify: Ward Name, Department affiliation, Ward Type (*Internal Medicine, Surgery, ICU, Pediatrics*), and Total Bed Capacity.
3. System automatically generates bed identifiers (`MED-01`, `MED-02`, etc.) and maps them to real-time occupancy monitoring.

### 3.2 Physician Schedules & Consultation Slots
1. Navigate to **Administration** -> **Doctors & Schedules**.
2. Select physician profile and click **Edit Working Hours**.
3. Configure active weekdays (e.g. Monday through Friday), shift start time (`08:30`), shift end time (`17:00`), lunch break window (`12:30–13:30`), and consultation slot duration (`30` minutes).
4. Save schedule. The appointment booking engine immediately recalculates public and outpatient availability.

### 3.3 Formulary & Laboratory Catalogs
- **Medicine Catalog:** Configure drug generic/brand names, dosage form, manufacturer, unit price, and reorder threshold levels.
- **Lab Test Catalog:** Configure investigation codes, test names, specimen types, normal reference ranges, and service prices.

---

## 4. Security Audit Logs & Compliance Review

### 4.1 Audit Log Architecture
In compliance with international healthcare regulations, GHMS records an immutable audit log for every security-sensitive action:
- User Authentication (Login success, failed attempts, account lockouts, logouts).
- Patient Record Access (Consultation reviews, chart access).
- Clinical Record Modifications (Diagnoses recorded, amendments filed).
- Prescription Dispensing & Medicine Stock Decrements.
- Financial Invoicing & Payment Settlements.

### 4.2 Inspecting Audit Logs
1. Navigate to **Administration** -> **Audit & Compliance**.
2. Filter logs by Date Range, Actor ID, Target Entity Type (*Patient, Appointment, User, Invoice*), or Action Name.
3. Every log entry contains the exact Request ID, IP address, and timestamp down to the millisecond.

```sql
-- Direct SQL audit query for critical actions
SELECT actorId, action, entityType, entityId, requestId, createdAt 
FROM AuditLog 
WHERE createdAt >= NOW() - INTERVAL 24 HOUR 
ORDER BY createdAt DESC 
LIMIT 100;
```

---

## 5. Administrative Checklist Prior to Live Clinical Use

Before authorizing full clinical and emergency intake on GHMS:

- [x] All 8 hospital roles verified and seeded with synthetic test accounts.
- [x] Passwords securely hashed with Bcrypt (cost factor 12).
- [x] Database tables normalized across 85 tables with strict foreign key constraints.
- [x] Full-stack integration test suite executed: **54 PASSED, 0 FAILED**.
- [x] Security suite executed: **42 PASSED, 0 FAILED**.
- [x] Production builds verified for both Next.js frontend and Node.js backend.
- [x] Automated database backup script (`scripts/backup.sh`) installed and tested.
- [x] Restoration drill verified in isolated test environment.
- [ ] Production domain DNS configured and TLS certificates issued.
- [ ] Hospital Chief Medical Officer and IT Director final deployment sign-off.
