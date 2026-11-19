import crypto from "node:crypto";
import type { PaymentMethod } from "@prisma/client";
import { env, simulationPaymentsEnabled } from "../../config/env.js";
import { HttpError } from "../../utils/http-error.js";

export interface GatewayInitializeInput {
  txRef: string;
  amount: number;
  currency: string;
  email: string;
  firstName: string;
  lastName: string;
  returnUrl: string;
  description: string;
  metadata?: Record<string, string>;
}

export interface GatewayInitializeResult {
  checkoutUrl: string;
  simulated: boolean;
}

export interface GatewayVerification {
  status: "SUCCESSFUL" | "PENDING" | "FAILED";
  amount?: number;
  currency?: string;
  reference?: string;
  fee?: number;
  raw: unknown;
}

export interface PaymentGateway {
  readonly simulated: boolean;
  initialize(input: GatewayInitializeInput): Promise<GatewayInitializeResult>;
  verify(txRef: string): Promise<GatewayVerification>;
  verifyWebhookSignature(rawBody: Buffer, signatures: string[]): void;
}

interface ChapaResponse {
  status?: string;
  message?: string;
  data?: Record<string, unknown>;
}

async function readChapaResponse(response: Response): Promise<ChapaResponse> {
  const text = await response.text();
  let parsed: ChapaResponse;
  try {
    parsed = JSON.parse(text) as ChapaResponse;
  } catch {
    throw new HttpError(502, "Chapa returned an invalid response", "PAYMENT_GATEWAY_ERROR");
  }
  if (!response.ok) {
    throw new HttpError(502, "Chapa payment service is unavailable", "PAYMENT_GATEWAY_ERROR");
  }
  return parsed;
}

export class ChapaGateway implements PaymentGateway {
  readonly simulated = false;

  private get secret(): string {
    if (!env.CHAPA_SECRET_KEY) {
      throw new HttpError(503, "Chapa is not configured", "PAYMENT_GATEWAY_NOT_CONFIGURED");
    }
    return env.CHAPA_SECRET_KEY;
  }

  async initialize(input: GatewayInitializeInput): Promise<GatewayInitializeResult> {
    const response = await fetch(`${env.CHAPA_BASE_URL}/transaction/initialize`, {
      method: "POST",
      signal: AbortSignal.timeout(env.CHAPA_REQUEST_TIMEOUT_MS),
      headers: {
        Authorization: `Bearer ${this.secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: input.amount.toFixed(2),
        currency: input.currency,
        email: input.email,
        first_name: input.firstName,
        last_name: input.lastName,
        tx_ref: input.txRef,
        callback_url: `${env.BACKEND_PUBLIC_URL ?? env.FRONTEND_URL}/api/v1/payments/chapa/webhook`,
        return_url: input.returnUrl,
        meta: input.metadata,
        customization: {
          title: "Gondar Hospital Management System",
          description: input.description,
        },
      }),
    });

    const data = await readChapaResponse(response);
    const checkoutUrl = data.data?.checkout_url;
    if (data.status !== "success" || typeof checkoutUrl !== "string" || !checkoutUrl.startsWith("https://")) {
      throw new HttpError(502, data.message || "Chapa did not return a checkout URL", "PAYMENT_INITIALIZATION_FAILED");
    }
    return { checkoutUrl, simulated: false };
  }

  async verify(txRef: string): Promise<GatewayVerification> {
    const response = await fetch(`${env.CHAPA_BASE_URL}/transaction/verify/${encodeURIComponent(txRef)}`, {
      signal: AbortSignal.timeout(env.CHAPA_REQUEST_TIMEOUT_MS),
      headers: { Authorization: `Bearer ${this.secret}` },
    });
    const data = await readChapaResponse(response);
    const raw = data.data ?? {};
    const status = typeof raw.status === "string" ? raw.status.toLowerCase() : "";
    const currency = typeof raw.currency === "string" ? raw.currency : undefined;
    const reference = typeof raw.reference === "string" ? raw.reference : undefined;
    const fee = raw.charge === undefined ? undefined : Number(raw.charge);
    const amount = raw.amount === undefined ? undefined : Number(raw.amount);

    if (status === "success") {
      return { status: "SUCCESSFUL", amount, currency, reference, fee, raw };
    }
    if (status === "pending" || status === "processing") {
      return { status: "PENDING", amount, currency, reference, raw };
    }
    return { status: "FAILED", amount, currency, reference, raw };
  }

  verifyWebhookSignature(rawBody: Buffer, signatures: string[]): void {
    const secret = env.CHAPA_WEBHOOK_SECRET;
    if (!secret || signatures.length === 0) {
      throw new HttpError(401, "Missing Chapa webhook signature", "INVALID_SIGNATURE");
    }
    const expected = crypto.createHmac("sha256", secret).update(rawBody).digest();
    const valid = signatures.some((candidate) => {
      const value = candidate.replace(/^sha256=/i, "");
      const provided = /^[a-f0-9]{64}$/i.test(value)
        ? Buffer.from(value, "hex")
        : Buffer.from(value, "base64");
      return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
    });
    if (!valid) {
      throw new HttpError(401, "Invalid Chapa webhook signature", "INVALID_SIGNATURE");
    }
  }
}

export class SimulationGateway implements PaymentGateway {
  readonly simulated = true;

  async initialize(input: GatewayInitializeInput): Promise<GatewayInitializeResult> {
    const url = new URL(`${env.FRONTEND_URL}/patient-portal/billing`);
    url.searchParams.set("chapa_simulated_pay", input.txRef);
    url.searchParams.set("amount", input.amount.toFixed(2));
    url.searchParams.set("return_url", input.returnUrl);
    return { checkoutUrl: url.toString(), simulated: true };
  }

  async verify(txRef: string): Promise<GatewayVerification> {
    return { status: "SUCCESSFUL", raw: { simulated: true, tx_ref: txRef } };
  }

  verifyWebhookSignature(_rawBody: Buffer, signatures: string[]): void {
    if (signatures.length === 0) {
      throw new HttpError(401, "Missing Chapa webhook signature", "INVALID_SIGNATURE");
    }
  }
}

export function createPaymentGateway(): PaymentGateway {
  return simulationPaymentsEnabled ? new SimulationGateway() : new ChapaGateway();
}

export function isSubscriptionTxRef(txRef: string): boolean {
  return txRef.startsWith("GHMS-SUB-");
}

export function generateTxRef(prefix: "GHMS-TX" | "GHMS-SUB" = "GHMS-TX"): string {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
}

export function generateReceiptNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `REC-${date}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

export function paymentMethodLabel(method: PaymentMethod): string {
  return method === "CHAPA" ? "Chapa" : method.replaceAll("_", " ").toLowerCase();
}
