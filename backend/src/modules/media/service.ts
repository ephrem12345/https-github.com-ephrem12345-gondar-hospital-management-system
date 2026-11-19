import crypto from "node:crypto";
import { Prisma, UserRole } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { cloudinaryConfigured, env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../utils/http-error.js";

export type MediaAssetCategory =
  | "HOSPITAL_LOGO"
  | "HOSPITAL_BANNER"
  | "STAFF_AVATAR"
  | "DEPARTMENT_IMAGE"
  | "PATIENT_DOCUMENT"
  | "MEDICAL_REPORT"
  | "PUBLIC_DOCUMENT";

export interface MediaActor {
  userId: string;
  role: UserRole;
  hospitalId?: string;
  patientId?: string;
}

const SENSITIVE_CATEGORIES = new Set<MediaAssetCategory>(["PATIENT_DOCUMENT", "MEDICAL_REPORT"]);
const IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const DOCUMENT_MIME = new Set(["application/pdf"]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const SIGNATURE_TTL_SECONDS = 900;
const CLOUDINARY_HOST = "res.cloudinary.com";

interface UploadIntent {
  publicId: string;
  folder: string;
  hospitalId: string;
  userId: string;
  category: MediaAssetCategory;
  accessMode: "PUBLIC" | "AUTHENTICATED";
  maxSizeBytes: number;
  expiresAt: number;
}

export class MediaService {
  constructor(private readonly db: PrismaClient) {}

  private requireConfig() {
    if (!cloudinaryConfigured || !env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_SECRET || !env.CLOUDINARY_API_KEY) {
      throw new HttpError(503, "Media storage is not configured", "MEDIA_NOT_CONFIGURED");
    }
  }

  private signToken(payload: UploadIntent): string {
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const mac = crypto.createHmac("sha256", env.CLOUDINARY_API_SECRET!).update(body).digest("base64url");
    return `${body}.${mac}`;
  }

  private readToken(token: string): UploadIntent {
    const [body, mac] = token.split(".");
    if (!body || !mac) throw new HttpError(400, "Invalid upload token", "INVALID_UPLOAD_TOKEN");
    const expected = crypto.createHmac("sha256", env.CLOUDINARY_API_SECRET!).update(body).digest("base64url");
    const a = Buffer.from(mac);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw new HttpError(401, "Invalid upload token", "INVALID_UPLOAD_TOKEN");
    }
    let parsed: UploadIntent;
    try { parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as UploadIntent; }
    catch { throw new HttpError(400, "Invalid upload token", "INVALID_UPLOAD_TOKEN"); }
    if (parsed.expiresAt < Math.floor(Date.now() / 1000)) {
      throw new HttpError(400, "Upload token has expired", "UPLOAD_TOKEN_EXPIRED");
    }
    return parsed;
  }

  private async audit(action: string, actor: MediaActor, entityId?: string, outcome = "SUCCESS") {
    try {
      await this.db.auditLog.create({
        data: {
          actorId: actor.userId,
          hospitalId: actor.hospitalId,
          action,
          entityType: "MediaAsset",
          entityId,
          requestId: outcome,
        },
      });
    } catch (error) {
      logger.error({ err: error, action }, "Unable to persist media audit record");
    }
  }

  private assertHospital(actor: MediaActor, hospitalId: string) {
    if (actor.role !== UserRole.SUPER_ADMIN && actor.hospitalId !== hospitalId) {
      throw new HttpError(403, "Access denied to another hospital's media", "FORBIDDEN");
    }
  }

  generateUploadSignature(category: MediaAssetCategory, actor: MediaActor) {
    this.requireConfig();
    if (!actor.hospitalId) throw new HttpError(403, "No tenant association found for this user", "TENANT_REQUIRED");

    if (category === "HOSPITAL_LOGO" || category === "HOSPITAL_BANNER" || category === "DEPARTMENT_IMAGE") {
      if (actor.role !== UserRole.ADMINISTRATOR && actor.role !== UserRole.SUPER_ADMIN) {
        throw new HttpError(403, "Only hospital administrators may upload this asset type", "FORBIDDEN");
      }
    }

    const sensitive = SENSITIVE_CATEGORIES.has(category);
    const folder = `ghms/hospitals/${actor.hospitalId}/${category.toLowerCase()}`;
    const publicId = `${folder}/${crypto.randomUUID()}`;
    const timestamp = Math.floor(Date.now() / 1000);
    const resourceType = sensitive ? "raw" : "image";
    const maxSizeBytes = sensitive ? MAX_DOCUMENT_BYTES : MAX_IMAGE_BYTES;
    const params: Record<string, string> = {
      folder,
      overwrite: "false",
      public_id: publicId,
      resource_type: resourceType,
      timestamp: String(timestamp),
    };
    if (sensitive) params.access_mode = "authenticated";
    const toSign = Object.keys(params).sort().map((key) => `${key}=${params[key]}`).join("&");
    const signature = crypto.createHash("sha1").update(`${toSign}${env.CLOUDINARY_API_SECRET}`).digest("hex");

    const intent: UploadIntent = {
      publicId,
      folder,
      hospitalId: actor.hospitalId,
      userId: actor.userId,
      category,
      accessMode: sensitive ? "AUTHENTICATED" : "PUBLIC",
      maxSizeBytes,
      expiresAt: timestamp + SIGNATURE_TTL_SECONDS,
    };

    return {
      cloudName: env.CLOUDINARY_CLOUD_NAME,
      apiKey: env.CLOUDINARY_API_KEY,
      params,
      signature,
      publicId,
      accessMode: intent.accessMode,
      uploadToken: this.signToken(intent),
    };
  }

  private async describeCloudinaryAsset(publicId: string, resourceType: string) {
    const auth = Buffer.from(`${env.CLOUDINARY_API_KEY}:${env.CLOUDINARY_API_SECRET}`).toString("base64");
    const url = `${env.CLOUDINARY_BASE_URL}/${env.CLOUDINARY_CLOUD_NAME}/resources/${resourceType}/upload/${encodeURIComponent(publicId)}`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(env.CHAPA_REQUEST_TIMEOUT_MS),
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!response.ok) {
      throw new HttpError(502, "Uploaded asset could not be verified with Cloudinary", "ASSET_VERIFICATION_FAILED");
    }
    return response.json() as Promise<{ public_id: string; bytes: number; format?: string; secure_url?: string }>;
  }

  async registerUploadedAsset(input: {
    uploadToken: string;
    secureUrl: string;
    category: MediaAssetCategory;
    mimeType: string;
    sizeBytes: number;
    assetTag?: string;
  }, actor: MediaActor) {
    this.requireConfig();
    const intent = this.readToken(input.uploadToken);
    if (intent.userId !== actor.userId || intent.hospitalId !== actor.hospitalId || intent.category !== input.category) {
      throw new HttpError(403, "Upload token does not belong to this user or tenant", "FORBIDDEN");
    }
    if (input.category !== intent.category) throw new HttpError(400, "Asset category does not match the upload token", "INVALID_CATEGORY");

    const allowed = SENSITIVE_CATEGORIES.has(input.category) ? DOCUMENT_MIME : IMAGE_MIME;
    if (!allowed.has(input.mimeType)) throw new HttpError(400, `Unsupported file type: ${input.mimeType}`, "INVALID_FILE_TYPE");
    if (input.sizeBytes > intent.maxSizeBytes) throw new HttpError(400, "File exceeds the permitted size", "FILE_TOO_LARGE");

    const resourceType = intent.accessMode === "AUTHENTICATED" ? "raw" : "image";
    let asset: { public_id: string; bytes: number; format?: string; secure_url?: string };
    try {
      asset = await this.describeCloudinaryAsset(intent.publicId, resourceType);
    } catch (error) {
      await this.audit("MEDIA_UPLOAD_VERIFY_FAILED", actor, intent.publicId, "FAILED");
      throw error;
    }
    if (asset.public_id !== intent.publicId || asset.bytes > intent.maxSizeBytes) {
      await this.audit("MEDIA_UPLOAD_VERIFY_FAILED", actor, intent.publicId, "FAILED");
      throw new HttpError(400, "Cloudinary asset does not match the signed upload", "ASSET_MISMATCH");
    }
    let secureUrl: URL;
    try { secureUrl = new URL(asset.secure_url ?? input.secureUrl); }
    catch { throw new HttpError(400, "Invalid Cloudinary asset URL", "ASSET_MISMATCH"); }
    if (secureUrl.hostname !== CLOUDINARY_HOST || !secureUrl.pathname.includes(env.CLOUDINARY_CLOUD_NAME!)) {
      throw new HttpError(400, "Asset URL is not a trusted Cloudinary URL", "ASSET_MISMATCH");
    }

    if (SENSITIVE_CATEGORIES.has(input.category) && actor.role === UserRole.PATIENT && input.assetTag !== actor.patientId) {
      throw new HttpError(403, "Patients may only register their own medical documents", "FORBIDDEN");
    }

    const mediaAsset = await this.db.mediaAsset.create({
      data: {
        hospitalId: intent.hospitalId,
        uploadedById: actor.userId,
        publicId: asset.public_id,
        secureUrl: secureUrl.toString(),
        category: input.category,
        mimeType: input.mimeType,
        sizeBytes: asset.bytes,
        format: asset.format,
        accessMode: intent.accessMode,
        assetTag: input.assetTag,
      },
    });

    if (intent.hospitalId && (input.category === "HOSPITAL_LOGO" || input.category === "HOSPITAL_BANNER")) {
      await this.db.hospital.update({
        where: { id: intent.hospitalId },
        data: input.category === "HOSPITAL_LOGO" ? { logoUrl: secureUrl.toString() } : { bannerUrl: secureUrl.toString() },
      });
    }
    await this.audit("MEDIA_ASSET_REGISTERED", actor, mediaAsset.id);
    return mediaAsset;
  }

  private assertAssetAccess(asset: { hospitalId: string | null; uploadedById: string; category: string; assetTag: string | null; accessMode: string }, actor: MediaActor) {
    if (asset.hospitalId) this.assertHospital(actor, asset.hospitalId);
    if (SENSITIVE_CATEGORIES.has(asset.category as MediaAssetCategory)) {
      if (actor.role === UserRole.PATIENT && (asset.uploadedById !== actor.userId || asset.assetTag !== actor.patientId)) {
        throw new HttpError(403, "Access denied to this medical document", "FORBIDDEN");
      }
      if (actor.role !== UserRole.PATIENT && actor.role !== UserRole.SUPER_ADMIN && actor.role !== UserRole.ADMINISTRATOR && actor.role !== UserRole.DOCTOR && actor.role !== UserRole.NURSE) {
        throw new HttpError(403, "Access denied to this medical document", "FORBIDDEN");
      }
    }
  }

  async listAssets(actor: MediaActor) {
    if (!actor.hospitalId && actor.role !== UserRole.SUPER_ADMIN) {
      throw new HttpError(403, "No tenant association found for this user", "TENANT_REQUIRED");
    }
    const assets = await this.db.mediaAsset.findMany({
      where: {
        status: "ACTIVE",
        ...(actor.role === UserRole.SUPER_ADMIN ? {} : { hospitalId: actor.hospitalId }),
        ...(actor.role === UserRole.PATIENT ? { OR: [{ uploadedById: actor.userId }, { assetTag: actor.patientId ?? "" }] } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    return assets.filter((asset) => {
      try { this.assertAssetAccess(asset, actor); return true; }
      catch { return false; }
    });
  }

  async getAsset(id: string, actor: MediaActor) {
    const asset = await this.db.mediaAsset.findUnique({ where: { id } });
    if (!asset || asset.status !== "ACTIVE") throw new HttpError(404, "Media asset not found", "NOT_FOUND");
    this.assertAssetAccess(asset, actor);
    return asset;
  }

  async getDeliveryUrl(id: string, actor: MediaActor) {
    const asset = await this.getAsset(id, actor);
    if (asset.accessMode === "PUBLIC") return { url: asset.secureUrl, expiresAt: null };
    this.requireConfig();
    const expiresAt = Math.floor(Date.now() / 1000) + 300;
    const signature = crypto
      .createHash("sha1")
      .update(`public_id=${asset.publicId}&timestamp=${expiresAt}${env.CLOUDINARY_API_SECRET}`)
      .digest("hex");
    const resourceType = asset.accessMode === "AUTHENTICATED" ? "raw" : "image";
    const url = `https://${CLOUDINARY_HOST}/${env.CLOUDINARY_CLOUD_NAME}/${resourceType}/authenticated/${asset.publicId}?timestamp=${expiresAt}&signature=${signature}`;
    await this.audit("MEDIA_SIGNED_DELIVERY", actor, asset.id);
    return { url, expiresAt: new Date(expiresAt * 1000).toISOString() };
  }

  async deleteAsset(id: string, actor: MediaActor) {
    const asset = await this.getAsset(id, actor);
    if (asset.uploadedById !== actor.userId && actor.role !== UserRole.ADMINISTRATOR && actor.role !== UserRole.SUPER_ADMIN) {
      throw new HttpError(403, "Only the uploader or a hospital administrator may delete this asset", "FORBIDDEN");
    }
    this.requireConfig();
    const timestamp = Math.floor(Date.now() / 1000);
    const toSign = `invalidate=true&public_id=${asset.publicId}&timestamp=${timestamp}`;
    const signature = crypto.createHash("sha1").update(`${toSign}${env.CLOUDINARY_API_SECRET}`).digest("hex");
    const auth = Buffer.from(`${env.CLOUDINARY_API_KEY}:${env.CLOUDINARY_API_SECRET}`).toString("base64");
    const body = new URLSearchParams({ public_id: asset.publicId, timestamp: String(timestamp), invalidate: "true", signature });
    const response = await fetch(`${env.CLOUDINARY_BASE_URL}/${env.CLOUDINARY_CLOUD_NAME}/image/destroy`, {
      method: "POST",
      signal: AbortSignal.timeout(env.CHAPA_REQUEST_TIMEOUT_MS),
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    if (!response.ok) throw new HttpError(502, "Cloudinary deletion failed", "ASSET_DELETE_FAILED");
    const updated = await this.db.mediaAsset.update({ where: { id }, data: { status: "DELETED" } });
    await this.audit("MEDIA_ASSET_DELETED", actor, id);
    return updated;
  }
}
