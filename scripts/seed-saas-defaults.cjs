const path = require("path");
const { PrismaClient } = require(path.join(__dirname, "../backend/node_modules/@prisma/client"));

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "mysql://ghms_user:ghms-local-dev@localhost:3306/ghms?connection_limit=20&pool_timeout=10",
    },
  },
});

async function main() {
  console.log("Starting SaaS & Chapa initialization...");

  // 1. Seed Subscription Plans
  const plans = [
    {
      code: "BASIC",
      name: "Basic Hospital Plan",
      description: "Essential patient registration, appointments, basic billing, and outpatient management.",
      monthlyPrice: 5000.00,
      annualPrice: 54000.00,
      maxStaff: 25,
      maxPatients: 2000,
      features: JSON.stringify([
        "patient_registration",
        "appointment_management",
        "basic_billing",
        "outpatient_queue",
        "basic_reports"
      ]),
      isActive: true,
    },
    {
      code: "PROFESSIONAL",
      name: "Professional Medical Center Plan",
      description: "Full clinical services, doctor & nurse workspaces, laboratory, pharmacy, and advanced billing with Chapa.",
      monthlyPrice: 15000.00,
      annualPrice: 162000.00,
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
        "advanced_reports"
      ]),
      isActive: true,
    },
    {
      code: "ENTERPRISE",
      name: "Enterprise Multi-Department Hospital Plan",
      description: "Comprehensive hospital operations including emergency triage, inpatient wards, operating rooms, ambulance fleet, blood bank, and custom permissions.",
      monthlyPrice: 35000.00,
      annualPrice: 378000.00,
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
        "audit_compliance"
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
    console.log(`Plan ${plan.code} upserted successfully.`);
  }

  // 2. Seed Default Primary Hospital (Gondar University Comprehensive Specialized Hospital)
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
  console.log(`Primary hospital configured: ${defaultHospital.name} (${defaultHospital.id})`);

  // 3. Ensure Hospital Subscription is Active
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
    console.log("Enterprise annual subscription activated for primary hospital.");
  }

  // 4. Backfill existing records to the default hospital
  const userUpdate = await prisma.user.updateMany({
    where: { hospitalId: null },
    data: { hospitalId: defaultHospital.id },
  });
  console.log(`Associated ${userUpdate.count} users with primary hospital.`);

  const patientUpdate = await prisma.patient.updateMany({
    where: { hospitalId: null },
    data: { hospitalId: defaultHospital.id },
  });
  console.log(`Associated ${patientUpdate.count} patients with primary hospital.`);

  const appointmentUpdate = await prisma.appointment.updateMany({
    where: { hospitalId: null },
    data: { hospitalId: defaultHospital.id },
  });
  console.log(`Associated ${appointmentUpdate.count} appointments with primary hospital.`);

  const invoiceUpdate = await prisma.invoice.updateMany({
    where: { hospitalId: null },
    data: { hospitalId: defaultHospital.id },
  });
  console.log(`Associated ${invoiceUpdate.count} invoices with primary hospital.`);

  const paymentUpdate = await prisma.payment.updateMany({
    where: { hospitalId: null },
    data: { hospitalId: defaultHospital.id },
  });
  console.log(`Associated ${paymentUpdate.count} payments with primary hospital.`);

  const conversationUpdate = await prisma.conversation.updateMany({
    where: { hospitalId: null },
    data: { hospitalId: defaultHospital.id },
  });
  console.log(`Associated ${conversationUpdate.count} conversations with primary hospital.`);

  console.log("SaaS & Chapa default initialization completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during initialization:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
