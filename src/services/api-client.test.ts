import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient, apiQuery, clearApiCache } from "./api-client";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  clearApiCache();
  vi.restoreAllMocks();
});

describe("API client", () => {
  it("unwraps standard API envelopes and omits empty query values", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: [{ id: "one" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(apiClient.get<Array<{ id: string }>>("/appointments", { page: 1, search: "", status: undefined }))
      .resolves.toEqual([{ id: "one" }]);
    expect(apiQuery({ page: 1, search: "", status: undefined })).toBe("?page=1");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/appointments\?page=1$/),
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("preserves pagination metadata inside the standard response envelope", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        success: true,
        data: { data: [{ id: "apt-1" }], total: 1, page: 1, pageSize: 20 },
      }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(apiClient.get<{ data: Array<{ id: string }>; total: number; page: number; pageSize: number }>("/appointments"))
      .resolves.toEqual({ data: [{ id: "apt-1" }], total: 1, page: 1, pageSize: 20 });
  });

  it("preserves structured API errors for callers", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: false, error: { code: "FORBIDDEN", message: "Not permitted", requestId: "req-1" } }), {
        status: 403,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(apiClient.get("/patients")).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
      requestId: "req-1",
      message: "Not permitted",
    });
  });

  it("refreshes an expired session once before retrying a protected request", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401, statusText: "Unauthorized" }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: { id: "apt-1" } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }));
    globalThis.fetch = fetchMock;

    await expect(apiClient.get<{ id: string }>("/appointments/apt-1")).resolves.toEqual({ id: "apt-1" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toEqual(expect.stringMatching(/\/auth\/refresh$/));
  });

  it("refreshes and retries /auth/me when receiving a 401 unauthorized", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401, statusText: "Unauthorized" }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: { id: "usr-1", role: "DOCTOR" } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }));
    globalThis.fetch = fetchMock;

    await expect(apiClient.get<{ id: string; role: string }>("/auth/me", { skipCache: true })).resolves.toEqual({
      id: "usr-1",
      role: "DOCTOR",
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toEqual(expect.stringMatching(/\/auth\/refresh$/));
    expect(fetchMock.mock.calls[2][0]).toEqual(expect.stringMatching(/\/auth\/me(\?.*)?$/));
  });

  it("does not attempt refresh for /auth/login or /auth/refresh on 401", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: false, error: { message: "Invalid credentials" } }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }));
    globalThis.fetch = fetchMock;

    await expect(apiClient.post("/auth/login", { identifier: "wrong", password: "bad" })).rejects.toMatchObject({
      status: 401,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("deduplicates concurrent in-flight GET requests and caches responses", async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(async () => {
      callCount += 1;
      return new Response(JSON.stringify({ success: true, data: { status: "healthy" } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });

    // Fire two identical GET requests concurrently
    const [res1, res2] = await Promise.all([
      apiClient.get<{ status: string }>("/health"),
      apiClient.get<{ status: string }>("/health"),
    ]);

    expect(res1).toEqual({ status: "healthy" });
    expect(res2).toEqual({ status: "healthy" });
    expect(callCount).toBe(1);

    // Subsequent GET within TTL hits cache without additional fetch
    const res3 = await apiClient.get<{ status: string }>("/health");
    expect(res3).toEqual({ status: "healthy" });
    expect(callCount).toBe(1);

    // Mutation clears cache
    await apiClient.post("/patients", { name: "Test" });
    const res4 = await apiClient.get<{ status: string }>("/health");
    expect(res4).toEqual({ status: "healthy" });
    // Mutation triggered 1 fetch (post) + new fetch for health
    expect(callCount).toBe(3);
  });
});
