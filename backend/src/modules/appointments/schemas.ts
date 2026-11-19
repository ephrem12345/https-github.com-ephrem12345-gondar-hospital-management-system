import { z } from "zod";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(
  (value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value,
  "Enter a valid calendar date",
);
const timeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Enter time as HH:mm");

export const appointmentInputSchema = z.object({
  patientId: z.string().min(1).max(32),
  doctor: z.string().min(1).max(120),
  department: z.string().min(1).max(100),
  date: dateSchema,
  time: timeSchema,
  type: z.enum(["consultation", "follow-up", "emergency", "procedure"]),
  reason: z.string().min(1).max(200),
  notes: z.string().max(500).optional(),
});

export const appointmentListQuerySchema = z.object({
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  date: dateSchema.optional(),
  view: z.enum(["daily", "weekly", "monthly"]).optional(),
  department: z.string().max(100).optional(),
  doctorId: z.string().max(36).optional(),
  status: z.enum(["Scheduled", "Confirmed", "Checked In", "Completed", "Cancelled", "No Show"]).optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["scheduledAt", "status", "department", "createdAt"]).default("scheduledAt"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export const appointmentStatusSchema = z.object({
  status: z.enum(["Scheduled", "Confirmed", "Checked In", "Completed", "Cancelled", "No Show"]),
});

export const cancelAppointmentSchema = z.object({
  reason: z.string().max(300).optional(),
});

export const queueCheckInSchema = z.object({
  appointmentId: z.string().uuid(),
});

export const queueStatusSchema = z.object({
  status: z.enum(["Waiting", "Consulting", "Completed", "Absent"]),
});

export const queueTransferSchema = z.object({
  department: z.string().min(1).max(100),
  doctorId: z.string().uuid().optional(),
});

export const queueListQuerySchema = z.object({
  date: dateSchema.optional(),
  department: z.string().max(100).optional(),
  status: z.enum(["Waiting", "Consulting", "Completed", "Absent", "Transferred"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

export const doctorCreateSchema = z.object({
  name: z.string().min(2).max(120),
  specialty: z.string().min(2).max(100),
  department: z.string().min(2).max(100),
  userId: z.string().uuid().optional(),
});

export const doctorScheduleSchema = z.object({
  department: z.string().min(2).max(100),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: timeSchema,
  endTime: timeSchema,
  breakStart: timeSchema.optional(),
  breakEnd: timeSchema.optional(),
  slotDurationMins: z.number().int().min(5).max(240).default(30),
}).refine((value) => value.startTime < value.endTime, { message: "End time must follow start time", path: ["endTime"] })
  .refine((value) => Boolean(value.breakStart) === Boolean(value.breakEnd), { message: "Break start and end must both be provided", path: ["breakEnd"] })
  .refine((value) => !value.breakStart || (value.startTime <= value.breakStart && value.breakStart < value.breakEnd! && value.breakEnd! <= value.endTime), { message: "Break must be within working hours", path: ["breakStart"] });

export const doctorAvailabilityQuerySchema = z.object({
  date: dateSchema,
  department: z.string().max(100).optional(),
});
