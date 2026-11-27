import {
  apiClient,
  configureAuthSession,
  configureDynamicBaseUrl,
  configureServerWakeRecovery,
  isNetworkError,
  NetworkError,
} from '../../src/core/apiClient';

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe('isNetworkError', () => {
  it('is true for a TypeError (what fetch throws on a connection-level failure)', () => {
    expect(isNetworkError(new TypeError('Network request failed'))).toBe(true);
  });

  it('is false for a plain Error', () => {
    expect(isNetworkError(new Error('something else'))).toBe(false);
  });

  it('is false for a non-Error value', () => {
    expect(isNetworkError('nope')).toBe(false);
    expect(isNetworkError(undefined)).toBe(false);
  });
});

describe('apiClient base URL resolution', () => {
  afterEach(() => {
    configureDynamicBaseUrl(null);
    configureAuthSession(null);
    configureServerWakeRecovery(null);
    jest.restoreAllMocks();
  });

  it('uses the dynamically-discovered base URL over the static config default when one is registered', async () => {
    configureDynamicBaseUrl(() => 'http://9.9.9.9');
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(200, { ok: true }));

    await apiClient.get('/ping');

    expect(fetchMock).toHaveBeenCalledWith('http://9.9.9.9/ping', expect.anything());
  });

  it('falls back to the static config base URL when no dynamic one is registered', async () => {
    configureDynamicBaseUrl(null);
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(200, { ok: true }));

    await apiClient.get('/ping');

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:4000/ping', expect.anything());
  });

  it('falls back to the static config base URL when the dynamic getter returns null (not yet running)', async () => {
    configureDynamicBaseUrl(() => null);
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(200, { ok: true }));

    await apiClient.get('/ping');

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:4000/ping', expect.anything());
  });
});

describe('apiClient network-error recovery (task 0018)', () => {
  afterEach(() => {
    configureDynamicBaseUrl(null);
    configureAuthSession(null);
    configureServerWakeRecovery(null);
    jest.restoreAllMocks();
  });

  it('propagates a NetworkError without attempting recovery when no recovery handler is registered', async () => {
    configureServerWakeRecovery(null);
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Network request failed'));

    await expect(apiClient.get('/ping')).rejects.toBeInstanceOf(NetworkError);
  });

  it('re-runs the wake-check recovery and retries the request once it succeeds', async () => {
    const recoverFromNetworkError = jest.fn(async () => true);
    configureServerWakeRecovery({ recoverFromNetworkError });

    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new TypeError('Network request failed'))
      .mockResolvedValueOnce(jsonResponse(200, { pong: true }));

    const result = await apiClient.get<{ pong: boolean }>('/ping');

    expect(result).toEqual({ pong: true });
    expect(recoverFromNetworkError).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws a NetworkError (without retrying) when recovery reports a terminal failure', async () => {
    const recoverFromNetworkError = jest.fn(async () => false);
    configureServerWakeRecovery({ recoverFromNetworkError });

    const fetchMock = jest.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Network request failed'));

    await expect(apiClient.get('/ping')).rejects.toBeInstanceOf(NetworkError);
    expect(recoverFromNetworkError).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('only retries once even if the retried request also fails with a network error', async () => {
    const recoverFromNetworkError = jest.fn(async () => true);
    configureServerWakeRecovery({ recoverFromNetworkError });

    const fetchMock = jest.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Network request failed'));

    await expect(apiClient.get('/ping')).rejects.toBeInstanceOf(NetworkError);
    // One recovery attempt for the original call, one retried call that
    // also fails — but that retry must not trigger a second recovery.
    expect(recoverFromNetworkError).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not attempt wake recovery for a reachable server error response (e.g. 500), only for a connection-level failure', async () => {
    const recoverFromNetworkError = jest.fn(async () => true);
    configureServerWakeRecovery({ recoverFromNetworkError });

    jest.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(500, { detail: 'server error' }));

    await expect(apiClient.get('/ping')).rejects.toMatchObject({ name: 'ApiError', status: 500 });
    expect(recoverFromNetworkError).not.toHaveBeenCalled();
  });
});
