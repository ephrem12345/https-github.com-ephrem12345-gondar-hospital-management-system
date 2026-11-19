import crypto from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { env } from "../../config/env.js";
import { HttpError } from "../../utils/http-error.js";
import { logger } from "../../config/logger.js";

export type MediaAssetCategory = "HOSPITAL_LOGO" | "HOSPITAL_BANNER" | "STAFF_AVATAR" | "DEPARTMENT_IMAGE" | "PUBLIC_DOCUMENT";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_PUBLIC_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export class MediaService {
  constructor(private readonly db: PrismaClient) {}

  generateUploadSignature(category: MediaAssetCategory, hospitalId?: string) {
    // Enforce separation: confidential clinical records are forbidden in public Cloudinary folders
    const confidentialKeywords = ["LAB_REPORT", "PRESCRIPTION", "PATIENT_RECORD", "DICOM", "IDENTITY_DOCUMENT"];
    if (confidentialKeywords.some((k) => category.includes(k))) {
      throw new HttpError(400, "Confidential clinical documents must not be uploaded to public media storage", "CLINICAL_PRIVACY_VIOLATION");
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = hospitalId ? `ghms/hospitals/${hospitalId}/${category.toLowerCase()}` : `ghms/public/${category.toLowerCase()}`;

    // Cloudinary signature calculation: sorted params query string hashed with api_secret
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
    const signature = crypto
      .createHash("sha1")
      .update(paramsToSign + env.CLOUDINARY_API_SECRET)
      .digest("hex");

    return {
      cloudName: env.CLOUDINARY_CLOUD_NAME,
      apiKey: env.CLOUDINARY_API_KEY,
      timestamp,
      folder,
      signature,
      maxSizeBytes: MAX_PUBLIC_IMAGE_SIZE_BYTES,
      allowedMimeTypes: Array.from(ALLOWED_MIME_TYPES),
    };
  }

  async registerUploadedAsset(input: {
    assetTag?: string;
    publicId: string;
    secureUrl: string;
    category: MediaAssetCategory;
    mimeType: string;
    sizeBytes: number;
    hospitalId?: string;
    userId?: string;
  }) {
    if (!ALLOWED_MIME_TYPES.has(input.mimeType)) {
      throw new HttpError(400, `Unsupported file type: ${input.mimeType}. Allowed: JPG, PNG, WEBP`, "INVALID_FILE_TYPE");
    }

    if (input.sizeBytes > MAX_PUBLIC_IMAGE_SIZE_BYTES) {
      throw new HttpError(400, `File size exceeds the 5MB maximum limit (${input.sizeBytes} bytes)`, "FILE_TOO_LARGE");
    }

    // If hospital logo/banner, automatically update hospital record
    if (input.hospitalId) {
      if (input.category === "HOSPITAL_LOGO") {
        await this.db.hospital.update({
          where: { id: input.hospitalId },
          data: { logoUrl: input.secureUrl },
        });
      } else if (input.category === "HOSPITAL_BANNER") {
        await this.db.hospital.update({
          where: { id: input.hospitalId },
          data: { bannerUrl: input.secureUrl },
        });
      }
    }

    return {
      success: true,
      publicId: input.publicId,
      url: input.secureUrl,
      category: input.category,
      hospitalId: input.hospitalId,
    };
  }
}
