import { config } from './config';
import { generateCorrelationId } from './correlationId';

/**
 * Thin fetch wrapper used by every feature's `api/` module. Centralizing
 * this here means every request automatically:
 *  - resolves against the configured API base URL
 *  - carries a per-request `X-Correlation-ID` header for end-to-end tracing
 *  - sends/receives JSON with sane defaults
 *  - attaches the stored access token as `Authorization: Bearer <token>`
 *  - transparently refreshes the session and retries once on a 401
 *
 * Feature modules should never call `fetch` directly — go through this.
 */

export type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  /**
   * Skip attaching the Authorization header and the refresh-on-401 flow.
   * Used by the auth endpoints themselves (OTP request/verify, refresh,
   * logout) so they never try to refresh using the token they're busy
   * replacing.
   */
  skipAuth?: boolean;
};

export class ApiError extends Error {
  readonly status: number;
  readonly correlationId: string;
  /** Parsed JSON error body, when the response had one (e.g. FastAPI's `{detail: ...}`). */
  readonly body?: unknown;

  constructor(message: string, status: number, correlationId: string, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.correlationId = correlationId;
    this.body = body;
  }
}

/**
 * Thrown when `fetch` itself fails to connect (DNS, timeout, connection
 * refused, offline) rather than the server responding with a non-2xx
 * status — distinct from {@link ApiError}, which represents a reachable
 * server's error response. Surfaced to callers only when the server-wake
 * recovery flow (task 0018) couldn't bring the backend back up.
 */
export class NetworkError extends Error {
  constructor(message = 'Could not reach the server. Check your connection and try again.') {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * True for a connection-level failure as thrown by `fetch` itself (both
 * the web and React Native `fetch` implementations reject with a
 * `TypeError` for this case), as opposed to a reachable server's non-2xx
 * HTTP response, which resolves normally and is handled as an
 * {@link ApiError} instead.
 */
export function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError;
}

export type DynamicBaseUrlGetter = () => string | null;

let dynamicBaseUrlGetter: DynamicBaseUrlGetter | null = null;

/**
 * Registers how to read the dynamically-discovered API base URL (task
 * 0018's server-wake flow), which takes priority over the static
 * `config.apiBaseUrl` once known. Registration function rather than a
 * direct import of the server-wake feature's store, same reasoning as
 * {@link configureAuthSession}: this core module stays feature-agnostic.
 */
export function configureDynamicBaseUrl(getter: DynamicBaseUrlGetter | null): void {
  dynamicBaseUrlGetter = getter;
}

function resolveApiBaseUrl(): string {
  return dynamicBaseUrlGetter?.() ?? config.apiBaseUrl;
}

export type ServerWakeRecoveryHandlers = {
  /**
   * Re-runs the server-wake check (the pilot instance may have gone
   * idle-stopped again since launch) and resolves once a terminal state
   * is reached: `true` if the backend is reachable again (`running`),
   * `false` on a terminal failure (`error`/`forbidden`).
   */
  recoverFromNetworkError: () => Promise<boolean>;
};

let serverWakeRecoveryHandlers: ServerWakeRecoveryHandlers | null = null;

/**
 * Registers the server-wake recovery hook used when a request fails with
 * a network/connection-level error. Registration function, same pattern
 * as {@link configureAuthSession} and {@link configureDynamicBaseUrl}.
 */
export function configureServerWakeRecovery(handlers: ServerWakeRecoveryHandlers | null): void {
  serverWakeRecoveryHandlers = handlers;
}

export type AuthSessionHandlers = {
  /** Current access token, if any. */
  getAccessToken: () => string | null;
  /**
   * Called once when a request comes back 401. Should attempt to obtain
   * a fresh access token (e.g. via `POST /auth/refresh`) and return it,
   * or return `null` if the session can't be refreshed.
   */
  refreshAccessToken: () => Promise<string | null>;
  /** Called when a refresh attempt fails, so the session can be cleared. */
  onSessionExpired: () => void;
};

let authSessionHandlers: AuthSessionHandlers | null = null;

/**
 * Registers the auth session hooks used to attach bearer tokens and
 * refresh them on a 401. This is a registration function rather than a
 * direct import of the auth feature's store so this core module has no
 * dependency on any feature slice — the auth feature calls this once
 * (from its store module) to wire itself in.
 */
export function configureAuthSession(handlers: AuthSessionHandlers | null): void {
  authSessionHandlers = handlers;
}

async function parseJsonBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

type RetryState = {
  /** Already retried once after a 401-triggered token refresh. */
  isAuthRetry: boolean;
  /** Already retried once after a network-error-triggered wake recovery. */
  isWakeRetry: boolean;
};

async function performRequest<TResponse>(
  path: string,
  options: ApiRequestOptions,
  retryState: RetryState,
): Promise<TResponse> {
  const correlationId = generateCorrelationId();
  const { body, headers, skipAuth, ...rest } = options;

  const accessToken = skipAuth ? null : authSessionHandlers?.getAccessToken() ?? null;

  let response: Response;
  try {
    response = await fetch(`${resolveApiBaseUrl()}${path}`, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-ID': correlationId,
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    // A connection-level failure (not a reachable server's error
    // response) — the pilot instance may have gone idle-stopped again
    // since launch. Re-run the server-wake check once and retry this
    // same request before giving up (task 0018).
    if (isNetworkError(error) && !retryState.isWakeRetry && serverWakeRecoveryHandlers) {
      const recovered = await serverWakeRecoveryHandlers.recoverFromNetworkError();
      if (recovered) {
        return performRequest<TResponse>(path, options, { ...retryState, isWakeRetry: true });
      }
    }
    throw new NetworkError();
  }

  if (response.status === 401 && !skipAuth && !retryState.isAuthRetry && authSessionHandlers) {
    const refreshedAccessToken = await authSessionHandlers.refreshAccessToken();
    if (refreshedAccessToken) {
      return performRequest<TResponse>(path, options, { ...retryState, isAuthRetry: true });
    }
    authSessionHandlers.onSessionExpired();
  }

  if (!response.ok) {
    const errorBody = await parseJsonBody(response);
    throw new ApiError(`Request to ${path} failed with status ${response.status}`, response.status, correlationId, errorBody);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await parseJsonBody(response)) as TResponse;
}

async function request<TResponse>(path: string, options: ApiRequestOptions = {}): Promise<TResponse> {
  return performRequest<TResponse>(path, options, { isAuthRetry: false, isWakeRetry: false });
}

export const apiClient = {
  get: <TResponse>(path: string, options?: ApiRequestOptions) => request<TResponse>(path, { ...options, method: 'GET' }),
  post: <TResponse>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    request<TResponse>(path, { ...options, method: 'POST', body }),
  patch: <TResponse>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    request<TResponse>(path, { ...options, method: 'PATCH', body }),
  put: <TResponse>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    request<TResponse>(path, { ...options, method: 'PUT', body }),
  delete: <TResponse>(path: string, options?: ApiRequestOptions) => request<TResponse>(path, { ...options, method: 'DELETE' }),
};
