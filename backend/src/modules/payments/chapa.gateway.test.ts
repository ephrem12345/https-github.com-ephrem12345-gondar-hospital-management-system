import crypto from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChapaGateway, createPaymentGateway, generateTxRef, isSubscriptionTxRef } from "./chapa.gateway.js";

describe("payment gateway", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("uses simulation in tests and generates typed transaction references", () => {
    expect(createPaymentGateway().simulated).toBe(true);
    expect(generateTxRef("GHMS-SUB")).toMatch(/^GHMS-SUB-\d+-[0-9A-F]+$/);
    expect(isSubscriptionTxRef("GHMS-SUB-1-AB")).toBe(true);
  });

  it("verifies webhook HMAC against the exact raw bytes", () => {
    const gateway = new ChapaGateway();
    const raw = Buffer.from('{"tx_ref":"GHMS-TX-1","amount":" 10.00 "}');
    const signature = crypto.createHmac("sha256", "test-webhook-secret-long-enough").update(raw).digest("hex");
    expect(() => gateway.verifyWebhookSignature(raw, [signature])).not.toThrow();
    expect(() => gateway.verifyWebhookSignature(raw, [`sha256=${signature}`])).not.toThrow();
    expect(() => gateway.verifyWebhookSignature(raw, [Buffer.from(signature, "hex").toString("base64")])).not.toThrow();
    expect(() => gateway.verifyWebhookSignature(Buffer.from('{"tx_ref":"GHMS-TX-1","amount":"10.00"}'), [signature])).toThrow(/Invalid/);
    expect(() => gateway.verifyWebhookSignature(raw, [])).toThrow(/Missing/);
  });

  it("fails closed when Chapa verification fails or reports pending", async () => {
    const gateway = new ChapaGateway();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({
      ok: false,
      text: async () => JSON.stringify({ status: "error" }),
    }).mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ status: "success", data: { status: "pending" } }),
    }));
    await expect(gateway.verify("ref-1")).rejects.toThrow(/unavailable/);
    await expect(gateway.verify("ref-2")).resolves.toMatchObject({ status: "PENDING" });
  });

  it("rejects initialization without a gateway checkout URL", async () => {
    const gateway = new ChapaGateway();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ status: "success", data: {} }),
    }));
    await expect(gateway.initialize({
      txRef: "ref", amount: 10, currency: "ETB", email: "a@b.com",
      firstName: "A", lastName: "B", returnUrl: "https://example.com", description: "test",
    })).rejects.toThrow(/checkout URL/);
  });
});
