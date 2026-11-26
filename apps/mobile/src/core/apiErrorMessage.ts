import { ApiError } from './apiClient';

/**
 * Extracts a human-readable message from a failed API call. Backend
 * errors generally arrive as FastAPI's `{detail: "..."}` shape, but some
 * endpoints use `{error: "..."}` style codes (e.g. the likes quota
 * error), so both are checked. Falls back to a generic message for
 * network failures or anything else unexpected, so screens always have
 * something safe to show the user instead of a raw error object.
 */
export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof ApiError) {
    const body = error.body as { detail?: unknown; error?: unknown; message?: unknown } | undefined;
    const detail = body?.detail ?? body?.error ?? body?.message;
    if (typeof detail === 'string' && detail.length > 0) {
      return detail;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
