import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import type { PrismaClient } from "@prisma/client";
import { env, allowedOrigins } from "./config/env.js";
import { logger } from "./config/logger.js";
import { authenticate, setAuthDatabase } from "./middleware/authenticate.js";
import { errorHandler } from "./middleware/error-handler.js";
import { appointmentRoutes } from "./modules/appointments/routes.js";
import { AppointmentService } from "./modules/appointments/service.js";
import { emergencyRoutes } from "./modules/emergency/routes.js";
import { EmergencyService } from "./modules/emergency/service.js";
import { authRoutes } from "./modules/auth/routes.js";
import { NotificationService } from "./modules/notifications/service.js";
import { portalRoutes } from "./modules/portal/routes.js";
import { PortalService } from "./modules/portal/service.js";
import { clinicalMessagingRoutes } from "./modules/clinical-messaging/routes.js";
import { laboratoryRoutes } from "./modules/laboratory/routes.js";
import { saasRoutes } from "./modules/saas/routes.js";
import { SaasService } from "./modules/saas/service.js";
import { paymentRoutes } from "./modules/payments/routes.js";
import { ChapaPaymentService } from "./modules/payments/chapa.service.js";
import { mediaRoutes } from "./modules/media/routes.js";
import { MediaService } from "./modules/media/service.js";
import { HttpError } from "./utils/http-error.js";

const openApi = {
  openapi: "3.0.3",
  info: {
    title: "Gondar Hospital Management System API",
    version: "1.0.0",
    description: "GHMS API foundation with appointments, emergency workflows, specialist department workflows, and the patient portal.",
  },
  servers: [{ url: "/api/v1" }],
  components: {
    securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } },
    schemas: {
      ApiError: {
        type: "object",
        required: ["success", "error"],
        properties: {
          success: { type: "boolean", example: false },
          error: {
            type: "object",
            properties: { code: { type: "string" }, message: { type: "string" }, requestId: { type: "string" } },
          },
        },
      },
    },
  },
  paths: {
    "/health": { get: { summary: "Liveness check", responses: { "200": { description: "API process is alive" } } } },
    "/ready": { get: { summary: "Database readiness check", responses: { "200": { description: "API and database are ready" }, "503": { description: "Database is unavailable" } } } },
    "/appointments": {
      get: { summary: "List appointments by date, department, doctor, or status", security: [{ bearerAuth: [] }], responses: { "200": { description: "Paginated appointment list" } } },
      post: { summary: "Book an appointment", security: [{ bearerAuth: [] }], responses: { "201": { description: "Appointment created" }, "409": { description: "Slot unavailable or conflict" } } },
    },
    "/appointments/{id}": { get: { summary: "Read appointment", security: [{ bearerAuth: [] }], responses: { "200": { description: "Appointment details" } } }, patch: { summary: "Update or reschedule appointment", security: [{ bearerAuth: [] }], responses: { "200": { description: "Appointment updated" } } } },
    "/appointments/{id}/cancel": { patch: { summary: "Cancel appointment", security: [{ bearerAuth: [] }], responses: { "200": { description: "Cancellation recorded" } } } },
    "/appointments/{id}/status": { patch: { summary: "Update appointment status", security: [{ bearerAuth: [] }], responses: { "200": { description: "Status updated" } } } },
    "/doctors": { get: { summary: "List active doctors and schedules", security: [{ bearerAuth: [] }], responses: { "200": { description: "Doctor directory" } } }, post: { summary: "Create a doctor profile (administrator)", security: [{ bearerAuth: [] }], responses: { "201": { description: "Doctor profile created" } } } },
    "/doctors/availability": { get: { summary: "List available doctor slots for a day", security: [{ bearerAuth: [] }], responses: { "200": { description: "Doctor availability" } } } },
    "/queue": { get: { summary: "List department queue", security: [{ bearerAuth: [] }], responses: { "200": { description: "Paginated queue" } } } },
    "/queue/public": { get: { summary: "Public waiting-room queue numbers without patient identifiers", responses: { "200": { description: "Public queue display" } } } },
    "/queue/check-in": { post: { summary: "Check in an appointment to the queue", security: [{ bearerAuth: [] }], responses: { "201": { description: "Queue entry created" } } } },
    "/queue/call-next": { post: { summary: "Call next waiting patient in a department", security: [{ bearerAuth: [] }], responses: { "200": { description: "Queue entry called" } } } },
    "/queue/{id}/status": { patch: { summary: "Advance queue state", security: [{ bearerAuth: [] }], responses: { "200": { description: "Queue state updated" } } } },
    "/queue/{id}/transfer": { post: { summary: "Transfer patient to another department queue", security: [{ bearerAuth: [] }], responses: { "201": { description: "New queue entry created" } } } },
    "/portal/dashboard": { get: { summary: "Patient portal overview bundle", security: [{ bearerAuth: [] }], responses: { "200": { description: "Profile, appointments, billing and notifications" }, "403": { description: "Not a patient account" } } } },
    "/portal/profile": {
      get: { summary: "Patient profile", security: [{ bearerAuth: [] }], responses: { "200": { description: "Patient profile" } } },
      patch: { summary: "Update permitted contact information", security: [{ bearerAuth: [] }], responses: { "200": { description: "Updated profile" } } },
    },
    "/portal/appointments": {
      get: { summary: "List the patient's own appointments", security: [{ bearerAuth: [] }], responses: { "200": { description: "Paginated appointments" } } },
      post: { summary: "Request an appointment", security: [{ bearerAuth: [] }], responses: { "201": { description: "Appointment created" }, "409": { description: "Slot unavailable" } } },
    },
    "/portal/appointments/{id}/change": { patch: { summary: "Cancel or reschedule an owned appointment", security: [{ bearerAuth: [] }], responses: { "200": { description: "Change applied" }, "403": { description: "Not the patient's appointment" } } } },
    "/portal/visits": { get: { summary: "Patient visit history", security: [{ bearerAuth: [] }], responses: { "200": { description: "Visit summaries" } } } },
    "/portal/medical-records": { get: { summary: "Released diagnoses and laboratory results", security: [{ bearerAuth: [] }], responses: { "200": { description: "Released records only" } } } },
    "/portal/billing": { get: { summary: "Patient invoices and payments", security: [{ bearerAuth: [] }], responses: { "200": { description: "Billing summary" } } } },
    "/portal/notifications": { get: { summary: "List portal notifications with unread count", security: [{ bearerAuth: [] }], responses: { "200": { description: "Notifications" } } } },
    "/portal/notifications/{id}/read": { post: { summary: "Mark one notification read", security: [{ bearerAuth: [] }], responses: { "200": { description: "Marked read" } } } },
    "/portal/notifications/read-all": { post: { summary: "Mark all notifications read", security: [{ bearerAuth: [] }], responses: { "200": { description: "Marked read" } } } },
    "/portal/announcements": { get: { summary: "Active hospital announcements", security: [{ bearerAuth: [] }], responses: { "200": { description: "Announcements" } } } },
    "/portal/support-requests": {
      get: { summary: "List the patient's feedback, complaints and support requests", security: [{ bearerAuth: [] }], responses: { "200": { description: "Support requests" } } },
      post: { summary: "Submit feedback, complaint or support request", security: [{ bearerAuth: [] }], responses: { "201": { description: "Request created" } } },
    },
  },
};

export function createApp(database: PrismaClient) {
  setAuthDatabase(database);
  const app = express();
  const service = new AppointmentService(database);
  const emergencyService = new EmergencyService(database);

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      const normalized = origin.replace(/\/+$/, "");
      if (allowedOrigins.includes(normalized)) return callback(null, true);
      return callback(null, false);
    },
  }));
  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ limit: "25mb", extended: true }));
  app.use((request, response, next) => {
    request.requestId = crypto.randomUUID();
    response.setHeader("x-request-id", request.requestId);
    next();
  });
  app.use(pinoHttp({ logger, genReqId: (request) => (request as typeof request & { requestId: string }).requestId }));

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: env.NODE_ENV === "development" || env.NODE_ENV === "test" ? 200 : 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { success: false, error: { code: "RATE_LIMITED", message: "Too many authentication attempts" } },
  });
  app.use("/api/v1/auth", authRoutes(database, authLimiter));

  app.get("/api/v1/health", (_request, response) => {
    const timestamp = new Date().toISOString();
    response.json({
      success: true,
      status: "ok",
      service: "GHMS API",
      timestamp,
      data: { status: "ok", service: "GHMS API", timestamp },
    });
  });
  app.get("/api/v1/ready", async (_request, response) => {
    try {
      await database.$queryRaw`SELECT 1`;
      response.json({
        success: true,
        status: "ready",
        service: "GHMS API",
        data: { status: "ready", service: "GHMS API", database: "connected" },
      });
    } catch (error) {
      logger.error({ err: error }, "Readiness check failed");
      response.status(503).json({
        success: false,
        status: "not_ready",
        service: "GHMS API",
        error: { code: "NOT_READY", message: "Database is unavailable" },
      });
    }
  });

  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApi));
  app.get("/api/openapi.json", (_request, response) => response.json(openApi));

  // Public waiting room queue numbers (no authentication required, masks patient identifiers)
  app.get("/api/v1/queue/public", async (request, response, next) => {
    try {
      const date = typeof request.query.date === "string" ? request.query.date : undefined;
      const department = typeof request.query.department === "string" ? request.query.department : undefined;
      const data = await service.publicQueue(date, department);
      response.json({ success: true, data });
    } catch (error) { next(error); }
  });

  const notificationService = new NotificationService(database);
  const portalService = new PortalService(database, service, notificationService);
  const saasService = new SaasService(database);
  const paymentService = new ChapaPaymentService(database);
  const mediaService = new MediaService(database);

  app.use("/api/v1", portalRoutes(portalService));
  app.use("/api/v1", saasRoutes(saasService));
  app.use("/api/v1", paymentRoutes(paymentService));
  app.use("/api/v1", mediaRoutes(mediaService));

  app.use("/api/v1", authenticate, appointmentRoutes(service));
  app.use("/api/v1", authenticate, emergencyRoutes(emergencyService));
  app.use("/api/v1/clinical-messages", authenticate, clinicalMessagingRoutes(database));
  app.use("/api/v1/laboratory", authenticate, laboratoryRoutes(database));
  app.use((_request, _response, next) => next(new HttpError(404, "Route not found", "NOT_FOUND")));
  app.use(errorHandler);
  return app;
}

export { env };
