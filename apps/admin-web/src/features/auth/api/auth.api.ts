export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
}

/**
 * TODO: wire up to backend endpoint POST /api/admin/auth/login
 * (see services/backend). Stubbed for the MVP skeleton.
 */
export async function login(_request: LoginRequest): Promise<LoginResponse> {
  return Promise.resolve({ token: "stub-token" });
}
