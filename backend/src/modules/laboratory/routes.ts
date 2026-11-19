import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import { LaboratoryService } from "./service.js";
import {
  createLaboratoryOrderSchema,
  listLaboratoryOrdersQuerySchema,
  submitLaboratoryResultsSchema,
  updateLaboratoryOrderStatusSchema,
} from "./schemas.js";
import { requirePermission } from "../../middleware/authenticate.js";
import { HttpError } from "../../utils/http-error.js";

function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] || "";
  return param || "";
}

export function laboratoryRoutes(database: PrismaClient) {
  const router = Router();
  const service = new LaboratoryService(database);

  router.get("/catalog", requirePermission("laboratory.orders.read", "laboratory.read"), async (_req, res, next) => {
    try {
      const data = await service.getCatalog();
      res.json({ success: true, data });
    } catch (err) { next(err); }
  });

  router.post("/orders", requirePermission("laboratory.orders.create"), async (req, res, next) => {
    try {
      const actor = req.actor;
      if (!actor) throw new HttpError(401, "Authentication required", "UNAUTHENTICATED");
      const input = createLaboratoryOrderSchema.parse(req.body);
      const data = await service.createOrder(actor, input, req.requestId);
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  });

  router.get("/orders", requirePermission("laboratory.orders.read", "laboratory.read"), async (req, res, next) => {
    try {
      const actor = req.actor;
      if (!actor) throw new HttpError(401, "Authentication required", "UNAUTHENTICATED");
      const query = listLaboratoryOrdersQuerySchema.parse(req.query);
      const data = await service.listOrders(actor, query);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  });

  router.get("/orders/:id", requirePermission("laboratory.orders.read", "laboratory.read"), async (req, res, next) => {
    try {
      const id = getParam(req.params.id);
      const data = await service.getOrderById(id);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  });

  router.patch("/orders/:id/status", requirePermission("laboratory.orders.manage", "laboratory.manage"), async (req, res, next) => {
    try {
      const actor = req.actor;
      if (!actor) throw new HttpError(401, "Authentication required", "UNAUTHENTICATED");
      const id = getParam(req.params.id);
      const input = updateLaboratoryOrderStatusSchema.parse(req.body);
      const data = await service.updateStatus(id, actor, input, req.requestId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  });

  router.post("/orders/:id/results", requirePermission("laboratory.results.write", "laboratory.results.release"), async (req, res, next) => {
    try {
      const actor = req.actor;
      if (!actor) throw new HttpError(401, "Authentication required", "UNAUTHENTICATED");
      const id = getParam(req.params.id);
      const input = submitLaboratoryResultsSchema.parse(req.body);
      const data = await service.submitResults(id, actor, input, req.requestId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  });

  return router;
}
