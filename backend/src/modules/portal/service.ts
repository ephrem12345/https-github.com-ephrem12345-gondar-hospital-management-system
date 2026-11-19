import type { PrismaClient } from "@prisma/client";
import { HttpError } from "../../utils/http-error.js";
import { AppointmentService, isAvailableAt, localDateTime } from "../appointments/service.js";
import { NotificationService } from "../notifications/service.js";
import {
  portalAppointmentChangeSchema,
  portalAppointmentRequestSchema,
  portalProfileUpdateSchema,
  portalSupportRequestSchema,
} from "./schemas.js";
import { addLocalDays, dayOfWeek } from "../../utils/date.js";

type Actor = NonNullable<Express.Request["actor"]>;

const encounterStatusLabels: Record<string, string> = { ACTIVE: "Ongoing", COMPLETED: "Completed" };
const invoiceStatusLabels: Record<string, string> = { UNPAID: "Unpaid", PARTIALLY_PAID: "Partially paid", PAID: "Paid", VOID: "Void" };

export class PortalService {
  constructor(
    private readonly db: PrismaClient,
    private readonly appointments: AppointmentService,
    private readonly notifier: NotificationService,
  ) {}

  /** Every portal query derives identity from the authenticated session; the client never supplies a patient id. */
  private async requirePatient(actor: Actor) {
    if (actor.role !== "PATIENT" || !actor.patientId) {
      throw new HttpError(403, "The patient portal is only available to patient accounts", "FORBIDDEN");
    }
    const patient = await this.db.patient.findUnique({ where: { id: actor.patientId } });
    if (!patient || patient.userId !== actor.userId) {
      throw new HttpError(403, "No verified patient record is linked to this account", "PATIENT_RECORD_NOT_LINKED");
    }
    return patient;
  }

  private fullName(patient: { firstName: string; middleName: string | null; lastName: string }) {
    return [patient.firstName, patient.middleName, patient.lastName].filter(Boolean).join(" ");
  }

  private presentProfile(patient: Awaited<ReturnType<PortalService["requirePatient"]>>) {
    return {
      patientNumber: patient.patientNumber,
      fullName: this.fullName(patient),
      dateOfBirth: patient.dateOfBirth.toISOString().slice(0, 10),
      gender: patient.sex,
      phone: patient.phone,
      email: patient.email ?? "",
      address: patient.address ?? "",
      emergencyContactName: patient.emergencyContactName ?? "",
      emergencyContactPhone: patient.emergencyPhone ?? "",
    };
  }

  private async audit(actor: Actor, action: string, entityType: string, entityId: string) {
    await this.db.auditLog.create({ data: { actorId: actor.userId, action, entityType, entityId } });
  }

  async dashboard(actor: Actor) {
    const patient = await this.requirePatient(actor);
    const now = new Date();
    const [upcoming, unreadCount, outstanding, visits, notifications] = await Promise.all([
      this.db.appointment.findMany({
        where: { patientId: patient.id, status: { in: ["SCHEDULED", "CONFIRMED"] }, scheduledAt: { gte: now } },
        include: { doctor: true },
        orderBy: { scheduledAt: "asc" },
        take: 5,
      }),
      this.db.portalNotification.count({ where: { patientId: patient.id, readAt: null } }),
      this.db.invoice.aggregate({
        where: { patientId: patient.id, status: { in: ["UNPAID", "PARTIALLY_PAID"] } },
        _sum: { total: true, paidAmount: true },
      }),
      this.db.clinicalEncounter.findMany({ where: { patientId: patient.id }, include: { clinician: true }, orderBy: { startedAt: "desc" }, take: 3 }),
      this.db.portalNotification.findMany({ where: { patientId: patient.id }, orderBy: { createdAt: "desc" }, take: 3 }),
    ]);
    return {
      profile: this.presentProfile(patient),
      upcomingAppointments: upcoming.map((appointment) => ({
        id: appointment.id,
        date: appointment.scheduledAt.toISOString().slice(0, 10),
        time: appointment.scheduledAt.toISOString().slice(11, 16),
        department: appointment.department,
        doctor: appointment.doctor.name,
        status: appointment.status === "CONFIRMED" ? "Confirmed" : "Requested",
      })),
      outstandingBalance: Number(outstanding._sum.total ?? 0) - Number(outstanding._sum.paidAmount ?? 0),
      recordCount: await this.countRecords(patient.id),
      unreadNotifications: unreadCount,
      visits: visits.map((encounter) => ({
        id: encounter.id,
        date: encounter.startedAt.toISOString().slice(0, 10),
        department: encounter.department,
        clinician: encounter.clinician ? `${encounter.clinician.firstName} ${encounter.clinician.lastName}` : "Care team",
        summary: `${encounter.department} visit — ${encounterStatusLabels[encounter.status] ?? encounter.status}`,
      })),
      notifications: notifications.map((notification) => ({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        category: notification.category,
        createdAt: notification.createdAt.toISOString().slice(0, 10),
        read: notification.readAt !== null,
      })),
    };
  }

  private async countRecords(patientId: string) {
    const [diagnoses, releasedResults] = await Promise.all([
      this.db.diagnosisRecord.count({ where: { patientId } }),
      this.db.laboratoryResult.count({ where: { status: "RELEASED", orderItem: { order: { patientId } } } }),
    ]);
    return diagnoses + releasedResults;
  }

  async profile(actor: Actor) {
    const patient = await this.requirePatient(actor);
    return this.presentProfile(patient);
  }

  async updateProfile(actor: Actor, input: unknown) {
    const parsed = portalProfileUpdateSchema.safeParse(input);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues.map((issue) => issue.message).join("; "), "VALIDATION_ERROR");
    const patient = await this.requirePatient(actor);
    const updated = await this.db.patient.update({
      where: { id: patient.id },
      data: {
        phone: parsed.data.phone,
        email: parsed.data.email ? parsed.data.email : null,
        address: parsed.data.address ? parsed.data.address : null,
        emergencyContactName: parsed.data.emergencyContactName,
        emergencyPhone: parsed.data.emergencyContactPhone,
      },
    });
    await this.audit(actor, "PORTAL_PROFILE_UPDATED", "Patient", patient.id);
    return this.presentProfile(updated);
  }

  async listAppointments(actor: Actor, query: Record<string, unknown>) {
    await this.requirePatient(actor);
    return this.appointments.list({ page: 1, pageSize: 100, sortBy: "scheduledAt", sortOrder: "desc", ...query }, actor);
  }

  /** Picks the first active doctor in the department whose schedule covers the requested slot. */
  private async resolveAvailableDoctor(department: string, date: string, time: string) {
    const dayStart = localDateTime(date, "00:00");
    const dayEnd = localDateTime(addLocalDays(date, 1), "00:00");
    const doctors = await this.db.doctor.findMany({
      where: { active: true, department },
      include: {
        schedules: { where: { dayOfWeek: dayOfWeek(date) } },
        leavePeriods: { where: { startsAt: { lt: dayEnd }, endsAt: { gt: dayStart } } },
      },
      orderBy: { name: "asc" },
    });
    for (const doctor of doctors) {
      const schedule = doctor.schedules[0];
      if (!schedule || doctor.leavePeriods.length) continue;
      if (!isAvailableAt(schedule, time)) continue;
      const booked = await this.db.appointmentSlotLock.findFirst({
        where: { doctorId: doctor.id, scheduledAt: localDateTime(date, time) },
        select: { id: true },
      });
      if (!booked) return doctor;
    }
    return null;
  }

  async requestAppointment(actor: Actor, input: unknown) {
    const parsed = portalAppointmentRequestSchema.safeParse(input);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues.map((issue) => issue.message).join("; "), "VALIDATION_ERROR");
    const patient = await this.requirePatient(actor);
    const doctor = parsed.data.doctor && parsed.data.doctor !== "Any available doctor"
      ? parsed.data.doctor
      : (await this.resolveAvailableDoctor(parsed.data.department, parsed.data.date, parsed.data.time))?.name;
    if (!doctor) throw new HttpError(409, "No doctor is available at the requested time", "SLOT_UNAVAILABLE");
    const appointment = await this.appointments.create({
      patientId: patient.patientNumber,
      doctor,
      department: parsed.data.department,
      date: parsed.data.date,
      time: parsed.data.time,
      type: "consultation",
      reason: parsed.data.reason,
    }, actor);
    await this.notifier.deliver({
      patientId: patient.id,
      userId: actor.userId,
      title: "Appointment request received",
      message: `Your ${parsed.data.department} appointment request for ${parsed.data.date} at ${parsed.data.time} has been recorded.`,
      category: "APPOINTMENTS",
    });
    return appointment;
  }

  async changeAppointment(actor: Actor, id: string, input: unknown) {
    const parsed = portalAppointmentChangeSchema.safeParse(input);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues.map((issue) => issue.message).join("; "), "VALIDATION_ERROR");
    const patient = await this.requirePatient(actor);
    const current = await this.db.appointment.findUnique({ where: { id }, include: { patient: true, doctor: true } });
    if (!current) throw new HttpError(404, "Appointment not found", "NOT_FOUND");
    if (current.patientId !== patient.id) throw new HttpError(403, "You can only manage your own appointments", "FORBIDDEN");

    if (parsed.data.action === "cancel") {
      const cancelled = await this.appointments.cancel(id, actor);
      await this.notifier.deliver({
        patientId: patient.id,
        userId: actor.userId,
        title: "Appointment cancelled",
        message: `Your ${current.department} appointment on ${cancelled.date} at ${cancelled.time} has been cancelled.`,
        category: "APPOINTMENTS",
      });
      return cancelled;
    }

    const date = parsed.data.date!;
    const time = parsed.data.time ?? current.scheduledAt.toISOString().slice(11, 16);
    const updated = await this.appointments.update(id, {
      patientId: patient.patientNumber,
      doctor: current.doctor.name,
      department: current.department,
      date,
      time,
      type: current.type.toLowerCase().replace("_", "-"),
      reason: current.reason,
      ...(current.notes ? { notes: current.notes } : {}),
    }, actor);
    await this.notifier.deliver({
      patientId: patient.id,
      userId: actor.userId,
      title: "Appointment rescheduled",
      message: `Your ${current.department} appointment was moved to ${updated.date} at ${updated.time}.`,
      category: "APPOINTMENTS",
    });
    return updated;
  }

  async visits(actor: Actor) {
    const patient = await this.requirePatient(actor);
    const encounters = await this.db.clinicalEncounter.findMany({
      where: { patientId: patient.id },
      include: { clinician: true },
      orderBy: { startedAt: "desc" },
      take: 50,
    });
    return encounters.map((encounter) => ({
      id: encounter.id,
      date: encounter.startedAt.toISOString().slice(0, 10),
      department: encounter.department,
      clinician: encounter.clinician ? `${encounter.clinician.firstName} ${encounter.clinician.lastName}` : "Care team",
      patientVisibleSummary: `${encounter.department} visit — ${encounterStatusLabels[encounter.status] ?? encounter.status}`,
    }));
  }

  async medicalRecords(actor: Actor) {
    const patient = await this.requirePatient(actor);
    const [diagnoses, results] = await Promise.all([
      this.db.diagnosisRecord.findMany({ where: { patientId: patient.id }, orderBy: { diagnosedAt: "desc" }, take: 50 }),
      this.db.laboratoryResult.findMany({
        where: { status: "RELEASED", orderItem: { order: { patientId: patient.id } } },
        include: { orderItem: { include: { catalog: true } } },
        orderBy: { recordedAt: "desc" },
        take: 50,
      }),
    ]);
    await this.audit(actor, "PORTAL_RECORDS_ACCESSED", "Patient", patient.id);
    const records = [
      ...diagnoses.map((diagnosis) => ({
        id: diagnosis.id,
        date: diagnosis.diagnosedAt.toISOString().slice(0, 10),
        category: "Diagnosis" as const,
        title: diagnosis.diagnosis,
        releaseStatus: "Released" as const,
        summary: diagnosis.code ? `Code ${diagnosis.code}` : undefined,
      })),
      ...results.map((result) => ({
        id: result.id,
        date: result.recordedAt.toISOString().slice(0, 10),
        category: "Laboratory result" as const,
        title: result.orderItem.catalog.name,
        releaseStatus: "Released" as const,
        summary: [result.value, result.unit].filter(Boolean).join(" ") || undefined,
      })),
    ];
    return { records, prescriptions: [], dischargeDocuments: [] };
  }

  async billing(actor: Actor) {
    const patient = await this.requirePatient(actor);
    const [invoices, payments] = await Promise.all([
      this.db.invoice.findMany({ where: { patientId: patient.id }, include: { items: true }, orderBy: { issuedAt: "desc" }, take: 50 }),
      this.db.payment.findMany({ where: { invoice: { patientId: patient.id } }, orderBy: { receivedAt: "desc" }, take: 50 }),
    ]);
    return {
      invoices: invoices.map((invoice) => ({
        id: invoice.id,
        number: invoice.invoiceNumber,
        issuedAt: invoice.issuedAt.toISOString().slice(0, 10),
        description: invoice.items[0]?.serviceName ?? "Hospital services",
        totalAmount: invoice.total,
        paidAmount: invoice.paidAmount,
        status: invoiceStatusLabels[invoice.status] ?? invoice.status,
      })),
      payments: payments.map((payment) => ({
        id: payment.id,
        receiptNumber: payment.receiptNumber,
        paidAt: payment.receivedAt.toISOString().slice(0, 10),
        method: payment.method.toLowerCase().replace("_", " "),
        amount: payment.amount,
      })),
    };
  }

  async listNotifications(actor: Actor) {
    const patient = await this.requirePatient(actor);
    const [notifications, unreadCount] = await Promise.all([
      this.db.portalNotification.findMany({ where: { patientId: patient.id }, orderBy: { createdAt: "desc" }, take: 100 }),
      this.db.portalNotification.count({ where: { patientId: patient.id, readAt: null } }),
    ]);
    return {
      unreadCount,
      notifications: notifications.map((notification) => ({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        category: notification.category,
        createdAt: notification.createdAt.toISOString().slice(0, 10),
        read: notification.readAt !== null,
      })),
    };
  }

  async markNotificationRead(actor: Actor, id: string) {
    const patient = await this.requirePatient(actor);
    const updated = await this.db.portalNotification.updateMany({
      where: { id, patientId: patient.id, readAt: null },
      data: { readAt: new Date() },
    });
    if (updated.count === 0) throw new HttpError(404, "Unread notification not found", "NOT_FOUND");
    return { marked: true };
  }

  async markAllNotificationsRead(actor: Actor) {
    const patient = await this.requirePatient(actor);
    const updated = await this.db.portalNotification.updateMany({
      where: { patientId: patient.id, readAt: null },
      data: { readAt: new Date() },
    });
    return { marked: updated.count };
  }

  async announcements() {
    const rows = await this.db.hospitalAnnouncement.findMany({ where: { active: true }, orderBy: { publishedAt: "desc" }, take: 20 });
    return rows.map((row) => ({ id: row.id, title: row.title, message: row.message, publishedAt: row.publishedAt.toISOString().slice(0, 10) }));
  }

  async submitSupportRequest(actor: Actor, input: unknown) {
    const parsed = portalSupportRequestSchema.safeParse(input);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues.map((issue) => issue.message).join("; "), "VALIDATION_ERROR");
    const patient = await this.requirePatient(actor);
    const request = await this.db.portalSupportRequest.create({
      data: {
        patientId: patient.id,
        requestedById: actor.userId,
        category: parsed.data.category === "Feedback" ? "FEEDBACK" : parsed.data.category === "Complaint" ? "COMPLAINT" : "SUPPORT_REQUEST",
        subject: parsed.data.subject,
        message: parsed.data.message,
      },
    });
    await this.audit(actor, "PORTAL_SUPPORT_REQUEST_SUBMITTED", "PortalSupportRequest", request.id);
    return { id: request.id, status: request.status, createdAt: request.createdAt.toISOString() };
  }

  async listSupportRequests(actor: Actor) {
    const patient = await this.requirePatient(actor);
    const requests = await this.db.portalSupportRequest.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return requests.map((request) => ({
      id: request.id,
      category: request.category,
      subject: request.subject,
      message: request.message,
      response: request.response ?? "",
      status: request.status,
      createdAt: request.createdAt.toISOString().slice(0, 10),
    }));
  }
}
