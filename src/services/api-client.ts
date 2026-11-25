export interface ApiErrorPayload {
  code?: string;
  message?: string;
  requestId?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error?: ApiErrorPayload;
}

export interface RequestOptions extends RequestInit {
  skipCache?: boolean;
  ttlMs?: number;
  timeoutMs?: number;
}

export function normalizeApiUrl(raw: string): string {
  let cleaned = (raw || "").trim().replace(/\/+$/, "");
  if (!cleaned) return "http://localhost:4000/api/v1";
  if (!cleaned.endsWith("/api/v1")) {
    if (cleaned.endsWith("/api")) {
      cleaned = `${cleaned}/v1`;
    } else if (!cleaned.includes("/api/")) {
      cleaned = `${cleaned}/api/v1`;
    }
  }
  return cleaned;
}

const configuredUrl =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:4000/api/v1";

export const apiBaseUrl = normalizeApiUrl(configuredUrl);
let refreshInProgress: Promise<boolean> | undefined;

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const getCache = new Map<string, CacheEntry<unknown>>();
const inFlightRequests = new Map<string, Promise<unknown>>();

export function clearApiCache(): void {
  getCache.clear();
  inFlightRequests.clear();
}

function shouldAttemptRefresh(path: string): boolean {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  // Do not attempt token refresh for login, refresh itself, register, or password recovery endpoints
  if (
    normalized.startsWith("/auth/login") ||
    normalized.startsWith("/auth/refresh") ||
    normalized.startsWith("/auth/register") ||
    normalized.startsWith("/auth/forgot-password") ||
    normalized.startsWith("/auth/reset-password")
  ) {
    return false;
  }
  return true;
}

async function refreshSession(): Promise<boolean> {
  if (!refreshInProgress) {
    refreshInProgress = fetch(`${apiBaseUrl}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json" },
    })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        refreshInProgress = undefined;
      });
  }
  return refreshInProgress;
}

async function readError(response: Response): Promise<ApiError> {
  let payload: { error?: ApiErrorPayload; message?: string } | undefined;
  if (response.headers.get("content-type")?.includes("application/json")) {
    try {
      payload = await response.json() as { error?: ApiErrorPayload; message?: string };
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
    }
  }
  const error = payload?.error;
  return new ApiError(
    error?.message ?? payload?.message ?? response.statusText ?? "The API request failed",
    response.status,
    error?.code,
    error?.requestId,
  );
}

async function executeRequest<T>(url: string, path: string, init: RequestOptions): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  headers.set("X-Requested-With", "XMLHttpRequest");
  if (init.body !== undefined && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const timeoutMs = init.timeoutMs ?? 15_000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  if (init.signal) {
    init.signal.addEventListener("abort", () => controller.abort());
  }

  const request: RequestInit = {
    ...init,
    headers,
    credentials: "include",
    signal: controller.signal,
  };

  let response: Response;
  try {
    response = await fetch(url, request);
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (error instanceof ApiError) throw error;
    if (error && typeof error === "object" && "name" in error && error.name === "AbortError") {
      throw new ApiError(
        `Connection timed out (${Math.round(timeoutMs / 1000)}s). The hospital server at ${apiBaseUrl} did not respond.`,
        0,
        "TIMEOUT",
      );
    }
    throw new ApiError(
      "Unable to connect to the hospital server. Please check your network and make sure the server is running.",
      0,
      "NETWORK_ERROR",
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status === 401 && shouldAttemptRefresh(path)) {
    const refreshed = await refreshSession();
    if (refreshed) {
      try {
        response = await fetch(url, request);
      } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(
          "Unable to connect to the hospital server. Please check your network and make sure the server is running.",
          0,
          "NETWORK_ERROR",
        );
      }
    } else if (typeof window !== "undefined") {
      try { window.localStorage.removeItem("ghms-user"); } catch {}
      try {
        const current = `${window.location.pathname}${window.location.search}`;
        if (!window.location.pathname.startsWith("/login")) {
          window.location.assign(`/login?next=${encodeURIComponent(current)}`);
        }
      } catch {}
    }
  }

  if (!response.ok) throw await readError(response);
  if (response.status === 204) return undefined as T;
  const payload = await response.json() as T | ApiEnvelope<T>;
  if (typeof payload === "object" && payload !== null && "success" in payload) {
    const envelope = payload as ApiEnvelope<T>;
    if (!envelope.success) {
      throw new ApiError(envelope.error?.message ?? "The API request failed", response.status, envelope.error?.code, envelope.error?.requestId);
    }
    return envelope.data;
  }
  return payload as T;
}

export async function apiRequest<T>(path: string, init: RequestOptions = {}): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const isGet = method === "GET";
  const url = `${apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  // State mutations invalidate cached GET responses
  if (!isGet) {
    getCache.clear();
    return executeRequest<T>(url, path, init);
  }

  // Check cache for GET requests
  if (!init.skipCache) {
    const cached = getCache.get(url);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data as T;
    }

    // Deduplicate in-flight GET requests
    const inFlight = inFlightRequests.get(url);
    if (inFlight) {
      return inFlight as Promise<T>;
    }
  }

  const promise = executeRequest<T>(url, path, init)
    .then((result) => {
      if (!init.skipCache) {
        const ttl = init.ttlMs ?? 30_000;
        getCache.set(url, {
          data: result,
          expiresAt: Date.now() + ttl,
        });
      }
      return result;
    })
    .finally(() => {
      inFlightRequests.delete(url);
    });

  if (!init.skipCache) {
    inFlightRequests.set(url, promise);
  }

  return promise;
}

export function apiQuery(values: Record<string, string | number | boolean | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

export interface ConnectionDiagnostic {
  backendReachable: boolean;
  databaseReady: boolean;
  apiUrl: string;
  latencyMs: number;
  message: string;
}

export async function checkBackendConnection(): Promise<ConnectionDiagnostic> {
  const start = Date.now();
  const rootApi = apiBaseUrl.replace(/\/api\/v1\/?$/, "");
  try {
    const healthResp = await fetch(`${rootApi}/api/health`, {
      method: "GET",
      signal: AbortSignal.timeout(4000),
      headers: { Accept: "application/json" },
    });
    const latencyMs = Date.now() - start;
    if (!healthResp.ok) {
      return {
        backendReachable: false,
        databaseReady: false,
        apiUrl: apiBaseUrl,
        latencyMs,
        message: `Backend returned HTTP status ${healthResp.status}`,
      };
    }

    let databaseReady = false;
    try {
      const readyResp = await fetch(`${rootApi}/api/ready`, {
        method: "GET",
        signal: AbortSignal.timeout(4000),
        headers: { Accept: "application/json" },
      });
      if (readyResp.ok) {
        databaseReady = true;
      }
    } catch {}

    return {
      backendReachable: true,
      databaseReady,
      apiUrl: apiBaseUrl,
      latencyMs,
      message: databaseReady
        ? "Connected and ready (Backend & Database operational)"
        : "Backend reachable, but MySQL database is not ready",
    };
  } catch {
    return {
      backendReachable: false,
      databaseReady: false,
      apiUrl: apiBaseUrl,
      latencyMs: Date.now() - start,
      message: "Backend server is offline or connection was refused on port 4000",
    };
  }
}

export const apiClient = {
  get: <T>(
    path: string,
    query?: Record<string, string | number | boolean | undefined>,
    options?: RequestOptions,
  ) => apiRequest<T>(`${path}${query ? apiQuery(query) : ""}`, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "POST", ...(body === undefined ? {} : { body: JSON.stringify(body) }) }),
  patch: <T>(path: string, body: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "PATCH", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(path: string, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "DELETE" }),
  clearCache: clearApiCache,
  checkConnection: checkBackendConnection,
};
