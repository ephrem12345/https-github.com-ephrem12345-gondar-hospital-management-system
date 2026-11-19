import { Router } from "express";
import { z } from "zod";
import { authenticate, requireTenant } from "../../middleware/authenticate.js";
import { HttpError } from "../../utils/http-error.js";
import type { MediaService } from "./service.js";

const signUploadSchema = z.object({
  category: z.enum(["HOSPITAL_LOGO", "HOSPITAL_BANNER", "STAFF_AVATAR", "DEPARTMENT_IMAGE", "PATIENT_DOCUMENT", "MEDICAL_REPORT", "PUBLIC_DOCUMENT"]),
});

const registerAssetSchema = z.object({
  uploadToken: z.string().min(1),
  secureUrl: z.string().url(),
  category: z.enum(["HOSPITAL_LOGO", "HOSPITAL_BANNER", "STAFF_AVATAR", "DEPARTMENT_IMAGE", "PATIENT_DOCUMENT", "MEDICAL_REPORT", "PUBLIC_DOCUMENT"]),
  mimeType: z.string().max(100),
  sizeBytes: z.number().int().positive(),
  assetTag: z.string().max(120).optional(),
});

function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] || "";
  return param || "";
}

export function mediaRoutes(service: MediaService) {
  const router = Router();

  router.post("/media/sign-upload", authenticate, requireTenant, async (request, response, next) => {
    try {
      const parsed = signUploadSchema.safeParse(request.body);
      if (!parsed.success) throw new HttpError(400, "Invalid media upload parameters", "VALIDATION_ERROR");
      response.json({ success: true, data: service.generateUploadSignature(parsed.data.category, request.actor!) });
    } catch (error) { next(error); }
  });

  router.post("/media/register-asset", authenticate, requireTenant, async (request, response, next) => {
    try {
      const parsed = registerAssetSchema.safeParse(request.body);
      if (!parsed.success) throw new HttpError(400, "Invalid asset registration data", "VALIDATION_ERROR");
      const data = await service.registerUploadedAsset(parsed.data, request.actor!);
      response.status(201).json({ success: true, data });
    } catch (error) { next(error); }
  });

  router.get("/media/assets", authenticate, requireTenant, async (request, response, next) => {
    try { response.json({ success: true, data: await service.listAssets(request.actor!) }); } catch (error) { next(error); }
  });

  router.get("/media/assets/:id", authenticate, requireTenant, async (request, response, next) => {
    try { response.json({ success: true, data: await service.getAsset(getParam(request.params.id), request.actor!) }); } catch (error) { next(error); }
  });

  router.get("/media/assets/:id/url", authenticate, requireTenant, async (request, response, next) => {
    try { response.json({ success: true, data: await service.getDeliveryUrl(getParam(request.params.id), request.actor!) }); } catch (error) { next(error); }
  });

  router.delete("/media/assets/:id", authenticate, requireTenant, async (request, response, next) => {
    try { response.json({ success: true, data: await service.deleteAsset(getParam(request.params.id), request.actor!) }); } catch (error) { next(error); }
  });

  return router;
}
