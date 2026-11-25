const path = require("path");
const { PrismaClient } = require(path.join(__dirname, "../backend/node_modules/@prisma/client"));
const jwt = require(path.join(__dirname, "../backend/node_modules/jsonwebtoken"));

// DATABASE_URL and JWT_ACCESS_SECRET are read from the environment (backend/.env).
// Never hardcode secrets or database credentials here.
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_ACCESS_SECRET;
if (!JWT_SECRET) {
  console.error("ERROR: JWT_ACCESS_SECRET environment variable is not set.");
  console.error("Load backend/.env before running this script, e.g.:");
  console.error("  $env:JWT_ACCESS_SECRET = (Get-Content backend/.env | Select-String JWT_ACCESS_SECRET | ...) ");
  process.exit(1);
}
const BASE_URL = "http://localhost:4000/api/v1";

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      patientId: user.patient?.id,
      department: user.department,
      hospitalId: user.hospitalId,
    },
    JWT_SECRET,
    { expiresIn: "15m" }
  );
}

async function runTests() {
  console.log("=== STARTING CHAPA & SAAS INTEGRATION SUITE ===");

  // 1. Test SaaS Plans Public Endpoint
  console.log("\n[1] Testing GET /api/v1/saas/plans...");
  const plansRes = await fetch(`${BASE_URL}/saas/plans`);
  const plansData = await plansRes.json();
  if (!plansData.success || !Array.isArray(plansData.data) || plansData.data.length < 3) {
    throw new Error("Failed to load subscription plans: " + JSON.stringify(plansData));
  }
  console.log(`[PASS] Fetched ${plansData.data.length} subscription plans:`, plansData.data.map((p) => p.code).join(", "));

  // 2. Test Hospital Registration (Onboarding)
  console.log("\n[2] Testing POST /api/v1/saas/register...");
  const testCode = `test-hosp-${Date.now()}`;
  const regRes = await fetch(`${BASE_URL}/saas/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Tigray Specialized Referral Hospital",
      code: testCode,
      email: `contact@${testCode}.et`,
      phone: "+251911223344",
      city: "Mekelle",
      region: "Tigray",
      tier: "PROFESSIONAL",
    }),
  });
  const regData = await regRes.json();
  if (!regData.success || regData.data.code !== testCode || regData.data.status !== "TRIAL") {
    throw new Error("Failed to register hospital: " + JSON.stringify(regData));
  }
  console.log(`[PASS] Hospital registered: ${regData.data.name} with TRIAL status and PROFESSIONAL tier.`);

  // 3. Find an active Patient User with an unpaid invoice
  console.log("\n[3] Locating test patient and unpaid invoice...");
  let invoice = await prisma.invoice.findFirst({
    where: { status: "UNPAID" },
    include: {
      patient: {
        include: { user: true },
      },
    },
  });

  if (!invoice) {
    console.log("Creating test invoice for Chapa checkout verification...");
    const patient = await prisma.patient.findFirst({
      include: { user: true },
    });
    const admin = await prisma.user.findFirst({
      where: { role: "ADMINISTRATOR" },
    });

    const invNum = `INV-TEST-${Date.now()}`;
    invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: invNum,
        patientId: patient.id,
        payer: `${patient.firstName} ${patient.lastName}`,
        currency: "ETB",
        subtotal: 1250.00,
        total: 1250.00,
        paidAmount: 0,
        status: "UNPAID",
        dueAt: new Date(Date.now() + 86400000 * 7),
        createdById: admin.id,
        hospitalId: patient.hospitalId,
        items: {
          create: [
            {
              serviceName: "Consultation & Clinical Lab Panel",
              category: "DIAGNOSTICS",
              quantity: 1,
              unitPrice: 1250.00,
              lineTotal: 1250.00,
            },
          ],
        },
      },
      include: {
        patient: { include: { user: true } },
        items: true,
      },
    });
  }

  console.log(`Using Invoice #${invoice.invoiceNumber} (Total: ETB ${invoice.total}, Status: ${invoice.status})`);

  // Ensure patient user has a valid active account
  let patientUser = invoice.patient.user;
  if (!patientUser) {
    const defaultUser = await prisma.user.findFirst({
      where: { role: "PATIENT", status: "ACTIVE" },
      include: { patient: true },
    });
    patientUser = defaultUser;
  }

  const token = signToken({
    ...patientUser,
    patient: invoice.patient,
    hospitalId: invoice.hospitalId,
  });

  // 4. Test Chapa Payment Initialization
  console.log("\n[4] Testing POST /api/v1/payments/chapa/initialize...");
  const initRes = await fetch(`${BASE_URL}/payments/chapa/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      invoiceId: invoice.id,
    }),
  });

  const initData = await initRes.json();
  if (!initData.success || !initData.data?.txRef || !initData.data?.checkoutUrl) {
    throw new Error("Failed to initialize Chapa payment: " + JSON.stringify(initData));
  }
  console.log(`[PASS] Chapa payment initialized: Ref=${initData.data.txRef}, Amount=ETB ${initData.data.amount}`);
  console.log(`       Checkout URL: ${initData.data.checkoutUrl}`);

  // 5. Test Chapa Payment Verification
  console.log("\n[5] Testing GET /api/v1/payments/chapa/verify/:reference...");
  const verifyRes = await fetch(`${BASE_URL}/payments/chapa/verify/${initData.data.txRef}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const verifyData = await verifyRes.json();
  if (!verifyData.success || verifyData.data?.status !== "SUCCESSFUL") {
    throw new Error("Failed to verify Chapa payment: " + JSON.stringify(verifyData));
  }
  console.log(`[PASS] Payment verified successfully: Payment ID=${verifyData.data.paymentId}, Receipt=${verifyData.data.receiptNumber}`);
  console.log(`       Updated Invoice Status: ${verifyData.data.invoiceStatus}`);

  // 6. Test Digital Receipt Generation
  console.log("\n[6] Testing GET /api/v1/payments/receipt/:paymentId...");
  const receiptRes = await fetch(`${BASE_URL}/payments/receipt/${verifyData.data.paymentId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const receiptData = await receiptRes.json();
  if (!receiptData.success || !receiptData.data?.receiptNumber) {
    throw new Error("Failed to retrieve digital receipt: " + JSON.stringify(receiptData));
  }
  console.log(`[PASS] Receipt generated: #${receiptData.data.receiptNumber}`);
  console.log(`       Patient: ${receiptData.data.patient.name}`);
  console.log(`       Hospital: ${receiptData.data.hospital.name}`);
  console.log(`       Total Paid: ETB ${receiptData.data.amount} via ${receiptData.data.gateway}`);

  // 7. Test Payment Telemetry Analytics (Administrator)
  console.log("\n[7] Testing GET /api/v1/payments/analytics...");
  const adminUser = await prisma.user.findFirst({
    where: { role: "ADMINISTRATOR" },
  });
  const adminToken = signToken(adminUser);

  const analyticsRes = await fetch(`${BASE_URL}/payments/analytics`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const analyticsData = await analyticsRes.json();
  if (!analyticsData.success || analyticsData.data.counts.totalPayments === undefined) {
    throw new Error("Failed to fetch payment analytics: " + JSON.stringify(analyticsData));
  }
  console.log("[PASS] Payment Telemetry Retrieved:");
  console.log(`       Total Collected: ETB ${analyticsData.data.revenue.totalCollectedEtb}`);
  console.log(`       Chapa Revenue: ETB ${analyticsData.data.revenue.chapaRevenueEtb}`);
  console.log(`       Total Invoices: ${analyticsData.data.counts.totalInvoices}`);

  // 8. Test Cloudinary Signed Upload
  console.log("\n[8] Testing POST /api/v1/media/sign-upload...");
  const mediaRes = await fetch(`${BASE_URL}/media/sign-upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ category: "HOSPITAL_LOGO" }),
  });
  const mediaData = await mediaRes.json();
  if (!mediaData.success || !mediaData.data.signature || !mediaData.data.folder) {
    throw new Error("Failed to sign Cloudinary upload: " + JSON.stringify(mediaData));
  }
  console.log(`[PASS] Cloudinary upload signature generated for folder: ${mediaData.data.folder}`);

  console.log("\n=== ALL 8 BACKEND CHAPA & SAAS INTEGRATION TESTS PASSED ===");
}

runTests()
  .catch((e) => {
    console.error("Test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
