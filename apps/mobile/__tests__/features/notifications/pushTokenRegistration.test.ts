import {
  registerForPushNotifications,
  resolvePushTokenPlatform,
  type PushRegistrationDeps,
} from '../../../src/features/notifications/pushTokenRegistration';

function deps(overrides: Partial<PushRegistrationDeps> = {}): PushRegistrationDeps {
  return {
    platformOS: 'ios',
    getPermissionsAsync: async () => ({ status: 'granted' }),
    requestPermissionsAsync: async () => ({ status: 'granted' }),
    getExpoPushTokenAsync: async () => ({ data: 'ExponentPushToken[abc123]' }),
    registerToken: async () => undefined,
    ...overrides,
  };
}

describe('resolvePushTokenPlatform', () => {
  it('passes ios through unchanged', () => {
    expect(resolvePushTokenPlatform('ios')).toBe('ios');
  });

  it('passes android through unchanged', () => {
    expect(resolvePushTokenPlatform('android')).toBe('android');
  });

  it('returns null for an unsupported platform (e.g. web)', () => {
    expect(resolvePushTokenPlatform('web')).toBeNull();
  });
});

describe('registerForPushNotifications (success/permission-denied/platform/error branches)', () => {
  it('returns unsupported_platform and never requests permission on web', async () => {
    const requestPermissionsAsync = jest.fn(async () => ({ status: 'granted' }));
    const result = await registerForPushNotifications(deps({ platformOS: 'web', requestPermissionsAsync }));

    expect(result).toEqual({ outcome: 'unsupported_platform' });
    expect(requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('registers the token and reports success when permission is already granted', async () => {
    const registerToken = jest.fn(async () => undefined);
    const result = await registerForPushNotifications(
      deps({ getPermissionsAsync: async () => ({ status: 'granted' }), registerToken }),
    );

    expect(result).toEqual({ outcome: 'registered', token: 'ExponentPushToken[abc123]' });
    expect(registerToken).toHaveBeenCalledWith('ExponentPushToken[abc123]', 'ios');
  });

  it('requests permission (and still succeeds) when not yet determined', async () => {
    const requestPermissionsAsync = jest.fn(async () => ({ status: 'granted' }));
    const result = await registerForPushNotifications(
      deps({ getPermissionsAsync: async () => ({ status: 'undetermined' }), requestPermissionsAsync }),
    );

    expect(requestPermissionsAsync).toHaveBeenCalled();
    expect(result.outcome).toBe('registered');
  });

  it('returns permission_denied when the user declines, and never registers a token', async () => {
    const registerToken = jest.fn(async () => undefined);
    const result = await registerForPushNotifications(
      deps({
        getPermissionsAsync: async () => ({ status: 'undetermined' }),
        requestPermissionsAsync: async () => ({ status: 'denied' }),
        registerToken,
      }),
    );

    expect(result).toEqual({ outcome: 'permission_denied' });
    expect(registerToken).not.toHaveBeenCalled();
  });

  it('does not re-request permission when it was already granted', async () => {
    const requestPermissionsAsync = jest.fn(async () => ({ status: 'granted' }));
    await registerForPushNotifications(
      deps({ getPermissionsAsync: async () => ({ status: 'granted' }), requestPermissionsAsync }),
    );

    expect(requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('resolves to an error result instead of throwing when the backend call fails', async () => {
    const failure = new Error('network down');
    const result = await registerForPushNotifications(
      deps({
        registerToken: async () => {
          throw failure;
        },
      }),
    );

    expect(result).toEqual({ outcome: 'error', error: failure });
  });

  it('resolves to an error result instead of throwing when obtaining the push token fails', async () => {
    const result = await registerForPushNotifications(
      deps({
        getExpoPushTokenAsync: async () => {
          throw new Error('no push credentials');
        },
      }),
    );

    expect(result.outcome).toBe('error');
  });
});
