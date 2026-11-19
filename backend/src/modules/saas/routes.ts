import { Router } from "express";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { authenticate, requireRole, requireSuperAdmin } from "../../middleware/authenticate.js";
import { HttpError } from "../../utils/http-error.js";
import type { SaasService } from "./service.js";

const hospitalRegistrationSchema = z.object({
  name: z.string().min(2).max(160),
  code: z.string().min(2).max(60).regex(/^[a-zA-Z0-9-_]+$/, "Code must contain only alphanumeric characters, dashes, and underscores"),
  email: z.string().email(),
  phone: z.string().min(6).max(32),
  address: z.string().max(255).optional(),
  city: z.string().max(80).optional(),
  region: z.string().max(80).optional(),
  hospitalType: z.string().max(60).optional(),
  tier: z.enum(["BASIC", "PROFESSIONAL", "ENTERPRISE"]).optional(),
  contactPerson: z.string().max(120).optional(),
  contactPhone: z.string().max(32).optional(),
});

const hospitalStatusSchema = z.object({
  status: z.enum(["TRIAL", "ACTIVE", "SUSPENDED", "CANCELLED"]),
});

const subscriptionRenewalSchema = z.object({
  planCode: z.enum(["BASIC", "PROFESSIONAL", "ENTERPRISE"]),
  cycle: z.enum(["MONTHLY", "ANNUAL"]),
  paymentReference: z.string().max(120).optional(),
});

const planUpdateSchema = z.object({
  monthlyPrice: z.number().positive().optional(),
  annualPrice: z.number().positive().optional(),
  maxStaff: z.number().int().positive().optional(),
  maxPatients: z.number().int().positive().optional(),
  description: z.string().max(500).optional(),
});

function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] || "";
  return param || "";
}

export function saasRoutes(service: SaasService) {
  const router = Router();

  // Public: List active subscription plans
  router.get("/saas/plans", async (_request, response, next) => {
    try {
      const data = await service.listPlans();
      response.json({ success: true, data });
    } catch (error) { next(error); }
  });

  // Public: Register / Onboard a new hospital
  router.post("/saas/register", async (request, response, next) => {
    try {
      const body = hospitalRegistrationSchema.safeParse(request.body);
      if (!body.success) {
        throw new HttpError(400, "Invalid hospital registration data", "VALIDATION_ERROR");
      }
      const data = await service.registerHospital(body.data);
      response.status(201).json({
        success: true,
        message: "Hospital registered successfully. A 30-day trial subscription has been activated.",
        data,
      });
    } catch (error) { next(error); }
  });

  // Super Admin: List all hospitals
  router.get("/saas/hospitals", authenticate, requireRole(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATOR), async (request, response, next) => {
    try {
      const query = request.query as Record<string, string | undefined>;
      const data = await service.listHospitals({
        status: query.status as any,
        tier: query.tier as any,
        search: query.search,
      });
      response.json({ success: true, data });
    } catch (error) { next(error); }
  });

  // Super Admin: View single hospital details
  router.get("/saas/hospitals/:id", authenticate, requireRole(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATOR), async (request, response, next) => {
    try {
      const id = getParam(request.params.id);
      const data = await service.getHospital(id);
      response.json({ success: true, data });
    } catch (error) { next(error); }
  });

  // Super Admin: Update hospital status (Activate, Suspend, Cancel)
  router.patch("/saas/hospitals/:id/status", authenticate, requireRole(UserRole.SUPER_ADMIN), async (request, response, next) => {
    try {
      const id = getParam(request.params.id);
      const body = hospitalStatusSchema.safeParse(request.body);
      if (!body.success) throw new HttpError(400, "Invalid status payload", "VALIDATION_ERROR");
      const data = await service.updateHospitalStatus(id, body.data.status);
      response.json({ success: true, data });
    } catch (error) { next(error); }
  });

  // Super Admin / Hospital Admin: Renew or upgrade subscription
  router.post("/saas/hospitals/:id/subscriptions", authenticate, requireRole(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATOR), async (request, response, next) => {
    try {
      const id = getParam(request.params.id);
      const body = subscriptionRenewalSchema.safeParse(request.body);
      if (!body.success) throw new HttpError(400, "Invalid subscription payload", "VALIDATION_ERROR");
      const data = await service.renewSubscription(id, body.data);
      response.status(201).json({ success: true, data });
    } catch (error) { next(error); }
  });

  // Super Admin: Update plan pricing and limits
  router.patch("/saas/plans/:code", authenticate, requireRole(UserRole.SUPER_ADMIN), async (request, response, next) => {
    try {
      const body = planUpdateSchema.safeParse(request.body);
      if (!body.success) throw new HttpError(400, "Invalid plan update payload", "VALIDATION_ERROR");
      const rawCode = getParam(request.params.code);
      const code = rawCode.toUpperCase() as any;
      const data = await service.updatePlan(code, body.data);
      response.json({ success: true, data });
    } catch (error) { next(error); }
  });

  // Super Admin: Platform overview & analytics
  router.get("/saas/analytics", authenticate, requireRole(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATOR), async (_request, response, next) => {
    try {
      const data = await service.getPlatformAnalytics();
      response.json({ success: true, data });
    } catch (error) { next(error); }
  });

  return router;
}
