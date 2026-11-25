import bcrypt from "bcryptjs";
import {
  PrismaClient,
  UserRole,
  AccountStatus,
  PatientStatus,
  MedicineDosageForm,
  PrescriptionDispensingStatus,
  SupplierStatus,
  ProcurementStatus,
  WardType,
  BedStatus,
  InpatientAdmissionStatus,
  InpatientDischargeStatus,
  OperatingRoomStatus,
  AmbulanceStatus,
  AmbulanceTripStatus,
  AssetCondition,
  MaintenancePriority,
  MaintenanceStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Seed password resolution — never hardcode real credentials here.
// Set GHMS_SEED_STAFF_PASSWORD and GHMS_SEED_PATIENT_PASSWORD in backend/.env
// before running the seed in any environment.
// ---------------------------------------------------------------------------
function generateSecurePassword(): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require("crypto") as typeof import("crypto");
  const chars =
    "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*";
  return Array.from(crypto.randomBytes(20) as Uint8Array)
    .map((b: number) => chars[b % chars.length])
    .join("");
}

function resolveSeedPassword(
  envVar: string,
  label: string
): { password: string; generated: boolean } {
  const value = process.env[envVar];
  if (value) return { password: value, generated: false };
  if (process.env.NODE_ENV === "production") {
    console.error(
      `\nFATAL: ${envVar} must be set in production. ` +
        `Never run seed without explicit credentials in production.\n`
    );
    process.exit(1);
  }
  const password = generateSecurePassword();
  console.warn(
    `\n[SEED WARNING] ${envVar} is not set. ` +
      `A one-time random password will be used for new ${label} accounts: ${password}\n` +
      `  Add   ${envVar}=<password>   to backend/.env to use a fixed value.\n`
  );
  return { password, generated: true };
}

async function main() {
  console.log("Seeding GHMS database with Stage 3 comprehensive hospital data...");

  const { password: rawStaffPassword } = resolveSeedPassword(
    "GHMS_SEED_STAFF_PASSWORD",
    "staff"
  );
  const { password: rawPatientPassword } = resolveSeedPassword(
    "GHMS_SEED_PATIENT_PASSWORD",
    "patient"
  );

  const staffPasswordHash = await bcrypt.hash(rawStaffPassword, 12);
  const patientPasswordHash = await bcrypt.hash(rawPatientPassword, 12);

  // ==========================================
  // 0. HOSPITAL TENANT & SAAS SUBSCRIPTIONS
  // ==========================================
  console.log("--> Seeding primary hospital tenant and SaaS plans...");
  const plans = [
    {
      code: "BASIC",
      name: "Basic Hospital Plan",
      description: "Essential patient registration, appointments, basic billing, and outpatient management.",
      monthlyPrice: 5000.0,
      annualPrice: 54000.0,
      maxStaff: 25,
      maxPatients: 2000,
      features: JSON.stringify([
        "patient_registration",
        "appointment_management",
        "basic_billing",
        "outpatient_queue",
        "basic_reports",
      ]),
      isActive: true,
    },
    {
      code: "PROFESSIONAL",
      name: "Professional Medical Center Plan",
      description: "Full clinical services, doctor & nurse workspaces, laboratory, pharmacy, and advanced billing with Chapa.",
      monthlyPrice: 15000.0,
      annualPrice: 162000.0,
      maxStaff: 100,
      maxPatients: 10000,
      features: JSON.stringify([
        "patient_registration",
        "appointment_management",
        "clinical_services",
        "nursing_vitals",
        "laboratory_management",
        "pharmacy_inventory",
        "chapa_online_payments",
        "clinical_messaging",
        "advanced_reports",
      ]),
      isActive: true,
    },
    {
      code: "ENTERPRISE",
      name: "Enterprise Multi-Department Hospital Plan",
      description: "Comprehensive hospital operations including emergency triage, inpatient wards, operating rooms, ambulance fleet, blood bank, and custom permissions.",
      monthlyPrice: 35000.0,
      annualPrice: 378000.0,
      maxStaff: 500,
      maxPatients: 100000,
      features: JSON.stringify([
        "all_professional_features",
        "emergency_triage_management",
        "inpatient_admissions_wards",
        "operating_room_scheduling",
        "ambulance_fleet_management",
        "blood_bank_donor_management",
        "multi_department_workflows",
        "custom_rbac_permissions",
        "priority_support",
        "audit_compliance",
      ]),
      isActive: true,
    },
  ];

  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        description: plan.description,
        monthlyPrice: plan.monthlyPrice,
        annualPrice: plan.annualPrice,
        maxStaff: plan.maxStaff,
        maxPatients: plan.maxPatients,
        features: plan.features,
        isActive: plan.isActive,
      },
      create: plan,
    });
  }

  const defaultHospital = await prisma.hospital.upsert({
    where: { code: "gondar-hospital" },
    update: {
      name: "Gondar University Comprehensive Specialized Hospital",
      city: "Gondar",
      region: "Amhara",
      address: "University of Gondar, College of Medicine and Health Sciences",
      phone: "+251 58 114 1234",
      email: "info@gondar-hospital.et",
      hospitalType: "TERTIARY_REFERRAL",
      status: "ACTIVE",
      tier: "ENTERPRISE",
    },
    create: {
      code: "gondar-hospital",
      name: "Gondar University Comprehensive Specialized Hospital",
      city: "Gondar",
      region: "Amhara",
      address: "University of Gondar, College of Medicine and Health Sciences",
      phone: "+251 58 114 1234",
      email: "info@gondar-hospital.et",
      hospitalType: "TERTIARY_REFERRAL",
      status: "ACTIVE",
      tier: "ENTERPRISE",
      maxStaff: 500,
      maxPatients: 100000,
    },
  });

  const enterprisePlan = await prisma.subscriptionPlan.findUnique({
    where: { code: "ENTERPRISE" },
  });

  const existingSub = await prisma.hospitalSubscription.findFirst({
    where: { hospitalId: defaultHospital.id },
  });

  if (!existingSub && enterprisePlan) {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);

    await prisma.hospitalSubscription.create({
      data: {
        hospitalId: defaultHospital.id,
        planId: enterprisePlan.id,
        status: "ACTIVE",
        cycle: "ANNUAL",
        amount: enterprisePlan.annualPrice,
        currency: "ETB",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        gracePeriodDays: 14,
        autoRenew: true,
      },
    });
  }

  // ==========================================
  // 1. HOSPITAL DEPARTMENTS
  // ==========================================
  console.log("--> Seeding hospital departments...");
  const departmentsData = [
    { code: "DEPT-EMERGENCY", name: "Emergency & Trauma", category: "Clinical", description: "24/7 Acute emergency and trauma stabilization center" },
    { code: "DEPT-INT-MED", name: "Internal Medicine", category: "Clinical", description: "Adult general and specialty internal medical care" },
    { code: "DEPT-SURGERY", name: "General Surgery", category: "Clinical", description: "Elective and emergency surgical interventions" },
    { code: "DEPT-PEDIATRICS", name: "Pediatrics & Child Health", category: "Clinical", description: "Neonatal, infant, and child specialized medical care" },
    { code: "DEPT-GYN-OBS", name: "Gynecology & Obstetrics", category: "Clinical", description: "Maternal, fetal, delivery and gynecological health" },
    { code: "DEPT-ORTHOPEDICS", name: "Orthopedic Surgery", category: "Clinical", description: "Musculoskeletal trauma and orthopedic reconstruction" },
    { code: "DEPT-OPHTHALMOLOGY", name: "Ophthalmology", category: "Clinical", description: "Eye examinations, medical and surgical eye care" },
    { code: "DEPT-DENTISTRY", name: "Dentistry & Oral Health", category: "Clinical", description: "Dental examinations, restorations and oral surgeries" },
    { code: "DEPT-DERMATOLOGY", name: "Dermatology", category: "Clinical", description: "Skin, hair, and nail pathology and therapy" },
    { code: "DEPT-PSYCHIATRY", name: "Psychiatry & Behavioral Health", category: "Clinical", description: "Mental health evaluations and therapy" },
    { code: "DEPT-ICU", name: "Intensive Care Unit", category: "Clinical", description: "Critical life-support and continuous monitoring" },
    { code: "DEPT-PHYSIOTHERAPY", name: "Physiotherapy & Rehabilitation", category: "Clinical", description: "Physical therapy and functional rehabilitation" },
    { code: "DEPT-LABORATORY", name: "Clinical Laboratory", category: "Diagnostic", description: "Hematology, biochemistry, microbiology and pathology" },
    { code: "DEPT-RADIOLOGY", name: "Medical Imaging & Radiology", category: "Diagnostic", description: "X-Ray, Ultrasound, CT and MRI medical imaging" },
    { code: "DEPT-PHARMACY", name: "Hospital Pharmacy", category: "Pharmacy", description: "Inpatient, outpatient and compounding dispensary" },
    { code: "DEPT-FINANCE", name: "Finance & Health Billing", category: "Finance", description: "Patient invoicing, insurance claims and hospital cashiers" },
    { code: "DEPT-ADMIN", name: "Hospital Administration", category: "Administrative", description: "Executive leadership, HR, records and operations" },
  ];

  const departmentMap = new Map<string, string>();
  for (const dept of departmentsData) {
    const record = await prisma.department.upsert({
      where: { code: dept.code },
      update: { name: dept.name, category: dept.category, description: dept.description },
      create: dept,
    });
    departmentMap.set(dept.name, record.id);
  }

  // ==========================================
  // 2. SYSTEM PERMISSIONS & ROLES
  // ==========================================
  console.log("--> Seeding permissions and role mappings...");
  const permissionsData = [
    { module: "clinical", action: "consultation:write", description: "Create and update clinical consultations" },
    { module: "clinical", action: "consultation:read", description: "Read patient consultation notes" },
    { module: "pharmacy", action: "dispense:execute", description: "Dispense prescribed medications" },
    { module: "pharmacy", action: "inventory:manage", description: "Manage drug catalog and batch inventory" },
    { module: "inpatient", action: "admission:create", description: "Admit patients to hospital wards" },
    { module: "inpatient", action: "discharge:authorize", description: "Authorize patient hospital discharge" },
    { module: "diagnostics", action: "lab:approve", description: "Approve laboratory test findings" },
    { module: "admin", action: "system:manage", description: "Full hospital management and user oversight" },
  ];

  for (const perm of permissionsData) {
    const createdPerm = await prisma.systemPermission.upsert({
      where: { module_action: { module: perm.module, action: perm.action } },
      update: { description: perm.description },
      create: perm,
    });

    // Map permissions to appropriate roles
    const rolesForPerm: UserRole[] =
      perm.module === "admin"
        ? [UserRole.ADMINISTRATOR]
        : perm.module === "pharmacy"
        ? [UserRole.ADMINISTRATOR, UserRole.PHARMACIST]
        : perm.module === "diagnostics"
        ? [UserRole.ADMINISTRATOR, UserRole.LABORATORY_TECHNICIAN, UserRole.DOCTOR]
        : [UserRole.ADMINISTRATOR, UserRole.DOCTOR, UserRole.NURSE];

    for (const role of rolesForPerm) {
      await prisma.rolePermission.upsert({
        where: { role_permissionId: { role, permissionId: createdPerm.id } },
        update: {},
        create: { role, permissionId: createdPerm.id },
      });
    }
  }

  // ==========================================
  // 3. CORE USER ACCOUNTS (VERIFIED ROLES)
  // ==========================================
  console.log("--> Seeding core verified user accounts with tenant associations...");

  // 3.1 Chief Administrator (Dr. Abebe Bekele)
  // Explicitly preserve existing custom admin password if user already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: "abebe.bekele@gondar-hospital.et" },
  });
  const adminPasswordHash = existingAdmin?.passwordHash || staffPasswordHash;

  const admin = await prisma.user.upsert({
    where: { email: "abebe.bekele@gondar-hospital.et" },
    update: {
      status: AccountStatus.ACTIVE,
      role: UserRole.ADMINISTRATOR,
      department: "Administration",
      hospitalId: defaultHospital.id,
      passwordHash: adminPasswordHash,
    },
    create: {
      email: "abebe.bekele@gondar-hospital.et",
      username: "admin",
      phone: "+251911000111",
      passwordHash: adminPasswordHash,
      role: UserRole.ADMINISTRATOR,
      status: AccountStatus.ACTIVE,
      hospitalId: defaultHospital.id,
      firstName: "Abebe",
      lastName: "Bekele",
      department: "Administration",
    },
  });

  // 3.2 Doctor (Dr. Selam Girma)
  const doctorUser = await prisma.user.upsert({
    where: { email: "selam.girma@gondar-hospital.et" },
    update: {
      status: AccountStatus.ACTIVE,
      role: UserRole.DOCTOR,
      department: "Internal Medicine",
      hospitalId: defaultHospital.id,
      // passwordHash omitted from update — do not overwrite an existing password on re-seed
    },
    create: {
      email: "selam.girma@gondar-hospital.et",
      username: "selam.girma",
      phone: "+251911010102",
      passwordHash: staffPasswordHash,
      role: UserRole.DOCTOR,
      status: AccountStatus.ACTIVE,
      hospitalId: defaultHospital.id,
      firstName: "Selam",
      lastName: "Girma",
      department: "Internal Medicine",
    },
  });

  const doctorProfile = await prisma.doctor.upsert({
    where: { userId: doctorUser.id },
    update: {
      name: "Dr. Selam Girma",
      specialty: "Internal Medicine",
      department: "Internal Medicine",
      active: true,
    },
    create: {
      userId: doctorUser.id,
      name: "Dr. Selam Girma",
      specialty: "Internal Medicine",
      department: "Internal Medicine",
      active: true,
    },
  });

  // Doctor schedules for weekdays (1 = Monday through 5 = Friday)
  for (let day = 1; day <= 5; day++) {
    await prisma.doctorSchedule.upsert({
      where: {
        doctorId_dayOfWeek_department: {
          doctorId: doctorProfile.id,
          dayOfWeek: day,
          department: "Internal Medicine",
        },
      },
      update: {
        startTime: "08:30",
        endTime: "17:00",
        breakStart: "12:30",
        breakEnd: "13:30",
        slotDurationMins: 30,
      },
      create: {
        doctorId: doctorProfile.id,
        department: "Internal Medicine",
        dayOfWeek: day,
        startTime: "08:30",
        endTime: "17:00",
        breakStart: "12:30",
        breakEnd: "13:30",
        slotDurationMins: 30,
      },
    });
  }

  // 3.3 Nurse (Sr. Tigist Alemu)
  const nurse = await prisma.user.upsert({
    where: { email: "tigist.alemu@gondar-hospital.et" },
    update: {
      status: AccountStatus.ACTIVE,
      role: UserRole.NURSE,
      department: "Internal Medicine",
      hospitalId: defaultHospital.id,
      // passwordHash omitted from update — do not overwrite an existing password on re-seed
    },
    create: {
      email: "tigist.alemu@gondar-hospital.et",
      username: "tigist.alemu",
      phone: "+251911010103",
      passwordHash: staffPasswordHash,
      role: UserRole.NURSE,
      status: AccountStatus.ACTIVE,
      hospitalId: defaultHospital.id,
      firstName: "Tigist",
      lastName: "Alemu",
      department: "Internal Medicine",
    },
  });

  // 3.4 Laboratory Technologist (Ato Getu Assefa)
  const labTech = await prisma.user.upsert({
    where: { email: "getu.assefa@gondar-hospital.et" },
    update: {
      status: AccountStatus.ACTIVE,
      role: UserRole.LABORATORY_TECHNICIAN,
      department: "Laboratory",
      hospitalId: defaultHospital.id,
      // passwordHash omitted from update — do not overwrite an existing password on re-seed
    },
    create: {
      email: "getu.assefa@gondar-hospital.et",
      username: "getu.assefa",
      phone: "+251911010104",
      passwordHash: staffPasswordHash,
      role: UserRole.LABORATORY_TECHNICIAN,
      status: AccountStatus.ACTIVE,
      hospitalId: defaultHospital.id,
      firstName: "Getu",
      lastName: "Assefa",
      department: "Laboratory",
    },
  });

  // 3.5 Pharmacist (W/ro Liya Tesfaye)
  const pharmacist = await prisma.user.upsert({
    where: { email: "liya.tesfaye@gondar-hospital.et" },
    update: {
      status: AccountStatus.ACTIVE,
      role: UserRole.PHARMACIST,
      department: "Pharmacy",
      hospitalId: defaultHospital.id,
      // passwordHash omitted from update — do not overwrite an existing password on re-seed
    },
    create: {
      email: "liya.tesfaye@gondar-hospital.et",
      username: "liya.tesfaye",
      phone: "+251911010105",
      passwordHash: staffPasswordHash,
      role: UserRole.PHARMACIST,
      status: AccountStatus.ACTIVE,
      hospitalId: defaultHospital.id,
      firstName: "Liya",
      lastName: "Tesfaye",
      department: "Pharmacy",
    },
  });

  // 3.6 Finance Officer (Ato Hanif Jemal)
  const finance = await prisma.user.upsert({
    where: { email: "hanif.jemal@gondar-hospital.et" },
    update: {
      status: AccountStatus.ACTIVE,
      role: UserRole.FINANCE_OFFICER,
      department: "Finance",
      hospitalId: defaultHospital.id,
      // passwordHash omitted from update — do not overwrite an existing password on re-seed
    },
    create: {
      email: "hanif.jemal@gondar-hospital.et",
      username: "hanif.jemal",
      phone: "+251911010106",
      passwordHash: staffPasswordHash,
      role: UserRole.FINANCE_OFFICER,
      status: AccountStatus.ACTIVE,
      hospitalId: defaultHospital.id,
      firstName: "Hanif",
      lastName: "Jemal",
      department: "Finance",
    },
  });

  // 3.7 Receptionist (W/ro Almaz Tadesse - Reception Desk)
  const receptionist = await prisma.user.upsert({
    where: { email: "receptionist@gondar-hospital.et" },
    update: {
      status: AccountStatus.ACTIVE,
      role: UserRole.RECEPTIONIST,
      department: "Registration",
      hospitalId: defaultHospital.id,
      // passwordHash omitted from update — do not overwrite an existing password on re-seed
    },
    create: {
      email: "receptionist@gondar-hospital.et",
      username: "receptionist",
      phone: "+251911010107",
      passwordHash: staffPasswordHash,
      role: UserRole.RECEPTIONIST,
      status: AccountStatus.ACTIVE,
      hospitalId: defaultHospital.id,
      firstName: "Almaz",
      lastName: "Tadesse",
      department: "Registration",
    },
  });

  // 3.8 Patient User (Synthetic Patient Almaz Tadesse)
  const patientUser = await prisma.user.upsert({
    where: { email: "patient@gondar-hospital.et" },
    update: {
      status: AccountStatus.ACTIVE,
      role: UserRole.PATIENT,
      department: "Registration",
      hospitalId: defaultHospital.id,
      // passwordHash omitted from update — do not overwrite an existing password on re-seed
    },
    create: {
      email: "patient@gondar-hospital.et",
      username: "patient",
      phone: "+251911234567",
      passwordHash: patientPasswordHash,
      role: UserRole.PATIENT,
      status: AccountStatus.ACTIVE,
      hospitalId: defaultHospital.id,
      firstName: "Almaz",
      lastName: "Tadesse",
      department: "Registration",
    },
  });

  // ==========================================
  // 4. PATIENTS & DEMOGRAPHICS
  // ==========================================
  console.log("--> Seeding patient demographics...");
  const primaryPatient = await prisma.patient.upsert({
    where: { patientNumber: "GHMS-000001" },
    update: {
      userId: patientUser.id,
      hospitalId: defaultHospital.id,
      firstName: "Almaz",
      lastName: "Tadesse",
      sex: "female",
      dateOfBirth: new Date("1985-04-12T00:00:00.000Z"),
      phone: "+251911234567",
      department: "Internal Medicine",
      status: PatientStatus.STABLE,
      address: "Kebele 04, Gondar",
      bloodGroup: "O+",
      allergies: "Penicillin (Moderate rash)",
      medicalConditions: "Type 2 Diabetes Mellitus, Essential Hypertension",
      emergencyContactName: "Dawit Tadesse",
      emergencyRelationship: "Brother",
      emergencyPhone: "+251911223344",
    },
    create: {
      patientNumber: "GHMS-000001",
      userId: patientUser.id,
      hospitalId: defaultHospital.id,
      firstName: "Almaz",
      lastName: "Tadesse",
      sex: "female",
      dateOfBirth: new Date("1985-04-12T00:00:00.000Z"),
      phone: "+251911234567",
      department: "Internal Medicine",
      status: PatientStatus.STABLE,
      address: "Kebele 04, Gondar",
      bloodGroup: "O+",
      allergies: "Penicillin (Moderate rash)",
      medicalConditions: "Type 2 Diabetes Mellitus, Essential Hypertension",
      emergencyContactName: "Dawit Tadesse",
      emergencyRelationship: "Brother",
      emergencyPhone: "+251911223344",
    },
  });

  const secondaryPatient = await prisma.patient.upsert({
    where: { patientNumber: "GHMS-01042" },
    update: {
      firstName: "Bereket",
      lastName: "Yohannes",
      sex: "male",
      dateOfBirth: new Date("1992-08-24T00:00:00.000Z"),
      phone: "+251922334455",
      department: "Internal Medicine",
      status: PatientStatus.STABLE,
      address: "Kebele 12, Gondar",
      bloodGroup: "A+",
      allergies: "None known",
      medicalConditions: "Acute Febrile Illness",
    },
    create: {
      patientNumber: "GHMS-01042",
      firstName: "Bereket",
      lastName: "Yohannes",
      sex: "male",
      dateOfBirth: new Date("1992-08-24T00:00:00.000Z"),
      phone: "+251922334455",
      department: "Internal Medicine",
      status: PatientStatus.STABLE,
      address: "Kebele 12, Gondar",
      bloodGroup: "A+",
      allergies: "None known",
      medicalConditions: "Acute Febrile Illness",
    },
  });

  const surgeryPatient = await prisma.patient.upsert({
    where: { patientNumber: "GHMS-01045" },
    update: {
      firstName: "Kassahun",
      lastName: "Mulugeta",
      sex: "male",
      dateOfBirth: new Date("1978-11-03T00:00:00.000Z"),
      phone: "+251933445566",
      department: "Surgery",
      status: PatientStatus.RECOVERING,
      address: "Kebele 08, Gondar",
      bloodGroup: "B+",
      allergies: "Sulfa drugs",
      medicalConditions: "Post-Appendectomy Day 1",
    },
    create: {
      patientNumber: "GHMS-01045",
      firstName: "Kassahun",
      lastName: "Mulugeta",
      sex: "male",
      dateOfBirth: new Date("1978-11-03T00:00:00.000Z"),
      phone: "+251933445566",
      department: "Surgery",
      status: PatientStatus.RECOVERING,
      address: "Kebele 08, Gondar",
      bloodGroup: "B+",
      allergies: "Sulfa drugs",
      medicalConditions: "Post-Appendectomy Day 1",
    },
  });

  // ==========================================
  // 5. PHARMACY, MEDICINES & BATCHES
  // ==========================================
  console.log("--> Seeding pharmacy suppliers, medicines and inventory...");
  const supplierA = await prisma.pharmacySupplier.upsert({
    where: { supplierCode: "SUP-010" },
    update: { status: SupplierStatus.ACTIVE },
    create: {
      supplierCode: "SUP-010",
      name: "Demo Medical Supply Co.",
      contactName: "Ato Yonas Kebede",
      phone: "+251-918-000-101",
      email: "supply@demomedical.et",
      address: "Industrial Zone, Gondar",
      status: SupplierStatus.ACTIVE,
    },
  });

  const supplierB = await prisma.pharmacySupplier.upsert({
    where: { supplierCode: "SUP-011" },
    update: { status: SupplierStatus.ACTIVE },
    create: {
      supplierCode: "SUP-011",
      name: "Ethio Health Distributor",
      contactName: "W/ro Martha Haile",
      phone: "+251-918-000-102",
      email: "orders@ethiohealth.et",
      address: "Bahir Dar Road, Gondar",
      status: SupplierStatus.ACTIVE,
    },
  });

  const medicinesData = [
    { code: "MED-001", genericName: "Paracetamol", brandName: "Panadol", category: "Analgesic", strength: "500 mg", dosageForm: MedicineDosageForm.TABLET, manufacturer: "EPHARM", unit: "tablet", price: 2.5, reorderLevel: 100 },
    { code: "MED-002", genericName: "Amoxicillin", brandName: "Amoxil", category: "Antibiotic", strength: "500 mg", dosageForm: MedicineDosageForm.CAPSULE, manufacturer: "Cadila", unit: "capsule", price: 5.0, reorderLevel: 80 },
    { code: "MED-003", genericName: "Metformin HCl", brandName: "Glucophage", category: "Antidiabetic", strength: "500 mg", dosageForm: MedicineDosageForm.TABLET, manufacturer: "Merck", unit: "tablet", price: 3.5, reorderLevel: 120 },
    { code: "MED-004", genericName: "Salbutamol Sulfate", brandName: "Ventolin", category: "Respiratory", strength: "100 mcg", dosageForm: MedicineDosageForm.INHALER, manufacturer: "GSK", unit: "inhaler", price: 75.0, reorderLevel: 20 },
    { code: "MED-005", genericName: "Omeprazole", brandName: "Losec", category: "Gastrointestinal", strength: "20 mg", dosageForm: MedicineDosageForm.CAPSULE, manufacturer: "AstraZeneca", unit: "capsule", price: 6.0, reorderLevel: 60 },
  ];

  const medicineMap = new Map<string, string>();
  for (const med of medicinesData) {
    const record = await prisma.medicine.upsert({
      where: { code: med.code },
      update: { price: med.price, reorderLevel: med.reorderLevel },
      create: med,
    });
    medicineMap.set(med.code, record.id);
  }

  // Batches
  const batch1 = await prisma.medicineBatch.upsert({
    where: { batchNumber: "PAR-26-01" },
    update: { quantity: 240 },
    create: {
      batchNumber: "PAR-26-01",
      medicineId: medicineMap.get("MED-001")!,
      supplierId: supplierA.id,
      quantity: 240,
      purchaseDate: new Date("2026-08-15"),
      expiryDate: new Date("2028-08-15"),
      storageLocation: "Pharmacy Shelf A1",
    },
  });

  const batch2 = await prisma.medicineBatch.upsert({
    where: { batchNumber: "AMX-26-02" },
    update: { quantity: 54 },
    create: {
      batchNumber: "AMX-26-02",
      medicineId: medicineMap.get("MED-002")!,
      supplierId: supplierA.id,
      quantity: 54,
      purchaseDate: new Date("2026-09-01"),
      expiryDate: new Date("2027-09-01"),
      storageLocation: "Pharmacy Shelf B2",
    },
  });

  await prisma.medicineBatch.upsert({
    where: { batchNumber: "MET-25-04" },
    update: { quantity: 80 },
    create: {
      batchNumber: "MET-25-04",
      medicineId: medicineMap.get("MED-003")!,
      supplierId: supplierB.id,
      quantity: 80,
      purchaseDate: new Date("2025-10-10"),
      expiryDate: new Date("2027-10-10"),
      storageLocation: "Pharmacy Shelf C1",
    },
  });

  // Prescriptions & Dispensing
  const prescriptionA = await prisma.pharmacyPrescription.upsert({
    where: { prescriptionNumber: "RX-8101" },
    update: { dispensingStatus: PrescriptionDispensingStatus.DISPENSED },
    create: {
      prescriptionNumber: "RX-8101",
      patientId: primaryPatient.id,
      doctorId: doctorUser.id,
      doctorName: "Dr. Selam Girma",
      dispensingStatus: PrescriptionDispensingStatus.DISPENSED,
      notes: "Take after meals with plenty of water.",
    },
  });

  const rxItem1 = await prisma.pharmacyPrescriptionItem.upsert({
    where: { id: "item-rx-8101-1" },
    update: { dispensedQuantity: 9 },
    create: {
      id: "item-rx-8101-1",
      prescriptionId: prescriptionA.id,
      medicineId: medicineMap.get("MED-001")!,
      dosage: "1 tablet (500mg)",
      frequency: "Every 8 hours",
      duration: "3 days",
      instructions: "Take with food",
      quantity: 9,
      dispensedQuantity: 9,
    },
  });

  await prisma.dispensingRecord.upsert({
    where: { receiptNumber: "RCP-9001" },
    update: { quantity: 9 },
    create: {
      receiptNumber: "RCP-9001",
      prescriptionId: prescriptionA.id,
      prescriptionItemId: rxItem1.id,
      patientId: primaryPatient.id,
      medicineId: medicineMap.get("MED-001")!,
      batchId: batch1.id,
      batchNumber: "PAR-26-01",
      quantity: 9,
      dispensedById: pharmacist.id,
    },
  });

  await prisma.procurementRecord.upsert({
    where: { orderNumber: "PR-7001" },
    update: { status: ProcurementStatus.PURCHASE_ORDER },
    create: {
      orderNumber: "PR-7001",
      supplierId: supplierA.id,
      medicineId: medicineMap.get("MED-001")!,
      quantity: 500,
      status: ProcurementStatus.PURCHASE_ORDER,
      invoiceNumber: "INV-SUP-2026-88",
    },
  });

  // ==========================================
  // 6. WARDS, BEDS & INPATIENT CARE
  // ==========================================
  console.log("--> Seeding wards, beds and inpatient admissions...");
  const wardMed = await prisma.ward.upsert({
    where: { code: "WARD-MED" },
    update: { capacity: 18 },
    create: {
      code: "WARD-MED",
      name: "Medical Inpatient Ward",
      type: WardType.INTERNAL_MEDICINE,
      capacity: 18,
      departmentId: departmentMap.get("Internal Medicine"),
      departmentName: "Internal Medicine",
      active: true,
    },
  });

  const wardSurg = await prisma.ward.upsert({
    where: { code: "WARD-SURG" },
    update: { capacity: 12 },
    create: {
      code: "WARD-SURG",
      name: "Surgical Inpatient Ward",
      type: WardType.SURGERY,
      capacity: 12,
      departmentId: departmentMap.get("General Surgery"),
      departmentName: "General Surgery",
      active: true,
    },
  });

  const wardPed = await prisma.ward.upsert({
    where: { code: "WARD-PED" },
    update: { capacity: 10 },
    create: {
      code: "WARD-PED",
      name: "Pediatric Inpatient Ward",
      type: WardType.PEDIATRICS,
      capacity: 10,
      departmentId: departmentMap.get("Pediatrics & Child Health"),
      departmentName: "Pediatrics & Child Health",
      active: true,
    },
  });

  // Beds
  const bedMed1 = await prisma.bed.upsert({
    where: { wardId_bedNumber: { wardId: wardMed.id, bedNumber: "MED-01" } },
    update: { status: BedStatus.OCCUPIED, currentPatientId: secondaryPatient.id },
    create: {
      wardId: wardMed.id,
      bedNumber: "MED-01",
      status: BedStatus.OCCUPIED,
      currentPatientId: secondaryPatient.id,
      notes: "Assigned for acute internal medicine admission",
    },
  });

  await prisma.bed.upsert({
    where: { wardId_bedNumber: { wardId: wardMed.id, bedNumber: "MED-02" } },
    update: { status: BedStatus.AVAILABLE, currentPatientId: null },
    create: { wardId: wardMed.id, bedNumber: "MED-02", status: BedStatus.AVAILABLE },
  });

  await prisma.bed.upsert({
    where: { wardId_bedNumber: { wardId: wardMed.id, bedNumber: "MED-03" } },
    update: { status: BedStatus.RESERVED },
    create: { wardId: wardMed.id, bedNumber: "MED-03", status: BedStatus.RESERVED, notes: "Reserved for emergency transfer" },
  });

  const bedSurg1 = await prisma.bed.upsert({
    where: { wardId_bedNumber: { wardId: wardSurg.id, bedNumber: "SUR-01" } },
    update: { status: BedStatus.OCCUPIED, currentPatientId: surgeryPatient.id },
    create: {
      wardId: wardSurg.id,
      bedNumber: "SUR-01",
      status: BedStatus.OCCUPIED,
      currentPatientId: surgeryPatient.id,
      notes: "Post-op appendectomy patient",
    },
  });

  // Admissions
  const admission1 = await prisma.inpatientAdmission.upsert({
    where: { admissionNumber: "ADM-6001" },
    update: { status: InpatientAdmissionStatus.ADMITTED },
    create: {
      admissionNumber: "ADM-6001",
      patientId: secondaryPatient.id,
      doctorId: doctorUser.id,
      doctorName: "Dr. Selam Girma",
      wardId: wardMed.id,
      bedId: bedMed1.id,
      reason: "Acute febrile illness with suspected typhoid requiring IV hydration and antibiotics",
      status: InpatientAdmissionStatus.ADMITTED,
    },
  });

  await prisma.inpatientAdmission.upsert({
    where: { admissionNumber: "ADM-6002" },
    update: { status: InpatientAdmissionStatus.ADMITTED },
    create: {
      admissionNumber: "ADM-6002",
      patientId: surgeryPatient.id,
      doctorId: doctorUser.id,
      doctorName: "Dr. Selam Girma",
      wardId: wardSurg.id,
      bedId: bedSurg1.id,
      reason: "Emergency surgical appendectomy recovery",
      status: InpatientAdmissionStatus.ADMITTED,
    },
  });

  // Discharges
  await prisma.inpatientDischarge.upsert({
    where: { dischargeNumber: "DIS-3001" },
    update: { authorizationStatus: InpatientDischargeStatus.AUTHORIZED },
    create: {
      dischargeNumber: "DIS-3001",
      admissionId: admission1.id,
      patientId: secondaryPatient.id,
      authorizingDoctorId: doctorUser.id,
      finalDiagnosis: "Resolved Enteric Fever (Typhoid)",
      medicationInstructions: "Complete oral Ciprofloxacin 500mg BID for remaining 4 days.",
      followUpInstructions: "Visit Outpatient Clinic in 2 weeks or immediately if fever recurs.",
      authorizationStatus: InpatientDischargeStatus.AUTHORIZED,
      authorizedAt: new Date(),
    },
  });

  // ==========================================
  // 7. FACILITIES, FLEET & ASSETS
  // ==========================================
  console.log("--> Seeding operating rooms, ambulances and equipment assets...");
  await prisma.operatingRoom.upsert({
    where: { roomNumber: "OR-1" },
    update: { status: OperatingRoomStatus.AVAILABLE },
    create: { roomNumber: "OR-1", name: "Operating Theater 1 (General)", status: OperatingRoomStatus.AVAILABLE },
  });

  await prisma.operatingRoom.upsert({
    where: { roomNumber: "OR-2" },
    update: { status: OperatingRoomStatus.SCHEDULED, patientId: surgeryPatient.id },
    create: {
      roomNumber: "OR-2",
      name: "Operating Theater 2 (Orthopedic/Trauma)",
      status: OperatingRoomStatus.SCHEDULED,
      procedure: "Internal Fixation of Tibial Fracture",
      patientId: surgeryPatient.id,
      surgicalTeam: "Dr. Selam Girma, Sr. Tigist Alemu",
      scheduledAt: new Date(Date.now() + 4 * 3600 * 1000),
    },
  });

  const ambulance1 = await prisma.ambulance.upsert({
    where: { vehicleNumber: "GH-AMB-01" },
    update: { status: AmbulanceStatus.AVAILABLE },
    create: {
      vehicleNumber: "GH-AMB-01",
      driverName: "Ato Muluken Zeleke",
      phone: "+251-918-100-001",
      status: AmbulanceStatus.AVAILABLE,
    },
  });

  const ambulance2 = await prisma.ambulance.upsert({
    where: { vehicleNumber: "GH-AMB-02" },
    update: { status: AmbulanceStatus.DISPATCHED },
    create: {
      vehicleNumber: "GH-AMB-02",
      driverName: "Ato Dawit Mekonnen",
      phone: "+251-918-100-002",
      status: AmbulanceStatus.DISPATCHED,
    },
  });

  await prisma.ambulanceTrip.upsert({
    where: { tripNumber: "TRIP-100" },
    update: { status: AmbulanceTripStatus.DISPATCHED },
    create: {
      tripNumber: "TRIP-100",
      ambulanceId: ambulance2.id,
      patientId: primaryPatient.id,
      destination: "Felege Hiwot Comprehensive Referral Hospital, Bahir Dar",
      status: AmbulanceTripStatus.DISPATCHED,
      notes: "Emergency inter-hospital referral under medical oxygen",
    },
  });

  await prisma.ambulanceMaintenance.upsert({
    where: { maintenanceNumber: "AMNT-100" },
    update: { status: MaintenanceStatus.COMPLETED },
    create: {
      maintenanceNumber: "AMNT-100",
      ambulanceId: ambulance1.id,
      description: "Routine 10,000 km brake inspection and oil filter replacement",
      status: MaintenanceStatus.COMPLETED,
      completedAt: new Date(),
    },
  });

  // General inventory consumables
  await prisma.generalInventoryItem.upsert({
    where: { itemCode: "INV-001" },
    update: { quantity: 240 },
    create: { itemCode: "INV-001", name: "Examination Gloves (Nitrile)", category: "Consumable", quantity: 240, unit: "boxes", location: "Central Medical Store", reorderLevel: 50 },
  });

  await prisma.generalInventoryItem.upsert({
    where: { itemCode: "INV-002" },
    update: { quantity: 180 },
    create: { itemCode: "INV-002", name: "Surgical Face Masks 3-Ply", category: "Consumable", quantity: 180, unit: "boxes", location: "Central Medical Store", reorderLevel: 25 },
  });

  await prisma.generalInventoryItem.upsert({
    where: { itemCode: "INV-003" },
    update: { quantity: 45 },
    create: { itemCode: "INV-003", name: "Sterile IV Infusion Sets", category: "Consumable", quantity: 45, unit: "cartons", location: "Medical Ward Store", reorderLevel: 10 },
  });

  // Hospital Assets
  const asset1 = await prisma.hospitalAsset.upsert({
    where: { assetTag: "AST-1001" },
    update: { condition: AssetCondition.OPERATIONAL },
    create: {
      assetTag: "AST-1001",
      name: "Multiparameter Patient Monitor",
      category: "Critical Care",
      serialNumber: "SN-PHILIPS-2026-9001",
      assignedDepartment: "Intensive Care Unit",
      location: "ICU Bay 1",
      condition: AssetCondition.OPERATIONAL,
    },
  });

  await prisma.assetMaintenanceRequest.upsert({
    where: { ticketNumber: "MNT-501" },
    update: { status: MaintenanceStatus.IN_PROGRESS },
    create: {
      ticketNumber: "MNT-501",
      assetId: asset1.id,
      description: "SpO2 probe cable intermittent connection; replacement requested",
      priority: MaintenancePriority.URGENT,
      status: MaintenanceStatus.IN_PROGRESS,
    },
  });

  // ==========================================
  // 8. DIAGNOSTIC ATTACHMENTS & TRANSFUSIONS
  // ==========================================
  console.log("--> Seeding diagnostic attachments and transfusion records...");
  await prisma.diagnosticAttachment.create({
    data: {
      patientId: primaryPatient.id,
      title: "Chest X-Ray AP & Lateral View",
      modality: "X-Ray",
      mediaType: "DICOM study",
      studyDate: new Date("2026-11-10"),
      accessLevel: "RESTRICTED",
      fileUrl: "/secure/imaging/cxr-ghms-000001.dcm",
      mimeType: "application/dicom",
      fileSizeBytes: BigInt(14502800),
    },
  });

  // Blood bank unit & transfusion record
  const bloodUnit = await prisma.bloodBankUnit.findFirst({
    where: { bloodGroup: "O+", status: "AVAILABLE" },
  });

  if (bloodUnit) {
    await prisma.transfusionRecord.upsert({
      where: { recordNumber: "TRF-2001" },
      update: {},
      create: {
        recordNumber: "TRF-2001",
        patientId: primaryPatient.id,
        bloodUnitId: bloodUnit.id,
        administeredById: doctorUser.id,
        status: "COMPLETED",
        adverseReactions: "No adverse transfusion reaction observed. Post-transfusion vitals stable.",
      },
    });
  }

  // ==========================================
  // 9. TENANT INTEGRITY BACKFILL
  // ==========================================
  console.log("--> Ensuring all historical records are linked to the primary hospital tenant...");
  await prisma.user.updateMany({ where: { hospitalId: null }, data: { hospitalId: defaultHospital.id } });
  await prisma.patient.updateMany({ where: { hospitalId: null }, data: { hospitalId: defaultHospital.id } });
  await prisma.appointment.updateMany({ where: { hospitalId: null }, data: { hospitalId: defaultHospital.id } });
  await prisma.invoice.updateMany({ where: { hospitalId: null }, data: { hospitalId: defaultHospital.id } });
  await prisma.payment.updateMany({ where: { hospitalId: null }, data: { hospitalId: defaultHospital.id } });
  await prisma.conversation.updateMany({ where: { hospitalId: null }, data: { hospitalId: defaultHospital.id } });

  console.log("=== GHMS STAGE 3 SEEDING COMPLETED SUCCESSFULLY ===");
}

main()
  .catch((e) => {
    console.error("Failed to seed database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
