import type { RequestHandler } from "express";
import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import { UserRole } from "@prisma/client";
import { AuthService, authCookies } from "./service.js";
import {
  changePasswordSchema,
  createStaffSchema,
  forgotPasswordSchema,
  listUsersQuerySchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateUserStatusSchema,
} from "./schemas.js";
import { authenticate, requireRole } from "../../middleware/authenticate.js";
import { HttpError } from "../../utils/http-error.js";

const noopMiddleware: RequestHandler = (_req, _res, next) => next();

export function authRoutes(database: PrismaClient, rateLimiter: RequestHandler = noopMiddleware) {
  const router = Router();
  const service = new AuthService(database);

  router.post("/login", rateLimiter, async (request, response, next) => {
    try {
      const input = loginSchema.parse(request.body);
      const user = await service.login(input.identifier, input.password, input.remember, request.requestId, response, input.expectedRoles);
      response.json({ success: true, data: user });
    } catch (error) { next(error); }
  });

  router.post("/register", rateLimiter, async (request, response, next) => {
    try {
      const input = registerSchema.parse(request.body);
      const user = await service.register(input, request.requestId);
      response.status(201).json({ success: true, data: user });
    } catch (error) { next(error); }
  });

  router.post("/refresh", async (request, response, next) => {
    try {
      const result = await service.refresh(authCookies.getCookie(request.header("cookie"), authCookies.refreshName), response);
      response.json({ success: true, data: result });
    } catch (error) { next(error); }
  });

  router.post("/logout", async (request, response, next) => {
    try {
      const result = await service.logout(authCookies.getCookie(request.header("cookie"), authCookies.refreshName), response);
      response.json({ success: true, data: result });
    } catch (error) { next(error); }
  });

  router.get("/me", authenticate, async (request, response, next) => {
    try {
      const userId = request.actor?.userId;
      if (!userId) throw new HttpError(401, "Authentication is required", "UNAUTHENTICATED");
      const user = await service.me(userId);
      response.json({ success: true, data: user });
    } catch (error) { next(error); }
  });

  router.post("/change-password", authenticate, async (request, response, next) => {
    try {
      const userId = request.actor?.userId;
      if (!userId) throw new HttpError(401, "Authentication is required", "UNAUTHENTICATED");
      const input = changePasswordSchema.parse(request.body);
      const result = await service.changePassword(userId, input.currentPassword, input.password, request.requestId);
      response.json({ success: true, data: result });
    } catch (error) { next(error); }
  });

  router.post("/forgot-password", rateLimiter, async (request, response, next) => {
    try {
      const input = forgotPasswordSchema.parse(request.body);
      const result = await service.forgotPassword(input.identifier, request.requestId);
      response.json({ success: true, data: result });
    } catch (error) { next(error); }
  });

  router.post("/reset-password", rateLimiter, async (request, response, next) => {
    try {
      const input = resetPasswordSchema.parse(request.body);
      const result = await service.resetPassword(input.token, input.password, request.requestId);
      response.json({ success: true, data: result });
    } catch (error) { next(error); }
  });

  // Administrator Account Management Routes
  router.get("/users", authenticate, requireRole(UserRole.ADMINISTRATOR), async (request, response, next) => {
    try {
      const query = listUsersQuerySchema.parse(request.query);
      const result = await service.listUsers(query);
      response.json({ success: true, data: result });
    } catch (error) { next(error); }
  });

  router.patch("/users/:id/status", authenticate, requireRole(UserRole.ADMINISTRATOR), async (request, response, next) => {
    try {
      const adminActorId = request.actor?.userId;
      if (!adminActorId) throw new HttpError(401, "Authentication is required", "UNAUTHENTICATED");
      const rawTargetId = request.params.id;
      const targetUserId = Array.isArray(rawTargetId) ? rawTargetId[0] : rawTargetId;
      if (!targetUserId) throw new HttpError(400, "User ID is required", "INVALID_USER_ID");
      const input = updateUserStatusSchema.parse(request.body);
      const result = await service.updateUserStatus(targetUserId, input.status, adminActorId, request.requestId, input.reason);
      response.json({ success: true, data: result });
    } catch (error) { next(error); }
  });

  router.post("/staff", authenticate, requireRole(UserRole.ADMINISTRATOR), async (request, response, next) => {
    try {
      const adminActorId = request.actor?.userId;
      if (!adminActorId) throw new HttpError(401, "Authentication is required", "UNAUTHENTICATED");
      const input = createStaffSchema.parse(request.body);
      const result = await service.createStaff(input, adminActorId, request.requestId);
      response.status(201).json({ success: true, data: result });
    } catch (error) { next(error); }
  });

  return router;
}
