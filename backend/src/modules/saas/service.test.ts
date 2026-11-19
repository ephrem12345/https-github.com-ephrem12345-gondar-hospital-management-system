import { Prisma, BillingCycle, HospitalStatus, PaymentStatus, SubscriptionStatus, SubscriptionTier, UserRole } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SaasService, type HospitalActor } from "./service.js";
import type { GatewayVerification, PaymentGateway } from "../payments/chapa.gateway.js";

const actor: HospitalActor = { userId: "u1", role: UserRole.ADMINISTRATOR, hospitalId: "h1" };
const decimal = (value: number) => new Prisma.Decimal(value);

function fixtures() {
  const plan = {
    id: "plan-free", code: SubscriptionTier.FREE, name: "Free", monthlyPrice: decimal(0),
    annualPrice: decimal(0), maxStaff: 3, maxPatients: 100, isActive: true,
  };
  const paidPlan = { ...plan, id: "plan-pro", code: SubscriptionTier.PROFESSIONAL, name: "Professional", monthlyPrice: decimal(499), annualPrice: decimal(4990) };
  const hospital = { id: "h1", name: "Gondar Hospital", code: "gondar", email: "hospital@example.com", status: HospitalStatus.ACTIVE, tier: SubscriptionTier.FREE, maxStaff: 3, maxPatients: 100 };
  const subscriptionPayment = {
    id: "subpay-1", txRef: "GHMS-SUB-ref", hospitalId: "h1", planCode: SubscriptionTier.PROFESSIONAL,
    cycle: BillingCycle.MONTHLY, amount: decimal(499), status: PaymentStatus.PENDING,
    paidAt: null, subscriptionId: null, returnUrl: "http://localhost:3002/subscription?chapa_ref=GHMS-SUB-ref",
  };
  const tx = {
    hospital: { create: vi.fn().mockResolvedValue({ ...hospital, id: "h2", status: HospitalStatus.TRIAL, tier: SubscriptionTier.FREE }), update: vi.fn().mockResolvedValue(hospital) },
    hospitalSubscription: {
      create: vi.fn().mockResolvedValue({ id: "sub-1", hospitalId: "h1", planId: plan.id, status: SubscriptionStatus.ACTIVE, plan }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      update: vi.fn().mockResolvedValue({}),
    },
  };
  const db = {
    subscriptionPlan: { findUnique: vi.fn().mockImplementation(({ where }) => Promise.resolve(where.code === SubscriptionTier.FREE ? plan : paidPlan)), findMany: vi.fn().mockResolvedValue([plan, paidPlan]) },
    hospital: {
      findFirst: vi.fn().mockResolvedValue(null), findUnique: vi.fn().mockResolvedValue(hospital),
      findMany: vi.fn().mockResolvedValue([hospital]), update: vi.fn().mockResolvedValue(hospital),
    },
    subscriptionPayment: {
      create: vi.fn().mockResolvedValue(subscriptionPayment),
      update: vi.fn().mockResolvedValue(subscriptionPayment),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findUnique: vi.fn().mockResolvedValue(subscriptionPayment),
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(subscriptionPayment),
    },
    hospitalSubscription: { findMany: vi.fn().mockResolvedValue([]), update: vi.fn().mockResolvedValue({}) },
    user: { count: vi.fn().mockResolvedValue(3) },
    patient: { count: vi.fn().mockResolvedValue(100) },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    $transaction: vi.fn().mockImplementation(async (arg) => Array.isArray(arg) ? Promise.all(arg) : arg(tx)),
  } as unknown as PrismaClient;
  const gateway: PaymentGateway = {
    simulated: false,
    initialize: vi.fn().mockResolvedValue({ checkoutUrl: "https://checkout.chapa.co/sub", simulated: false }),
    verify: vi.fn().mockResolvedValue({ status: "SUCCESSFUL", amount: 499, currency: "ETB", raw: {} } satisfies GatewayVerification),
    verifyWebhookSignature: vi.fn(),
  };
  return { db, gateway, plan, paidPlan, hospital, subscriptionPayment, tx };
}

describe("SaasService", () => {
  let ctx: ReturnType<typeof fixtures>;
  beforeEach(() => { ctx = fixtures(); });

  it("registers hospitals on FREE with a trial period", async () => {
    const service = new SaasService(ctx.db, ctx.gateway);
    const hospital = await service.registerHospital({
      name: "New Hospital", code: "NEW", email: "new@example.com", phone: "+251900000000",
    });
    expect(hospital).toMatchObject({ status: HospitalStatus.TRIAL, tier: SubscriptionTier.FREE });
    expect(ctx.tx.hospitalSubscription.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: SubscriptionStatus.TRIAL, amount: 0 }),
    }));
  });

  it("enforces tenant scope and plan limits", async () => {
    const service = new SaasService(ctx.db, ctx.gateway);
    await expect(service.getHospital("h-other", actor)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(service.assertLimits("h1", "staff")).rejects.toMatchObject({ code: "PLAN_LIMIT_REACHED" });
  });

  it("refuses paid checkout for another tenant", async () => {
    const service = new SaasService(ctx.db, ctx.gateway);
    await expect(service.createSubscriptionCheckout(actor, {
      planCode: SubscriptionTier.PROFESSIONAL, cycle: BillingCycle.MONTHLY,
      hospitalId: "h-other",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(ctx.db.subscriptionPayment.create).not.toHaveBeenCalled();
  });

  it("activates a paid subscription only after verified payment", async () => {
    const service = new SaasService(ctx.db, ctx.gateway);
    const result = await service.confirmSubscriptionPayment({
      txRef: "GHMS-SUB-ref", verification: { status: "SUCCESSFUL", amount: 499, currency: "ETB", raw: {} },
    });
    expect(result).toMatchObject({ success: true, status: "SUCCESSFUL" });
    expect(ctx.db.subscriptionPayment.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: PaymentStatus.VALIDATED }),
    }));
    expect(ctx.tx.hospital.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: HospitalStatus.ACTIVE, tier: SubscriptionTier.PROFESSIONAL }),
    }));
  });

  it("rejects paid renewal without a verified payment reference", async () => {
    const service = new SaasService(ctx.db, ctx.gateway);
    await expect(service.renewSubscription("h1", { planCode: SubscriptionTier.PROFESSIONAL, cycle: BillingCycle.MONTHLY }, actor))
      .rejects.toMatchObject({ code: "PAYMENT_REQUIRED" });
  });

  it("auto-renews expired FREE subscriptions in maintenance jobs", async () => {
    ctx.db.hospitalSubscription.findMany = vi.fn().mockResolvedValue([{
      id: "sub-free", hospitalId: "h1", status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: new Date(Date.now() - 86_400_000), gracePeriodDays: 7,
      plan: ctx.plan,
    }]);
    const service = new SaasService(ctx.db, ctx.gateway);
    const result = await service.processExpirations();
    expect(result.processed).toBe(1);
    expect(ctx.db.hospital.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: HospitalStatus.ACTIVE }),
    }));
  });
});
