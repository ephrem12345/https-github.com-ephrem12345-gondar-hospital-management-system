import dotenv from "dotenv";
dotenv.config({ path: "backend/.env" });
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function inspect() {
  console.log("=== INSPECTING MYSQL GHMS DATABASE ===");
  const tables: Array<{ [key: string]: string }> = await prisma.$queryRawUnsafe("SHOW TABLES");
  console.log(`Total tables found: ${tables.length}`);
  const tableNames = tables.map((t) => Object.values(t)[0]);
  console.log("Tables:", JSON.stringify(tableNames, null, 2));

  // Check row counts for primary tables
  for (const name of ["User", "Patient", "Doctor", "Appointment", "EmergencyCase"]) {
    if (tableNames.includes(name)) {
      const count: Array<{ count: bigint }> = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM \`${name}\``);
      console.log(`Table ${name} row count:`, Number(count[0]?.count ?? 0));
    }
  }
}

inspect()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
