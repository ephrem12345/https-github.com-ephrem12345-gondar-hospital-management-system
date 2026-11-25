import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

const configDir = typeof __dirname !== "undefined" ? __dirname : path.resolve("backend/src/config");
// Explicitly resolve and load backend/.env relative to this directory, then load cwd .env
dotenv.config({ path: path.resolve(configDir, "../../.env") });
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  WEB_ORIGINS: z.string().default("http://localhost:3000,http://127.0.0.1:3000,http://localhost:3002,http://127.0.0.1:3002"),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_ISSUER: z.string().min(1).default("ghms-api"),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
  COOKIE_SECURE: z.stringbool().default(false),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  PATIENT_REGISTRATION_REQUIRES_VERIFICATION: z.stringbool().default(false),
  TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(1),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(300),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  PUBLIC_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),

  PAYMENT_GATEWAY: z.enum(["chapa", "simulation"]).default(
    process.env.NODE_ENV === "production" ? "chapa" : "simulation"
  ),
  CHAPA_MODE: z.enum(["test", "live"]).default("test"),
  CHAPA_SECRET_KEY: z.string().min(1).optional(),
  CHAPA_PUBLIC_KEY: z.string().min(1).optional(),
  CHAPA_WEBHOOK_SECRET: z.string().min(16).optional(),
  CHAPA_BASE_URL: z.string().url().default("https://api.chapa.co/v1"),
  CHAPA_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
  FRONTEND_URL: z.string().url().default("http://localhost:3002"),
  BACKEND_PUBLIC_URL: z.string().url().optional(),

  CLOUDINARY_CLOUD_NAME: z.string().min(1).optional(),
  CLOUDINARY_API_KEY: z.string().min(1).optional(),
  CLOUDINARY_API_SECRET: z.string().min(1).optional(),
  CLOUDINARY_BASE_URL: z.string().url().default("https://api.cloudinary.com/v1_1"),

  SUBSCRIPTION_JOB_ENABLED: z.stringbool().default(true),
  SUBSCRIPTION_JOB_INTERVAL_MINUTES: z.coerce.number().int().positive().default(60),
  CRON_SECRET: z.string().min(16).optional(),
  TRIAL_DAYS: z.coerce.number().int().positive().default(30),
  TRIAL_GRACE_DAYS: z.coerce.number().int().nonnegative().default(7),
  SUBSCRIPTION_GRACE_DAYS: z.coerce.number().int().nonnegative().default(14),
}).superRefine((value, context) => {
  const production = value.NODE_ENV === "production";
  const simulating = value.PAYMENT_GATEWAY === "simulation";

  if (production && simulating) {
    context.addIssue({ code: "custom", path: ["PAYMENT_GATEWAY"], message: "Simulated payments are never allowed in production" });
  }
  if (production && !value.CHAPA_SECRET_KEY) {
    context.addIssue({ code: "custom", path: ["CHAPA_SECRET_KEY"], message: "CHAPA_SECRET_KEY is required in production" });
  }
  if (production && !value.CHAPA_WEBHOOK_SECRET) {
    context.addIssue({ code: "custom", path: ["CHAPA_WEBHOOK_SECRET"], message: "CHAPA_WEBHOOK_SECRET is required in production" });
  }
  if (!production && !simulating && !value.CHAPA_SECRET_KEY) {
    context.addIssue({ code: "custom", path: ["CHAPA_SECRET_KEY"], message: "Set CHAPA_SECRET_KEY or explicitly select PAYMENT_GATEWAY=simulation for local development" });
  }
  if (production && (!value.CLOUDINARY_CLOUD_NAME || !value.CLOUDINARY_API_KEY || !value.CLOUDINARY_API_SECRET)) {
    context.addIssue({ code: "custom", path: ["CLOUDINARY_CLOUD_NAME"], message: "All CLOUDINARY_* credentials are required in production" });
  }
  if (production && !value.CRON_SECRET) {
    context.addIssue({ code: "custom", path: ["CRON_SECRET"], message: "CRON_SECRET is required in production for scheduled billing jobs" });
  }
  if (production && value.COOKIE_SECURE !== true) {
    context.addIssue({ code: "custom", path: ["COOKIE_SECURE"], message: "COOKIE_SECURE must be true in production" });
  }
  if (value.PAYMENT_GATEWAY === "chapa" && value.CHAPA_MODE === "live" && value.CHAPA_SECRET_KEY?.startsWith("CHASECK_TEST-")) {
    context.addIssue({ code: "custom", path: ["CHAPA_SECRET_KEY"], message: "Test keys (CHASECK_TEST-*) cannot be used when CHAPA_MODE=live" });
  }
});

export const env = envSchema.parse(process.env);

export const simulationPaymentsEnabled = env.PAYMENT_GATEWAY === "simulation" && env.NODE_ENV !== "production";

export const isChapaTestMode = env.CHAPA_MODE === "test";

export const cloudinaryConfigured = Boolean(
  env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET,
);

export const allowedOrigins = env.WEB_ORIGINS.split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);
