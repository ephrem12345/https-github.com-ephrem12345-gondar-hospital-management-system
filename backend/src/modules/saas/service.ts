import type { PrismaClient, HospitalStatus, SubscriptionTier, BillingCycle } from "@prisma/client";
import { UserRole } from "@prisma/client";
import { HttpError } from "../../utils/http-error.js";
import { logger } from "../../config/logger.js";

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

export class SaasService {
  constructor(private readonly db: PrismaClient) {}

  async listPlans() {
    return this.db.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { monthlyPrice: "asc" },
    });
  }

  async getPlanByCode(code: SubscriptionTier) {
    const plan = await this.db.subscriptionPlan.findUnique({
      where: { code },
    });
    if (!plan) throw new HttpError(404, `Subscription plan ${code} not found`, "PLAN_NOT_FOUND");
    return plan;
  }

  async updatePlan(code: SubscriptionTier, data: { monthlyPrice?: number; annualPrice?: number; maxStaff?: number; maxPatients?: number; description?: string }) {
    return this.db.subscriptionPlan.update({
      where: { code },
      data: {
        ...(data.monthlyPrice !== undefined ? { monthlyPrice: data.monthlyPrice } : {}),
        ...(data.annualPrice !== undefined ? { annualPrice: data.annualPrice } : {}),
        ...(data.maxStaff !== undefined ? { maxStaff: data.maxStaff } : {}),
        ...(data.maxPatients !== undefined ? { maxPatients: data.maxPatients } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
      },
    });
  }

  async registerHospital(input: HospitalRegistrationInput) {
    const existing = await this.db.hospital.findFirst({
      where: {
        OR: [{ code: input.code }, { email: input.email }],
      },
    });

    if (existing) {
      throw new HttpError(409, "A hospital with this code or email already exists", "HOSPITAL_EXISTS");
    }

    const tier = input.tier || "BASIC";
    const plan = await this.getPlanByCode(tier);

    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + 30); // 30-day free trial

    return this.db.$transaction(async (tx) => {
      const hospital = await tx.hospital.create({
        data: {
          code: input.code.toLowerCase().trim().replace(/[^a-z0-9-]/g, "-"),
          name: input.name.trim(),
          email: input.email.toLowerCase().trim(),
          phone: input.phone.trim(),
          address: input.address?.trim(),
          city: input.city?.trim(),
          region: input.region?.trim(),
          hospitalType: input.hospitalType || "GENERAL",
          status: "TRIAL",
          tier,
          contactPerson: input.contactPerson?.trim(),
          contactPhone: input.contactPhone?.trim(),
          maxStaff: plan.maxStaff,
          maxPatients: plan.maxPatients,
        },
      });

      await tx.hospitalSubscription.create({
        data: {
          hospitalId: hospital.id,
          planId: plan.id,
          status: "TRIAL",
          cycle: "MONTHLY",
          amount: plan.monthlyPrice,
          currency: "ETB",
          currentPeriodStart: now,
          currentPeriodEnd: trialEnd,
          trialEndsAt: trialEnd,
          gracePeriodDays: 7,
          autoRenew: true,
        },
      });

      return hospital;
    });
  }

  async listHospitals(query: { status?: HospitalStatus; tier?: SubscriptionTier; search?: string }) {
    return this.db.hospital.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.tier ? { tier: query.tier } : {}),
        ...(query.search ? {
          OR: [
            { name: { contains: query.search } },
            { code: { contains: query.search } },
            { city: { contains: query.search } },
            { email: { contains: query.search } },
          ],
        } : {}),
      },
      include: {
        subscriptions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { plan: true },
        },
        _count: {
          select: {
            users: true,
            patients: true,
            appointments: true,
            invoices: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getHospital(id: string) {
    const hospital = await this.db.hospital.findUnique({
      where: { id },
      include: {
        subscriptions: {
          orderBy: { createdAt: "desc" },
          include: { plan: true },
        },
        _count: {
          select: {
            users: true,
            patients: true,
            appointments: true,
            invoices: true,
          },
        },
      },
    });

    if (!hospital) throw new HttpError(404, "Hospital not found", "NOT_FOUND");
    return hospital;
  }

  async updateHospitalStatus(id: string, status: HospitalStatus) {
    const hospital = await this.getHospital(id);
    return this.db.hospital.update({
      where: { id: hospital.id },
      data: { status },
    });
  }

  async renewSubscription(hospitalId: string, data: { planCode: SubscriptionTier; cycle: BillingCycle; paymentReference?: string }) {
    const hospital = await this.getHospital(hospitalId);
    const plan = await this.getPlanByCode(data.planCode);

    const now = new Date();
    const periodEnd = new Date(now);
    if (data.cycle === "ANNUAL") {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const amount = data.cycle === "ANNUAL" ? plan.annualPrice : plan.monthlyPrice;

    return this.db.$transaction(async (tx) => {
      await tx.hospital.update({
        where: { id: hospital.id },
        data: {
          tier: data.planCode,
          status: "ACTIVE",
          maxStaff: plan.maxStaff,
          maxPatients: plan.maxPatients,
        },
      });

      return tx.hospitalSubscription.create({
        data: {
          hospitalId: hospital.id,
          planId: plan.id,
          status: "ACTIVE",
          cycle: data.cycle,
          amount,
          currency: "ETB",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          paymentReference: data.paymentReference,
          gracePeriodDays: 14,
          autoRenew: true,
        },
        include: { plan: true },
      });
    });
  }

  async getPlatformAnalytics() {
    const [hospitals, plans, subscriptions, activeUsers, totalPatients] = await Promise.all([
      this.db.hospital.findMany({ select: { id: true, status: true, tier: true, createdAt: true } }),
      this.db.subscriptionPlan.findMany({ where: { isActive: true } }),
      this.db.hospitalSubscription.findMany({
        where: { status: "ACTIVE" },
        select: { amount: true, currency: true, cycle: true },
      }),
      this.db.user.count({ where: { status: "ACTIVE" } }),
      this.db.patient.count(),
    ]);

    const totalHospitals = hospitals.length;
    const activeHospitals = hospitals.filter((h) => h.status === "ACTIVE").length;
    const trialHospitals = hospitals.filter((h) => h.status === "TRIAL").length;
    const suspendedHospitals = hospitals.filter((h) => h.status === "SUSPENDED").length;

    const totalActiveRevenueEtb = subscriptions.reduce((sum, s) => sum + Number(s.amount), 0);

    const byTier = {
      BASIC: hospitals.filter((h) => h.tier === "BASIC").length,
      PROFESSIONAL: hospitals.filter((h) => h.tier === "PROFESSIONAL").length,
      ENTERPRISE: hospitals.filter((h) => h.tier === "ENTERPRISE").length,
    };

    return {
      hospitals: {
        total: totalHospitals,
        active: activeHospitals,
        trial: trialHospitals,
        suspended: suspendedHospitals,
        byTier,
      },
      metrics: {
        activeUsers,
        totalPatients,
        totalActiveSubscriptions: subscriptions.length,
        totalRecurringRevenueEtb: totalActiveRevenueEtb,
      },
      plans: plans.map((p) => ({
        code: p.code,
        name: p.name,
        monthlyPriceEtb: Number(p.monthlyPrice),
        annualPriceEtb: Number(p.annualPrice),
        maxStaff: p.maxStaff,
        maxPatients: p.maxPatients,
      })),
    };
  }
}
