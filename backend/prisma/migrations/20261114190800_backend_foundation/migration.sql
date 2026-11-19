-- CreateTable
CREATE TABLE `User` (
    `id` CHAR(36) NOT NULL,
    `email` VARCHAR(254) NOT NULL,
    `username` VARCHAR(80) NULL,
    `phone` VARCHAR(32) NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `role` ENUM('ADMINISTRATOR', 'PATIENT', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'LABORATORY_TECHNICIAN', 'RADIOLOGY_TECHNICIAN', 'PHARMACIST', 'FINANCE_OFFICER', 'HR_OFFICER', 'DEPARTMENT_HEAD', 'HOSPITAL_STAFF') NOT NULL DEFAULT 'PATIENT',
    `status` ENUM('PENDING', 'ACTIVE', 'DISABLED') NOT NULL DEFAULT 'PENDING',
    `firstName` VARCHAR(50) NOT NULL,
    `middleName` VARCHAR(50) NULL,
    `lastName` VARCHAR(50) NOT NULL,
    `department` VARCHAR(100) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_username_key`(`username`),
    UNIQUE INDEX `User_phone_key`(`phone`),
    INDEX `User_role_status_idx`(`role`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Patient` (
    `id` CHAR(36) NOT NULL,
    `patientNumber` VARCHAR(32) NOT NULL,
    `userId` CHAR(36) NULL,
    `firstName` VARCHAR(50) NOT NULL,
    `middleName` VARCHAR(50) NULL,
    `lastName` VARCHAR(50) NOT NULL,
    `sex` VARCHAR(20) NOT NULL,
    `dateOfBirth` DATE NOT NULL,
    `phone` VARCHAR(32) NOT NULL,
    `alternativePhone` VARCHAR(32) NULL,
    `email` VARCHAR(254) NULL,
    `region` VARCHAR(80) NULL,
    `zone` VARCHAR(80) NULL,
    `city` VARCHAR(80) NULL,
    `woreda` VARCHAR(80) NULL,
    `kebele` VARCHAR(80) NULL,
    `address` VARCHAR(255) NULL,
    `bloodGroup` VARCHAR(10) NULL,
    `allergies` TEXT NULL,
    `medicalConditions` TEXT NULL,
    `emergencyContactName` VARCHAR(100) NULL,
    `emergencyRelationship` VARCHAR(60) NULL,
    `emergencyPhone` VARCHAR(32) NULL,
    `emergencyAddress` VARCHAR(255) NULL,
    `guardianName` VARCHAR(100) NULL,
    `guardianRelationship` VARCHAR(60) NULL,
    `guardianContact` VARCHAR(120) NULL,
    `insuranceProvider` VARCHAR(100) NULL,
    `policyNumber` VARCHAR(100) NULL,
    `coverageDetails` VARCHAR(255) NULL,
    `department` VARCHAR(100) NOT NULL,
    `status` ENUM('STABLE', 'CRITICAL', 'RECOVERING', 'DISCHARGED') NOT NULL DEFAULT 'STABLE',
    `registeredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Patient_patientNumber_key`(`patientNumber`),
    UNIQUE INDEX `Patient_userId_key`(`userId`),
    INDEX `Patient_firstName_lastName_idx`(`firstName`, `lastName`),
    INDEX `Patient_phone_idx`(`phone`),
    INDEX `Patient_registeredAt_status_department_idx`(`registeredAt`, `status`, `department`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Doctor` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NULL,
    `name` VARCHAR(120) NOT NULL,
    `specialty` VARCHAR(100) NOT NULL,
    `department` VARCHAR(100) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `Doctor_userId_key`(`userId`),
    INDEX `Doctor_department_active_idx`(`department`, `active`),
    INDEX `Doctor_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DoctorSchedule` (
    `id` CHAR(36) NOT NULL,
    `doctorId` CHAR(36) NOT NULL,
    `department` VARCHAR(100) NOT NULL,
    `dayOfWeek` INTEGER NOT NULL,
    `startTime` CHAR(5) NOT NULL,
    `endTime` CHAR(5) NOT NULL,
    `breakStart` CHAR(5) NULL,
    `breakEnd` CHAR(5) NULL,
    `slotDurationMins` INTEGER NOT NULL DEFAULT 30,

    UNIQUE INDEX `DoctorSchedule_doctorId_dayOfWeek_department_key`(`doctorId`, `dayOfWeek`, `department`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DoctorLeave` (
    `id` CHAR(36) NOT NULL,
    `doctorId` CHAR(36) NOT NULL,
    `startsAt` DATETIME(3) NOT NULL,
    `endsAt` DATETIME(3) NOT NULL,
    `reason` VARCHAR(255) NULL,

    INDEX `DoctorLeave_doctorId_startsAt_endsAt_idx`(`doctorId`, `startsAt`, `endsAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Appointment` (
    `id` CHAR(36) NOT NULL,
    `patientId` CHAR(36) NOT NULL,
    `doctorId` CHAR(36) NOT NULL,
    `department` VARCHAR(100) NOT NULL,
    `scheduledAt` DATETIME(3) NOT NULL,
    `type` ENUM('CONSULTATION', 'FOLLOW_UP', 'EMERGENCY', 'PROCEDURE') NOT NULL,
    `reason` VARCHAR(200) NOT NULL,
    `notes` VARCHAR(500) NULL,
    `status` ENUM('SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'NO_SHOW') NOT NULL DEFAULT 'SCHEDULED',
    `createdById` CHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Appointment_scheduledAt_department_status_idx`(`scheduledAt`, `department`, `status`),
    INDEX `Appointment_patientId_scheduledAt_idx`(`patientId`, `scheduledAt`),
    INDEX `Appointment_doctorId_scheduledAt_status_idx`(`doctorId`, `scheduledAt`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AppointmentSlotLock` (
    `id` CHAR(36) NOT NULL,
    `appointmentId` CHAR(36) NOT NULL,
    `doctorId` CHAR(36) NOT NULL,
    `scheduledAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AppointmentSlotLock_appointmentId_key`(`appointmentId`),
    UNIQUE INDEX `AppointmentSlotLock_doctorId_scheduledAt_key`(`doctorId`, `scheduledAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QueueCounter` (
    `id` CHAR(36) NOT NULL,
    `department` VARCHAR(100) NOT NULL,
    `queueDate` DATE NOT NULL,
    `lastNumber` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `QueueCounter_department_queueDate_key`(`department`, `queueDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QueueEntry` (
    `id` CHAR(36) NOT NULL,
    `queueNumber` INTEGER NOT NULL,
    `queueDate` DATE NOT NULL,
    `patientId` CHAR(36) NOT NULL,
    `appointmentId` CHAR(36) NULL,
    `department` VARCHAR(100) NOT NULL,
    `doctorId` CHAR(36) NULL,
    `status` ENUM('WAITING', 'CONSULTING', 'COMPLETED', 'ABSENT', 'TRANSFERRED') NOT NULL DEFAULT 'WAITING',
    `checkedInAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,

    UNIQUE INDEX `QueueEntry_appointmentId_key`(`appointmentId`),
    INDEX `QueueEntry_department_queueDate_status_queueNumber_idx`(`department`, `queueDate`, `status`, `queueNumber`),
    UNIQUE INDEX `QueueEntry_department_queueDate_queueNumber_key`(`department`, `queueDate`, `queueNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RefreshSession` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `tokenHash` VARCHAR(64) NOT NULL,
    `rememberMe` BOOLEAN NOT NULL DEFAULT true,
    `expiresAt` DATETIME(3) NOT NULL,
    `revokedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `RefreshSession_tokenHash_key`(`tokenHash`),
    INDEX `RefreshSession_userId_expiresAt_revokedAt_idx`(`userId`, `expiresAt`, `revokedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PasswordReset` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `tokenHash` VARCHAR(64) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PasswordReset_tokenHash_key`(`tokenHash`),
    INDEX `PasswordReset_userId_expiresAt_usedAt_idx`(`userId`, `expiresAt`, `usedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` CHAR(36) NOT NULL,
    `actorId` CHAR(36) NULL,
    `action` VARCHAR(100) NOT NULL,
    `entityType` VARCHAR(80) NOT NULL,
    `entityId` VARCHAR(80) NULL,
    `requestId` VARCHAR(64) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_actorId_createdAt_idx`(`actorId`, `createdAt`),
    INDEX `AuditLog_entityType_entityId_createdAt_idx`(`entityType`, `entityId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClinicalEncounter` (
    `id` CHAR(36) NOT NULL,
    `patientId` CHAR(36) NOT NULL,
    `department` VARCHAR(100) NOT NULL,
    `clinicianId` CHAR(36) NOT NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,
    `status` ENUM('ACTIVE', 'COMPLETED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ClinicalEncounter_patientId_startedAt_idx`(`patientId`, `startedAt`),
    INDEX `ClinicalEncounter_department_status_startedAt_idx`(`department`, `status`, `startedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ConsultationNote` (
    `id` CHAR(36) NOT NULL,
    `patientId` CHAR(36) NOT NULL,
    `encounterId` CHAR(36) NULL,
    `authorId` CHAR(36) NOT NULL,
    `data` JSON NOT NULL,
    `status` ENUM('DRAFT', 'FINALIZED') NOT NULL DEFAULT 'DRAFT',
    `recordedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ConsultationNote_patientId_recordedAt_idx`(`patientId`, `recordedAt`),
    INDEX `ConsultationNote_encounterId_status_idx`(`encounterId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NursingNote` (
    `id` CHAR(36) NOT NULL,
    `patientId` CHAR(36) NOT NULL,
    `encounterId` CHAR(36) NULL,
    `authorId` CHAR(36) NOT NULL,
    `data` JSON NOT NULL,
    `status` ENUM('DRAFT', 'FINALIZED') NOT NULL DEFAULT 'FINALIZED',
    `recordedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `NursingNote_patientId_recordedAt_idx`(`patientId`, `recordedAt`),
    INDEX `NursingNote_encounterId_recordedAt_idx`(`encounterId`, `recordedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VitalSignObservation` (
    `id` CHAR(36) NOT NULL,
    `patientId` CHAR(36) NOT NULL,
    `encounterId` CHAR(36) NULL,
    `recordedById` CHAR(36) NOT NULL,
    `recordedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `bloodPressure` VARCHAR(16) NOT NULL,
    `bloodPressureUnit` VARCHAR(12) NOT NULL DEFAULT 'mmHg',
    `heartRate` DOUBLE NOT NULL,
    `heartRateUnit` VARCHAR(12) NOT NULL DEFAULT 'bpm',
    `respiratoryRate` DOUBLE NOT NULL,
    `respiratoryUnit` VARCHAR(20) NOT NULL DEFAULT 'breaths/min',
    `temperature` DOUBLE NOT NULL,
    `temperatureUnit` VARCHAR(8) NOT NULL DEFAULT 'C',
    `oxygenSaturation` DOUBLE NOT NULL,
    `oxygenUnit` VARCHAR(8) NOT NULL DEFAULT '%',
    `weight` DOUBLE NOT NULL,
    `weightUnit` VARCHAR(8) NOT NULL DEFAULT 'kg',
    `height` DOUBLE NOT NULL,
    `heightUnit` VARCHAR(8) NOT NULL DEFAULT 'cm',
    `painScore` INTEGER NOT NULL,
    `painScale` VARCHAR(16) NOT NULL DEFAULT '0-10',
    `otherObservations` JSON NULL,

    INDEX `VitalSignObservation_patientId_recordedAt_idx`(`patientId`, `recordedAt`),
    INDEX `VitalSignObservation_encounterId_recordedAt_idx`(`encounterId`, `recordedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DiagnosisRecord` (
    `id` CHAR(36) NOT NULL,
    `patientId` CHAR(36) NOT NULL,
    `encounterId` CHAR(36) NULL,
    `authorId` CHAR(36) NOT NULL,
    `diagnosis` VARCHAR(300) NOT NULL,
    `code` VARCHAR(30) NULL,
    `diagnosedAt` DATETIME(3) NOT NULL,
    `clinician` VARCHAR(120) NOT NULL,
    `clinicalNotes` TEXT NULL,
    `isPrimary` BOOLEAN NOT NULL DEFAULT false,
    `recordedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DiagnosisRecord_patientId_diagnosedAt_idx`(`patientId`, `diagnosedAt`),
    INDEX `DiagnosisRecord_encounterId_diagnosedAt_idx`(`encounterId`, `diagnosedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AllergyRecord` (
    `id` CHAR(36) NOT NULL,
    `patientId` CHAR(36) NOT NULL,
    `authorId` CHAR(36) NOT NULL,
    `allergyName` VARCHAR(120) NOT NULL,
    `reaction` VARCHAR(300) NOT NULL,
    `severity` VARCHAR(20) NOT NULL,
    `verificationStatus` VARCHAR(20) NOT NULL,
    `recordedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AllergyRecord_patientId_recordedAt_idx`(`patientId`, `recordedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TreatmentPlanRecord` (
    `id` CHAR(36) NOT NULL,
    `patientId` CHAR(36) NOT NULL,
    `encounterId` CHAR(36) NULL,
    `authorId` CHAR(36) NOT NULL,
    `data` JSON NOT NULL,
    `status` ENUM('DRAFT', 'FINALIZED') NOT NULL DEFAULT 'FINALIZED',
    `recordedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TreatmentPlanRecord_patientId_recordedAt_idx`(`patientId`, `recordedAt`),
    INDEX `TreatmentPlanRecord_encounterId_recordedAt_idx`(`encounterId`, `recordedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClinicalReferral` (
    `id` CHAR(36) NOT NULL,
    `patientId` CHAR(36) NOT NULL,
    `encounterId` CHAR(36) NULL,
    `authorId` CHAR(36) NOT NULL,
    `referralType` VARCHAR(20) NOT NULL,
    `receivingDepartment` VARCHAR(120) NOT NULL,
    `referralReason` VARCHAR(1000) NOT NULL,
    `referringDoctor` VARCHAR(120) NOT NULL,
    `priority` VARCHAR(20) NOT NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `documents` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ClinicalReferral_patientId_createdAt_idx`(`patientId`, `createdAt`),
    INDEX `ClinicalReferral_receivingDepartment_status_priority_idx`(`receivingDepartment`, `status`, `priority`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClinicalAmendment` (
    `id` CHAR(36) NOT NULL,
    `recordType` VARCHAR(60) NOT NULL,
    `recordId` CHAR(36) NOT NULL,
    `authorId` CHAR(36) NOT NULL,
    `reason` VARCHAR(500) NOT NULL,
    `changes` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ClinicalAmendment_recordType_recordId_createdAt_idx`(`recordType`, `recordId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TemporaryEmergencyPatient` (
    `id` CHAR(36) NOT NULL,
    `temporaryNumber` VARCHAR(32) NOT NULL,
    `fullName` VARCHAR(120) NULL,
    `sex` VARCHAR(20) NULL,
    `dateOfBirth` DATE NULL,
    `phone` VARCHAR(32) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `TemporaryEmergencyPatient_temporaryNumber_key`(`temporaryNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmergencyCase` (
    `id` CHAR(36) NOT NULL,
    `caseNumber` VARCHAR(32) NOT NULL,
    `patientId` CHAR(36) NULL,
    `temporaryPatientId` CHAR(36) NULL,
    `patientIdentifier` VARCHAR(32) NULL,
    `createdById` CHAR(36) NOT NULL,
    `arrivalAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `arrivalMode` VARCHAR(40) NOT NULL,
    `presentingComplaint` TEXT NOT NULL,
    `status` ENUM('ARRIVAL', 'TRIAGE', 'WAITING', 'ASSESSMENT', 'TREATMENT', 'OBSERVATION', 'ADMISSION', 'REFERRAL', 'TRANSFER', 'DISCHARGE') NOT NULL DEFAULT 'ARRIVAL',
    `assignedStaffId` CHAR(36) NULL,
    `assignedStaffName` VARCHAR(120) NULL,
    `department` VARCHAR(100) NOT NULL DEFAULT 'Emergency',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `EmergencyCase_caseNumber_key`(`caseNumber`),
    INDEX `EmergencyCase_status_arrivalAt_idx`(`status`, `arrivalAt`),
    INDEX `EmergencyCase_patientId_arrivalAt_idx`(`patientId`, `arrivalAt`),
    INDEX `EmergencyCase_department_status_arrivalAt_idx`(`department`, `status`, `arrivalAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmergencyTriage` (
    `id` CHAR(36) NOT NULL,
    `emergencyCaseId` CHAR(36) NOT NULL,
    `recordedById` CHAR(36) NOT NULL,
    `category` VARCHAR(40) NOT NULL,
    `priority` VARCHAR(40) NOT NULL,
    `assignedStaff` VARCHAR(120) NOT NULL,
    `assessmentNotes` TEXT NOT NULL,
    `vitalSigns` JSON NOT NULL,
    `protocolName` VARCHAR(160) NULL,
    `protocolVersion` VARCHAR(60) NULL,
    `reassessment` BOOLEAN NOT NULL DEFAULT false,
    `recordedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EmergencyTriage_emergencyCaseId_recordedAt_idx`(`emergencyCaseId`, `recordedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmergencyWorkflowEvent` (
    `id` CHAR(36) NOT NULL,
    `emergencyCaseId` CHAR(36) NOT NULL,
    `actorId` CHAR(36) NOT NULL,
    `fromStatus` ENUM('ARRIVAL', 'TRIAGE', 'WAITING', 'ASSESSMENT', 'TREATMENT', 'OBSERVATION', 'ADMISSION', 'REFERRAL', 'TRANSFER', 'DISCHARGE') NOT NULL,
    `toStatus` ENUM('ARRIVAL', 'TRIAGE', 'WAITING', 'ASSESSMENT', 'TREATMENT', 'OBSERVATION', 'ADMISSION', 'REFERRAL', 'TRANSFER', 'DISCHARGE') NOT NULL,
    `destination` VARCHAR(160) NULL,
    `instructions` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EmergencyWorkflowEvent_emergencyCaseId_createdAt_idx`(`emergencyCaseId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmergencyConsultation` (
    `id` CHAR(36) NOT NULL,
    `emergencyCaseId` CHAR(36) NOT NULL,
    `authorId` CHAR(36) NOT NULL,
    `assessment` TEXT NOT NULL,
    `diagnosis` VARCHAR(300) NOT NULL,
    `treatment` TEXT NOT NULL,
    `investigations` TEXT NULL,
    `recordedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EmergencyConsultation_emergencyCaseId_recordedAt_idx`(`emergencyCaseId`, `recordedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmergencyResourceAssignment` (
    `id` CHAR(36) NOT NULL,
    `emergencyCaseId` CHAR(36) NOT NULL,
    `resourceType` VARCHAR(40) NOT NULL,
    `resourceId` VARCHAR(80) NOT NULL,
    `assignedById` CHAR(36) NOT NULL,
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `releasedAt` DATETIME(3) NULL,

    INDEX `EmergencyResourceAssignment_emergencyCaseId_assignedAt_idx`(`emergencyCaseId`, `assignedAt`),
    INDEX `EmergencyResourceAssignment_resourceType_resourceId_released_idx`(`resourceType`, `resourceId`, `releasedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DepartmentAssignment` (
    `id` CHAR(36) NOT NULL,
    `patientId` CHAR(36) NOT NULL,
    `department` VARCHAR(100) NOT NULL,
    `focus` VARCHAR(300) NOT NULL,
    `clinician` VARCHAR(120) NOT NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    `assignedById` CHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DepartmentAssignment_department_status_createdAt_idx`(`department`, `status`, `createdAt`),
    INDEX `DepartmentAssignment_patientId_createdAt_idx`(`patientId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DepartmentWorkflowRecord` (
    `id` CHAR(36) NOT NULL,
    `patientId` CHAR(36) NOT NULL,
    `encounterId` CHAR(36) NULL,
    `department` VARCHAR(100) NOT NULL,
    `kind` VARCHAR(80) NOT NULL,
    `details` JSON NOT NULL,
    `summary` VARCHAR(500) NOT NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED',
    `recordedById` CHAR(36) NOT NULL,
    `recordedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DepartmentWorkflowRecord_patientId_recordedAt_idx`(`patientId`, `recordedAt`),
    INDEX `DepartmentWorkflowRecord_department_kind_status_recordedAt_idx`(`department`, `kind`, `status`, `recordedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LaboratoryTestCatalogItem` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(40) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `specimenType` VARCHAR(100) NOT NULL,
    `instructions` VARCHAR(500) NULL,
    `unit` VARCHAR(40) NULL,
    `referenceInterval` VARCHAR(120) NULL,
    `servicePrice` DECIMAL(10, 2) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `LaboratoryTestCatalogItem_code_key`(`code`),
    INDEX `LaboratoryTestCatalogItem_category_active_idx`(`category`, `active`),
    INDEX `LaboratoryTestCatalogItem_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LaboratoryOrder` (
    `id` CHAR(36) NOT NULL,
    `orderNumber` VARCHAR(32) NOT NULL,
    `patientId` CHAR(36) NOT NULL,
    `requestedById` CHAR(36) NOT NULL,
    `assignedToId` CHAR(36) NULL,
    `department` VARCHAR(100) NOT NULL,
    `priority` VARCHAR(20) NOT NULL DEFAULT 'Routine',
    `status` ENUM('PENDING', 'ASSIGNED', 'SPECIMEN_COLLECTED', 'PROCESSING', 'AWAITING_RESULT', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `cancelledAt` DATETIME(3) NULL,
    `cancellationReason` VARCHAR(300) NULL,

    UNIQUE INDEX `LaboratoryOrder_orderNumber_key`(`orderNumber`),
    INDEX `LaboratoryOrder_patientId_requestedAt_idx`(`patientId`, `requestedAt`),
    INDEX `LaboratoryOrder_department_status_requestedAt_idx`(`department`, `status`, `requestedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LaboratoryOrderItem` (
    `id` CHAR(36) NOT NULL,
    `orderId` CHAR(36) NOT NULL,
    `catalogId` CHAR(36) NOT NULL,

    UNIQUE INDEX `LaboratoryOrderItem_orderId_catalogId_key`(`orderId`, `catalogId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LaboratorySpecimen` (
    `id` CHAR(36) NOT NULL,
    `specimenNumber` VARCHAR(32) NOT NULL,
    `orderId` CHAR(36) NOT NULL,
    `specimenType` VARCHAR(100) NOT NULL,
    `collectedAt` DATETIME(3) NOT NULL,
    `collectedById` CHAR(36) NOT NULL,
    `receivedAt` DATETIME(3) NULL,
    `receivedById` CHAR(36) NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'COLLECTED',
    `rejectionReason` VARCHAR(500) NULL,
    `storageDetails` VARCHAR(300) NULL,

    UNIQUE INDEX `LaboratorySpecimen_specimenNumber_key`(`specimenNumber`),
    INDEX `LaboratorySpecimen_orderId_collectedAt_idx`(`orderId`, `collectedAt`),
    INDEX `LaboratorySpecimen_status_collectedAt_idx`(`status`, `collectedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LaboratoryResult` (
    `id` CHAR(36) NOT NULL,
    `orderItemId` CHAR(36) NOT NULL,
    `authorId` CHAR(36) NOT NULL,
    `reviewerId` CHAR(36) NULL,
    `kind` VARCHAR(20) NOT NULL,
    `value` TEXT NOT NULL,
    `unit` VARCHAR(40) NULL,
    `referenceRange` VARCHAR(120) NULL,
    `abnormalFlag` VARCHAR(20) NOT NULL,
    `comments` TEXT NULL,
    `status` ENUM('DRAFT', 'AWAITING_APPROVAL', 'APPROVED', 'RELEASED') NOT NULL DEFAULT 'DRAFT',
    `recordedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `approvedAt` DATETIME(3) NULL,
    `releasedAt` DATETIME(3) NULL,

    UNIQUE INDEX `LaboratoryResult_orderItemId_key`(`orderItemId`),
    INDEX `LaboratoryResult_status_recordedAt_idx`(`status`, `recordedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LaboratoryResultAmendment` (
    `id` CHAR(36) NOT NULL,
    `resultId` CHAR(36) NOT NULL,
    `authorId` CHAR(36) NOT NULL,
    `reason` VARCHAR(500) NOT NULL,
    `previous` JSON NOT NULL,
    `replacement` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LaboratoryResultAmendment_resultId_createdAt_idx`(`resultId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RadiologyCatalogItem` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(40) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `modality` VARCHAR(40) NOT NULL,
    `bodyArea` VARCHAR(120) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `RadiologyCatalogItem_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RadiologyRequest` (
    `id` CHAR(36) NOT NULL,
    `requestNumber` VARCHAR(32) NOT NULL,
    `patientId` CHAR(36) NOT NULL,
    `catalogId` CHAR(36) NULL,
    `requestedById` CHAR(36) NOT NULL,
    `doctor` VARCHAR(120) NOT NULL,
    `department` VARCHAR(100) NOT NULL,
    `modality` VARCHAR(40) NOT NULL,
    `procedure` VARCHAR(160) NOT NULL,
    `bodyArea` VARCHAR(120) NULL,
    `clinicalIndication` VARCHAR(1000) NOT NULL,
    `scheduledAt` DATETIME(3) NULL,
    `status` ENUM('PENDING', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `RadiologyRequest_requestNumber_key`(`requestNumber`),
    INDEX `RadiologyRequest_patientId_createdAt_idx`(`patientId`, `createdAt`),
    INDEX `RadiologyRequest_department_status_scheduledAt_idx`(`department`, `status`, `scheduledAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ImagingReport` (
    `id` CHAR(36) NOT NULL,
    `requestId` CHAR(36) NOT NULL,
    `authorId` CHAR(36) NOT NULL,
    `reviewerId` CHAR(36) NULL,
    `findings` TEXT NOT NULL,
    `impression` TEXT NOT NULL,
    `status` ENUM('DRAFT', 'AWAITING_APPROVAL', 'APPROVED', 'RELEASED') NOT NULL DEFAULT 'DRAFT',
    `recordedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `approvedAt` DATETIME(3) NULL,
    `releasedAt` DATETIME(3) NULL,

    UNIQUE INDEX `ImagingReport_requestId_key`(`requestId`),
    INDEX `ImagingReport_status_recordedAt_idx`(`status`, `recordedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BloodDonor` (
    `id` CHAR(36) NOT NULL,
    `donorNumber` VARCHAR(32) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `bloodGroup` VARCHAR(4) NOT NULL,
    `eligibility` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `registeredById` CHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `BloodDonor_donorNumber_key`(`donorNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BloodDonation` (
    `id` CHAR(36) NOT NULL,
    `donationNumber` VARCHAR(32) NOT NULL,
    `donorId` CHAR(36) NOT NULL,
    `patientId` CHAR(36) NULL,
    `recordedById` CHAR(36) NOT NULL,
    `donatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `BloodDonation_donationNumber_key`(`donationNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BloodBankUnit` (
    `id` CHAR(36) NOT NULL,
    `unitNumber` VARCHAR(40) NOT NULL,
    `donationId` CHAR(36) NULL,
    `bloodGroup` VARCHAR(4) NOT NULL,
    `component` VARCHAR(60) NOT NULL,
    `collectedAt` DATETIME(3) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `screeningStatus` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `status` ENUM('QUARANTINED', 'AVAILABLE', 'RESERVED', 'ISSUED', 'RETURNED', 'DISCARDED') NOT NULL DEFAULT 'QUARANTINED',

    UNIQUE INDEX `BloodBankUnit_unitNumber_key`(`unitNumber`),
    INDEX `BloodBankUnit_bloodGroup_component_status_expiresAt_idx`(`bloodGroup`, `component`, `status`, `expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BloodRequest` (
    `id` CHAR(36) NOT NULL,
    `requestNumber` VARCHAR(32) NOT NULL,
    `patientId` CHAR(36) NOT NULL,
    `requestedById` CHAR(36) NOT NULL,
    `bloodGroup` VARCHAR(4) NOT NULL,
    `component` VARCHAR(60) NOT NULL,
    `unitsRequested` INTEGER NOT NULL,
    `requestingDepartment` VARCHAR(100) NOT NULL,
    `priority` VARCHAR(20) NOT NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `BloodRequest_requestNumber_key`(`requestNumber`),
    INDEX `BloodRequest_status_priority_createdAt_idx`(`status`, `priority`, `createdAt`),
    INDEX `BloodRequest_patientId_createdAt_idx`(`patientId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BloodCrossmatch` (
    `id` CHAR(36) NOT NULL,
    `requestId` CHAR(36) NOT NULL,
    `unitId` CHAR(36) NOT NULL,
    `recordedById` CHAR(36) NOT NULL,
    `result` VARCHAR(30) NOT NULL,
    `testedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `BloodCrossmatch_requestId_unitId_key`(`requestId`, `unitId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BloodIssue` (
    `id` CHAR(36) NOT NULL,
    `requestId` CHAR(36) NOT NULL,
    `unitId` CHAR(36) NOT NULL,
    `issuedById` CHAR(36) NOT NULL,
    `issuedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `returnedAt` DATETIME(3) NULL,
    `returnReason` VARCHAR(300) NULL,

    INDEX `BloodIssue_unitId_returnedAt_idx`(`unitId`, `returnedAt`),
    UNIQUE INDEX `BloodIssue_requestId_unitId_key`(`requestId`, `unitId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Invoice` (
    `id` CHAR(36) NOT NULL,
    `invoiceNumber` VARCHAR(40) NOT NULL,
    `patientId` CHAR(36) NOT NULL,
    `payer` VARCHAR(120) NOT NULL,
    `currency` CHAR(3) NOT NULL DEFAULT 'ETB',
    `subtotal` DECIMAL(12, 2) NOT NULL,
    `discount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `total` DECIMAL(12, 2) NOT NULL,
    `paidAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `status` ENUM('UNPAID', 'PARTIALLY_PAID', 'PAID', 'VOID') NOT NULL DEFAULT 'UNPAID',
    `issuedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dueAt` DATETIME(3) NOT NULL,
    `finalizedAt` DATETIME(3) NULL,
    `createdById` CHAR(36) NOT NULL,
    `discountApprovedById` CHAR(36) NULL,
    `discountReason` VARCHAR(300) NULL,

    UNIQUE INDEX `Invoice_invoiceNumber_key`(`invoiceNumber`),
    INDEX `Invoice_patientId_issuedAt_idx`(`patientId`, `issuedAt`),
    INDEX `Invoice_status_issuedAt_idx`(`status`, `issuedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InvoiceItem` (
    `id` CHAR(36) NOT NULL,
    `invoiceId` CHAR(36) NOT NULL,
    `serviceId` CHAR(36) NULL,
    `serviceName` VARCHAR(160) NOT NULL,
    `category` VARCHAR(80) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `unitPrice` DECIMAL(12, 2) NOT NULL,
    `discount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `lineTotal` DECIMAL(12, 2) NOT NULL,

    INDEX `InvoiceItem_invoiceId_idx`(`invoiceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payment` (
    `id` CHAR(36) NOT NULL,
    `receiptNumber` VARCHAR(40) NOT NULL,
    `invoiceId` CHAR(36) NOT NULL,
    `receivedById` CHAR(36) NOT NULL,
    `method` ENUM('CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CARD', 'INSURANCE') NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `currency` CHAR(3) NOT NULL DEFAULT 'ETB',
    `transactionReference` VARCHAR(120) NULL,
    `notes` VARCHAR(300) NULL,
    `status` ENUM('VALIDATED', 'REVERSED') NOT NULL DEFAULT 'VALIDATED',
    `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Payment_receiptNumber_key`(`receiptNumber`),
    INDEX `Payment_invoiceId_receivedAt_idx`(`invoiceId`, `receivedAt`),
    INDEX `Payment_status_receivedAt_idx`(`status`, `receivedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RefundRequest` (
    `id` CHAR(36) NOT NULL,
    `refundNumber` VARCHAR(40) NOT NULL,
    `invoiceId` CHAR(36) NOT NULL,
    `paymentId` CHAR(36) NULL,
    `requestedById` CHAR(36) NOT NULL,
    `approvedById` CHAR(36) NULL,
    `paidById` CHAR(36) NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `reason` VARCHAR(500) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'PAID_OUT', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `approvedAt` DATETIME(3) NULL,
    `paidAt` DATETIME(3) NULL,

    UNIQUE INDEX `RefundRequest_refundNumber_key`(`refundNumber`),
    INDEX `RefundRequest_invoiceId_requestedAt_idx`(`invoiceId`, `requestedAt`),
    INDEX `RefundRequest_status_requestedAt_idx`(`status`, `requestedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InvoiceAmendment` (
    `id` CHAR(36) NOT NULL,
    `invoiceId` CHAR(36) NOT NULL,
    `actorId` CHAR(36) NOT NULL,
    `reason` VARCHAR(500) NOT NULL,
    `changes` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `InvoiceAmendment_invoiceId_createdAt_idx`(`invoiceId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServicePrice` (
    `id` CHAR(36) NOT NULL,
    `service` VARCHAR(160) NOT NULL,
    `category` VARCHAR(80) NOT NULL,
    `unitPrice` DECIMAL(12, 2) NOT NULL,
    `insuranceCovered` BOOLEAN NOT NULL DEFAULT false,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ServicePrice_service_key`(`service`),
    INDEX `ServicePrice_category_active_idx`(`category`, `active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InsuranceProvider` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `contactPerson` VARCHAR(120) NULL,
    `phone` VARCHAR(32) NULL,
    `defaultCoverageRate` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `InsuranceProvider_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PatientInsurancePolicy` (
    `id` CHAR(36) NOT NULL,
    `patientId` CHAR(36) NOT NULL,
    `providerId` CHAR(36) NOT NULL,
    `policyNumber` VARCHAR(100) NOT NULL,
    `plan` VARCHAR(120) NOT NULL,
    `validUntil` DATE NOT NULL,
    `eligibility` VARCHAR(30) NOT NULL DEFAULT 'NOT_VERIFIED',

    UNIQUE INDEX `PatientInsurancePolicy_policyNumber_key`(`policyNumber`),
    INDEX `PatientInsurancePolicy_patientId_validUntil_idx`(`patientId`, `validUntil`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InsuranceClaim` (
    `id` CHAR(36) NOT NULL,
    `claimNumber` VARCHAR(40) NOT NULL,
    `policyId` CHAR(36) NOT NULL,
    `patientId` CHAR(36) NOT NULL,
    `invoiceId` CHAR(36) NULL,
    `claimAmount` DECIMAL(12, 2) NOT NULL,
    `approvedAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `status` VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    `submittedAt` DATETIME(3) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `InsuranceClaim_claimNumber_key`(`claimNumber`),
    INDEX `InsuranceClaim_patientId_updatedAt_idx`(`patientId`, `updatedAt`),
    INDEX `InsuranceClaim_status_updatedAt_idx`(`status`, `updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PortalNotification` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `patientId` CHAR(36) NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `message` VARCHAR(1000) NOT NULL,
    `category` ENUM('APPOINTMENTS', 'RESULTS', 'BILLING', 'HOSPITAL') NOT NULL,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PortalNotification_userId_readAt_createdAt_idx`(`userId`, `readAt`, `createdAt`),
    INDEX `PortalNotification_patientId_createdAt_idx`(`patientId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HospitalAnnouncement` (
    `id` CHAR(36) NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `message` TEXT NOT NULL,
    `publishedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `active` BOOLEAN NOT NULL DEFAULT true,

    INDEX `HospitalAnnouncement_active_publishedAt_idx`(`active`, `publishedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PortalSupportRequest` (
    `id` CHAR(36) NOT NULL,
    `patientId` CHAR(36) NOT NULL,
    `requestedById` CHAR(36) NOT NULL,
    `assignedHandlerId` CHAR(36) NULL,
    `category` ENUM('FEEDBACK', 'COMPLAINT', 'SUPPORT_REQUEST') NOT NULL,
    `subject` VARCHAR(160) NOT NULL,
    `message` TEXT NOT NULL,
    `response` TEXT NULL,
    `status` ENUM('OPEN', 'IN_REVIEW', 'RESPONDED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PortalSupportRequest_patientId_createdAt_idx`(`patientId`, `createdAt`),
    INDEX `PortalSupportRequest_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Employee` (
    `id` CHAR(36) NOT NULL,
    `employeeNumber` VARCHAR(40) NOT NULL,
    `userId` CHAR(36) NULL,
    `fullName` VARCHAR(160) NOT NULL,
    `jobTitle` VARCHAR(120) NOT NULL,
    `category` VARCHAR(40) NOT NULL,
    `department` VARCHAR(100) NOT NULL,
    `hiredAt` DATETIME(3) NOT NULL,
    `phone` VARCHAR(32) NOT NULL,
    `email` VARCHAR(254) NULL,
    `qualifications` JSON NOT NULL,
    `documents` JSON NOT NULL,
    `employmentStatus` VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Employee_employeeNumber_key`(`employeeNumber`),
    UNIQUE INDEX `Employee_userId_key`(`userId`),
    INDEX `Employee_department_employmentStatus_idx`(`department`, `employmentStatus`),
    INDEX `Employee_fullName_idx`(`fullName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AttendanceRecord` (
    `id` CHAR(36) NOT NULL,
    `employeeId` CHAR(36) NOT NULL,
    `recordedById` CHAR(36) NOT NULL,
    `workDate` DATE NOT NULL,
    `checkInAt` DATETIME(3) NULL,
    `checkOutAt` DATETIME(3) NULL,
    `lateMinutes` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(30) NOT NULL,

    INDEX `AttendanceRecord_workDate_status_idx`(`workDate`, `status`),
    UNIQUE INDEX `AttendanceRecord_employeeId_workDate_key`(`employeeId`, `workDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ShiftAssignment` (
    `id` CHAR(36) NOT NULL,
    `employeeId` CHAR(36) NOT NULL,
    `department` VARCHAR(100) NOT NULL,
    `shiftType` VARCHAR(40) NOT NULL,
    `startsAt` DATETIME(3) NOT NULL,
    `endsAt` DATETIME(3) NOT NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'TENTATIVE',
    `createdById` CHAR(36) NOT NULL,

    INDEX `ShiftAssignment_department_startsAt_idx`(`department`, `startsAt`),
    INDEX `ShiftAssignment_employeeId_startsAt_idx`(`employeeId`, `startsAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LeaveRequest` (
    `id` CHAR(36) NOT NULL,
    `employeeId` CHAR(36) NOT NULL,
    `requestedById` CHAR(36) NOT NULL,
    `approvedById` CHAR(36) NULL,
    `leaveType` VARCHAR(80) NOT NULL,
    `startsAt` DATE NOT NULL,
    `endsAt` DATE NOT NULL,
    `days` INTEGER NOT NULL,
    `reason` VARCHAR(500) NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `decidedAt` DATETIME(3) NULL,

    INDEX `LeaveRequest_employeeId_startsAt_idx`(`employeeId`, `startsAt`),
    INDEX `LeaveRequest_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PayrollRecord` (
    `id` CHAR(36) NOT NULL,
    `employeeId` CHAR(36) NOT NULL,
    `period` VARCHAR(20) NOT NULL,
    `baseSalary` DECIMAL(12, 2) NOT NULL,
    `allowances` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `overtime` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `deductions` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `netPay` DECIMAL(12, 2) NOT NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    `createdById` CHAR(36) NOT NULL,
    `approvedById` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PayrollRecord_period_status_idx`(`period`, `status`),
    UNIQUE INDEX `PayrollRecord_employeeId_period_key`(`employeeId`, `period`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Patient` ADD CONSTRAINT `Patient_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Doctor` ADD CONSTRAINT `Doctor_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DoctorSchedule` ADD CONSTRAINT `DoctorSchedule_doctorId_fkey` FOREIGN KEY (`doctorId`) REFERENCES `Doctor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DoctorLeave` ADD CONSTRAINT `DoctorLeave_doctorId_fkey` FOREIGN KEY (`doctorId`) REFERENCES `Doctor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Appointment` ADD CONSTRAINT `Appointment_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Appointment` ADD CONSTRAINT `Appointment_doctorId_fkey` FOREIGN KEY (`doctorId`) REFERENCES `Doctor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Appointment` ADD CONSTRAINT `Appointment_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AppointmentSlotLock` ADD CONSTRAINT `AppointmentSlotLock_appointmentId_fkey` FOREIGN KEY (`appointmentId`) REFERENCES `Appointment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QueueEntry` ADD CONSTRAINT `QueueEntry_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QueueEntry` ADD CONSTRAINT `QueueEntry_appointmentId_fkey` FOREIGN KEY (`appointmentId`) REFERENCES `Appointment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QueueEntry` ADD CONSTRAINT `QueueEntry_doctorId_fkey` FOREIGN KEY (`doctorId`) REFERENCES `Doctor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RefreshSession` ADD CONSTRAINT `RefreshSession_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PasswordReset` ADD CONSTRAINT `PasswordReset_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClinicalEncounter` ADD CONSTRAINT `ClinicalEncounter_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClinicalEncounter` ADD CONSTRAINT `ClinicalEncounter_clinicianId_fkey` FOREIGN KEY (`clinicianId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConsultationNote` ADD CONSTRAINT `ConsultationNote_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConsultationNote` ADD CONSTRAINT `ConsultationNote_encounterId_fkey` FOREIGN KEY (`encounterId`) REFERENCES `ClinicalEncounter`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConsultationNote` ADD CONSTRAINT `ConsultationNote_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NursingNote` ADD CONSTRAINT `NursingNote_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NursingNote` ADD CONSTRAINT `NursingNote_encounterId_fkey` FOREIGN KEY (`encounterId`) REFERENCES `ClinicalEncounter`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NursingNote` ADD CONSTRAINT `NursingNote_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VitalSignObservation` ADD CONSTRAINT `VitalSignObservation_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VitalSignObservation` ADD CONSTRAINT `VitalSignObservation_encounterId_fkey` FOREIGN KEY (`encounterId`) REFERENCES `ClinicalEncounter`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VitalSignObservation` ADD CONSTRAINT `VitalSignObservation_recordedById_fkey` FOREIGN KEY (`recordedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DiagnosisRecord` ADD CONSTRAINT `DiagnosisRecord_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DiagnosisRecord` ADD CONSTRAINT `DiagnosisRecord_encounterId_fkey` FOREIGN KEY (`encounterId`) REFERENCES `ClinicalEncounter`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DiagnosisRecord` ADD CONSTRAINT `DiagnosisRecord_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AllergyRecord` ADD CONSTRAINT `AllergyRecord_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AllergyRecord` ADD CONSTRAINT `AllergyRecord_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TreatmentPlanRecord` ADD CONSTRAINT `TreatmentPlanRecord_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TreatmentPlanRecord` ADD CONSTRAINT `TreatmentPlanRecord_encounterId_fkey` FOREIGN KEY (`encounterId`) REFERENCES `ClinicalEncounter`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TreatmentPlanRecord` ADD CONSTRAINT `TreatmentPlanRecord_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClinicalReferral` ADD CONSTRAINT `ClinicalReferral_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClinicalReferral` ADD CONSTRAINT `ClinicalReferral_encounterId_fkey` FOREIGN KEY (`encounterId`) REFERENCES `ClinicalEncounter`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClinicalReferral` ADD CONSTRAINT `ClinicalReferral_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClinicalAmendment` ADD CONSTRAINT `ClinicalAmendment_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmergencyCase` ADD CONSTRAINT `EmergencyCase_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmergencyCase` ADD CONSTRAINT `EmergencyCase_temporaryPatientId_fkey` FOREIGN KEY (`temporaryPatientId`) REFERENCES `TemporaryEmergencyPatient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmergencyCase` ADD CONSTRAINT `EmergencyCase_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmergencyTriage` ADD CONSTRAINT `EmergencyTriage_emergencyCaseId_fkey` FOREIGN KEY (`emergencyCaseId`) REFERENCES `EmergencyCase`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmergencyTriage` ADD CONSTRAINT `EmergencyTriage_recordedById_fkey` FOREIGN KEY (`recordedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmergencyWorkflowEvent` ADD CONSTRAINT `EmergencyWorkflowEvent_emergencyCaseId_fkey` FOREIGN KEY (`emergencyCaseId`) REFERENCES `EmergencyCase`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmergencyWorkflowEvent` ADD CONSTRAINT `EmergencyWorkflowEvent_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmergencyConsultation` ADD CONSTRAINT `EmergencyConsultation_emergencyCaseId_fkey` FOREIGN KEY (`emergencyCaseId`) REFERENCES `EmergencyCase`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmergencyConsultation` ADD CONSTRAINT `EmergencyConsultation_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DepartmentAssignment` ADD CONSTRAINT `DepartmentAssignment_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DepartmentAssignment` ADD CONSTRAINT `DepartmentAssignment_assignedById_fkey` FOREIGN KEY (`assignedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DepartmentWorkflowRecord` ADD CONSTRAINT `DepartmentWorkflowRecord_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DepartmentWorkflowRecord` ADD CONSTRAINT `DepartmentWorkflowRecord_encounterId_fkey` FOREIGN KEY (`encounterId`) REFERENCES `ClinicalEncounter`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DepartmentWorkflowRecord` ADD CONSTRAINT `DepartmentWorkflowRecord_recordedById_fkey` FOREIGN KEY (`recordedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LaboratoryOrder` ADD CONSTRAINT `LaboratoryOrder_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LaboratoryOrder` ADD CONSTRAINT `LaboratoryOrder_requestedById_fkey` FOREIGN KEY (`requestedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LaboratoryOrder` ADD CONSTRAINT `LaboratoryOrder_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LaboratoryOrderItem` ADD CONSTRAINT `LaboratoryOrderItem_catalogId_fkey` FOREIGN KEY (`catalogId`) REFERENCES `LaboratoryTestCatalogItem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LaboratoryOrderItem` ADD CONSTRAINT `LaboratoryOrderItem_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `LaboratoryOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LaboratorySpecimen` ADD CONSTRAINT `LaboratorySpecimen_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `LaboratoryOrder`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LaboratorySpecimen` ADD CONSTRAINT `LaboratorySpecimen_collectedById_fkey` FOREIGN KEY (`collectedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LaboratoryResult` ADD CONSTRAINT `LaboratoryResult_orderItemId_fkey` FOREIGN KEY (`orderItemId`) REFERENCES `LaboratoryOrderItem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LaboratoryResult` ADD CONSTRAINT `LaboratoryResult_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LaboratoryResult` ADD CONSTRAINT `LaboratoryResult_reviewerId_fkey` FOREIGN KEY (`reviewerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LaboratoryResultAmendment` ADD CONSTRAINT `LaboratoryResultAmendment_resultId_fkey` FOREIGN KEY (`resultId`) REFERENCES `LaboratoryResult`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LaboratoryResultAmendment` ADD CONSTRAINT `LaboratoryResultAmendment_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RadiologyRequest` ADD CONSTRAINT `RadiologyRequest_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RadiologyRequest` ADD CONSTRAINT `RadiologyRequest_catalogId_fkey` FOREIGN KEY (`catalogId`) REFERENCES `RadiologyCatalogItem`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RadiologyRequest` ADD CONSTRAINT `RadiologyRequest_requestedById_fkey` FOREIGN KEY (`requestedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ImagingReport` ADD CONSTRAINT `ImagingReport_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `RadiologyRequest`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ImagingReport` ADD CONSTRAINT `ImagingReport_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ImagingReport` ADD CONSTRAINT `ImagingReport_reviewerId_fkey` FOREIGN KEY (`reviewerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BloodDonor` ADD CONSTRAINT `BloodDonor_registeredById_fkey` FOREIGN KEY (`registeredById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BloodDonation` ADD CONSTRAINT `BloodDonation_donorId_fkey` FOREIGN KEY (`donorId`) REFERENCES `BloodDonor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BloodDonation` ADD CONSTRAINT `BloodDonation_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BloodDonation` ADD CONSTRAINT `BloodDonation_recordedById_fkey` FOREIGN KEY (`recordedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BloodBankUnit` ADD CONSTRAINT `BloodBankUnit_donationId_fkey` FOREIGN KEY (`donationId`) REFERENCES `BloodDonation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BloodRequest` ADD CONSTRAINT `BloodRequest_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BloodRequest` ADD CONSTRAINT `BloodRequest_requestedById_fkey` FOREIGN KEY (`requestedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BloodCrossmatch` ADD CONSTRAINT `BloodCrossmatch_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `BloodRequest`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BloodCrossmatch` ADD CONSTRAINT `BloodCrossmatch_unitId_fkey` FOREIGN KEY (`unitId`) REFERENCES `BloodBankUnit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BloodCrossmatch` ADD CONSTRAINT `BloodCrossmatch_recordedById_fkey` FOREIGN KEY (`recordedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BloodIssue` ADD CONSTRAINT `BloodIssue_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `BloodRequest`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BloodIssue` ADD CONSTRAINT `BloodIssue_unitId_fkey` FOREIGN KEY (`unitId`) REFERENCES `BloodBankUnit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BloodIssue` ADD CONSTRAINT `BloodIssue_issuedById_fkey` FOREIGN KEY (`issuedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_discountApprovedById_fkey` FOREIGN KEY (`discountApprovedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvoiceItem` ADD CONSTRAINT `InvoiceItem_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `Invoice`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `Invoice`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_receivedById_fkey` FOREIGN KEY (`receivedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RefundRequest` ADD CONSTRAINT `RefundRequest_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `Invoice`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RefundRequest` ADD CONSTRAINT `RefundRequest_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `Payment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RefundRequest` ADD CONSTRAINT `RefundRequest_requestedById_fkey` FOREIGN KEY (`requestedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RefundRequest` ADD CONSTRAINT `RefundRequest_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RefundRequest` ADD CONSTRAINT `RefundRequest_paidById_fkey` FOREIGN KEY (`paidById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvoiceAmendment` ADD CONSTRAINT `InvoiceAmendment_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `Invoice`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PatientInsurancePolicy` ADD CONSTRAINT `PatientInsurancePolicy_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PatientInsurancePolicy` ADD CONSTRAINT `PatientInsurancePolicy_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `InsuranceProvider`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InsuranceClaim` ADD CONSTRAINT `InsuranceClaim_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InsuranceClaim` ADD CONSTRAINT `InsuranceClaim_policyId_fkey` FOREIGN KEY (`policyId`) REFERENCES `PatientInsurancePolicy`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PortalNotification` ADD CONSTRAINT `PortalNotification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PortalNotification` ADD CONSTRAINT `PortalNotification_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PortalSupportRequest` ADD CONSTRAINT `PortalSupportRequest_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PortalSupportRequest` ADD CONSTRAINT `PortalSupportRequest_requestedById_fkey` FOREIGN KEY (`requestedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PortalSupportRequest` ADD CONSTRAINT `PortalSupportRequest_assignedHandlerId_fkey` FOREIGN KEY (`assignedHandlerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Employee` ADD CONSTRAINT `Employee_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AttendanceRecord` ADD CONSTRAINT `AttendanceRecord_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AttendanceRecord` ADD CONSTRAINT `AttendanceRecord_recordedById_fkey` FOREIGN KEY (`recordedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShiftAssignment` ADD CONSTRAINT `ShiftAssignment_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShiftAssignment` ADD CONSTRAINT `ShiftAssignment_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeaveRequest` ADD CONSTRAINT `LeaveRequest_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeaveRequest` ADD CONSTRAINT `LeaveRequest_requestedById_fkey` FOREIGN KEY (`requestedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeaveRequest` ADD CONSTRAINT `LeaveRequest_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PayrollRecord` ADD CONSTRAINT `PayrollRecord_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PayrollRecord` ADD CONSTRAINT `PayrollRecord_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PayrollRecord` ADD CONSTRAINT `PayrollRecord_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
