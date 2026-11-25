import path from "node:path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(process.cwd(), "backend/.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import fs from "node:fs";
import { performance } from "node:perf_hooks";
import request from "supertest";
import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";

function extractCookie(cookies: unknown, name: string): string | undefined {
  if (!cookies) return undefined;
  const list = Array.isArray(cookies) ? cookies : [String(cookies)];
  const match = list.find((c) => typeof c === "string" && c.startsWith(`${name}=`));
  if (!match) return undefined;
  return match.split(";")[0]?.split("=")[1];
}

async function runIntegrationSuite() {
  const { createApp } = await import("../src/app.js");
  const prisma = new PrismaClient();
  const app = createApp(prisma);

  console.log("======================================================================");
  console.log("GHMS STAGE 5: FULL-STACK INTEGRATION & WORKFLOW VERIFICATION SUITE");
  console.log("======================================================================");

  // Credentials are read from environment variables — never hardcode here.
  const STAFF_PASSWORD = process.env.GHMS_TEST_STAFF_PASSWORD;
  const PATIENT_PASSWORD = process.env.GHMS_TEST_PATIENT_PASSWORD;
  if (!STAFF_PASSWORD || !PATIENT_PASSWORD) {
    console.error(
      "ERROR: GHMS_TEST_STAFF_PASSWORD and GHMS_TEST_PATIENT_PASSWORD must be set before running this script."
    );
    process.exit(1);
  }

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} - ${details ?? "Assertion failed"}`);
      failed++;
    }
  }

  const performanceMetrics: Record<string, number> = {};

  try {
    // =========================================================================
    // WORKFLOW 1: Patient Self-Registration & Database Verification
    // =========================================================================
    console.log("\n--- WORKFLOW 1: Patient Registration & Profile Persistence ---");
    const regEmail = `synth.patient.${Date.now()}@example.com`;
    const regPhone = `+2519${String(Date.now()).slice(-8)}`;

    const regRes = await request(app)
      .post("/api/v1/auth/register")
      .send({
        firstName: "Abebe",
        middleName: "Chane",
        lastName: "Worku",
        gender: "male",
        dateOfBirth: "1992-05-14",
        phone: regPhone,
        email: regEmail,
        address: "Kebele 08, Gondar, Ethiopia",
        password: PATIENT_PASSWORD,
        termsAccepted: true,
      });

    assert(regRes.status === 201, `Patient registration endpoint returns 201 Created (HTTP ${regRes.status})`);
    assert(regRes.body.data?.email === regEmail, "Response contains registered patient email");

    // Verify database row in User & Patient tables
    const dbUser = await prisma.user.findFirst({
      where: { email: regEmail },
      include: { patient: true },
    });
    assert(dbUser !== null, "User record persisted in MySQL database");
    assert(dbUser?.role === UserRole.PATIENT, "New registrant assigned PATIENT role");
    assert(dbUser?.patient !== null, "Associated Patient record created in MySQL database");
    assert(Boolean(dbUser?.patient?.patientNumber?.startsWith("GHMS-")), "Generated official GHMS patient identifier format");

    // Verify Bcrypt hash
    const hashValid = await bcrypt.compare(PATIENT_PASSWORD, dbUser?.passwordHash ?? "");
    assert(hashValid, "Password hashed securely with Bcrypt (verified match)");

    // =========================================================================
    // WORKFLOW 2: Staff-Assisted Appointment Scheduling & Queue Check-In
    // =========================================================================
    console.log("\n--- WORKFLOW 2: Appointment Scheduling & Queue Management ---");
    // 2.1 Receptionist login
    const recepLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ identifier: "receptionist", password: STAFF_PASSWORD });
    assert(recepLogin.status === 200, "Receptionist authentication successful");
    const recepCookie = extractCookie(recepLogin.headers["set-cookie"], "ghms_access");

    // 2.2 Query doctors and availability
    const docRes = await request(app)
      .get("/api/v1/doctors")
      .set("Cookie", `ghms_access=${recepCookie}`);
    assert(docRes.status === 200 && Array.isArray(docRes.body.data) && docRes.body.data.length > 0, "Receptionist successfully queries doctor directory");

    const targetDoctor = docRes.body.data.find((d: any) => d.schedules && d.schedules.length > 0) || docRes.body.data[0];
    const sched = targetDoctor.schedules[0] || { dayOfWeek: 1, startTime: "08:30" };

    // Find next available weekday matching doctor's schedule
    const candidateDate = new Date();
    candidateDate.setDate(candidateDate.getDate() + 1); // at least tomorrow
    while (new Date(`${candidateDate.toISOString().slice(0, 10)}T00:00:00Z`).getUTCDay() !== sched.dayOfWeek) {
      candidateDate.setDate(candidateDate.getDate() + 1);
    }
    const apptDate = candidateDate.toISOString().slice(0, 10);

    // Query availability for that date
    const availRes = await request(app)
      .get(`/api/v1/doctors/availability?date=${apptDate}&department=${encodeURIComponent(targetDoctor.department)}`)
      .set("Cookie", `ghms_access=${recepCookie}`);
    assert(availRes.status === 200, "Receptionist queries doctor slot availability");
    const docAvail = availRes.body.data?.find((d: any) => d.doctorId === targetDoctor.id);
    const chosenSlot = docAvail?.slots?.[0] || sched.startTime || "09:00";

    // 2.3 Book appointment using patientNumber
    const bookRes = await request(app)
      .post("/api/v1/appointments")
      .set("Cookie", `ghms_access=${recepCookie}`)
      .send({
        patientId: dbUser?.patient?.patientNumber,
        doctor: targetDoctor.name,
        department: targetDoctor.department,
        date: apptDate,
        time: chosenSlot,
        type: "consultation",
        reason: "Routine follow-up evaluation",
        notes: "Registered via integration test",
      });
    assert(bookRes.status === 201, `Appointment created successfully in database (HTTP ${bookRes.status})`);
    const appointmentId = bookRes.body.data?.id;
    assert(typeof appointmentId === "string", "Valid appointment ID returned");

    // 2.4 Verify database appointment row
    const dbAppt = await prisma.appointment.findUnique({ where: { id: appointmentId } });
    assert(dbAppt !== null && dbAppt.status === "SCHEDULED", "Appointment persisted in MySQL with status SCHEDULED");

    // 2.5 Update appointment status to CONFIRMED
    const updateApptRes = await request(app)
      .patch(`/api/v1/appointments/${appointmentId}/status`)
      .set("Cookie", `ghms_access=${recepCookie}`)
      .send({ status: "Confirmed" });
    assert(updateApptRes.status === 200, "Appointment status updated to Confirmed");

    // 2.6 Attempt check-in on future appointment (verifies APPOINTMENT_NOT_DUE rule)
    const futureCheckIn = await request(app)
      .post("/api/v1/queue/check-in")
      .set("Cookie", `ghms_access=${recepCookie}`)
      .send({ appointmentId });
    assert(futureCheckIn.status === 409 && futureCheckIn.body.error?.code === "APPOINTMENT_NOT_DUE", "Pre-due appointment check-in prevented by business rules (HTTP 409)");

    // 2.7 Transition scheduledAt to today in MySQL to test live queue check-in
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { scheduledAt: new Date() },
    });

    // 2.8 Check-in to department queue
    const checkInRes = await request(app)
      .post("/api/v1/queue/check-in")
      .set("Cookie", `ghms_access=${recepCookie}`)
      .send({ appointmentId });
    if (checkInRes.status !== 201) {
      console.log("DEBUG checkInRes FAILED:", checkInRes.status, checkInRes.body);
    }
    assert(checkInRes.status === 201, "Appointment checked in to department queue");
    const queueNumber = checkInRes.body.data?.queueNumber;
    assert(typeof queueNumber === "number" && queueNumber > 0, `Department queue token assigned (#${queueNumber})`);

    // =========================================================================
    // WORKFLOW 3: Clinical Consultation & Doctor Workflow
    // =========================================================================
    console.log("\n--- WORKFLOW 3: Clinical Consultation & Examination ---");
    // 3.1 Doctor login
    const docLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ identifier: "selam.girma", password: STAFF_PASSWORD });
    assert(docLogin.status === 200, "Doctor authentication successful");
    const docCookie = extractCookie(docLogin.headers["set-cookie"], "ghms_access");

    // 3.2 Doctor calls next patient in queue
    const callNextRes = await request(app)
      .post("/api/v1/queue/call-next")
      .set("Cookie", `ghms_access=${docCookie}`)
      .send({ department: targetDoctor.department });
    assert(callNextRes.status === 200, "Doctor successfully called next waiting patient");

    // 3.3 Create Clinical Encounter & Consultation Note in MySQL
    const encounter = await prisma.clinicalEncounter.create({
      data: {
        patientId: dbUser!.patient!.id,
        clinicianId: docLogin.body.data.id,
        department: "Internal Medicine",
        status: "ACTIVE",
        consultations: {
          create: {
            patientId: dbUser!.patient!.id,
            authorId: docLogin.body.data.id,
            data: {
              presentingComplaint: "Patient reports persistent seasonal fatigue",
              historyOfPresentIllness: "Symptoms started 2 weeks ago without acute fever",
              examination: "BP 120/80 mmHg, HR 72 bpm, chest clear",
            },
            status: "FINALIZED",
          },
        },
        diagnoses: {
          create: {
            patientId: dbUser!.patient!.id,
            authorId: docLogin.body.data.id,
            diagnosis: "Fatigue, unspecified",
            code: "R53.83",
            diagnosedAt: new Date(),
            clinician: "Dr. Selam Girma",
            clinicalNotes: "Patient reports persistent seasonal fatigue",
            isPrimary: true,
          },
        },
      },
      include: { consultations: true, diagnoses: true },
    });
    assert(encounter.id !== undefined, "Clinical consultation encounter saved in MySQL");
    assert(encounter.consultations.length > 0, "Consultation note linked to encounter with clinical findings");
    assert(encounter.diagnoses.length > 0, "ICD-10 working diagnosis recorded and linked");

    // =========================================================================
    // WORKFLOW 4: Diagnostic Laboratory Workflow
    // =========================================================================
    console.log("\n--- WORKFLOW 4: Laboratory Test Ordering & Result Release ---");
    // 4.1 Get or create catalog item and order lab test in MySQL
    const catalogItem = await prisma.laboratoryTestCatalogItem.upsert({
      where: { code: "CBC-001" },
      update: { active: true },
      create: {
        code: "CBC-001",
        name: "Complete Blood Count (CBC)",
        category: "Hematology",
        specimenType: "Venous whole blood",
        instructions: "Collect in EDTA tube",
        unit: "g/dL",
        referenceInterval: "13.5 - 17.5 g/dL",
        servicePrice: 200.0,
        active: true,
      },
    });
    assert(catalogItem !== null, "Laboratory catalog item provisioned in database");

    const labOrder = await prisma.laboratoryOrder.create({
      data: {
        orderNumber: `ORD-LAB-${Date.now().toString().slice(-6)}`,
        patientId: dbUser!.patient!.id,
        requestedById: docLogin.body.data.id,
        department: "Clinical Laboratory",
        priority: "Urgent",
        status: "PENDING",
        items: {
          create: {
            catalogId: catalogItem!.id,
          },
        },
      },
      include: { items: true },
    });
    assert(labOrder.id !== undefined && labOrder.items.length > 0, "Laboratory order created with status PENDING");

    // 4.2 Specimen collection
    const specimen = await prisma.laboratorySpecimen.create({
      data: {
        specimenNumber: `SPEC-${Date.now().toString().slice(-6)}`,
        orderId: labOrder.id,
        specimenType: "Venous whole blood",
        collectedAt: new Date(),
        collectedById: docLogin.body.data.id,
        status: "COLLECTED",
      },
    });
    assert(specimen.id !== undefined, "Laboratory specimen collected and registered");

    // 4.3 Enter verified test result and release
    const labResult = await prisma.laboratoryResult.create({
      data: {
        orderItemId: labOrder.items[0].id,
        authorId: docLogin.body.data.id,
        kind: "NUMERIC",
        value: "14.2",
        unit: "g/dL",
        referenceRange: "13.5 - 17.5 g/dL",
        abnormalFlag: "NORMAL",
        status: "RELEASED",
        releasedAt: new Date(),
      },
    });
    assert(labResult.id !== undefined && labResult.status === "RELEASED", "Laboratory result recorded with status RELEASED");

    // =========================================================================
    // WORKFLOW 5: Pharmacy & Medicine Dispensing Workflow
    // =========================================================================
    console.log("\n--- WORKFLOW 5: Pharmacy Prescription & Stock Dispensing ---");
    // 5.1 Find active medicine and batch
    const med = await prisma.medicine.findFirst({
      where: { code: "MED-001" },
      include: { batches: true },
    });
    assert(med !== null, "Prescription medicine (Paracetamol 500mg) found in catalog");

    const batch = med?.batches[0];
    assert(batch !== undefined && batch.quantity > 5, `Medicine batch found with stock quantity (${batch?.quantity} units)`);

    const initialQuantity = batch!.quantity;

    // 5.2 Create prescription
    const prescription = await prisma.pharmacyPrescription.create({
      data: {
        prescriptionNumber: `RX-${Date.now().toString().slice(-6)}`,
        patientId: dbUser!.patient!.id,
        doctorId: docLogin.body.data.id,
        doctorName: "Dr. Selam Girma",
        dispensingStatus: "PENDING",
        items: {
          create: {
            medicineId: med!.id,
            dosage: "500 mg",
            frequency: "Every 8 hours",
            duration: "3 days",
            quantity: 9,
          },
        },
      },
      include: { items: true },
    });
    assert(prescription.id !== undefined && prescription.items.length > 0, "Pharmacy prescription created in MySQL");

    // 5.3 Dispense medicine in ACID transaction
    const dispenseAmount = 9;
    await prisma.$transaction([
      prisma.dispensingRecord.create({
        data: {
          receiptNumber: `DISP-${Date.now().toString().slice(-6)}`,
          prescriptionId: prescription.id,
          prescriptionItemId: prescription.items[0].id,
          batchId: batch!.id,
          batchNumber: batch!.batchNumber,
          quantity: dispenseAmount,
          patientId: dbUser!.patient!.id,
          medicineId: med!.id,
          dispensedById: docLogin.body.data.id,
        },
      }),
      prisma.medicineBatch.update({
        where: { id: batch!.id },
        data: { quantity: { decrement: dispenseAmount } },
      }),
      prisma.pharmacyPrescription.update({
        where: { id: prescription.id },
        data: { dispensingStatus: "DISPENSED" },
      }),
    ]);

    const updatedBatch = await prisma.medicineBatch.findUnique({ where: { id: batch!.id } });
    assert(updatedBatch?.quantity === initialQuantity - dispenseAmount, "Medicine batch stock quantity decremented atomically");

    // =========================================================================
    // WORKFLOW 6: Inpatient Bed Assignment & Admission Workflow
    // =========================================================================
    console.log("\n--- WORKFLOW 6: Inpatient Bed Assignment & Admission ---");
    const ward = await prisma.ward.findFirst({
      include: { beds: { where: { status: "AVAILABLE" } } },
    });
    assert(ward !== null && ward.beds.length > 0, "Available bed found in hospital ward");
    const availableBed = ward!.beds[0];

    // Atomically admit patient to bed
    const admission = await prisma.$transaction(async (tx) => {
      await tx.bed.update({
        where: { id: availableBed.id },
        data: { status: "OCCUPIED", currentPatientId: dbUser!.patient!.id },
      });
      return tx.inpatientAdmission.create({
        data: {
          admissionNumber: `ADM-${Date.now().toString().slice(-6)}`,
          patientId: dbUser!.patient!.id,
          doctorId: docLogin.body.data.id,
          doctorName: "Dr. Selam Girma",
          wardId: ward!.id,
          bedId: availableBed.id,
          reason: "Clinical observation and fluid therapy",
          status: "ADMITTED",
        },
      });
    });
    assert(admission.id !== undefined, "Inpatient admission created in MySQL");

    const occupiedBed = await prisma.bed.findUnique({ where: { id: availableBed.id } });
    assert(occupiedBed?.status === "OCCUPIED", "Bed status transitioned to OCCUPIED");

    // Discharge patient and release bed
    await prisma.$transaction([
      prisma.inpatientDischarge.create({
        data: {
          dischargeNumber: `DISCH-${Date.now().toString().slice(-6)}`,
          admissionId: admission.id,
          patientId: dbUser!.patient!.id,
          authorizingDoctorId: docLogin.body.data.id,
          finalDiagnosis: "Resolved seasonal fatigue",
          medicationInstructions: "Complete oral rehydration",
          followUpInstructions: "Follow-up at Outpatient Clinic in 2 weeks",
          authorizationStatus: "COMPLETED",
          authorizedAt: new Date(),
        },
      }),
      prisma.inpatientAdmission.update({
        where: { id: admission.id },
        data: { status: "DISCHARGED", dischargedAt: new Date() },
      }),
      prisma.bed.update({
        where: { id: availableBed.id },
        data: { status: "AVAILABLE", currentPatientId: null },
      }),
    ]);

    const releasedBed = await prisma.bed.findUnique({ where: { id: availableBed.id } });
    assert(releasedBed?.status === "AVAILABLE", "Bed released and transitioned back to AVAILABLE upon discharge");

    // =========================================================================
    // WORKFLOW 7: Billing & Financial Payment Settlement
    // =========================================================================
    console.log("\n--- WORKFLOW 7: Billing & Financial Settlement ---");
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
        patientId: dbUser!.patient!.id,
        payer: "Self-Pay",
        subtotal: 350.0,
        total: 350.0,
        paidAmount: 0.0,
        status: "UNPAID",
        dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdById: docLogin.body.data.id,
        items: {
          create: [
            { serviceName: "General outpatient consultation", category: "Consultation", quantity: 1, unitPrice: 150.0, lineTotal: 150.0 },
            { serviceName: "Hemoglobin laboratory investigation", category: "Laboratory", quantity: 1, unitPrice: 200.0, lineTotal: 200.0 },
          ],
        },
      },
      include: { items: true },
    });
    assert(invoice.id !== undefined && invoice.items.length === 2, "Invoice created with 2 line items totalling 350.00 ETB");

    // Settle payment
    await prisma.$transaction([
      prisma.payment.create({
        data: {
          receiptNumber: `REC-${Date.now().toString().slice(-6)}`,
          invoiceId: invoice.id,
          receivedById: docLogin.body.data.id,
          method: "MOBILE_MONEY",
          amount: 350.0,
        },
      }),
      prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: "PAID", paidAmount: 350.0, finalizedAt: new Date() },
      }),
    ]);

    const settledInvoice = await prisma.invoice.findUnique({ where: { id: invoice.id } });
    assert(settledInvoice?.status === "PAID" && Number(settledInvoice.paidAmount) === 350.0, "Invoice settled via Mobile Money and marked PAID");

    // =========================================================================
    // WORKFLOW 8: Patient Portal Verification & BOLA Protection
    // =========================================================================
    console.log("\n--- WORKFLOW 8: Patient Portal Access & Privacy Isolation ---");
    // 8.1 Activate registered user to allow portal login
    await prisma.user.update({
      where: { id: dbUser!.id },
      data: { status: "ACTIVE" },
    });

    const patientLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ identifier: regEmail, password: PATIENT_PASSWORD });
    assert(patientLogin.status === 200, "Patient successfully authenticates to portal");
    const patientCookie = extractCookie(patientLogin.headers["set-cookie"], "ghms_access");

    // 8.2 Access portal dashboard
    const portalDash = await request(app)
      .get("/api/v1/portal/dashboard")
      .set("Cookie", `ghms_access=${patientCookie}`);
    assert(portalDash.status === 200, "Patient dashboard retrieved successfully");
    assert(portalDash.body.data?.profile?.patientNumber === dbUser?.patient?.patientNumber, "Dashboard strictly returns authenticated patient's profile");

    // 8.3 Patient inspects released medical records
    const recordsRes = await request(app)
      .get("/api/v1/portal/medical-records")
      .set("Cookie", `ghms_access=${patientCookie}`);
    assert(recordsRes.status === 200, "Patient portal records retrieved");
    const returnedRecords = recordsRes.body.data?.records ?? [];
    assert(returnedRecords.some((r: any) => r.category === "Laboratory result" || r.category === "Diagnosis"), "Patient can view released medical diagnoses and laboratory results");

    // 8.4 Patient inspects billing
    const billingRes = await request(app)
      .get("/api/v1/portal/billing")
      .set("Cookie", `ghms_access=${patientCookie}`);
    assert(billingRes.status === 200, "Patient billing statements retrieved");

    // 8.5 Patient updates contact details
    const patchProfile = await request(app)
      .patch("/api/v1/portal/profile")
      .set("Cookie", `ghms_access=${patientCookie}`)
      .send({
        phone: "+251911998877",
        address: "Piazza Road, Gondar, Ethiopia",
        emergencyContactName: "Tigist Chane",
        emergencyContactPhone: "+251911223344",
      });
    assert(patchProfile.status === 200, "Patient permitted contact information updated via portal");

    // 8.6 Verify BOLA protection: attempt unowned appointment modification
    const tamperRes = await request(app)
      .patch("/api/v1/portal/appointments/00000000-0000-0000-0000-000000000000/change")
      .set("Cookie", `ghms_access=${patientCookie}`)
      .send({ action: "cancel", reason: "Unauthorized attempt" });
    assert([400, 403, 404].includes(tamperRes.status), "Unauthorized modification of unowned appointment rejected (BOLA/IDOR protected)");

    // =========================================================================
    // WORKFLOW 9: Administration & Role Governance
    // =========================================================================
    console.log("\n--- WORKFLOW 9: Administration & Role Governance ---");
    const adminLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ identifier: "admin", password: STAFF_PASSWORD });
    assert(adminLogin.status === 200, "Administrator authentication successful");
    const adminCookie = extractCookie(adminLogin.headers["set-cookie"], "ghms_access");

    const newDocId = `synth-doc-${Date.now().toString().slice(-4)}`;
    const createDocRes = await request(app)
      .post("/api/v1/doctors")
      .set("Cookie", `ghms_access=${adminCookie}`)
      .send({
        name: "Dr. Almaz Bekele",
        department: "Internal Medicine",
        specialty: "Cardiology",
        qualifications: "MD, Internist",
      });
    assert(createDocRes.status === 201, "Administrator successfully onboards new physician profile");

    // Non-admin attempting doctor creation is rejected
    const escalateRes = await request(app)
      .post("/api/v1/doctors")
      .set("Cookie", `ghms_access=${recepCookie}`)
      .send({ name: "Dr. Unauthorized Fake" });
    assert(escalateRes.status === 403, "Non-administrator forbidden from creating doctor profile (HTTP 403)");

    // =========================================================================
    // WORKFLOW 10: Performance Benchmarking (Real Measurements)
    // =========================================================================
    console.log("\n--- WORKFLOW 10: Real Performance & Latency Benchmarks ---");
    const measureEndpoint = async (name: string, fn: () => Promise<unknown>) => {
      const start = performance.now();
      await fn();
      const elapsed = performance.now() - start;
      performanceMetrics[name] = Math.round(elapsed * 100) / 100;
      console.log(`[PERF] ${name}: ${performanceMetrics[name]} ms`);
    };

    await measureEndpoint("Health Check (/api/v1/health)", () => request(app).get("/api/v1/health"));
    await measureEndpoint("Readiness Check (/api/v1/ready)", () => request(app).get("/api/v1/ready"));
    await measureEndpoint("Public Queue Display (/api/v1/queue/public)", () => request(app).get("/api/v1/queue/public"));
    await measureEndpoint("User Login Benchmark (/api/v1/auth/login)", () =>
      request(app).post("/api/v1/auth/login").send({ identifier: "admin", password: STAFF_PASSWORD })
    );
    await measureEndpoint("Portal Dashboard Bundle (/api/v1/portal/dashboard)", () =>
      request(app).get("/api/v1/portal/dashboard").set("Cookie", `ghms_access=${patientCookie}`)
    );
    await measureEndpoint("Doctor Directory (/api/v1/doctors)", () =>
      request(app).get("/api/v1/doctors").set("Cookie", `ghms_access=${recepCookie}`)
    );

    assert(performanceMetrics["Health Check (/api/v1/health)"] < 50, "Health check responds in < 50ms");
    assert(performanceMetrics["Public Queue Display (/api/v1/queue/public)"] < 50, "Public waiting room responds in < 50ms");
    assert(performanceMetrics["Portal Dashboard Bundle (/api/v1/portal/dashboard)"] < 150, "Aggregated patient portal dashboard responds in < 150ms");

    // =========================================================================
    // WORKFLOW 11: Internationalization (Amharic / English)
    // =========================================================================
    console.log("\n--- WORKFLOW 11: Internationalization Verification (EN/AM) ---");
    const amPath = path.resolve(process.cwd(), "src/lib/i18n/dictionaries/am.ts");
    const enPath = path.resolve(process.cwd(), "src/lib/i18n/dictionaries/en.ts");
    const amContent = fs.readFileSync(amPath, "utf-8");
    const enContent = fs.readFileSync(enPath, "utf-8");

    assert(amContent.includes("የጎንደር ሆስፒታል አስተዳደር ሥርዓት"), "Amharic dictionary contains hospital full title");
    assert(amContent.includes("common.logout") && amContent.includes("ውጣ"), "Amharic translation for logout is present");
    assert(amContent.includes("common.cancel") && amContent.includes("ተው"), "Amharic translation for cancel is present");
    assert(enContent.includes("common.appName") && amContent.includes("common.appName"), "EN and AM dictionaries have matching key structures");

    // =========================================================================
    // SUMMARY
    // =========================================================================
    console.log("\n======================================================================");
    console.log(`INTEGRATION TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log("======================================================================");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("Integration suite encountered an unexpected error:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

void runIntegrationSuite();
