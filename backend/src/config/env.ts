import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  WEB_ORIGINS: z.string().default("http://localhost:3000,http://127.0.0.1:3000,http://localhost:3002,http://127.0.0.1:3002"),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
  COOKIE_SECURE: z.stringbool().default(false),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  PATIENT_REGISTRATION_REQUIRES_VERIFICATION: z.stringbool().default(false),
  CHAPA_SECRET_KEY: z.string().default("CHASECK_TEST-mock-chapa-secret-key-ghms"),
  CHAPA_PUBLIC_KEY: z.string().default("CHAPUBK_TEST-mock-chapa-public-key-ghms"),
  CHAPA_WEBHOOK_SECRET: z.string().default("mock-chapa-webhook-secret-key-ghms"),
  CHAPA_BASE_URL: z.string().default("https://api.chapa.co/v1"),
  FRONTEND_URL: z.string().default("http://localhost:3002"),
  CLOUDINARY_CLOUD_NAME: z.string().default("ghms-cloud"),
  CLOUDINARY_API_KEY: z.string().default("mock-cloudinary-key"),
  CLOUDINARY_API_SECRET: z.string().default("mock-cloudinary-secret"),
});

export const env = envSchema.parse(process.env);
export const allowedOrigins = env.WEB_ORIGINS.split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);
