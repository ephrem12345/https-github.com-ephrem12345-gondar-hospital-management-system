-- CreateTable
CREATE TABLE `Department` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(40) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `category` VARCHAR(60) NOT NULL,
    `description` VARCHAR(300) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Department_code_key`(`code`),
    UNIQUE INDEX `Department_name_key`(`name`),
    INDEX `Department_category_active_idx`(`category`, `active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SystemPermission` (
    `id` CHAR(36) NOT NULL,
    `module` VARCHAR(60) NOT NULL,
    `action` VARCHAR(60) NOT NULL,
    `description` VARCHAR(200) NULL,

    UNIQUE INDEX `SystemPermission_module_action_key`(`module`, `action`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RolePermission` (
    `id` CHAR(36) NOT NULL,
    `role` ENUM('ADMINISTRATOR', 'PATIENT', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'LABORATORY_TECHNICIAN', 'RADIOLOGY_TECHNICIAN', 'PHARMACIST', 'FINANCE_OFFICER', 'HR_OFFICER', 'DEPARTMENT_HEAD', 'HOSPITAL_STAFF') NOT NULL,
    `permissionId` CHAR(36) NOT NULL,

    UNIQUE INDEX `RolePermission_role_permissionId_key`(`role`, `permissionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Medicine` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(40) NOT NULL,
    `genericName` VARCHAR(160) NOT NULL,
    `brandName` VARCHAR(160) NOT NULL,
    `category` VARCHAR(80) NOT NULL,
    `strength` VARCHAR(60) NOT NULL,
    `dosageForm` ENUM('TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'INHALER', 'OINTMENT', 'DROPS', 'SUSPENSION', 'OTHER') NOT NULL DEFAULT 'TABLET',
    `manufacturer` VARCHAR(160) NOT NULL,
    `unit` VARCHAR(40) NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `reorderLevel` INTEGER NOT NULL DEFAULT 50,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Medicine_code_key`(`code`),
    INDEX `Medicine_genericName_idx`(`genericName`),
    INDEX `Medicine_category_active_idx`(`category`, `active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MedicineBatch` (
    `id` CHAR(36) NOT NULL,
    `batchNumber` VARCHAR(60) NOT NULL,
    `medicineId` CHAR(36) NOT NULL,
    `supplierId` CHAR(36) NULL,
    `quantity` INTEGER NOT NULL DEFAULT 0,
    `purchaseDate` DATE NOT NULL,
    `expiryDate` DATE NOT NULL,
    `storageLocation` VARCHAR(120) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MedicineBatch_batchNumber_key`(`batchNumber`),
    INDEX `MedicineBatch_medicineId_expiryDate_idx`(`medicineId`, `expiryDate`),
    INDEX `MedicineBatch_expiryDate_idx`(`expiryDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PharmacySupplier` (
    `id` CHAR(36) NOT NULL,
    `supplierCode` VARCHAR(40) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `contactName` VARCHAR(120) NOT NULL,
    `phone` VARCHAR(32) NOT NULL,
    `email` VARCHAR(254) NOT NULL,
    `address` VARCHAR(255) NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PharmacySupplier_supplierCode_key`(`supplierCode`),
    INDEX `PharmacySupplier_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PharmacyPrescription` (
    `id` CHAR(36) NOT NULL,
    `prescriptionNumber` VARCHAR(40) NOT NULL,
    `patientId` CHAR(36) NOT NULL,
    `doctorId` CHAR(36) NULL,
    `doctorName` VARCHAR(120) NOT NULL,
    `encounterId` CHAR(36) NULL,
    `dispensingStatus` ENUM('PENDING', 'PARTIAL', 'DISPENSED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `issuedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notes` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PharmacyPrescription_prescriptionNumber_key`(`prescriptionNumber`),
    INDEX `PharmacyPrescription_patientId_issuedAt_idx`(`patientId`, `issuedAt`),
    INDEX `PharmacyPrescription_dispensingStatus_issuedAt_idx`(`dispensingStatus`, `issuedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PharmacyPrescriptionItem` (
    `id` CHAR(36) NOT NULL,
    `prescriptionId` CHAR(36) NOT NULL,
    `medicineId` CHAR(36) NOT NULL,
    `dosage` VARCHAR(80) NOT NULL,
    `frequency` VARCHAR(80) NOT NULL,
    `duration` VARCHAR(60) NOT NULL,
    `instructions` VARCHAR(300) NULL,
    `quantity` INTEGER NOT NULL,
    `dispensedQuantity` INTEGER NOT NULL DEFAULT 0,

    INDEX `PharmacyPrescriptionItem_prescriptionId_idx`(`prescriptionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DispensingRecord` (
    `id` CHAR(36) NOT NULL,
    `receiptNumber` VARCHAR(40) NOT NULL,
    `prescriptionId` CHAR(36) NOT NULL,
    `prescriptionItemId` CHAR(36) NULL,
    `patientId` CHAR(36) NOT NULL,
    `medicineId` CHAR(36) NOT NULL,
    `batchId` CHAR(36) NULL,
    `batchNumber` VARCHAR(60) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `dispensedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dispensedById` CHAR(36) NOT NULL,

    UNIQUE INDEX `DispensingRecord_receiptNumber_key`(`receiptNumber`),
    INDEX `DispensingRecord_patientId_dispensedAt_idx`(`patientId`, `dispensedAt`),
    INDEX `DispensingRecord_prescriptionId_idx`(`prescriptionId`),
    INDEX `DispensingRecord_dispensedAt_idx`(`dispensedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProcurementRecord` (
    `id` CHAR(36) NOT NULL,
    `orderNumber` VARCHAR(40) NOT NULL,
    `supplierId` CHAR(36) NOT NULL,
    `medicineId` CHAR(36) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `status` ENUM('REQUESTED', 'PURCHASE_ORDER', 'RECEIVED', 'INVOICED', 'CANCELLED') NOT NULL DEFAULT 'REQUESTED',
    `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `receivedAt` DATETIME(3) NULL,
    `invoiceNumber` VARCHAR(60) NULL,

    UNIQUE INDEX `ProcurementRecord_orderNumber_key`(`orderNumber`),
    INDEX `ProcurementRecord_supplierId_status_idx`(`supplierId`, `status`),
    INDEX `ProcurementRecord_status_requestedAt_idx`(`status`, `requestedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Ward` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(40) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `type` ENUM('INTERNAL_MEDICINE', 'SURGERY', 'PEDIATRICS', 'GYNECOLOGY_OBSTETRICS', 'ICU', 'EMERGENCY_OBSERVATION', 'ISOLATION', 'GENERAL') NOT NULL DEFAULT 'INTERNAL_MEDICINE',
    `capacity` INTEGER NOT NULL,
    `departmentId` CHAR(36) NULL,
    `departmentName` VARCHAR(100) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Ward_code_key`(`code`),
    INDEX `Ward_type_active_idx`(`type`, `active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Bed` (
    `id` CHAR(36) NOT NULL,
    `bedNumber` VARCHAR(40) NOT NULL,
    `wardId` CHAR(36) NOT NULL,
    `status` ENUM('AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'MAINTENANCE') NOT NULL DEFAULT 'AVAILABLE',
    `currentPatientId` CHAR(36) NULL,
    `notes` VARCHAR(300) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Bed_status_idx`(`status`),
    UNIQUE INDEX `Bed_wardId_bedNumber_key`(`wardId`, `bedNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InpatientAdmission` (
    `id` CHAR(36) NOT NULL,
    `admissionNumber` VARCHAR(40) NOT NULL,
    `patientId` CHAR(36) NOT NULL,
    `doctorId` CHAR(36) NULL,
    `doctorName` VARCHAR(120) NOT NULL,
    `wardId` CHAR(36) NOT NULL,
    `bedId` CHAR(36) NULL,
    `reason` VARCHAR(500) NOT NULL,
    `status` ENUM('PENDING', 'ADMITTED', 'DISCHARGED', 'TRANSFERRED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `admittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dischargedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `InpatientAdmission_admissionNumber_key`(`admissionNumber`),
    INDEX `InpatientAdmission_patientId_admittedAt_idx`(`patientId`, `admittedAt`),
    INDEX `InpatientAdmission_wardId_status_idx`(`wardId`, `status`),
    INDEX `InpatientAdmission_status_admittedAt_idx`(`status`, `admittedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InpatientDischarge` (
    `id` CHAR(36) NOT NULL,
    `dischargeNumber` VARCHAR(40) NOT NULL,
    `admissionId` CHAR(36) NOT NULL,
    `patientId` CHAR(36) NOT NULL,
    `authorizingDoctorId` CHAR(36) NULL,
    `finalDiagnosis` TEXT NOT NULL,
    `medicationInstructions` TEXT NOT NULL,
    `followUpInstructions` TEXT NOT NULL,
    `authorizationStatus` ENUM('PENDING_AUTHORIZATION', 'AUTHORIZED', 'COMPLETED') NOT NULL DEFAULT 'PENDING_AUTHORIZATION',
    `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `authorizedAt` DATETIME(3) NULL,

    UNIQUE INDEX `InpatientDischarge_dischargeNumber_key`(`dischargeNumber`),
    UNIQUE INDEX `InpatientDischarge_admissionId_key`(`admissionId`),
    INDEX `InpatientDischarge_patientId_requestedAt_idx`(`patientId`, `requestedAt`),
    INDEX `InpatientDischarge_authorizationStatus_idx`(`authorizationStatus`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OperatingRoom` (
    `id` CHAR(36) NOT NULL,
    `roomNumber` VARCHAR(40) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `status` ENUM('AVAILABLE', 'SCHEDULED', 'IN_USE', 'CLEANING', 'MAINTENANCE') NOT NULL DEFAULT 'AVAILABLE',
    `procedure` VARCHAR(200) NULL,
    `patientId` CHAR(36) NULL,
    `surgicalTeam` VARCHAR(200) NULL,
    `scheduledAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `OperatingRoom_roomNumber_key`(`roomNumber`),
    INDEX `OperatingRoom_status_scheduledAt_idx`(`status`, `scheduledAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Ambulance` (
    `id` CHAR(36) NOT NULL,
    `vehicleNumber` VARCHAR(40) NOT NULL,
    `driverName` VARCHAR(120) NOT NULL,
    `phone` VARCHAR(32) NOT NULL,
    `status` ENUM('AVAILABLE', 'DISPATCHED', 'MAINTENANCE', 'OUT_OF_SERVICE') NOT NULL DEFAULT 'AVAILABLE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Ambulance_vehicleNumber_key`(`vehicleNumber`),
    INDEX `Ambulance_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AmbulanceTrip` (
    `id` CHAR(36) NOT NULL,
    `tripNumber` VARCHAR(40) NOT NULL,
    `ambulanceId` CHAR(36) NOT NULL,
    `patientId` CHAR(36) NULL,
    `destination` VARCHAR(200) NOT NULL,
    `status` ENUM('REQUESTED', 'DISPATCHED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'REQUESTED',
    `dispatchedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,
    `notes` VARCHAR(300) NULL,

    UNIQUE INDEX `AmbulanceTrip_tripNumber_key`(`tripNumber`),
    INDEX `AmbulanceTrip_ambulanceId_dispatchedAt_idx`(`ambulanceId`, `dispatchedAt`),
    INDEX `AmbulanceTrip_status_dispatchedAt_idx`(`status`, `dispatchedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AmbulanceMaintenance` (
    `id` CHAR(36) NOT NULL,
    `maintenanceNumber` VARCHAR(40) NOT NULL,
    `ambulanceId` CHAR(36) NOT NULL,
    `description` VARCHAR(500) NOT NULL,
    `status` ENUM('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'OPEN',
    `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,

    UNIQUE INDEX `AmbulanceMaintenance_maintenanceNumber_key`(`maintenanceNumber`),
    INDEX `AmbulanceMaintenance_ambulanceId_status_idx`(`ambulanceId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GeneralInventoryItem` (
    `id` CHAR(36) NOT NULL,
    `itemCode` VARCHAR(40) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `category` VARCHAR(80) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 0,
    `unit` VARCHAR(40) NOT NULL,
    `location` VARCHAR(120) NOT NULL,
    `reorderLevel` INTEGER NOT NULL DEFAULT 20,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `GeneralInventoryItem_itemCode_key`(`itemCode`),
    INDEX `GeneralInventoryItem_category_location_idx`(`category`, `location`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HospitalAsset` (
    `id` CHAR(36) NOT NULL,
    `assetTag` VARCHAR(40) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `category` VARCHAR(80) NOT NULL,
    `serialNumber` VARCHAR(100) NOT NULL,
    `assignedDepartment` VARCHAR(100) NOT NULL,
    `location` VARCHAR(120) NOT NULL,
    `condition` ENUM('OPERATIONAL', 'NEEDS_MAINTENANCE', 'OUT_OF_SERVICE') NOT NULL DEFAULT 'OPERATIONAL',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `HospitalAsset_assetTag_key`(`assetTag`),
    UNIQUE INDEX `HospitalAsset_serialNumber_key`(`serialNumber`),
    INDEX `HospitalAsset_assignedDepartment_condition_idx`(`assignedDepartment`, `condition`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AssetMaintenanceRequest` (
    `id` CHAR(36) NOT NULL,
    `ticketNumber` VARCHAR(40) NOT NULL,
    `assetId` CHAR(36) NOT NULL,
    `description` VARCHAR(500) NOT NULL,
    `priority` ENUM('ROUTINE', 'URGENT', 'CRITICAL') NOT NULL DEFAULT 'ROUTINE',
    `status` ENUM('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'OPEN',
    `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolvedAt` DATETIME(3) NULL,

    UNIQUE INDEX `AssetMaintenanceRequest_ticketNumber_key`(`ticketNumber`),
    INDEX `AssetMaintenanceRequest_assetId_status_idx`(`assetId`, `status`),
    INDEX `AssetMaintenanceRequest_status_priority_idx`(`status`, `priority`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DiagnosticAttachment` (
    `id` CHAR(36) NOT NULL,
    `patientId` CHAR(36) NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `modality` VARCHAR(40) NOT NULL,
    `mediaType` VARCHAR(40) NOT NULL,
    `studyDate` DATE NOT NULL,
    `accessLevel` VARCHAR(30) NOT NULL DEFAULT 'RESTRICTED',
    `fileUrl` VARCHAR(500) NULL,
    `mimeType` VARCHAR(100) NULL,
    `fileSizeBytes` BIGINT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DiagnosticAttachment_patientId_studyDate_idx`(`patientId`, `studyDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TransfusionRecord` (
    `id` CHAR(36) NOT NULL,
    `recordNumber` VARCHAR(40) NOT NULL,
    `patientId` CHAR(36) NOT NULL,
    `bloodUnitId` CHAR(36) NOT NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,
    `administeredById` CHAR(36) NOT NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'COMPLETED',
    `adverseReactions` TEXT NULL,

    UNIQUE INDEX `TransfusionRecord_recordNumber_key`(`recordNumber`),
    INDEX `TransfusionRecord_patientId_startedAt_idx`(`patientId`, `startedAt`),
    INDEX `TransfusionRecord_bloodUnitId_idx`(`bloodUnitId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `RolePermission` ADD CONSTRAINT `RolePermission_permissionId_fkey` FOREIGN KEY (`permissionId`) REFERENCES `SystemPermission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MedicineBatch` ADD CONSTRAINT `MedicineBatch_medicineId_fkey` FOREIGN KEY (`medicineId`) REFERENCES `Medicine`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MedicineBatch` ADD CONSTRAINT `MedicineBatch_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `PharmacySupplier`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PharmacyPrescription` ADD CONSTRAINT `PharmacyPrescription_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PharmacyPrescription` ADD CONSTRAINT `PharmacyPrescription_doctorId_fkey` FOREIGN KEY (`doctorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PharmacyPrescription` ADD CONSTRAINT `PharmacyPrescription_encounterId_fkey` FOREIGN KEY (`encounterId`) REFERENCES `ClinicalEncounter`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PharmacyPrescriptionItem` ADD CONSTRAINT `PharmacyPrescriptionItem_prescriptionId_fkey` FOREIGN KEY (`prescriptionId`) REFERENCES `PharmacyPrescription`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PharmacyPrescriptionItem` ADD CONSTRAINT `PharmacyPrescriptionItem_medicineId_fkey` FOREIGN KEY (`medicineId`) REFERENCES `Medicine`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DispensingRecord` ADD CONSTRAINT `DispensingRecord_prescriptionId_fkey` FOREIGN KEY (`prescriptionId`) REFERENCES `PharmacyPrescription`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DispensingRecord` ADD CONSTRAINT `DispensingRecord_prescriptionItemId_fkey` FOREIGN KEY (`prescriptionItemId`) REFERENCES `PharmacyPrescriptionItem`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DispensingRecord` ADD CONSTRAINT `DispensingRecord_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DispensingRecord` ADD CONSTRAINT `DispensingRecord_medicineId_fkey` FOREIGN KEY (`medicineId`) REFERENCES `Medicine`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DispensingRecord` ADD CONSTRAINT `DispensingRecord_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `MedicineBatch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DispensingRecord` ADD CONSTRAINT `DispensingRecord_dispensedById_fkey` FOREIGN KEY (`dispensedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProcurementRecord` ADD CONSTRAINT `ProcurementRecord_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `PharmacySupplier`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProcurementRecord` ADD CONSTRAINT `ProcurementRecord_medicineId_fkey` FOREIGN KEY (`medicineId`) REFERENCES `Medicine`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Ward` ADD CONSTRAINT `Ward_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bed` ADD CONSTRAINT `Bed_wardId_fkey` FOREIGN KEY (`wardId`) REFERENCES `Ward`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bed` ADD CONSTRAINT `Bed_currentPatientId_fkey` FOREIGN KEY (`currentPatientId`) REFERENCES `Patient`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InpatientAdmission` ADD CONSTRAINT `InpatientAdmission_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InpatientAdmission` ADD CONSTRAINT `InpatientAdmission_doctorId_fkey` FOREIGN KEY (`doctorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InpatientAdmission` ADD CONSTRAINT `InpatientAdmission_wardId_fkey` FOREIGN KEY (`wardId`) REFERENCES `Ward`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InpatientAdmission` ADD CONSTRAINT `InpatientAdmission_bedId_fkey` FOREIGN KEY (`bedId`) REFERENCES `Bed`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InpatientDischarge` ADD CONSTRAINT `InpatientDischarge_admissionId_fkey` FOREIGN KEY (`admissionId`) REFERENCES `InpatientAdmission`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InpatientDischarge` ADD CONSTRAINT `InpatientDischarge_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InpatientDischarge` ADD CONSTRAINT `InpatientDischarge_authorizingDoctorId_fkey` FOREIGN KEY (`authorizingDoctorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OperatingRoom` ADD CONSTRAINT `OperatingRoom_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AmbulanceTrip` ADD CONSTRAINT `AmbulanceTrip_ambulanceId_fkey` FOREIGN KEY (`ambulanceId`) REFERENCES `Ambulance`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AmbulanceTrip` ADD CONSTRAINT `AmbulanceTrip_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AmbulanceMaintenance` ADD CONSTRAINT `AmbulanceMaintenance_ambulanceId_fkey` FOREIGN KEY (`ambulanceId`) REFERENCES `Ambulance`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssetMaintenanceRequest` ADD CONSTRAINT `AssetMaintenanceRequest_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `HospitalAsset`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DiagnosticAttachment` ADD CONSTRAINT `DiagnosticAttachment_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransfusionRecord` ADD CONSTRAINT `TransfusionRecord_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransfusionRecord` ADD CONSTRAINT `TransfusionRecord_bloodUnitId_fkey` FOREIGN KEY (`bloodUnitId`) REFERENCES `BloodBankUnit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransfusionRecord` ADD CONSTRAINT `TransfusionRecord_administeredById_fkey` FOREIGN KEY (`administeredById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
