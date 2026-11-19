import {
  AppointmentStatus,
  AppointmentType,
  Prisma,
  QueueStatus,
  type PrismaClient,
} from "@prisma/client";
import { HttpError } from "../../utils/http-error.js";
import type { z } from "zod";
import {
  appointmentInputSchema,
  appointmentListQuerySchema,
  appointmentStatusSchema,
  queueListQuerySchema,
  queueStatusSchema,
  queueTransferSchema,
} from "./schemas.js";
import { addLocalDays, dayOfWeek, localDateTime, toQueueDate } from "../../utils/date.js";
export { addLocalDays, dayOfWeek, localDateTime, toQueueDate };

type AppointmentInput = z.infer<typeof appointmentInputSchema>;
type AppointmentQuery = z.infer<typeof appointmentListQuerySchema>;
type QueueQuery = z.infer<typeof queueListQuerySchema>;
type Actor = NonNullable<Express.Request["actor"]>;

export function isAvailableAt(
  schedule: { startTime: string; endTime: string; breakStart: string | null; breakEnd: string | null; slotDurationMins: number },
  time: string,
): boolean {
  if (time < schedule.startTime || time >= schedule.endTime) return false;
  if (schedule.breakStart && schedule.breakEnd && time >= schedule.breakStart && time < schedule.breakEnd) return false;
  const [startHour, startMinute] = schedule.startTime.split(":").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const offset = (hour * 60 + minute) - (startHour * 60 + startMinute);
  return offset >= 0 && offset % schedule.slotDurationMins === 0;
}

const appointmentTransitions: Record<AppointmentStatus, readonly AppointmentStatus[]> = {
  SCHEDULED: ["CONFIRMED", "CHECKED_IN", "CANCELLED", "NO_SHOW"],
  CONFIRMED: ["CHECKED_IN", "CANCELLED", "NO_SHOW"],
  CHECKED_IN: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export function canTransitionAppointment(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return appointmentTransitions[from].includes(to);
}

const queueTransitions: Record<QueueStatus, readonly QueueStatus[]> = {
  WAITING: ["CONSULTING", "ABSENT", "TRANSFERRED"],
  CONSULTING: ["COMPLETED", "TRANSFERRED"],
  COMPLETED: [],
  ABSENT: [],
  TRANSFERRED: [],
};

export function canTransitionQueue(from: QueueStatus, to: QueueStatus): boolean {
  return queueTransitions[from].includes(to);
}

function toPrismaType(type: AppointmentInput["type"]): AppointmentType {
  return type.replace("-", "_").toUpperCase() as AppointmentType;
}

function toPrismaStatus(status: z.infer<typeof appointmentStatusSchema>["status"]): AppointmentStatus {
  return status.replace(" ", "_").toUpperCase() as AppointmentStatus;
}

function fromAppointment(appointment: any) {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Addis_Ababa", year: "numeric", month: "2-digit", day: "2-digit" }).format(appointment.scheduledAt);
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Addis_Ababa", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(appointment.scheduledAt);
  return {
    id: appointment.id,
    patientId: appointment.patient.patientNumber,
    patient: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
    doctorId: appointment.doctorId,
    doctor: appointment.doctor.name,
    department: appointment.department,
    date,
    time,
    type: appointment.type.toLowerCase().replace("_", "-"),
    reason: appointment.reason,
    notes: appointment.notes ?? "",
    status: appointment.status.toLowerCase().replace("_", " "),
    createdAt: appointment.createdAt,
    updatedAt: appointment.updatedAt,
  };
}

function parseAppointmentInput(input: unknown): AppointmentInput {
  const parsed = appointmentInputSchema.safeParse(input);
  if (!parsed.success) throw new HttpError(400, parsed.error.issues.map((issue) => issue.message).join("; "), "VALIDATION_ERROR");
  return parsed.data;
}

export class AppointmentService {
  constructor(private readonly db: PrismaClient) {}

  async list(input: unknown, actor: Actor) {
    const parsed = appointmentListQuerySchema.safeParse(input);
    if (!parsed.success) throw new HttpError(400, "Invalid appointment filters", "VALIDATION_ERROR");
    const query: AppointmentQuery = parsed.data;
    let from = query.from ?? query.date;
    let to = query.to;
    if (query.date && query.view) {
      from = query.date;
      to = query.view === "daily" ? query.date : query.view === "weekly" ? addLocalDays(query.date, 6) : `${query.date.slice(0, 7)}-${new Date(Date.UTC(Number(query.date.slice(0, 4)), Number(query.date.slice(5, 7)), 0)).getUTCDate()}`;
    }
    if (from && to && from > to) throw new HttpError(400, "The start date must not follow the end date", "VALIDATION_ERROR");
    const where: Prisma.AppointmentWhereInput = {};
    if (from || to) {
      where.scheduledAt = {
        ...(from ? { gte: localDateTime(from, "00:00") } : {}),
        ...(to ? { lt: localDateTime(addLocalDays(to, 1), "00:00") } : {}),
      };
    }
    if (query.department) where.department = query.department;
    if (query.doctorId) where.doctorId = query.doctorId;
    if (query.status) where.status = toPrismaStatus(query.status);
    if (query.search) {
      where.OR = [
        { patient: { patientNumber: { contains: query.search } } },
        { patient: { firstName: { contains: query.search } } },
        { patient: { lastName: { contains: query.search } } },
        { doctor: { name: { contains: query.search } } },
      ];
    }
    if (actor.role === "PATIENT") {
      const patient = await this.db.patient.findUnique({ where: { userId: actor.userId }, select: { id: true } });
      if (!patient) return { data: [], total: 0, page: query.page, pageSize: query.pageSize };
      where.patientId = patient.id;
    } else if (actor.role === "DOCTOR" || actor.role === "DEPARTMENT_HEAD") {
      where.doctor = { userId: actor.userId };
    } else if (actor.role !== "ADMINISTRATOR" && actor.role !== "RECEPTIONIST") {
      if (!actor.department) throw new HttpError(403, "Your account has no assigned department", "FORBIDDEN");
      where.department = actor.department;
    }

    const [rows, total] = await this.db.$transaction([
      this.db.appointment.findMany({
        where,
        include: { patient: true, doctor: true },
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.db.appointment.count({ where }),
    ]);
    return { data: rows.map(fromAppointment), total, page: query.page, pageSize: query.pageSize };
  }

  async getById(id: string, actor: Actor) {
    const row = await this.db.appointment.findUnique({ where: { id }, include: { patient: true, doctor: true } });
    if (!row) throw new HttpError(404, "Appointment not found", "NOT_FOUND");
    await this.assertAppointmentAccess(row, actor);
    return fromAppointment(row);
  }

  async create(input: unknown, actor: Actor) {
    const data = parseAppointmentInput(input);
    this.assertDepartment(data.department, actor);
    if (actor.role === "PATIENT") {
      const patient = await this.db.patient.findUnique({ where: { userId: actor.userId }, select: { patientNumber: true } });
      if (!patient || patient.patientNumber !== data.patientId) throw new HttpError(403, "Patients can only book for their own account", "FORBIDDEN");
    }
    const patient = await this.db.patient.findUnique({ where: { patientNumber: data.patientId } });
    if (!patient) throw new HttpError(404, "Patient not found", "PATIENT_NOT_FOUND");
    const doctor = await this.db.doctor.findFirst({
      where: { active: true, department: data.department, OR: [{ id: data.doctor }, { name: data.doctor }] },
    });
    if (!doctor) throw new HttpError(400, "Select an active doctor in the selected department", "DOCTOR_UNAVAILABLE");
    const scheduledAt = localDateTime(data.date, data.time);
    if (scheduledAt.getTime() <= Date.now()) throw new HttpError(400, "Appointments must be scheduled in the future", "INVALID_APPOINTMENT_TIME");
    const daySchedule = await this.db.doctorSchedule.findFirst({ where: { doctorId: doctor.id, department: data.department, dayOfWeek: dayOfWeek(data.date) } });
    if (!daySchedule || !isAvailableAt(daySchedule, data.time)) throw new HttpError(409, "The selected time is outside the doctor's available slots", "SLOT_UNAVAILABLE");
    const dayStart = localDateTime(data.date, "00:00");
    const dayEnd = localDateTime(addLocalDays(data.date, 1), "00:00");
    const leave = await this.db.doctorLeave.findFirst({ where: { doctorId: doctor.id, startsAt: { lt: dayEnd }, endsAt: { gt: dayStart } }, select: { id: true } });
    if (leave) throw new HttpError(409, "The doctor is unavailable on the selected date", "DOCTOR_ON_LEAVE");

    try {
      const appointment = await this.db.$transaction(async (transaction) => {
        const created = await transaction.appointment.create({
          data: {
            patientId: patient.id,
            doctorId: doctor.id,
            department: data.department,
            scheduledAt,
            type: toPrismaType(data.type),
            reason: data.reason,
            notes: data.notes,
            createdById: actor.userId,
          },
        });
        await transaction.appointmentSlotLock.create({ data: { appointmentId: created.id, doctorId: doctor.id, scheduledAt } });
        return transaction.appointment.findUniqueOrThrow({ where: { id: created.id }, include: { patient: true, doctor: true } });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      await this.audit(actor.userId, "appointment.create", "Appointment", appointment.id);
      return fromAppointment(appointment);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new HttpError(409, "The doctor already has an appointment at that time", "APPOINTMENT_CONFLICT");
      }
      throw error;
    }
  }

  async update(id: string, input: unknown, actor: Actor) {
    const data = parseAppointmentInput(input);
    const current = await this.db.appointment.findUnique({ where: { id }, include: { patient: true, doctor: true } });
    if (!current) throw new HttpError(404, "Appointment not found", "NOT_FOUND");
    await this.assertAppointmentAccess(current, actor);
    this.assertDepartment(data.department, actor);
    if (actor.role === "PATIENT" && !["SCHEDULED", "CONFIRMED"].includes(current.status)) {
      throw new HttpError(409, "This appointment can no longer be changed", "INVALID_STATUS_TRANSITION");
    }
    const patient = await this.db.patient.findUnique({ where: { patientNumber: data.patientId } });
    if (!patient) throw new HttpError(404, "Patient not found", "PATIENT_NOT_FOUND");
    if (actor.role === "PATIENT") {
      const owner = await this.db.patient.findUnique({ where: { userId: actor.userId }, select: { id: true } });
      if (!owner || owner.id !== patient.id) throw new HttpError(403, "Patients can only manage their own appointments", "FORBIDDEN");
    }
    if (!["SCHEDULED", "CONFIRMED"].includes(current.status)) {
      throw new HttpError(409, "Only scheduled or confirmed appointments can be rescheduled", "INVALID_STATUS_TRANSITION");
    }
    const doctor = await this.db.doctor.findFirst({ where: { active: true, department: data.department, OR: [{ id: data.doctor }, { name: data.doctor }] } });
    if (!doctor) throw new HttpError(400, "Select an active doctor in the selected department", "DOCTOR_UNAVAILABLE");
    const scheduledAt = localDateTime(data.date, data.time);
    const schedule = await this.db.doctorSchedule.findFirst({ where: { doctorId: doctor.id, department: data.department, dayOfWeek: dayOfWeek(data.date) } });
    if (!schedule || !isAvailableAt(schedule, data.time)) throw new HttpError(409, "The selected time is outside the doctor's available slots", "SLOT_UNAVAILABLE");

    try {
      const updated = await this.db.$transaction(async (transaction) => {
        await transaction.appointmentSlotLock.deleteMany({ where: { appointmentId: id } });
        await transaction.appointmentSlotLock.create({ data: { appointmentId: id, doctorId: doctor.id, scheduledAt } });
        const saved = await transaction.appointment.update({
          where: { id },
          data: { patientId: patient.id, doctorId: doctor.id, department: data.department, scheduledAt, type: toPrismaType(data.type), reason: data.reason, notes: data.notes },
          include: { patient: true, doctor: true },
        });
        return saved;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      await this.audit(actor.userId, "appointment.reschedule", "Appointment", id);
      return fromAppointment(updated);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new HttpError(409, "The doctor already has an appointment at that time", "APPOINTMENT_CONFLICT");
      }
      throw error;
    }
  }

  async updateStatus(id: string, input: unknown, actor: Actor) {
    const parsed = appointmentStatusSchema.safeParse(input);
    if (!parsed.success) throw new HttpError(400, "Invalid appointment status", "VALIDATION_ERROR");
    const current = await this.db.appointment.findUnique({ where: { id }, include: { patient: true, doctor: true } });
    if (!current) throw new HttpError(404, "Appointment not found", "NOT_FOUND");
    await this.assertAppointmentAccess(current, actor);
    const target = toPrismaStatus(parsed.data.status);
    if (!canTransitionAppointment(current.status, target)) throw new HttpError(409, "This appointment status transition is not allowed", "INVALID_STATUS_TRANSITION");
    if (actor.role === "PATIENT" && target !== AppointmentStatus.CANCELLED) throw new HttpError(403, "Patients can only request appointment cancellation", "FORBIDDEN");
    const updated = await this.db.$transaction(async (transaction) => {
      if (target === AppointmentStatus.CANCELLED || target === AppointmentStatus.NO_SHOW || target === AppointmentStatus.COMPLETED) {
        await transaction.appointmentSlotLock.deleteMany({ where: { appointmentId: id } });
      }
      return transaction.appointment.update({ where: { id }, data: { status: target }, include: { patient: true, doctor: true } });
    });
    await this.audit(actor.userId, `appointment.status.${target.toLowerCase()}`, "Appointment", id);
    return fromAppointment(updated);
  }

  async cancel(id: string, actor: Actor) {
    return this.updateStatus(id, { status: "Cancelled" }, actor);
  }

  async doctors(department?: string) {
    const doctors = await this.db.doctor.findMany({
      where: { active: true, ...(department ? { department } : {}) },
      include: { schedules: true },
      orderBy: [{ department: "asc" }, { name: "asc" }],
    });
    return doctors.map((doctor) => ({
      id: doctor.id,
      name: doctor.name,
      specialty: doctor.specialty,
      department: doctor.department,
      schedules: doctor.schedules.map((schedule) => ({
        dayOfWeek: schedule.dayOfWeek,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        breakStart: schedule.breakStart,
        breakEnd: schedule.breakEnd,
        slotDurationMins: schedule.slotDurationMins,
      })),
    }));
  }

  async availability(date: string, department?: string) {
    const doctors = await this.db.doctor.findMany({
      where: { active: true, ...(department ? { department } : {}) },
      include: { schedules: { where: { dayOfWeek: dayOfWeek(date) } }, leavePeriods: { where: { startsAt: { lt: localDateTime(addLocalDays(date, 1), "00:00") }, endsAt: { gt: localDateTime(date, "00:00") } } } },
      orderBy: [{ department: "asc" }, { name: "asc" }],
    });
    const output = [];
    for (const doctor of doctors) {
      const schedule = doctor.schedules[0];
      if (!schedule || doctor.leavePeriods.length) {
        output.push({ doctorId: doctor.id, name: doctor.name, department: doctor.department, availableDays: [], workingHours: null, bookedSlots: 0, availableSlots: 0, slots: [] });
        continue;
      }
      const [startHour, startMinute] = schedule.startTime.split(":").map(Number);
      const [endHour, endMinute] = schedule.endTime.split(":").map(Number);
      const slots: string[] = [];
      for (let minutes = startHour * 60 + startMinute; minutes < endHour * 60 + endMinute; minutes += schedule.slotDurationMins) {
        const time = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
        if (isAvailableAt(schedule, time)) slots.push(time);
      }
      const booked = await this.db.appointmentSlotLock.findMany({
        where: { doctorId: doctor.id, scheduledAt: { gte: localDateTime(date, "00:00"), lt: localDateTime(addLocalDays(date, 1), "00:00") } },
        select: { scheduledAt: true },
      });
      const bookedTimes = new Set(booked.map((item) => new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Addis_Ababa", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(item.scheduledAt)));
      const availableSlots = slots.filter((slot) => !bookedTimes.has(slot));
      output.push({
        doctorId: doctor.id,
        name: doctor.name,
        department: doctor.department,
        availableDays: [dayOfWeek(date)],
        workingHours: { start: schedule.startTime, end: schedule.endTime, breakStart: schedule.breakStart, breakEnd: schedule.breakEnd },
        bookedSlots: booked.length,
        availableSlots: availableSlots.length,
        slots: availableSlots,
      });
    }
    return output;
  }

  async createDoctor(input: { name: string; specialty: string; department: string; userId?: string }) {
    return this.db.doctor.create({ data: input });
  }

  async setSchedule(doctorId: string, input: { department: string; dayOfWeek: number; startTime: string; endTime: string; breakStart?: string; breakEnd?: string; slotDurationMins: number }) {
    const doctor = await this.db.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor) throw new HttpError(404, "Doctor not found", "NOT_FOUND");
    return this.db.doctorSchedule.upsert({
      where: { doctorId_dayOfWeek_department: { doctorId, dayOfWeek: input.dayOfWeek, department: input.department } },
      create: { doctorId, ...input },
      update: input,
    });
  }

  async listQueue(input: unknown, actor: Actor) {
    const parsed = queueListQuerySchema.safeParse(input);
    if (!parsed.success) throw new HttpError(400, "Invalid queue filters", "VALIDATION_ERROR");
    const query: QueueQuery = parsed.data;
    const targetDate = query.date ?? new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Addis_Ababa", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const queueDate = toQueueDate(targetDate);
    const where: Prisma.QueueEntryWhereInput = {
      queueDate,
      ...(query.department ? { department: query.department } : {}),
      ...(query.status ? { status: query.status.toUpperCase() as QueueStatus } : {}),
    };
    if (actor.role === "DOCTOR") where.doctor = { userId: actor.userId };
    else if (actor.role !== "ADMINISTRATOR" && actor.role !== "RECEPTIONIST") {
      if (!actor.department) throw new HttpError(403, "Your account has no assigned department", "FORBIDDEN");
      where.department = actor.department;
    }
    const [rows, total] = await this.db.$transaction([
      this.db.queueEntry.findMany({ where, include: { patient: true, appointment: true }, orderBy: { queueNumber: "asc" }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      this.db.queueEntry.count({ where }),
    ]);
    return { data: rows.map((row) => this.fromQueue(row)), total, page: query.page, pageSize: query.pageSize };
  }

  async checkIn(appointmentId: string, actor: Actor) {
    const appointment = await this.db.appointment.findUnique({ where: { id: appointmentId }, include: { patient: true, doctor: true } });
    if (!appointment) throw new HttpError(404, "Appointment not found", "NOT_FOUND");
    await this.assertAppointmentAccess(appointment, actor);
    if (!["SCHEDULED", "CONFIRMED"].includes(appointment.status)) throw new HttpError(409, "Only scheduled or confirmed appointments can be checked in", "INVALID_STATUS_TRANSITION");
    const hospitalToday = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Addis_Ababa", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const appointmentDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Addis_Ababa", year: "numeric", month: "2-digit", day: "2-digit" }).format(appointment.scheduledAt);
    if (appointmentDate !== hospitalToday) throw new HttpError(409, "Only today's appointments can be checked in", "APPOINTMENT_NOT_DUE");
    const queueDate = toQueueDate(hospitalToday);
    const result = await this.db.$transaction(async (transaction) => {
      const counter = await transaction.queueCounter.upsert({
        where: { department_queueDate: { department: appointment.department, queueDate } },
        create: { department: appointment.department, queueDate, lastNumber: 1 },
        update: { lastNumber: { increment: 1 } },
      });
      const queue = await transaction.queueEntry.create({
        data: { queueNumber: counter.lastNumber, queueDate, patientId: appointment.patientId, appointmentId: appointment.id, department: appointment.department, doctorId: appointment.doctorId },
        include: { patient: true, appointment: true },
      });
      await transaction.appointment.update({ where: { id: appointment.id }, data: { status: "CHECKED_IN" } });
      return queue;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    await this.audit(actor.userId, "queue.check_in", "QueueEntry", result.id);
    return this.fromQueue(result);
  }

  async callNext(department: string, actor: Actor) {
    const hospitalToday = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Addis_Ababa", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const queueDate = toQueueDate(hospitalToday);
    const candidate = await this.db.queueEntry.findFirst({ where: { department, queueDate, status: "WAITING" }, orderBy: { queueNumber: "asc" } });
    if (!candidate) return null;
    const changed = await this.db.queueEntry.updateMany({ where: { id: candidate.id, status: "WAITING" }, data: { status: "CONSULTING" } });
    if (changed.count !== 1) throw new HttpError(409, "Another staff member already called the next patient", "QUEUE_CHANGED");
    const row = await this.db.queueEntry.findUniqueOrThrow({ where: { id: candidate.id }, include: { patient: true, appointment: true } });
    await this.audit(actor.userId, "queue.call_next", "QueueEntry", row.id);
    return this.fromQueue(row);
  }

  async updateQueueStatus(id: string, input: unknown, actor: Actor) {
    const parsed = queueStatusSchema.safeParse(input);
    if (!parsed.success) throw new HttpError(400, "Invalid queue status", "VALIDATION_ERROR");
    const current = await this.db.queueEntry.findUnique({ where: { id } });
    if (!current) throw new HttpError(404, "Queue entry not found", "NOT_FOUND");
    const target = parsed.data.status.toUpperCase() as QueueStatus;
    if (!canTransitionQueue(current.status, target)) throw new HttpError(409, "This queue status transition is not allowed", "INVALID_STATUS_TRANSITION");
    const updated = await this.db.queueEntry.update({
      where: { id },
      data: { status: target, ...(target === "COMPLETED" ? { completedAt: new Date() } : {}) },
      include: { patient: true, appointment: true },
    });
    await this.audit(actor.userId, `queue.status.${target.toLowerCase()}`, "QueueEntry", id);
    return this.fromQueue(updated);
  }

  async transferQueue(id: string, input: unknown, actor: Actor) {
    const parsed = queueTransferSchema.safeParse(input);
    if (!parsed.success) throw new HttpError(400, "Invalid transfer details", "VALIDATION_ERROR");
    const current = await this.db.queueEntry.findUnique({ where: { id }, include: { patient: true } });
    if (!current) throw new HttpError(404, "Queue entry not found", "NOT_FOUND");
    if (!canTransitionQueue(current.status, QueueStatus.TRANSFERRED)) throw new HttpError(409, "This queue entry cannot be transferred", "INVALID_STATUS_TRANSITION");
    const targetDoctor = parsed.data.doctorId ? await this.db.doctor.findFirst({ where: { id: parsed.data.doctorId, department: parsed.data.department, active: true } }) : null;
    if (parsed.data.doctorId && !targetDoctor) throw new HttpError(400, "Select an active doctor in the receiving department", "DOCTOR_UNAVAILABLE");
    const result = await this.db.$transaction(async (transaction) => {
      await transaction.queueEntry.update({ where: { id }, data: { status: "TRANSFERRED" } });
      const counter = await transaction.queueCounter.upsert({
        where: { department_queueDate: { department: parsed.data.department, queueDate: current.queueDate } },
        create: { department: parsed.data.department, queueDate: current.queueDate, lastNumber: 1 },
        update: { lastNumber: { increment: 1 } },
      });
      return transaction.queueEntry.create({
        data: { queueNumber: counter.lastNumber, queueDate: current.queueDate, patientId: current.patientId, department: parsed.data.department, doctorId: targetDoctor?.id },
        include: { patient: true, appointment: true },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    await this.audit(actor.userId, "queue.transfer", "QueueEntry", id);
    return this.fromQueue(result);
  }

  async publicQueue(date?: string, department?: string) {
    const targetDate = date ?? new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Addis_Ababa", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const queueDate = toQueueDate(targetDate);
    const rows = await this.db.queueEntry.findMany({
      where: { queueDate, ...(department ? { department } : {}), status: { in: ["WAITING", "CONSULTING"] } },
      orderBy: [{ department: "asc" }, { queueNumber: "asc" }],
      select: { queueNumber: true, department: true, status: true, doctor: { select: { name: true } } },
    });
    return rows.map(({ queueNumber, department: dept, status, doctor }) => ({ queueNumber, department: dept, status: status.toLowerCase(), doctor: doctor?.name ?? "Duty clinician" }));
  }

  private fromQueue(row: any) {
    return {
      id: row.id,
      queueNumber: row.queueNumber,
      patientId: row.patient.patientNumber,
      department: row.department,
      doctor: row.appointment?.doctor?.name ?? "Assigned by department",
      checkIn: row.checkedInAt,
      status: row.status.toLowerCase(),
    };
  }

  private async assertAppointmentAccess(appointment: { patientId: string; doctorId: string; department: string }, actor: Actor) {
    if (actor.role === "PATIENT") {
      const ownedPatient = await this.db.patient.findUnique({ where: { userId: actor.userId }, select: { id: true } });
      if (!ownedPatient || ownedPatient.id !== appointment.patientId) throw new HttpError(403, "You are not authorized to access this appointment", "FORBIDDEN");
    } else if (actor.role === "DOCTOR") {
      const doctor = await this.db.doctor.findUnique({ where: { userId: actor.userId }, select: { id: true } });
      if (!doctor || doctor.id !== appointment.doctorId) throw new HttpError(403, "You are not authorized to access this appointment", "FORBIDDEN");
    } else if (actor.role !== "ADMINISTRATOR" && actor.role !== "RECEPTIONIST") {
      if (!actor.department || actor.department !== appointment.department) throw new HttpError(403, "You are not authorized to access this appointment", "FORBIDDEN");
    }
  }

  private assertDepartment(department: string, actor: Actor) {
    if (actor.role !== "ADMINISTRATOR" && actor.role !== "RECEPTIONIST" && actor.role !== "PATIENT" && actor.role !== "DOCTOR") {
      if (!actor.department || actor.department !== department) throw new HttpError(403, "You are not authorized to use this department", "FORBIDDEN");
    }
  }

  private async audit(actorId: string, action: string, entityType: string, entityId: string) {
    await this.db.auditLog.create({ data: { actorId, action, entityType, entityId } });
  }
}
