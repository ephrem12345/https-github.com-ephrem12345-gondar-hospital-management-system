import { Prisma, InvoiceStatus, PaymentMethod, PaymentStatus, UserRole } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HttpError } from "../../utils/http-error.js";
import { ChapaPaymentService, type PaymentActor } from "./chapa.service.js";
import type { GatewayVerification, PaymentGateway } from "./chapa.gateway.js";

const actor: PaymentActor = { userId: "u1", role: UserRole.FINANCE_OFFICER, hospitalId: "h1" };
const decimal = (value: number) => new Prisma.Decimal(value);

function fixtures() {
  const invoice = {
    id: "inv-1", hospitalId: "h1", patientId: "p1", status: InvoiceStatus.PARTIALLY_PAID,
    total: decimal(100), paidAmount: decimal(40), invoiceNumber: "INV-100", currency: "ETB",
    patient: { email: "patient@example.com", firstName: "A", lastName: "B", user: { email: "patient@example.com" } },
  };
  const payment = {
    id: "pay-1", receiptNumber: "REC-1", chapaReference: "GHMS-TX-ref", transactionReference: "GHMS-TX-ref",
    amount: decimal(60), currency: "ETB", status: PaymentStatus.PENDING, verifiedAt: null,
    hospitalId: "h1", invoiceId: "inv-1", notes: null, method: PaymentMethod.CHAPA,
    gatewayProvider: "CHAPA", checkoutUrl: null, receivedAt: new Date(),
    invoice: { ...invoice, patient: { ...invoice.patient } },
  };
  const txInvoice = { ...invoice };
  const db = {
    invoice: { findUnique: vi.fn().mockResolvedValue(invoice), update: vi.fn() },
    payment: {
      findUnique: vi.fn().mockResolvedValue(payment),
      findUniqueOrThrow: vi.fn().mockResolvedValue({ ...payment, verifiedAt: new Date(), status: PaymentStatus.VALIDATED, invoice: { invoiceNumber: invoice.invoiceNumber, status: InvoiceStatus.PAID } }),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(payment),
      update: vi.fn().mockResolvedValue(payment),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    paymentAudit: { create: vi.fn().mockResolvedValue({}) },
    paymentEvent: { create: vi.fn().mockResolvedValue({}), update: vi.fn().mockResolvedValue({}) },
    $transaction: vi.fn().mockImplementation(async (fn) => fn({
      invoice: { findUniqueOrThrow: vi.fn().mockResolvedValue(txInvoice), update: vi.fn().mockResolvedValue(txInvoice) },
    })),
  } as unknown as PrismaClient;
  const gateway: PaymentGateway = {
    simulated: false,
    initialize: vi.fn().mockResolvedValue({ checkoutUrl: "https://checkout.chapa.co/test", simulated: false }),
    verify: vi.fn().mockResolvedValue({ status: "SUCCESSFUL", amount: 60, currency: "ETB", raw: {} } satisfies GatewayVerification),
    verifyWebhookSignature: vi.fn(),
  };
  return { db, gateway, invoice, payment };
}

describe("ChapaPaymentService", () => {
  let ctx: ReturnType<typeof fixtures>;
  beforeEach(() => { ctx = fixtures(); });

  it("refuses cross-tenant invoice initialization", async () => {
    const service = new ChapaPaymentService(ctx.db, ctx.gateway);
    await expect(service.initializePayment({
      invoiceId: "inv-1", actor: { ...actor, hospitalId: "h-other" },
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(ctx.db.payment.create).not.toHaveBeenCalled();
  });

  it("does not settle a pending Chapa verification", async () => {
    vi.mocked(ctx.gateway.verify).mockResolvedValueOnce({ status: "PENDING", raw: {} });
    const service = new ChapaPaymentService(ctx.db, ctx.gateway);
    const result = await service.verifyPayment("GHMS-TX-ref", actor);
    expect(result).toMatchObject({ success: false, status: "PENDING" });
    expect(ctx.db.payment.updateMany).not.toHaveBeenCalled();
    expect(ctx.db.$transaction).not.toHaveBeenCalled();
  });

  it("settles only after successful verification and reconciles the invoice", async () => {
    const service = new ChapaPaymentService(ctx.db, ctx.gateway);
    const result = await service.verifyPayment("GHMS-TX-ref", actor);
    expect(ctx.gateway.verify).toHaveBeenCalledWith("GHMS-TX-ref");
    expect(ctx.db.payment.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: PaymentStatus.VALIDATED }),
    }));
    expect(ctx.db.$transaction).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ success: true, status: "SUCCESSFUL", amount: 60 });
  });

  it("rejects amount mismatches and marks the payment failed", async () => {
    vi.mocked(ctx.gateway.verify).mockResolvedValueOnce({ status: "SUCCESSFUL", amount: 5, currency: "ETB", raw: {} });
    const service = new ChapaPaymentService(ctx.db, ctx.gateway);
    await expect(service.verifyPayment("GHMS-TX-ref", actor)).rejects.toMatchObject({ code: "AMOUNT_MISMATCH" });
    expect(ctx.db.payment.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: PaymentStatus.FAILED }),
    }));
    expect(ctx.db.payment.updateMany).not.toHaveBeenCalled();
  });

  it("ignores replayed webhook events", async () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError("Duplicate", { code: "P2002", clientVersion: "test" });
    vi.mocked(ctx.db.paymentEvent.create).mockRejectedValueOnce(prismaError);
    const service = new ChapaPaymentService(ctx.db, ctx.gateway);
    const result = await service.handleWebhook(Buffer.from(JSON.stringify({ tx_ref: "GHMS-TX-ref" })), ["sig"], {});
    expect(result).toMatchObject({ duplicate: true, status: "IGNORED" });
    expect(ctx.gateway.verify).not.toHaveBeenCalled();
  });

  it("blocks receipts for unverified payments", async () => {
    const service = new ChapaPaymentService(ctx.db, ctx.gateway);
    await expect(service.getReceipt("pay-1", actor)).rejects.toBeInstanceOf(HttpError);
  });
});
