import { afterEach, describe, expect, it, vi } from "vitest";
import { billingApi } from "./billing";
import { clearApiCache } from "./api-client";

const originalFetch = globalThis.fetch;

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  clearApiCache();
  vi.restoreAllMocks();
});

describe("billing API", () => {
  it("posts Chapa initialization with the invoice and return URL", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse({ txRef: "GHMS-TX-1", checkoutUrl: "https://checkout.chapa.co/x" }, 201));
    const result = await billingApi.initializePayment("invoice-1", "https://hospital.test/chapa-checkout");
    expect(result.txRef).toBe("GHMS-TX-1");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/payments\/chapa\/initialize$/),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ invoiceId: "invoice-1", returnUrl: "https://hospital.test/chapa-checkout" }),
      }),
    );
  });

  it("unwraps a pending verification result without treating it as an API error", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse({ success: false, status: "PENDING" }));
    await expect(billingApi.verifyPayment("GHMS-TX-1")).resolves.toMatchObject({ status: "PENDING" });
  });

  it("unwraps a pending subscription verification result", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse({ success: false, status: "PENDING" }));
    await expect(billingApi.verifySubscription("GHMS-SUB-1")).resolves.toMatchObject({ status: "PENDING" });
  });

  it("requests server-signed Cloudinary upload parameters", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse({ cloudName: "ghms", publicId: "folder/id", uploadToken: "token" }));
    const result = await billingApi.signUpload("HOSPITAL_LOGO");
    expect(result.uploadToken).toBe("token");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/media\/sign-upload$/),
      expect.objectContaining({ method: "POST", body: JSON.stringify({ category: "HOSPITAL_LOGO" }) }),
    );
  });
});
