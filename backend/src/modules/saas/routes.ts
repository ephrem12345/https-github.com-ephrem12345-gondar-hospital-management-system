import { Router, type RequestHandler } from "express";
import { z } from "zod";
import { HospitalStatus, SubscriptionTier, UserRole } from "@prisma/client";
import { authenticate, requireRole, requireSuperAdmin, requireTenant } from "../../middleware/authenticate.js";
import { HttpError } from "../../utils/http-error.js";
import { subscriptionSchemas, type SaasService } from "./service.js";

const hospitalRegistrationSchema = z.object({
  name: z.string().min(2).max(160),
  code: z.string().min(2).max(60).regex(/^[a-zA-Z0-9-_]+$/, "Code must contain only alphanumeric characters, dashes, and underscores"),
  email: z.string().email(),
  phone: z.string().min(6).max(32),
  address: z.string().max(255).optional(),
  city: z.string().max(80).optional(),
  region: z.string().max(80).optional(),
  hospitalType: z.string().max(60).optional(),
  tier: z.enum(["FREE", "BASIC", "PROFESSIONAL", "ENTERPRISE"]).optional(),
  contactPerson: z.string().max(120).optional(),
  contactPhone: z.string().max(32).optional(),
});

const hospitalStatusSchema = z.object({ status: z.nativeEnum(HospitalStatus) });
const planUpdateSchema = z.object({
  monthlyPrice: z.number().positive().optional(),
  annualPrice: z.number().positive().optional(),
  maxStaff: z.number().int().positive().optional(),
  maxPatients: z.number().int().positive().optional(),
  description: z.string().max(500).optional(),
});
const listQuerySchema = z.object({
  status: z.nativeEnum(HospitalStatus).optional(),
  tier: z.nativeEnum(SubscriptionTier).optional(),
  search: z.string().max(120).optional(),
});

function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] || "";
  return param || "";
}

const noopMiddleware: RequestHandler = (_request, _response, next) => next();

export function saasRoutes(service: SaasService, publicLimiter: RequestHandler = noopMiddleware) {
  const router = Router();
  const hospitalAdmin = [UserRole.SUPER_ADMIN, UserRole.ADMINISTRATOR] as const;

  router.get("/saas/plans", async (_request, response, next) => {
    try { response.json({ success: true, data: await service.listPlans() }); } catch (error) { next(error); }
  });

  router.post("/saas/register", publicLimiter, async (request, response, next) => {
    try {
      const body = hospitalRegistrationSchema.safeParse(request.body);
      if (!body.success) throw new HttpError(400, "Invalid hospital registration data", "VALIDATION_ERROR");
      const data = await service.registerHospital(body.data);
      response.status(201).json({ success: true, message: "Hospital registered. Trial subscription activated.", data });
    } catch (error) { next(error); }
  });

  router.get("/saas/hospitals", authenticate, requireSuperAdmin, async (request, response, next) => {
    try {
      const query = listQuerySchema.safeParse(request.query);
      if (!query.success) throw new HttpError(400, "Invalid hospital filters", "VALIDATION_ERROR");
      response.json({ success: true, data: await service.listHospitals(query.data, request.actor!) });
    } catch (error) { next(error); }
  });

  router.get("/saas/hospitals/:id", authenticate, requireSuperAdmin, async (request, response, next) => {
    try { response.json({ success: true, data: await service.getHospital(getParam(request.params.id), request.actor!) }); } catch (error) { next(error); }
  });

  router.patch("/saas/hospitals/:id/status", authenticate, requireSuperAdmin, async (request, response, next) => {
    try {
      const body = hospitalStatusSchema.safeParse(request.body);
      if (!body.success) throw new HttpError(400, "Invalid status payload", "VALIDATION_ERROR");
      const data = await service.updateHospitalStatus(getParam(request.params.id), body.data.status, request.actor!);
      response.json({ success: true, data });
    } catch (error) { next(error); }
  });

  router.get("/saas/subscription", authenticate, requireTenant, requireRole(...hospitalAdmin), async (request, response, next) => {
    try { response.json({ success: true, data: await service.getSubscriptionOverview(request.actor!) }); } catch (error) { next(error); }
  });

  router.get("/saas/subscriptions/history", authenticate, requireTenant, requireRole(...hospitalAdmin), async (request, response, next) => {
    try { response.json({ success: true, data: await service.listSubscriptionPayments(request.actor!) }); } catch (error) { next(error); }
  });

  router.post("/saas/subscriptions/checkout", authenticate, requireTenant, requireRole(...hospitalAdmin), async (request, response, next) => {
    try {
      const body = subscriptionSchemas.checkout.safeParse(request.body);
      if (!body.success) throw new HttpError(400, "Invalid subscription payload", "VALIDATION_ERROR");
      const data = await service.createSubscriptionCheckout(request.actor!, body.data);
      response.status(201).json({ success: true, data });
    } catch (error) { next(error); }
  });

  router.get("/saas/subscriptions/verify/:txRef", authenticate, requireTenant, requireRole(...hospitalAdmin), async (request, response, next) => {
    try {
      const data = await service.verifySubscriptionPayment(request.actor!, getParam(request.params.txRef));
      response.json({ success: data.success, data });
    } catch (error) { next(error); }
  });

  router.post("/saas/subscriptions/cancel", authenticate, requireTenant, requireRole(...hospitalAdmin), async (request, response, next) => {
    try { response.json({ success: true, data: await service.cancelSubscription(request.actor!) }); } catch (error) { next(error); }
  });

  router.post("/saas/hospitals/:id/subscriptions", authenticate, requireSuperAdmin, async (request, response, next) => {
    try {
      const body = subscriptionSchemas.renewal.safeParse(request.body);
      if (!body.success) throw new HttpError(400, "Invalid subscription payload", "VALIDATION_ERROR");
      const data = await service.renewSubscription(getParam(request.params.id), body.data, request.actor!);
      response.status(201).json({ success: true, data });
    } catch (error) { next(error); }
  });

  router.patch("/saas/plans/:code", authenticate, requireSuperAdmin, async (request, response, next) => {
    try {
      const body = planUpdateSchema.safeParse(request.body);
      if (!body.success) throw new HttpError(400, "Invalid plan update payload", "VALIDATION_ERROR");
      const code = getParam(request.params.code).toUpperCase() as SubscriptionTier;
      if (!Object.values(SubscriptionTier).includes(code)) throw new HttpError(400, "Unknown plan code", "VALIDATION_ERROR");
      response.json({ success: true, data: await service.updatePlan(code, body.data, request.actor!) });
    } catch (error) { next(error); }
  });

  router.get("/saas/analytics", authenticate, requireSuperAdmin, async (_request, response, next) => {
    try { response.json({ success: true, data: await service.getPlatformAnalytics() }); } catch (error) { next(error); }
  });

  return router;
}
