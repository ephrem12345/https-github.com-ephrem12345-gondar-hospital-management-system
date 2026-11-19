import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/authenticate.js";
import { HttpError } from "../../utils/http-error.js";
import type { MediaService, MediaAssetCategory } from "./service.js";

const signUploadSchema = z.object({
  category: z.enum(["HOSPITAL_LOGO", "HOSPITAL_BANNER", "STAFF_AVATAR", "DEPARTMENT_IMAGE", "PUBLIC_DOCUMENT"]),
});

const registerAssetSchema = z.object({
  publicId: z.string().min(1),
  secureUrl: z.string().url(),
  category: z.enum(["HOSPITAL_LOGO", "HOSPITAL_BANNER", "STAFF_AVATAR", "DEPARTMENT_IMAGE", "PUBLIC_DOCUMENT"]),
  mimeType: z.string(),
  sizeBytes: z.number().int().positive(),
  assetTag: z.string().optional(),
});

export function mediaRoutes(service: MediaService) {
  const router = Router();

  // Authenticated: Generate Cloudinary signed parameters
  router.post("/media/sign-upload", authenticate, async (request, response, next) => {
    try {
      const parsed = signUploadSchema.safeParse(request.body);
      if (!parsed.success) throw new HttpError(400, "Invalid media upload parameters", "VALIDATION_ERROR");
      const hospitalId = request.actor?.hospitalId;
      const data = service.generateUploadSignature(parsed.data.category, hospitalId);
      response.json({ success: true, data });
    } catch (error) { next(error); }
  });

  // Authenticated: Register completed upload metadata
  router.post("/media/register-asset", authenticate, async (request, response, next) => {
    try {
      const parsed = registerAssetSchema.safeParse(request.body);
      if (!parsed.success) throw new HttpError(400, "Invalid asset registration data", "VALIDATION_ERROR");
      const data = await service.registerUploadedAsset({
        ...parsed.data,
        hospitalId: request.actor?.hospitalId,
        userId: request.actor?.userId,
      });
      response.status(201).json({ success: true, data });
    } catch (error) { next(error); }
  });

  return router;
}
