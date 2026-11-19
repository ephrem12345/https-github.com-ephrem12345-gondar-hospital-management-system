import { z } from "zod";
import { UserRole } from "@prisma/client";

export const clinicalMessageCategorySchema = z.enum([
  "CLINICAL_INSTRUCTION",
  "MEDICATION_ORDER",
  "NURSING_CARE",
  "VITAL_SIGNS_REQUEST",
  "LABORATORY_REQUEST",
  "LABORATORY_ALERT",
  "GENERAL_CONSULTATION",
]);

export const messagePrioritySchema = z.enum([
  "ROUTINE",
  "IMPORTANT",
  "URGENT",
  "STAT",
  "CRITICAL",
]);

export const conversationTypeSchema = z.enum(["DIRECT", "DEPARTMENT", "GROUP"]);

export const clinicalTaskStatusSchema = z.enum([
  "PENDING",
  "ACKNOWLEDGED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
]);

export const createConversationSchema = z.object({
  type: conversationTypeSchema.default("DIRECT"),
  title: z.string().trim().max(150).optional(),
  department: z.string().trim().max(100).optional(),
  patientId: z.string().uuid("Invalid patient ID").optional(),
  memberIds: z.array(z.string().uuid("Invalid member UUID")).min(1, "At least one member is required"),
});
export type CreateConversationInput = z.infer<typeof createConversationSchema>;

export const addConversationMembersSchema = z.object({
  memberIds: z.array(z.string().uuid("Invalid member UUID")).min(1, "At least one member ID is required"),
});
export type AddConversationMembersInput = z.infer<typeof addConversationMembersSchema>;

export const sendConversationMessageSchema = z.object({
  content: z.string().trim().min(1, "Message content is required").max(5000),
  category: clinicalMessageCategorySchema.default("CLINICAL_INSTRUCTION"),
  priority: messagePrioritySchema.default("ROUTINE"),
  patientId: z.string().uuid("Invalid patient ID").optional(),
  laboratoryOrderId: z.string().uuid("Invalid laboratory order ID").optional(),
  subject: z.string().trim().max(200).optional(),
});
export type SendConversationMessageInput = z.infer<typeof sendConversationMessageSchema>;

export const createClinicalMessageSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation ID").optional(),
  recipientId: z.string().uuid("Invalid recipient ID").optional(),
  recipientRole: z.nativeEnum(UserRole).optional(),
  department: z.string().trim().min(2, "Department is required").max(100),
  patientId: z.string().uuid("Invalid patient ID").optional(),
  category: clinicalMessageCategorySchema.default("CLINICAL_INSTRUCTION"),
  priority: messagePrioritySchema.default("ROUTINE"),
  subject: z.string().trim().min(2, "Subject must be at least 2 characters").max(200),
  content: z.string().trim().min(1, "Message content is required").max(5000),
  parentMessageId: z.string().uuid().optional(),
  laboratoryOrderId: z.string().uuid().optional(),
});
export type CreateClinicalMessageInput = z.infer<typeof createClinicalMessageSchema>;

export const replyClinicalMessageSchema = z.object({
  content: z.string().trim().min(1, "Reply content is required").max(5000),
  priority: messagePrioritySchema.optional(),
});
export type ReplyClinicalMessageInput = z.infer<typeof replyClinicalMessageSchema>;

export const acknowledgeMessageSchema = z.object({
  notes: z.string().trim().max(500).optional(),
});
export type AcknowledgeMessageInput = z.infer<typeof acknowledgeMessageSchema>;

export const escalateMessageSchema = z.object({
  supervisorId: z.string().uuid("Invalid supervisor ID").optional(),
  reason: z.string().trim().max(500).optional(),
});
export type EscalateMessageInput = z.infer<typeof escalateMessageSchema>;

export const convertMessageToTaskSchema = z.object({
  taskType: z.string().trim().min(2, "Task type is required").max(50),
  title: z.string().trim().min(2, "Task title is required").max(200),
  description: z.string().trim().max(2000).optional(),
  department: z.string().trim().max(100).optional(),
  priority: messagePrioritySchema.default("ROUTINE"),
  assignedToId: z.string().uuid("Invalid assigned user ID").optional(),
  dueAt: z.string().optional(),
});
export type ConvertMessageToTaskInput = z.infer<typeof convertMessageToTaskSchema>;

export const updateTaskStatusSchema = z.object({
  status: clinicalTaskStatusSchema,
  completionNotes: z.string().trim().max(1000).optional(),
});
export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;

export const listTasksQuerySchema = z.object({
  status: clinicalTaskStatusSchema.optional(),
  assignedToId: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
  department: z.string().optional(),
  priority: messagePrioritySchema.optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});
export type ListTasksQueryInput = z.infer<typeof listTasksQuerySchema>;

export const uploadAttachmentSchema = z.object({
  fileName: z.string().trim().min(1, "Filename is required").max(255),
  fileType: z.string().trim().min(1, "File MIME type is required").max(100),
  fileBase64: z.string().min(1, "File content base64 is required"),
});
export type UploadAttachmentInput = z.infer<typeof uploadAttachmentSchema>;

export const userSettingsSchema = z.object({
  availabilityStatus: z.enum(["ONLINE", "BUSY", "IN_SURGERY", "ON_CALL", "OFFLINE"]).optional(),
  statusMessage: z.string().trim().max(150).nullable().optional(),
  soundEnabled: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  minNotificationPriority: messagePrioritySchema.optional(),
  preferredLanguage: z.enum(["en", "am"]).optional(),
  autoEscalationPolicy: z.boolean().optional(),
});
export type UserSettingsInput = z.infer<typeof userSettingsSchema>;

export const listClinicalMessagesQuerySchema = z.object({
  box: z.enum(["inbox", "sent", "patient"]).default("inbox"),
  patientId: z.string().uuid().optional(),
  category: clinicalMessageCategorySchema.optional(),
  priority: messagePrioritySchema.optional(),
  search: z.string().trim().max(100).optional(),
  unreadOnly: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});
export type ListClinicalMessagesQueryInput = z.infer<typeof listClinicalMessagesQuerySchema>;
