import { Router } from "express";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { authenticate, requireRole, requireTenant } from "../../middleware/authenticate.js";
import { HttpError } from "../../utils/http-error.js";
import type { ChapaPaymentService } from "./chapa.service.js";

const initializeSchema = z.object({
  invoiceId: z.string().uuid(),
  returnUrl: z.string().url().optional(),
});

function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] || "";
  return param || "";
}

export function paymentRoutes(service: ChapaPaymentService) {
  const router = Router();

  router.post("/payments/chapa/initialize", authenticate, requireTenant, async (request, response, next) => {
    try {
      const parsed = initializeSchema.safeParse(request.body);
      if (!parsed.success) throw new HttpError(400, "Invalid payment initialization payload", "VALIDATION_ERROR");
      const data = await service.initializePayment({ invoiceId: parsed.data.invoiceId, actor: request.actor!, returnUrl: parsed.data.returnUrl });
      response.status(201).json({ success: true, data });
    } catch (error) { next(error); }
  });

  router.get("/payments/chapa/verify/:reference", authenticate, requireTenant, async (request, response, next) => {
    try {
      const reference = getParam(request.params.reference);
      if (!reference) throw new HttpError(400, "Reference is required", "VALIDATION_ERROR");
      const data = await service.verifyPayment(reference, request.actor);
      response.json({ success: data.success, data });
    } catch (error) { next(error); }
  });

  router.post("/payments/chapa/webhook", async (request, response, next) => {
    try {
      const signatures = [
        request.header("x-chapa-signature"),
        request.header("chapa-signature"),
        request.header("x-chapa-signature-256"),
      ].filter((value): value is string => Boolean(value));
      const headers = {
        "x-chapa-event-id": request.header("x-chapa-event-id") ?? undefined,
      };
      const data = await service.handleWebhook(request.body as Buffer, signatures, headers);
      response.json({ success: true, message: "Webhook processed successfully", data });
    } catch (error) { next(error); }
  });

  router.get("/payments/receipt/:paymentId", authenticate, requireTenant, async (request, response, next) => {
    try {
      const paymentId = getParam(request.params.paymentId);
      const data = await service.getReceipt(paymentId, request.actor!);
      response.json({ success: true, data });
    } catch (error) { next(error); }
  });

  router.get("/payments/analytics", authenticate, requireTenant, requireRole(UserRole.FINANCE_OFFICER, UserRole.ADMINISTRATOR, UserRole.SUPER_ADMIN), async (request, response, next) => {
    try {
      const platformWide = request.actor?.role === UserRole.SUPER_ADMIN;
      const data = await service.getPaymentAnalytics(platformWide ? undefined : request.actor?.hospitalId, platformWide);
      response.json({ success: true, data });
    } catch (error) { next(error); }
  });

  return router;
}
