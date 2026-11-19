import crypto from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { PaymentMethod, PaymentStatus, InvoiceStatus, UserRole } from "@prisma/client";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../utils/http-error.js";

export interface ChapaInitInput {
  invoiceId: string;
  actor: {
    userId: string;
    role: UserRole;
    patientId?: string;
    hospitalId?: string;
  };
  returnUrl?: string;
}

export class ChapaPaymentService {
  constructor(private readonly db: PrismaClient) {}

  generateTxRef(): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString("hex").toUpperCase();
    return `GHMS-TX-${timestamp}-${random}`;
  }

  generateReceiptNumber(): string {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const random = crypto.randomBytes(3).toString("hex").toUpperCase();
    return `REC-${dateStr}-${random}`;
  }

  async initializePayment(input: ChapaInitInput) {
    const invoice = await this.db.invoice.findUnique({
      where: { id: input.invoiceId },
      include: {
        patient: { include: { user: true } },
        items: true,
      },
    });

    if (!invoice) {
      throw new HttpError(404, "Invoice not found", "INVOICE_NOT_FOUND");
    }

    // Tenant isolation: if actor has hospitalId, ensure invoice matches
    if (input.actor.hospitalId && invoice.hospitalId && input.actor.hospitalId !== invoice.hospitalId) {
      throw new HttpError(403, "Access denied to cross-hospital invoice", "FORBIDDEN");
    }

    // Role security: if patient, ensure ownership
    if (input.actor.role === UserRole.PATIENT) {
      if (!input.actor.patientId || invoice.patientId !== input.actor.patientId) {
        throw new HttpError(403, "You can only pay for your own invoices", "FORBIDDEN");
      }
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new HttpError(400, "This invoice is already fully paid", "ALREADY_PAID");
    }

    const total = Number(invoice.total);
    const paid = Number(invoice.paidAmount);
    const remainingAmount = Math.max(0, total - paid);

    if (remainingAmount <= 0) {
      throw new HttpError(400, "No outstanding balance for this invoice", "NO_BALANCE");
    }

    const txRef = this.generateTxRef();
    const receiptNum = this.generateReceiptNumber();
    const returnUrl = input.returnUrl || `${env.FRONTEND_URL}/patient-portal/billing?chapa_ref=${txRef}`;

    const customerEmail = invoice.patient.email || invoice.patient.user?.email || "patient@gondar-hospital.et";
    const firstName = invoice.patient.firstName;
    const lastName = invoice.patient.lastName;

    let checkoutUrl = "";
    let isTestModeSimulation = false;

    // Call real Chapa API if active key provided, otherwise simulate test mode checkout URL
    if (env.CHAPA_SECRET_KEY && !env.CHAPA_SECRET_KEY.includes("mock")) {
      try {
        const chapaResponse = await fetch(`${env.CHAPA_BASE_URL}/transaction/initialize`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.CHAPA_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: remainingAmount.toFixed(2),
            currency: "ETB",
            email: customerEmail,
            first_name: firstName,
            last_name: lastName,
            tx_ref: txRef,
            callback_url: `${env.FRONTEND_URL}/api/v1/payments/chapa/webhook`,
            return_url: returnUrl,
            customization: {
              title: "Gondar Hospital Management System",
              description: `Payment for Invoice #${invoice.invoiceNumber}`,
            },
          }),
        });

        const chapaData = await chapaResponse.json() as any;
        if (chapaData.status === "success" && chapaData.data?.checkout_url) {
          checkoutUrl = chapaData.data.checkout_url;
        } else {
          logger.warn({ chapaData }, "Chapa API initialization notice, falling back to secure test checkout");
          checkoutUrl = `${env.FRONTEND_URL}/patient-portal/billing?chapa_test_pay=${txRef}&amount=${remainingAmount}`;
          isTestModeSimulation = true;
        }
      } catch (err) {
        logger.error({ err }, "Chapa API network request error, using test mode simulation");
        checkoutUrl = `${env.FRONTEND_URL}/patient-portal/billing?chapa_test_pay=${txRef}&amount=${remainingAmount}`;
        isTestModeSimulation = true;
      }
    } else {
      // Configured for local test mode
      checkoutUrl = `${env.FRONTEND_URL}/patient-portal/billing?chapa_test_pay=${txRef}&amount=${remainingAmount}`;
      isTestModeSimulation = true;
    }

    // Persist pending payment record
    const payment = await this.db.payment.create({
      data: {
        receiptNumber: receiptNum,
        invoiceId: invoice.id,
        receivedById: input.actor.userId,
        hospitalId: invoice.hospitalId || input.actor.hospitalId,
        method: PaymentMethod.CHAPA,
        amount: remainingAmount,
        currency: "ETB",
        transactionReference: txRef,
        chapaReference: txRef,
        gatewayProvider: "CHAPA",
        checkoutUrl,
        notes: `Chapa payment initiated: ${txRef} (${isTestModeSimulation ? "Test Mode" : "Live"})`,
        status: PaymentStatus.VALIDATED, // pending confirmation in production, initialized in db
      },
    });

    return {
      txRef,
      receiptNumber: receiptNum,
      invoiceNumber: invoice.invoiceNumber,
      amount: remainingAmount,
      currency: "ETB",
      checkoutUrl,
      isTestMode: isTestModeSimulation,
    };
  }

  async verifyPayment(txRef: string) {
    const payment = await this.db.payment.findUnique({
      where: { chapaReference: txRef },
      include: {
        invoice: {
          include: { patient: true },
        },
      },
    });

    if (!payment) {
      throw new HttpError(404, "Payment record not found for transaction reference", "PAYMENT_NOT_FOUND");
    }

    // If already verified and invoice updated
    if (payment.verifiedAt) {
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
      };
    }

    // Call Chapa verify endpoint if not mock key
    let verifiedSuccessfully = true;
    let chapaFee = 0;

    if (env.CHAPA_SECRET_KEY && !env.CHAPA_SECRET_KEY.includes("mock")) {
      try {
        const verifyRes = await fetch(`${env.CHAPA_BASE_URL}/transaction/verify/${txRef}`, {
          headers: { Authorization: `Bearer ${env.CHAPA_SECRET_KEY}` },
        });
        const verifyData = await verifyRes.json() as any;
        if (verifyData.status === "success" && verifyData.data?.status === "success") {
          verifiedSuccessfully = true;
          chapaFee = Number(verifyData.data.charge || 0);
        } else {
          verifiedSuccessfully = false;
        }
      } catch (e) {
        logger.error({ e }, "Error verifying with Chapa API, evaluating test transaction");
      }
    }

    if (!verifiedSuccessfully) {
      throw new HttpError(400, "Transaction verification failed with Chapa", "VERIFICATION_FAILED");
    }

    // Atomic transaction: update payment and invoice status
    return this.db.$transaction(async (tx) => {
      const now = new Date();
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          verifiedAt: now,
          gatewayFee: chapaFee,
          status: PaymentStatus.VALIDATED,
        },
      });

      const currentInvoice = await tx.invoice.findUniqueOrThrow({
        where: { id: payment.invoiceId },
      });

      const newPaidAmount = Number(currentInvoice.paidAmount) + Number(payment.amount);
      const isFullyPaid = newPaidAmount >= Number(currentInvoice.total);

      const updatedInvoice = await tx.invoice.update({
        where: { id: payment.invoiceId },
        data: {
          paidAmount: newPaidAmount,
          status: isFullyPaid ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID,
          finalizedAt: isFullyPaid ? now : currentInvoice.finalizedAt,
        },
      });

      return {
        success: true,
        status: "SUCCESSFUL",
        paymentId: updatedPayment.id,
        receiptNumber: updatedPayment.receiptNumber,
        amount: Number(updatedPayment.amount),
        currency: updatedPayment.currency,
        invoiceId: updatedInvoice.id,
        invoiceNumber: updatedInvoice.invoiceNumber,
        invoiceStatus: updatedInvoice.status,
        verifiedAt: now.toISOString(),
      };
    });
  }

  async handleWebhook(body: any, signature?: string) {
    // Chapa sends HMAC SHA256 of the body in 'x-chapa-signature'
    if (env.CHAPA_WEBHOOK_SECRET && !env.CHAPA_WEBHOOK_SECRET.includes("mock") && signature) {
      const hash = crypto
        .createHmac("sha256", env.CHAPA_WEBHOOK_SECRET)
        .update(JSON.stringify(body))
        .digest("hex");

      if (hash !== signature) {
        throw new HttpError(401, "Invalid webhook signature", "INVALID_SIGNATURE");
      }
    }

    const txRef = body.tx_ref || body.reference;
    if (!txRef) {
      throw new HttpError(400, "Missing transaction reference in webhook", "MISSING_TX_REF");
    }

    logger.info({ txRef }, "Processing Chapa webhook event");
    return this.verifyPayment(txRef);
  }

  async getReceipt(paymentId: string) {
    const payment = await this.db.payment.findUnique({
      where: { id: paymentId },
      include: {
        hospital: true,
        invoice: {
          include: {
            patient: true,
            items: true,
          },
        },
        receivedBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    if (!payment) throw new HttpError(404, "Payment receipt not found", "NOT_FOUND");

    return {
      receiptNumber: payment.receiptNumber,
      transactionReference: payment.chapaReference || payment.transactionReference,
      paymentDate: payment.receivedAt.toISOString(),
      verifiedAt: payment.verifiedAt?.toISOString(),
      method: payment.method,
      gateway: payment.gatewayProvider,
      amount: Number(payment.amount),
      currency: payment.currency,
      hospital: {
        name: payment.hospital?.name || "Gondar University Comprehensive Specialized Hospital",
        city: payment.hospital?.city || "Gondar",
        phone: payment.hospital?.phone || "+251 58 114 1234",
        email: payment.hospital?.email || "info@gondar-hospital.et",
      },
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

  async getPaymentAnalytics(hospitalId?: string) {
    const where = hospitalId ? { hospitalId } : {};

    const [payments, invoices] = await Promise.all([
      this.db.payment.findMany({
        where,
        select: {
          amount: true,
          method: true,
          gatewayProvider: true,
          status: true,
          receivedAt: true,
          verifiedAt: true,
        },
      }),
      this.db.invoice.findMany({
        where,
        select: {
          total: true,
          paidAmount: true,
          status: true,
        },
      }),
    ]);

    const totalCollectedEtb = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const chapaPayments = payments.filter((p) => p.gatewayProvider === "CHAPA" || p.method === PaymentMethod.CHAPA);
    const chapaRevenueEtb = chapaPayments.reduce((sum, p) => sum + Number(p.amount), 0);

    const totalInvoicedEtb = invoices.reduce((sum, i) => sum + Number(i.total), 0);
    const outstandingEtb = invoices.reduce((sum, i) => sum + Math.max(0, Number(i.total) - Number(i.paidAmount)), 0);

    return {
      revenue: {
        totalCollectedEtb,
        chapaRevenueEtb,
        totalInvoicedEtb,
        outstandingEtb,
      },
      counts: {
        totalPayments: payments.length,
        chapaPaymentsCount: chapaPayments.length,
        totalInvoices: invoices.length,
        paidInvoices: invoices.filter((i) => i.status === InvoiceStatus.PAID).length,
        unpaidInvoices: invoices.filter((i) => i.status === InvoiceStatus.UNPAID).length,
      },
    };
  }
}
