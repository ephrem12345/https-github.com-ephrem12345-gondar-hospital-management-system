import { Prisma, BillingCycle, HospitalStatus, PaymentStatus, SubscriptionStatus, SubscriptionTier, UserRole } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../utils/http-error.js";
import {
  createPaymentGateway,
  generateReceiptNumber,
  generateTxRef,
  type GatewayVerification,
  type PaymentGateway,
} from "../payments/chapa.gateway.js";

export interface HospitalActor {
  userId: string;
  role: UserRole;
  hospitalId?: string;
}

export interface HospitalRegistrationInput {
  name: string;
  code: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  region?: string;
  hospitalType?: string;
  tier?: SubscriptionTier;
  contactPerson?: string;
  contactPhone?: string;
}

export interface SubscriptionCheckoutInput {
  planCode: SubscriptionTier;
  cycle: BillingCycle;
  returnUrl?: string;
  hospitalId?: string;
}

const periods = {
  TRIAL: SubscriptionStatus.TRIAL,
  ACTIVE: SubscriptionStatus.ACTIVE,
  PAST_DUE: SubscriptionStatus.PAST_DUE,
  SUSPENDED: SubscriptionStatus.SUSPENDED,
  CANCELLED: SubscriptionStatus.CANCELLED,
  EXPIRED: SubscriptionStatus.EXPIRED,
} as const;

export class SaasService {
  private readonly gateway: PaymentGateway;

  constructor(private readonly db: PrismaClient, gateway?: PaymentGateway) {
    this.gateway = gateway ?? createPaymentGateway();
  }

  private async audit(input: {
    action: string;
    entityType: string;
    entityId?: string;
    hospitalId?: string;
    actorId?: string;
    requestId?: string;
  }) {
    try {
      await this.db.auditLog.create({
        data: {
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId,
          hospitalId: input.hospitalId,
          actorId: input.actorId,
          requestId: input.requestId,
        },
      });
    } catch (error) {
      logger.error({ err: error, action: input.action }, "Unable to persist SaaS audit record");
    }
  }

  private assertHospitalAccess(actor: HospitalActor, hospitalId: string) {
    if (actor.role === UserRole.SUPER_ADMIN) return;
    if (!actor.hospitalId) throw new HttpError(403, "No tenant association found for this user", "TENANT_REQUIRED");
    if (actor.hospitalId !== hospitalId) throw new HttpError(403, "Access denied to another hospital's data", "FORBIDDEN");
  }

  private resolveHospitalId(actor: HospitalActor, requested?: string): string {
    if (actor.role === UserRole.SUPER_ADMIN) {
      if (!requested) throw new HttpError(400, "hospitalId is required for platform administrators", "VALIDATION_ERROR");
      return requested;
    }
    if (!actor.hospitalId) throw new HttpError(403, "No tenant association found for this user", "TENANT_REQUIRED");
    if (requested && requested !== actor.hospitalId) throw new HttpError(403, "Access denied to another hospital's data", "FORBIDDEN");
    return actor.hospitalId;
  }

  async listPlans() {
    return this.db.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { monthlyPrice: "asc" },
    });
  }

  async getPlanByCode(code: SubscriptionTier) {
    const plan = await this.db.subscriptionPlan.findUnique({ where: { code } });
    if (!plan) throw new HttpError(404, `Subscription plan ${code} not found`, "PLAN_NOT_FOUND");
    return plan;
  }

  async updatePlan(code: SubscriptionTier, data: { monthlyPrice?: number; annualPrice?: number; maxStaff?: number; maxPatients?: number; description?: string }, actor?: HospitalActor) {
    const plan = await this.db.subscriptionPlan.update({ where: { code }, data });
    await this.audit({ action: "PLAN_UPDATED", entityType: "SubscriptionPlan", entityId: plan.id, actorId: actor?.userId, hospitalId: actor?.hospitalId });
    return plan;
  }

  async registerHospital(input: HospitalRegistrationInput) {
    const existing = await this.db.hospital.findFirst({ where: { OR: [{ code: input.code }, { email: input.email }] } });
    if (existing) throw new HttpError(409, "A hospital with this code or email already exists", "HOSPITAL_EXISTS");

    const tier = input.tier ?? SubscriptionTier.FREE;
    const plan = await this.getPlanByCode(tier);
    const now = new Date();
    const trialEnd = new Date(now.getTime() + env.TRIAL_DAYS * 86_400_000);

    const hospital = await this.db.$transaction(async (tx) => {
      const created = await tx.hospital.create({
        data: {
          code: input.code.toLowerCase().trim().replace(/[^a-z0-9-]/g, "-"),
          name: input.name.trim(),
          email: input.email.toLowerCase().trim(),
          phone: input.phone.trim(),
          address: input.address?.trim(),
          city: input.city?.trim(),
          region: input.region?.trim(),
          hospitalType: input.hospitalType || "GENERAL",
          status: HospitalStatus.TRIAL,
          tier,
          contactPerson: input.contactPerson?.trim(),
          contactPhone: input.contactPhone?.trim(),
          maxStaff: plan.maxStaff,
          maxPatients: plan.maxPatients,
        },
      });
      await tx.hospitalSubscription.create({
        data: {
          hospitalId: created.id,
          planId: plan.id,
          status: SubscriptionStatus.TRIAL,
          cycle: BillingCycle.MONTHLY,
          amount: tier === SubscriptionTier.FREE ? 0 : plan.monthlyPrice,
          currency: "ETB",
          currentPeriodStart: now,
          currentPeriodEnd: trialEnd,
          trialEndsAt: trialEnd,
          gracePeriodDays: env.TRIAL_GRACE_DAYS,
          autoRenew: tier === SubscriptionTier.FREE,
        },
      });
      return created;
    });

    await this.audit({ action: "HOSPITAL_REGISTERED", entityType: "Hospital", entityId: hospital.id, hospitalId: hospital.id });
    return hospital;
  }

  async listHospitals(query: { status?: HospitalStatus; tier?: SubscriptionTier; search?: string }, actor: HospitalActor) {
    const scope = actor.role === UserRole.SUPER_ADMIN ? {} : { id: actor.hospitalId ?? "" };
    return this.db.hospital.findMany({
      where: {
        ...scope,
        ...(query.status ? { status: query.status } : {}),
        ...(query.tier ? { tier: query.tier } : {}),
        ...(query.search ? { OR: [
          { name: { contains: query.search } },
          { code: { contains: query.search } },
          { city: { contains: query.search } },
          { email: { contains: query.search } },
        ] } : {}),
      },
      include: {
        subscriptions: { orderBy: { createdAt: "desc" }, take: 1, include: { plan: true } },
        _count: { select: { users: true, patients: true, appointments: true, invoices: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getHospital(id: string, actor: HospitalActor) {
    this.assertHospitalAccess(actor, id);
    const hospital = await this.db.hospital.findUnique({
      where: { id },
      include: {
        subscriptions: { orderBy: { createdAt: "desc" }, include: { plan: true } },
        _count: { select: { users: true, patients: true, appointments: true, invoices: true } },
      },
    });
    if (!hospital) throw new HttpError(404, "Hospital not found", "NOT_FOUND");
    return hospital;
  }

  async getOwnHospital(actor: HospitalActor) {
    return this.getHospital(this.resolveHospitalId(actor), actor);
  }

  async updateHospitalStatus(id: string, status: HospitalStatus, actor: HospitalActor) {
    this.assertHospitalAccess(actor, id);
    const hospital = await this.db.hospital.update({ where: { id }, data: { status } });
    await this.audit({ action: "HOSPITAL_STATUS_UPDATED", entityType: "Hospital", entityId: id, hospitalId: id, actorId: actor.userId, requestId: `${status}` });
    return hospital;
  }

  private async activateSubscription(input: {
    hospitalId: string;
    planCode: SubscriptionTier;
    cycle: BillingCycle;
    paymentReference?: string;
    actorId?: string;
  }) {
    const plan = await this.getPlanByCode(input.planCode);
    const now = new Date();
    const periodEnd = new Date(now);
    if (input.cycle === BillingCycle.ANNUAL) periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    else periodEnd.setMonth(periodEnd.getMonth() + 1);

    const subscription = await this.db.$transaction(async (tx) => {
      await tx.hospitalSubscription.updateMany({
        where: { hospitalId: input.hospitalId, status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL, SubscriptionStatus.PAST_DUE] } },
        data: { status: SubscriptionStatus.CANCELLED, canceledAt: now },
      });
      await tx.hospital.update({
        where: { id: input.hospitalId },
        data: {
          tier: input.planCode,
          status: HospitalStatus.ACTIVE,
          maxStaff: plan.maxStaff,
          maxPatients: plan.maxPatients,
        },
      });
      return tx.hospitalSubscription.create({
        data: {
          hospitalId: input.hospitalId,
          planId: plan.id,
          status: SubscriptionStatus.ACTIVE,
          cycle: input.cycle,
          amount: input.planCode === SubscriptionTier.FREE ? 0 : (input.cycle === BillingCycle.ANNUAL ? plan.annualPrice : plan.monthlyPrice),
          currency: "ETB",
          currentPeriodStart: now,
          currentPeriodEnd: input.planCode === SubscriptionTier.FREE ? new Date(now.getTime() + 3650 * 86_400_000) : periodEnd,
          paymentReference: input.paymentReference,
          gracePeriodDays: env.SUBSCRIPTION_GRACE_DAYS,
          autoRenew: true,
        },
        include: { plan: true },
      });
    });
    await this.audit({
      action: "SUBSCRIPTION_ACTIVATED",
      entityType: "HospitalSubscription",
      entityId: subscription.id,
      hospitalId: input.hospitalId,
      actorId: input.actorId,
      requestId: input.paymentReference,
    });
    return subscription;
  }

  async createSubscriptionCheckout(actor: HospitalActor, input: SubscriptionCheckoutInput) {
    const hospitalId = this.resolveHospitalId(actor, input.hospitalId);
    const hospital = await this.getHospital(hospitalId, actor);
    const plan = await this.getPlanByCode(input.planCode);
    const amount = input.planCode === SubscriptionTier.FREE ? 0 : Number(input.cycle === BillingCycle.ANNUAL ? plan.annualPrice : plan.monthlyPrice);

    if (amount === 0) {
      return { activated: true, subscription: await this.activateSubscription({ hospitalId, planCode: input.planCode, cycle: input.cycle, actorId: actor.userId }) };
    }

    if (input.returnUrl) {
      const frontend = new URL(env.FRONTEND_URL).origin;
      if (new URL(input.returnUrl).origin !== frontend) {
        throw new HttpError(400, "returnUrl must belong to the configured frontend origin", "INVALID_RETURN_URL");
      }
    }

    const txRef = generateTxRef("GHMS-SUB");
    const payment = await this.db.subscriptionPayment.create({
      data: {
        txRef,
        hospitalId,
        planCode: input.planCode,
        cycle: input.cycle,
        amount,
        currency: "ETB",
        status: PaymentStatus.PENDING,
        returnUrl: input.returnUrl ?? `${env.FRONTEND_URL}/subscription?chapa_ref=${txRef}`,
      },
    });

    try {
      const result = await this.gateway.initialize({
        txRef,
        amount,
        currency: "ETB",
        email: hospital.email,
        firstName: hospital.contactPerson ?? hospital.name,
        lastName: hospital.name,
        returnUrl: payment.returnUrl!,
        description: `${plan.name} plan (${input.cycle.toLowerCase()}) for ${hospital.name}`,
        metadata: { kind: "SUBSCRIPTION", hospitalId, planCode: input.planCode, cycle: input.cycle },
      });
      await this.db.subscriptionPayment.update({ where: { id: payment.id }, data: { checkoutUrl: result.checkoutUrl } });
      await this.audit({ action: "SUBSCRIPTION_CHECKOUT_CREATED", entityType: "SubscriptionPayment", entityId: payment.id, hospitalId, actorId: actor.userId, requestId: txRef });
      return {
        activated: false,
        txRef,
        amount,
        currency: "ETB",
        checkoutUrl: result.checkoutUrl,
        isTestMode: this.gateway.simulated,
        receiptNumber: generateReceiptNumber(),
      };
    } catch (error) {
      await this.db.subscriptionPayment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED, failureReason: error instanceof Error ? error.message.slice(0, 300) : "Gateway error" },
      });
      await this.audit({ action: "SUBSCRIPTION_CHECKOUT_FAILED", entityType: "SubscriptionPayment", entityId: payment.id, hospitalId, actorId: actor.userId, requestId: txRef });
      throw error;
    }
  }

  async confirmSubscriptionPayment(input: { txRef: string; verification: GatewayVerification; eventId?: string }) {
    const payment = await this.db.subscriptionPayment.findUnique({ where: { txRef: input.txRef } });
    if (!payment) throw new HttpError(404, "Subscription payment not found", "PAYMENT_NOT_FOUND");
    if (payment.paidAt) return { success: true, status: "SUCCESSFUL", alreadySettled: true, subscriptionId: payment.subscriptionId };

    if (input.verification.status !== "SUCCESSFUL") {
      const reason = input.verification.status === "PENDING" ? "Payment is still pending at Chapa" : "Payment was not completed at Chapa";
      if (input.verification.status === "FAILED") {
        await this.db.subscriptionPayment.update({ where: { id: payment.id }, data: { status: PaymentStatus.FAILED, failureReason: reason } });
      }
      await this.audit({ action: "SUBSCRIPTION_PAYMENT_FAILED", entityType: "SubscriptionPayment", entityId: payment.id, hospitalId: payment.hospitalId, requestId: input.txRef });
      return { success: false, status: input.verification.status, message: reason };
    }

    const reportedAmount = input.verification.amount === undefined ? Number(payment.amount) : Number(input.verification.amount);
    if (Math.abs(reportedAmount - Number(payment.amount)) > 0.01) {
      await this.db.subscriptionPayment.update({ where: { id: payment.id }, data: { status: PaymentStatus.FAILED, failureReason: "Amount mismatch" } });
      await this.audit({ action: "SUBSCRIPTION_AMOUNT_MISMATCH", entityType: "SubscriptionPayment", entityId: payment.id, hospitalId: payment.hospitalId, requestId: input.txRef });
      throw new HttpError(409, "Subscription payment amount does not match the plan price", "AMOUNT_MISMATCH");
    }

    const now = new Date();
    const claimed = await this.db.subscriptionPayment.updateMany({
      where: { id: payment.id, paidAt: null, status: { not: PaymentStatus.REVERSED } },
      data: { status: PaymentStatus.VALIDATED, verifiedAt: now, paidAt: now, gatewayFee: input.verification.fee ?? 0 },
    });
    if (claimed.count === 0) return { success: true, status: "SUCCESSFUL", alreadySettled: true, subscriptionId: payment.subscriptionId };

    const subscription = await this.activateSubscription({
      hospitalId: payment.hospitalId,
      planCode: payment.planCode,
      cycle: payment.cycle,
      paymentReference: payment.txRef,
    });
    await this.db.subscriptionPayment.update({ where: { id: payment.id }, data: { subscriptionId: subscription.id } });
    await this.audit({ action: "SUBSCRIPTION_PAYMENT_SETTLED", entityType: "SubscriptionPayment", entityId: payment.id, hospitalId: payment.hospitalId, requestId: input.eventId ?? input.txRef });
    return { success: true, status: "SUCCESSFUL", subscriptionId: subscription.id, subscription };
  }

  async verifySubscriptionPayment(actor: HospitalActor, txRef: string) {
    const payment = await this.db.subscriptionPayment.findUnique({ where: { txRef } });
    if (!payment) throw new HttpError(404, "Subscription payment not found", "PAYMENT_NOT_FOUND");
    this.assertHospitalAccess(actor, payment.hospitalId);
    const verification = await this.gateway.verify(txRef);
    return this.confirmSubscriptionPayment({ txRef, verification });
  }

  async getSubscriptionOverview(actor: HospitalActor) {
    const hospitalId = this.resolveHospitalId(actor);
    const [hospital, payments] = await Promise.all([
      this.getHospital(hospitalId, actor),
      this.db.subscriptionPayment.findMany({ where: { hospitalId }, orderBy: { createdAt: "desc" }, take: 50 }),
    ]);
    const current = hospital.subscriptions.find((subscription) =>
      subscription.status === SubscriptionStatus.ACTIVE || subscription.status === SubscriptionStatus.TRIAL,
    ) ?? hospital.subscriptions[0] ?? null;
    return { hospital, currentSubscription: current, history: payments };
  }

  async listSubscriptionPayments(actor: HospitalActor) {
    const hospitalId = this.resolveHospitalId(actor);
    return this.db.subscriptionPayment.findMany({ where: { hospitalId }, orderBy: { createdAt: "desc" } });
  }

  async renewSubscription(hospitalId: string, data: { planCode: SubscriptionTier; cycle: BillingCycle; paymentReference?: string }, actor: HospitalActor) {
    this.assertHospitalAccess(actor, hospitalId);
    const plan = await this.getPlanByCode(data.planCode);
    const amount = Number(data.cycle === BillingCycle.ANNUAL ? plan.annualPrice : plan.monthlyPrice);
    if (amount > 0) {
      if (!data.paymentReference) throw new HttpError(400, "A verified payment reference is required for paid plans", "PAYMENT_REQUIRED");
      const payment = await this.db.subscriptionPayment.findFirst({
        where: { txRef: data.paymentReference, hospitalId, paidAt: { not: null }, planCode: data.planCode, cycle: data.cycle },
      });
      if (!payment) throw new HttpError(403, "The supplied payment reference was not verified for this hospital and plan", "UNVERIFIED_PAYMENT");
    }
    return this.activateSubscription({ hospitalId, planCode: data.planCode, cycle: data.cycle, paymentReference: data.paymentReference, actorId: actor.userId });
  }

  async cancelSubscription(actor: HospitalActor) {
    const hospitalId = this.resolveHospitalId(actor);
    const now = new Date();
    await this.db.$transaction(async (tx) => {
      await tx.hospitalSubscription.updateMany({
        where: { hospitalId, status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL, SubscriptionStatus.PAST_DUE] } },
        data: { status: SubscriptionStatus.CANCELLED, canceledAt: now },
      });
      await tx.hospital.update({ where: { id: hospitalId }, data: { status: HospitalStatus.CANCELLED } });
    });
    await this.audit({ action: "SUBSCRIPTION_CANCELLED", entityType: "HospitalSubscription", hospitalId, actorId: actor.userId });
    return { canceled: true };
  }

  async assertLimits(hospitalId: string, resource: "staff" | "patients") {
    const hospital = await this.db.hospital.findUnique({ where: { id: hospitalId }, select: { status: true, maxStaff: true, maxPatients: true } });
    if (!hospital) throw new HttpError(404, "Hospital not found", "NOT_FOUND");
    if (hospital.status === HospitalStatus.SUSPENDED || hospital.status === HospitalStatus.CANCELLED) {
      throw new HttpError(403, "Hospital subscription is not active", "SUBSCRIPTION_INACTIVE");
    }
    const [staff, patients] = await Promise.all([
      this.db.user.count({ where: { hospitalId, role: { not: UserRole.PATIENT } } }),
      this.db.patient.count({ where: { hospitalId } }),
    ]);
    if (resource === "staff" && staff >= hospital.maxStaff) throw new HttpError(403, "Maximum staff limit reached for the current plan", "PLAN_LIMIT_REACHED");
    if (resource === "patients" && patients >= hospital.maxPatients) throw new HttpError(403, "Maximum patient limit reached for the current plan", "PLAN_LIMIT_REACHED");
  }

  async processExpirations() {
    const now = new Date();
    const due = await this.db.hospitalSubscription.findMany({
      where: {
        status: { in: [SubscriptionStatus.TRIAL, SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE] },
        currentPeriodEnd: { lt: now },
      },
      include: { plan: true },
    });
    let processed = 0;
    for (const subscription of due) {
      const graceEnd = new Date(subscription.currentPeriodEnd.getTime() + subscription.gracePeriodDays * 86_400_000);
      const expired = now > graceEnd;
      if (subscription.plan.code === SubscriptionTier.FREE) {
        await this.db.$transaction([
          this.db.hospitalSubscription.update({
            where: { id: subscription.id },
            data: { status: SubscriptionStatus.ACTIVE, currentPeriodStart: now, currentPeriodEnd: new Date(now.getTime() + 3650 * 86_400_000) },
          }),
          this.db.hospital.update({ where: { id: subscription.hospitalId }, data: { status: HospitalStatus.ACTIVE } }),
        ]);
      } else {
        await this.db.$transaction([
          this.db.hospitalSubscription.update({
            where: { id: subscription.id },
            data: { status: expired ? SubscriptionStatus.EXPIRED : SubscriptionStatus.PAST_DUE },
          }),
          this.db.hospital.update({
            where: { id: subscription.hospitalId },
            data: { status: expired ? HospitalStatus.SUSPENDED : HospitalStatus.TRIAL },
          }),
        ]);
      }
      await this.audit({
        action: expired ? "SUBSCRIPTION_EXPIRED" : "SUBSCRIPTION_PAST_DUE",
        entityType: "HospitalSubscription",
        entityId: subscription.id,
        hospitalId: subscription.hospitalId,
      });
      processed += 1;
    }
    return { processed, scanned: due.length, at: now.toISOString() };
  }

  async getPlatformAnalytics() {
    const [hospitals, plans, subscriptions, activeUsers, totalPatients] = await Promise.all([
      this.db.hospital.findMany({ select: { id: true, status: true, tier: true, createdAt: true } }),
      this.db.subscriptionPlan.findMany({ where: { isActive: true } }),
      this.db.hospitalSubscription.findMany({ where: { status: SubscriptionStatus.ACTIVE }, select: { amount: true, currency: true, cycle: true, hospitalId: true } }),
      this.db.user.count({ where: { status: "ACTIVE" } }),
      this.db.patient.count(),
    ]);
    const byTier = Object.fromEntries(Object.values(SubscriptionTier).map((tier) => [tier, hospitals.filter((h) => h.tier === tier).length]));
    const uniqueHospitals = new Set(subscriptions.map((s) => s.hospitalId));
    return {
      hospitals: {
        total: hospitals.length,
        active: hospitals.filter((h) => h.status === HospitalStatus.ACTIVE).length,
        trial: hospitals.filter((h) => h.status === HospitalStatus.TRIAL).length,
        suspended: hospitals.filter((h) => h.status === HospitalStatus.SUSPENDED).length,
        byTier,
      },
      metrics: {
        activeUsers,
        totalPatients,
        totalActiveSubscriptions: uniqueHospitals.size,
        totalRecurringRevenueEtb: [...uniqueHospitals].reduce((sum, id) => sum + Number(subscriptions.find((s) => s.hospitalId === id)?.amount ?? 0), 0),
      },
      plans: plans.map((plan) => ({
        code: plan.code,
        name: plan.name,
        monthlyPriceEtb: Number(plan.monthlyPrice),
        annualPriceEtb: Number(plan.annualPrice),
        maxStaff: plan.maxStaff,
        maxPatients: plan.maxPatients,
      })),
    };
  }
}

export const subscriptionSchemas = {
  checkout: z.object({
    planCode: z.enum(["FREE", "BASIC", "PROFESSIONAL", "ENTERPRISE"]),
    cycle: z.enum(["MONTHLY", "ANNUAL"]),
    returnUrl: z.string().url().optional(),
    hospitalId: z.string().uuid().optional(),
  }),
  renewal: z.object({
    planCode: z.enum(["FREE", "BASIC", "PROFESSIONAL", "ENTERPRISE"]),
    cycle: z.enum(["MONTHLY", "ANNUAL"]),
    paymentReference: z.string().max(120).optional(),
  }),
};
