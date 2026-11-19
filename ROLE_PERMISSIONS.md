# Gondar Hospital Management System (GHMS)
## Role-Based Access Control (RBAC) & Server-Side Permission Specification

**Classification:** Internal Healthcare Operational Governance  
**Audience:** Security Engineers, System Administrators, Clinical Leads  
**Standard:** NIST SP 800-162 / Ethiopian National Healthcare Information Standards  
**Status:** Implemented and Enforced  

---

## 1. Authorization Philosophy

In the Gondar Hospital Management System (GHMS), authorization is strictly enforced on the server for **every single protected API endpoint**. Hiding frontend buttons or navigation links is treated purely as a UI convenience and is **never** relied upon as a security boundary.

Every incoming request passes through:
1. **Authentication Middleware (`authenticate`)**:
   - Cryptographically verifies the HMAC-SHA256 access token from `ghms_access` HttpOnly cookie or `Authorization: Bearer <token>` header.
   - Extracts validated session claims into `request.actor`:
     ```typescript
     request.actor = {
       userId: claims.sub,
       role: claims.role as UserRole,
       patientId: claims.patientId, // for PATIENT role
       department: claims.department, // for staff roles
     };
     ```
2. **Permission Guard (`requirePermission(...)`)**:
   - Asserts that `request.actor.role` possesses at least one of the required permission strings, or has the wildcard permission (`*`).
   - If not permitted, immediately halts processing with `HTTP 403 FORBIDDEN` (`code: "FORBIDDEN"`).
3. **Role Guard (`requireRole(...)`)**:
   - Enforces specific strict role memberships (e.g., `ADMINISTRATOR` only for doctor onboarding or schedule modification; `PATIENT` only for the Patient Portal).

---

## 2. Comprehensive Role Permission Matrix

The following table documents all user roles implemented in GHMS, their assigned permissions, and their strict access boundaries:

| User Role | Server-Side Permissions | Allowed Operational Capabilities | Strict System Boundaries |
| :--- | :--- | :--- | :--- |
| **ADMINISTRATOR** | Wildcard: `*` | - Onboard and manage doctor profiles (`POST /api/v1/doctors`)<br>- Configure doctor departmental schedules (`PUT /api/v1/doctors/:id/schedules`)<br>- Inspect hospital-wide audit logs and system status<br>- Manage departments and clinical system configurations | - All administrative actions are recorded in immutable audit logs.<br>- Cannot bypass patient medical release controls. |
| **DOCTOR** | `clinical.*`<br>`emergency.*`<br>`appointments.read.department`<br>`appointments.update.department`<br>`queue.read.department`<br>`queue.manage.department`<br>`doctors.read`<br>`laboratory.orders.read`<br>`laboratory.orders.create`<br>`radiology.read`<br>`radiology.requests.create`<br>`departments.read`<br>`departments.manage` | - Record clinical encounters, consultations, diagnoses, allergies, and treatment plans<br>- Initiate emergency cases, conduct triage assessments, and provide emergency treatments<br>- Order laboratory investigations and imaging requests<br>- View and update appointments within assigned medical department<br>- Manage departmental patient consultation queues | - **Forbidden** from administrative doctor creation and schedule editing.<br>- **Forbidden** from accessing the Patient Portal (`HTTP 403 PATIENT_PORTAL_FORBIDDEN`).<br>- **Forbidden** from dispensing medications in the pharmacy.<br>- **Forbidden** from processing billing ledger modifications. |
| **NURSE** | `clinical.nursing.write`<br>`clinical.vitals.write`<br>`clinical.allergies.write`<br>`emergency.triage`<br>`emergency.treatment`<br>`emergency.read`<br>`emergency.manage`<br>`appointments.read.department`<br>`appointments.create`<br>`appointments.update.department`<br>`queue.read.department`<br>`queue.manage.department`<br>`doctors.read`<br>`departments.read`<br>`departments.manage` | - Record nursing notes, vital sign observations, and allergy records<br>- Conduct emergency triage assessments and update patient vital signs<br>- Assist with department queues and book appointments<br>- Monitor bed occupancy and inpatient vitals | - **Forbidden** from entering official physician diagnoses.<br>- **Forbidden** from ordering high-tier imaging or approving laboratory releases.<br>- **Forbidden** from administrative system configuration. |
| **LABORATORY_TECHNICIAN** | `laboratory.read`<br>`laboratory.manage`<br>`laboratory.results.write`<br>`laboratory.results.approve`<br>`laboratory.results.release`<br>`appointments.read.department`<br>`queue.read.department`<br>`doctors.read` | - Process specimen collections and laboratory test orders<br>- Enter laboratory analysis results and attach reference ranges<br>- Approve and officially release verified lab results<br>- Manage laboratory test catalogs and reagent inventory | - **Forbidden** from authoring clinical consultation notes.<br>- **Forbidden** from accessing patient billing ledgers or pharmacy dispensing. |
| **RADIOLOGY_TECHNICIAN** | `radiology.read`<br>`radiology.manage`<br>`radiology.reports.write`<br>`radiology.reports.approve`<br>`radiology.reports.release`<br>`appointments.read.department`<br>`queue.read.department`<br>`doctors.read` | - Perform diagnostic imaging studies (X-ray, CT, Ultrasound, MRI)<br>- Write radiology reports and link DICOM / image attachments<br>- Approve and release imaging diagnostic summaries | - **Forbidden** from entering clinical treatment plans or prescribing medication.<br>- **Forbidden** from administrative onboarding. |
| **PHARMACIST** | `pharmacy.read`<br>`pharmacy.manage`<br>`pharmacy.prescriptions.read`<br>`pharmacy.prescriptions.dispense`<br>`pharmacy.inventory.read`<br>`pharmacy.inventory.manage`<br>`appointments.read.department`<br>`doctors.read`<br>`departments.read` | - Review authorized doctor prescriptions<br>- Verify medication dosages and contraindications<br>- Record medicine dispensing events against prescription orders<br>- Manage pharmacy inventory, batch numbers, and expiry alerts | - **Forbidden** from altering patient medical diagnoses.<br>- **Forbidden** from altering doctor profile credentials. |
| **FINANCE_OFFICER** | `billing.read`<br>`billing.manage`<br>`billing.invoices.create`<br>`billing.invoices.read`<br>`billing.payments.process`<br>`billing.insurance.manage`<br>`doctors.read`<br>`departments.read` | - Generate patient invoices for consultations, procedures, and bed days<br>- Record payments (Cash, Bank Transfer, Mobile Money, Insurance)<br>- Process insurance claims and manage credit settlements | - **Forbidden** from viewing clinical consultation notes and medical diagnoses.<br>- **Forbidden** from dispensing pharmaceuticals or operating medical equipment. |
| **HR_OFFICER** | `hr.read`<br>`hr.manage`<br>`hr.staff.read`<br>`hr.staff.manage`<br>`hr.attendance.manage`<br>`hr.leave.manage`<br>`doctors.read`<br>`departments.read` | - Manage hospital staff employment records and departmental assignments<br>- Track biometric attendance records and process leave requests<br>- Manage staff shift schedules | - **Forbidden** from accessing patient health records, diagnostic tests, or financial billing ledgers. |
| **RECEPTIONIST** | `appointments.read.all`<br>`appointments.create`<br>`appointments.update.all`<br>`queue.read.all`<br>`queue.manage.all`<br>`doctors.read`<br>`emergency.read`<br>`emergency.manage`<br>`departments.read` | - Register new patients and create patient records<br>- Schedule, reschedule, and cancel patient appointments across all departments<br>- Check in patients and advance queue tokens<br>- Initiate walk-in emergency triage registration | - **Forbidden** from viewing clinical consultation notes, laboratory results, or financial ledger balances.<br>- **Forbidden** from doctor profile creation. |
| **PATIENT** | `appointments.create`<br>`appointments.read.own`<br>`appointments.update.own`<br>`queue.read.public`<br>Patient Portal APIs | - Access personal patient portal (`/api/v1/portal/*`)<br>- View released laboratory results and verified medical diagnoses<br>- Book appointments and view upcoming confirmed schedules<br>- Inspect personal billing statements and pay outstanding invoices<br>- Submit patient feedback and support requests | - **Strictly quarantined** from staff, clinical, and administrative endpoints.<br>- **Zero-trust boundary:** Patients can **never** access another patient's data; queries are strictly bound to `actor.patientId`. |
| **DEPARTMENT_HEAD** | Doctor permissions + `departments.manage` | - Full clinical authority within department<br>- Departmental workflow assignment and resource management | - Bound to departmental scope where specified. |
| **HOSPITAL_STAFF** | `appointments.read.department`<br>`queue.read.department`<br>`doctors.read`<br>`departments.read` | - General support, department queue viewing, patient guidance | - Strictly read-only clinical access. |

---

## 3. Clinical Workflow Governance & Policy Rules

1. **Principle of Least Privilege (PoLP):** Staff accounts only possess the minimum permissions required for their specific clinical role.
2. **Separation of Duties (SoD):**
   - Clinicians prescribe medication; only licensed pharmacists dispense medication.
   - Clinicians order diagnostic tests; only laboratory/radiology technicians execute and release results.
   - Receptionists register patients; only finance officers settle invoices and manage insurance claims.
3. **Emergency Override (Break-Glass Protocol):**
   - In emergency trauma scenarios, nurses and emergency doctors can triage and register walk-in patients immediately under the `emergency.*` permission group.
   - Every emergency case creation, status transition, and resource assignment generates an audit trail identifying the attending clinician and timestamp.
