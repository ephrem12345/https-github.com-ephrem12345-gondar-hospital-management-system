import { z } from "zod";

const password = z.string().min(8).max(64).regex(/[A-Za-z]/).regex(/\d/);

export const loginSchema = z.object({
  identifier: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(128),
  remember: z.boolean().optional().default(false),
  expectedRoles: z.array(z.string().trim().min(1).max(64)).max(12).optional(),
});

export const registerSchema = z.object({
  firstName: z.string().trim().min(2, "First name must be at least 2 characters").max(50),
  middleName: z.string().trim().max(50).optional().default(""),
  lastName: z.string().trim().min(2, "Last name must be at least 2 characters").max(50),
  gender: z.enum(["male", "female", "other"], { message: "Select a gender" }),
  dateOfBirth: z
    .string()
    .trim()
    .min(1, "Date of birth is required")
    .refine((value) => !Number.isNaN(Date.parse(value)), "Enter a valid date")
    .refine((value) => {
      const date = value.includes("T") ? new Date(value) : new Date(`${value}T00:00:00.000Z`);
      return date <= new Date();
    }, "Date of birth cannot be in the future"),
  phone: z.string().trim().min(9, "Enter a valid phone number").max(32).regex(/^[+\d\s()-]+$/, "Phone number contains invalid characters"),
  email: z.string().trim().email("Enter a valid email").max(254),
  address: z.string().trim().min(4, "Address is required").max(200),
  hospitalCode: z.string().trim().min(2).max(60).regex(/^[a-zA-Z0-9-_]+$/).optional(),
  password,
  termsAccepted: z.literal(true, { message: "You must accept the terms and privacy policy" }),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(32).max(256),
  password,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  password,
});

export const forgotPasswordSchema = z.object({
  identifier: z.string().trim().min(1).max(254),
});

export const updateUserStatusSchema = z.object({
  status: z.enum(["ACTIVE", "PENDING", "DISABLED"], {
    message: "Status must be ACTIVE, PENDING, or DISABLED",
  }),
  reason: z.string().trim().max(250).optional(),
});
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;

export const listUsersQuerySchema = z.object({
  role: z.string().trim().optional(),
  status: z.enum(["ACTIVE", "PENDING", "DISABLED"]).optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListUsersQueryInput = z.infer<typeof listUsersQuerySchema>;

export const createStaffSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(254),
  phone: z
    .string()
    .trim()
    .min(9, "Enter a valid phone number")
    .max(32)
    .regex(/^[+\d\s()-]+$/, "Phone number contains invalid characters")
    .optional(),
  firstName: z.string().trim().min(2, "First name must be at least 2 characters").max(50),
  middleName: z.string().trim().max(50).optional().default(""),
  lastName: z.string().trim().min(2, "Last name must be at least 2 characters").max(50),
  department: z.string().trim().min(2, "Department is required").max(100),
  role: z.enum([
    "ADMINISTRATOR",
    "DOCTOR",
    "NURSE",
    "RECEPTIONIST",
    "LABORATORY_TECHNICIAN",
    "RADIOLOGY_TECHNICIAN",
    "PHARMACIST",
    "FINANCE_OFFICER",
    "HR_OFFICER",
    "DEPARTMENT_HEAD",
    "HOSPITAL_STAFF",
  ], { message: "Select a valid staff role" }),
  password,
});
export type CreateStaffInput = z.infer<typeof createStaffSchema>;
