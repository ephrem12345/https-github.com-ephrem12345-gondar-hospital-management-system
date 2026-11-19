import { Router } from "express";
import { type PrismaClient, UserRole } from "@prisma/client";
import { ClinicalMessagingService } from "./service.js";
import {
  createClinicalMessageSchema,
  listClinicalMessagesQuerySchema,
  replyClinicalMessageSchema,
  createConversationSchema,
  addConversationMembersSchema,
  sendConversationMessageSchema,
  acknowledgeMessageSchema,
  escalateMessageSchema,
  convertMessageToTaskSchema,
  updateTaskStatusSchema,
  listTasksQuerySchema,
  uploadAttachmentSchema,
  userSettingsSchema,
} from "./schemas.js";
import { requirePermission, requireRole } from "../../middleware/authenticate.js";
import { HttpError } from "../../utils/http-error.js";

function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] || "";
  return param || "";
}

export function clinicalMessagingRoutes(database: PrismaClient) {
  const router = Router();
  const service = new ClinicalMessagingService(database);

  // -----------------------------------------------------------
  // 0. ADMINISTRATIVE MONITORING & METRICS (PRIVACY-PRESERVING)
  // -----------------------------------------------------------
  router.get("/admin/metrics", requireRole(UserRole.ADMINISTRATOR), async (req, res, next) => {
    try {
      const data = await service.getAdminMetrics();
      res.json({ success: true, data });
    } catch (err) { next(err); }
  });

  // -----------------------------------------------------------
  // 1. CONVERSATIONS & CHANNELS
  // -----------------------------------------------------------
  router.get("/conversations", requirePermission("clinical.messages.read"), async (req, res, next) => {
    try {
      const actor = req.actor;
      if (!actor) throw new HttpError(401, "Authentication required", "UNAUTHENTICATED");
      const data = await service.listConversations(actor.userId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  });

  router.post("/conversations", requirePermission("clinical.messages.send"), async (req, res, next) => {
    try {
      const actor = req.actor;
      if (!actor) throw new HttpError(401, "Authentication required", "UNAUTHENTICATED");
      const input = createConversationSchema.parse(req.body);
      const data = await service.createConversation(actor, input, req.requestId);
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  });

  router.get("/conversations/:id/messages", requirePermission("clinical.messages.read"), async (req, res, next) => {
    try {
      const actor = req.actor;
      if (!actor) throw new HttpError(401, "Authentication required", "UNAUTHENTICATED");
      const id = getParam(req.params.id);
      const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
      const data = await service.getConversationMessages(id, actor.userId, page, limit);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  });

  router.post("/conversations/:id/messages", requirePermission("clinical.messages.send"), async (req, res, next) => {
    try {
      const actor = req.actor;
      if (!actor) throw new HttpError(401, "Authentication required", "UNAUTHENTICATED");
      const id = getParam(req.params.id);
      const input = sendConversationMessageSchema.parse(req.body);
      const data = await service.sendConversationMessage(id, actor, input, req.requestId);
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  });

  router.post("/conversations/:id/members", requirePermission("clinical.messages.send"), async (req, res, next) => {
    try {
      const actor = req.actor;
      if (!actor) throw new HttpError(401, "Authentication required", "UNAUTHENTICATED");
      const id = getParam(req.params.id);
      const input = addConversationMembersSchema.parse(req.body);
      const data = await service.addConversationMembers(id, actor, input.memberIds, req.requestId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  });

  router.delete("/conversations/:id/members/:userId", requirePermission("clinical.messages.send"), async (req, res, next) => {
    try {
      const actor = req.actor;
      if (!actor) throw new HttpError(401, "Authentication required", "UNAUTHENTICATED");
      const id = getParam(req.params.id);
      const targetUserId = getParam(req.params.userId);
      const data = await service.removeConversationMember(id, actor, targetUserId, req.requestId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  });

  // -----------------------------------------------------------
  // 2. CLINICAL TASKS (WORKFLOW AUTOMATION)
  // -----------------------------------------------------------
  router.get("/tasks", requirePermission("clinical.messages.read"), async (req, res, next) => {
    try {
      const actor = req.actor;
      if (!actor) throw new HttpError(401, "Authentication required", "UNAUTHENTICATED");
      const query = listTasksQuerySchema.parse(req.query);
      const data = await service.listTasks(actor, query);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  });

  router.patch("/tasks/:id/status", requirePermission("clinical.messages.reply"), async (req, res, next) => {
    try {
      const actor = req.actor;
      if (!actor) throw new HttpError(401, "Authentication required", "UNAUTHENTICATED");
      const id = getParam(req.params.id);
      const input = updateTaskStatusSchema.parse(req.body);
      const data = await service.updateTaskStatus(id, actor, input, req.requestId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  });

  // -----------------------------------------------------------
  // 3. SECURE ATTACHMENT DOWNLOAD & UPLOAD
  // -----------------------------------------------------------
  router.get("/attachments/:id/download", requirePermission("clinical.messages.read"), async (req, res, next) => {
    try {
      const actor = req.actor;
      if (!actor) throw new HttpError(401, "Authentication required", "UNAUTHENTICATED");
      const id = getParam(req.params.id);
      const file = await service.downloadAttachment(id, actor, req.requestId);
      res.setHeader("Content-Type", file.fileType);
      res.setHeader("Content-Disposition", `inline; filename="${file.fileName}"`);
      res.send(file.buffer);
    } catch (err) { next(err); }
  });

  // -----------------------------------------------------------
  // 4. USER COMMUNICATION SETTINGS
  // -----------------------------------------------------------
  router.get("/settings", requirePermission("clinical.messages.read"), async (req, res, next) => {
    try {
      const actor = req.actor;
      if (!actor) throw new HttpError(401, "Authentication required", "UNAUTHENTICATED");
      const data = await service.getUserSettings(actor.userId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  });

  router.patch("/settings", requirePermission("clinical.messages.read"), async (req, res, next) => {
    try {
      const actor = req.actor;
      if (!actor) throw new HttpError(401, "Authentication required", "UNAUTHENTICATED");
      const input = userSettingsSchema.parse(req.body);
      const data = await service.updateUserSettings(actor.userId, input);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  });

  // -----------------------------------------------------------
  // 5. IN-APP CLINICAL NOTIFICATIONS
  // -----------------------------------------------------------
  router.get("/notifications", requirePermission("clinical.messages.read"), async (req, res, next) => {
    try {
      const actor = req.actor;
      if (!actor) throw new HttpError(401, "Authentication required", "UNAUTHENTICATED");
      const unreadOnly = req.query.unreadOnly === "true";
      const data = await service.listNotifications(actor.userId, unreadOnly);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  });

  router.patch("/notifications/:id/read", requirePermission("clinical.messages.read"), async (req, res, next) => {
    try {
      const actor = req.actor;
      if (!actor) throw new HttpError(401, "Authentication required", "UNAUTHENTICATED");
      const id = getParam(req.params.id);
      const data = await service.markNotificationRead(id, actor.userId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  });

  router.post("/notifications/read-all", requirePermission("clinical.messages.read"), async (req, res, next) => {
    try {
      const actor = req.actor;
      if (!actor) throw new HttpError(401, "Authentication required", "UNAUTHENTICATED");
      const data = await service.markAllNotificationsRead(actor.userId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  });

  // -----------------------------------------------------------
  // 6. INBOX & SENT BOXES
  // -----------------------------------------------------------
  router.get("/inbox", requirePermission("clinical.messages.read"), async (req, res, next) => {
    try {
      const actor = req.actor;
      if (!actor) throw new HttpError(401, "Authentication required", "UNAUTHENTICATED");
      const query = listClinicalMessagesQuerySchema.parse(req.query);
      const data = await service.listInbox(actor.userId, query);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  });

  router.get("/sent", requirePermission("clinical.messages.read"), async (req, res, next) => {
    try {
      const actor = req.actor;
      if (!actor) throw new HttpError(401, "Authentication required", "UNAUTHENTICATED");
      const query = listClinicalMessagesQuerySchema.parse(req.query);
      const data = await service.listSent(actor.userId, query);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  });

  router.get("/unread-count", async (req, res, next) => {
    try {
      const actor = req.actor;
      if (!actor) throw new HttpError(401, "Authentication required", "UNAUTHENTICATED");
      const data = await service.getUnreadCounts(actor.userId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  });

  router.get("/staff-directory", async (req, res, next) => {
    try {
      const department = typeof req.query.department === "string" ? req.query.department : undefined;
      const data = await service.getStaffDirectory(department);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  });

  router.get("/patient-history/:patientId", requirePermission("clinical.messages.read"), async (req, res, next) => {
    try {
      const patientId = getParam(req.params.patientId);
      const data = await service.getPatientMessages(patientId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  });

  // -----------------------------------------------------------
  // 7. MESSAGE DETAILS & ACTIONS
  // -----------------------------------------------------------
  router.get("/conversations/:id", requirePermission("clinical.messages.read"), async (req, res, next) => {
    try {
      const actor = req.actor;
      if (!actor) throw new HttpError(401, "Authentication required", "UNAUTHENTICATED");
      const id = getParam(req.params.id);
      const data = await service.getConversation(id, actor.userId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  });

  router.post("/", requirePermission("clinical.messages.send"), async (req, res, next) => {
    try {
      const actor = req.actor;
      if (!actor) throw new HttpError(401, "Authentication required", "UNAUTHENTICATED");
      const input = createClinicalMessageSchema.parse(req.body);
      const data = await service.sendMessage(actor, input, req.requestId);
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  });

  router.post("/:id/reply", requirePermission("clinical.messages.reply"), async (req, res, next) => {
    try {
      const actor = req.actor;
      if (!actor) throw new HttpError(401, "Authentication required", "UNAUTHENTICATED");
      const id = getParam(req.params.id);
      const input = replyClinicalMessageSchema.parse(req.body);
      const data = await service.replyMessage(id, actor, input.content, input.priority, req.requestId);
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  });

  router.post("/:id/read", requirePermission("clinical.messages.read"), async (req, res, next) => {
    try {
      const actor = req.actor;
      if (!actor) throw new HttpError(401, "Authentication required", "UNAUTHENTICATED");
      const id = getParam(req.params.id);
      const data = await service.markAsRead(id, actor.userId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  });

  router.post("/:id/acknowledge", requirePermission("clinical.messages.reply"), async (req, res, next) => {
    try {
      const actor = req.actor;
      if (!actor) throw new HttpError(401, "Authentication required", "UNAUTHENTICATED");
      const id = getParam(req.params.id);
      const input = acknowledgeMessageSchema.parse(req.body);
      const data = await service.acknowledgeMessage(id, actor, input, req.requestId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  });

  router.post("/:id/escalate", requirePermission("clinical.messages.send"), async (req, res, next) => {
    try {
      const actor = req.actor;
      if (!actor) throw new HttpError(401, "Authentication required", "UNAUTHENTICATED");
      const id = getParam(req.params.id);
      const input = escalateMessageSchema.parse(req.body);
      const data = await service.escalateMessage(id, actor, input, req.requestId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  });

  router.post("/:id/convert-task", requirePermission("clinical.messages.send"), async (req, res, next) => {
    try {
      const actor = req.actor;
      if (!actor) throw new HttpError(401, "Authentication required", "UNAUTHENTICATED");
      const id = getParam(req.params.id);
      const input = convertMessageToTaskSchema.parse(req.body);
      const data = await service.convertMessageToTask(id, actor, input, req.requestId);
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  });

  router.post("/:id/attachments", requirePermission("clinical.messages.send"), async (req, res, next) => {
    try {
      const actor = req.actor;
      if (!actor) throw new HttpError(401, "Authentication required", "UNAUTHENTICATED");
      const id = getParam(req.params.id);
      const input = uploadAttachmentSchema.parse(req.body);
      const data = await service.uploadAttachment(id, actor, input, req.requestId);
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  });

  return router;
}
