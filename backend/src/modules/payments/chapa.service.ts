import crypto from "node:crypto";
import { Prisma, PaymentMethod, PaymentStatus, InvoiceStatus, UserRole } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../utils/http-error.js";
import {
  createPaymentGateway,
  generateReceiptNumber,
  generateTxRef,
  isSubscriptionTxRef,
  type GatewayVerification,
  type PaymentGateway,
} from "./chapa.gateway.js";

export interface PaymentActor {
  userId: string;
  role: UserRole;
  patientId?: string;
  hospitalId?: string;
}

export interface ChapaInitInput {
  invoiceId: string;
  actor: PaymentActor;
  returnUrl?: string;
}

export interface SubscriptionConfirmationInput {
  txRef: string;
  verification: GatewayVerification;
  eventId?: string;
}

export type SubscriptionConfirmation = (input: SubscriptionConfirmationInput) => Promise<unknown>;

const webhookSchema = z.object({
  tx_ref: z.string().min(1).optional(),
  reference: z.string().min(1).optional(),
  status: z.string().optional(),
  id: z.string().optional(),
  event: z.object({ id: z.string().optional(), type: z.string().optional() }).optional(),
});

export class ChapaPaymentService {
  private readonly gateway: PaymentGateway;
  private readonly confirmSubscription?: SubscriptionConfirmation;

  constructor(
    private readonly db: PrismaClient,
    gateway?: PaymentGateway,
    confirmSubscription?: SubscriptionConfirmation,
  ) {
    this.gateway = gateway ?? createPaymentGateway();
    this.confirmSubscription = confirmSubscription;
  }

  generateTxRef(): string {
    return generateTxRef();
  }

  generateReceiptNumber(): string {
    return generateReceiptNumber();
  }

  private async audit(input: {
    action: string;
    outcome: string;
    paymentId?: string;
    eventId?: string;
    hospitalId?: string;
    actorId?: string;
    detail?: string;
    requestId?: string;
  }) {
    try {
      await this.db.paymentAudit.create({ data: input });
    } catch (error) {
      logger.error({ err: error, action: input.action }, "Unable to persist payment audit record");
    }
  }

  private assertInvoiceAccess(invoice: { hospitalId: string | null; patientId: string; status: string }, actor: PaymentActor) {
    if (actor.role !== UserRole.SUPER_ADMIN && !actor.hospitalId) {
      throw new HttpError(403, "No tenant association found for this user", "TENANT_REQUIRED");
    }
    if (actor.hospitalId && invoice.hospitalId && actor.hospitalId !== invoice.hospitalId) {
      throw new HttpError(403, "Access denied to cross-hospital invoice", "FORBIDDEN");
    }
    if (!invoice.hospitalId) {
      throw new HttpError(409, "Invoice is not associated with a hospital", "INVOICE_TENANT_MISSING");
    }
    if (actor.role === UserRole.PATIENT && (!actor.patientId || invoice.patientId !== actor.patientId)) {
      throw new HttpError(403, "You can only pay for your own invoices", "FORBIDDEN");
    }
    if (invoice.status === InvoiceStatus.VOID) {
      throw new HttpError(400, "This invoice has been voided", "INVOICE_VOID");
    }
  }

  async initializePayment(input: ChapaInitInput) {
    const invoice = await this.db.invoice.findUnique({
      where: { id: input.invoiceId },
      include: { patient: { include: { user: true } } },
    });
    if (!invoice) throw new HttpError(404, "Invoice not found", "INVOICE_NOT_FOUND");
    this.assertInvoiceAccess(invoice, input.actor);

    if (invoice.status === InvoiceStatus.PAID) {
      throw new HttpError(400, "This invoice is already fully paid", "ALREADY_PAID");
    }
    const total = Number(invoice.total);
    const paid = Number(invoice.paidAmount);
    const amount = Math.round((total - paid) * 100) / 100;
    if (amount <= 0) throw new HttpError(400, "No outstanding balance for this invoice", "NO_BALANCE");

    const pending = await this.db.payment.findFirst({
      where: {
        invoiceId: invoice.id,
        method: PaymentMethod.CHAPA,
        status: PaymentStatus.PENDING,
        receivedAt: { gte: new Date(Date.now() - 30 * 60 * 1000) },
      },
      orderBy: { receivedAt: "desc" },
    });
    if (pending?.checkoutUrl) {
      return {
        txRef: pending.chapaReference!,
        receiptNumber: pending.receiptNumber,
        invoiceNumber: invoice.invoiceNumber,
        amount: Number(pending.amount),
        currency: pending.currency,
        checkoutUrl: pending.checkoutUrl,
        isTestMode: this.gateway.simulated,
      };
    }

    const txRef = this.generateTxRef();
    const receiptNumber = this.generateReceiptNumber();
    const returnUrl = input.returnUrl ?? `${env.FRONTEND_URL}/patient-portal/billing?chapa_ref=${txRef}`;
    const parseUrl = (value: string) => {
      try { return new URL(value); } catch { return null; }
    };
    if (parseUrl(returnUrl)?.origin !== parseUrl(env.FRONTEND_URL)?.origin) {
      throw new HttpError(400, "returnUrl must belong to the configured frontend origin", "INVALID_RETURN_URL");
    }

    const payment = await this.db.payment.create({
      data: {
        receiptNumber,
        invoiceId: invoice.id,
        receivedById: input.actor.userId,
        hospitalId: invoice.hospitalId,
        method: PaymentMethod.CHAPA,
        amount,
        currency: invoice.currency,
        transactionReference: txRef,
        chapaReference: txRef,
        gatewayProvider: "CHAPA",
        notes: `Chapa payment initiated for invoice ${invoice.invoiceNumber}`,
        status: PaymentStatus.PENDING,
      },
    });

    let checkoutUrl: string;
    try {
      const result = await this.gateway.initialize({
        txRef,
        amount,
        currency: invoice.currency,
        email: invoice.patient.email || invoice.patient.user?.email || "",
        firstName: invoice.patient.firstName,
        lastName: invoice.patient.lastName,
        returnUrl,
        description: `Payment for Invoice #${invoice.invoiceNumber}`,
        metadata: { kind: "INVOICE", hospitalId: invoice.hospitalId ?? "", invoiceId: invoice.id },
      });
      checkoutUrl = result.checkoutUrl;
      await this.db.payment.update({
        where: { id: payment.id },
        data: { checkoutUrl, notes: `${payment.notes} (${result.simulated ? "simulation" : "live"})` },
      });
    } catch (error) {
      await this.db.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED, failureReason: error instanceof Error ? error.message.slice(0, 300) : "Gateway error" },
      });
      await this.audit({ action: "PAYMENT_INITIATED", outcome: "FAILED", paymentId: payment.id, hospitalId: invoice.hospitalId ?? undefined, actorId: input.actor.userId });
      throw error;
    }

    await this.audit({ action: "PAYMENT_INITIATED", outcome: "SUCCESS", paymentId: payment.id, hospitalId: invoice.hospitalId ?? undefined, actorId: input.actor.userId, detail: txRef });
    return {
      txRef,
      receiptNumber,
      invoiceNumber: invoice.invoiceNumber,
      amount,
      currency: invoice.currency,
      checkoutUrl,
      isTestMode: this.gateway.simulated,
    };
  }

  async verifyPayment(txRef: string, actor?: PaymentActor, eventId?: string) {
    const payment = await this.db.payment.findUnique({
      where: { chapaReference: txRef },
      include: { invoice: { include: { patient: true } } },
    });
    if (!payment) throw new HttpError(404, "Payment record not found for transaction reference", "PAYMENT_NOT_FOUND");
    if (actor) this.assertInvoiceAccess(payment.invoice, actor);

    if (payment.verifiedAt && payment.status === PaymentStatus.VALIDATED) {
      await this.audit({ action: "PAYMENT_VERIFIED", outcome: "ALREADY_SETTLED", paymentId: payment.id, eventId, hospitalId: payment.hospitalId ?? undefined });
      return this.settledResult(payment);
    }

    let verification: GatewayVerification;
    try {
      verification = await this.gateway.verify(txRef);
    } catch (error) {
      await this.audit({ action: "PAYMENT_VERIFY_FAILED", outcome: "GATEWAY_ERROR", paymentId: payment.id, eventId, hospitalId: payment.hospitalId ?? undefined });
      throw error;
    }

    if (verification.status !== "SUCCESSFUL") {
      const failureReason = verification.status === "PENDING" ? "Payment is still pending at Chapa" : "Payment was not completed at Chapa";
      if (verification.status === "FAILED") {
        await this.db.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.FAILED, failureReason, rawCallbackData: JSON.stringify(verification.raw).slice(0, 60_000) },
        });
      }
      await this.audit({ action: "PAYMENT_VERIFY_FAILED", outcome: verification.status, paymentId: payment.id, eventId, hospitalId: payment.hospitalId ?? undefined, detail: failureReason });
      return { success: false, status: verification.status, txRef, message: failureReason };
    }

    const gatewayAmount = verification.amount === undefined ? Number(payment.amount) : Number(verification.amount);
    const gatewayCurrency = verification.currency ?? payment.currency;
    if (Math.abs(gatewayAmount - Number(payment.amount)) > 0.01 || gatewayCurrency !== payment.currency) {
      const detail = `Expected ${payment.amount} ${payment.currency}, gateway reported ${gatewayAmount} ${gatewayCurrency}`;
      await this.db.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.FAILED, failureReason: "Amount or currency mismatch" } });
      await this.audit({ action: "PAYMENT_AMOUNT_MISMATCH", outcome: "REJECTED", paymentId: payment.id, eventId, hospitalId: payment.hospitalId ?? undefined, detail });
      throw new HttpError(409, "Payment amount does not match the invoice", "AMOUNT_MISMATCH");
    }

    const now = new Date();
    const claimed = await this.db.payment.updateMany({
      where: { id: payment.id, verifiedAt: null, status: { not: PaymentStatus.REVERSED } },
      data: { verifiedAt: now, status: PaymentStatus.VALIDATED, gatewayFee: verification.fee ?? 0, rawCallbackData: JSON.stringify(verification.raw).slice(0, 60_000) },
    });
    if (claimed.count === 0) {
      const settled = await this.db.payment.findUniqueOrThrow({ where: { id: payment.id }, include: { invoice: true } });
      await this.audit({ action: "PAYMENT_VERIFIED", outcome: "ALREADY_SETTLED", paymentId: payment.id, eventId, hospitalId: payment.hospitalId ?? undefined });
      return this.settledResult(settled);
    }

    await this.db.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: payment.invoiceId } });
      if (invoice.status === InvoiceStatus.VOID) {
        throw new HttpError(409, "Invoice is void; payment cannot settle", "INVOICE_VOID");
      }
      const newPaid = Number(invoice.paidAmount) + Number(payment.amount);
      const fullyPaid = newPaid >= Number(invoice.total);
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: newPaid,
          status: fullyPaid ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID,
          finalizedAt: fullyPaid ? now : invoice.finalizedAt,
        },
      });
    });

    await this.audit({
      action: "PAYMENT_SETTLED",
      outcome: "SUCCESS",
      paymentId: payment.id,
      eventId,
      hospitalId: payment.hospitalId ?? undefined,
      detail: `${payment.amount} ${payment.currency} applied to ${payment.invoiceId}`,
    });
    const settled = await this.db.payment.findUniqueOrThrow({ where: { id: payment.id }, include: { invoice: true } });
    return this.settledResult(settled);
  }

  private settledResult(payment: { id: string; receiptNumber: string; amount: Prisma.Decimal; currency: string; invoiceId: string; verifiedAt: Date | null; invoice: { invoiceNumber: string; status: InvoiceStatus } }) {
    return {
      success: true,
      status: "SUCCESSFUL",
      paymentId: payment.id,
      receiptNumber: payment.receiptNumber,
      amount: Number(payment.amount),
      currency: payment.currency,
      invoiceId: payment.invoiceId,
      invoiceNumber: payment.invoice.invoiceNumber,
      invoiceStatus: payment.invoice.status,
      verifiedAt: payment.verifiedAt instanceof Date ? payment.verifiedAt.toISOString() : undefined,
    };
  }

  async handleWebhook(rawBody: Buffer, signatures: string[], headers: Record<string, string | undefined>) {
    if (!Buffer.isBuffer(rawBody) || rawBody.length === 0) {
      throw new HttpError(400, "Webhook body is required", "INVALID_WEBHOOK_BODY");
    }
    this.gateway.verifyWebhookSignature(rawBody, signatures);

    let body: z.infer<typeof webhookSchema>;
    try {
      body = webhookSchema.parse(JSON.parse(rawBody.toString("utf8")));
    } catch {
      throw new HttpError(400, "Invalid webhook payload", "INVALID_WEBHOOK_BODY");
    }

    const txRef = body.tx_ref ?? body.reference;
    if (!txRef) throw new HttpError(400, "Missing transaction reference in webhook", "MISSING_TX_REF");
    const eventId = headers["x-chapa-event-id"] ?? body.id ?? body.event?.id ?? crypto.createHash("sha256").update(rawBody).digest("hex");

    try {
      await this.db.paymentEvent.create({
        data: {
          eventId,
          kind: isSubscriptionTxRef(txRef) ? "SUBSCRIPTION" : "INVOICE",
          txRef,
          signatureHash: crypto.createHash("sha256").update(rawBody).digest("hex"),
          payload: rawBody.toString("utf8").slice(0, 60_000),
          status: "RECEIVED",
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        await this.audit({ action: "WEBHOOK_REPLAY_REJECTED", outcome: "DUPLICATE", eventId, detail: eventId });
        return { duplicate: true, eventId, status: "IGNORED" };
      }
      throw error;
    }

    try {
      let result: unknown;
      if (isSubscriptionTxRef(txRef)) {
        if (!this.confirmSubscription) throw new HttpError(503, "Subscription billing is unavailable", "SUBSCRIPTION_BILLING_UNAVAILABLE");
        result = await this.confirmSubscription({ txRef, verification: await this.gateway.verify(txRef), eventId });
      } else {
        result = await this.verifyPayment(txRef, undefined, eventId);
      }
      await this.db.paymentEvent.update({ where: { eventId }, data: { status: "PROCESSED" } });
      await this.audit({ action: "WEBHOOK_PROCESSED", outcome: "SUCCESS", eventId, detail: txRef });
      return { duplicate: false, eventId, status: "PROCESSED", data: result };
    } catch (error) {
      await this.db.paymentEvent.update({ where: { eventId }, data: { status: "FAILED" } });
      await this.audit({ action: "WEBHOOK_PROCESSED", outcome: "FAILED", eventId, detail: error instanceof Error ? error.message.slice(0, 300) : undefined });
      throw error;
    }
  }

  async getReceipt(paymentId: string, actor: PaymentActor) {
    const payment = await this.db.payment.findUnique({
      where: { id: paymentId },
      include: {
        hospital: { select: { name: true, city: true, phone: true, email: true } },
        invoice: { include: { patient: true, items: true } },
        receivedBy: { select: { firstName: true, lastName: true } },
      },
    });
    if (!payment) throw new HttpError(404, "Payment receipt not found", "NOT_FOUND");
    this.assertInvoiceAccess(payment.invoice, actor);
    if (!payment.verifiedAt || payment.status !== PaymentStatus.VALIDATED) {
      throw new HttpError(409, "Receipt is available only for verified payments", "PAYMENT_NOT_VERIFIED");
    }
    if (actor.role !== UserRole.SUPER_ADMIN && actor.role !== UserRole.ADMINISTRATOR && actor.role !== UserRole.FINANCE_OFFICER && actor.role !== UserRole.PATIENT) {
      throw new HttpError(403, "You are not authorized to view payment receipts", "FORBIDDEN");
    }
    await this.audit({ action: "PAYMENT_RECEIPT_VIEWED", outcome: "SUCCESS", paymentId: payment.id, hospitalId: payment.hospitalId ?? undefined, actorId: actor.userId });

    return {
      receiptNumber: payment.receiptNumber,
      transactionReference: payment.chapaReference ?? payment.transactionReference,
      paymentDate: payment.receivedAt.toISOString(),
      verifiedAt: payment.verifiedAt.toISOString(),
      method: payment.method,
      gateway: payment.gatewayProvider,
      amount: Number(payment.amount),
      currency: payment.currency,
      hospital: payment.hospital,
      patient: {
        name: `${payment.invoice.patient.firstName} ${payment.invoice.patient.lastName}`,
        patientNumber: payment.invoice.patient.patientNumber,
        phone: payment.invoice.patient.phone,
      },
      invoice: {
        invoiceNumber: payment.invoice.invoiceNumber,
        issuedAt: payment.invoice.issuedAt.toISOString().slice(0, 10),
        total: Number(payment.invoice.total),
        paidAmount: Number(payment.invoice.paidAmount),
        status: payment.invoice.status,
        items: payment.invoice.items.map((item) => ({
          name: item.serviceName,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          lineTotal: Number(item.lineTotal),
        })),
      },
    };
  }

  async getPaymentAnalytics(hospitalId?: string, platformWide = false) {
    if (!hospitalId && !platformWide) throw new HttpError(403, "A hospital scope is required for payment analytics", "TENANT_REQUIRED");
    const where = hospitalId ? { hospitalId } : {};
    const [payments, invoices] = await Promise.all([
      this.db.payment.findMany({
        where,
        select: { amount: true, status: true, receivedAt: true, gatewayProvider: true, method: true },
      }),
      this.db.invoice.findMany({ where, select: { total: true, paidAmount: true, status: true } }),
    ]);
    const verified = payments.filter((p) => p.status === PaymentStatus.VALIDATED);
    const chapa = verified.filter((p) => p.gatewayProvider === "CHAPA" || p.method === PaymentMethod.CHAPA);
    const sum = (values: { amount: Prisma.Decimal }[]) => values.reduce((acc, item) => acc + Number(item.amount), 0);
    return {
      revenue: {
        totalCollectedEtb: sum(verified),
        chapaRevenueEtb: sum(chapa),
        totalInvoicedEtb: invoices.reduce((acc, item) => acc + Number(item.total), 0),
        outstandingEtb: invoices.reduce((acc, item) => acc + Math.max(0, Number(item.total) - Number(item.paidAmount)), 0),
      },
      counts: {
        totalPayments: payments.length,
        verifiedPayments: verified.length,
        pendingPayments: payments.filter((p) => p.status === PaymentStatus.PENDING).length,
        failedPayments: payments.filter((p) => p.status === PaymentStatus.FAILED).length,
        totalInvoices: invoices.length,
        paidInvoices: invoices.filter((i) => i.status === InvoiceStatus.PAID).length,
      },
    };
  }
}
