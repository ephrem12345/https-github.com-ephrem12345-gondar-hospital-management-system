import { Router } from "express";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import type { AppointmentService } from "./service.js";
import { requirePermission, requireRole } from "../../middleware/authenticate.js";
import { validateBody } from "../../middleware/validate.js";
import {
  appointmentInputSchema,
  appointmentStatusSchema,
  cancelAppointmentSchema,
  doctorAvailabilityQuerySchema,
  doctorCreateSchema,
  doctorScheduleSchema,
  queueCheckInSchema,
  queueStatusSchema,
  queueTransferSchema,
} from "./schemas.js";
import { HttpError } from "../../utils/http-error.js";

const uuidParam = z.string().uuid();
const addScheduleSchema = doctorScheduleSchema;
const callNextSchema = z.object({ department: z.string().min(1).max(100) });

function parseUuid(value: string | string[]) {
  const parsed = uuidParam.safeParse(value);
  if (!parsed.success) throw new HttpError(400, "Invalid resource identifier", "VALIDATION_ERROR");
  return parsed.data;
}

export function appointmentRoutes(service: AppointmentService) {
  const router = Router();

  router.get("/doctors", requirePermission("doctors.read"), async (request, response) => {
    response.json({ success: true, data: await service.doctors(typeof request.query.department === "string" ? request.query.department : undefined) });
  });

  router.post("/doctors", requireRole(UserRole.ADMINISTRATOR), validateBody(doctorCreateSchema), async (request, response) => {
    const data = await service.createDoctor(request.body);
    response.status(201).json({ success: true, data });
  });

  router.put("/doctors/:id/schedules", requireRole(UserRole.ADMINISTRATOR), validateBody(addScheduleSchema), async (request, response) => {
    const data = await service.setSchedule(parseUuid(request.params.id), request.body);
    response.status(200).json({ success: true, data });
  });

  router.get("/doctors/availability", requirePermission("doctors.read"), async (request, response) => {
    const parsed = doctorAvailabilityQuerySchema.safeParse(request.query);
    if (!parsed.success) throw new HttpError(400, "A valid date and optional department are required", "VALIDATION_ERROR");
    const data = await service.availability(parsed.data.date, parsed.data.department);
    response.json({ success: true, data });
  });

  router.get("/doctors/:id/slots", requirePermission("doctors.read"), async (request, response) => {
    const parsed = doctorAvailabilityQuerySchema.safeParse({ date: request.query.date });
    if (!parsed.success) throw new HttpError(400, "A valid date is required", "VALIDATION_ERROR");
    const data = (await service.availability(parsed.data.date)).find((doctor) => doctor.doctorId === parseUuid(request.params.id));
    if (!data) throw new HttpError(404, "Doctor not found", "NOT_FOUND");
    response.json({ success: true, data: data.slots });
  });

  router.get("/appointments", requirePermission("appointments.read.all", "appointments.read.department", "appointments.read.own"), async (request, response) => {
    const result = await service.list(request.query, request.actor!);
    response.json({ success: true, data: result });
  });

  router.post("/appointments", requirePermission("appointments.create"), validateBody(appointmentInputSchema), async (request, response) => {
    const data = await service.create(request.body, request.actor!);
    response.status(201).json({ success: true, data });
  });

  router.get("/appointments/:id", requirePermission("appointments.read.all", "appointments.read.department", "appointments.read.own"), async (request, response) => {
    const data = await service.getById(parseUuid(request.params.id), request.actor!);
    response.json({ success: true, data });
  });

  router.patch("/appointments/:id", requirePermission("appointments.update.all", "appointments.update.department", "appointments.update.own"), validateBody(appointmentInputSchema), async (request, response) => {
    const data = await service.update(parseUuid(request.params.id), request.body, request.actor!);
    response.json({ success: true, data });
  });

  router.patch("/appointments/:id/cancel", requirePermission("appointments.update.all", "appointments.update.department", "appointments.update.own"), validateBody(cancelAppointmentSchema), async (request, response) => {
    const data = await service.cancel(parseUuid(request.params.id), request.actor!);
    response.json({ success: true, data });
  });

  router.patch("/appointments/:id/status", requirePermission("appointments.update.all", "appointments.update.department", "appointments.update.own"), validateBody(appointmentStatusSchema), async (request, response) => {
    const data = await service.updateStatus(parseUuid(request.params.id), request.body, request.actor!);
    response.json({ success: true, data });
  });

  router.get("/queue/public", async (request, response) => {
    const date = typeof request.query.date === "string" ? request.query.date : undefined;
    const department = typeof request.query.department === "string" ? request.query.department : undefined;
    const data = await service.publicQueue(date, department);
    response.json({ success: true, data });
  });

  router.get("/queue", requirePermission("queue.read.all", "queue.read.department"), async (request, response) => {
    const result = await service.listQueue(request.query, request.actor!);
    response.json({ success: true, data: result });
  });

  router.post("/queue/check-in", requirePermission("queue.manage.all", "queue.manage.department"), validateBody(queueCheckInSchema), async (request, response) => {
    const data = await service.checkIn(request.body.appointmentId, request.actor!);
    response.status(201).json({ success: true, data });
  });

  router.post("/queue/call-next", requirePermission("queue.manage.all", "queue.manage.department"), validateBody(callNextSchema), async (request, response) => {
    const data = await service.callNext(request.body.department, request.actor!);
    response.json({ success: true, data });
  });

  router.patch("/queue/:id/status", requirePermission("queue.manage.all", "queue.manage.department"), validateBody(queueStatusSchema), async (request, response) => {
    const data = await service.updateQueueStatus(parseUuid(request.params.id), request.body, request.actor!);
    response.json({ success: true, data });
  });

  router.post("/queue/:id/transfer", requirePermission("queue.manage.all", "queue.manage.department"), validateBody(queueTransferSchema), async (request, response) => {
    const data = await service.transferQueue(parseUuid(request.params.id), request.body, request.actor!);
    response.status(201).json({ success: true, data });
  });

  return router;
}
