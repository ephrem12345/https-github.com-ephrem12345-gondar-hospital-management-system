import { Router } from "express";
import { UserRole } from "@prisma/client";
import { authenticate, requireRole } from "../../middleware/authenticate.js";
import { parseId, param } from "../../utils/params.js";
import type { PortalService } from "./service.js";

export function portalRoutes(service: PortalService) {
  const router = Router();
  const patientOnly = [authenticate, requireRole(UserRole.PATIENT)] as const;

  router.get("/portal/dashboard", ...patientOnly, async (request, response, next) => {
    try {
      response.json({ success: true, data: await service.dashboard(request.actor!) });
    } catch (error) { next(error); }
  });

  router.get("/portal/profile", ...patientOnly, async (request, response, next) => {
    try {
      response.json({ success: true, data: await service.profile(request.actor!) });
    } catch (error) { next(error); }
  });

  router.patch("/portal/profile", ...patientOnly, async (request, response, next) => {
    try {
      const data = await service.updateProfile(request.actor!, request.body);
      response.json({ success: true, data });
    } catch (error) { next(error); }
  });

  router.get("/portal/appointments", ...patientOnly, async (request, response, next) => {
    try {
      const data = await service.listAppointments(request.actor!, request.query as Record<string, unknown>);
      response.json({ success: true, data });
    } catch (error) { next(error); }
  });

  router.post("/portal/appointments", ...patientOnly, async (request, response, next) => {
    try {
      const data = await service.requestAppointment(request.actor!, request.body);
      response.status(201).json({ success: true, data });
    } catch (error) { next(error); }
  });

  router.patch("/portal/appointments/:id/change", ...patientOnly, async (request, response, next) => {
    try {
      const data = await service.changeAppointment(request.actor!, parseId(request.params.id), request.body);
      response.json({ success: true, data });
    } catch (error) { next(error); }
  });

  router.get("/portal/visits", ...patientOnly, async (request, response, next) => {
    try {
      response.json({ success: true, data: await service.visits(request.actor!) });
    } catch (error) { next(error); }
  });

  router.get("/portal/medical-records", ...patientOnly, async (request, response, next) => {
    try {
      response.json({ success: true, data: await service.medicalRecords(request.actor!) });
    } catch (error) { next(error); }
  });

  router.get("/portal/billing", ...patientOnly, async (request, response, next) => {
    try {
      response.json({ success: true, data: await service.billing(request.actor!) });
    } catch (error) { next(error); }
  });

  router.get("/portal/notifications", ...patientOnly, async (request, response, next) => {
    try {
      response.json({ success: true, data: await service.listNotifications(request.actor!) });
    } catch (error) { next(error); }
  });

  router.post("/portal/notifications/:id/read", ...patientOnly, async (request, response, next) => {
    try {
      const data = await service.markNotificationRead(request.actor!, parseId(request.params.id));
      response.json({ success: true, data });
    } catch (error) { next(error); }
  });

  router.post("/portal/notifications/read-all", ...patientOnly, async (request, response, next) => {
    try {
      const data = await service.markAllNotificationsRead(request.actor!);
      response.json({ success: true, data });
    } catch (error) { next(error); }
  });

  router.get("/portal/announcements", ...patientOnly, async (_request, response, next) => {
    try {
      response.json({ success: true, data: await service.announcements() });
    } catch (error) { next(error); }
  });

  router.post("/portal/support-requests", ...patientOnly, async (request, response, next) => {
    try {
      const data = await service.submitSupportRequest(request.actor!, request.body);
      response.status(201).json({ success: true, data });
    } catch (error) { next(error); }
  });

  router.get("/portal/support-requests", ...patientOnly, async (request, response, next) => {
    try {
      response.json({ success: true, data: await service.listSupportRequests(request.actor!) });
    } catch (error) { next(error); }
  });

  return router;
}
