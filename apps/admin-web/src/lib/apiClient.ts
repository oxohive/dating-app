import { getAccessToken } from "@/lib/authToken";

/**
 * Base URL for the backend API. Overridable per environment via
 * NEXT_PUBLIC_API_BASE_URL (Next.js only inlines env vars with this prefix
 * into client bundles); falls back to the local backend dev default so the
 * dashboard works out of the box.
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

/**
 * Thin fetch wrapper used by every feature's `api/` module. Centralizing
 * this here means every request automatically resolves against the
 * configured API base URL, attaches the admin's bearer token when one is
 * stored, and sends/receives JSON with sane defaults. Feature modules
 * should never call `fetch` directly - go through this.
 */
async function request<TResponse>(path: string, options: ApiRequestOptions = {}): Promise<TResponse> {
  const { body, headers, ...rest } = options;
  const token = getAccessToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const payload = await response.json();
      detail = payload?.error ?? payload?.detail ?? detail;
    } catch {
      // response had no JSON body; fall back to statusText.
    }
    throw new ApiError(`Request to ${path} failed (${response.status}): ${detail}`, response.status);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}

export const apiClient = {
  get: <TResponse>(path: string, options?: ApiRequestOptions) => request<TResponse>(path, { ...options, method: "GET" }),
  post: <TResponse>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    request<TResponse>(path, { ...options, method: "POST", body }),
  patch: <TResponse>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    request<TResponse>(path, { ...options, method: "PATCH", body }),
};
