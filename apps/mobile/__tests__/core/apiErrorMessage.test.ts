import { ApiError } from '../../src/core/apiClient';
import { getApiErrorMessage } from '../../src/core/apiErrorMessage';

describe('getApiErrorMessage', () => {
  it('reads the `detail` field from a FastAPI-style error body', () => {
    const error = new ApiError('failed', 400, 'correlation-id', { detail: 'That code is invalid.' });

    expect(getApiErrorMessage(error)).toBe('That code is invalid.');
  });

  it('falls back to the `error` field when `detail` is absent', () => {
    const error = new ApiError('failed', 403, 'correlation-id', { error: 'quota_exceeded' });

    expect(getApiErrorMessage(error)).toBe('quota_exceeded');
  });

  it('falls back to the ApiError\'s own message when the body has no usable field', () => {
    const error = new ApiError('Request to /x failed with status 500', 500, 'correlation-id', undefined);

    expect(getApiErrorMessage(error, 'custom fallback')).toBe('Request to /x failed with status 500');
  });

  it('returns the message for a non-ApiError Error (e.g. a network failure)', () => {
    expect(getApiErrorMessage(new TypeError('Network request failed'))).toBe('Network request failed');
  });

  it('returns the provided fallback for a thrown value that is not an Error at all', () => {
    expect(getApiErrorMessage('not an Error at all', 'custom fallback')).toBe('custom fallback');
    expect(getApiErrorMessage('not an Error at all')).toBe('Something went wrong. Please try again.');
  });
});
