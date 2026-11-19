import { randomUUID } from "node:crypto";
import type { Express } from "express";
import { describe, expect, it, beforeAll, afterAll } from "vitest";

const integration = process.env.GHMS_RUN_INTEGRATION_TESTS === "1" ? describe : describe.skip;

integration("GHMS API and MySQL integration", () => {
  let app: Express;
  let database: import("@prisma/client").PrismaClient;
  let http: import("supertest").SuperTestStatic;
  let bcrypt: typeof import("bcryptjs");
  let jwt: typeof import("jsonwebtoken");
  let hospitalId: string;

  beforeAll(async () => {
    process.env.DATABASE_URL ??= "mysql://root@127.0.0.1:3306/ghms_integration_test";
    process.env.JWT_ACCESS_SECRET ??= "integration-test-secret-with-at-least-32-characters";
    process.env.JWT_ISSUER ??= "ghms-api";
    process.env.WEB_ORIGINS ??= "http://localhost:3000";
    process.env.PAYMENT_GATEWAY ??= "simulation";
    process.env.FRONTEND_URL ??= "http://localhost:3000";
    process.env.PATIENT_REGISTRATION_REQUIRES_VERIFICATION = "true";
    const [{ PrismaClient }, { createApp }, supertest, bcryptModule, jwtModule] = await Promise.all([
      import("@prisma/client"),
      import("./app.js"),
      import("supertest"),
      import("bcryptjs"),
      import("jsonwebtoken"),
    ]);
    database = new PrismaClient();
    await database.$connect();
    const hospital = await database.hospital.findFirst({
      where: { status: { in: ["TRIAL", "ACTIVE"] } },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (!hospital) throw new Error("Integration tests require an active or trial hospital seed");
    hospitalId = hospital.id;
    app = createApp(database);
    http = (supertest as unknown as { default: typeof http }).default;
    bcrypt = bcryptModule;
    jwt = jwtModule.default;
  });

  afterAll(async () => {
    if (database) await database.$disconnect();
  });

  function patientRegistration(email: string, phone: string) {
    return {
      firstName: "Integration",
      middleName: "",
      lastName: "Patient",
      gender: "female",
      dateOfBirth: "1998-06-15",
      phone,
      email,
      address: "Gondar integration test address",
      password: "TestPassword123",
      termsAccepted: true,
    };
  }

  async function createStaff(role: "ADMINISTRATOR" | "RECEPTIONIST" | "DOCTOR", department?: string) {
    return database.user.create({
      data: {
        email: `${role.toLowerCase()}-${randomUUID()}@example.test`,
        passwordHash: await bcrypt.hash("StaffPassword123", 4),
        role,
        status: "ACTIVE",
        hospitalId,
        firstName: "Integration",
        lastName: role,
        department,
      },
    });
  }

  async function loginCookie(email: string, password: string) {
    const response = await http(app).post("/api/v1/auth/login").send({ identifier: email, password });
    expect(response.status).toBe(200);
    const raw = response.headers["set-cookie"] as unknown;
    const cookies = (Array.isArray(raw) ? raw : [raw]) as string[];
    return cookies.map((value) => value.split(";")[0]).join("; ");
  }

  it("registers patient accounts as pending, persists them, and prevents duplicate registration and inactive login", async () => {
    const email = `patient-${randomUUID()}@example.test`;
    const phone = `+2519${randomUUID().replace(/\D/g, "").slice(0, 8)}`;
    const payload = patientRegistration(email, phone);

    const created = await http(app).post("/api/v1/auth/register").send(payload);
    expect(created.status).toBe(201);
    expect(created.body.data.role).toBe("Patient");

    const saved = await database.user.findUnique({
      where: { id: created.body.data.id },
      include: { patient: true },
    });
    expect(saved?.status).toBe("PENDING");
    expect(saved?.role).toBe("PATIENT");
    expect(saved?.patient?.patientNumber).toMatch(/^GHMS-/);
    expect(saved?.passwordHash).not.toBe(payload.password);

    const duplicate = await http(app).post("/api/v1/auth/register").send(payload);
    expect(duplicate.status).toBe(409);
    const inactiveLogin = await http(app).post("/api/v1/auth/login").send({
      identifier: email,
      password: payload.password,
    });
    expect(inactiveLogin.status).toBe(403);
    expect(inactiveLogin.body.error.code).toBe("ACCOUNT_NOT_ACTIVE");
  }, 30000);

  it("authenticates, books, lists, checks in, calls a queue entry, and revokes the session", async () => {
    const staff = await createStaff("ADMINISTRATOR");
    const patientEmail = `patient-${randomUUID()}@example.test`;
    const registration = await http(app).post("/api/v1/auth/register").send(
      patientRegistration(patientEmail, `+2519${randomUUID().replace(/\D/g, "").slice(0, 8)}`),
    );
    expect(registration.status).toBe(201);
    await database.user.update({ where: { id: registration.body.data.id }, data: { status: "ACTIVE" } });
    const patient = await database.patient.findUniqueOrThrow({ where: { userId: registration.body.data.id } });

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const appointmentDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Addis_Ababa", year: "numeric", month: "2-digit", day: "2-digit" }).format(tomorrow);
    const slotTime = "09:00";
    const endTime = "09:30";
    const doctor = await database.doctor.create({
      data: { name: `Dr. Integration ${randomUUID().slice(0, 6)}`, specialty: "General Medicine", department: "Internal Medicine" },
    });
    await database.doctorSchedule.create({
      data: {
        doctorId: doctor.id,
        department: doctor.department,
        dayOfWeek: new Date(`${appointmentDate}T00:00:00Z`).getUTCDay(),
        startTime: slotTime,
        endTime,
        slotDurationMins: 30,
      },
    });

    const cookie = await loginCookie(staff.email, "StaffPassword123");
    const me = await http(app).get("/api/v1/auth/me").set("Cookie", cookie);
    expect(me.status).toBe(200);
    expect(me.body.data.role).toBe("Administrator");

    const booking = await http(app).post("/api/v1/appointments").set("Cookie", cookie).send({
      patientId: patient.patientNumber,
      doctor: doctor.id,
      department: doctor.department,
      date: appointmentDate,
      time: slotTime,
      type: "consultation",
      reason: "Integration appointment",
    });
    expect(booking.status).toBe(201);
    const appointmentId = booking.body.data.id as string;
    expect(await database.appointment.count({ where: { id: appointmentId } })).toBe(1);

    const checkInDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Addis_Ababa", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    await database.appointment.update({ where: { id: appointmentId }, data: { scheduledAt: new Date() } });

    const listed = await http(app).get(`/api/v1/appointments?from=${checkInDate}&to=${checkInDate}`).set("Cookie", cookie);
    expect(listed.status).toBe(200);
    expect(listed.body.data.data).toEqual(expect.arrayContaining([expect.objectContaining({ id: appointmentId })]));
    expect(listed.body.data.total).toBeGreaterThanOrEqual(1);

    const checkIn = await http(app).post("/api/v1/queue/check-in").set("Cookie", cookie).send({ appointmentId });
    expect(checkIn.status).toBe(201);
    const queueId = checkIn.body.data.id as string;
    const called = await http(app).post("/api/v1/queue/call-next").set("Cookie", cookie).send({ department: doctor.department });
    expect(called.status).toBe(200);
    expect(called.body.data.id).toBe(queueId);
    expect(called.body.data.status).toBe("consulting");
    expect(await database.queueEntry.findUniqueOrThrow({ where: { id: queueId } })).toMatchObject({ status: "CONSULTING" });

    const unauthenticated = await http(app).get("/api/v1/appointments");
    expect(unauthenticated.status).toBe(401);
    const refreshCookie = cookie.split("; ").find((value) => value.startsWith("ghms_refresh="))!;
    const logout = await http(app).post("/api/v1/auth/logout").set("Cookie", cookie);
    expect(logout.status).toBe(200);
    const refreshAfterLogout = await http(app).post("/api/v1/auth/refresh").set("Cookie", refreshCookie);
    expect(refreshAfterLogout.status).toBe(401);
  }, 30000);

  it("registers emergency cases, stores triage history, and denies doctors outside emergency", async () => {
    const admin = await createStaff("ADMINISTRATOR");
    const patient = await database.patient.create({
      data: {
        patientNumber: `GHMS-${randomUUID().slice(0, 8).toUpperCase()}`,
        firstName: "Emergency",
        lastName: "Integration",
        sex: "female",
        hospitalId,
        dateOfBirth: new Date("1998-06-15T00:00:00.000Z"),
        phone: `+2519${randomUUID().replace(/\D/g, "").slice(0, 8)}`,
        department: "Emergency",
      },
    });
    const cookie = await loginCookie(admin.email, "StaffPassword123");
    const registration = await http(app).post("/api/v1/emergency/cases").set("Cookie", cookie).send({
      patientIdentifier: patient.patientNumber,
      arrivalMode: "Walk-in",
      presentingComplaint: "Integration test complaint",
    });
    expect(registration.status).toBe(201);

    const caseNumber = registration.body.data.caseNumber as string;
    const triage = await http(app).post(`/api/v1/emergency/cases/${caseNumber}/triage`).set("Cookie", cookie).send({
      category: "Yellow",
      priority: "Routine",
      assignedStaff: "Integration Nurse",
      assessmentNotes: "Caller-provided test assessment",
      vitalSigns: { temperature: 36.8 },
      protocolName: "Test protocol",
      protocolVersion: "1",
    });
    expect(triage.status).toBe(201);
    expect(triage.body.data.currentStatus).toBe("WAITING");
    expect(await database.emergencyTriage.count({ where: { emergencyCase: { caseNumber } } })).toBe(1);

    const history = await http(app).get(`/api/v1/emergency/cases/${caseNumber}/history`).set("Cookie", cookie);
    expect(history.status).toBe(200);
    expect(history.body.data.workflowHistory.length).toBeGreaterThanOrEqual(2);

    const outsideDoctor = await createStaff("DOCTOR", "Cardiology");
    const token = jwt.sign({ role: "DOCTOR", department: "Cardiology", hospitalId }, process.env.JWT_ACCESS_SECRET!, {
      subject: outsideDoctor.id,
      issuer: process.env.JWT_ISSUER,
      audience: "ghms-web",
    });
    const denied = await http(app).get("/api/v1/emergency/cases").set("Authorization", `Bearer ${token}`);
    expect(denied.status).toBe(403);
    expect(denied.body.error.code).toBe("FORBIDDEN");
  }, 30000);

  it("serves the patient portal with ownership enforcement, notifications, and appointment changes", async () => {
    const email = `portal-${randomUUID()}@example.test`;
    const phone = `+2519${randomUUID().replace(/\D/g, "").slice(0, 8)}`;
    const registered = await http(app).post("/api/v1/auth/register").send(patientRegistration(email, phone));
    expect(registered.status).toBe(201);
    const record = await database.user.findUnique({ where: { email }, select: { patient: true } });
    await database.user.update({ where: { email }, data: { status: "ACTIVE" } });
    await database.patient.update({ where: { id: record!.patient!.id }, data: { department: "Internal Medicine" } });

    const cookie = await loginCookie(email, "TestPassword123");
    const actorId = (await database.user.findUnique({ where: { email } }))!.id;
    await database.doctor.create({
      data: { userId: null, name: "Portal Test Doctor", specialty: "General", department: "Internal Medicine", active: true, schedules: { create: { department: "Internal Medicine", dayOfWeek: new Date("2026-12-01T00:00:00Z").getUTCDay(), startTime: "08:00", endTime: "17:00", slotDurationMins: 30 } } },
    });

    const dashboard = await http(app).get("/api/v1/portal/dashboard").set("Cookie", cookie);
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.data.profile.patientNumber).toMatch(/^GHMS-/);
    expect(dashboard.body.data.unreadNotifications).toBe(0);

    const requested = await http(app).post("/api/v1/portal/appointments").set("Cookie", cookie).send({
      department: "Internal Medicine",
      doctor: "Portal Test Doctor",
      date: "2026-12-01",
      time: "09:30",
      reason: "Portal integration test visit",
    });
    expect(requested.status).toBe(201);

    const afterRequest = await http(app).get("/api/v1/portal/notifications").set("Cookie", cookie);
    expect(afterRequest.body.data.unreadCount).toBe(1);
    const firstNotification = afterRequest.body.data.notifications[0];
    const marked = await http(app).post(`/api/v1/portal/notifications/${firstNotification.id}/read`).set("Cookie", cookie);
    expect(marked.status).toBe(200);

    const appointments = await http(app).get("/api/v1/portal/appointments").set("Cookie", cookie);
    expect(appointments.status).toBe(200);
    const appointment = appointments.body.data.data[0];
    expect(appointment.doctor).toBe("Portal Test Doctor");

    const rescheduled = await http(app).patch(`/api/v1/portal/appointments/${appointment.id}/change`).set("Cookie", cookie).send({ action: "reschedule", date: "2026-12-01", time: "10:30" });
    expect(rescheduled.status).toBe(200);
    expect(rescheduled.body.data.time).toBe("10:30");
    const cancelled = await http(app).patch(`/api/v1/portal/appointments/${appointment.id}/change`).set("Cookie", cookie).send({ action: "cancel" });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.status).toBe("cancelled");

    const support = await http(app).post("/api/v1/portal/support-requests").set("Cookie", cookie).send({ category: "Feedback", subject: "Portal feedback", message: "Integration test feedback" });
    expect(support.status).toBe(201);
    const requests = await http(app).get("/api/v1/portal/support-requests").set("Cookie", cookie);
    expect(requests.body.data.length).toBe(1);

    // Ownership: a second patient cannot touch the first patient's notifications or appointments.
    const otherEmail = `portal-${randomUUID()}@example.test`;
    await http(app).post("/api/v1/auth/register").send(patientRegistration(otherEmail, `+2519${randomUUID().replace(/\D/g, "").slice(0, 8)}`));
    await database.user.update({ where: { email: otherEmail }, data: { status: "ACTIVE" } });
    const otherCookie = await loginCookie(otherEmail, "TestPassword123");
    const foreignRead = await http(app).post(`/api/v1/portal/notifications/${firstNotification.id}/read`).set("Cookie", otherCookie);
    expect([403, 404]).toContain(foreignRead.status);
    const foreignChange = await http(app).patch(`/api/v1/portal/appointments/${appointment.id}/change`).set("Cookie", otherCookie).send({ action: "cancel" });
    expect([403, 409]).toContain(foreignChange.status);

    // Staff accounts are locked out of the portal.
    const admin = await createStaff("ADMINISTRATOR");
    const staffCookie = await loginCookie(admin.email, "StaffPassword123");
    const staffPortal = await http(app).get("/api/v1/portal/profile").set("Cookie", staffCookie);
    expect(staffPortal.status).toBe(403);
  }, 30000);
});
