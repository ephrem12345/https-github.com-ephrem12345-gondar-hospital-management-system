import { z } from "zod";

export const createLaboratoryOrderSchema = z.object({
  patientId: z.string().uuid("Invalid patient ID"),
  department: z.string().trim().min(2, "Department is required").max(100),
  priority: z.enum(["Routine", "Urgent", "STAT"]).default("Routine"),
  clinicalIndication: z.string().trim().min(3, "Clinical indication is required").max(500),
  testCatalogIds: z.array(z.string().min(1)).min(1, "Select at least one laboratory test"),
});
export type CreateLaboratoryOrderInput = z.infer<typeof createLaboratoryOrderSchema>;

export const updateLaboratoryOrderStatusSchema = z.object({
  status: z.enum([
    "PENDING",
    "ASSIGNED",
    "SPECIMEN_COLLECTED",
    "PROCESSING",
    "COMPLETED",
    "CANCELLED",
  ]),
  assignedToId: z.string().uuid().optional(),
  cancellationReason: z.string().trim().max(300).optional(),
});
export type UpdateLaboratoryOrderStatusInput = z.infer<typeof updateLaboratoryOrderStatusSchema>;

export const submitLaboratoryResultsSchema = z.object({
  results: z.array(
    z.object({
      orderItemId: z.string().uuid(),
      value: z.string().trim().min(1, "Result value is required"),
      abnormalFlag: z.enum(["NORMAL", "HIGH", "LOW", "CRITICAL"]).default("NORMAL"),
      comments: z.string().trim().max(500).optional(),
    })
  ).min(1, "Submit at least one test result"),
  overallComments: z.string().trim().max(1000).optional(),
});
export type SubmitLaboratoryResultsInput = z.infer<typeof submitLaboratoryResultsSchema>;

export const listLaboratoryOrdersQuerySchema = z.object({
  status: z.enum([
    "PENDING",
    "ASSIGNED",
    "SPECIMEN_COLLECTED",
    "PROCESSING",
    "COMPLETED",
    "CANCELLED",
  ]).optional(),
  priority: z.enum(["Routine", "Urgent", "STAT"]).optional(),
  patientId: z.string().uuid().optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});
export type ListLaboratoryOrdersQueryInput = z.infer<typeof listLaboratoryOrdersQuerySchema>;
