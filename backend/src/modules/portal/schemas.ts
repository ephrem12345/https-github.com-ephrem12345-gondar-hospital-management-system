import { z } from "zod";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(
  (value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value,
  "Enter a valid calendar date",
);
const timeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Enter time as HH:mm");

export const portalProfileUpdateSchema = z.object({
  phone: z.string().trim().min(7, "Enter a valid phone number").max(32),
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email address").max(254)]).optional(),
  address: z.string().trim().max(255).optional(),
  emergencyContactName: z.string().trim().min(1, "Emergency contact name is required").max(100),
  emergencyContactPhone: z.string().trim().min(7, "Enter a valid emergency contact phone").max(32),
});

export const portalAppointmentRequestSchema = z.object({
  department: z.string().trim().min(2, "Select a department").max(100),
  doctor: z.string().trim().max(120).optional(),
  date: dateSchema,
  time: timeSchema,
  reason: z.string().trim().min(1, "Describe the reason for the visit").max(200),
});

export const portalAppointmentChangeSchema = z.object({
  action: z.enum(["cancel", "reschedule"]),
  date: dateSchema.optional(),
  time: timeSchema.optional(),
}).refine((value) => value.action !== "reschedule" || Boolean(value.date), {
  message: "A new date is required to reschedule",
  path: ["date"],
});

export const portalSupportRequestSchema = z.object({
  category: z.enum(["Feedback", "Complaint", "Support request"]),
  subject: z.string().trim().min(1, "Enter a subject").max(160),
  message: z.string().trim().min(1, "Enter a message").max(2000),
});
