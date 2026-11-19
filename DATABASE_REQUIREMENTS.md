# Gondar Hospital Management System (GHMS)
## Stage 3: Database Requirements & Technical Specification

---

## 1. Executive Summary & Existing Technology
- **Database Engine:** MySQL 8.0+ / MariaDB 10.5+
- **Object-Relational Mapping (ORM):** Prisma ORM (`@prisma/client` 6.19.3)
- **Database Name:** `ghms`
- **Connection Configuration:** Connection pooling enabled with `connection_limit=20` and `pool_timeout=10`
- **Char Set & Collation:** `utf8mb4` with `utf8mb4_unicode_ci` for multilingual support (English and Amharic)
- **Current Baseline:** 61 domain tables created in initial backend foundation.
- **Goal:** Complete a fully normalized, relational database architecture covering all implemented GHMS modules with strong referential integrity, indexes, and synthetic seeds.

---

## 2. Existing Database Architecture Audit

### 2.1 Implemented & Verified Subsystems
1. **Authentication & Identity:**
   - `User` (email, username, phone, passwordHash, role, status, demographics, department)
   - `RefreshSession` (tokenHash, rememberMe, expiresAt, revokedAt)
   - `PasswordReset` (tokenHash, expiresAt, usedAt)
   - `AuditLog` (actorId, action, entityType, entityId, requestId, timestamp)
2. **Patient Demographics:**
   - `Patient` (patientNumber, userId, demographics, emergency contact, guardian, insurance, blood group, allergies)
3. **Medical Staff & Scheduling:**
   - `Doctor` (userId, name, specialty, department, active)
   - `DoctorSchedule` (doctorId, dayOfWeek, startTime, endTime, break times, slotDurationMins)
   - `DoctorLeave` (doctorId, startDate, endDate, reason, approval)
4. **Appointments & Queuing:**
   - `Appointment` (appointmentNumber, patientId, doctorId, department, scheduledAt, type, status)
   - `AppointmentSlotLock` (slot lock protection during booking)
   - `QueueCounter` (per-department daily serial counters)
   - `QueueEntry` (daily sequential ticket, patient, department, call status)
5. **Clinical Documentation:**
   - `ClinicalEncounter` (encounterNumber, patientId, doctorId, chiefComplaint, status)
   - `ConsultationNote`, `NursingNote`, `VitalSignObservation`
   - `DiagnosisRecord`, `AllergyRecord`, `TreatmentPlanRecord`
   - `ClinicalReferral`, `ClinicalAmendment`
6. **Emergency Services:**
   - `EmergencyCase`, `EmergencyTriage`, `EmergencyWorkflowEvent`
   - `EmergencyConsultation`, `EmergencyResourceAssignment`, `TemporaryEmergencyPatient`
7. **Specialty Workspaces:**
   - `DepartmentAssignment`, `DepartmentWorkflowRecord`
8. **Diagnostics (Laboratory & Radiology):**
   - `LaboratoryTestCatalogItem`, `LaboratoryOrder`, `LaboratoryOrderItem`
   - `LaboratorySpecimen`, `LaboratoryResult`, `LaboratoryResultAmendment`
   - `RadiologyCatalogItem`, `RadiologyRequest`, `ImagingReport`
9. **Blood Bank Management:**
   - `BloodDonor`, `BloodDonation`, `BloodBankUnit`, `BloodRequest`, `BloodCrossmatch`, `BloodIssue`
10. **Finance, Billing & Insurance:**
    - `Invoice`, `InvoiceItem`, `Payment`, `RefundRequest`, `InvoiceAmendment`, `ServicePrice`
    - `InsuranceProvider`, `PatientInsurancePolicy`, `InsuranceClaim`
11. **Human Resources & Administration:**
    - `Employee`, `AttendanceRecord`, `ShiftAssignment`, `LeaveRequest`, `PayrollRecord`
12. **Portal & Notifications:**
    - `PortalNotification`, `HospitalAnnouncement`, `PortalSupportRequest`

---

## 3. Gap Analysis: Missing Subsystems in Database

Through cross-inspection of frontend components (`src/modules/pharmacy.tsx`, `src/modules/resources.tsx`, `src/components/templates/PharmacyManagementScreen.tsx`, `src/components/templates/HospitalResourcesScreen.tsx`, `src/services/hospital-operations.ts`, `src/services/diagnostic-workflows.ts`), the following entities were identified as needing normalized database models:

### 3.1 Pharmacy & Medicine Inventory
- **`Medicine`:** Master catalog item with generic name, brand name, category, strength, dosage form, manufacturer, unit, unit price, and reorder level.
- **`MedicineBatch`:** Physical batches received, tracking batch number, quantity in stock, purchase date, expiry date, storage location, and supplier foreign key.
- **`PharmacySupplier`:** Supplier directory with contact person, phone, email, address, and active status.
- **`PharmacyPrescription` & `PharmacyPrescriptionItem`:** Formal medical prescriptions issued by physicians, detailing medication, dosage, frequency, duration, special instructions, required quantity, and dispensed quantity.
- **`DispensingRecord`:** Dispensing transactions linked to prescriptions, specific batches, and dispensing pharmacists, recording actual quantity dispensed, timestamp, and verifiable receipt number.
- **`ProcurementRecord`:** Purchase orders and replenishment requests submitted to suppliers.

### 3.2 Inpatient Care, Wards & Bed Management
- **`Ward`:** Physical hospitalization wards (Medical Ward, Surgical Ward, Pediatric Ward, ICU, Maternity, etc.) with department association, ward type, and bed capacity.
- **`Bed`:** Individual bed units within wards with real-time status (`AVAILABLE`, `OCCUPIED`, `RESERVED`, `CLEANING`, `MAINTENANCE`), code/label, and current patient relation.
- **`InpatientAdmission`:** Formal inpatient admission records recording admission number, patient, admitting clinician, assigned ward, bed, admission reason, and status (`PENDING`, `ADMITTED`, `DISCHARGED`, `TRANSFERRED`).
- **`InpatientDischarge`:** Discharge summaries with final diagnosis, discharge medication instructions, follow-up instructions, discharge authorization status (`PENDING_AUTHORIZATION`, `AUTHORIZED`), and authorizing physician.

### 3.3 Facilities & Hospital Operations
- **`OperatingRoom`:** Operating theater scheduling, tracking status (`AVAILABLE`, `SCHEDULED`, `IN_USE`, `CLEANING`, `MAINTENANCE`), scheduled procedure, patient, surgical team, and time slot.
- **`Ambulance`:** Emergency fleet vehicles with vehicle number, assigned driver, emergency contact phone, and vehicle status.
- **`AmbulanceTrip`:** Dispatch trip records recording patient, destination facility, dispatch timestamp, and trip status.
- **`AmbulanceMaintenance`:** Vehicle maintenance log tracking mechanical inspections and servicing.
- **`GeneralInventoryItem`:** Consumables and non-pharmaceutical hospital inventory with quantity, unit, storage location, and reorder threshold.
- **`HospitalAsset`:** Biomedical equipment and capital assets tracking serial numbers, assigned department, room/location, and condition.
- **`AssetMaintenanceRequest`:** Maintenance work orders for hospital assets tracking priority, fault description, and resolution status.

### 3.4 Diagnostic Attachments & Transfusions
- **`DiagnosticAttachment`:** Medical imaging studies, DICOM files, ultrasound scans, and clinical documents linked to patients and diagnostic workflows.
- **`TransfusionRecord`:** Direct administration of screened blood units to patients with administering clinician, vital monitoring, and outcome status.

### 3.5 Department & Permission Normalization
- **`Department`:** Master lookup of clinical and administrative hospital departments.
- **`SystemPermission` & `RolePermission`:** Granular role-to-permission mapping supporting the hospital's role-based access control matrix.

---

## 4. Referential Integrity & Constraints Specifications
1. **Primary Keys:**
   - Char(36) UUID v4 universally across all relational entities (`@id @default(uuid()) @db.Char(36)`).
2. **Foreign Key Deletion Rules:**
   - **`Restrict`:** Medical records, financial transactions, patient records, and audit entities can never be deleted if referencing foreign keys exist (guarantees legal and clinical data preservation).
   - **`Cascade`:** Pure child line items (e.g., `PharmacyPrescriptionItem` on `PharmacyPrescription`, `InvoiceItem` on `Invoice`) are deleted if the parent draft is purged.
   - **`SetNull`:** Optional associations (e.g., `temporaryPatientId`, `assignedToId`, `reviewerId`) are cleared safely without deleting the parent entity.
3. **Data Types:**
   - **Currency/Prices:** `@db.Decimal(12, 2)` or `@db.Decimal(10, 2)` to eliminate floating-point rounding errors.
   - **Dates:** `@db.Date` for birthdates and calendar schedules; `@default(now()) DateTime` for auditable event timestamps.
   - **Text:** `@db.VarChar` with bounded lengths for indexed fields; `@db.Text` for clinical narratives and notes.
4. **Unique Constraints:**
   - `patientNumber`, `orderNumber`, `invoiceNumber`, `admissionNumber`, `batchNumber`, `licenseNumber`, `serialNumber`, `code`.

---

## 5. Performance & Indexing Requirements
1. **Search & Lookup Columns:**
   - Composite indexes on `[department, status, createdAt]` for queue and department dashboards.
   - Indexes on foreign keys (`patientId`, `doctorId`, `wardId`, `supplierId`, `medicineId`).
   - Prefix and exact indexes on searchable identifiers (`patientNumber`, `batchNumber`, `admissionNumber`).
2. **Sorting & Filtering:**
   - Composite indexes on timestamped feeds: `[status, requestedAt]`, `[userId, readAt, createdAt]`.
   - Avoid duplicate indexes; combine where leftmost prefix covers single-column lookups.
