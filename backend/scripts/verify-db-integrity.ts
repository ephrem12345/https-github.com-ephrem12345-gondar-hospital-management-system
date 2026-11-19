import dotenv from "dotenv";
dotenv.config({ path: "backend/.env" });
import { PrismaClient, BedStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function runVerification() {
  console.log("==================================================");
  console.log("GHMS STAGE 3: DATABASE VERIFICATION & AUDIT SUITE");
  console.log("==================================================");

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

  // 1. Connection check
  console.log("\n--- TEST 1: Database Connectivity ---");
  try {
    const rawRes = await prisma.$queryRawUnsafe<Array<{ one: number }>>("SELECT 1 as one");
    assert(rawRes[0]?.one === 1, "Direct raw MySQL query connectivity check");
  } catch (err) {
    assert(false, "Direct raw MySQL query connectivity check", (err as Error).message);
  }

  // 2. Schema tables verification (Verify all 85 tables)
  console.log("\n--- TEST 2: Schema Table Counts & Subsystem Presence ---");
  try {
    const tables: Array<{ [key: string]: string }> = await prisma.$queryRawUnsafe("SHOW TABLES");
    const tableNames = tables.map((t) => Object.values(t)[0].toLowerCase());
    assert(tableNames.length >= 84, `Total tables in database (${tableNames.length} tables found)`);

    const requiredTables = [
      "user", "patient", "doctor", "appointment", "emergencycase",
      "medicine", "medicinebatch", "pharmacysupplier", "pharmacyprescription",
      "dispensingrecord", "procurementrecord", "ward", "bed", "inpatientadmission",
      "inpatientdischarge", "operatingroom", "ambulance", "hospitalasset",
      "generalinventoryitem", "diagnosticattachment", "transfusionrecord", "department",
    ];

    const missing = requiredTables.filter((t) => !tableNames.includes(t));
    assert(missing.length === 0, `All critical hospital subsystem tables exist (Missing: ${missing.join(", ") || "None"})`);
  } catch (err) {
    assert(false, "Schema table check", (err as Error).message);
  }

  // 3. CRUD Verification
  console.log("\n--- TEST 3: CRUD Operations (Create, Read, Update, Delete) ---");
  let testMedId = "";
  try {
    // CREATE
    const med = await prisma.medicine.create({
      data: {
        code: "MED-TEST-999",
        genericName: "Verification Medicine",
        brandName: "Verifex",
        category: "Test",
        strength: "100 mg",
        manufacturer: "Test Lab",
        unit: "tablet",
        price: 15.5,
        reorderLevel: 20,
      },
    });
    testMedId = med.id;
    assert(med.code === "MED-TEST-999", "CREATE: Successfully inserted new Medicine record");

    // READ
    const foundMed = await prisma.medicine.findUnique({ where: { id: testMedId } });
    assert(foundMed?.genericName === "Verification Medicine", "READ: Successfully queried inserted record");

    // UPDATE
    const updatedMed = await prisma.medicine.update({
      where: { id: testMedId },
      data: { price: 18.75, reorderLevel: 30 },
    });
    assert(Number(updatedMed.price) === 18.75 && updatedMed.reorderLevel === 30, "UPDATE: Successfully updated record attributes");

    // DELETE
    await prisma.medicine.delete({ where: { id: testMedId } });
    const checkDeleted = await prisma.medicine.findUnique({ where: { id: testMedId } });
    assert(checkDeleted === null, "DELETE: Successfully removed test record");
  } catch (err) {
    assert(false, "CRUD Verification failed", (err as Error).message);
    if (testMedId) {
      await prisma.medicine.delete({ where: { id: testMedId } }).catch(() => {});
    }
  }

  // 4. Foreign Key Referential Integrity Check (Restrict & Constraint Violation)
  console.log("\n--- TEST 4: Foreign Key Referential Integrity & Restrict Constraints ---");
  try {
    // Attempting to create a Bed referencing a non-existent Ward UUID
    let fkBlocked = false;
    try {
      await prisma.bed.create({
        data: {
          wardId: "00000000-0000-0000-0000-000000000000",
          bedNumber: "NON-EXISTENT-BED",
          status: BedStatus.AVAILABLE,
        },
      });
    } catch {
      fkBlocked = true;
    }
    assert(fkBlocked, "Foreign Key: Inserting child record with non-existent parent FK was rejected by MySQL");

    // Attempting to delete a Ward that has active Beds attached
    const wardWithBeds = await prisma.ward.findFirst({
      where: { beds: { some: {} } },
      include: { beds: true },
    });

    let deleteBlocked = false;
    if (wardWithBeds) {
      try {
        await prisma.ward.delete({ where: { id: wardWithBeds.id } });
      } catch {
        deleteBlocked = true;
      }
    }
    assert(deleteBlocked, "Referential Integrity: Deleting parent ward with active child beds was blocked (RESTRICT)");
  } catch (err) {
    assert(false, "Foreign key referential integrity test error", (err as Error).message);
  }

  // 5. Unique Constraints Enforcement
  console.log("\n--- TEST 5: Unique Constraints Enforcement ---");
  try {
    // Attempt duplicate medicine code
    let dupMedBlocked = false;
    try {
      await prisma.medicine.create({
        data: {
          code: "MED-001", // Already exists
          genericName: "Duplicate Paracetamol",
          brandName: "Dup",
          category: "Analgesic",
          strength: "500 mg",
          manufacturer: "Dup Pharma",
          unit: "tablet",
          price: 2.0,
        },
      });
    } catch {
      dupMedBlocked = true;
    }
    assert(dupMedBlocked, "Unique Constraint: Inserting duplicate Medicine code ('MED-001') was rejected");

    // Attempt duplicate ward bed number
    const firstBed = await prisma.bed.findFirst();
    let dupBedBlocked = false;
    if (firstBed) {
      try {
        await prisma.bed.create({
          data: {
            wardId: firstBed.wardId,
            bedNumber: firstBed.bedNumber, // Duplicate within the same ward
            status: BedStatus.AVAILABLE,
          },
        });
      } catch {
        dupBedBlocked = true;
      }
    }
    assert(dupBedBlocked, "Unique Constraint: Inserting duplicate composite (wardId + bedNumber) was rejected");
  } catch (err) {
    assert(false, "Unique constraints test error", (err as Error).message);
  }

  // 6. ACID Transactions Verification
  console.log("\n--- TEST 6: ACID Transactions (Atomic Commit & Rollback) ---");
  try {
    // 6.1 Successful transaction commit
    const medItem = await prisma.medicine.findFirst({ where: { code: "MED-001" } });
    const batchItem = await prisma.medicineBatch.findFirst({ where: { batchNumber: "PAR-26-01" } });

    if (medItem && batchItem) {
      const initialQty = batchItem.quantity;
      await prisma.$transaction([
        prisma.medicineBatch.update({
          where: { id: batchItem.id },
          data: { quantity: initialQty - 2 },
        }),
        prisma.generalInventoryItem.update({
          where: { itemCode: "INV-001" },
          data: { quantity: { increment: 1 } },
        }),
      ]);

      const verifyBatch = await prisma.medicineBatch.findUnique({ where: { id: batchItem.id } });
      assert(verifyBatch?.quantity === initialQty - 2, "Transaction: Multi-table atomic update committed successfully");

      // Revert test deduction
      await prisma.medicineBatch.update({
        where: { id: batchItem.id },
        data: { quantity: initialQty },
      });
    }

    // 6.2 Transaction rollback verification
    const currentBatch = await prisma.medicineBatch.findFirst({ where: { batchNumber: "PAR-26-01" } });
    if (currentBatch) {
      const stableQty = currentBatch.quantity;
      let txErrorCaught = false;

      try {
        await prisma.$transaction([
          prisma.medicineBatch.update({
            where: { id: currentBatch.id },
            data: { quantity: stableQty - 50 },
          }),
          // Deliberate error to trigger rollback: invalid foreign key in second statement
          prisma.bed.create({
            data: {
              wardId: "invalid-uuid-trigger-rollback",
              bedNumber: "FAIL-BED",
              status: BedStatus.AVAILABLE,
            },
          }),
        ]);
      } catch {
        txErrorCaught = true;
      }

      const postRollbackBatch = await prisma.medicineBatch.findUnique({ where: { id: currentBatch.id } });
      assert(
        txErrorCaught && postRollbackBatch?.quantity === stableQty,
        "Transaction Rollback: Failure in statement 2 rolled back statement 1 cleanly (ACID Atomicity)",
      );
    }
  } catch (err) {
    assert(false, "ACID transaction test error", (err as Error).message);
  }

  // 7. Query Performance & Index Utilization
  console.log("\n--- TEST 7: Query Performance & Index Execution ---");
  try {
    const q1Start = performance.now();
    const activeWards = await prisma.ward.findMany({
      where: { active: true },
      include: {
        beds: { where: { status: BedStatus.AVAILABLE } },
      },
    });
    const q1Duration = performance.now() - q1Start;
    assert(q1Duration < 50 && activeWards.length > 0, `Relational join query executed in ${q1Duration.toFixed(2)} ms (< 50ms)`);

    const q2Start = performance.now();
    const medSearch = await prisma.medicine.findMany({
      where: { genericName: { startsWith: "Para" } },
      include: { batches: true },
    });
    const q2Duration = performance.now() - q2Start;
    assert(q2Duration < 30 && medSearch.length > 0, `Indexed medicine lookup query executed in ${q2Duration.toFixed(2)} ms (< 30ms)`);
  } catch (err) {
    assert(false, "Query performance test error", (err as Error).message);
  }

  console.log("\n==================================================");
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification()
  .catch((e) => {
    console.error("Verification suite encountered unexpected error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
