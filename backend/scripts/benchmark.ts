import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function runBenchmark() {
  console.log("=== GHMS PERFORMANCE BENCHMARK ===");

  // 1. Database Query Latency (Unoptimized vs Optimized)
  const dbStart = performance.now();
  const user = await prisma.user.findFirst({
    where: { username: "admin" },
    include: { patient: true, doctor: true },
  });
  const dbTime = performance.now() - dbStart;
  console.log(`[DB] Find admin user with full relations: ${dbTime.toFixed(2)} ms`);

  const dbOptStart = performance.now();
  await prisma.user.findFirst({
    where: { username: "admin" },
    select: {
      id: true,
      email: true,
      username: true,
      phone: true,
      passwordHash: true,
      role: true,
      status: true,
      firstName: true,
      middleName: true,
      lastName: true,
      department: true,
      patient: { select: { id: true, department: true, phone: true } },
      doctor: { select: { id: true, department: true } },
    },
  });
  const dbOptTime = performance.now() - dbOptStart;
  console.log(`[DB] Find admin user with selective projection: ${dbOptTime.toFixed(2)} ms`);

  // 2. Bcrypt Compare Latency
  if (user) {
    const bcryptStart = performance.now();
    await bcrypt.compare("StaffPassword123", user.passwordHash);
    const bcryptTime = performance.now() - bcryptStart;
    console.log(`[BCRYPT] Password verification (cost=12): ${bcryptTime.toFixed(2)} ms`);
  }

  // 3. API Login Endpoint Latency
  try {
    const apiStart = performance.now();
    const res = await fetch("http://localhost:4000/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: "admin",
        password: "StaffPassword123",
        remember: true,
      }),
    });
    const apiTime = performance.now() - apiStart;
    console.log(`[API] POST /api/v1/auth/login response time: ${apiTime.toFixed(2)} ms (status: ${res.status})`);

    // Second login call (warm connection pool)
    const apiStart2 = performance.now();
    const res2 = await fetch("http://localhost:4000/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: "admin",
        password: "StaffPassword123",
        remember: true,
      }),
    });
    const apiTime2 = performance.now() - apiStart2;
    console.log(`[API] POST /api/v1/auth/login (warm/pooled) response time: ${apiTime2.toFixed(2)} ms (status: ${res2.status})`);
  } catch (err) {
    console.log(`[API] Login request failed: ${(err as Error).message}`);
  }

  // 4. API Ready Endpoint Latency
  try {
    const readyStart = performance.now();
    const res = await fetch("http://localhost:4000/api/v1/ready");
    const readyTime = performance.now() - readyStart;
    console.log(`[API] GET /api/v1/ready response time: ${readyTime.toFixed(2)} ms (status: ${res.status})`);
  } catch (err) {
    console.log(`[API] Ready request failed: ${(err as Error).message}`);
  }
}

runBenchmark()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
