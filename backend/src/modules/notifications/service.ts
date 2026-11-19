import type { PrismaClient } from "@prisma/client";

export type PortalNotificationCategory = "APPOINTMENTS" | "RESULTS" | "BILLING" | "HOSPITAL";

export interface NotificationPayload {
  patientId: string;
  userId?: string | null;
  title: string;
  message: string;
  category: PortalNotificationCategory;
}

export interface DeliveryResult {
  inApp: { delivered: boolean; reason?: string; id?: string };
  email: { delivered: boolean; reason?: string };
  sms: { delivered: boolean; reason?: string };
}

/**
 * Notification delivery. In-app delivery writes a PortalNotification row.
 * Email and SMS channels are prepared but intentionally report as
 * undelivered until a verified provider is configured in the environment.
 */
export class NotificationService {
  constructor(private readonly db: PrismaClient) {}

  async deliver(payload: NotificationPayload): Promise<DeliveryResult> {
    let userId = payload.userId ?? null;
    if (!userId) {
      const patient = await this.db.patient.findUnique({ where: { id: payload.patientId }, select: { userId: true } });
      userId = patient?.userId ?? null;
    }
    if (!userId) {
      return {
        inApp: { delivered: false, reason: "NO_LINKED_ACCOUNT" },
        email: { delivered: false, reason: "PROVIDER_NOT_CONFIGURED" },
        sms: { delivered: false, reason: "PROVIDER_NOT_CONFIGURED" },
      };
    }
    const notification = await this.db.portalNotification.create({
      data: {
        userId,
        patientId: payload.patientId,
        title: payload.title,
        message: payload.message,
        category: payload.category,
      },
    });
    return {
      inApp: { delivered: true, id: notification.id },
      email: { delivered: false, reason: "PROVIDER_NOT_CONFIGURED" },
      sms: { delivered: false, reason: "PROVIDER_NOT_CONFIGURED" },
    };
  }
}
