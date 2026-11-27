import type { WakeCheckOutcome } from '../../../src/features/server-wake/api/serverWake.api';
import { runWakeCheckLoop, type WakeLoopDeps } from '../../../src/features/server-wake/wakeCheckLoop';
import type { WakeState } from '../../../src/features/server-wake/wakeState';

function deps(overrides: Partial<WakeLoopDeps> = {}): WakeLoopDeps {
  return {
    check: jest.fn(async (): Promise<WakeCheckOutcome> => ({ state: 'running', base_url: 'http://1.2.3.4' })),
    onState: jest.fn(),
    scheduleRetry: jest.fn(),
    ...overrides,
  };
}

describe('runWakeCheckLoop', () => {
  it('resolves immediately with the running state and never schedules a retry', async () => {
    const scheduleRetry = jest.fn();
    const onState = jest.fn();
    const check = jest.fn(async (): Promise<WakeCheckOutcome> => ({ state: 'running', base_url: 'http://1.2.3.4' }));

    const result = await runWakeCheckLoop(deps({ check, onState, scheduleRetry }));

    expect(result).toEqual({ status: 'running', baseUrl: 'http://1.2.3.4' });
    expect(check).toHaveBeenCalledTimes(1);
    expect(onState).toHaveBeenCalledTimes(1);
    expect(onState).toHaveBeenCalledWith({ status: 'running', baseUrl: 'http://1.2.3.4' });
    expect(scheduleRetry).not.toHaveBeenCalled();
  });

  it('resolves immediately with an error state and never schedules a retry', async () => {
    const scheduleRetry = jest.fn();
    const check = jest.fn(async (): Promise<WakeCheckOutcome> => ({ state: 'error', message: 'instance terminated' }));

    const result = await runWakeCheckLoop(deps({ check, scheduleRetry }));

    expect(result).toEqual({ status: 'error', message: 'instance terminated' });
    expect(scheduleRetry).not.toHaveBeenCalled();
  });

  it('resolves immediately with a forbidden state and never schedules a retry', async () => {
    const scheduleRetry = jest.fn();
    const check = jest.fn(async (): Promise<WakeCheckOutcome> => ({ state: 'forbidden' }));

    const result = await runWakeCheckLoop(deps({ check, scheduleRetry }));

    expect(result).toEqual({ status: 'forbidden' });
    expect(scheduleRetry).not.toHaveBeenCalled();
  });

  it('schedules a retry after retry_after_seconds * 1000ms while starting, and keeps looping until a terminal state', async () => {
    const outcomes: WakeCheckOutcome[] = [
      { state: 'starting', retry_after_seconds: 5 },
      { state: 'starting', retry_after_seconds: 5 },
      { state: 'running', base_url: 'http://1.2.3.4' },
    ];
    const check = jest.fn(async () => outcomes.shift() as WakeCheckOutcome);
    const onState = jest.fn();
    // Fires the retry callback synchronously, so the loop can be awaited
    // in a test without depending on real timers.
    const scheduleRetry = jest.fn((callback: () => void) => callback());

    const result = await runWakeCheckLoop(deps({ check, onState, scheduleRetry }));

    expect(result).toEqual({ status: 'running', baseUrl: 'http://1.2.3.4' });
    expect(check).toHaveBeenCalledTimes(3);
    expect(scheduleRetry).toHaveBeenCalledTimes(2);
    expect(scheduleRetry).toHaveBeenNthCalledWith(1, expect.any(Function), 5000);
    expect(scheduleRetry).toHaveBeenNthCalledWith(2, expect.any(Function), 5000);

    const reportedStates = (onState.mock.calls as [WakeState][]).map(([state]) => state);
    expect(reportedStates).toEqual([
      { status: 'starting', retryAfterSeconds: 5 },
      { status: 'starting', retryAfterSeconds: 5 },
      { status: 'running', baseUrl: 'http://1.2.3.4' },
    ]);
  });

  it('uses the retry_after_seconds given by each starting response (not a fixed delay)', async () => {
    const outcomes: WakeCheckOutcome[] = [
      { state: 'starting', retry_after_seconds: 2 },
      { state: 'running', base_url: 'http://1.2.3.4' },
    ];
    const check = jest.fn(async () => outcomes.shift() as WakeCheckOutcome);
    const scheduleRetry = jest.fn((callback: () => void) => callback());

    await runWakeCheckLoop(deps({ check, scheduleRetry }));

    expect(scheduleRetry).toHaveBeenCalledWith(expect.any(Function), 2000);
  });
});
