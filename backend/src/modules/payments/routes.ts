import { Router } from "express";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { authenticate, requireRole } from "../../middleware/authenticate.js";
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

  // Authenticated: Initialize Chapa payment for an invoice
  router.post("/payments/chapa/initialize", authenticate, async (request, response, next) => {
    try {
      const parsed = initializeSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new HttpError(400, "Invalid payment initialization payload", "VALIDATION_ERROR");
      }
      const data = await service.initializePayment({
        invoiceId: parsed.data.invoiceId,
        actor: request.actor!,
        returnUrl: parsed.data.returnUrl,
      });
      response.status(201).json({ success: true, data });
    } catch (error) { next(error); }
  });

  // Authenticated: Verify Chapa payment result
  router.get("/payments/chapa/verify/:reference", authenticate, async (request, response, next) => {
    try {
      const reference = getParam(request.params.reference);
      if (!reference) throw new HttpError(400, "Reference is required", "VALIDATION_ERROR");
      const data = await service.verifyPayment(reference);
      response.json({ success: true, data });
    } catch (error) { next(error); }
  });

  // Public: Chapa Webhook receiver
  router.post("/payments/chapa/webhook", async (request, response, next) => {
    try {
      const signature = request.header("x-chapa-signature") || request.header("chapa-signature");
      const data = await service.handleWebhook(request.body, signature);
      response.json({ success: true, message: "Webhook processed successfully", data });
    } catch (error) { next(error); }
  });

  // Authenticated: Get digital payment receipt
  router.get("/payments/receipt/:paymentId", authenticate, async (request, response, next) => {
    try {
      const paymentId = getParam(request.params.paymentId);
      const data = await service.getReceipt(paymentId);
      response.json({ success: true, data });
    } catch (error) { next(error); }
  });

  // Authenticated (Finance / Admin / Super Admin): Payment telemetry
  router.get("/payments/analytics", authenticate, requireRole(UserRole.FINANCE_OFFICER, UserRole.ADMINISTRATOR, UserRole.SUPER_ADMIN), async (request, response, next) => {
    try {
      const hospitalId = request.actor?.role === UserRole.SUPER_ADMIN ? undefined : request.actor?.hospitalId;
      const data = await service.getPaymentAnalytics(hospitalId);
      response.json({ success: true, data });
    } catch (error) { next(error); }
  });

  return router;
}
