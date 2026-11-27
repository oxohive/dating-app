import { isTerminalWakeState, toWakeState } from '../../../src/features/server-wake/wakeState';

describe('toWakeState', () => {
  it('maps a running outcome to a running state carrying baseUrl', () => {
    expect(toWakeState({ state: 'running', base_url: 'http://1.2.3.4' })).toEqual({
      status: 'running',
      baseUrl: 'http://1.2.3.4',
    });
  });

  it('maps a starting outcome to a starting state carrying retryAfterSeconds', () => {
    expect(toWakeState({ state: 'starting', retry_after_seconds: 7 })).toEqual({
      status: 'starting',
      retryAfterSeconds: 7,
    });
  });

  it('maps an error outcome to an error state carrying message', () => {
    expect(toWakeState({ state: 'error', message: 'boom' })).toEqual({
      status: 'error',
      message: 'boom',
    });
  });

  it('maps a forbidden outcome to a forbidden state', () => {
    expect(toWakeState({ state: 'forbidden' })).toEqual({ status: 'forbidden' });
  });
});

describe('isTerminalWakeState', () => {
  it('is false for starting (the only state that schedules a retry)', () => {
    expect(isTerminalWakeState({ status: 'starting', retryAfterSeconds: 5 })).toBe(false);
  });

  it('is true for running', () => {
    expect(isTerminalWakeState({ status: 'running', baseUrl: 'http://1.2.3.4' })).toBe(true);
  });

  it('is true for error', () => {
    expect(isTerminalWakeState({ status: 'error', message: 'boom' })).toBe(true);
  });

  it('is true for forbidden', () => {
    expect(isTerminalWakeState({ status: 'forbidden' })).toBe(true);
  });

  it('is true for checking', () => {
    expect(isTerminalWakeState({ status: 'checking' })).toBe(true);
  });
});
