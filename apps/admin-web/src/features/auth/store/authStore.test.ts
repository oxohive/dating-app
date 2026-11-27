// `jest.config.js` runs this app's tests under testEnvironment "node" (no
// `window`/`localStorage`), so rather than fabricate a DOM we mock
// `@/lib/authToken` directly and assert the store calls through to it. The
// mocked module and the store itself are `require`-d inside each test
// (after `jest.resetModules()`) rather than imported at the top of the
// file: the store's initial state is computed once, at module load, inside
// `create(...)`, so to exercise "hydrates from an already-stored token at
// first use" we need a fresh module instance per test with the mock's
// return value configured *before* that first `require`.
jest.mock("@/lib/authToken", () => ({
  getAccessToken: jest.fn(),
  setAccessToken: jest.fn(),
  clearAccessToken: jest.fn(),
}));

interface AuthTokenMock {
  getAccessToken: jest.Mock;
  setAccessToken: jest.Mock;
  clearAccessToken: jest.Mock;
}

function loadAuthStore(storedToken: string | null) {
  const authTokenMock = require("@/lib/authToken") as AuthTokenMock;
  authTokenMock.getAccessToken.mockReturnValue(storedToken);

  const { useAuthStore } = require("./authStore");
  return { useAuthStore, authTokenMock };
}

describe("authStore", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("hydrates isAuthenticated as true at first use when a token is already stored", () => {
    const { useAuthStore } = loadAuthStore("existing-token");

    expect(useAuthStore.getState().accessToken).toBe("existing-token");
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it("hydrates isAuthenticated as false at first use when no token is stored", () => {
    const { useAuthStore } = loadAuthStore(null);

    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it("setAccessToken makes isAuthenticated true and persists via lib/authToken", () => {
    const { useAuthStore, authTokenMock } = loadAuthStore(null);

    useAuthStore.getState().setAccessToken("token-123");

    expect(useAuthStore.getState().accessToken).toBe("token-123");
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(authTokenMock.setAccessToken).toHaveBeenCalledWith("token-123");
  });

  it("clearAccessToken makes isAuthenticated false and clears storage via lib/authToken", () => {
    const { useAuthStore, authTokenMock } = loadAuthStore("token-123");

    useAuthStore.getState().clearAccessToken();

    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(authTokenMock.clearAccessToken).toHaveBeenCalledTimes(1);
  });
});
