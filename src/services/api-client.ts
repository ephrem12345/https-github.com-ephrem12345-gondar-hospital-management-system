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
}

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1").replace(/\/+$/, "");
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

function isAuthEndpoint(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return normalized.startsWith("/auth/");
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
  if (init.body !== undefined && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const request: RequestInit = { ...init, headers, credentials: "include" };

  let response: Response;
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

  if (response.status === 401 && !isAuthEndpoint(path)) {
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
};
