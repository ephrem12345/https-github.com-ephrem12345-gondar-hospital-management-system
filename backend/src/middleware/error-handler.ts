import type { ErrorRequestHandler } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { logger } from "../config/logger.js";
import { HttpError } from "../utils/http-error.js";

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  if (error instanceof HttpError) {
    response.status(error.status).json({
      success: false,
      error: { code: error.code, message: error.message, requestId: request.requestId },
    });
    return;
  }

  if (error instanceof SyntaxError && "body" in error) {
    response.status(400).json({
      success: false,
      error: { code: "INVALID_JSON", message: "Request body must be valid JSON", requestId: request.requestId },
    });
    return;
  }

  if (typeof error === "object" && error !== null && "type" in error && error.type === "entity.too.large") {
    response.status(413).json({
      success: false,
      error: { code: "PAYLOAD_TOO_LARGE", message: "Request body is too large", requestId: request.requestId },
    });
    return;
  }

  if (error instanceof z.ZodError) {
    const firstIssue = error.issues[0];
    const message = firstIssue?.message || "Invalid input data";
    response.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message, requestId: request.requestId },
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const target = String(error.meta?.target || "");
      let message = "The requested record conflicts with existing data";
      let code = "CONFLICT";
      if (target.includes("email")) {
        message = "An account with this email address already exists";
        code = "EMAIL_ALREADY_EXISTS";
      } else if (target.includes("phone")) {
        message = "An account with this phone number already exists";
        code = "PHONE_ALREADY_EXISTS";
      }
      response.status(409).json({
        success: false,
        error: { code, message, requestId: request.requestId },
      });
      return;
    }
    if (error.code === "P2025") {
      response.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "The requested record was not found", requestId: request.requestId },
      });
      return;
    }
  }

  if (
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientRustPanicError
  ) {
    logger.error({ err: error, requestId: request.requestId }, "Database connection failed");
    response.status(503).json({
      success: false,
      error: {
        code: "DATABASE_UNAVAILABLE",
        message: "Hospital database service is temporarily unavailable. Please verify MySQL connectivity.",
        requestId: request.requestId,
      },
    });
    return;
  }

  logger.error({ err: error, requestId: request.requestId }, "Unhandled request error");
  response.status(500).json({
    success: false,
    error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred", requestId: request.requestId },
  });
};
