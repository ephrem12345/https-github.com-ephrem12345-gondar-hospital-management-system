import { Router } from "express";
import { z } from "zod";
import { requirePermission } from "../../middleware/authenticate.js";
import { HttpError } from "../../utils/http-error.js";
import { parseId, param } from "../../utils/params.js";
import { departmentListQuerySchema, emergencyListQuerySchema, emergencyResourceSchema } from "./schemas.js";
import type { EmergencyService } from "./service.js";

export function emergencyRoutes(service: EmergencyService) {
  const router = Router();

  router.get("/emergency/cases", requirePermission("emergency.read"), async (request, response) => {
    const query = emergencyListQuerySchema.safeParse(request.query);
    if (!query.success) throw new HttpError(400, "Invalid emergency case filters", "VALIDATION_ERROR");
    response.json({ success: true, data: await service.listCases(query.data, request.actor!) });
  });
  router.post("/emergency/cases", requirePermission("emergency.manage"), async (request, response) => {
    const data = await service.register(request.body, request.actor!);
    response.status(201).json({ success: true, data });
  });
  router.post("/emergency/cases/:caseNumber/triage", requirePermission("emergency.triage"), async (request, response) => {
    const data = await service.triage(param(request.params.caseNumber), request.body, request.actor!);
    response.status(201).json({ success: true, data });
  });
  router.post("/emergency/cases/:caseNumber/transitions", requirePermission("emergency.manage"), async (request, response) => {
    const data = await service.transition(param(request.params.caseNumber), request.body, request.actor!);
    response.json({ success: true, data });
  });
  router.post("/emergency/cases/:caseNumber/consultations", requirePermission("emergency.treatment"), async (request, response) => {
    const data = await service.recordConsultation(param(request.params.caseNumber), request.body, request.actor!);
    response.status(201).json({ success: true, data });
  });
  router.get("/emergency/cases/:caseNumber/history", requirePermission("emergency.read"), async (request, response) => {
    response.json({ success: true, data: await service.history(param(request.params.caseNumber), request.actor!) });
  });
  router.post("/emergency/cases/:caseNumber/resources", requirePermission("emergency.manage"), async (request, response) => {
    const parsed = emergencyResourceSchema.safeParse(request.body);
    if (!parsed.success) throw new HttpError(400, "Invalid emergency resource assignment", "VALIDATION_ERROR");
    const data = await service.assignResource(param(request.params.caseNumber), parsed.data.resourceType, parsed.data.resourceId, request.actor!);
    response.status(201).json({ success: true, data });
  });
  router.patch("/emergency/resources/:id/release", requirePermission("emergency.manage"), async (request, response) => {
    const data = await service.releaseResource(parseId(request.params.id), request.actor!);
    response.json({ success: true, data });
  });
  router.get("/emergency/reports", requirePermission("emergency.read"), async (request, response) => {
    const query = z.object({ from: z.coerce.date().optional(), to: z.coerce.date().optional() }).safeParse(request.query);
    if (!query.success) throw new HttpError(400, "Invalid emergency report dates", "VALIDATION_ERROR");
    response.json({ success: true, data: await service.report(query.data.from, query.data.to) });
  });

  router.get("/departments/assignments", requirePermission("departments.read"), async (request, response) => {
    const department = typeof request.query.department === "string" ? request.query.department : undefined;
    response.json({ success: true, data: await service.listDepartmentAssignments(department, request.actor!) });
  });
  router.post("/departments/assignments", requirePermission("departments.manage"), async (request, response) => {
    const data = await service.assignDepartment(request.body, request.actor!);
    response.status(201).json({ success: true, data });
  });
  router.get("/departments/workflows", requirePermission("departments.read"), async (request, response) => {
    const query = departmentListQuerySchema.safeParse(request.query);
    if (!query.success) throw new HttpError(400, "Invalid department workflow filters", "VALIDATION_ERROR");
    response.json({ success: true, data: await service.listDepartmentWorkflows(query.data, request.actor!) });
  });
  router.post("/departments/workflows", requirePermission("departments.manage"), async (request, response) => {
    const data = await service.saveDepartmentWorkflow(request.body, request.actor!);
    response.status(201).json({ success: true, data });
  });
  router.get("/departments/:department/reports", requirePermission("departments.read"), async (request, response) => {
    response.json({ success: true, data: await service.departmentReport(param(request.params.department), request.actor!) });
  });

  return router;
}
