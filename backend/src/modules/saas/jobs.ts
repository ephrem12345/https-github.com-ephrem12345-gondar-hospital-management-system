import type { PrismaClient } from "@prisma/client";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { SaasService } from "./service.js";

let running = false;

export async function runSubscriptionMaintenance(database: PrismaClient) {
  if (running) return { skipped: true, reason: "A maintenance run is already in progress" };
  running = true;
  try {
    const result = await new SaasService(database).processExpirations();
    logger.info(result, "Subscription maintenance completed");
    return result;
  } finally {
    running = false;
  }
}

export function startSubscriptionJobs(database: PrismaClient) {
  if (!env.SUBSCRIPTION_JOB_ENABLED) return () => undefined;
  const intervalMs = env.SUBSCRIPTION_JOB_INTERVAL_MINUTES * 60_000;
  const timer = setInterval(() => {
    void runSubscriptionMaintenance(database).catch((error) => {
      logger.error({ err: error }, "Scheduled subscription maintenance failed");
    });
  }, intervalMs);
  timer.unref();
  void runSubscriptionMaintenance(database).catch((error) => {
    logger.error({ err: error }, "Startup subscription maintenance failed");
  });
  return () => clearInterval(timer);
}
