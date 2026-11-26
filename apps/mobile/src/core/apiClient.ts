import { config } from './config';
import { generateCorrelationId } from './correlationId';

/**
 * Thin fetch wrapper used by every feature's `api/` module. Centralizing
 * this here means every request automatically:
 *  - resolves against the configured API base URL
 *  - carries a per-request `X-Correlation-ID` header for end-to-end tracing
 *  - sends/receives JSON with sane defaults
 *
 * Feature modules should never call `fetch` directly — go through this.
 */

export type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

export class ApiError extends Error {
  readonly status: number;
  readonly correlationId: string;

  constructor(message: string, status: number, correlationId: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.correlationId = correlationId;
  }
}

async function request<TResponse>(path: string, options: ApiRequestOptions = {}): Promise<TResponse> {
  const correlationId = generateCorrelationId();
  const { body, headers, ...rest } = options;

  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      'X-Correlation-ID': correlationId,
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    throw new ApiError(`Request to ${path} failed with status ${response.status}`, response.status, correlationId);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}

export const apiClient = {
  get: <TResponse>(path: string, options?: ApiRequestOptions) => request<TResponse>(path, { ...options, method: 'GET' }),
  post: <TResponse>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    request<TResponse>(path, { ...options, method: 'POST', body }),
  put: <TResponse>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    request<TResponse>(path, { ...options, method: 'PUT', body }),
  delete: <TResponse>(path: string, options?: ApiRequestOptions) => request<TResponse>(path, { ...options, method: 'DELETE' }),
};
