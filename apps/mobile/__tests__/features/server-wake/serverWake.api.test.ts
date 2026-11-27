import { fetchWakeStatus, parseWakeResponse, type WakeFetchDeps } from '../../../src/features/server-wake/api/serverWake.api';

describe('parseWakeResponse', () => {
  it('maps a 200 running response to a running outcome', () => {
    expect(parseWakeResponse(200, { state: 'running', base_url: 'http://1.2.3.4' })).toEqual({
      state: 'running',
      base_url: 'http://1.2.3.4',
    });
  });

  it('maps a 200 starting response to a starting outcome, carrying retry_after_seconds', () => {
    expect(parseWakeResponse(200, { state: 'starting', retry_after_seconds: 5 })).toEqual({
      state: 'starting',
      retry_after_seconds: 5,
    });
  });

  it('defaults retry_after_seconds to 5 when the starting response omits it', () => {
    expect(parseWakeResponse(200, { state: 'starting' })).toEqual({
      state: 'starting',
      retry_after_seconds: 5,
    });
  });

  it('maps a 500 error response to an error outcome, carrying the message', () => {
    expect(parseWakeResponse(500, { state: 'error', message: 'instance terminated' })).toEqual({
      state: 'error',
      message: 'instance terminated',
    });
  });

  it('maps a 403 response to a forbidden outcome regardless of body', () => {
    expect(parseWakeResponse(403, { state: 'forbidden' })).toEqual({ state: 'forbidden' });
    expect(parseWakeResponse(403, undefined)).toEqual({ state: 'forbidden' });
  });

  it('falls back to a generic error outcome for a malformed running response (missing base_url)', () => {
    const outcome = parseWakeResponse(200, { state: 'running' });
    expect(outcome.state).toBe('error');
  });

  it('falls back to a generic error outcome for a completely unexpected body', () => {
    const outcome = parseWakeResponse(200, { unexpected: true });
    expect(outcome.state).toBe('error');
  });

  it('falls back to a generic error outcome for an undefined body', () => {
    const outcome = parseWakeResponse(500, undefined);
    expect(outcome).toEqual({ state: 'error', message: 'Wake service returned an unexpected response (status 500).' });
  });
});

function fakeDeps(overrides: Partial<WakeFetchDeps> = {}): WakeFetchDeps {
  return {
    fetchFn: jest.fn() as unknown as typeof fetch,
    url: 'https://example.lambda-url.ap-south-1.on.aws/',
    secret: 'shh',
    ...overrides,
  };
}

function fakeResponse(status: number, body: unknown): Response {
  return {
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  } as unknown as Response;
}

describe('fetchWakeStatus', () => {
  it('sends the secret as a query param and an Accept: application/json header', async () => {
    const fetchFn = jest.fn(async () => fakeResponse(200, { state: 'running', base_url: 'http://1.2.3.4' }));
    await fetchWakeStatus(fakeDeps({ fetchFn: fetchFn as unknown as typeof fetch, url: 'https://wake.example/', secret: 'top-secret' }));

    expect(fetchFn).toHaveBeenCalledWith('https://wake.example/?secret=top-secret', {
      headers: { Accept: 'application/json' },
    });
  });

  it('URL-encodes the secret', async () => {
    const fetchFn = jest.fn(async () => fakeResponse(200, { state: 'running', base_url: 'http://1.2.3.4' }));
    await fetchWakeStatus(fakeDeps({ fetchFn: fetchFn as unknown as typeof fetch, secret: 'a b&c' }));

    const calls = fetchFn.mock.calls as unknown as [string, RequestInit][];
    expect(calls[0]?.[0]).toContain(encodeURIComponent('a b&c'));
  });

  it('resolves to the parsed running outcome on success', async () => {
    const fetchFn = jest.fn(async () => fakeResponse(200, { state: 'running', base_url: 'http://1.2.3.4' }));
    const outcome = await fetchWakeStatus(fakeDeps({ fetchFn: fetchFn as unknown as typeof fetch }));

    expect(outcome).toEqual({ state: 'running', base_url: 'http://1.2.3.4' });
  });

  it('resolves to an error outcome instead of throwing when the network call itself fails', async () => {
    const fetchFn = jest.fn(async () => {
      throw new TypeError('Network request failed');
    });
    const outcome = await fetchWakeStatus(fakeDeps({ fetchFn: fetchFn as unknown as typeof fetch }));

    expect(outcome.state).toBe('error');
  });

  it('resolves to an error outcome instead of throwing when the body is not valid JSON', async () => {
    const fetchFn = jest.fn(async () => ({ status: 200, text: async () => 'not json' }) as unknown as Response);
    const outcome = await fetchWakeStatus(fakeDeps({ fetchFn: fetchFn as unknown as typeof fetch }));

    expect(outcome.state).toBe('error');
  });
});
