import { UserRole } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "../../config/env.js";
import { MediaService, type MediaActor } from "./service.js";

const admin: MediaActor = { userId: "u1", role: UserRole.ADMINISTRATOR, hospitalId: "h1" };
const nurse: MediaActor = { userId: "u2", role: UserRole.NURSE, hospitalId: "h1" };

function fixtures() {
  const db = {
    mediaAsset: {
      create: vi.fn().mockImplementation(async ({ data }) => ({ id: "asset-1", ...data })),
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({}),
    },
    hospital: { update: vi.fn().mockResolvedValue({}) },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  } as unknown as PrismaClient;
  return { db };
}

describe("MediaService", () => {
  let ctx: ReturnType<typeof fixtures>;
  beforeEach(() => { ctx = fixtures(); });
  afterEach(() => vi.unstubAllGlobals());

  it("restricts hospital branding uploads to administrators", () => {
    const service = new MediaService(ctx.db);
    expect(() => service.generateUploadSignature("HOSPITAL_LOGO", nurse)).toThrow(/administrators/i);
    const signature = service.generateUploadSignature("HOSPITAL_LOGO", admin);
    expect(signature.params.folder).toBe("ghms/hospitals/h1/hospital_logo");
    expect(signature.publicId.startsWith(`${signature.params.folder}/`)).toBe(true);
    expect(signature.params.overwrite).toBe("false");
    expect(signature.accessMode).toBe("PUBLIC");
  });

  it("marks patient documents as authenticated raw assets", () => {
    const service = new MediaService(ctx.db);
    const signature = service.generateUploadSignature("PATIENT_DOCUMENT", admin);
    expect(signature.params).toMatchObject({ resource_type: "raw", access_mode: "authenticated" });
    expect(signature.accessMode).toBe("AUTHENTICATED");
  });

  it("rejects tampered upload tokens", async () => {
    const service = new MediaService(ctx.db);
    const token = service.generateUploadSignature("STAFF_AVATAR", admin).uploadToken;
    await expect(service.registerUploadedAsset({
      uploadToken: `${token}x`, secureUrl: "", category: "STAFF_AVATAR", mimeType: "image/png", sizeBytes: 1,
    }, admin)).rejects.toThrow(/token/i);
  });

  it("verifies the Cloudinary response before storing an asset", async () => {
    const service = new MediaService(ctx.db);
    const signed = service.generateUploadSignature("STAFF_AVATAR", admin);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        public_id: signed.publicId, bytes: 1024, format: "png",
        secure_url: `https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/image/upload/v1/${signed.publicId}.png`,
      }),
    }));
    const asset = await service.registerUploadedAsset({
      uploadToken: signed.uploadToken,
      secureUrl: `https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/image/upload/${signed.publicId}.png`,
      category: "STAFF_AVATAR", mimeType: "image/png", sizeBytes: 1024,
    }, admin);
    expect(asset).toMatchObject({ publicId: signed.publicId, category: "STAFF_AVATAR", accessMode: "PUBLIC" });
    expect(ctx.db.mediaAsset.create).toHaveBeenCalledTimes(1);
  });

  it("signs delivery URLs for authenticated assets", async () => {
    const service = new MediaService(ctx.db);
    ctx.db.mediaAsset.findUnique = vi.fn().mockResolvedValue({
      id: "asset-1", hospitalId: "h1", uploadedById: "u1", category: "MEDICAL_REPORT",
      assetTag: null, accessMode: "AUTHENTICATED", status: "ACTIVE",
      publicId: "ghms/hospitals/h1/medical_report/doc", secureUrl: "https://res.cloudinary.com/test/image/upload/doc",
    });
    const delivery = await service.getDeliveryUrl("asset-1", admin);
    expect(delivery.url).toContain("/raw/authenticated/");
    expect(delivery.url).toMatch(/signature=[a-f0-9]{40}/);
    expect(delivery.expiresAt).toBeTruthy();
  });
});
